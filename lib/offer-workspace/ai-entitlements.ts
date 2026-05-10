/**
 * AI Entitlements (AI-016A) — pure module, no I/O.
 *
 * Owns:
 *   - `decideAiExecution` — the single decision point that says whether a
 *     user, on a given plan, may reach a real AI provider, and whether the
 *     admin can bear the cost.
 *   - The plan quota table.
 *
 * Hard rule (non-negotiable):
 *   Plan Free = NEVER reaches a real provider. Even when
 *   `SOCIALBOOST_AI_PROVIDER_ENABLED=true`, Free stays in dry_run.
 *   Admin NEVER carries API cost for a Free user.
 *
 * BYOK ("bring your own key") is reserved at the type level — for AI-016A
 * a Free user with their own key still gets a non-network response, but the
 * mode is `byok` (not `dry_run`) so the UI can differentiate.
 */

import {
  AI_MODEL_PRICING,
  ACTION_MINIMUM_CREDITS,
  PLAN_QUOTAS,
  SOCIALBOOST_PLANS,
  canRunAiAction,
  estimateAiActionCost,
  getPricing,
  modelKey,
  selectRecommendedModel,
  type AiProviderName,
  type PlanQuota,
  type SocialBoostAction,
  type SocialBoostPlan,
} from './ai-cost-model';

// Re-export the canonical plan list + quota table so callers only need one
// import.
export { PLAN_QUOTAS, SOCIALBOOST_PLANS };
export type { PlanQuota, SocialBoostPlan };

// -----------------------------------------------------------------------------
// Decision shape
// -----------------------------------------------------------------------------

export const AI_EXECUTION_MODES = ['dry_run', 'included_credits', 'byok'] as const;
export type AiExecutionMode = (typeof AI_EXECUTION_MODES)[number];

export type AiDecisionReason =
  | 'free_prompt_pack_only'
  | 'byok_reserved_for_future'
  | 'unknown_model'
  | 'expert_never_auto'
  | 'premium_not_allowed'
  | 'over_action_cap'
  | 'insufficient_credits'
  | 'allowed_included_credits';

export interface AiProviderDecision {
  /** True when the user can proceed at all (even if only as dry-run / BYOK reserved). */
  allowed: boolean;
  mode: AiExecutionMode;
  reason?: AiDecisionReason;
  plan: SocialBoostPlan;
  estimatedCredits: number;
  remainingCredits: number;
  /** Only set when the run consumes credits (paid plans, included_credits mode). */
  remainingAfter?: number;
  /** True ONLY when the gateway is allowed to make a network call. */
  providerCallAllowed: boolean;
  /** True ONLY when the admin can bear the API cost (i.e. paid plans). */
  adminCostAllowed: boolean;
  /** True when the Free Prompt Pack is available for this plan/state. */
  freePromptPackAllowed: boolean;
  suggestedUpgradePlan?: SocialBoostPlan;
  suggestedDowngradeModel?: string;
}

export interface DecideAiExecutionInput {
  plan: SocialBoostPlan;
  remainingCredits: number;
  action: SocialBoostAction;
  /** Optional caller-supplied estimate. If absent, the function derives it. */
  estimatedCredits?: number;
  /** Optional override; otherwise resolved from action + plan. */
  requestedProvider?: AiProviderName;
  requestedModel?: string;
  /** Forward-looking flag — BYOK is recognized but NOT wired in AI-016A. */
  hasUserProvidedApiKey?: boolean;
  /** Snapshot of the env flag at call time. Never on its own enough to
   *  authorize Free. The decision layer is BEFORE the flag in the chain. */
  providerFlagEnabled?: boolean;
}

// -----------------------------------------------------------------------------
// Decision
// -----------------------------------------------------------------------------

/**
 * Single source of truth for "may we call a real AI provider for this action
 * right now?". The decision NEVER causes a provider call by itself.
 */
export function decideAiExecution(input: DecideAiExecutionInput): AiProviderDecision {
  const quota = PLAN_QUOTAS[input.plan];

  // Resolve provider/model.
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
  // Cost estimate — caller may pass `estimatedCredits` directly to avoid the
  // re-computation, otherwise the function computes it itself.
  const estimatedCredits = (() => {
    if (typeof input.estimatedCredits === 'number') return input.estimatedCredits;
    const e = estimateAiActionCost({
      action: input.action,
      provider,
      model,
    });
    return e.estimatedCredits;
  })();

  // -----------------------------------------------------------------------
  // Free plan — HARD RULE.
  //
  // Free NEVER reaches a real provider. providerFlagEnabled has no effect.
  // BYOK is reserved at the type level: today it lands in `mode: 'byok'`
  // but providerCallAllowed remains false because BYOK is not wired in
  // AI-016A.
  // -----------------------------------------------------------------------
  if (input.plan === 'free') {
    if (input.hasUserProvidedApiKey) {
      return {
        allowed: true,
        mode: 'byok',
        reason: 'byok_reserved_for_future',
        plan: 'free',
        estimatedCredits,
        remainingCredits: input.remainingCredits,
        providerCallAllowed: false,
        adminCostAllowed: false,
        freePromptPackAllowed: quota.freePromptPackAllowed,
        suggestedUpgradePlan: 'starter',
      };
    }
    return {
      allowed: true,
      mode: 'dry_run',
      reason: 'free_prompt_pack_only',
      plan: 'free',
      estimatedCredits,
      remainingCredits: input.remainingCredits,
      providerCallAllowed: false,
      adminCostAllowed: false,
      freePromptPackAllowed: quota.freePromptPackAllowed,
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
      freePromptPackAllowed: quota.freePromptPackAllowed,
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
      freePromptPackAllowed: quota.freePromptPackAllowed,
      suggestedUpgradePlan: suggestUpgradeFor(input.plan, can.reason),
      suggestedDowngradeModel: can.suggestedDowngradeModel,
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
    freePromptPackAllowed: quota.freePromptPackAllowed,
  };
}

function suggestUpgradeFor(
  plan: SocialBoostPlan,
  reason: AiDecisionReason | undefined,
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
// Sanity helpers re-exported for convenience.
// -----------------------------------------------------------------------------

export function isKnownModel(provider: AiProviderName, model: string): boolean {
  return Object.prototype.hasOwnProperty.call(AI_MODEL_PRICING, modelKey(provider, model));
}

export function actionMinimumCredits(action: SocialBoostAction): number {
  return ACTION_MINIMUM_CREDITS[action];
}
