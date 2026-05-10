/**
 * Media Entitlements v1 — pure module (AI-017C).
 *
 * Single decision point that says, for a given (plan, kind, tier),
 * whether SocialBoost may LATER call a real image / video provider on
 * behalf of the user, OR whether the surface stays prompt-only.
 *
 * AI-017C does NOT call any media provider. The decision below is the
 * scaffold; a future media gateway will consult it before any fetch,
 * the same way the text gateway consults `decideAiExecution`.
 *
 * Hard rules (non-negotiable):
 *   - Free always = `mode: 'prompt_only'`. Zero admin cost. The
 *     `providerFlagEnabled` parameter has no effect on Free — same
 *     structural enforcement as the text side.
 *   - `breakthrough` video → `humanReviewRequired: true` for every
 *     plan, every flag value. `mediaProviderCallAllowed` stays false
 *     until human review is recorded (out of scope for AI-017C; the
 *     scaffold simply refuses the auto-run path).
 *   - Plan ladder:
 *       Free       → prompt_only
 *       Starter    → image safe / social_proof / performance only.
 *                    No video provider at all.
 *       Pro        → image safe / social_proof / performance + short
 *                    video (≤ 15s) safe / social_proof.
 *       Business   → image all tiers, video safe / social_proof /
 *                    performance.
 *       Agency     → image all tiers, video safe / social_proof /
 *                    performance, breakthrough video manual review.
 *   - Pure: no `fetch`, no `process.env`, no `Date.now()` in output.
 */

import type { SocialBoostPlan } from './ai-cost-model';
import {
  CREATIVE_STRATEGIES,
  estimateMediaCost,
  type CreativeQualityTier,
  type MediaEstimate,
  type MediaKind,
} from './creative-quality-tiers';

// -----------------------------------------------------------------------------
// Decision shape
// -----------------------------------------------------------------------------

export const MEDIA_EXECUTION_MODES = [
  'prompt_only',
  'included_credits',
  'manual_review_required',
] as const;
export type MediaExecutionMode = (typeof MEDIA_EXECUTION_MODES)[number];

export type MediaDecisionReason =
  | 'free_prompt_only'
  | 'video_not_in_plan'
  | 'tier_not_in_plan'
  | 'video_duration_above_plan_cap'
  | 'breakthrough_video_manual_review'
  | 'breakthrough_image_manual_review'
  | 'insufficient_credits'
  | 'allowed_included_credits';

export interface MediaProviderDecision {
  /** True when the user can proceed at all (even if only as prompt_only / manual review). */
  allowed: boolean;
  mode: MediaExecutionMode;
  reason: MediaDecisionReason;
  plan: SocialBoostPlan;
  kind: MediaKind;
  creativeQualityTier: CreativeQualityTier;
  estimate: MediaEstimate;
  /** True ONLY when a future media gateway is allowed to make a network call. */
  mediaProviderCallAllowed: boolean;
  /** True ONLY when the admin can bear the API cost (i.e. paid plans, allowed mode). */
  adminCostAllowed: boolean;
  /** True when the run requires explicit human review. */
  humanReviewRequired: boolean;
  /** Suggested upgrade plan if the current one cannot run this. */
  suggestedUpgradePlan?: SocialBoostPlan;
}

export interface DecideMediaExecutionInput {
  plan: SocialBoostPlan;
  kind: MediaKind;
  tier: CreativeQualityTier;
  /** Required when kind is 'video'. */
  videoDurationSec?: number;
  /** Defaults to a generous balance — only used to surface estimate vs. balance for tests. */
  remainingMediaCredits?: number;
  /** Snapshot of any future media provider env flag. Never enough to bypass Free. */
  mediaProviderFlagEnabled?: boolean;
}

// -----------------------------------------------------------------------------
// Per-plan capability table — pure data so tests can iterate.
// -----------------------------------------------------------------------------

interface PlanMediaCapability {
  imageTiers: ReadonlyArray<CreativeQualityTier>;
  videoTiers: ReadonlyArray<CreativeQualityTier>;
  /** Hard cap on video length in seconds, 0 = no video at all. */
  maxVideoSeconds: number;
  /** When true, breakthrough video falls into manual_review_required for this plan. */
  allowsBreakthroughVideoManualReview: boolean;
}

