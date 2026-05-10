import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AD_STUDIO_GUIDE_EN,
  AD_STUDIO_GUIDE_FR,
  ASSETS_BANNER_EN,
  ASSETS_BANNER_FR,
  ASSET_ACTION_LABELS_FR,
  GUIDE_LABELS_EN,
  GUIDE_LABELS_FR,
  MOCK_BANNER_EN,
  MOCK_BANNER_FR,
  TAB_LABELS_EN,
  TAB_LABELS_FR,
  resolveGuideState,
} from '../guide-labels';

// -----------------------------------------------------------------------------
// "Où j'en suis ?" guide
// -----------------------------------------------------------------------------

describe('AI-014 humanization — "Où j\'en suis ?" guide', () => {
  it('FR guide title + 3 step labels', () => {
    assert.equal(GUIDE_LABELS_FR.title, "Où j'en suis ?");
    assert.equal(GUIDE_LABELS_FR.step1, 'Choisir 3 idées');
    assert.equal(GUIDE_LABELS_FR.step2, 'Voir mes annonces');
    assert.equal(GUIDE_LABELS_FR.step3, 'Relire avant publication');
  });

  it('EN guide mirrors the FR shape', () => {
    assert.equal(GUIDE_LABELS_EN.title, 'Where am I?');
    assert.equal(GUIDE_LABELS_EN.step1, 'Pick 3 ideas');
    assert.equal(GUIDE_LABELS_EN.step2, 'See my ads');
    assert.equal(GUIDE_LABELS_EN.step3, 'Review before sharing');
  });

  it('state pickIdeas surfaces the "Choisir mes 3 idées" CTA when < 3 approved + 0 ads', () => {
    assert.equal(resolveGuideState(0, 0), 'pickIdeas');
    assert.equal(resolveGuideState(2, 0), 'pickIdeas');
    assert.equal(GUIDE_LABELS_FR.states.pickIdeas.cta, 'Choisir mes 3 idées');
    assert.match(GUIDE_LABELS_FR.states.pickIdeas.status, /Il reste une étape/);
  });

  it('state createAds surfaces the "Créer mes annonces" CTA when ≥ 3 approved + 0 ads', () => {
    assert.equal(resolveGuideState(3, 0), 'createAds');
    assert.equal(resolveGuideState(10, 0), 'createAds');
    assert.equal(GUIDE_LABELS_FR.states.createAds.cta, 'Créer mes annonces');
  });

  it('state reviewAds surfaces the "Voir mes annonces" CTA as soon as any ad exists', () => {
    assert.equal(resolveGuideState(0, 1), 'reviewAds');
    assert.equal(resolveGuideState(5, 11), 'reviewAds');
    assert.equal(GUIDE_LABELS_FR.states.reviewAds.cta, 'Voir mes annonces');
  });
});

// -----------------------------------------------------------------------------
// Tab rename
// -----------------------------------------------------------------------------

describe('AI-014 humanization — tab labels', () => {
  it('FR tabs are renamed to user-friendly nouns', () => {
    assert.equal(TAB_LABELS_FR.brief, 'Offre');
    assert.equal(TAB_LABELS_FR.assets, 'Idées');
    assert.equal(TAB_LABELS_FR.adstudio, 'Annonces');
    assert.equal(TAB_LABELS_FR.plan, 'Planning');
    assert.equal(TAB_LABELS_FR.analytics, 'Résultats');
    assert.equal(TAB_LABELS_FR.feedback, 'Conseils');
    assert.equal(TAB_LABELS_FR.recos, 'Suggestions');
  });

  it('EN tabs follow the same softening', () => {
    assert.equal(TAB_LABELS_EN.brief, 'Offer');
    assert.equal(TAB_LABELS_EN.assets, 'Ideas');
    assert.equal(TAB_LABELS_EN.adstudio, 'Ads');
    assert.equal(TAB_LABELS_EN.plan, 'Schedule');
    assert.equal(TAB_LABELS_EN.analytics, 'Results');
    assert.equal(TAB_LABELS_EN.feedback, 'Tips');
    assert.equal(TAB_LABELS_EN.recos, 'Suggestions');
  });

  it('FR tabs do not contain technical labels (Brief / Contenus / Ad Studio / Plan semaine / Analytics)', () => {
    const blob = JSON.stringify(TAB_LABELS_FR);
    assert.equal(blob.includes('Brief'), false);
    assert.equal(blob.includes('Contenus'), false);
    assert.equal(blob.includes('Ad Studio'), false);
    assert.equal(blob.includes('Plan semaine'), false);
    assert.equal(blob.includes('Analytics'), false);
    assert.equal(blob.includes('Feedback'), false);
    assert.equal(blob.includes('Recommandations'), false);
  });
});

// -----------------------------------------------------------------------------
// Mock banner softened
// -----------------------------------------------------------------------------

describe('AI-014 humanization — mock banner', () => {
  it('FR banner uses "Mode démonstration" not "Mock V1"', () => {
    assert.match(MOCK_BANNER_FR, /Mode démonstration/);
    assert.equal(/Mock V1/.test(MOCK_BANNER_FR), false);
  });

  it('EN banner uses "Demo mode" not "Mock V1"', () => {
    assert.match(MOCK_BANNER_EN, /Demo mode/);
    assert.equal(/Mock V1/.test(MOCK_BANNER_EN), false);
  });
});

// -----------------------------------------------------------------------------
// Idées tab banner + action labels
// -----------------------------------------------------------------------------

