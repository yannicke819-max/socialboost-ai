/**
 * Creative Scoring UI — source-scan tests (AI-017G).
 *
 * No DOM testing setup; we read the source of CreativeStudio.tsx +
 * CreativeScorePanel.tsx and verify the structural sentinels and
 * hygiene rules from the spec.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const STUDIO_FILE = resolve(
  __dirname,
  '..',
  '..',
  '..',
  'components',
  'offer-workspace',
  'CreativeStudio.tsx',
);
const PANEL_FILE = resolve(
  __dirname,
  '..',
  '..',
  '..',
  'components',
  'offer-workspace',
  'CreativeScorePanel.tsx',
);

const studioSrc = readFileSync(STUDIO_FILE, 'utf8');
const panelSrc = readFileSync(PANEL_FILE, 'utf8');
const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const studioStripped = stripComments(studioSrc);
const panelStripped = stripComments(panelSrc);

// -----------------------------------------------------------------------------
// CreativeScorePanel.tsx structure
// -----------------------------------------------------------------------------

describe('CreativeScorePanel.tsx — structure', () => {
  it("starts with 'use client'", () => {
    assert.match(panelSrc, /^'use client';/);
  });

  it('renders the six axes from CREATIVE_SCORE_AXES', () => {
    assert.match(panelStripped, /CREATIVE_SCORE_AXES\.map\b/);
  });

  it('exposes the expand toggle "scoringExpandLabel"', () => {
    assert.match(panelStripped, /labels\.scoringExpandLabel/);
  });

  it('renders the platform context label', () => {
    assert.match(panelStripped, /labels\.scoringContextLabel/);
    assert.match(panelStripped, /labels\.scoringPlatformLabels\b/);
  });

  it('renders the required microcopy keys', () => {
    assert.match(panelStripped, /labels\.scoringMicrocopyIndicative/);
    assert.match(panelStripped, /labels\.scoringMicrocopyNoAi/);
  });
});

// -----------------------------------------------------------------------------
// CreativeScorePanel.tsx hygiene
// -----------------------------------------------------------------------------

describe('CreativeScorePanel.tsx — hygiene', () => {
  it('never calls fetch at runtime', () => {
    assert.equal(/\bfetch\s*\(/.test(panelStripped), false);
  });
  it('never reads process.env at runtime', () => {
    assert.equal(/process\.env/.test(panelStripped), false);
  });
  it('never references provider env names', () => {
    assert.equal(panelSrc.includes('OPENAI_API_KEY'), false);
    assert.equal(panelSrc.includes('SOCIALBOOST_OPENAI'), false);
    assert.equal(/NEXT_PUBLIC_OPENAI/i.test(panelSrc), false);
  });
  it('never imports a real provider adapter / gateway', () => {
    assert.equal(panelSrc.includes('openai-provider-adapter'), false);
    assert.equal(panelSrc.includes('provider-gateway'), false);
  });
  it('never says "Optimiser avec IA" or "Générer image|vidéo"', () => {
    assert.equal(/Optimiser\s+avec\s+IA/i.test(panelStripped), false);
    assert.equal(/Optimize\s+with\s+AI/i.test(panelStripped), false);
    assert.equal(/Générer\s+image/i.test(panelStripped), false);
    assert.equal(/Générer\s+vidéo/i.test(panelStripped), false);
  });
  it('never uses draft/standard/premium literals', () => {
    for (const bad of ['draft', 'standard', 'premium']) {
      const re = new RegExp(`['\"\`]${bad}['\"\`]`, 'i');
      assert.equal(re.test(panelStripped), false, `forbidden literal '${bad}' present`);
    }
  });
});

// -----------------------------------------------------------------------------
// CreativeStudio integration
// -----------------------------------------------------------------------------

describe('CreativeStudio.tsx — wires scorecards into the cards', () => {
  it('imports buildCreativeScorecard from creative-scoring', () => {
    assert.match(studioSrc, /from\s+['"]@\/lib\/offer-workspace\/creative-scoring['"]/);
    assert.match(studioStripped, /buildCreativeScorecard/);
  });

  it('imports CreativeScorePanel', () => {
    assert.match(studioSrc, /from\s+['"]\.\/CreativeScorePanel['"]/);
    assert.match(studioStripped, /CreativeScorePanel/);
  });

  it('passes scorecard to ImageCard, VideoCard, StoryboardPanel', () => {
    assert.match(studioStripped, /scorecard=\{imageScorecards\[i\]/);
    assert.match(studioStripped, /scorecard=\{videoScorecards\[i\]/);
    assert.match(studioStripped, /scorecard=\{storyboardScorecard\}/);
  });

  it('uses useMemo with `tier` for each scorecard list', () => {
    // image / video / storyboard memos all depend on (pack, tier, language).
    assert.ok(
      (studioStripped.match(/useMemo\([\s\S]*?\[pack,\s*tier,\s*language\]/g) ?? []).length >= 3,
    );
  });

  it('still has no fetch / no process.env at runtime', () => {
    assert.equal(/\bfetch\s*\(/.test(studioStripped), false);
    assert.equal(/process\.env/.test(studioStripped), false);
  });

  it('still has no "Générer image" / "Générer vidéo" / "Optimiser avec IA" runtime tokens', () => {
    assert.equal(/Générer\s+image/i.test(studioStripped), false);
    assert.equal(/Générer\s+vidéo/i.test(studioStripped), false);
    assert.equal(/Optimiser\s+avec\s+IA/i.test(studioStripped), false);
  });

  it("does not introduce 'draft' / 'standard' / 'premium' literals", () => {
    for (const bad of ['draft', 'standard', 'premium']) {
      const re = new RegExp(`['\"\`]${bad}['\"\`]`, 'i');
      assert.equal(re.test(studioStripped), false, `forbidden literal '${bad}' present`);
    }
  });
});

// -----------------------------------------------------------------------------
// Microcopy presence (FR + EN)
// -----------------------------------------------------------------------------

import { CREATIVE_STUDIO_FR, CREATIVE_STUDIO_EN } from '../creative-studio-labels';
describe('Creative Studio labels — AI-017G scoring keys', () => {
  const required = [
    'scoringTitle',
    'scoringMicrocopyIndicative',
    'scoringMicrocopyNoAi',
    'scoringContextLabel',
    'scoringTopStrengthLabel',
    'scoringMainWatchoutLabel',
    'scoringExpandLabel',
  ];
  for (const k of required) {
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

  it('FR microcopy matches the spec-pinned sentences', () => {
    assert.equal(
      CREATIVE_STUDIO_FR.scoringMicrocopyIndicative,
      'Scores indicatifs, pas une prédiction de performance.',
    );
    assert.equal(
      CREATIVE_STUDIO_FR.scoringMicrocopyNoAi,
      "Basé sur les signaux créatifs du concept, sans appel à un modèle IA.",
    );
  });

  it('FR overall labels include the four documented values', () => {
    assert.equal(CREATIVE_STUDIO_FR.scoringOverall.safe_to_test, 'Prêt à tester');
    assert.equal(CREATIVE_STUDIO_FR.scoringOverall.strong_candidate, 'Candidat fort');
    assert.equal(CREATIVE_STUDIO_FR.scoringOverall.needs_refinement, 'À affiner');
    assert.equal(CREATIVE_STUDIO_FR.scoringOverall.review_required, 'Revue humaine');
  });

  it('FR axis labels include the six axes', () => {
    for (const axis of [
      'attention',
      'clarity',
      'credibility',
      'conversion',
      'distinctiveness',
      'brandSafety',
    ] as const) {
      const v = CREATIVE_STUDIO_FR.scoringAxisLabels[axis];
      assert.equal(typeof v, 'string');
      assert.ok(v.length > 0);
    }
  });
});