export const PLAN_MEDIA_CAPABILITIES: Record<SocialBoostPlan, PlanMediaCapability> = {
  free: {
    imageTiers: [],
    videoTiers: [],
    maxVideoSeconds: 0,
    allowsBreakthroughVideoManualReview: false,
  },
  starter: {
    imageTiers: ['safe', 'social_proof', 'performance'],
    videoTiers: [],
    maxVideoSeconds: 0,
    allowsBreakthroughVideoManualReview: false,
  },
  pro: {
    imageTiers: ['safe', 'social_proof', 'performance'],
    videoTiers: ['safe', 'social_proof'],
    maxVideoSeconds: 15,
    allowsBreakthroughVideoManualReview: false,
  },
  business: {
    imageTiers: ['safe', 'social_proof', 'performance', 'breakthrough'],
    videoTiers: ['safe', 'social_proof', 'performance'],
    maxVideoSeconds: 30,
    allowsBreakthroughVideoManualReview: false,
  },
  agency: {
    imageTiers: ['safe', 'social_proof', 'performance', 'breakthrough'],
    videoTiers: ['safe', 'social_proof', 'performance'],
    maxVideoSeconds: 30,
    allowsBreakthroughVideoManualReview: true,
  },
};

// -----------------------------------------------------------------------------
// Decision
// -----------------------------------------------------------------------------

