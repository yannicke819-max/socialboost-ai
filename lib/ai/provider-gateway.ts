/**
 * AI Provider Gateway — server-only (AI-016C wires the OpenAI adapter
 * on top of the AI-016B + AI-016A guardrails).
 *
 * The ONLY place that:
 *   - reads the AI provider env vars (`SOCIALBOOST_AI_PROVIDER_ENABLED`,
 *     `SOCIALBOOST_AI_PROVIDER`, `SOCIALBOOST_AI_DEFAULT_MODEL`,
 *     `SOCIALBOOST_OPENAI_API_KEY`),
 *   - calls a real provider (via the OpenAI adapter for AI-016C; the
 *     legacy Anthropic stub remains inert and untouched).
 *
 * Imported by the API route handler at `app/api/ai/run-prompt`. Never
 * imported from a client component.
 *
 * Hard rules (AI-016A + AI-016B + AI-016C):
 *   1. preflight (pure)
 *   2. estimate credits (pure)
 *   3. decideAiExecution (pure) — runs BEFORE any env flag is consulted
 *   4. if !providerCallAllowed or !adminCostAllowed → dry_run/blocked
 *   5. read providerFlagEnabled
 *   6. if flag OFF → blocked `provider_disabled`
 *   7. read API key
 *   8. if key absent → blocked `provider_missing_key`
 *   9. create adapter + call provider
 *  10. postflight (pure) — re-scan output
 *  11. return normalized result
 *
 * Free hard rule consequence:
 *   `decideAiExecution({ plan: 'free', ... })` returns
 *   `providerCallAllowed: false` regardless of `providerFlagEnabled` or any
 *   user-provided key. Therefore step 4 always returns a dry-run for Free,
 *   and steps 5-9 are never executed. Free → 0 fetch, 0 admin cost.
 *
 * Logging policy:
 *   - Never log the prompt body, the API key, full provider responses, or
 *     raw token strings. Logs surface `requestId`, provider name, http
 *     status / error code only.
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
import {
  createOpenAiProviderAdapter,
  OpenAiAdapterError,
  type AiProviderRawResult,
  type OpenAiProviderAdapterOptions,
} from '@/lib/ai/openai-provider-adapter';

// -----------------------------------------------------------------------------
// Env resolution — gateway is the only module allowed to read process.env.
// -----------------------------------------------------------------------------

/** True only when the env flag is exactly 'true'. */
export function isProviderEnabled(): boolean {
  return process.env.SOCIALBOOST_AI_PROVIDER_ENABLED === 'true';
}

/** Configured provider name, defaults to 'openai' for AI-016C. */
function resolveProviderFromEnv(prefer?: AiProviderName): AiProviderName {
  if (prefer && prefer !== 'mock') return prefer;
  const v = process.env.SOCIALBOOST_AI_PROVIDER;
  if (v === 'openai' || v === 'anthropic') return v;
  return 'openai';
}

/** Configured default model, defaults to 'gpt-4.1-mini' for AI-016C. */
function resolveModelFromEnv(provider: AiProviderName, override?: string): string {
  if (typeof override === 'string' && override.length > 0) return override;
  const v = process.env.SOCIALBOOST_AI_DEFAULT_MODEL;
  if (typeof v === 'string' && v.length > 0) return v;
  return provider === 'anthropic' ? 'claude-sonnet-4-6' : 'gpt-4.1-mini';
}

function resolveOpenAiKey(): string | null {
  const k = process.env.SOCIALBOOST_OPENAI_API_KEY;
  return typeof k === 'string' && k.length > 0 ? k : null;
}

function resolveAnthropicKey(): string | null {
  const k = process.env.ANTHROPIC_API_KEY;
  return typeof k === 'string' && k.length > 0 ? k : null;
}

// -----------------------------------------------------------------------------
// Public entry — STRICT order: preflight → entitlements → flag → key → fetch → postflight.
// -----------------------------------------------------------------------------

export interface RunAiProviderDeps {
  /** Override for testing — defaults to `() => isProviderEnabled()`. */
  flagReader?: () => boolean;
  /** Override for testing — defaults to env-derived provider. */
  providerResolver?: (prefer?: AiProviderName) => AiProviderName;
  /** Override for testing — defaults to env-derived model. */
  modelResolver?: (provider: AiProviderName, override?: string) => string;
  /** Override for testing — defaults to `process.env.SOCIALBOOST_OPENAI_API_KEY`. */
  openaiKeyReader?: () => string | null;
  /** Override for testing — defaults to the real adapter factory. */
  openaiAdapterFactory?: typeof createOpenAiProviderAdapter;
  /**
   * Override for testing the legacy Anthropic stub. Returns the raw text only.
   * Defaults to a noop that throws `provider_call_failed`.
   */
  anthropicCaller?: (
    input: AiProviderRunInput,
    apiKey: string,
    model: string,
  ) => Promise<AiProviderRawResult>;
  /** Override for testing — defaults to `(...args) => console.warn(...args)`. */
  warn?: (msg: string) => void;
  /** Override for testing — defaults to ISO `new Date().toISOString()`. */
  isoNow?: () => string;
}

/**
 * Run a PromptVersion through the configured provider, with full pre-flight
 * + entitlements decision + env-flag gate + post-flight. Always returns a
 * structured `AiProviderRunResult`. No exception leaks to the caller.
 */
