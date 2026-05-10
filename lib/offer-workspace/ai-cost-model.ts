/**
 * AI Cost Model + Credits & Quotas (AI-016A) — pure module, no I/O.
 *
 * Owns:
 *   - Per-provider / per-model pricing table (USD per million tokens).
 *   - Per-action default token budgets and minimum credit floors.
 *   - SocialBoost credit conversion (token cost → credit cost).
 *   - SocialBoost plan quotas.
 *   - estimateAiActionCost / canRunAiAction / selectRecommendedModel.
 *
 * Hard rules:
 *   - Pure: no `fetch`, no `process.env`, no `Date.now()` in output.
 *     Same input → byte-identical output. Tests run without env.
 *   - Tokens are an INTERNAL metric. Users only ever see "credits".
 *   - Opus is NEVER selected by `selectRecommendedModel` automatically.
 *   - Free plan can NEVER reach a premium model via routing.
 *   - The credit unit is a product abstraction. Conversion:
 *       estimatedCredits = max(actionMinimum, ceil(estimatedUsd * 1000))
 *     Each $1 of provider spend ≈ 1000 SocialBoost credits.
 *   - safetyMultiplier defaults to 3 to cover retries / JSON repairs /
 *     prompt growth / guardrail overhead.
 */

// -----------------------------------------------------------------------------
// Provider + model surface
// -----------------------------------------------------------------------------

export const AI_PROVIDER_NAMES = [
  'openai',
  'anthropic',
  'google',
  'mistral',
  'mock',
] as const;
export type AiProviderName = (typeof AI_PROVIDER_NAMES)[number];

export const AI_QUALITY_TIERS = ['economy', 'standard', 'premium', 'expert'] as const;
export type AiQualityTier = (typeof AI_QUALITY_TIERS)[number];

export interface AiModelPricing {
  provider: AiProviderName;
  model: string;
  inputUsdPerMillion: number;
  outputUsdPerMillion: number;
  /** When the provider exposes a discounted cached input rate. */
  cachedInputUsdPerMillion?: number;
  contextWindow?: number;
  recommendedFor: string[];
  qualityTier: AiQualityTier;
  /**
   * AI-016A: hard switch for the routing layer. False for opus (expert)
   * regardless of plan, and true for the mock dry-run sentinel. Other
   * paid tiers gate on the plan.
   */
  automaticSelectionAllowed: boolean;
}

/**
 * Indicative pricing snapshot — used for routing + estimates only. Exact
 * provider rates fluctuate; this table is the engine's source of truth and
 * MUST be updated when a real billing decision is made (AI-016B+).
 *
 * Values are USD per million tokens.
 */
