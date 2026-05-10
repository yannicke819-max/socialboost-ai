/**
 * AI Provider Gateway — server-only (AI-016B rebase on AI-016A guardrails).
 *
 * The ONLY place that reads `process.env.SOCIALBOOST_AI_PROVIDER_ENABLED`
 * and the API keys, and the ONLY place that does a real `fetch` to a
 * provider. Imported by the API route handler at app/api/ai/run-prompt.
 *
 * Hard rules (AI-016B):
 *   - Server-only. Never imported from a client component.
 *   - Step 1: pre-flight (pure).
 *   - **Step 2: ALWAYS run `decideAiExecution` BEFORE the env flag is
 *     consulted as a final authorization.** If the entitlements layer
 *     refuses (Free, insufficient credits, premium not allowed, opus,
 *     etc.), the gateway returns immediately without ever touching the
 *     network.
 *   - Step 3: `SOCIALBOOST_AI_PROVIDER_ENABLED` is an additional gate ON
 *     TOP of the entitlements decision — it can never be a bypass. If
 *     the entitlements decision said no, the env flag is ignored.
 *   - Step 4: API key check. If missing → dry_run, no network.
 *   - Step 5: real fetch.
 *   - Step 6: post-flight (pure).
 *
 * Free hard rule consequence:
 *   `decideAiExecution({ plan: 'free', ... })` returns
 *   `providerCallAllowed: false` regardless of `providerFlagEnabled`.
 *   Therefore step 2 always returns a dry_run for Free, and steps 3-6
 *   are never executed. Free → 0 fetch, 0 admin cost. Tests pin this.
 *
 * No new dependency. Uses native `fetch`.
 */

import {
  buildBlockedResult,
  buildDryRunResult,
  buildRequestId,
  postflightCheck,
  preflightCheck,
  type AiProviderName,
  type AiProviderRunInput,
  type AiProviderRunResult,
} from '@/lib/offer-workspace/ai-provider-runner';
import { decideAiExecution } from '@/lib/offer-workspace/ai-entitlements';
import {
  estimateAiActionCost,
  type SocialBoostAction,
} from '@/lib/offer-workspace/ai-cost-model';

// -----------------------------------------------------------------------------
// Flag + key resolution
// -----------------------------------------------------------------------------

/** True only when the env flag is exactly 'true'. */
export function isProviderEnabled(): boolean {
  return process.env.SOCIALBOOST_AI_PROVIDER_ENABLED === 'true';
}

interface ResolvedProvider {
  provider: AiProviderName;
  apiKey: string;
  model: string;
  endpoint: string;
}

/**
 * Pick the first provider with a configured API key. Returns null when
 * none is configured. We never throw on missing keys — the caller falls
 * back to a dry-run.
 */
function resolveProvider(prefer?: AiProviderName, override?: string): ResolvedProvider | null {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const order: AiProviderName[] = prefer && prefer !== 'mock'
    ? [prefer, 'anthropic', 'openai']
    : ['anthropic', 'openai'];
  for (const p of order) {
    if (p === 'anthropic' && anthropicKey) {
      return {
        provider: 'anthropic',
        apiKey: anthropicKey,
        model: override ?? 'claude-sonnet-4-6',
        endpoint: 'https://api.anthropic.com/v1/messages',
      };
    }
    if (p === 'openai' && openaiKey) {
      return {
        provider: 'openai',
        apiKey: openaiKey,
        model: override ?? 'gpt-4o-mini',
        endpoint: 'https://api.openai.com/v1/chat/completions',
      };
    }
  }
  return null;
}

// -----------------------------------------------------------------------------
// Public entry — STRICT order: preflight → decideAiExecution → env flag → key → fetch → postflight.
// -----------------------------------------------------------------------------

/**
 * Run a PromptVersion through the configured provider, with full pre-flight
 * + entitlements decision + env-flag gate + post-flight. Always returns a
 * structured `AiProviderRunResult`. No exception leaks to the caller.
 */