export async function runAiProvider(
  input: AiProviderRunInput,
  deps: RunAiProviderDeps = {},
): Promise<AiProviderRunResult> {
  const flagReader = deps.flagReader ?? isProviderEnabled;
  const providerResolver = deps.providerResolver ?? resolveProviderFromEnv;
  const modelResolver = deps.modelResolver ?? resolveModelFromEnv;
  const openaiKeyReader = deps.openaiKeyReader ?? resolveOpenAiKey;
  const adapterFactory = deps.openaiAdapterFactory ?? createOpenAiProviderAdapter;
  const warn = deps.warn ?? ((msg: string) => {
    // eslint-disable-next-line no-console
    console.warn(msg);
  });
  const isoNow = deps.isoNow ?? (() => new Date().toISOString());

  const flagEnabled = flagReader();
  const plan = input.plan ?? 'free';
  const remainingCredits = input.remainingCredits ?? 0;
  const action: SocialBoostAction =
    input.action ?? mapTaskToAction(input.promptVersion.task);

  // -------------------------------------------------------------------------
  // Step 1 — Pre-flight (pure). No env. No network.
  // -------------------------------------------------------------------------
  const pre = preflightCheck(input);
  if (!pre.ok) {
    return buildBlockedResult(input, pre.blockedReason, flagEnabled);
  }

  // -------------------------------------------------------------------------
  // Step 2 + 3 — AI-016A entitlements decision (pure). Runs BEFORE the env
  // flag is consulted as a final authorization. If the decision says no, the
  // gateway returns immediately without touching the network — even if
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
    if (decision.allowed) {
      return buildDryRunResult(input, {
        flagEnabled,
        decisionReason: decision.reason,
      });
    }
    return buildBlockedResult(
      input,
      decision.reason ?? 'entitlements_blocked',
      flagEnabled,
      decision.reason,
    );
  }

  // -------------------------------------------------------------------------
  // Step 4 — Env flag is now consulted as an ADDITIONAL gate. Even when the
  // entitlements layer says yes, the env flag must also be on for a real
  // call. AI-016C: when off, return blocked `provider_disabled` so paid
  // plans see a clear error rather than a silent dry-run.
  // -------------------------------------------------------------------------
  if (!flagEnabled) {
    return buildBlockedResult(input, 'provider_disabled', false, decision.reason);
  }

  // -------------------------------------------------------------------------
  // Step 5 — Resolve provider + model from env (or input override).
  // -------------------------------------------------------------------------
  const provider = providerResolver(input.provider);
  const model = modelResolver(provider, input.model);

  // -------------------------------------------------------------------------
  // Step 6 — API key check. AI-016C: when key absent, return blocked
  // `provider_missing_key` for paid plans (was dry-run in AI-016B).
  // -------------------------------------------------------------------------
  let apiKey: string | null = null;
  if (provider === 'openai') {
    apiKey = openaiKeyReader();
  } else if (provider === 'anthropic') {
    apiKey = resolveAnthropicKey();
  }
  if (!apiKey) {
    return buildBlockedResult(input, 'provider_missing_key', true, decision.reason);
  }

  // -------------------------------------------------------------------------
  // Step 7 — Real call via adapter.
  // -------------------------------------------------------------------------
  const requestId = buildRequestId(input);
  const startedAt = isoNow();
  let raw: AiProviderRawResult;
  try {
    if (provider === 'openai') {
      const adapterOpts: OpenAiProviderAdapterOptions = {
        apiKey,
        model,
        timeoutMs: input.timeoutMs,
      };
      const adapter = adapterFactory(adapterOpts);
      raw = await adapter.runOpenAiPrompt({
        systemPrompt: input.promptVersion.systemPrompt,
        userPrompt: input.promptVersion.userPrompt,
        maxOutputTokens: input.maxTokens ?? 1024,
        temperature: input.temperature ?? 0.4,
      });
    } else if (provider === 'anthropic' && deps.anthropicCaller) {
      raw = await deps.anthropicCaller(input, apiKey, model);
    } else {
      // AI-016C only wires OpenAI. Anthropic stays unwired.
      return buildBlockedResult(
        input,
        'provider_not_supported',
        true,
        decision.reason,
      );
    }
  } catch (err) {
    const code = err instanceof OpenAiAdapterError ? err.code : 'provider_call_failed';
    const httpTag =
      err instanceof OpenAiAdapterError && typeof err.httpStatus === 'number'
        ? `_${err.httpStatus}`
        : '';
    warn(`[ai-gateway] ${requestId} provider=${provider} error=${code}${httpTag}`);
    return buildBlockedResult(input, code, true, decision.reason);
  }

  const finishedAt = isoNow();

  // -------------------------------------------------------------------------
  // Step 8 — Post-flight (pure). Re-scan the model output.
  // -------------------------------------------------------------------------
  const post = postflightCheck({
    promptVersion: input.promptVersion,
    outputText: raw.outputText,
    inspirations: input.inspirations,
  });

  return {
    ok:
      !post.blockedReason &&
      !(post.validationErrors && post.validationErrors.length > 0),
    provider: raw.provider,
    model: raw.model,
    task: input.promptVersion.task,
    outputText: raw.outputText,
    outputJson: post.outputJson,
    validationErrors: post.validationErrors,
    blockedReason: post.blockedReason,
    usage: { inputTokens: raw.inputTokens, outputTokens: raw.outputTokens },
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