export const AI_MODEL_PRICING: Record<string, AiModelPricing> = {
  // Economy tier — fastest + cheapest.
  'openai:gpt-4.1-mini': {
    provider: 'openai',
    model: 'gpt-4.1-mini',
    inputUsdPerMillion: 0.4,
    outputUsdPerMillion: 1.6,
    contextWindow: 1_000_000,
    recommendedFor: ['user_advice', 'ad_critique', 'post_ideas', 'angle_discovery', 'external_inspiration_analysis'],
    qualityTier: 'economy',
    automaticSelectionAllowed: true,
  },
  'google:gemini-2.5-flash': {
    provider: 'google',
    model: 'gemini-2.5-flash',
    inputUsdPerMillion: 0.3,
    outputUsdPerMillion: 2.5,
    contextWindow: 1_000_000,
    recommendedFor: ['user_advice', 'ad_critique', 'post_ideas', 'weekly_plan', 'external_inspiration_analysis'],
    qualityTier: 'economy',
    automaticSelectionAllowed: true,
  },
  // Standard tier — better reasoning at a higher rate.
  'mistral:mistral-medium-3': {
    provider: 'mistral',
    model: 'mistral-medium-3',
    inputUsdPerMillion: 0.4,
    outputUsdPerMillion: 2.0,
    contextWindow: 128_000,
    recommendedFor: ['ad_generation', 'angle_discovery'],
    qualityTier: 'standard',
    automaticSelectionAllowed: true,
  },
  'anthropic:claude-haiku-4.5': {
    provider: 'anthropic',
    model: 'claude-haiku-4.5',
    inputUsdPerMillion: 1.0,
    outputUsdPerMillion: 5.0,
    cachedInputUsdPerMillion: 0.1,
    contextWindow: 200_000,
    recommendedFor: ['ad_generation', 'ad_improvement', 'weekly_plan'],
    qualityTier: 'standard',
    automaticSelectionAllowed: true,
  },
  // Premium tier — used only when the action benefits from it AND the plan allows it.
  'anthropic:claude-sonnet-4.6': {
    provider: 'anthropic',
    model: 'claude-sonnet-4.6',
    inputUsdPerMillion: 3.0,
    outputUsdPerMillion: 15.0,
    cachedInputUsdPerMillion: 0.3,
    contextWindow: 200_000,
    recommendedFor: ['offer_diagnosis', 'ad_critique', 'ad_improvement', 'user_advice'],
    qualityTier: 'premium',
    automaticSelectionAllowed: true,
  },
  // Expert tier — NEVER selected automatically by the engine.
  'anthropic:claude-opus-4.6': {
    provider: 'anthropic',
    model: 'claude-opus-4.6',
    inputUsdPerMillion: 5.0,
    outputUsdPerMillion: 25.0,
    cachedInputUsdPerMillion: 0.5,
    contextWindow: 200_000,
    recommendedFor: ['full_campaign_pack'],
    qualityTier: 'expert',
    automaticSelectionAllowed: false,
  },
  // Mock — sentinel routed for Free plan. Engine treats it as a no-op model
  // that yields zero cost and a dry-run output.
  'mock:dry-run': {
    provider: 'mock',
    model: 'dry-run',
    inputUsdPerMillion: 0,
    outputUsdPerMillion: 0,
    contextWindow: 1_000_000,
    recommendedFor: [
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
    ],
    qualityTier: 'economy',
    automaticSelectionAllowed: true,
  },
};

export function modelKey(provider: AiProviderName, model: string): string {
  return `${provider}:${model}`;
}

export function getPricing(provider: AiProviderName, model: string): AiModelPricing | undefined {
  return AI_MODEL_PRICING[modelKey(provider, model)];
}

// -----------------------------------------------------------------------------
// SocialBoost actions + token budgets
// -----------------------------------------------------------------------------

export const SOCIALBOOST_ACTIONS = [
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
] as const;
export type SocialBoostAction = (typeof SOCIALBOOST_ACTIONS)[number];

interface ActionTokenBudget {
  input: number;
  output: number;
}

/**
 * Raw token budgets used by `estimateAiActionCost`. These are pre-multiplier
 * baselines; the safety multiplier is applied on top.
 */
export const ACTION_TOKEN_BUDGETS: Record<SocialBoostAction, ActionTokenBudget> = {
  offer_diagnosis: { input: 3_000, output: 1_200 },
  external_inspiration_analysis: { input: 6_000, output: 1_800 },
  angle_discovery: { input: 5_000, output: 2_000 },
  post_ideas: { input: 5_000, output: 2_500 },
  ad_generation: { input: 6_000, output: 3_000 },
  ad_critique: { input: 3_500, output: 1_200 },
  ad_improvement: { input: 3_500, output: 1_500 },
  weekly_plan: { input: 4_000, output: 1_500 },
  user_advice: { input: 2_000, output: 800 },
  full_campaign_pack: { input: 35_000, output: 12_000 },
};

/**
 * Per-action minimum credit floor. Users always pay at least this amount
 * regardless of how cheap the underlying provider call would be — this
 * smoothes user expectations and protects against zero-cost edge cases.
 */
