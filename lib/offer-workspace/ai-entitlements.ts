/**
 * AI Entitlements (AI-016A) — pure module, no I/O.
 *
 * Owns:
 *   - The single decision point that says whether a given user, on a given
 *     plan, with a given action + estimated cost, may reach a real AI
 *     provider — and whether the admin can bear the cost.
 *
 * Hard rule (non-negotiable):
 *   Plan Free = NEVER reaches a real provider, even if
 *   `SOCIALBOOST_AI_PROVIDER_ENABLED=true`. The admin must never carry
 *   API cost for a Free user.
 *
 * Forward-looking (not implemented in AI-016A):
 *   - "BYOK" (bring your own key) mode: a Free user could in the future
 *     plug their own API key. The decision shape supports the mode but
 *     the actual call is NOT wired here. Today: BYOK → still dry_run.
 */

import {
  AI_MODEL_PRICING,
  PLAN_QUOTAS,
  canRunAiAction,
  estimateAiActionCost,
  getPricing,
  modelKey,
  selectRecommendedModel,
  type AiProviderName,
  type SocialBoostAction,
  type SocialBoostPlan,
} from './ai-cost-model';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export const AI_EXECUTION_MODES = ['dry_run', 'included_credits', 'byok'] as const;
export type AiExecutionMode = (typeof AI_EXECUTION_MODES)[number];

export type AiDecisionReason =
  | 'free_plan_dry_run_only'
  | 'byok_not_yet_supported'
  | 'unknown_model'
  | 'expert_never_auto'
  | 'premium_not_allowed'
  | 'over_action_cap'
  | 'insufficient_credits'
  | 'allowed_included_credits';

export interface AiProviderDecision {
  /** True when the user can proceed at all (even if only as dry-run). */
  allowed: boolean;
  mode: AiExecutionMode;
  reason?: AiDecisionReason;
  plan: SocialBoostPlan;
  estimatedCredits: number;
  remainingCredits: number;
  /** Only set when the run is allowed AND consumes credits. */
  remainingAfter?: number;
  /** True ONLY when the gateway is allowed to make a network call. */
  providerCallAllowed: boolean;
  /** True ONLY when the admin can bear the API cost (i.e. paid plans). */
  adminCostAllowed: boolean;
  suggestedUpgradePlan?: SocialBoostPlan;
}

export interface DecideAiExecutionInput {
  plan: SocialBoostPlan;
  remainingCredits: number;
  action: SocialBoostAction;
  /** Optional override; otherwise resolved from the action + plan. */
  requestedProvider?: AiProviderName;
  requestedModel?: string;
  /**
   * Forward-looking flag for future BYOK support. Today: even when set,
   * the decision still maps to dry_run because BYOK is not wired in
   * AI-016A.
   */
  hasUserProvidedApiKey?: boolean;
}

// -----------------------------------------------------------------------------
// Decision
// -----------------------------------------------------------------------------

/**
 * Single source of truth for the question "may we call a real AI provider
 * for this action right now?".
 *
 * The decision NEVER causes a provider call by itself. Callers that have
 * `providerCallAllowed === true` may then ask the gateway to perform the
 * call. Callers that have `providerCallAllowed === false` must surface a
 * dry-run / blocked result.
 */
export function decideAiExecution(input: DecideAiExecutionInput): AiProviderDecision {
  const quota = PLAN_QUOTAS[input.plan];

  // Resolve provider/model. Default to a balanced economy pick if the caller
  // does not specify — the cost estimate must always have a target.
  let provider: AiProviderName;
  let model: string;
  if (input.requestedProvider && input.requestedModel) {
    provider = input.requestedProvider;
    model = input.requestedModel;
  } else {
    const pick = selectRecommendedModel({
      action: input.action,
      plan: input.plan,
      qualityMode: 'balanced',
    });
    provider = pick.provider;
    model = pick.model;
  }

  const pricing = getPricing(provider, model);
  const estimate = estimateAiActionCost({
    action: input.action,
    provider,
    model,
  });
  const estimatedCredits = estimate.estimatedCredits;

  // -----------------------------------------------------------------------
  // Free plan — HARD RULE.
  //
  // Free NEVER reaches a real provider. The admin never carries API cost
  // for Free. Even if the env flag is ON, the entitlements layer keeps
  // Free in dry_run forever.
  //
  // BYOK is recognized at the type level but NOT wired in AI-016A. Today,
  // a Free user with their own key still gets dry_run.
  // -----------------------------------------------------------------------
  if (input.plan === 'free') {
    if (input.hasUserProvidedApiKey) {
      return {
        allowed: true,
        mode: 'dry_run',
        reason: 'byok_not_yet_supported',
        plan: 'free',
        estimatedCredits,
        remainingCredits: input.remainingCredits,
        providerCallAllowed: false,
        adminCostAllowed: false,
        suggestedUpgradePlan: 'starter',
      };
    }
    return {
      allowed: true,
      mode: 'dry_run',
      reason: 'free_plan_dry_run_only',
      plan: 'free',
      estimatedCredits,
      remainingCredits: input.remainingCredits,
      providerCallAllowed: false,
      adminCostAllowed: false,
      suggestedUpgradePlan: 'starter',
    };
  }

  // -----------------------------------------------------------------------
  // Paid plans — defer to canRunAiAction for cap / quota / model checks.
  // -----------------------------------------------------------------------
  if (!pricing) {
    return {
      allowed: false,
      mode: 'dry_run',
      reason: 'unknown_model',
      plan: input.plan,
      estimatedCredits,
      remainingCredits: input.remainingCredits,
      providerCallAllowed: false,
      adminCostAllowed: false,
    };
  }

  const can = canRunAiAction({
    plan: input.plan,
    remainingCredits: input.remainingCredits,
    estimatedCredits,
    action: input.action,
    requestedModel: model,
    requestedProvider: provider,
  });

  if (!can.allowed) {
    return {
      allowed: false,
      mode: 'dry_run',
      reason: can.reason,
      plan: input.plan,
      estimatedCredits,
      remainingCredits: input.remainingCredits,
      providerCallAllowed: false,
      adminCostAllowed: false,
      suggestedUpgradePlan: suggestUpgradeFor(input.plan, can.reason),
    };
  }

  // Paid plan + cap OK + credits OK → allowed via included credits.
  return {
    allowed: true,
    mode: 'included_credits',
    reason: 'allowed_included_credits',
    plan: input.plan,
    estimatedCredits,
    remainingCredits: input.remainingCredits,
    remainingAfter: can.remainingAfter,
    providerCallAllowed: true,
    adminCostAllowed: true,
  };
}

function suggestUpgradeFor(
  plan: SocialBoostPlan,
  reason: AiProviderDecision['reason'],
): SocialBoostPlan | undefined {
  if (reason === 'premium_not_allowed') {
    return plan === 'starter' ? 'pro' : plan === 'free' ? 'starter' : undefined;
  }
  if (reason === 'insufficient_credits' || reason === 'over_action_cap') {
    if (plan === 'starter') return 'pro';
    if (plan === 'pro') return 'business';
    if (plan === 'business') return 'agency';
  }
  return undefined;
}

// -----------------------------------------------------------------------------
// Sanity: re-exported helpers for callers that only need entitlements.
// -----------------------------------------------------------------------------

/** True only if the requested model exists in the pricing table. */
export function isKnownModel(provider: AiProviderName, model: string): boolean {
  return Object.prototype.hasOwnProperty.call(AI_MODEL_PRICING, modelKey(provider, model));
}
