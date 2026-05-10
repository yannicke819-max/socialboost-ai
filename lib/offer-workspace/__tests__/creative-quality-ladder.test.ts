/**
 * Creative Quality Ladder + Score Hints — unit tests (AI-017D).
 *
 * Pins the product-grade additions on top of AI-017C:
 *   - Every tier has score hints across six axes.
 *   - Every tier has a creative-rules array.
 *   - Per-tier rule substance pinned (safe / social_proof /
 *     performance / breakthrough).
 *   - Score hints match the spec exactly.
 *   - Ladder doc-grade descriptors present and non-empty.
 *   - No 'draft' / 'standard' / 'premium' leak in the new surfaces.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  CREATIVE_LADDER,
  CREATIVE_QUALITY_TIERS,
  CREATIVE_RULES_BY_TIER,
  CREATIVE_SCORE_HINTS_BY_TIER,
  CREATIVE_SCORE_LEVELS,
  CREATIVE_STRATEGIES,
  estimateMediaCost,
  type CreativeLadderEntry,
  type CreativeScoreHints,
  type CreativeScoreLevel,
} from '../creative-quality-tiers';

// -----------------------------------------------------------------------------
// Score hints
// -----------------------------------------------------------------------------

describe('CREATIVE_SCORE_LEVELS — discrete levels', () => {
  it('has exactly the six product-defined levels', () => {
    assert.deepEqual([...CREATIVE_SCORE_LEVELS].sort(), [
      'high',
      'low',
      'medium',
      'needs_review',
      'very_high',
    ]);
  });
});

describe('CREATIVE_SCORE_HINTS_BY_TIER — every tier has hints across six axes', () => {
  const required: (keyof CreativeScoreHints)[] = [
    'attention',
    'clarity',
    'credibility',
    'conversionIntent',
    'distinctiveness',
    'brandSafety',
  ];
  for (const t of CREATIVE_QUALITY_TIERS) {
    it(`${t} exposes all six score hints with valid levels`, () => {
      const h = CREATIVE_SCORE_HINTS_BY_TIER[t];
      for (const axis of required) {
        assert.ok(
          (CREATIVE_SCORE_LEVELS as readonly string[]).includes(h[axis] as string),
          `${t}.${axis} = "${h[axis]}" not in CREATIVE_SCORE_LEVELS`,
        );
      }
    });
  }

  it('safe profile matches the spec', () => {
    assert.deepEqual(CREATIVE_SCORE_HINTS_BY_TIER.safe, {
      attention: 'medium',
      clarity: 'high',
      credibility: 'medium',
      conversionIntent: 'medium',
      distinctiveness: 'low',
      brandSafety: 'high',
    });
  });

  it('social_proof profile matches the spec', () => {
    assert.deepEqual(CREATIVE_SCORE_HINTS_BY_TIER.social_proof, {
      attention: 'medium',
      clarity: 'high',
      credibility: 'high',
      conversionIntent: 'medium',
      distinctiveness: 'medium',
      brandSafety: 'high',
    });
  });

  it('performance profile matches the spec', () => {
    assert.deepEqual(CREATIVE_SCORE_HINTS_BY_TIER.performance, {
      attention: 'high',
      clarity: 'high',
      credibility: 'medium',
      conversionIntent: 'high',
      distinctiveness: 'medium',
      brandSafety: 'medium',
    });
  });

  it('breakthrough profile matches the spec — brandSafety = needs_review', () => {
    assert.deepEqual(CREATIVE_SCORE_HINTS_BY_TIER.breakthrough, {
      attention: 'very_high',
      clarity: 'medium',
      credibility: 'medium',
      conversionIntent: 'high',
      distinctiveness: 'very_high',
      brandSafety: 'needs_review',
    });
  });

  it('only breakthrough is `needs_review` on brandSafety', () => {
    const flagged = CREATIVE_QUALITY_TIERS.filter(
      (t) => CREATIVE_SCORE_HINTS_BY_TIER[t].brandSafety === 'needs_review',
    );
    assert.deepEqual(flagged, ['breakthrough']);
  });

  it('only breakthrough hits very_high on distinctiveness or attention', () => {
    for (const t of CREATIVE_QUALITY_TIERS) {
      const h = CREATIVE_SCORE_HINTS_BY_TIER[t];
      if (t === 'breakthrough') {
        assert.equal(h.distinctiveness, 'very_high');
        assert.equal(h.attention, 'very_high');
      } else {
        assert.notEqual(h.distinctiveness, 'very_high');
        assert.notEqual(h.attention, 'very_high');
      }
    }
  });
});

// -----------------------------------------------------------------------------
// Creative rules
// -----------------------------------------------------------------------------

describe('CREATIVE_RULES_BY_TIER — substance per tier', () => {
  it('every tier has at least one rule', () => {
    for (const t of CREATIVE_QUALITY_TIERS) {
      assert.ok(CREATIVE_RULES_BY_TIER[t].length > 0);
    }
  });

  it('safe includes no-aggressive-claim', () => {
    assert.ok(CREATIVE_RULES_BY_TIER.safe.includes('no-aggressive-claim'));
    assert.ok(CREATIVE_RULES_BY_TIER.safe.includes('single-message'));
    assert.ok(CREATIVE_RULES_BY_TIER.safe.includes('benefit-led'));
    assert.ok(CREATIVE_RULES_BY_TIER.safe.includes('brand-safe-visual'));
  });

  it('social_proof includes no-fake-testimonial AND proof-without-fabrication', () => {
    const r = CREATIVE_RULES_BY_TIER.social_proof;
    assert.ok(r.includes('no-fake-testimonial'));
    assert.ok(r.includes('proof-without-fabrication'));
    assert.ok(r.includes('human-first'));
    assert.ok(r.includes('product-in-use'));
    assert.ok(r.includes('ugc-compatible'));
  });

  it('performance includes hook-first-2s AND explicit-cta', () => {
    const r = CREATIVE_RULES_BY_TIER.performance;
    assert.ok(r.includes('hook-first-2s'));
    assert.ok(r.includes('explicit-cta'));
    assert.ok(r.includes('objection-handling'));
    assert.ok(r.includes('mobile-first'));
    assert.ok(r.includes('product-visible-early'));
  });

  it('breakthrough includes pattern-interrupt AND human-review-required AND never-automatic-video', () => {
    const r = CREATIVE_RULES_BY_TIER.breakthrough;
    assert.ok(r.includes('pattern-interrupt'));
    assert.ok(r.includes('human-review-required'));
    assert.ok(r.includes('never-automatic-video'));
    assert.ok(r.includes('emotional-contrast'));
    assert.ok(r.includes('unusual-angle'));
    assert.ok(r.includes('memorable-visual'));
  });

  it('no rule slug uses draft/standard/premium', () => {
    for (const t of CREATIVE_QUALITY_TIERS) {
      for (const rule of CREATIVE_RULES_BY_TIER[t]) {
        assert.equal(/draft|standard|premium/i.test(rule), false, `rule "${rule}"`);
      }
    }
  });
});

// -----------------------------------------------------------------------------
// Creative ladder doc-grade descriptors
// -----------------------------------------------------------------------------

describe('CREATIVE_LADDER — every tier has full doc-grade descriptors', () => {
  const required: (keyof CreativeLadderEntry)[] = [
    'objective',
    'whenToUse',
    'creativeStructure',
    'performanceSignals',
    'risks',
    'guardrails',
    'directionalPromptExample',
  ];
  for (const t of CREATIVE_QUALITY_TIERS) {
    it(`${t} exposes all required ladder fields, non-empty`, () => {
      const e = CREATIVE_LADDER[t];
      assert.equal(e.tier, t);
      for (const k of required) {
        const v = e[k];
        if (Array.isArray(v)) {
          assert.ok(v.length > 0, `${t}.${k} is empty`);
        } else {
          assert.ok(typeof v === 'string' && v.length > 0, `${t}.${k} is empty`);
        }
      }
    });
  }

  it('breakthrough.guardrails contains human-review-required AND never-automatic-video', () => {
    const g = CREATIVE_LADDER.breakthrough.guardrails;
    assert.ok(g.includes('human-review-required'));
    assert.ok(g.includes('never-automatic-video'));
  });

  it('safe.guardrails forbids aggressive claims', () => {
    const g = CREATIVE_LADDER.safe.guardrails;
    assert.ok(g.includes('no-aggressive-claim'));
    assert.ok(g.includes('brand-safe-visual'));
  });
});

// -----------------------------------------------------------------------------
// CreativeStrategy mirrors the new surfaces
// -----------------------------------------------------------------------------

describe('CREATIVE_STRATEGIES exposes scoreHints + rules + ladder', () => {
  for (const t of CREATIVE_QUALITY_TIERS) {
    it(`${t} strategy carries the new fields with consistent values`, () => {
      const s = CREATIVE_STRATEGIES[t];
      assert.deepEqual(s.scoreHints, CREATIVE_SCORE_HINTS_BY_TIER[t]);
      assert.deepEqual(s.rules, CREATIVE_RULES_BY_TIER[t]);
      assert.deepEqual(s.ladder, CREATIVE_LADDER[t]);
    });
  }
});

// -----------------------------------------------------------------------------
// estimateMediaCost surfaces hints + rules
// -----------------------------------------------------------------------------

describe('estimateMediaCost surfaces score hints + rules', () => {
  it('image safe estimate exposes hints + rules', () => {
    const e = estimateMediaCost({ kind: 'image', tier: 'safe' });
    assert.deepEqual(e.scoreHints, CREATIVE_SCORE_HINTS_BY_TIER.safe);
    assert.deepEqual(e.rules, CREATIVE_RULES_BY_TIER.safe);
  });

  it('video breakthrough estimate exposes needs_review + never-automatic-video', () => {
    const e = estimateMediaCost({
      kind: 'video',
      tier: 'breakthrough',
      videoDurationSec: 6,
    });
    assert.equal(e.scoreHints.brandSafety, 'needs_review');
    assert.ok(e.rules.includes('never-automatic-video'));
    assert.equal(e.humanReviewRequired, true);
  });
});

// -----------------------------------------------------------------------------
// Docs presence
// -----------------------------------------------------------------------------

describe('docs/creative-quality-ladder.md', () => {
  const file = resolve(__dirname, '..', '..', '..', 'docs', 'creative-quality-ladder.md');
  const src = readFileSync(file, 'utf8');

  it('contains the "Creative Quality Ladder" heading', () => {
    assert.match(src, /Creative Quality Ladder/);
  });

  it('mentions all four tiers', () => {
    assert.match(src, /\bsafe\b/);
    assert.match(src, /\bsocial_proof\b/);
    assert.match(src, /\bperformance\b/);
    assert.match(src, /\bbreakthrough\b/);
  });

  it('lists the six matrix sections per tier', () => {
    for (const heading of [
      'Objectif',
      "Quand l'utiliser",
      'Structure créative',
      'Signaux de performance',
      'Risques',
      'Guardrails',
      'Exemple de prompt directionnel',
    ]) {
      assert.ok(src.includes(heading), `missing heading "${heading}"`);
    }
  });

  it('does not introduce draft/standard/premium tier names', () => {
    // Allow textual mentions in the explicit "what we do NOT use"
    // section, but no `**draft**`, `**standard**`, `**premium**` as
    // tier headers.
    assert.equal(/^##\s+(draft|standard|premium)\b/im.test(src), false);
  });
});

// -----------------------------------------------------------------------------
// Source hygiene — no fetch / no process.env
// -----------------------------------------------------------------------------

describe('creative-quality-tiers.ts — source hygiene (AI-017D additions)', () => {
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
  it('runtime never references provider env names', () => {
    assert.equal(stripped.includes('SOCIALBOOST_OPENAI'), false);
    assert.equal(stripped.includes('OPENAI_API_KEY'), false);
  });
});

// -----------------------------------------------------------------------------
// Type-level: a CreativeScoreLevel value typechecks where it should
// -----------------------------------------------------------------------------

const _typecheck: CreativeScoreLevel = 'needs_review';
void _typecheck;