export const ACTION_MINIMUM_CREDITS: Record<SocialBoostAction, number> = {
  offer_diagnosis: 5,
  external_inspiration_analysis: 10,
  angle_discovery: 10,
  post_ideas: 10,
  ad_generation: 20,
  ad_critique: 5,
  ad_improvement: 5,
  weekly_plan: 10,
  user_advice: 3,
  full_campaign_pack: 50,
};

// -----------------------------------------------------------------------------
// Estimation surface
// -----------------------------------------------------------------------------

export type AiUsageRiskLevel = 'low' | 'medium' | 'high';

export interface AiUsageEstimate {
  action: SocialBoostAction;
  provider: AiProviderName;
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedUsd: number;
  estimatedCredits: number;
  safetyMultiplier: number;
  riskLevel: AiUsageRiskLevel;
  notes: string[];
}

export interface EstimateAiActionCostInput {
  action: SocialBoostAction;
  provider: AiProviderName;
  model: string;
  inputTokensOverride?: number;
  outputTokensOverride?: number;
  /** Defaults to 3 (covers retries, JSON repairs, prompt growth, guardrail overhead). */
  safetyMultiplier?: number;
}

const DEFAULT_SAFETY_MULTIPLIER = 3;

/**
 * Pure: returns the estimated USD + credit cost for a given action against a
 * given model. Does NOT decide whether the user can run it — that's
 * `canRunAiAction`.
 */
export function estimateAiActionCost(
  input: EstimateAiActionCostInput,
): AiUsageEstimate {
  const pricing = getPricing(input.provider, input.model);
  if (!pricing) {
    // Unknown model: return a safe high-risk estimate so the caller blocks the run.
    return {
      action: input.action,
      inputTokens: 0,
      outputTokens: 0,
      provider: input.provider,
      model: input.model,
      estimatedUsd: 0,
      estimatedCredits: ACTION_MINIMUM_CREDITS[input.action],
      safetyMultiplier: input.safetyMultiplier ?? DEFAULT_SAFETY_MULTIPLIER,
      riskLevel: 'high',
      notes: [`unknown_model:${input.provider}:${input.model}`],
    };
  }
  const baseBudget = ACTION_TOKEN_BUDGETS[input.action];
  const baseInput = input.inputTokensOverride ?? baseBudget.input;
  const baseOutput = input.outputTokensOverride ?? baseBudget.output;
  const mul = input.safetyMultiplier && input.safetyMultiplier > 0
    ? input.safetyMultiplier
    : DEFAULT_SAFETY_MULTIPLIER;
  const inputTokens = Math.ceil(baseInput * mul);
  const outputTokens = Math.ceil(baseOutput * mul);
  // Per spec: estimatedUsd = ((inTok * inPrice + outTok * outPrice) / 1e6) * safetyMultiplier
  // Tokens are already multiplied by the safety multiplier — applying it again
  // here would double-count, so the canonical formula is just the raw sum.
  const usd =
    (inputTokens / 1_000_000) * pricing.inputUsdPerMillion +
    (outputTokens / 1_000_000) * pricing.outputUsdPerMillion;
  const minCredits = ACTION_MINIMUM_CREDITS[input.action];
  const credits = Math.max(minCredits, Math.ceil(usd * 1000));
  const notes: string[] = [
    `safety_multiplier=${mul}`,
    `tier=${pricing.qualityTier}`,
    'credits_are_a_product_unit_not_tokens',
  ];
  if (input.inputTokensOverride !== undefined) notes.push('input_override');
  if (input.outputTokensOverride !== undefined) notes.push('output_override');
  if (pricing.provider === 'mock') {
    notes.push('mock_dry_run_no_admin_cost');
  }
  return {
    action: input.action,
    inputTokens,
    outputTokens,
    provider: input.provider,
    model: input.model,
    estimatedUsd: round(usd, 6),
    estimatedCredits: credits,
    safetyMultiplier: mul,
    riskLevel: classifyRiskCredits(credits),
    notes,
  };
}