export function decideMediaExecution(
  input: DecideMediaExecutionInput,
): MediaProviderDecision {
  const estimate = estimateMediaCost({
    kind: input.kind,
    tier: input.tier,
    videoDurationSec: input.videoDurationSec,
  });

  // -----------------------------------------------------------------------
  // Free plan — HARD RULE.
  // Always prompt_only. No media provider. No admin cost. The flag,
  // duration, tier, etc., have no effect.
  // -----------------------------------------------------------------------
  if (input.plan === 'free') {
    return baseRefusal({
      input,
      estimate,
      mode: 'prompt_only',
      reason: 'free_prompt_only',
      humanReviewRequired: estimate.humanReviewRequired,
      suggestedUpgradePlan: 'starter',
    });
  }

  const cap = PLAN_MEDIA_CAPABILITIES[input.plan];

  // -----------------------------------------------------------------------
  // Video gate — Starter has zero video, plan caps duration elsewhere.
  // -----------------------------------------------------------------------
  if (input.kind === 'video') {
    if (cap.maxVideoSeconds <= 0) {
      return baseRefusal({
        input,
        estimate,
        mode: 'prompt_only',
        reason: 'video_not_in_plan',
        humanReviewRequired: estimate.humanReviewRequired,
        suggestedUpgradePlan: suggestUpgrade(input.plan, 'video_not_in_plan'),
      });
    }
    const sec = Math.max(1, Math.floor(input.videoDurationSec ?? 0));
    if (sec > cap.maxVideoSeconds) {
      return baseRefusal({
        input,
        estimate,
        mode: 'prompt_only',
        reason: 'video_duration_above_plan_cap',
        humanReviewRequired: estimate.humanReviewRequired,
        suggestedUpgradePlan: suggestUpgrade(input.plan, 'video_duration_above_plan_cap'),
      });
    }
    if (input.tier === 'breakthrough') {
      // Breakthrough video is NEVER automatic. The only path is manual
      // review on Agency; every other plan stops at prompt_only.
      if (cap.allowsBreakthroughVideoManualReview) {
        return {
          allowed: true,
          mode: 'manual_review_required',
          reason: 'breakthrough_video_manual_review',
          plan: input.plan,
          kind: input.kind,
          creativeQualityTier: input.tier,
          estimate,
          mediaProviderCallAllowed: false,
          adminCostAllowed: false,
          humanReviewRequired: true,
        };
      }
      return baseRefusal({
        input,
        estimate,
        mode: 'prompt_only',
        reason: 'breakthrough_video_manual_review',
        humanReviewRequired: true,
        suggestedUpgradePlan: suggestUpgrade(input.plan, 'breakthrough_video_manual_review'),
      });
    }
    if (!cap.videoTiers.includes(input.tier)) {
      return baseRefusal({
        input,
        estimate,
        mode: 'prompt_only',
        reason: 'tier_not_in_plan',
        humanReviewRequired: estimate.humanReviewRequired,
        suggestedUpgradePlan: suggestUpgrade(input.plan, 'tier_not_in_plan'),
      });
    }
  }

  // -----------------------------------------------------------------------
  // Image gate.
  // -----------------------------------------------------------------------
  if (input.kind === 'image') {
    if (input.tier === 'breakthrough' && !cap.imageTiers.includes('breakthrough')) {
      return baseRefusal({
        input,
        estimate,
        mode: 'prompt_only',
        reason: 'breakthrough_image_manual_review',
        humanReviewRequired: true,
        suggestedUpgradePlan: suggestUpgrade(input.plan, 'breakthrough_image_manual_review'),
      });
    }
    if (!cap.imageTiers.includes(input.tier)) {
      return baseRefusal({
        input,
        estimate,
        mode: 'prompt_only',
        reason: 'tier_not_in_plan',
        humanReviewRequired: estimate.humanReviewRequired,
        suggestedUpgradePlan: suggestUpgrade(input.plan, 'tier_not_in_plan'),
      });
    }
  }

  // -----------------------------------------------------------------------
  // Tier strategy may still demand human review (currently: breakthrough
  // image on plans that include it). Auto-allowed otherwise.
  // -----------------------------------------------------------------------
  const strategy = CREATIVE_STRATEGIES[input.tier];
  if (strategy.humanReviewRequired) {
    return {
      allowed: true,
      mode: 'manual_review_required',
      reason:
        input.kind === 'image'
          ? 'breakthrough_image_manual_review'
          : 'breakthrough_video_manual_review',
      plan: input.plan,
      kind: input.kind,
      creativeQualityTier: input.tier,
      estimate,
      mediaProviderCallAllowed: false,
      adminCostAllowed: false,
      humanReviewRequired: true,
    };
  }

  // -----------------------------------------------------------------------
  // Optional credit balance check — purely advisory in AI-017C.
  // -----------------------------------------------------------------------
  if (
    typeof input.remainingMediaCredits === 'number' &&
    input.remainingMediaCredits < estimate.estimatedCredits
  ) {
    return baseRefusal({
      input,
      estimate,
      mode: 'prompt_only',
      reason: 'insufficient_credits',
      humanReviewRequired: estimate.humanReviewRequired,
      suggestedUpgradePlan: suggestUpgrade(input.plan, 'insufficient_credits'),
    });
  }

  // -----------------------------------------------------------------------
  // Auto-allowed via included credits. Note: `mediaProviderCallAllowed`
  // remains the gate for a *future* media gateway; AI-017C does not
  // perform any real media call.
  // -----------------------------------------------------------------------
  return {
    allowed: true,
    mode: 'included_credits',
    reason: 'allowed_included_credits',
    plan: input.plan,
    kind: input.kind,
    creativeQualityTier: input.tier,
    estimate,
    mediaProviderCallAllowed: true,
    adminCostAllowed: true,
    humanReviewRequired: false,
  };
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function baseRefusal(args: {
  input: DecideMediaExecutionInput;
  estimate: MediaEstimate;
  mode: MediaExecutionMode;
  reason: MediaDecisionReason;
  humanReviewRequired: boolean;
  suggestedUpgradePlan?: SocialBoostPlan;
}): MediaProviderDecision {
  return {
    allowed: args.mode !== 'prompt_only' ? true : args.input.plan !== 'free',
    mode: args.mode,
    reason: args.reason,
    plan: args.input.plan,
    kind: args.input.kind,
    creativeQualityTier: args.input.tier,
    estimate: args.estimate,
    mediaProviderCallAllowed: false,
    adminCostAllowed: false,
    humanReviewRequired: args.humanReviewRequired,
    suggestedUpgradePlan: args.suggestedUpgradePlan,
  };
}

function suggestUpgrade(
  plan: SocialBoostPlan,
  reason: MediaDecisionReason,
): SocialBoostPlan | undefined {
  if (reason === 'video_not_in_plan' || reason === 'video_duration_above_plan_cap') {
    if (plan === 'free') return 'starter';
    if (plan === 'starter') return 'pro';
    if (plan === 'pro') return 'business';
    if (plan === 'business') return 'agency';
  }
  if (reason === 'tier_not_in_plan') {
    if (plan === 'free') return 'starter';
    if (plan === 'starter' || plan === 'pro') return 'business';
  }
  if (reason === 'breakthrough_image_manual_review') {
    if (plan === 'free' || plan === 'starter' || plan === 'pro') return 'business';
  }
  if (reason === 'breakthrough_video_manual_review') {
    if (plan !== 'agency') return 'agency';
  }
  if (reason === 'insufficient_credits') {
    if (plan === 'starter') return 'pro';
    if (plan === 'pro') return 'business';
    if (plan === 'business') return 'agency';
  }
  return undefined;
}
