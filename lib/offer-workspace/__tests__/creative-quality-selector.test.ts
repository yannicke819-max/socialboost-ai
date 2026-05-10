/**
 * Creative Quality Selector + Studio integration — source + behaviour
 * tests (AI-017E).
 *
 * No DOM testing setup in this codebase. Pins are split between:
 *   - Source-scan invariants on the new client component
 *     (CreativeQualitySelector.tsx) and the integration in
 *     CreativeStudio.tsx.
 *   - A small pure unit test on `buildCreativeDirectionPrefix` so the
 *     copy-prefix substance is pinned without rendering React.
 *   - Microcopy presence in `creative-studio-labels.ts` for the new
 *     selector keys, both FR and EN.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  CREATIVE_STUDIO_EN,
  CREATIVE_STUDIO_FR,
  type CreativeStudioCopy,
} from '../creative-studio-labels';
import {
  CREATIVE_QUALITY_TIERS,
  CREATIVE_STRATEGIES,
} from '../creative-quality-tiers';
import { buildCreativeDirectionPrefix } from '../../../components/offer-workspace/CreativeQualitySelector';

// -----------------------------------------------------------------------------
// File handles
// -----------------------------------------------------------------------------

const SELECTOR_FILE = resolve(
  __dirname,
  '..',
  '..',
  '..',
  'components',
  'offer-workspace',
  'CreativeQualitySelector.tsx',
);
const STUDIO_FILE = resolve(
  __dirname,
  '..',
  '..',
  '..',
  'components',
  'offer-workspace',
  'CreativeStudio.tsx',
);

const selectorSrc = readFileSync(SELECTOR_FILE, 'utf8');
const studioSrc = readFileSync(STUDIO_FILE, 'utf8');
const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const selectorStripped = stripComments(selectorSrc);
const studioStripped = stripComments(studioSrc);

// -----------------------------------------------------------------------------
// Microcopy presence (FR + EN)
// -----------------------------------------------------------------------------

describe('Creative Studio labels — selector keys', () => {
  const requiredScalar: (keyof CreativeStudioCopy)[] = [
    'selectorTitle',
    'selectorSubtitle',
    'selectorHelper',
    'selectorUseWhenLabel',
    'selectorRulesLabel',
    'selectorScoreHintsLabel',
    'selectorWarningBreakthrough',
    'selectorCurrentDirectionLabel',
    'copyPrefixLabel',
  ];

  for (const k of requiredScalar) {
    it(`FR has non-empty ${k}`, () => {
      const v = (CREATIVE_STUDIO_FR as unknown as Record<string, unknown>)[k];
      assert.equal(typeof v, 'string');
      assert.ok((v as string).length > 0);
    });
    it(`EN has non-empty ${k}`, () => {
      const v = (CREATIVE_STUDIO_EN as unknown as Record<string, unknown>)[k];
      assert.equal(typeof v, 'string');
      assert.ok((v as string).length > 0);
    });
  }

  it('FR exposes a tagline + use-when entry per tier', () => {
    for (const t of CREATIVE_QUALITY_TIERS) {
      assert.ok((CREATIVE_STUDIO_FR.selectorTaglines[t] ?? '').length > 0);
      const useWhen = CREATIVE_STUDIO_FR.selectorUseWhen[t];
      assert.ok(Array.isArray(useWhen) && useWhen.length >= 3);
    }
  });

  it('EN exposes a tagline + use-when entry per tier', () => {
    for (const t of CREATIVE_QUALITY_TIERS) {
      assert.ok((CREATIVE_STUDIO_EN.selectorTaglines[t] ?? '').length > 0);
      const useWhen = CREATIVE_STUDIO_EN.selectorUseWhen[t];
      assert.ok(Array.isArray(useWhen) && useWhen.length >= 3);
    }
  });
});

// -----------------------------------------------------------------------------
// buildCreativeDirectionPrefix — pure unit
// -----------------------------------------------------------------------------

describe('buildCreativeDirectionPrefix', () => {
  it('FR prefix combines copyPrefixLabel + tier label + tagline', () => {
    const prefix = buildCreativeDirectionPrefix('performance', 'fr');
    assert.match(prefix, new RegExp(`^${CREATIVE_STUDIO_FR.copyPrefixLabel} : `));
    assert.ok(prefix.includes(CREATIVE_STRATEGIES.performance.label));
    assert.ok(prefix.includes(CREATIVE_STUDIO_FR.selectorTaglines.performance));
  });

  it('EN prefix uses the EN copyPrefixLabel', () => {
    const prefix = buildCreativeDirectionPrefix('safe', 'en');
    assert.match(prefix, new RegExp(`^${CREATIVE_STUDIO_EN.copyPrefixLabel} : `));
    assert.ok(prefix.includes(CREATIVE_STUDIO_EN.selectorTaglines.safe));
  });

  it('every tier produces a non-empty deterministic prefix', () => {
    for (const t of CREATIVE_QUALITY_TIERS) {
      const a = buildCreativeDirectionPrefix(t, 'fr');
      const b = buildCreativeDirectionPrefix(t, 'fr');
      assert.equal(a, b);
      assert.ok(a.length > 5);
    }
  });
});

// -----------------------------------------------------------------------------
// CreativeQualitySelector.tsx — source structure
// -----------------------------------------------------------------------------

describe('CreativeQualitySelector.tsx — structure', () => {
  it("starts with 'use client' directive", () => {
    assert.match(selectorSrc, /^'use client';/);
  });

  it('iterates the four CREATIVE_QUALITY_TIERS', () => {
    assert.match(selectorStripped, /CREATIVE_QUALITY_TIERS\.map\b/);
  });

  it('uses radio semantics + aria-pressed + aria-checked', () => {
    assert.match(selectorStripped, /role=['"]radiogroup['"]/);
    assert.match(selectorStripped, /role=['"]radio['"]/);
    assert.match(selectorStripped, /aria-pressed/);
    assert.match(selectorStripped, /aria-checked/);
  });

  it('renders the breakthrough warning gated by `selected === \'breakthrough\'`', () => {
    assert.match(selectorStripped, /selected\s*===\s*['"]breakthrough['"]/);
    assert.match(selectorStripped, /selectorWarningBreakthrough/);
  });

  it('exports buildCreativeDirectionPrefix for studio reuse', () => {
    assert.match(selectorStripped, /export function buildCreativeDirectionPrefix/);
  });
});

// -----------------------------------------------------------------------------
// CreativeQualitySelector.tsx — hygiene
// -----------------------------------------------------------------------------

describe('CreativeQualitySelector.tsx — hygiene', () => {
  it('runtime never calls fetch', () => {
    assert.equal(/\bfetch\s*\(/.test(selectorStripped), false);
  });

  it('runtime never reads process.env', () => {
    assert.equal(/process\.env/.test(selectorStripped), false);
  });

  it('runtime never references provider env names or keys', () => {
    // Comments allowed: docstring may name the forbidden tokens as
    // documentation. Runtime body must not.
    assert.equal(selectorStripped.includes('OPENAI_API_KEY'), false);
    assert.equal(selectorStripped.includes('SOCIALBOOST_OPENAI'), false);
    assert.equal(/NEXT_PUBLIC_OPENAI/i.test(selectorStripped), false);
  });

  it('never imports a real provider adapter or gateway', () => {
    assert.equal(selectorStripped.includes('openai-provider-adapter'), false);
    assert.equal(selectorStripped.includes('provider-gateway'), false);
  });

  it('never references "Générer image" / "Générer vidéo" at runtime', () => {
    assert.equal(/Générer\s+image/i.test(selectorStripped), false);
    assert.equal(/Générer\s+vidéo/i.test(selectorStripped), false);
    assert.equal(/Generate\s+image/i.test(selectorStripped), false);
    assert.equal(/Generate\s+video/i.test(selectorStripped), false);
  });

  it('runtime never uses generic technical labels (draft/standard/premium)', () => {
    for (const bad of ['draft', 'standard', 'premium']) {
      const re = new RegExp(`['\"\`]${bad}['\"\`]`, 'i');
      assert.equal(re.test(selectorStripped), false, `forbidden literal '${bad}' present`);
    }
  });
});

// -----------------------------------------------------------------------------
// CreativeStudio.tsx — selector integration
// -----------------------------------------------------------------------------

describe('CreativeStudio.tsx — selector integration (AI-017E)', () => {
  it('imports the selector + the prefix builder', () => {
    assert.match(studioSrc, /CreativeQualitySelector/);
    assert.match(studioSrc, /buildCreativeDirectionPrefix/);
  });

  it("default tier state is 'performance'", () => {
    assert.match(
      studioStripped,
      /useState<CreativeQualityTier>\(\s*['"]performance['"]\s*\)/,
    );
  });

  it('handleCopy prepends the directional prefix before the prompt body', () => {
    // The composition must set `prefix` and concatenate it before `text`,
    // separated by a blank line.
    assert.match(studioStripped, /buildCreativeDirectionPrefix\(\s*tier\s*,\s*language\s*\)/);
    assert.match(studioStripped, /\$\{prefix\}\s*\\n\\n\s*\$\{text\}/);
  });

  it('renders the "Direction créative sélectionnée" annotation', () => {
    assert.match(studioStripped, /selectorCurrentDirectionLabel/);
  });

  it('still renders 3 image cards, 2 video cards, storyboard panel', () => {
    assert.match(studioStripped, /pack\.imageConcepts\.map\b/);
    assert.match(studioStripped, /pack\.videoConcepts\.map\b/);
    assert.match(studioStripped, /<StoryboardPanel\b/);
  });

  it('still has no fetch / no process.env at runtime', () => {
    assert.equal(/\bfetch\s*\(/.test(studioStripped), false);
    assert.equal(/process\.env/.test(studioStripped), false);
  });

  it('still has no "Générer image" / "Générer vidéo" runtime references', () => {
    assert.equal(/Générer\s+image/i.test(studioStripped), false);
    assert.equal(/Générer\s+vidéo/i.test(studioStripped), false);
  });

  it("does not introduce 'draft' / 'standard' / 'premium' literals", () => {
    for (const bad of ['draft', 'standard', 'premium']) {
      const re = new RegExp(`['\"\`]${bad}['\"\`]`, 'i');
      assert.equal(re.test(studioStripped), false, `forbidden literal '${bad}' present`);
    }
  });

  it('mobile-friendly grid classes are present in the selector', () => {
    // Tailwind responsive classes that collapse the 4-card grid on small
    // screens.
    assert.match(selectorStripped, /grid\s+gap-2\s+sm:grid-cols-2\s+lg:grid-cols-4/);
  });
});
