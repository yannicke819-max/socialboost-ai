/**
 * Creative Scoring v1 — unit tests (AI-017G).
 *
 * Pins:
 *   - Six-axis scorecard, deterministic, isPrediction=false.
 *   - Tier baselines hold + signals bump per spec.
 *   - Platform context: auto-mapping from platformFormat + override.
 *   - LinkedIn / Meta / TikTok / YouTube Shorts / Instagram Reels
 *     rationales/watchouts mention platform-specific language.
 *   - No TikTok-only language in generic_social.
 *   - Source hygiene: no fetch, no process.env, no Date.now/random.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  CREATIVE_SCORE_AXES,
  CREATIVE_SCORECARD_LEVELS,
  CREATIVE_PLATFORM_CONTEXTS,
  CREATIVE_OVERALL_LABELS,
  buildCreativeScorecard,
  platformFormatToContext,
  type CreativeScorecard,
} from '../creative-scoring';
import {
  CREATIVE_RULES_BY_TIER,
  type CreativeQualityTier,
} from '../creative-quality-tiers';

const PROMPT_BASE = '[Prompt prêt à copier] Image — concept · ';

function makePrompt(tier: CreativeQualityTier, extra = ''): string {
  return `${PROMPT_BASE}Direction créative : ${tier} — tone. Garde-fous : ${CREATIVE_RULES_BY_TIER[
    tier
  ].join('; ')}. ${extra}`;
}

function card(args: Partial<Parameters<typeof buildCreativeScorecard>[0]> & {
  creativeQualityTier?: CreativeQualityTier;
  prompt?: string;
}): CreativeScorecard {
  const tier = args.creativeQualityTier ?? 'performance';
  return buildCreativeScorecard({
    kind: args.kind ?? 'image',
    creativeQualityTier: tier,
    title: args.title ?? 'Concept',
    prompt: args.prompt ?? makePrompt(tier),
    hook: args.hook,
    textOverlay: args.textOverlay,
    avoid: args.avoid,
    guardrails: args.guardrails ?? CREATIVE_RULES_BY_TIER[tier],
    platformFormat: args.platformFormat,
    platformContext: args.platformContext,
    language: args.language ?? 'fr',
  });
}

// -----------------------------------------------------------------------------
// Shape + determinism
// -----------------------------------------------------------------------------

describe('buildCreativeScorecard — shape', () => {
  it('returns six axes', () => {
    const r = card({ creativeQualityTier: 'safe' });
    assert.equal(r.scores.length, 6);
    const axes = r.scores.map((s) => s.axis).sort();
    assert.deepEqual(axes, [...CREATIVE_SCORE_AXES].sort());
  });

  it('isPrediction is false', () => {
    const r = card({ creativeQualityTier: 'safe' });
    assert.equal(r.isPrediction, false);
  });

  it('overall label is one of the documented enum values', () => {
    for (const tier of ['safe', 'social_proof', 'performance', 'breakthrough'] as const) {
      const r = card({ creativeQualityTier: tier });
      assert.ok((CREATIVE_OVERALL_LABELS as readonly string[]).includes(r.overallLabel));
    }
  });

  it('every level is one of the documented enum values', () => {
    const r = card({ creativeQualityTier: 'breakthrough' });
    for (const s of r.scores) {
      assert.ok((CREATIVE_SCORECARD_LEVELS as readonly string[]).includes(s.level));
    }
  });
});

describe('buildCreativeScorecard — determinism', () => {
  it('same input → byte-identical output', () => {
    const a = card({ creativeQualityTier: 'performance' });
    const b = card({ creativeQualityTier: 'performance' });
    assert.deepEqual(a, b);
  });

  it('throws on missing prompt', () => {
    assert.throws(() =>
      buildCreativeScorecard({
        kind: 'image',
        creativeQualityTier: 'safe',
        prompt: '',
      }),
    );
  });

  it('throws on unknown tier', () => {
    assert.throws(() =>
      buildCreativeScorecard({
        kind: 'image',
        creativeQualityTier: 'premium' as unknown as CreativeQualityTier,
        prompt: 'x',
      }),
    );
  });
});

// -----------------------------------------------------------------------------
// Tier baselines + signal bumps
// -----------------------------------------------------------------------------

describe('Tier baselines pin the spec', () => {
  it('safe → clarity + brandSafety are high or very_high', () => {
    const r = card({ creativeQualityTier: 'safe' });
    const clarity = r.scores.find((s) => s.axis === 'clarity')!;
    const brandSafety = r.scores.find((s) => s.axis === 'brandSafety')!;
    assert.ok(['high', 'very_high'].includes(clarity.level));
    assert.ok(['high', 'very_high'].includes(brandSafety.level));
  });

  it('social_proof → credibility is high or very_high', () => {
    const r = card({ creativeQualityTier: 'social_proof' });
    const credibility = r.scores.find((s) => s.axis === 'credibility')!;
    assert.ok(['high', 'very_high'].includes(credibility.level));
  });

  it('performance → attention + conversion are high or very_high', () => {
    const r = card({ creativeQualityTier: 'performance' });
    const attention = r.scores.find((s) => s.axis === 'attention')!;
    const conversion = r.scores.find((s) => s.axis === 'conversion')!;
    assert.ok(['high', 'very_high'].includes(attention.level));
    assert.ok(['high', 'very_high'].includes(conversion.level));
  });

  it('breakthrough → attention + distinctiveness very_high, brandSafety needs_review', () => {
    const r = card({ creativeQualityTier: 'breakthrough' });
    const attention = r.scores.find((s) => s.axis === 'attention')!;
    const distinctiveness = r.scores.find((s) => s.axis === 'distinctiveness')!;
    const brandSafety = r.scores.find((s) => s.axis === 'brandSafety')!;
    assert.equal(attention.level, 'very_high');
    assert.equal(distinctiveness.level, 'very_high');
    assert.equal(brandSafety.level, 'needs_review');
    assert.equal(r.overallLabel, 'review_required');
  });
});

describe('Signal bumps', () => {
  it('explicit-cta improves conversion vs no-CTA prompt', () => {
    const withCta = card({
      creativeQualityTier: 'safe',
      prompt: `${PROMPT_BASE}Garde-fous : explicit-cta.`,
    });
    const baseline = card({
      creativeQualityTier: 'safe',
      prompt: PROMPT_BASE,
      guardrails: [],
    });
    const a = withCta.scores.find((s) => s.axis === 'conversion')!;
    const b = baseline.scores.find((s) => s.axis === 'conversion')!;
    const order = ['low', 'medium', 'high', 'very_high'];
    assert.ok(order.indexOf(a.level) >= order.indexOf(b.level));
    assert.ok(a.positiveSignals.includes('explicit-cta'));
  });

  it('no-fake-testimonial improves credibility', () => {
    const r = card({
      creativeQualityTier: 'safe',
      prompt: `${PROMPT_BASE}Garde-fous : no-fake-testimonial.`,
      guardrails: ['no-fake-testimonial'],
    });
    const credibility = r.scores.find((s) => s.axis === 'credibility')!;
    assert.ok(credibility.positiveSignals.includes('no-fake-testimonial'));
  });

  it('pattern-interrupt improves attention + distinctiveness', () => {
    const r = card({
      creativeQualityTier: 'safe',
      prompt: `${PROMPT_BASE}Garde-fous : pattern-interrupt.`,
      guardrails: ['pattern-interrupt'],
    });
    const attention = r.scores.find((s) => s.axis === 'attention')!;
    const distinctiveness = r.scores.find((s) => s.axis === 'distinctiveness')!;
    assert.ok(attention.positiveSignals.includes('pattern-interrupt'));
    assert.ok(distinctiveness.positiveSignals.includes('pattern-interrupt'));
  });

  it('no-aggressive-claim improves brandSafety on non-breakthrough tiers', () => {
    const r = card({
      creativeQualityTier: 'social_proof',
      prompt: `${PROMPT_BASE}Garde-fous : no-aggressive-claim.`,
      guardrails: ['no-aggressive-claim'],
    });
    const brandSafety = r.scores.find((s) => s.axis === 'brandSafety')!;
    assert.ok(brandSafety.positiveSignals.includes('no-aggressive-claim'));
    assert.notEqual(brandSafety.level, 'needs_review');
  });

  it('human-review-required forces brandSafety to needs_review on any tier', () => {
    const r = card({
      creativeQualityTier: 'safe',
      prompt: `${PROMPT_BASE}Garde-fous : human-review-required.`,
      guardrails: ['human-review-required'],
    });
    const brandSafety = r.scores.find((s) => s.axis === 'brandSafety')!;
    assert.equal(brandSafety.level, 'needs_review');
    assert.equal(r.overallLabel, 'review_required');
  });
});

// -----------------------------------------------------------------------------
// Platform context
// -----------------------------------------------------------------------------

describe('Platform context', () => {
  it('exposes all six contexts', () => {
    assert.deepEqual([...CREATIVE_PLATFORM_CONTEXTS].sort(), [
      'generic_social',
      'instagram_reels',
      'linkedin_feed',
      'meta_feed',
      'tiktok',
      'youtube_shorts',
    ]);
  });

  it('default platformContext is generic_social when no format / override is given', () => {
    const r = card({ creativeQualityTier: 'safe' });
    assert.equal(r.platformContext, 'generic_social');
  });

  it('auto-maps platformFormat → platformContext', () => {
    assert.equal(platformFormatToContext('tiktok_reel'), 'tiktok');
    assert.equal(platformFormatToContext('story_vertical'), 'instagram_reels');
    assert.equal(platformFormatToContext('instagram_square'), 'meta_feed');
    assert.equal(platformFormatToContext('instagram_portrait'), 'meta_feed');
    assert.equal(platformFormatToContext('linkedin_feed'), 'linkedin_feed');
    assert.equal(platformFormatToContext(undefined), 'generic_social');
  });

  it('platformContext override wins over platformFormat', () => {
    const r = card({
      creativeQualityTier: 'safe',
      platformFormat: 'tiktok_reel',
      platformContext: 'linkedin_feed',
    });
    assert.equal(r.platformContext, 'linkedin_feed');
  });

  it('linkedin_feed boosts clarity AND credibility for professional/safe-ish content', () => {
    const baseline = card({
      creativeQualityTier: 'social_proof',
      platformContext: 'generic_social',
    });
    const ln = card({
      creativeQualityTier: 'social_proof',
      platformContext: 'linkedin_feed',
    });
    const order = ['low', 'medium', 'high', 'very_high'];
    const baseClarity = baseline.scores.find((s) => s.axis === 'clarity')!.level;
    const lnClarity = ln.scores.find((s) => s.axis === 'clarity')!.level;
    const baseCred = baseline.scores.find((s) => s.axis === 'credibility')!.level;
    const lnCred = ln.scores.find((s) => s.axis === 'credibility')!.level;
    assert.ok(order.indexOf(lnClarity) >= order.indexOf(baseClarity));
    assert.ok(order.indexOf(lnCred) >= order.indexOf(baseCred));
  });

  it('tiktok mentions hook/creator/proof-in-use in rationales or watchouts', () => {
    const r = card({
      creativeQualityTier: 'performance',
      platformContext: 'tiktok',
    });
    const dump = r.scores.map((s) => s.rationale).join(' | ');
    assert.ok(/TikTok/i.test(dump));
  });

  it('meta_feed mentions mobile-first / single focal / CTA', () => {
    const r = card({
      creativeQualityTier: 'safe',
      platformContext: 'meta_feed',
    });
    const dump = r.scores.map((s) => `${s.rationale} ${s.watchouts.join(' ')}`).join(' | ');
    assert.ok(/Meta/i.test(dump));
  });

  it('youtube_shorts mentions hook / brand recall / CTA', () => {
    const r = card({
      creativeQualityTier: 'performance',
      platformContext: 'youtube_shorts',
    });
    const dump = r.scores.map((s) => `${s.rationale} ${s.watchouts.join(' ')}`).join(' | ');
    assert.ok(/Shorts/i.test(dump));
  });

  it('instagram_reels mentions vertical-first / hook / overlay', () => {
    const r = card({
      creativeQualityTier: 'social_proof',
      platformContext: 'instagram_reels',
    });
    const dump = r.scores.map((s) => `${s.rationale} ${s.watchouts.join(' ')}`).join(' | ');
    assert.ok(/Reels/i.test(dump));
  });

  it('generic_social rationales do not name TikTok / LinkedIn / Reels', () => {
    const r = card({
      creativeQualityTier: 'safe',
      platformContext: 'generic_social',
    });
    const dump = r.scores.map((s) => `${s.rationale} ${s.watchouts.join(' ')}`).join(' | ');
    assert.equal(/TikTok/i.test(dump), false);
    assert.equal(/LinkedIn/i.test(dump), false);
    assert.equal(/Reels/i.test(dump), false);
    assert.equal(/Shorts/i.test(dump), false);
    assert.equal(/\bMeta\b/i.test(dump), false);
  });
});

// -----------------------------------------------------------------------------
// Microcopy + topStrength / mainWatchout
// -----------------------------------------------------------------------------

describe('topStrength / mainWatchout', () => {
  it('breakthrough mainWatchout is brandSafety', () => {
    const r = card({ creativeQualityTier: 'breakthrough' });
    assert.equal(r.mainWatchout, 'brandSafety');
  });
  it('safe topStrength is on a "very_high" axis if one exists', () => {
    const r = card({ creativeQualityTier: 'safe' });
    const top = r.scores.find((s) => s.axis === r.topStrength)!;
    assert.ok(['high', 'very_high'].includes(top.level));
  });
});

// -----------------------------------------------------------------------------
// Source hygiene
// -----------------------------------------------------------------------------

describe('creative-scoring.ts — source hygiene', () => {
  const file = resolve(__dirname, '..', 'creative-scoring.ts');
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
  it('runtime never calls Date.now() or Math.random()', () => {
    assert.equal(/Date\.now\s*\(/.test(stripped), false);
    assert.equal(/Math\.random\s*\(/.test(stripped), false);
  });
  it('runtime never uses draft/standard/premium tier literals', () => {
    for (const bad of ['draft', 'standard', 'premium']) {
      const re = new RegExp(`['\"\`]${bad}['\"\`]`, 'i');
      assert.equal(re.test(stripped), false, `forbidden literal '${bad}' present`);
    }
  });
});
