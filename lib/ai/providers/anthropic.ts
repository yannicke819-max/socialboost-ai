/**
 * Anthropic provider — token estimation + identity.
 *
 * The actual real call dispatch for Offer Brain lives in
 * lib/ai/offer-brain/anthropic-adapter.ts and is invoked by runOfferBrain
 * when the gate is open. This file only carries provider-level metadata
 * (identity, default model, token estimation) consulted by the cost estimator
 * and the model router.
 */

import type { ProviderAdapter, TokenEstimateBreakdown } from './types';
import type { TaskType } from '../cost/types';
import { approximateTokensFromText } from '../cost/estimator';

const DEFAULT_MODEL =
  process.env.OFFER_BRAIN_MODEL ?? process.env.MODEL_ROUTER_ANTHROPIC_DEFAULT ?? 'claude-sonnet-4-5-20250929';

const AVG_OUTPUT_TOKENS_OFFER_BRAIN = 1500;

export const ANTHROPIC_PROVIDER: ProviderAdapter = {
  id: 'anthropic',
  name: 'Anthropic Claude',
  default_model: DEFAULT_MODEL,
  supports: ['offer_brain'],
  estimateTokens(taskType: TaskType, rawInput: unknown): TokenEstimateBreakdown {
    if (taskType !== 'offer_brain') return { input: 0, output: 0 };
    const text = textProxy(rawInput);
    return {
      input: approximateTokensFromText(text),
      output: AVG_OUTPUT_TOKENS_OFFER_BRAIN,
    };
  },
};

function textProxy(input: unknown): string {
  if (input == null) return '';
  if (typeof input === 'string') return input;
  if (typeof input === 'object' && 'raw_offer_text' in (input as Record<string, unknown>)) {
    const v = (input as Record<string, unknown>).raw_offer_text;
    return typeof v === 'string' ? v : '';
  }
  try {
    return JSON.stringify(input);
  } catch {
    return '';
  }
}
