/**
 * AI Provider Gateway — server-only (AI-016).
 *
 * The ONLY place that reads `process.env.SOCIALBOOST_AI_PROVIDER_ENABLED`
 * and the API keys, and the ONLY place that does a real `fetch` to a
 * provider. Imported by the API route handler at app/api/ai/run-prompt.
 *
 * Hard rules:
 *   - Server-only. Never imported from a client component.
 *   - If the flag is not exactly the string 'true', the function returns
 *     a dry-run result without ever touching the network.
 *   - If the flag is 'true' but no API key is configured, the function
 *     also returns a dry-run result — the build never fails on missing
 *     env, and tests never need an API key.
 *   - All forbidden-phrase + format-shape checks come from
 *     lib/offer-workspace/ai-provider-runner.ts (the pure module).
 *   - Pre-flight on prompt, post-flight on output. No bypass.
 *   - Logs are minimal: requestId only. No prompt body in production logs.
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
  // Anthropic is the default for SocialBoost (CLAUDE.md).
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
// Public entry
// -----------------------------------------------------------------------------

/**
 * Run a PromptVersion through the configured provider, with full pre-flight
 * + post-flight. Falls back to a dry-run when the flag is off or no key is
 * configured. Always returns an `AiProviderRunResult`.
 */
export async function runAiProvider(
  input: AiProviderRunInput,
): Promise<AiProviderRunResult> {
  const flagEnabled = isProviderEnabled();

  // 1) Pre-flight (pure).
  const pre = preflightCheck(input);
  if (!pre.ok) {
    return buildBlockedResult(input, pre.blockedReason, flagEnabled);
  }

  // 2) If the flag is off → dry-run, no network.
  if (!flagEnabled) {
    return buildDryRunResult(input, { flagEnabled: false });
  }

  // 3) If no key is configured → dry-run, no network. The build/tests
  //    never need an API key.
  const resolved = resolveProvider(input.provider, input.model);
  if (!resolved) {
    return buildDryRunResult(input, { flagEnabled: true });
  }

  // 4) Real call. Native fetch only. Timeout via AbortController.
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
    return buildBlockedResult(input, 'provider_call_failed', true);
  }

  const finishedAt = new Date().toISOString();

  // 5) Post-flight (pure).
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
    },
  };
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
    // Other providers not wired in AI-016 — return safe empty output.
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
        // CLAUDE.md: prompt caching for long system prompts.
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
