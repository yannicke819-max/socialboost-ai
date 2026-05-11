/**
 * Creative Test Plan UI — source-scan tests (AI-017H).
 *
 * No DOM testing setup. We scan the source for structural sentinels
 * and forbidden tokens, and verify FR/EN microcopy presence.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  CREATIVE_STUDIO_FR,
  CREATIVE_STUDIO_EN,
} from '../creative-studio-labels';

const PLAN_FILE = resolve(
  __dirname,
  '..',
  '..',
  '..',
  'components',
  'offer-workspace',
  'CreativeTestPlan.tsx',
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

const planSrc = readFileSync(PLAN_FILE, 'utf8');
const studioSrc = readFileSync(STUDIO_FILE, 'utf8');
const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const planStripped = stripComments(planSrc);
const studioStripped = stripComments(studioSrc);

// -----------------------------------------------------------------------------
// CreativeTestPlan.tsx structure
// -----------------------------------------------------------------------------

describe('CreativeTestPlan.tsx — structure', () => {
  it("starts with 'use client'", () => {
    assert.match(planSrc, /^'use client';/);
  });

  it('renders the test plan title + subtitle', () => {
    assert.match(planStripped, /labels\.testPlanTitle/);
    assert.match(planStripped, /labels\.testPlanSubtitle/);
  });

  it('renders the three required microcopy strings', () => {
    assert.match(planStripped, /plan\.oneVariableAtATime/);
    assert.match(planStripped, /plan\.noAutomaticPublishing/);
    assert.match(planStripped, /plan\.scoresDoNotPredict/);
  });

  it('iterates plan.recommendedOrder.map (at most 3 ranked items)', () => {
    assert.match(planStripped, /plan\.recommendedOrder\.map\b/);
  });

  it('exposes a "Copier le plan de test" button label', () => {
    assert.match(planStripped, /labels\.testPlanCopyButton/);
  });

  it('shows the review-required badge gated by `t.reviewRequired`', () => {
    assert.match(planStripped, /t\.reviewRequired/);
    assert.match(planStripped, /labels\.testPlanReviewRequiredBadge/);
  });
});

// -----------------------------------------------------------------------------
// CreativeTestPlan.tsx hygiene
// -----------------------------------------------------------------------------

describe('CreativeTestPlan.tsx — hygiene', () => {
  it('never calls fetch at runtime', () => {
    assert.equal(/\bfetch\s*\(/.test(planStripped), false);
  });
  it('never reads process.env at runtime', () => {
    assert.equal(/process\.env/.test(planStripped), false);
  });
  it('never references provider env names', () => {
    assert.equal(planSrc.includes('OPENAI_API_KEY'), false);
    assert.equal(planSrc.includes('SOCIALBOOST_OPENAI'), false);
    assert.equal(/NEXT_PUBLIC_OPENAI/i.test(planSrc), false);
  });
  it('never imports a real provider adapter / gateway', () => {
    assert.equal(planSrc.includes('openai-provider-adapter'), false);
    assert.equal(planSrc.includes('provider-gateway'), false);
  });
  it('never says "Publier" / "Lancer campagne" / "Optimiser avec IA" / "Générer image|vidéo"', () => {
    assert.equal(/\bPublier\b/i.test(planStripped), false);
    assert.equal(/Lancer\s+campagne/i.test(planStripped), false);
    assert.equal(/Launch\s+campaign/i.test(planStripped), false);
    assert.equal(/Optimiser\s+avec\s+IA/i.test(planStripped), false);
    assert.equal(/Générer\s+image/i.test(planStripped), false);
    assert.equal(/Générer\s+vidéo/i.test(planStripped), false);
  });
  it('never uses draft/standard/premium literals', () => {
    for (const bad of ['draft', 'standard', 'premium']) {
      const re = new RegExp(`['\"\`]${bad}['\"\`]`, 'i');
      assert.equal(re.test(planStripped), false, `forbidden literal '${bad}' present`);
    }
  });
});

// -----------------------------------------------------------------------------
// CreativeStudio integration
// -----------------------------------------------------------------------------

describe('CreativeStudio.tsx — wires test plan section', () => {
  it('imports buildCreativeTestPlan', () => {
    assert.match(studioSrc, /from\s+['"]@\/lib\/offer-workspace\/creative-test-plan['"]/);
    assert.match(studioStripped, /buildCreativeTestPlan/);
  });

  it('imports CreativeTestPlanSection', () => {
    assert.match(studioSrc, /from\s+['"]\.\/CreativeTestPlan['"]/);
    assert.match(studioStripped, /<CreativeTestPlanSection\b/);
  });

  it('still has no fetch / no process.env at runtime', () => {
    assert.equal(/\bfetch\s*\(/.test(studioStripped), false);
    assert.equal(/process\.env/.test(studioStripped), false);
  });

  it('still has no "Publier" / "Lancer campagne" / "Générer image|vidéo" / "Optimiser avec IA"', () => {
    assert.equal(/\bPublier\b/i.test(studioStripped), false);
    assert.equal(/Lancer\s+campagne/i.test(studioStripped), false);
    assert.equal(/Optimiser\s+avec\s+IA/i.test(studioStripped), false);
    assert.equal(/Générer\s+image/i.test(studioStripped), false);
    assert.equal(/Générer\s+vidéo/i.test(studioStripped), false);
  });
});

// -----------------------------------------------------------------------------
// Microcopy presence (FR + EN)
// -----------------------------------------------------------------------------

describe('Creative Studio labels — AI-017H test plan keys', () => {
  const required = [
    'testPlanTitle',
    'testPlanSubtitle',
    'testPlanHypothesisLabel',
    'testPlanVariableLabel',
    'testPlanPrimaryMetricLabel',
    'testPlanDurationLabel',
    'testPlanWhyLabel',
    'testPlanWatchoutLabel',
    'testPlanReviewRequiredBadge',
    'testPlanCopyButton',
    'testPlanCopiedToast',
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

  it('FR spec-pinned strings', () => {
    assert.equal(CREATIVE_STUDIO_FR.testPlanTitle, 'Plan de test créatif');
    assert.equal(
      CREATIVE_STUDIO_FR.testPlanSubtitle,
      '3 tests prioritaires pour apprendre vite, sans publier automatiquement.',
    );
    assert.equal(CREATIVE_STUDIO_FR.testPlanCopyButton, 'Copier le plan de test');
  });

  it('FR variable labels cover the seven enum values', () => {
    for (const k of [
      'hook',
      'visual_angle',
      'proof_mechanism',
      'cta',
      'format',
      'audience_pain',
      'offer_framing',
    ] as const) {
      const v = CREATIVE_STUDIO_FR.testPlanVariableLabels[k];
      assert.equal(typeof v, 'string');
      assert.ok(v.length > 0);
    }
  });
});
