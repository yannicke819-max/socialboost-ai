/**
 * OpenAI Provider Adapter — unit tests (AI-016C).
 *
 * Tests the adapter in isolation:
 *   - Payload shape (Responses API).
 *   - Output extraction: output_text + fallback walk on output[].content[].text.
 *   - Error mapping: 401/403 → auth, 429 → rate, 5xx → unavailable, abort → timeout.
 *   - Empty output → provider_empty_output.
 *
 * Hard rules verified:
 *   - No process.env access (the adapter takes apiKey + model as args).
 *   - No prompt body or API key leaks via thrown error messages.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createOpenAiProviderAdapter,
  extractOpenAiOutput,
  OpenAiAdapterError,
  OPENAI_RESPONSES_ENDPOINT,
} from '../openai-provider-adapter';

const apiKey = 'sk-test-fake-key';
const model = 'gpt-4.1-mini';

interface CapturedRequest {
  url: string;
  init: RequestInit | undefined;
}

function makeFetchOk(json: unknown, captured?: CapturedRequest[]): typeof fetch {
  return (async (url: string, init?: RequestInit) => {
    if (captured) captured.push({ url: String(url), init });
    return new Response(JSON.stringify(json), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as unknown as typeof fetch;
}

function makeFetchStatus(status: number, body: unknown = {}): typeof fetch {
  return (async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    })) as unknown as typeof fetch;
}

function makeFetchAbort(): typeof fetch {
  return (async (_u: string, init?: RequestInit) =>
    await new Promise<Response>((_resolve, reject) => {
      const signal = init?.signal as AbortSignal | undefined;
      if (signal) {
        signal.addEventListener('abort', () => {
          const err = new Error('aborted');
          err.name = 'AbortError';
          reject(err);
        });
      }
    })) as unknown as typeof fetch;
}

const promptInput = {
  systemPrompt: 'You are an expert assistant.',
  userPrompt: 'Give me three angles for a course on SEO.',
  maxOutputTokens: 256,
  temperature: 0.4,
};

// -----------------------------------------------------------------------------
// Payload shape
// -----------------------------------------------------------------------------

describe('createOpenAiProviderAdapter — payload', () => {
  it('builds the Responses API payload with system + user roles', () => {
    const adapter = createOpenAiProviderAdapter({ apiKey, model });
    const payload = adapter.buildPayload(promptInput);
    assert.equal(payload.model, model);
    assert.equal(payload.max_output_tokens, 256);
    assert.equal(payload.temperature, 0.4);
    assert.deepEqual(payload.input, [
      { role: 'system', content: promptInput.systemPrompt },
      { role: 'user', content: promptInput.userPrompt },
    ]);
  });

  it('POSTs to /v1/responses with bearer auth header', async () => {
    const captured: CapturedRequest[] = [];
    const adapter = createOpenAiProviderAdapter({
      apiKey,
      model,
      fetchImpl: makeFetchOk(
        {
          id: 'resp_1',
          output_text: 'hello world',
          usage: { input_tokens: 10, output_tokens: 4, total_tokens: 14 },
        },
        captured,
      ),
    });
    await adapter.runOpenAiPrompt(promptInput);
    assert.equal(captured.length, 1);
    assert.equal(captured[0]!.url, OPENAI_RESPONSES_ENDPOINT);
    assert.equal((captured[0]!.init as RequestInit).method, 'POST');
    const headers = (captured[0]!.init as RequestInit).headers as Record<string, string>;
    assert.equal(headers.authorization, `Bearer ${apiKey}`);
    assert.equal(headers['content-type'], 'application/json');
    const body = JSON.parse((captured[0]!.init as RequestInit).body as string);
    assert.equal(body.model, model);
    assert.equal(Array.isArray(body.input), true);
  });

  it('throws when apiKey is missing', () => {
    assert.throws(
      () => createOpenAiProviderAdapter({ apiKey: '', model }),
      /openai_adapter_missing_api_key/,
    );
  });

  it('throws when model is missing', () => {
    assert.throws(
      () => createOpenAiProviderAdapter({ apiKey, model: '' }),
      /openai_adapter_missing_model/,
    );
  });
});

// -----------------------------------------------------------------------------
// Output extraction
// -----------------------------------------------------------------------------

describe('extractOpenAiOutput — output text recovery', () => {
  it('prefers output_text when present', () => {
    const r = extractOpenAiOutput({ output_text: 'one two three' });
    assert.equal(r.outputText, 'one two three');
  });

  it('falls back to walking output[].content[].text', () => {
    const r = extractOpenAiOutput({
      output: [
        {
          content: [
            { type: 'output_text', text: 'Hello, ' },
            { type: 'output_text', text: 'world!' },
          ],
        },
      ],
    });
    assert.equal(r.outputText, 'Hello, world!');
  });

  it('returns empty when neither is present', () => {
    assert.equal(extractOpenAiOutput({}).outputText, '');
    assert.equal(extractOpenAiOutput(null).outputText, '');
    assert.equal(extractOpenAiOutput('not-an-object').outputText, '');
  });

  it('passes through usage + finish_reason + id', () => {
    const r = extractOpenAiOutput({
      id: 'resp_42',
      output_text: 'foo',
      usage: { input_tokens: 11, output_tokens: 5, total_tokens: 16 },
      finish_reason: 'stop',
    });
    assert.equal(r.rawRequestId, 'resp_42');
    assert.equal(r.inputTokens, 11);
    assert.equal(r.outputTokens, 5);
    assert.equal(r.totalTokens, 16);
    assert.equal(r.finishReason, 'stop');
  });
});

describe('runOpenAiPrompt — output extraction integration', () => {
  it('returns AiProviderRawResult with output_text', async () => {
    const adapter = createOpenAiProviderAdapter({
      apiKey,
      model,
      fetchImpl: makeFetchOk({
        id: 'resp_a',
        output_text: 'final answer',
        usage: { input_tokens: 7, output_tokens: 3, total_tokens: 10 },
      }),
      now: () => 0,
    });
    const r = await adapter.runOpenAiPrompt(promptInput);
    assert.equal(r.provider, 'openai');
    assert.equal(r.model, model);
    assert.equal(r.outputText, 'final answer');
    assert.equal(r.inputTokens, 7);
    assert.equal(r.outputTokens, 3);
    assert.equal(r.totalTokens, 10);
    assert.equal(r.rawRequestId, 'resp_a');
    assert.equal(typeof r.latencyMs, 'number');
  });

  it('falls back to output[].content[].text when output_text is absent', async () => {
    const adapter = createOpenAiProviderAdapter({
      apiKey,
      model,
      fetchImpl: makeFetchOk({
        id: 'resp_b',
        output: [
          {
            content: [
              { type: 'output_text', text: 'piece 1 ' },
              { type: 'output_text', text: 'piece 2' },
            ],
          },
        ],
      }),
    });
    const r = await adapter.runOpenAiPrompt(promptInput);
    assert.equal(r.outputText, 'piece 1 piece 2');
  });

  it('throws provider_empty_output when nothing is returned', async () => {
    const adapter = createOpenAiProviderAdapter({
      apiKey,
      model,
      fetchImpl: makeFetchOk({ id: 'resp_c' }),
    });
    await assert.rejects(adapter.runOpenAiPrompt(promptInput), (err) => {
      assert.ok(err instanceof OpenAiAdapterError);
      assert.equal((err as OpenAiAdapterError).code, 'provider_empty_output');
      return true;
    });
  });
});

// -----------------------------------------------------------------------------
// Error mapping
// -----------------------------------------------------------------------------

describe('runOpenAiPrompt — HTTP error mapping', () => {
  it('maps 400 → provider_bad_request', async () => {
    const adapter = createOpenAiProviderAdapter({
      apiKey,
      model,
      fetchImpl: makeFetchStatus(400),
    });
    await assert.rejects(adapter.runOpenAiPrompt(promptInput), (err) => {
      assert.equal((err as OpenAiAdapterError).code, 'provider_bad_request');
      assert.equal((err as OpenAiAdapterError).httpStatus, 400);
      return true;
    });
  });

  it('maps 408 → provider_timeout', async () => {
    const adapter = createOpenAiProviderAdapter({
      apiKey,
      model,
      fetchImpl: makeFetchStatus(408),
    });
    await assert.rejects(adapter.runOpenAiPrompt(promptInput), (err) => {
      assert.equal((err as OpenAiAdapterError).code, 'provider_timeout');
      return true;
    });
  });

  it('maps 401 → provider_auth_error', async () => {
    const adapter = createOpenAiProviderAdapter({
      apiKey,
      model,
      fetchImpl: makeFetchStatus(401),
    });
    await assert.rejects(adapter.runOpenAiPrompt(promptInput), (err) => {
      assert.ok(err instanceof OpenAiAdapterError);
      assert.equal((err as OpenAiAdapterError).code, 'provider_auth_error');
      assert.equal((err as OpenAiAdapterError).httpStatus, 401);
      return true;
    });
  });

  it('maps 403 → provider_auth_error', async () => {
    const adapter = createOpenAiProviderAdapter({
      apiKey,
      model,
      fetchImpl: makeFetchStatus(403),
    });
    await assert.rejects(adapter.runOpenAiPrompt(promptInput), (err) => {
      assert.equal((err as OpenAiAdapterError).code, 'provider_auth_error');
      return true;
    });
  });

  it('maps 429 → provider_rate_limited', async () => {
    const adapter = createOpenAiProviderAdapter({
      apiKey,
      model,
      fetchImpl: makeFetchStatus(429),
    });
    await assert.rejects(adapter.runOpenAiPrompt(promptInput), (err) => {
      assert.equal((err as OpenAiAdapterError).code, 'provider_rate_limited');
      return true;
    });
  });

  it('maps 500 → provider_unavailable', async () => {
    const adapter = createOpenAiProviderAdapter({
      apiKey,
      model,
      fetchImpl: makeFetchStatus(500),
    });
    await assert.rejects(adapter.runOpenAiPrompt(promptInput), (err) => {
      assert.equal((err as OpenAiAdapterError).code, 'provider_unavailable');
      return true;
    });
  });

  it('maps 503 → provider_unavailable', async () => {
    const adapter = createOpenAiProviderAdapter({
      apiKey,
      model,
      fetchImpl: makeFetchStatus(503),
    });
    await assert.rejects(adapter.runOpenAiPrompt(promptInput), (err) => {
      assert.equal((err as OpenAiAdapterError).code, 'provider_unavailable');
      return true;
    });
  });

  it('maps any other non-ok status to provider_call_failed', async () => {
    const adapter = createOpenAiProviderAdapter({
      apiKey,
      model,
      fetchImpl: makeFetchStatus(418),
    });
    await assert.rejects(adapter.runOpenAiPrompt(promptInput), (err) => {
      assert.equal((err as OpenAiAdapterError).code, 'provider_call_failed');
      return true;
    });
  });

  it('maps abort/timeout → provider_timeout', async () => {
    const adapter = createOpenAiProviderAdapter({
      apiKey,
      model,
      fetchImpl: makeFetchAbort(),
      timeoutMs: 5,
    });
    await assert.rejects(adapter.runOpenAiPrompt(promptInput), (err) => {
      assert.equal((err as OpenAiAdapterError).code, 'provider_timeout');
      return true;
    });
  });

  it('maps fetch network error → provider_network_error', async () => {
    const fetchImpl = (async () => {
      throw new TypeError('fetch failed');
    }) as unknown as typeof fetch;
    const adapter = createOpenAiProviderAdapter({ apiKey, model, fetchImpl });
    await assert.rejects(adapter.runOpenAiPrompt(promptInput), (err) => {
      assert.equal((err as OpenAiAdapterError).code, 'provider_network_error');
      return true;
    });
  });

  it('maps invalid JSON → provider_invalid_response', async () => {
    const fetchImpl = (async () =>
      new Response('not-json', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })) as unknown as typeof fetch;
    const adapter = createOpenAiProviderAdapter({ apiKey, model, fetchImpl });
    await assert.rejects(adapter.runOpenAiPrompt(promptInput), (err) => {
      assert.equal((err as OpenAiAdapterError).code, 'provider_invalid_response');
      return true;
    });
  });
});

// -----------------------------------------------------------------------------
// Hygiene
// -----------------------------------------------------------------------------

describe('OpenAI adapter — hygiene', () => {
  it('error messages never leak the API key', async () => {
    const secretKey = 'sk-supersecret-very-long-1234567890';
    const adapter = createOpenAiProviderAdapter({
      apiKey: secretKey,
      model,
      fetchImpl: makeFetchStatus(401),
    });
    try {
      await adapter.runOpenAiPrompt(promptInput);
      assert.fail('should have thrown');
    } catch (err) {
      assert.ok(err instanceof OpenAiAdapterError);
      assert.ok(!(err as Error).message.includes(secretKey));
      assert.ok(!String((err as Error).stack).includes(secretKey));
    }
  });

  it('error messages never leak the prompt body', async () => {
    const sentinel = 'PROMPT-SENTINEL-DO-NOT-LEAK';
    const adapter = createOpenAiProviderAdapter({
      apiKey,
      model,
      fetchImpl: makeFetchStatus(429),
    });
    try {
      await adapter.runOpenAiPrompt({
        ...promptInput,
        userPrompt: sentinel,
        systemPrompt: sentinel,
      });
      assert.fail('should have thrown');
    } catch (err) {
      assert.ok(!(err as Error).message.includes(sentinel));
    }
  });
});
