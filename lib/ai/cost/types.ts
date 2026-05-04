/**
 * Cost module — CostEstimate + token estimator.
 *
 * AI-003 scope: estimation only. NO billing, NO CreditLedger, NO real charges.
 * The estimator is consulted by ModelRouter before any (potential) real call.
 */

export type ProviderId = 'mock' | 'anthropic';
export type TaskType = 'offer_brain';
export type Confidence = 'low' | 'medium' | 'high';

export interface CostEstimate {
  provider: ProviderId;
  model: string;
  task_type: TaskType;
  estimated_input_tokens: number;
  estimated_output_tokens: number;
  estimated_total_tokens: number;
  estimated_cost_credits: number;
  estimated_cost_eur?: number;
  confidence: Confidence;
  /** True when estimated_cost_credits > 50 — forces explicit user confirmation. */
  requires_confirmation: boolean;
  /** True when the operation is in a category the user wants gated behind confirmation regardless of cost. */
  premium_operation: boolean;
  /** True when current run cannot proceed because budget caps would be exceeded. AI-003: always false (no budget logic yet). */
  blocked_by_budget: boolean;
  notes: string[];
}

/** Heuristic constants — tunable per provider/model. AI-003 keeps them simple and non-binding. */
export const COST_CONSTANTS = {
  // Rough "1 credit ≈ €0.025" per AI-000 docs/credit-system.md
  credit_eur_value: 0.025,
  // Confirmation threshold per credit-system.md
  confirmation_threshold_credits: 50,
  // Anthropic pricing (rough USD cents per 1k tokens — for estimation only, NOT billing)
  // Sonnet-class default rates; mock uses 0/0.
  anthropic: {
    input_cents_per_1k: 0.3,   // ≈ $3/1M tokens
    output_cents_per_1k: 1.5,  // ≈ $15/1M tokens
    avg_output_tokens_for_offer_brain: 1500,
  },
  // EUR/USD parity for estimation purposes (no fx layer).
  usd_eur_rate: 0.92,
};
