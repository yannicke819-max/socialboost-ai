/**
 * Offer Brain — Anthropic adapter (real model call).
 *
 * Isolated by design: this file is the ONLY place that imports `@anthropic-ai/sdk`
 * for the Offer Brain agent. Activated only when:
 *   - process.env.OFFER_BRAIN_USE_REAL_MODEL === 'true'
 *   - process.env.ANTHROPIC_API_KEY is present
 *
 * Otherwise the agent falls back to the deterministic mock.
 */

import Anthropic from '@anthropic-ai/sdk';
import { OfferBrainAgentError } from './errors';
import type { OfferBrainInput } from './schema';
import { SYSTEM_PROMPT, buildUserMessage, buildRetryMessage } from './prompt';

const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929';
const MAX_TOKENS = 4096;

export interface AnthropicCallResult {
  raw_text: string;
  model: string;
  tokens_in: number;
  tokens_out: number;
  cached_tokens: number;
  duration_ms: number;
}

let cachedClient: Anthropic | null = null;

function getClient(): Anthropic {
  if (cachedClient) return cachedClient;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new OfferBrainAgentError({
      code: 'misconfigured',
      message: 'ANTHROPIC_API_KEY is not set.',
      recoverable: false,
    });
  }

  cachedClient = new Anthropic({ apiKey });
  return cachedClient;
}

export function realModelEnabled(): boolean {
  return (
    process.env.OFFER_BRAIN_USE_REAL_MODEL === 'true' &&
    typeof process.env.ANTHROPIC_API_KEY === 'string' &&
    process.env.ANTHROPIC_API_KEY.length > 0
  );
}

export async function callAnthropic(
  input: OfferBrainInput,
  retryFromInvalidJson?: { previousText: string; zodError: string },
): Promise<AnthropicCallResult> {
  const client = getClient();
  const model = process.env.OFFER_BRAIN_MODEL ?? DEFAULT_MODEL;

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  messages.push({ role: 'user', content: buildUserMessage(input) });

  if (retryFromInvalidJson) {
    messages.push({ role: 'assistant', content: retryFromInvalidJson.previousText });
    messages.push({ role: 'user', content: buildRetryMessage(retryFromInvalidJson.zodError) });
  }

  // JSON-mode prefill: forces the assistant to start with "{"
  messages.push({ role: 'assistant', content: '{' });

  const start = Date.now();

  try {
    const response = await client.messages.create({
      model,
      max_tokens: MAX_TOKENS,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages,
    });

    const duration_ms = Date.now() - start;

    // Concatenate text blocks
    const text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => (block.type === 'text' ? block.text : ''))
      .join('');

    // Re-prepend the "{" prefill we sent
    const fullJson = '{' + text;

    return {
      raw_text: fullJson,
      model,
      tokens_in: response.usage.input_tokens,
      tokens_out: response.usage.output_tokens,
      cached_tokens: response.usage.cache_read_input_tokens ?? 0,
      duration_ms,
    };
  } catch (err) {
    const duration_ms = Date.now() - start;
    if (err instanceof OfferBrainAgentError) throw err;
    if (err instanceof Anthropic.APIError) {
      throw new OfferBrainAgentError({
        code: err.status === 429 ? 'rate_limit' : 'model_error',
        message: `Anthropic API error: ${err.message}`,
        recoverable: err.status === 429 || (err.status ?? 0) >= 500,
        details: { status: err.status, duration_ms },
      });
    }
    throw new OfferBrainAgentError({
      code: 'model_error',
      message: err instanceof Error ? err.message : 'Unknown model error',
      recoverable: false,
      details: { duration_ms },
    });
  }
}
