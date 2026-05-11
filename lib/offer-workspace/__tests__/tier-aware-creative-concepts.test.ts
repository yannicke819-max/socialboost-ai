/**
 * Tier-aware Creative Concepts — unit + integration tests (AI-017F).
 *
 * Pins:
 *   - buildCreativeBriefPack accepts a creativeQualityTier input.
 *   - Default tier is 'performance'.
 *   - Each tier produces visibly different concepts (images, videos,
 *     storyboard) for the same offer.
 *   - Per-tier guardrails are embedded in every prompt body
 *     (kebab-case rules from CREATIVE_RULES_BY_TIER).
 *   - Storyboard beats per-tier carry the spec-pinned timing /
 *     intent (performance starts at 0-2s hook, breakthrough opens on
 *     pattern interrupt, etc.).
 *   - Determinism per (offer, task, language, tier).
 *   - All three call-allowed booleans stay false.
 *   - Studio integration: tier is forwarded to the engine.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildCreativeBriefPack,
  type CreativeBriefPack,
} from '../creative-brief-engine';
import {
  CREATIVE_QUALITY_TIERS,
  CREATIVE_RULES_BY_TIER,
  type CreativeQualityTier,
} from '../creative-quality-tiers';
import type { Offer } from '../types';

const NOW = '2026-05-04T00:00:00Z';

function makeOffer(): Offer {
  return {
    id: 'ofr_tier',
    name: 'Atelier Nova',
    status: 'draft',
    goal: 'social_content',
    language: 'fr',
    brief: {
      businessName: 'Atelier Nova',
      offer: "Programme de 4 semaines pour clarifier l'offre.",
      targetAudience: 'indépendants B2B',
      tone: 'professional',
      language: 'fr',
      platforms: ['linkedin', 'email'],
      proofPoints: ['Méthode testée sur 12 offres'],
    },
    confidence_score: 80,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

const baseOffer = makeOffer();

function pack(tier?: CreativeQualityTier): CreativeBriefPack {
  return buildCreativeBriefPack(
    tier ? { offer: baseOffer, creativeQualityTier: tier } : { offer: baseOffer },
  );
}

// -----------------------------------------------------------------------------
// API
// -----------------------------------------------------------------------------

describe('buildCreativeBriefPack — tier input + default', () => {
  it("default creativeQualityTier is 'performance'", () => {
    const p = pack();
    assert.equal(p.creativeQualityTier, 'performance');
  });

  it('every tier produces a pack carrying the requested tier', () => {
    for (const t of CREATIVE_QUALITY_TIERS) {
      const p = pack(t);
      assert.equal(p.creativeQualityTier, t);
      assert.ok(p.tierTone.length > 0);
      assert.ok(p.tierGuardrails.length > 0);
    }
  });
});

// -----------------------------------------------------------------------------
// Output substance varies by tier
// -----------------------------------------------------------------------------

describe('Output substance varies by tier', () => {
  it('safe vs performance produce different image concepts', () => {
    const a = pack('safe');
    const b = pack('performance');
    assert.notEqual(a.imageConcepts[0]!.title, b.imageConcepts[0]!.title);
    assert.notEqual(a.imageConcepts[0]!.prompt, b.imageConcepts[0]!.prompt);
  });

  it('social_proof vs breakthrough produce different video concepts', () => {
    const a = pack('social_proof');
    const b = pack('breakthrough');
    assert.notEqual(a.videoConcepts[0]!.title, b.videoConcepts[0]!.title);
    assert.notEqual(a.videoConcepts[0]!.hook, b.videoConcepts[0]!.hook);
    assert.notEqual(a.videoConcepts[0]!.prompt, b.videoConcepts[0]!.prompt);
  });

  it('storyboard beats differ between tiers', () => {
    const safe = pack('safe').storyboard;
    const perf = pack('performance').storyboard;
    const bt = pack('breakthrough').storyboard;
    assert.notEqual(safe.beats[0]!.visual, perf.beats[0]!.visual);
    assert.notEqual(perf.beats[0]!.visual, bt.beats[0]!.visual);
  });

  it('storyboard duration stays 15s on every tier', () => {
    for (const t of CREATIVE_QUALITY_TIERS) {
      assert.equal(pack(t).storyboard.durationSec, 15);
    }
  });
});

// -----------------------------------------------------------------------------
// Per-tier substance pinned
// -----------------------------------------------------------------------------

describe('safe — orientation', () => {
  const p = pack('safe');
  it('image titles read calmly (Bénéfice / étape / Outils)', () => {
    const titles = p.imageConcepts.map((c) => c.title).join(' | ');
    assert.match(titles, /(Bénéfice|étape|Outils|Clear|step|Simple)/i);
  });
  it('every prompt embeds the no-aggressive-claim guardrail', () => {
    for (const c of p.imageConcepts) assert.match(c.prompt, /no-aggressive-claim/);
    for (const c of p.videoConcepts) assert.match(c.prompt, /no-aggressive-claim/);
  });
  it('every prompt embeds the brand-safe-visual guardrail', () => {
    for (const c of p.imageConcepts) assert.match(c.prompt, /brand-safe-visual/);
    for (const c of p.videoConcepts) assert.match(c.prompt, /brand-safe-visual/);
  });
  it('tone is "clair, rassurant, pratique"', () => {
    assert.equal(p.tierTone, 'clair, rassurant, pratique');
  });
});

describe('social_proof — orientation', () => {
  const p = pack('social_proof');
  it('image titles read human/usage', () => {
    const titles = p.imageConcepts.map((c) => c.title).join(' | ');
    assert.match(titles, /(client|Usage|Témoignage|real|Everyday|Testimonial)/i);
  });
  it('every prompt embeds no-fake-testimonial guardrail', () => {
    for (const c of p.imageConcepts) assert.match(c.prompt, /no-fake-testimonial/);
    for (const c of p.videoConcepts) assert.match(c.prompt, /no-fake-testimonial/);
  });
  it('every prompt embeds proof-without-fabrication', () => {
    for (const c of p.imageConcepts) assert.match(c.prompt, /proof-without-fabrication/);
    for (const c of p.videoConcepts) assert.match(c.prompt, /proof-without-fabrication/);
  });
});

describe('performance — orientation', () => {
  const p = pack('performance');
  it('image titles read direct-response (Hook / Objection / CTA)', () => {
    const titles = p.imageConcepts.map((c) => c.title).join(' | ');
    assert.match(titles, /(Hook|Objection|CTA)/i);
  });
  it('every prompt embeds hook-first-2s + explicit-cta', () => {
    for (const c of p.imageConcepts) {
      assert.match(c.prompt, /hook-first-2s/);
      assert.match(c.prompt, /explicit-cta/);
    }
    for (const c of p.videoConcepts) {
      assert.match(c.prompt, /hook-first-2s/);
      assert.match(c.prompt, /explicit-cta/);
    }
  });
  it('storyboard opens at 0-2s with a hook', () => {
    const first = p.storyboard.beats[0]!;
    assert.equal(first.secondRange, '0-2s');
    assert.match(first.purpose, /Hook/i);
  });
});

describe('breakthrough — orientation', () => {
  const p = pack('breakthrough');
  it('image titles read distinctive', () => {
    const titles = p.imageConcepts.map((c) => c.title).join(' | ');
    assert.match(titles, /(Pattern|Contraste|Mémoire|Unexpected|Memorable)/i);
  });
  it('every prompt embeds pattern-interrupt + human-review-required', () => {
    for (const c of p.imageConcepts) {
      assert.match(c.prompt, /pattern-interrupt/);
      assert.match(c.prompt, /human-review-required/);
    }
    for (const c of p.videoConcepts) {
      assert.match(c.prompt, /pattern-interrupt/);
      assert.match(c.prompt, /human-review-required/);
    }
  });
  it('every video prompt embeds never-automatic-video', () => {
    for (const c of p.videoConcepts) {
      assert.match(c.prompt, /never-automatic-video/);
    }
  });
  it('storyboard opens with pattern-interrupt purpose at 0-2s', () => {
    const first = p.storyboard.beats[0]!;
    assert.equal(first.secondRange, '0-2s');
    const dump = `${first.visual} | ${first.purpose}`.toLowerCase();
    assert.ok(
      dump.includes('pattern interrupt') || dump.includes('stop the scroll') || dump.includes('stopper'),
    );
  });
});

// -----------------------------------------------------------------------------
// Tier rules surface vs source-of-truth
// -----------------------------------------------------------------------------

describe('pack.tierGuardrails mirrors CREATIVE_RULES_BY_TIER', () => {
  for (const t of CREATIVE_QUALITY_TIERS) {
    it(`${t} tier guardrails === CREATIVE_RULES_BY_TIER[${t}]`, () => {
      const p = pack(t);
      assert.deepEqual([...p.tierGuardrails], [...CREATIVE_RULES_BY_TIER[t]]);
    });
  }
});

// -----------------------------------------------------------------------------
// Determinism + invariants
// -----------------------------------------------------------------------------

describe('Determinism per (offer, task, language, tier)', () => {
  for (const t of CREATIVE_QUALITY_TIERS) {
    it(`${t} pack is byte-identical across two calls`, () => {
      const a = pack(t);
      const b = pack(t);
      assert.deepEqual(a, b);
    });
  }

  it('same offer + different tier → different pack', () => {
    const a = pack('safe');
    const b = pack('performance');
    assert.notDeepEqual(a, b);
  });
});

describe('Invariants preserved on every tier', () => {
  for (const t of CREATIVE_QUALITY_TIERS) {
    it(`${t}: providerCallAllowed/adminCostAllowed/mediaProviderCallAllowed all false`, () => {
      const p = pack(t);
      assert.equal(p.providerCallAllowed, false);
      assert.equal(p.adminCostAllowed, false);
      assert.equal(p.mediaProviderCallAllowed, false);
    });
    it(`${t}: 3 image concepts, 2 video concepts, storyboard 15s`, () => {
      const p = pack(t);
      assert.equal(p.imageConcepts.length, 3);
      assert.equal(p.videoConcepts.length, 2);
      assert.equal(p.storyboard.durationSec, 15);
    });
    it(`${t}: every prompt contains the COPY_READY_MARKER`, () => {
      const p = pack(t);
      for (const c of p.imageConcepts) assert.match(c.prompt, /Prompt prêt à copier/);
      for (const c of p.videoConcepts) assert.match(c.prompt, /Prompt prêt à copier/);
    });
  }
});

describe('Output guardrails — no <thinking>, no step-by-step, no draft/standard/premium leak', () => {
  for (const t of CREATIVE_QUALITY_TIERS) {
    it(`${t}: no forbidden tokens`, () => {
      const p = pack(t);
      const dump = JSON.stringify(p);
      assert.equal(/<thinking>/i.test(dump), false);
      assert.equal(/step\s+by\s+step/i.test(dump), false);
      assert.equal(/étape\s+par\s+étape/i.test(dump), false);
    });
  }
  it('no media tier label uses draft/standard/premium', () => {
    for (const t of CREATIVE_QUALITY_TIERS) {
      assert.equal(/^(draft|standard|premium)$/i.test(t), false);
    }
  });
});

// -----------------------------------------------------------------------------
// Studio integration — source-scan
// -----------------------------------------------------------------------------

describe('CreativeStudio.tsx — forwards tier to engine', () => {
  const file = resolve(
    __dirname,
    '..',
    '..',
    '..',
    'components',
    'offer-workspace',
    'CreativeStudio.tsx',
  );
  const src = readFileSync(file, 'utf8');
  const stripped = src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

  it('useMemo for the pack depends on `tier`', () => {
    assert.match(stripped, /buildCreativeBriefPack\(\s*\{[^}]*creativeQualityTier:\s*tier[^}]*\}\s*\)/);
  });

  it('tier is included in the useMemo dependency list', () => {
    // Match `}, [..., tier])` pattern.
    assert.match(stripped, /\[\s*offer\s*,\s*task\s*,\s*language\s*,\s*tier\s*\]/);
  });

  it('still renders 3 image cards, 2 video cards, storyboard panel', () => {
    assert.match(stripped, /pack\.imageConcepts\.map\b/);
    assert.match(stripped, /pack\.videoConcepts\.map\b/);
    assert.match(stripped, /<StoryboardPanel\b/);
  });

  it('still has no fetch / no process.env at runtime', () => {
    assert.equal(/\bfetch\s*\(/.test(stripped), false);
    assert.equal(/process\.env/.test(stripped), false);
  });

  it('still has no "Générer image" / "Générer vidéo" runtime tokens', () => {
    assert.equal(/Générer\s+image/i.test(stripped), false);
    assert.equal(/Générer\s+vidéo/i.test(stripped), false);
  });
});
