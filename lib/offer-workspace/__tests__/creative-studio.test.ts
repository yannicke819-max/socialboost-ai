/**
 * Creative Studio UI — source + microcopy hygiene tests (AI-017B).
 *
 * The component is a React client component, so we don't render it
 * here (the test runner is `node --test` without React testing
 * setup). Instead we pin invariants by:
 *
 *   - Reading `components/offer-workspace/CreativeStudio.tsx` and
 *     scanning for the required sentinels and the forbidden tokens.
 *   - Reading `lib/offer-workspace/creative-studio-labels.ts` and
 *     verifying every label key exists + non-empty in FR + EN.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  CREATIVE_STUDIO_FR,
  CREATIVE_STUDIO_EN,
  type CreativeStudioCopy,
} from '../creative-studio-labels';

const STUDIO_FILE = resolve(
  __dirname,
  '..',
  '..',
  '..',
  'components',
  'offer-workspace',
  'CreativeStudio.tsx',
);
const LABELS_FILE = resolve(
  __dirname,
  '..',
  'creative-studio-labels.ts',
);

const studioSrc = readFileSync(STUDIO_FILE, 'utf8');
const stripped = studioSrc
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/.*$/gm, '');

// -----------------------------------------------------------------------------
// Microcopy presence
// -----------------------------------------------------------------------------

describe('Creative Studio microcopy — required keys', () => {
  const required: (keyof CreativeStudioCopy)[] = [
    'sectionTitle',
    'sectionSubtitle',
    'badgePromptOnly',
    'safetyLine',
    'tabImages',
    'tabVideos',
    'tabStoryboard',
    'imageCardCopyButton',
    'videoCardCopyButton',
    'storyboardCopyButton',
    'copiedToast',
    'copyFailedToast',
    'emptyState',
    'campaignThemeLabel',
    'visualDirectionLabel',
    'audienceEmotionLabel',
    'ctaVisualLabel',
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

  it('FR safetyLine is the spec-pinned sentence', () => {
    assert.equal(
      CREATIVE_STUDIO_FR.safetyLine,
      "Aucun modèle image ou vidéo n'a été lancé.",
    );
  });

  it('FR badgePromptOnly is exactly "Prompt-only"', () => {
    assert.equal(CREATIVE_STUDIO_FR.badgePromptOnly, 'Prompt-only');
  });

  it('FR copy buttons mention "Copier"', () => {
    assert.match(CREATIVE_STUDIO_FR.imageCardCopyButton, /^Copier/);
    assert.match(CREATIVE_STUDIO_FR.videoCardCopyButton, /^Copier/);
    assert.match(CREATIVE_STUDIO_FR.storyboardCopyButton, /^Copier/);
  });

  it('FR emptyState matches the spec line', () => {
    assert.equal(
      CREATIVE_STUDIO_FR.emptyState,
      'Complète ton offre pour préparer les concepts créatifs.',
    );
  });

  it('labels file labelled with both FR + EN exports', () => {
    const labelsSrc = readFileSync(LABELS_FILE, 'utf8');
    assert.match(labelsSrc, /CREATIVE_STUDIO_FR/);
    assert.match(labelsSrc, /CREATIVE_STUDIO_EN/);
  });
});

// -----------------------------------------------------------------------------
// Source hygiene — forbidden tokens + structural sentinels
// -----------------------------------------------------------------------------

describe('CreativeStudio.tsx — client hygiene', () => {
  it("starts with 'use client' directive", () => {
    assert.match(studioSrc, /^'use client';/);
  });

  it('runtime never references "Générer image"', () => {
    // Comments stripped: docstrings may name the forbidden phrases as
    // documentation; runtime UI must not render them.
    assert.equal(/Générer\s+image/i.test(stripped), false);
    assert.equal(/Generate\s+image/i.test(stripped), false);
  });

  it('runtime never references "Générer vidéo"', () => {
    assert.equal(/Générer\s+vidéo/i.test(stripped), false);
    assert.equal(/Generate\s+video/i.test(stripped), false);
  });

  it('never calls fetch at runtime', () => {
    assert.equal(/\bfetch\s*\(/.test(stripped), false);
  });

  it('never references the OpenAI / provider env vars', () => {
    assert.equal(studioSrc.includes('OPENAI_API_KEY'), false);
    assert.equal(studioSrc.includes('SOCIALBOOST_OPENAI'), false);
    assert.equal(/NEXT_PUBLIC_OPENAI/i.test(studioSrc), false);
  });

  it('never reads process.env at runtime', () => {
    assert.equal(/process\.env/.test(stripped), false);
  });

  it('never imports the OpenAI adapter or provider gateway', () => {
    assert.equal(studioSrc.includes('openai-provider-adapter'), false);
    assert.equal(studioSrc.includes('provider-gateway'), false);
  });

  it('never imports next/server or next/navigation', () => {
    assert.equal(/from\s+['"]next\/(server|navigation)['"]/.test(studioSrc), false);
  });

  it('imports buildCreativeBriefPack from the pure engine', () => {
    assert.match(studioSrc, /from\s+['"]@\/lib\/offer-workspace\/creative-brief-engine['"]/);
    assert.match(studioSrc, /\bbuildCreativeBriefPack\b/);
  });
});

// -----------------------------------------------------------------------------
// Structural sentinels — what the component renders
// -----------------------------------------------------------------------------

describe('CreativeStudio.tsx — rendered structure', () => {
  it('renders the FR safety line', () => {
    assert.ok(studioSrc.includes('labels.safetyLine'));
  });

  it('renders the Prompt-only badge', () => {
    assert.ok(studioSrc.includes('labels.badgePromptOnly'));
  });

  it('iterates over imageConcepts (3 cards expected from engine)', () => {
    assert.match(studioSrc, /pack\.imageConcepts\.map\b/);
  });

  it('iterates over videoConcepts (2 cards expected from engine)', () => {
    assert.match(studioSrc, /pack\.videoConcepts\.map\b/);
  });

  it('renders the storyboard panel', () => {
    assert.match(studioSrc, /<StoryboardPanel\b/);
  });

  it('exposes the three copy actions to the clipboard only', () => {
    assert.match(studioSrc, /imageCardCopyButton/);
    assert.match(studioSrc, /videoCardCopyButton/);
    assert.match(studioSrc, /storyboardCopyButton/);
    assert.match(studioSrc, /navigator\.clipboard\.writeText\b/);
  });

  it('shows the empty-state when the offer is missing required brief fields', () => {
    assert.match(studioSrc, /labels\.emptyState/);
  });

  it('uses the deterministic engine import', () => {
    assert.match(studioSrc, /buildCreativeBriefPack\b/);
  });
});
