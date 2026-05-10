/**
 * Media Entitlements v1 — unit tests (AI-017C).
 *
 * Pins the per-plan capability table + the Free hard rule + the
 * breakthrough-video manual-review invariant.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PLAN_MEDIA_CAPABILITIES,
  decideMediaExecution,
} from '../media-entitlements';
import { CREATIVE_QUALITY_TIERS } from '../creative-quality-tiers';
import { SOCIALBOOST_PLANS, type SocialBoostPlan } from '../ai-cost-model';

// -----------------------------------------------------------------------------
// Free hard rule — every combination → prompt_only, zero admin cost.
// -----------------------------------------------------------------------------

describe('decideMediaExecution — Free hard rule', () => {
  for (const tier of CREATIVE_QUALITY_TIERS) {
    for (const flag of [true, false]) {
      it(`Free × image × ${tier} × flag=${flag} → prompt_only, no provider, no cost`, () => {
        const r = decideMediaExecution({
          plan: 'free',
          kind: 'image',
          tier,
          mediaProviderFlagEnabled: flag,
        });
        assert.equal(r.mode, 'prompt_only');
        assert.equal(r.mediaProviderCallAllowed, false);
        assert.equal(r.adminCostAllowed, false);
        assert.equal(r.reason, 'free_prompt_only');
      });
      it(`Free × video × ${tier} × flag=${flag} → prompt_only`, () => {
        const r = decideMediaExecution({
          plan: 'free',
          kind: 'video',
          tier,
          videoDurationSec: 6,
          mediaProviderFlagEnabled: flag,
        });
        assert.equal(r.mode, 'prompt_only');
        assert.equal(r.mediaProviderCallAllowed, false);
        assert.equal(r.adminCostAllowed, false);
      });
    }
  }
});

// -----------------------------------------------------------------------------
// Starter — image safe / social_proof / performance only, no video.
// -----------------------------------------------------------------------------

describe('decideMediaExecution — Starter', () => {
  it('image safe → allowed via included credits', () => {
    const r = decideMediaExecution({
      plan: 'starter',
      kind: 'image',
      tier: 'safe',
    });
    assert.equal(r.mode, 'included_credits');
    assert.equal(r.mediaProviderCallAllowed, true);
    assert.equal(r.adminCostAllowed, true);
  });

  it('image performance → allowed', () => {
    const r = decideMediaExecution({
      plan: 'starter',
      kind: 'image',
      tier: 'performance',
    });
    assert.equal(r.mode, 'included_credits');
    assert.equal(r.mediaProviderCallAllowed, true);
  });

  it('image breakthrough → prompt_only with manual-review reason', () => {
    const r = decideMediaExecution({
      plan: 'starter',
      kind: 'image',
      tier: 'breakthrough',
    });
    assert.equal(r.mode, 'prompt_only');
    assert.equal(r.mediaProviderCallAllowed, false);
    assert.equal(r.reason, 'breakthrough_image_manual_review');
    assert.equal(r.humanReviewRequired, true);
  });

  for (const tier of CREATIVE_QUALITY_TIERS) {
    it(`video × ${tier} → prompt_only (Starter has zero video)`, () => {
      const r = decideMediaExecution({
        plan: 'starter',
        kind: 'video',
        tier,
        videoDurationSec: 6,
      });
      assert.equal(r.mode, 'prompt_only');
      assert.equal(r.reason, 'video_not_in_plan');
      assert.equal(r.mediaProviderCallAllowed, false);
    });
  }
});

// -----------------------------------------------------------------------------
// Pro — image up to performance, short video safe / social_proof only.
// -----------------------------------------------------------------------------

describe('decideMediaExecution — Pro', () => {
  it('video safe 15s → allowed', () => {
    const r = decideMediaExecution({
      plan: 'pro',
      kind: 'video',
      tier: 'safe',
      videoDurationSec: 15,
    });
    assert.equal(r.mode, 'included_credits');
    assert.equal(r.mediaProviderCallAllowed, true);
  });

  it('video performance 15s → tier_not_in_plan (Pro stops at social_proof on video)', () => {
    const r = decideMediaExecution({
      plan: 'pro',
      kind: 'video',
      tier: 'performance',
      videoDurationSec: 15,
    });
    assert.equal(r.mode, 'prompt_only');
    assert.equal(r.reason, 'tier_not_in_plan');
  });

  it('video safe 30s → above plan cap (15s)', () => {
    const r = decideMediaExecution({
      plan: 'pro',
      kind: 'video',
      tier: 'safe',
      videoDurationSec: 30,
    });
    assert.equal(r.mode, 'prompt_only');
    assert.equal(r.reason, 'video_duration_above_plan_cap');
  });

  it('image breakthrough → prompt_only (manual review escalation)', () => {
    const r = decideMediaExecution({
      plan: 'pro',
      kind: 'image',
      tier: 'breakthrough',
    });
    assert.equal(r.mode, 'prompt_only');
    assert.equal(r.reason, 'breakthrough_image_manual_review');
  });
});

// -----------------------------------------------------------------------------
// Business — all images, video safe/social_proof/performance.
// -----------------------------------------------------------------------------

describe('decideMediaExecution — Business', () => {
  it('image breakthrough → manual review (allowed but not auto)', () => {
    const r = decideMediaExecution({
      plan: 'business',
      kind: 'image',
      tier: 'breakthrough',
    });
    assert.equal(r.mode, 'manual_review_required');
    assert.equal(r.allowed, true);
    assert.equal(r.mediaProviderCallAllowed, false);
    assert.equal(r.humanReviewRequired, true);
  });

  it('video performance 15s → allowed', () => {
    const r = decideMediaExecution({
      plan: 'business',
      kind: 'video',
      tier: 'performance',
      videoDurationSec: 15,
    });
    assert.equal(r.mode, 'included_credits');
    assert.equal(r.mediaProviderCallAllowed, true);
  });

  it('video breakthrough → prompt_only (Business has no breakthrough-video review path)', () => {
    const r = decideMediaExecution({
      plan: 'business',
      kind: 'video',
      tier: 'breakthrough',
      videoDurationSec: 15,
    });
    assert.equal(r.mode, 'prompt_only');
    assert.equal(r.reason, 'breakthrough_video_manual_review');
    assert.equal(r.mediaProviderCallAllowed, false);
    assert.equal(r.humanReviewRequired, true);
  });
});

// -----------------------------------------------------------------------------
// Agency — breakthrough video manual review only.
// -----------------------------------------------------------------------------

describe('decideMediaExecution — Agency', () => {
  it('video breakthrough → manual_review_required, never automatic', () => {
    const r = decideMediaExecution({
      plan: 'agency',
      kind: 'video',
      tier: 'breakthrough',
      videoDurationSec: 15,
    });
    assert.equal(r.mode, 'manual_review_required');
    assert.equal(r.allowed, true);
    assert.equal(r.mediaProviderCallAllowed, false);
    assert.equal(r.adminCostAllowed, false);
    assert.equal(r.humanReviewRequired, true);
  });
});

// -----------------------------------------------------------------------------
// Breakthrough video is NEVER automatic for any plan.
// -----------------------------------------------------------------------------

describe('Breakthrough video is never automatic', () => {
  for (const plan of SOCIALBOOST_PLANS) {
    it(`${plan} → breakthrough video has mediaProviderCallAllowed=false`, () => {
      const r = decideMediaExecution({
        plan,
        kind: 'video',
        tier: 'breakthrough',
        videoDurationSec: 15,
      });
      assert.equal(r.mediaProviderCallAllowed, false);
      assert.equal(r.humanReviewRequired, true);
    });
  }
});

// -----------------------------------------------------------------------------
// Insufficient credits gate (advisory).
// -----------------------------------------------------------------------------

describe('Credit balance check', () => {
  it('Pro + image performance + remainingMediaCredits=0 → insufficient_credits', () => {
    const r = decideMediaExecution({
      plan: 'pro',
      kind: 'image',
      tier: 'performance',
      remainingMediaCredits: 0,
    });
    assert.equal(r.mode, 'prompt_only');
    assert.equal(r.reason, 'insufficient_credits');
  });

  it('Pro + image performance + remainingMediaCredits=999 → allowed', () => {
    const r = decideMediaExecution({
      plan: 'pro',
      kind: 'image',
      tier: 'performance',
      remainingMediaCredits: 999,
    });
    assert.equal(r.mode, 'included_credits');
  });
});

// -----------------------------------------------------------------------------
// Plan capability table — sanity
// -----------------------------------------------------------------------------

describe('PLAN_MEDIA_CAPABILITIES — sanity', () => {
  it('Free has zero capabilities', () => {
    const cap = PLAN_MEDIA_CAPABILITIES.free;
    assert.equal(cap.imageTiers.length, 0);
    assert.equal(cap.videoTiers.length, 0);
    assert.equal(cap.maxVideoSeconds, 0);
    assert.equal(cap.allowsBreakthroughVideoManualReview, false);
  });

  it('Only Agency allows breakthrough video manual review', () => {
    const allowing = (Object.keys(PLAN_MEDIA_CAPABILITIES) as SocialBoostPlan[]).filter(
      (p) => PLAN_MEDIA_CAPABILITIES[p].allowsBreakthroughVideoManualReview,
    );
    assert.deepEqual(allowing, ['agency']);
  });

  it('Starter has no video at all', () => {
    assert.equal(PLAN_MEDIA_CAPABILITIES.starter.videoTiers.length, 0);
    assert.equal(PLAN_MEDIA_CAPABILITIES.starter.maxVideoSeconds, 0);
  });

  it('paid plans never include breakthrough in their auto videoTiers', () => {
    for (const p of ['starter', 'pro', 'business', 'agency'] as const) {
      assert.equal(PLAN_MEDIA_CAPABILITIES[p].videoTiers.includes('breakthrough'), false);
    }
  });
});