export async function runAiProvider(
  input: AiProviderRunInput,
): Promise<AiProviderRunResult> {
  const flagEnabled = isProviderEnabled();
  const plan = input.plan ?? 'free';
  const remainingCredits = input.remainingCredits ?? 0;
  const action: SocialBoostAction = (input.action ?? mapTaskToAction(input.promptVersion.task));

  // -------------------------------------------------------------------------
  // Step 1 — Pre-flight (pure). No env. No network.
  // -------------------------------------------------------------------------
  const pre = preflightCheck(input);
  if (!pre.ok) {
    return buildBlockedResult(input, pre.blockedReason, flagEnabled);
  }

  // -------------------------------------------------------------------------
  // Step 2 — AI-016A entitlements decision (pure). Runs BEFORE the env flag
  // is consulted as a final authorization. If the decision says no, the
  // gateway returns immediately without ever touching the network — even if
  // SOCIALBOOST_AI_PROVIDER_ENABLED=true. This is the Free hard rule's
  // structural enforcement point.
  // -------------------------------------------------------------------------
  const estimate = estimateAiActionCost({
    action,
    provider: input.provider ?? 'mock',
    model: input.model ?? 'dry-run',
  });
  const decision = decideAiExecution({
    plan,
    remainingCredits,
    action,
    estimatedCredits: estimate.estimatedCredits,
    requestedProvider: input.provider,
    requestedModel: input.model,
    hasUserProvidedApiKey: input.hasUserProvidedApiKey,
    providerFlagEnabled: flagEnabled,
  });

  if (!decision.providerCallAllowed || !decision.adminCostAllowed) {
    // Free, insufficient credits, premium-not-allowed, expert-never-auto, etc.
    // ALL go through this path. No network. No admin cost.
    if (decision.allowed) {
      // Allowed in dry-run / byok shape — return a dry-run result that the UI
      // can render alongside the Free Prompt Pack. The decisionReason
      // surfaces *why* we are in dry-run.
      return buildDryRunResult(input, {
        flagEnabled,
        decisionReason: decision.reason,
      });
    }
    // Hard block: insufficient credits, opus, premium-not-allowed, etc.
    return buildBlockedResult(
      input,
      decision.reason ?? 'entitlements_blocked',
      flagEnabled,
      decision.reason,
    );
  }

  // -------------------------------------------------------------------------
  // Step 3 — Env flag is now consulted as an ADDITIONAL gate. Even when the
  // entitlements layer says yes, the env flag must also be on for a real
  // call. If off, dry-run.
  // -------------------------------------------------------------------------
  if (!flagEnabled) {
    return buildDryRunResult(input, {
      flagEnabled: false,
      decisionReason: decision.reason,
    });
  }

  // -------------------------------------------------------------------------
  // Step 4 — API key check. No throw on missing.
  // -------------------------------------------------------------------------
  const resolved = resolveProvider(input.provider, input.model);
  if (!resolved) {
    return buildDryRunResult(input, {
      flagEnabled: true,
      decisionReason: decision.reason,
    });
  }

  // -------------------------------------------------------------------------
  // Step 5 — Real call. Native fetch, AbortController timeout, redacted logs.
  // -------------------------------------------------------------------------
  const requestId = buildRequestId(input);
  const startedAt = new Date().toISOString();
  let outputText = '';
  let inputTokens: number | undefined;
  let outputTokens: number | undefined;

  try {
    const text = await callProvider(input, resolved);
    outputText = text.outputText;
    inputTokens = text.inputTokens;
    outputTokens = text.outputTokens;
  } catch (err) {
    // Logs redacted: requestId + name only, never the prompt body.
    // eslint-disable-next-line no-console
    console.warn(
      `[ai-gateway] ${requestId} provider=${resolved.provider} error=${err instanceof Error ? err.name : 'unknown'}`,
    );
    return buildBlockedResult(input, 'provider_call_failed', true, decision.reason);
  }

  const finishedAt = new Date().toISOString();

  // -------------------------------------------------------------------------
  // Step 6 — Post-flight (pure).
  // -------------------------------------------------------------------------
  const post = postflightCheck({
    promptVersion: input.promptVersion,
    outputText,
    inspirations: input.inspirations,
  });

  return {
    ok: !post.blockedReason && !(post.validationErrors && post.validationErrors.length > 0),
    provider: resolved.provider,
    model: resolved.model,
    task: input.promptVersion.task,
    outputText,
    outputJson: post.outputJson,
    validationErrors: post.validationErrors,
    blockedReason: post.blockedReason,
    usage: { inputTokens, outputTokens },
    meta: {
      requestId,
      promptVersionId: input.promptVersion.id,
      startedAtMock: startedAt,
      finishedAtMock: finishedAt,
      dryRun: false,
      flagEnabled: true,
      plan,
      decisionReason: decision.reason,
    },
  };
}

