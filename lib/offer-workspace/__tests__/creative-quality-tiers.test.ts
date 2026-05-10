/**
 * Creative Quality Tiers v1 — unit tests (AI-017C).
 *
 * Pins:
 *   - Exhaustive tier list: safe / social_proof / performance / breakthrough.
 *   - No 'draft' / 'standard' / 'premium' labels in the media model.
 *   - Per-tier strategy criteria (clarity, social proof guardrail,
 *     performance hook + CTA, breakthrough pattern interrupt).
 *   - Credit costs match the spec exactly.
 *   - Breakthrough video is always humanReviewRequired.
 *   - Pure module: no fetch / no process.env in source.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  CREATIVE_QUALITY_TIERS,
  CREATIVE_STRATEGIES,
  FORBIDDEN_MEDIA_TIER_LABELS,
  IMAGE_CREDITS_BY_TIER,
  MEDIA_KINDS,
  VIDEO_CREDITS_PER_SECOND_BY_TIER,
  estimateMediaCost,
  type CreativeQualityTier,
} from '../creative-quality-tiers';

// -----------------------------------------------------------------------------
// Tier surface
// -----------------------------------------------------------------------------

describe('CREATIVE_QUALITY_TIERS — exhaustive list', () => {
  it('has exactly the four product-defined tiers', () => {
    assert.deepEqual([...CREATIVE_QUALITY_TIERS].sort(), [
      'breakthrough',
      'performance',
      'safe',
      'social_proof',
    ]);
  });

  it('does not use generic technical labels', () => {
    for (const t of CREATIVE_QUALITY_TIERS) {
      assert.equal((FORBIDDEN_MEDIA_TIER_LABELS as readonly string[]).includes(t), false);
    }
  });

  it('exposes a strategy for every tier', () => {
    for (const t of CREATIVE_QUALITY_TIERS) {
      const s = CREATIVE_STRATEGIES[t];
      assert.equal(s.tier, t);
      assert.ok(s.label.length > 0);
      assert.ok(s.rationale.length > 0);
      assert.ok(s.criteria.length > 0);
      assert.ok([1, 2, 3, 4].includes(s.brandSafetyRisk));
      assert.ok(s.attentionScoreHint >= 0 && s.attentionScoreHint <= 100);
      assert.ok(s.conversionIntentHint >= 0 && s.conversionIntentHint <= 100);
    }
  });
});

// -----------------------------------------------------------------------------
// Strategy criteria (the product-differentiating substance)
// -----------------------------------------------------------------------------

describe('CREATIVE_STRATEGIES — per-tier criteria substance', () => {
  it('safe carries clarity + low-claim guardrails', () => {
    const c = CREATIVE_STRATEGIES.safe;
    const dump = c.criteria.join(' | ');
    assert.match(dump, /clair/i);
    assert.match(dump, /garantis|absolu/i);
    assert.equal(c.brandSafetyRisk, 1);
    assert.equal(c.humanReviewRequired, false);
  });

  it('social_proof guards against fake testimonials', () => {
    const c = CREATIVE_STRATEGIES.social_proof;
    const dump = c.criteria.join(' | ').toLowerCase();
    assert.match(dump, /témoignage/);
    assert.match(dump, /faux/);
    assert.match(dump, /consentement/);
    assert.equal(c.humanReviewRequired, false);
  });

  it('performance carries hook + CTA + mobile-first criteria', () => {
    const c = CREATIVE_STRATEGIES.performance;
    const dump = c.criteria.join(' | ').toLowerCase();
    assert.match(dump, /hook/);
    assert.match(dump, /cta/);
    assert.match(dump, /mobile-first|9:16|4:5/);
    assert.match(dump, /objection/);
    assert.equal(c.humanReviewRequired, false);
  });

  it('breakthrough requires pattern interrupt + distinctiveness + human review', () => {
    const c = CREATIVE_STRATEGIES.breakthrough;
    const dump = c.criteria.join(' | ').toLowerCase();
    assert.match(dump, /pattern\s+interrupt/);
    assert.match(dump, /distinctif|inattendu/);
    assert.match(dump, /review\s+humaine/);
    assert.equal(c.humanReviewRequired, true);
    assert.equal(c.brandSafetyRisk, 4);
  });
});

// -----------------------------------------------------------------------------
// Credit policy
// -----------------------------------------------------------------------------

describe('Credit policy matches the spec exactly', () => {
  it('image credits per tier', () => {
    assert.equal(IMAGE_CREDITS_BY_TIER.safe, 5);
    assert.equal(IMAGE_CREDITS_BY_TIER.social_proof, 10);
    assert.equal(IMAGE_CREDITS_BY_TIER.performance, 15);
    assert.equal(IMAGE_CREDITS_BY_TIER.breakthrough, 35);
  });

  it('video credits per second per tier', () => {
    assert.equal(VIDEO_CREDITS_PER_SECOND_BY_TIER.safe, 6);
    assert.equal(VIDEO_CREDITS_PER_SECOND_BY_TIER.social_proof, 10);
    assert.equal(VIDEO_CREDITS_PER_SECOND_BY_TIER.performance, 15);
    assert.equal(VIDEO_CREDITS_PER_SECOND_BY_TIER.breakthrough, 40);
  });

  it('safe image is cheaper than performance image', () => {
    assert.ok(IMAGE_CREDITS_BY_TIER.safe < IMAGE_CREDITS_BY_TIER.performance);
  });

  it('breakthrough image is the most expensive image tier', () => {
    const max = Math.max(...Object.values(IMAGE_CREDITS_BY_TIER));
    assert.equal(IMAGE_CREDITS_BY_TIER.breakthrough, max);
  });

  it('breakthrough video per-second is the most expensive video tier', () => {
    const max = Math.max(...Object.values(VIDEO_CREDITS_PER_SECOND_BY_TIER));
    assert.equal(VIDEO_CREDITS_PER_SECOND_BY_TIER.breakthrough, max);
  });
});

// -----------------------------------------------------------------------------
// estimateMediaCost
// -----------------------------------------------------------------------------

describe('estimateMediaCost — pure deterministic estimate', () => {
  it('image safe → 5 credits + matching strategy', () => {
    const r = estimateMediaCost({ kind: 'image', tier: 'safe' });
    assert.equal(r.estimatedCredits, 5);
    assert.equal(r.creativeQualityTier, 'safe');
    assert.equal(r.creativeStrategy.tier, 'safe');
    assert.equal(r.brandSafetyRisk, 1);
    assert.equal(r.humanReviewRequired, false);
  });

  it('image breakthrough → 35 credits + humanReviewRequired=true', () => {
    const r = estimateMediaCost({ kind: 'image', tier: 'breakthrough' });
    assert.equal(r.estimatedCredits, 35);
    assert.equal(r.humanReviewRequired, true);
  });

  it('video safe 6s → 36 credits', () => {
    const r = estimateMediaCost({ kind: 'video', tier: 'safe', videoDurationSec: 6 });
    assert.equal(r.estimatedCredits, 36);
  });

  it('video performance 15s → 225 credits', () => {
    const r = estimateMediaCost({
      kind: 'video',
      tier: 'performance',
      videoDurationSec: 15,
    });
    assert.equal(r.estimatedCredits, 225);
  });

  it('video breakthrough 15s → 600 credits AND humanReviewRequired=true (always)', () => {
    const r = estimateMediaCost({
      kind: 'video',
      tier: 'breakthrough',
      videoDurationSec: 15,
    });
    assert.equal(r.estimatedCredits, 600);
    assert.equal(r.humanReviewRequired, true);
  });

  it('throws on unknown tier', () => {
    assert.throws(() =>
      estimateMediaCost({ kind: 'image', tier: 'premium' as unknown as CreativeQualityTier }),
    );
  });

  it('throws on missing video duration', () => {
    assert.throws(() => estimateMediaCost({ kind: 'video', tier: 'safe' }));
  });

  it('exposes attention + conversion hints from the strategy', () => {
    const safe = estimateMediaCost({ kind: 'image', tier: 'safe' });
    const perf = estimateMediaCost({ kind: 'image', tier: 'performance' });
    const bt = estimateMediaCost({ kind: 'image', tier: 'breakthrough' });
    assert.ok(safe.attentionScoreHint < perf.attentionScoreHint);
    assert.ok(perf.attentionScoreHint < bt.attentionScoreHint);
  });
});

// -----------------------------------------------------------------------------
// Hygiene — source has no fetch / no process.env
// -----------------------------------------------------------------------------

describe('creative-quality-tiers.ts — source hygiene', () => {
  const file = resolve(__dirname, '..', 'creative-quality-tiers.ts');
  const src = readFileSync(file, 'utf8');
  const stripped = src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

  it('runtime never calls fetch', () => {
    assert.equal(/\bfetch\s*\(/.test(stripped), false);
  });
  it('runtime never reads process.env', () => {
    assert.equal(/process\.env/.test(stripped), false);
  });
  it('runtime never calls Date.now()', () => {
    assert.equal(/Date\.now\s*\(/.test(stripped), false);
  });

  it('runtime never uses the forbidden tier labels as media tier names', () => {
    // The single allowed mention is the FORBIDDEN_MEDIA_TIER_LABELS
    // constant itself, which lists those names in order to forbid them.
    // Strip that declaration before scanning the runtime body.
    const withoutForbiddenList = stripped.replace(
      /export const FORBIDDEN_MEDIA_TIER_LABELS[\s\S]*?\] as const;/,
      '',
    );
    for (const bad of ['draft', 'standard', 'premium']) {
      const re = new RegExp(`['\"\`]${bad}['\"\`]`, 'i');
      assert.equal(
        re.test(withoutForbiddenList),
        false,
        `forbidden literal '${bad}' present`,
      );
    }
  });

  it('exports the four tiers and the two media kinds', () => {
    assert.equal(MEDIA_KINDS.length, 2);
    assert.equal(CREATIVE_QUALITY_TIERS.length, 4);
  });
});
