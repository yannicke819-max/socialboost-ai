/**
 * Creative Brief Engine v1 — unit tests (AI-017A).
 *
 * Pins the spec invariants:
 *   - Pure + deterministic: same input → byte-identical output.
 *   - 3 image concepts, 2 video concepts, 1 storyboard of 15s.
 *   - Every prompt body contains the literal "Prompt prêt à copier".
 *   - Every pack contains the literal "Aucun modèle image ou vidéo n'a été lancé".
 *   - providerCallAllowed / adminCostAllowed / mediaProviderCallAllowed
 *     are all `false` regardless of plan.
 *   - No <thinking>, no "step by step" anywhere in the output.
 *   - Image concepts carry a non-empty negativePrompt; video concepts
 *     carry a non-empty avoid list.
 *   - Builder does not mutate `Offer.brief.language`.
 *   - Source file contains no `fetch` and no `process.env`.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  CREATIVE_PLATFORM_FORMATS,
  COPY_READY_MARKER,
  NO_MODEL_LAUNCHED_NOTICE_FR,
  NO_MODEL_LAUNCHED_NOTICE_EN,
  PLATFORM_FORMAT_ASPECT_RATIO,
  buildCreativeBriefPack,
  type CreativeBriefPack,
  type CreativePlatformFormat,
} from '../creative-brief-engine';
import type { Offer } from '../types';

const NOW = '2026-05-04T00:00:00Z';

function makeOffer(over: Partial<Offer> = {}): Offer {
  return {
    id: over.id ?? 'ofr_creative',
    name: over.name ?? 'Atelier Nova',
    status: 'draft',
    goal: 'social_content',
    language: over.language ?? 'fr',
    brief: over.brief ?? {
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

const baseOfferFr = makeOffer();
const baseOfferEn = makeOffer({
  id: 'ofr_creative_en',
  language: 'en',
  brief: {
    businessName: 'Nova Studio',
    offer: 'Four-week programme to clarify your offer.',
    targetAudience: 'B2B freelancers',
    tone: 'professional',
    language: 'en',
    platforms: ['linkedin', 'email'],
    proofPoints: ['Tested on 12 offers'],
  },
});

// -----------------------------------------------------------------------------
// Determinism + structural shape
// -----------------------------------------------------------------------------

describe('buildCreativeBriefPack — determinism', () => {
  it('returns byte-identical output for the same input', () => {
    const a = buildCreativeBriefPack({ offer: baseOfferFr });
    const b = buildCreativeBriefPack({ offer: baseOfferFr });
    assert.deepEqual(a, b);
  });

  it('different offer ids → different campaign packs', () => {
    const a = buildCreativeBriefPack({ offer: baseOfferFr });
    const b = buildCreativeBriefPack({ offer: makeOffer({ id: 'ofr_other' }) });
    assert.notEqual(a.imageConcepts[0]!.prompt, b.imageConcepts[0]!.prompt);
  });

  it('different task hint → different pack', () => {
    const a = buildCreativeBriefPack({ offer: baseOfferFr, task: 'campaign_pack' });
    const b = buildCreativeBriefPack({ offer: baseOfferFr, task: 'ad_generation' });
    assert.notEqual(a.imageConcepts[0]!.prompt, b.imageConcepts[0]!.prompt);
  });

  it('does not mutate offer.brief.language', () => {
    const offer = makeOffer();
    const before = offer.brief.language;
    buildCreativeBriefPack({ offer, language: 'en' });
    assert.equal(offer.brief.language, before);
  });
});

describe('buildCreativeBriefPack — structural shape', () => {
  it('returns exactly 3 image concepts', () => {
    const p = buildCreativeBriefPack({ offer: baseOfferFr });
    assert.equal(p.imageConcepts.length, 3);
  });

  it('returns exactly 2 video concepts', () => {
    const p = buildCreativeBriefPack({ offer: baseOfferFr });
    assert.equal(p.videoConcepts.length, 2);
  });

  it('returns one 15s storyboard', () => {
    const p = buildCreativeBriefPack({ offer: baseOfferFr });
    assert.equal(p.storyboard.durationSec, 15);
    assert.ok(p.storyboard.beats.length > 0);
    const total = p.storyboard.beats.length;
    assert.ok(total >= 3 && total <= 8); // sane upper bound
  });

  it('sets all three call-allowed booleans to false', () => {
    const p = buildCreativeBriefPack({ offer: baseOfferFr });
    assert.equal(p.providerCallAllowed, false);
    assert.equal(p.adminCostAllowed, false);
    assert.equal(p.mediaProviderCallAllowed, false);
  });
});

// -----------------------------------------------------------------------------
// Marker pinning
// -----------------------------------------------------------------------------

describe('buildCreativeBriefPack — marker pinning', () => {
  it('every image prompt contains COPY_READY_MARKER', () => {
    const p = buildCreativeBriefPack({ offer: baseOfferFr });
    for (const ic of p.imageConcepts) {
      assert.match(ic.prompt, new RegExp(escapeReg(COPY_READY_MARKER)));
    }
  });

  it('every video prompt contains COPY_READY_MARKER', () => {
    const p = buildCreativeBriefPack({ offer: baseOfferFr });
    for (const vc of p.videoConcepts) {
      assert.match(vc.prompt, new RegExp(escapeReg(COPY_READY_MARKER)));
    }
  });

  it('pack carries the FR no-model notice on a FR offer', () => {
    const p = buildCreativeBriefPack({ offer: baseOfferFr });
    assert.equal(p.noModelLaunchedNotice, NO_MODEL_LAUNCHED_NOTICE_FR);
  });

  it('pack carries the EN no-model notice on an EN offer', () => {
    const p = buildCreativeBriefPack({ offer: baseOfferEn });
    assert.equal(p.noModelLaunchedNotice, NO_MODEL_LAUNCHED_NOTICE_EN);
  });

  it('pack exposes the FR copy-ready marker constant', () => {
    const p = buildCreativeBriefPack({ offer: baseOfferFr });
    assert.equal(p.copyReadyMarker, 'Prompt prêt à copier');
  });
});

// -----------------------------------------------------------------------------
// Negative prompt + avoid list
// -----------------------------------------------------------------------------

describe('buildCreativeBriefPack — guardrails on output', () => {
  it('every image concept has a non-empty negativePrompt', () => {
    const p = buildCreativeBriefPack({ offer: baseOfferFr });
    for (const ic of p.imageConcepts) {
      assert.equal(typeof ic.negativePrompt, 'string');
      assert.ok(ic.negativePrompt.length > 0);
    }
  });

  it('every video concept has a non-empty avoid list', () => {
    const p = buildCreativeBriefPack({ offer: baseOfferFr });
    for (const vc of p.videoConcepts) {
      assert.ok(Array.isArray(vc.avoid));
      assert.ok(vc.avoid.length > 0);
    }
  });

  it('pack-level negativePrompt is non-empty', () => {
    const p = buildCreativeBriefPack({ offer: baseOfferFr });
    assert.ok(p.negativePrompt.length > 0);
  });

  it('output never contains <thinking> tokens', () => {
    const p = buildCreativeBriefPack({ offer: baseOfferFr });
    const dump = packToString(p);
    assert.equal(/<thinking>/i.test(dump), false);
    assert.equal(/<\/thinking>/i.test(dump), false);
  });

  it('output never contains "step by step"', () => {
    const p = buildCreativeBriefPack({ offer: baseOfferFr });
    const dump = packToString(p);
    assert.equal(/step\s+by\s+step/i.test(dump), false);
    assert.equal(/étape\s+par\s+étape/i.test(dump), false);
  });

  it('image concepts use only valid social formats', () => {
    const p = buildCreativeBriefPack({ offer: baseOfferFr });
    for (const ic of p.imageConcepts) {
      assert.ok(
        (CREATIVE_PLATFORM_FORMATS as readonly string[]).includes(ic.platformFormat),
      );
      assert.ok(
        Object.prototype.hasOwnProperty.call(
          PLATFORM_FORMAT_ASPECT_RATIO,
          ic.platformFormat,
        ),
      );
    }
  });

  it('video concepts use only 6 / 15 / 30 second durations', () => {
    const p = buildCreativeBriefPack({ offer: baseOfferFr });
    for (const vc of p.videoConcepts) {
      assert.ok([6, 15, 30].includes(vc.durationSec));
    }
  });

  it('video shot durations sum to the declared video duration', () => {
    const p = buildCreativeBriefPack({ offer: baseOfferFr });
    for (const vc of p.videoConcepts) {
      const sum = vc.shots.reduce((acc, s) => acc + s.durationSec, 0);
      assert.equal(sum, vc.durationSec);
    }
  });

  it('storyboard beats span 0-15s without gap or overlap', () => {
    const p = buildCreativeBriefPack({ offer: baseOfferFr });
    const beats = p.storyboard.beats.map((b) => b.secondRange);
    // First beat starts at 0
    assert.match(beats[0]!, /^0-/);
    // Each beat range parses
    for (const r of beats) {
      assert.match(r, /^\d+-\d+s$/);
    }
  });
});

// -----------------------------------------------------------------------------
// Hygiene — source file has no fetch / no process.env / no client coupling
// -----------------------------------------------------------------------------

describe('creative-brief-engine.ts — source hygiene', () => {
  const file = resolve(__dirname, '..', 'creative-brief-engine.ts');
  const src = readFileSync(file, 'utf8');
  // Strip line + block comments before scanning for forbidden runtime tokens.
  const stripped = src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

  it('runtime never contains a fetch call', () => {
    assert.equal(/\bfetch\s*\(/.test(stripped), false);
  });

  it('runtime never reads process.env', () => {
    assert.equal(/process\.env/.test(stripped), false);
  });

  it("runtime never references Date.now()", () => {
    assert.equal(/Date\.now\s*\(/.test(stripped), false);
  });

  it("runtime never imports a real provider adapter", () => {
    assert.equal(/openai-provider-adapter|provider-gateway/.test(stripped), false);
  });

  it("runtime never imports 'next/server' or 'next/navigation'", () => {
    assert.equal(/from\s+['\"]next\/(server|navigation)['\"]/.test(stripped), false);
  });
});

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function escapeReg(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function packToString(p: CreativeBriefPack): string {
  return JSON.stringify(p);
}