/**
 * Map a PromptTask to a SocialBoostAction. The two enums share most members
 * but PromptTask has 9 entries and SocialBoostAction has 10
 * (`full_campaign_pack` is action-only). We default to `user_advice` when
 * a task does not map cleanly.
 */
function mapTaskToAction(task: string): SocialBoostAction {
  const knownActions: SocialBoostAction[] = [
    'offer_diagnosis',
    'external_inspiration_analysis',
    'angle_discovery',
    'post_ideas',
    'ad_generation',
    'ad_critique',
    'ad_improvement',
    'weekly_plan',
    'user_advice',
    'full_campaign_pack',
  ];
  return knownActions.includes(task as SocialBoostAction)
    ? (task as SocialBoostAction)
    : 'user_advice';
}

// -----------------------------------------------------------------------------
// Provider call (native fetch).
// -----------------------------------------------------------------------------

interface ProviderCallOutput {
  outputText: string;
  inputTokens?: number;
  outputTokens?: number;
}

async function callProvider(
  input: AiProviderRunInput,
  resolved: ResolvedProvider,
): Promise<ProviderCallOutput> {
  const timeoutMs = input.timeoutMs && input.timeoutMs > 0 ? input.timeoutMs : 30_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    if (resolved.provider === 'anthropic') {
      return await callAnthropic(input, resolved, controller.signal);
    }
    if (resolved.provider === 'openai') {
      return await callOpenAi(input, resolved, controller.signal);
    }
    return { outputText: '' };
  } finally {
    clearTimeout(timer);
  }
}

async function callAnthropic(
  input: AiProviderRunInput,
  resolved: ResolvedProvider,
  signal: AbortSignal,
): Promise<ProviderCallOutput> {
  const body = {
    model: resolved.model,
    max_tokens: input.maxTokens ?? 1024,
    temperature: input.temperature ?? 0.4,
    system: [
      {
        type: 'text',
        text: input.promptVersion.systemPrompt,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: input.promptVersion.userPrompt,
      },
    ],
  };

  const res = await fetch(resolved.endpoint, {
    method: 'POST',
    cache: 'no-store',
    signal,
    headers: {
      'content-type': 'application/json',
      'x-api-key': resolved.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`anthropic_http_${res.status}`);
  }
  const json = (await res.json()) as {
    content?: { type: string; text?: string }[];
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  const outputText = (json.content ?? [])
    .filter((c) => c.type === 'text' && typeof c.text === 'string')
    .map((c) => c.text as string)
    .join('\n')
    .trim();
  return {
    outputText,
    inputTokens: json.usage?.input_tokens,
    outputTokens: json.usage?.output_tokens,
  };
}

async function callOpenAi(
  input: AiProviderRunInput,
  resolved: ResolvedProvider,
  signal: AbortSignal,
): Promise<ProviderCallOutput> {
  const body = {
    model: resolved.model,
    temperature: input.temperature ?? 0.4,
    max_tokens: input.maxTokens ?? 1024,
    messages: [
      { role: 'system', content: input.promptVersion.systemPrompt },
      { role: 'user', content: input.promptVersion.userPrompt },
    ],
    response_format:
      input.promptVersion.outputFormat === 'json' ? { type: 'json_object' } : undefined,
  };
  const res = await fetch(resolved.endpoint, {
    method: 'POST',
    cache: 'no-store',
    signal,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${resolved.apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`openai_http_${res.status}`);
  }
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const outputText = (json.choices?.[0]?.message?.content ?? '').trim();
  return {
    outputText,
    inputTokens: json.usage?.prompt_tokens,
    outputTokens: json.usage?.completion_tokens,
  };
}
