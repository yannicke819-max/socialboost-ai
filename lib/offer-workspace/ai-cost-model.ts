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
    inputUsdPerMillion: 0.15,
    outputUsdPerMillion: 0.6,
    contextWindow: 1_000_000,
    recommendedFor: ['user_advice', 'ad_critique', 'post_ideas', 'angle_discovery'],
    qualityTier: 'economy',
  },
  'google:gemini-2.5-flash': {
    provider: 'google',
    model: 'gemini-2.5-flash',
    inputUsdPerMillion: 0.075,
    outputUsdPerMillion: 0.3,
    contextWindow: 1_000_000,
    recommendedFor: ['user_advice', 'ad_critique', 'post_ideas', 'weekly_plan'],
    qualityTier: 'economy',
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
  },
  // Premium tier — used only when the action benefits from it AND the plan allows it.
  'anthropic:claude-sonnet-4.6': {
    provider: 'anthropic',
    model: 'claude-sonnet-4.6',
    inputUsdPerMillion: 3.0,
    outputUsdPerMillion: 15.0,
    cachedInputUsdPerMillion: 0.3,
    contextWindow: 200_000,
    recommendedFor: ['offer_diagnosis', 'external_inspiration_analysis', 'ad_critique', 'ad_improvement'],
    qualityTier: 'premium',
  },
  // Expert tier — never selected automatically by the engine.
  'anthropic:claude-opus-4.6': {
    provider: 'anthropic',
    model: 'claude-opus-4.6',
    inputUsdPerMillion: 15.0,
    outputUsdPerMillion: 75.0,
    cachedInputUsdPerMillion: 1.5,
    contextWindow: 200_000,
    recommendedFor: ['full_campaign_pack'],
    qualityTier: 'expert',
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
  inputTokens: number;
  outputTokens: number;
  provider: AiProviderName;
  model: string;
  estimatedUsd: number;
  estimatedCredits: number;
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
      inputTokens: 0,
      outputTokens: 0,
      provider: input.provider,
      model: input.model,
      estimatedUsd: 0,
      estimatedCredits: ACTION_MINIMUM_CREDITS[input.action],
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
  const usd =
    (inputTokens / 1_000_000) * pricing.inputUsdPerMillion +
    (outputTokens / 1_000_000) * pricing.outputUsdPerMillion;
  const minCredits = ACTION_MINIMUM_CREDITS[input.action];
  const credits = Math.max(minCredits, Math.ceil(usd * 1000));
  const notes: string[] = [
    `safety_multiplier=${mul}`,
    `tier=${pricing.qualityTier}`,
  ];
  if (input.inputTokensOverride !== undefined) notes.push('input_override');
  if (input.outputTokensOverride !== undefined) notes.push('output_override');
  return {
    inputTokens,
    outputTokens,
    provider: input.provider,
    model: input.model,
    estimatedUsd: round(usd, 6),
    estimatedCredits: credits,
    riskLevel: classifyRisk(usd),
    notes,
  };
}

function classifyRisk(usd: number): AiUsageRiskLevel {
  if (usd < 0.02) return 'low';
  if (usd < 0.2) return 'medium';
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
  hardCapEnabled: boolean;
  overageAllowed: boolean;
}

export const PLAN_QUOTAS: Record<SocialBoostPlan, PlanQuota> = {
  free: {
    plan: 'free',
    monthlyCredits: 100,
    maxCreditsPerAction: 25,
    maxInspirationsPerRun: 1,
    maxOutputTokensPerRun: 2_000,
    premiumModelsAllowed: false,
    hardCapEnabled: true,
    overageAllowed: false,
  },
  starter: {
    plan: 'starter',
    monthlyCredits: 1_000,
    maxCreditsPerAction: 100,
    maxInspirationsPerRun: 3,
    maxOutputTokensPerRun: 6_000,
    premiumModelsAllowed: false,
    hardCapEnabled: true,
    overageAllowed: false,
  },
  pro: {
    plan: 'pro',
    monthlyCredits: 4_000,
    maxCreditsPerAction: 300,
    maxInspirationsPerRun: 6,
    maxOutputTokensPerRun: 12_000,
    premiumModelsAllowed: true,
    hardCapEnabled: true,
    overageAllowed: false,
  },
  business: {
    plan: 'business',
    monthlyCredits: 10_000,
    maxCreditsPerAction: 600,
    maxInspirationsPerRun: 10,
    maxOutputTokensPerRun: 24_000,
    premiumModelsAllowed: true,
    hardCapEnabled: false,
    overageAllowed: false,
  },
  agency: {
    plan: 'agency',
    monthlyCredits: 25_000,
    maxCreditsPerAction: 1_000,
    maxInspirationsPerRun: 15,
    maxOutputTokensPerRun: 40_000,
    premiumModelsAllowed: true,
    hardCapEnabled: false,
    overageAllowed: false,
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

  // 2) Expert-tier models are never allowed via the auto path. The runner
  //    can still surface them on demand, but the engine never blesses them.
  if (pricing.qualityTier === 'expert') {
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
 *   - free + anything → economy only.
 *   - starter + premium → downgraded to standard (haiku) — no premium.
 *   - pro + premium for high-stakes actions → sonnet.
 *   - business / agency + premium → sonnet.
 *   - opus is NEVER returned automatically.
 */
export function selectRecommendedModel(
  input: SelectRecommendedModelInput,
): SelectRecommendedModelResult {
  const quota = PLAN_QUOTAS[input.plan];

  // Free plan never escapes economy.
  if (input.plan === 'free') {
    return economyChoice(input.action, 'free_plan_economy_only');
  }

  // Premium-mode requests on plans that disallow premium → downgrade to standard.
  if (input.qualityMode === 'premium' && !quota.premiumModelsAllowed) {
    return standardChoice(input.action, 'premium_disallowed_for_plan');
  }

  if (input.qualityMode === 'premium' && quota.premiumModelsAllowed) {
    // Premium for actions that benefit from it (offer diagnosis, inspiration
    // analysis, ad critique, ad improvement). Other actions stay standard.
    if (
      input.action === 'offer_diagnosis' ||
      input.action === 'external_inspiration_analysis' ||
      input.action === 'ad_critique' ||
      input.action === 'ad_improvement'
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
  // Use the cheapest economy model that lists this action.
  const candidates = Object.values(AI_MODEL_PRICING).filter(
    (p) => p.qualityTier === 'economy' && p.recommendedFor.includes(action),
  );
  if (candidates.length === 0) {
    // Fallback to the cheapest economy model overall.
    const fallback = Object.values(AI_MODEL_PRICING)
      .filter((p) => p.qualityTier === 'economy')
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
