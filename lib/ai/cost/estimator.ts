/**
 * Cost estimator — pure function, deterministic.
 *
 * Given (taskType, provider, raw input), returns a CostEstimate.
 * Mock provider always returns zero-cost. Anthropic estimates from input length.
 */

import { type CostEstimate, type ProviderId, type TaskType, COST_CONSTANTS } from './types';

interface EstimateInput {
  task_type: TaskType;
  provider: ProviderId;
  model: string;
  raw_input?: unknown;
  /** Optional override of expected output tokens (e.g. measured baseline). */
  expected_output_tokens?: number;
}

/**
 * Cheap chars-to-tokens heuristic. NOT a real tokenizer.
 * Real billing would use the provider's tokenizer; AI-003 only estimates.
 */
export function approximateTokensFromText(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/** Serialize input into a textual proxy for length-based estimation. */
function inputToTextProxy(input: unknown): string {
  if (input == null) return '';
  if (typeof input === 'string') return input;
  try {
    return JSON.stringify(input);
  } catch {
    return '';
  }
}

export function estimateCost(req: EstimateInput): CostEstimate {
  if (req.provider === 'mock') {
    return {
      provider: 'mock',
      model: req.model,
      task_type: req.task_type,
      estimated_input_tokens: 0,
      estimated_output_tokens: 0,
      estimated_total_tokens: 0,
      estimated_cost_credits: 0,
      estimated_cost_eur: 0,
      confidence: 'high',
      requires_confirmation: false,
      premium_operation: false,
      blocked_by_budget: false,
      notes: ['Mock provider — zero cost.'],
    };
  }

  // anthropic
  const text = inputToTextProxy(req.raw_input);
  const input_tokens = approximateTokensFromText(text);
  const output_tokens = req.expected_output_tokens ?? COST_CONSTANTS.anthropic.avg_output_tokens_for_offer_brain;

  const usd_cents =
    (input_tokens / 1000) * COST_CONSTANTS.anthropic.input_cents_per_1k +
    (output_tokens / 1000) * COST_CONSTANTS.anthropic.output_cents_per_1k;

  const eur = (usd_cents / 100) * COST_CONSTANTS.usd_eur_rate;
  // 1 credit ≈ €0.025
  const credits = Math.max(1, Math.ceil(eur / COST_CONSTANTS.credit_eur_value));

  const requires_confirmation = credits > COST_CONSTANTS.confirmation_threshold_credits;

  return {
    provider: 'anthropic',
    model: req.model,
    task_type: req.task_type,
    estimated_input_tokens: input_tokens,
    estimated_output_tokens: output_tokens,
    estimated_total_tokens: input_tokens + output_tokens,
    estimated_cost_credits: credits,
    estimated_cost_eur: Number(eur.toFixed(4)),
    // confidence: input tokens we estimate from char length (low) + output tokens are a fixed assumption (low)
    confidence: input_tokens > 200 ? 'medium' : 'low',
    requires_confirmation,
    premium_operation: false, // Offer Brain text generation is not premium
    blocked_by_budget: false, // AI-003: no budget logic yet
    notes: [
      'Estimation only — no real charge applied. AI-003 has no CreditLedger.',
      `Approximate tokenizer (chars / 4). Real provider tokenizer would differ.`,
      `Output tokens assumed ${output_tokens} (Offer Brain typical).`,
    ],
  };
}
