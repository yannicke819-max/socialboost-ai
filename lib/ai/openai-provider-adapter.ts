/**
 * OpenAI Provider Adapter v1 — server-only (AI-016C).
 *
 * Targets the OpenAI Responses API (POST /v1/responses) with the cheapest
 * usable preview model: gpt-4.1-mini.
 *
 * Hard rules:
 *   - Server-only. Uses native `fetch` + `AbortController`.
 *   - Does NOT read `process.env`. The gateway passes apiKey + model in.
 *   - Does NOT log the prompt body, the API key, or full provider responses.
 *   - On any HTTP / network / parse failure, throws a typed
 *     `OpenAiAdapterError` whose `code` maps cleanly to a stable
 *     blockedReason on the gateway side.
 *
 * No new dependency.
 */

export const OPENAI_RESPONSES_ENDPOINT = 'https://api.openai.com/v1/responses';
export const OPENAI_DEFAULT_TIMEOUT_MS = 30_000;

export type OpenAiAdapterErrorCode =
  | 'provider_auth_error'
  | 'provider_rate_limited'
  | 'provider_unavailable'
  | 'provider_timeout'
  | 'provider_empty_output'
  | 'provider_invalid_response'
  | 'provider_call_failed';

export class OpenAiAdapterError extends Error {
  readonly code: OpenAiAdapterErrorCode;
  readonly httpStatus?: number;
  constructor(code: OpenAiAdapterErrorCode, message?: string, httpStatus?: number) {
    super(message ?? code);
    this.name = 'OpenAiAdapterError';
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

export interface AiProviderRawResult {
  provider: 'openai';
  model: string;
  outputText: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  latencyMs?: number;
  finishReason?: string;
  rawRequestId?: string;
}

export interface RunOpenAiPromptInput {
  systemPrompt: string;
  userPrompt: string;
  maxOutputTokens: number;
  temperature: number;
  abortSignal?: AbortSignal;
}

export interface OpenAiProviderAdapterOptions {
  apiKey: string;
  model: string;
  timeoutMs?: number;
  /** Override for testing. Defaults to OPENAI_RESPONSES_ENDPOINT. */
  endpoint?: string;
  /** Override for testing. Defaults to globalThis.fetch. */
  fetchImpl?: typeof fetch;
  /** Override for testing. Defaults to `() => Date.now()`. */
  now?: () => number;
}

export interface OpenAiProviderAdapter {
  readonly model: string;
  buildPayload(input: RunOpenAiPromptInput): Record<string, unknown>;
  runOpenAiPrompt(input: RunOpenAiPromptInput): Promise<AiProviderRawResult>;
}

export function createOpenAiProviderAdapter(
  options: OpenAiProviderAdapterOptions,
): OpenAiProviderAdapter {
  if (typeof options.apiKey !== 'string' || options.apiKey.length === 0) {
    throw new Error('openai_adapter_missing_api_key');
  }
  if (typeof options.model !== 'string' || options.model.length === 0) {
    throw new Error('openai_adapter_missing_model');
  }
  const apiKey = options.apiKey;
  const model = options.model;
  const timeoutMs =
    options.timeoutMs && options.timeoutMs > 0 ? options.timeoutMs : OPENAI_DEFAULT_TIMEOUT_MS;
  const endpoint = options.endpoint ?? OPENAI_RESPONSES_ENDPOINT;
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const now = options.now ?? (() => Date.now());

  function buildPayload(input: RunOpenAiPromptInput): Record<string, unknown> {
    return {
      model,
      input: [
        { role: 'system', content: input.systemPrompt },
        { role: 'user', content: input.userPrompt },
      ],
      max_output_tokens: input.maxOutputTokens,
      temperature: input.temperature,
    };
  }

  async function runOpenAiPrompt(
    input: RunOpenAiPromptInput,
  ): Promise<AiProviderRawResult> {
    if (typeof fetchImpl !== 'function') {
      throw new OpenAiAdapterError('provider_call_failed', 'fetch_not_available');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const upstreamAbort = () => controller.abort();
    if (input.abortSignal) {
      if (input.abortSignal.aborted) controller.abort();
      else input.abortSignal.addEventListener('abort', upstreamAbort, { once: true });
    }

    const startedAt = now();
    let res: Response;
    try {
      res = await fetchImpl(endpoint, {
        method: 'POST',
        cache: 'no-store',
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(buildPayload(input)),
      });
    } catch (err) {
      const name = err instanceof Error ? err.name : '';
      if (name === 'AbortError') {
        throw new OpenAiAdapterError('provider_timeout', 'timed_out');
      }
      throw new OpenAiAdapterError(
        'provider_call_failed',
        err instanceof Error ? err.name : 'fetch_failed',
      );
    } finally {
      clearTimeout(timer);
      if (input.abortSignal) {
        input.abortSignal.removeEventListener('abort', upstreamAbort);
      }
    }

    if (res.status === 401 || res.status === 403) {
      throw new OpenAiAdapterError(
        'provider_auth_error',
        `http_${res.status}`,
        res.status,
      );
    }
    if (res.status === 429) {
      throw new OpenAiAdapterError(
        'provider_rate_limited',
        `http_${res.status}`,
        res.status,
      );
    }
    if (res.status >= 500 && res.status < 600) {
      throw new OpenAiAdapterError(
        'provider_unavailable',
        `http_${res.status}`,
        res.status,
      );
    }
    if (!res.ok) {
      throw new OpenAiAdapterError(
        'provider_call_failed',
        `http_${res.status}`,
        res.status,
      );
    }

    let json: unknown;
    try {
      json = await res.json();
    } catch (err) {
      throw new OpenAiAdapterError(
        'provider_invalid_response',
        err instanceof Error ? err.name : 'parse_error',
      );
    }

    const finishedAt = now();
    const parsed = extractOpenAiOutput(json);
    if (!parsed.outputText || parsed.outputText.length === 0) {
      throw new OpenAiAdapterError('provider_empty_output', 'no_text_returned');
    }

    return {
      provider: 'openai',
      model,
      outputText: parsed.outputText,
      inputTokens: parsed.inputTokens,
      outputTokens: parsed.outputTokens,
      totalTokens: parsed.totalTokens,
      finishReason: parsed.finishReason,
      rawRequestId: parsed.rawRequestId,
      latencyMs: Math.max(0, finishedAt - startedAt),
    };
  }

  return { model, buildPayload, runOpenAiPrompt };
}

// ---------------------------------------------------------------------------
// Response parsing
// ---------------------------------------------------------------------------

interface OpenAiResponseShape {
  id?: string;
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
  finish_reason?: string;
  status?: string;
}

interface ParsedOpenAiOutput {
  outputText: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  finishReason?: string;
  rawRequestId?: string;
}

/**
 * Extract a usable output text from the OpenAI Responses payload.
 *
 * Strategy:
 *   1. Prefer `output_text` (the consolidated convenience field).
 *   2. Fallback to walking `output[].content[].text` and joining text chunks.
 *   3. Return an empty string when neither path yields content; the adapter
 *      then maps that to `provider_empty_output`.
 */
export function extractOpenAiOutput(rawJson: unknown): ParsedOpenAiOutput {
  if (!rawJson || typeof rawJson !== 'object') {
    return { outputText: '' };
  }
  const r = rawJson as OpenAiResponseShape;

  let outputText = '';
  if (typeof r.output_text === 'string' && r.output_text.length > 0) {
    outputText = r.output_text;
  } else if (Array.isArray(r.output)) {
    const chunks: string[] = [];
    for (const item of r.output) {
      const content = item?.content;
      if (!Array.isArray(content)) continue;
      for (const c of content) {
        if (c && typeof c === 'object' && typeof c.text === 'string' && c.text.length > 0) {
          chunks.push(c.text);
        }
      }
    }
    outputText = chunks.join('');
  }

  return {
    outputText: outputText.trim(),
    inputTokens: r.usage?.input_tokens,
    outputTokens: r.usage?.output_tokens,
    totalTokens: r.usage?.total_tokens,
    finishReason: typeof r.finish_reason === 'string' ? r.finish_reason : r.status,
    rawRequestId: typeof r.id === 'string' ? r.id : undefined,
  };
}