/**
 * Risk classification is driven by SocialBoost credits (the product unit) so
 * users can reason without seeing tokens or USD.
 */
function classifyRiskCredits(credits: number): AiUsageRiskLevel {
  if (credits < 25) return 'low';
  if (credits < 150) return 'medium';
  return 'high';
}

function round(n: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

// -----------------------------------------------------------------------------
// Plans + quotas
// -----------------------------------------------------------------------------

export const SOCIALBOOST_PLANS = ['free', 'starter', 'pro', 'business', 'agency'] as const;
export type SocialBoostPlan = (typeof SOCIALBOOST_PLANS)[number];

export interface PlanQuota {
  plan: SocialBoostPlan;
  monthlyCredits: number;
  maxCreditsPerAction: number;
  maxInspirationsPerRun: number;
  maxOutputTokensPerRun: number;
  premiumModelsAllowed: boolean;
  /** Expert tier (opus) — never automatic, even on agency. */
  expertModelsAllowed: boolean;
  hardCapEnabled: boolean;
  overageAllowed: boolean;
  /** Free Prompt Pack (copyable expert prompt) is allowed by default on every
   *  plan — paid plans can fall back to it when their credit balance is
   *  exhausted. */
  freePromptPackAllowed: boolean;
}

export const PLAN_QUOTAS: Record<SocialBoostPlan, PlanQuota> = {
  free: {
    plan: 'free',
    monthlyCredits: 0,
    maxCreditsPerAction: 0,
    maxInspirationsPerRun: 1,
    maxOutputTokensPerRun: 0,
    premiumModelsAllowed: false,
    expertModelsAllowed: false,
    hardCapEnabled: true,
    overageAllowed: false,
    freePromptPackAllowed: true,
  },
  starter: {
    plan: 'starter',
    monthlyCredits: 1_000,
    maxCreditsPerAction: 100,
    maxInspirationsPerRun: 3,
    maxOutputTokensPerRun: 3_000,
    premiumModelsAllowed: false,
    expertModelsAllowed: false,
    hardCapEnabled: true,
    overageAllowed: false,
    freePromptPackAllowed: true,
  },
  pro: {
    plan: 'pro',
    monthlyCredits: 4_000,
    maxCreditsPerAction: 300,
    maxInspirationsPerRun: 8,
    maxOutputTokensPerRun: 6_000,
    premiumModelsAllowed: true,
    expertModelsAllowed: false,
    hardCapEnabled: true,
    overageAllowed: false,
    freePromptPackAllowed: true,
  },
  business: {
    plan: 'business',
    monthlyCredits: 10_000,
    maxCreditsPerAction: 600,
    maxInspirationsPerRun: 15,
    maxOutputTokensPerRun: 10_000,
    premiumModelsAllowed: true,
    expertModelsAllowed: false,
    hardCapEnabled: true,
    overageAllowed: true,
    freePromptPackAllowed: true,
  },
  agency: {
    plan: 'agency',
    monthlyCredits: 25_000,
    maxCreditsPerAction: 1_000,
    maxInspirationsPerRun: 30,
    maxOutputTokensPerRun: 16_000,
    premiumModelsAllowed: true,
    expertModelsAllowed: false,
    hardCapEnabled: true,
    overageAllowed: true,
    freePromptPackAllowed: true,
  },
};

// -----------------------------------------------------------------------------
// Authorization
// -----------------------------------------------------------------------------

export type CanRunBlockedReason =
  | 'unknown_model'
  | 'over_action_cap'
  | 'premium_not_allowed'
  | 'expert_never_auto'
  | 'insufficient_credits';

export interface CanRunAiActionInput {
  plan: SocialBoostPlan;
  remainingCredits: number;
  estimatedCredits: number;
  action: SocialBoostAction;
  requestedModel: string;
  requestedProvider: AiProviderName;
}

export interface CanRunAiActionResult {
  allowed: boolean;
  reason?: CanRunBlockedReason;
  requiredCredits: number;
  remainingAfter: number;
  suggestedDowngradeModel?: string;
}

/**
 * Pure authorization check. Run it AFTER `estimateAiActionCost` to decide
 * whether to issue the actual provider call.
 */
export function canRunAiAction(input: CanRunAiActionInput): CanRunAiActionResult {
  const quota = PLAN_QUOTAS[input.plan];
  const pricing = getPricing(input.requestedProvider, input.requestedModel);

  // 1) Unknown model — block immediately.
  if (!pricing) {
    return {
      allowed: false,
      reason: 'unknown_model',
      requiredCredits: input.estimatedCredits,
      remainingAfter: input.remainingCredits,
    };
  }

  // 2) `automaticSelectionAllowed: false` (e.g. opus) blocks immediately.
  //    The runner can still surface them on demand, but the engine never
  //    blesses them.
  if (!pricing.automaticSelectionAllowed) {
    return {
      allowed: false,
      reason: 'expert_never_auto',
      requiredCredits: input.estimatedCredits,
      remainingAfter: input.remainingCredits,
      suggestedDowngradeModel: 'claude-sonnet-4.6',
    };
  }

  // 3) Premium model on a non-premium plan.
  if (pricing.qualityTier === 'premium' && !quota.premiumModelsAllowed) {
    return {
      allowed: false,
      reason: 'premium_not_allowed',
      requiredCredits: input.estimatedCredits,
      remainingAfter: input.remainingCredits,
      suggestedDowngradeModel: economyDowngradeFor(input.action),
    };
  }

  // 4) Per-action cap.
  if (input.estimatedCredits > quota.maxCreditsPerAction) {
    return {
      allowed: false,
      reason: 'over_action_cap',
      requiredCredits: input.estimatedCredits,
      remainingAfter: input.remainingCredits,
      suggestedDowngradeModel: economyDowngradeFor(input.action),
    };
  }

  // 5) Insufficient credits — hard cap when plan demands it.
  if (input.remainingCredits < input.estimatedCredits) {
    if (quota.hardCapEnabled || !quota.overageAllowed) {
      return {
        allowed: false,
        reason: 'insufficient_credits',
        requiredCredits: input.estimatedCredits,
        remainingAfter: input.remainingCredits,
      };
    }
  }

  return {
    allowed: true,
    requiredCredits: input.estimatedCredits,
    remainingAfter: Math.max(0, input.remainingCredits - input.estimatedCredits),
  };
}

function economyDowngradeFor(action: SocialBoostAction): string {
  // Prefer the cheapest model that lists this action in its `recommendedFor`,
  // falling back to gemini-flash as the universal economy default.
  const candidates = Object.values(AI_MODEL_PRICING).filter(
    (p) => p.qualityTier === 'economy' && p.recommendedFor.includes(action),
  );
  if (candidates.length > 0) {
    candidates.sort((a, b) => a.outputUsdPerMillion - b.outputUsdPerMillion);
    return candidates[0]!.model;
  }
  return 'gemini-2.5-flash';
}

// -----------------------------------------------------------------------------
// Routing
// -----------------------------------------------------------------------------

export type AiQualityMode = 'economy' | 'balanced' | 'premium';

export interface SelectRecommendedModelInput {
  action: SocialBoostAction;
  plan: SocialBoostPlan;
  qualityMode: AiQualityMode;
}

export interface SelectRecommendedModelResult {
  provider: AiProviderName;
  model: string;
  qualityTier: AiQualityTier;
  reason: string;
}

/**
 * Pick the right model for `(action, plan, qualityMode)`. Pure routing:
 *   - **free → mock:dry-run ALWAYS** (no provider call, no admin cost).
 *   - starter + premium → downgraded to standard (haiku) — no premium.
 *   - pro + premium for high-stakes actions → sonnet.
 *   - business / agency + premium → sonnet.
 *   - **opus is NEVER returned automatically** (`automaticSelectionAllowed: false`).
 *   - `external_inspiration_analysis` defaults to gemini-flash / gpt-4.1-mini,
 *     not sonnet, even on premium-capable plans.
 */
export function selectRecommendedModel(
  input: SelectRecommendedModelInput,
): SelectRecommendedModelResult {
  const quota = PLAN_QUOTAS[input.plan];

  // Free plan: always route to the mock dry-run sentinel. No provider call,
  // no admin cost, ever.
  if (input.plan === 'free') {
    return {
      provider: 'mock',
      model: 'dry-run',
      qualityTier: 'economy',
      reason: 'free_plan_mock_dry_run',
    };
  }

  // Premium-mode requests on plans that disallow premium → downgrade to standard.
  if (input.qualityMode === 'premium' && !quota.premiumModelsAllowed) {
    return standardChoice(input.action, 'premium_disallowed_for_plan');
  }

  if (input.qualityMode === 'premium' && quota.premiumModelsAllowed) {
    // external_inspiration_analysis: do NOT default to sonnet — economy is
    // strong enough for pattern extraction.
    if (input.action === 'external_inspiration_analysis') {
      return economyChoice(input.action, 'inspiration_default_economy');
    }
    // Premium for actions that benefit from it.
    if (
      input.action === 'offer_diagnosis' ||
      input.action === 'ad_critique' ||
      input.action === 'ad_improvement' ||
      input.action === 'user_advice'
    ) {
      return {
        provider: 'anthropic',
        model: 'claude-sonnet-4.6',
        qualityTier: 'premium',
        reason: 'premium_for_high_stakes_action',
      };
    }
    return standardChoice(input.action, 'premium_mode_standard_action');
  }

  if (input.qualityMode === 'balanced') {
    return economyChoice(input.action, 'balanced_economy');
  }

  // economy
  return economyChoice(input.action, 'economy_mode');
}

function economyChoice(action: SocialBoostAction, reason: string): SelectRecommendedModelResult {
  // Use the cheapest paid economy model that lists this action — exclude
  // the mock sentinel so paid plans never route to it.
  const candidates = Object.values(AI_MODEL_PRICING).filter(
    (p) =>
      p.qualityTier === 'economy' &&
      p.provider !== 'mock' &&
      p.recommendedFor.includes(action),
  );
  if (candidates.length === 0) {
    const fallback = Object.values(AI_MODEL_PRICING)
      .filter((p) => p.qualityTier === 'economy' && p.provider !== 'mock')
      .sort((a, b) => a.outputUsdPerMillion - b.outputUsdPerMillion)[0]!;
    return {
      provider: fallback.provider,
      model: fallback.model,
      qualityTier: 'economy',
      reason: `${reason}_fallback`,
    };
  }
  candidates.sort((a, b) => a.outputUsdPerMillion - b.outputUsdPerMillion);
  const pick = candidates[0]!;
  return {
    provider: pick.provider,
    model: pick.model,
    qualityTier: 'economy',
    reason,
  };
}

function standardChoice(action: SocialBoostAction, reason: string): SelectRecommendedModelResult {
  // Prefer haiku for SocialBoost (CLAUDE.md heritage: anthropic-first).
  const haiku = AI_MODEL_PRICING['anthropic:claude-haiku-4.5']!;
  if (haiku.recommendedFor.includes(action)) {
    return {
      provider: haiku.provider,
      model: haiku.model,
      qualityTier: 'standard',
      reason,
    };
  }
  const candidates = Object.values(AI_MODEL_PRICING).filter(
    (p) => p.qualityTier === 'standard' && p.recommendedFor.includes(action),
  );
  if (candidates.length > 0) {
    candidates.sort((a, b) => a.outputUsdPerMillion - b.outputUsdPerMillion);
    return {
      provider: candidates[0]!.provider,
      model: candidates[0]!.model,
      qualityTier: 'standard',
      reason,
    };
  }
  return {
    provider: haiku.provider,
    model: haiku.model,
    qualityTier: 'standard',
    reason: `${reason}_haiku_default`,
  };
}