describe('AI-014 humanization — Idées tab banner', () => {
  it('FR banner title is "Choisis les idées à utiliser"', () => {
    assert.equal(ASSETS_BANNER_FR.title, 'Choisis les idées à utiliser');
  });

  it('FR banner body explains the role of ideas without jargon', () => {
    assert.match(ASSETS_BANNER_FR.body, /matière première/);
    assert.match(ASSETS_BANNER_FR.body, /relire avant publication/);
  });

  it('FR remaining helper handles 1 vs N grammar', () => {
    assert.equal(ASSETS_BANNER_FR.remaining(1), 'Encore 1 idée à choisir pour créer tes annonces.');
    assert.equal(ASSETS_BANNER_FR.remaining(3), 'Encore 3 idées à choisir pour créer tes annonces.');
  });

  it('FR action labels are humanized (no "Approuver", no "Variante", no "CTA")', () => {
    assert.equal(ASSET_ACTION_LABELS_FR.use, 'Utiliser cette idée');
    assert.equal(ASSET_ACTION_LABELS_FR.used, 'Idée choisie');
    assert.equal(ASSET_ACTION_LABELS_FR.copy, 'Copier le texte');
    assert.equal(ASSET_ACTION_LABELS_FR.variant, 'Créer une autre version');
    const blob = JSON.stringify(ASSET_ACTION_LABELS_FR);
    assert.equal(blob.includes('Approuver'), false);
    assert.equal(blob.includes('Variante'), false);
    assert.equal(/\bCTA\b/.test(blob), false);
  });

  it('EN counterpart matches the FR shape', () => {
    assert.equal(ASSETS_BANNER_EN.title, 'Pick the ideas to use');
    assert.equal(ASSETS_BANNER_EN.remaining(1), '1 more idea to pick to create your ads.');
  });
});

// -----------------------------------------------------------------------------
// Annonces tab guide
// -----------------------------------------------------------------------------

describe('AI-014 humanization — Annonces tab guide', () => {
  it('FR top guide title is "Tes annonces sont prêtes"', () => {
    assert.equal(AD_STUDIO_GUIDE_FR.topTitle, 'Tes annonces sont prêtes');
  });

  it('FR empty state title is "Choisis 3 idées pour créer tes annonces"', () => {
    assert.equal(AD_STUDIO_GUIDE_FR.emptyTitle, 'Choisis 3 idées pour créer tes annonces');
  });

  it('FR empty state CTA is "Choisir mes 3 idées"', () => {
    assert.equal(AD_STUDIO_GUIDE_FR.emptyCta, 'Choisir mes 3 idées');
  });

  it('FR action labels are humanized (Préparer la publication / Copier le texte / Télécharger les textes / Créer une autre version)', () => {
    assert.equal(AD_STUDIO_GUIDE_FR.copy, 'Copier le texte');
    assert.equal(AD_STUDIO_GUIDE_FR.variant, 'Créer une autre version');
    assert.equal(AD_STUDIO_GUIDE_FR.exportKit, 'Télécharger les textes');
    assert.equal(AD_STUDIO_GUIDE_FR.selectDiffusion, 'Préparer la publication');
  });

  it('EN counterpart mirrors the shape', () => {
    assert.equal(AD_STUDIO_GUIDE_EN.topTitle, 'Your ads are ready');
    assert.equal(AD_STUDIO_GUIDE_EN.emptyTitle, 'Pick 3 ideas to create your ads');
    assert.equal(AD_STUDIO_GUIDE_EN.emptyCta, 'Pick my 3 ideas');
    assert.equal(AD_STUDIO_GUIDE_EN.copy, 'Copy text');
    assert.equal(AD_STUDIO_GUIDE_EN.exportKit, 'Download the texts');
  });
});

// -----------------------------------------------------------------------------
// Cross-module hygiene: forbidden FR words must not appear in any user-facing
// label module of AI-014.
// -----------------------------------------------------------------------------

describe('AI-014 humanization — forbidden technical FR vocabulary', () => {
  // Walk the FR label trees and collect only the user-visible string VALUES
  // (skip object keys, those are internal identifiers).
  function collectValues(node: unknown): string[] {
    if (typeof node === 'string') return [node];
    if (typeof node === 'function') return []; // skip helper functions
    if (Array.isArray(node)) return node.flatMap(collectValues);
    if (node && typeof node === 'object') {
      return Object.values(node).flatMap(collectValues);
    }
    return [];
  }
  const FR_BLOB = collectValues({
    GUIDE_LABELS_FR,
    TAB_LABELS_FR,
    MOCK_BANNER_FR,
    ASSETS_BANNER_FR,
    ASSET_ACTION_LABELS_FR,
    AD_STUDIO_GUIDE_FR,
  }).join(' ');
  // The user spec: "la vue simple FR ne doit plus afficher 'hook' / 'CTA' / 'asset'".
  const FORBIDDEN_FR = [
    /\bhook\b/i,
    /\bhooks\b/i,
    /\bCTA\b/,
    /\basset\b/i,
    /\bassets\b/i,
    /\bAd Unit\b/i,
    /\bMock V1\b/,
    /\bAudience cible\b/,
    /\bNiveau de maturité\b/,
    /\bObjection fréquente\b/,
    /\bAction attendue\b/,
    /\bPréheader\b/,
  ];
  for (const pattern of FORBIDDEN_FR) {
    it(`FR labels module does not contain ${pattern}`, () => {
      assert.equal(
        pattern.test(FR_BLOB),
        false,
        `forbidden FR pattern ${pattern} appears in: ${FR_BLOB.match(pattern)?.[0]}`,
      );
    });
  }
});
