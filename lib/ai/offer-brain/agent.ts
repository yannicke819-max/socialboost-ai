/**
 * Offer Brain — agent orchestrator.
 *
 * Decides between mock and real model based on env, validates output strictly,
 * retries once on validation failure with a corrective prompt, and never falls
 * back silently to invented output.
 */

import { OfferBrainAgentError } from './errors';
import { offerBrainMock } from './mock';
import { callAnthropic, realModelEnabled } from './anthropic-adapter';
import {
  OfferBrainInputSchema,
  OfferBriefOutputSchema,
  type OfferBrainInput,
  type OfferBrief,
  DIAGNOSTIC_VERSION,
} from './schema';

export type AgentSource = 'mock' | 'anthropic';

export interface AgentRunResult {
  output: OfferBrief;
  metadata: {
    source: AgentSource;
    model?: string;
    tokens_in?: number;
    tokens_out?: number;
    cached_tokens?: number;
    duration_ms: number;
    retries: number;
    diagnostic_version: string;
  };
}

export interface AgentRunOptions {
  forceMock?: boolean; // overrides env, useful for tests
}

export async function runOfferBrain(
  rawInput: unknown,
  opts: AgentRunOptions = {},
): Promise<AgentRunResult> {
  // 1. Validate input strictly
  const inputParse = OfferBrainInputSchema.safeParse(rawInput);
  if (!inputParse.success) {
    throw new OfferBrainAgentError({
      code: 'invalid_input',
      message: 'Input validation failed',
      recoverable: false,
      details: inputParse.error.flatten(),
    });
  }
  const input: OfferBrainInput = inputParse.data;

  // 2. Decide path
  const useReal = !opts.forceMock && realModelEnabled();

  if (!useReal) {
    return runMock(input);
  }

  return runReal(input);
}

function runMock(input: OfferBrainInput): AgentRunResult {
  const start = Date.now();
  const output = offerBrainMock(input);
  // Validate the mock output against the schema (catches drift between mock & schema)
  const parsed = OfferBriefOutputSchema.safeParse(output);
  if (!parsed.success) {
    throw new OfferBrainAgentError({
      code: 'mock_failure',
      message: 'Internal mock produced output that fails schema validation. Bug in mock.',
      recoverable: false,
      details: parsed.error.flatten(),
    });
  }
  return {
    output: parsed.data,
    metadata: {
      source: 'mock',
      duration_ms: Date.now() - start,
      retries: 0,
      diagnostic_version: DIAGNOSTIC_VERSION,
    },
  };
}

async function runReal(input: OfferBrainInput): Promise<AgentRunResult> {
  // First call
  let call;
  try {
    call = await callAnthropic(input);
  } catch (err) {
    if (err instanceof OfferBrainAgentError) throw err;
    throw new OfferBrainAgentError({
      code: 'model_error',
      message: err instanceof Error ? err.message : 'Unknown model error',
      recoverable: false,
    });
  }

  // Try to parse JSON
  let candidateJson: unknown;
  try {
    candidateJson = JSON.parse(call.raw_text);
  } catch {
    // Retry once with corrective prompt
    return retryReal(input, call.raw_text, 'JSON parse failed: response was not valid JSON.');
  }

  // Validate against schema
  const parsed = OfferBriefOutputSchema.safeParse(candidateJson);
  if (!parsed.success) {
    return retryReal(input, call.raw_text, JSON.stringify(parsed.error.flatten()));
  }

  return {
    output: parsed.data,
    metadata: {
      source: 'anthropic',
      model: call.model,
      tokens_in: call.tokens_in,
      tokens_out: call.tokens_out,
      cached_tokens: call.cached_tokens,
      duration_ms: call.duration_ms,
      retries: 0,
      diagnostic_version: DIAGNOSTIC_VERSION,
    },
  };
}

async function retryReal(
  input: OfferBrainInput,
  previousText: string,
  zodError: string,
): Promise<AgentRunResult> {
  let call;
  try {
    call = await callAnthropic(input, { previousText, zodError });
  } catch (err) {
    if (err instanceof OfferBrainAgentError) throw err;
    throw new OfferBrainAgentError({
      code: 'model_error',
      message: err instanceof Error ? err.message : 'Unknown model error on retry',
      recoverable: false,
    });
  }

  let candidateJson: unknown;
  try {
    candidateJson = JSON.parse(call.raw_text);
  } catch {
    throw new OfferBrainAgentError({
      code: 'output_validation',
      message: 'Model returned non-JSON output twice. No silent fallback applied.',
      recoverable: false,
      details: { last_response_preview: call.raw_text.slice(0, 500) },
    });
  }

  const parsed = OfferBriefOutputSchema.safeParse(candidateJson);
  if (!parsed.success) {
    throw new OfferBrainAgentError({
      code: 'output_validation',
      message: 'Model output failed schema validation twice. No silent fallback applied.',
      recoverable: false,
      details: parsed.error.flatten(),
    });
  }

  return {
    output: parsed.data,
    metadata: {
      source: 'anthropic',
      model: call.model,
      tokens_in: call.tokens_in,
      tokens_out: call.tokens_out,
      cached_tokens: call.cached_tokens,
      duration_ms: call.duration_ms,
      retries: 1,
      diagnostic_version: DIAGNOSTIC_VERSION,
    },
  };
}
