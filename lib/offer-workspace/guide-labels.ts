/**
 * User-visible label dictionary for the AI-014 humanization patch (post-
 * onboarding journey). Lives outside any React component so:
 *   - tests can pin user-facing strings from a Node context;
 *   - a single file owns every "where am I?" guide / banner string;
 *   - any future humanization sweep touches one place.
 *
 * Hard rules:
 *   - No engine logic. Strings only.
 *   - No technical jargon in FR (no "hook", "asset", "CTA", "intent", "funnel"
 *     in user-facing values). Tests pin this invariant.
 *   - Same shape FR / EN.
 */

// -----------------------------------------------------------------------------
// "Où j'en suis ?" guide states
// -----------------------------------------------------------------------------

export type GuideStateKey = 'pickIdeas' | 'createAds' | 'reviewAds';

export interface GuideStateCopy {
  status: string;
  help: string;
  cta: string;
}

export interface GuideCopy {
  title: string;
  step1: string;
  step2: string;
  step3: string;
  states: Record<GuideStateKey, GuideStateCopy>;
}

export const GUIDE_LABELS_FR: GuideCopy = {
  title: "Où j'en suis ?",
  step1: 'Choisir 3 idées',
  step2: 'Voir mes annonces',
  step3: 'Relire avant publication',
  states: {
    pickIdeas: {
      status: 'Il reste une étape avant tes annonces',
      help: 'Choisis 3 idées de texte. Elles serviront à créer tes annonces.',
      cta: 'Choisir mes 3 idées',
    },
    createAds: {
      status: 'Tes idées sont prêtes',
      help: 'Tu peux maintenant créer tes annonces.',
      cta: 'Créer mes annonces',
    },
    reviewAds: {
      status: 'Tes annonces sont prêtes à relire',
      help: 'Choisis celle que tu préfères, puis copie le texte ou télécharge les textes.',
      cta: 'Voir mes annonces',
    },
  },
};

export const GUIDE_LABELS_EN: GuideCopy = {
  title: 'Where am I?',
  step1: 'Pick 3 ideas',
  step2: 'See my ads',
  step3: 'Review before sharing',
  states: {
    pickIdeas: {
      status: 'One step left before your ads',
      help: 'Pick 3 text ideas. They will be used to create your ads.',
      cta: 'Pick my 3 ideas',
    },
    createAds: {
      status: 'Your ideas are ready',
      help: 'You can now create your ads.',
      cta: 'Create my ads',
    },
    reviewAds: {
      status: 'Your ads are ready to review',
      help: 'Pick your favourite, then copy the text or download the texts.',
      cta: 'See my ads',
    },
  },
};

/**
 * Resolve which state to show based on counts. Pure helper.
 */
export function resolveGuideState(
  approvedAssets: number,
  adUnits: number,
): GuideStateKey {
  if (adUnits > 0) return 'reviewAds';
  if (approvedAssets >= 3) return 'createAds';
  return 'pickIdeas';
}

// -----------------------------------------------------------------------------
// Tab labels (renamed for non-technical users)
// -----------------------------------------------------------------------------

export interface TabLabels {
  brief: string;
  assets: string;
  adstudio: string;
  plan: string;
  calendar: string;
  analytics: string;
  feedback: string;
  recos: string;
}

export const TAB_LABELS_FR: TabLabels = {
  brief: 'Offre',
  assets: 'Idées',
  adstudio: 'Annonces',
  plan: 'Planning',
  calendar: 'Calendrier',
  analytics: 'Résultats',
  feedback: 'Conseils',
  recos: 'Suggestions',
};

export const TAB_LABELS_EN: TabLabels = {
  brief: 'Offer',
  assets: 'Ideas',
  adstudio: 'Ads',
  plan: 'Schedule',
  calendar: 'Calendar',
  analytics: 'Results',
  feedback: 'Tips',
  recos: 'Suggestions',
};

// -----------------------------------------------------------------------------
// Mock banner — softened for non-technical users
// -----------------------------------------------------------------------------

export const MOCK_BANNER_FR =
  'Mode démonstration : rien n\'est publié automatiquement.';
export const MOCK_BANNER_EN =
  'Demo mode: nothing is published automatically.';

// -----------------------------------------------------------------------------
// Idées tab (assets) — top banner + remaining-count helper
// -----------------------------------------------------------------------------

export interface AssetsBannerCopy {
  title: string;
  body: string;
  remaining: (n: number) => string;
  ctaSeeAds: string;
  helpUse: string;
  helpCopy: string;
  helpVariant: string;
}

export const ASSETS_BANNER_FR: AssetsBannerCopy = {
  title: 'Choisis les idées à utiliser',
  body:
    'Ces idées servent de matière première pour créer tes annonces. Sélectionne celles que tu veux garder. Tu pourras tout relire avant publication.',
  remaining: (n: number) =>
    n === 1
      ? 'Encore 1 idée à choisir pour créer tes annonces.'
      : `Encore ${n} idées à choisir pour créer tes annonces.`,
  ctaSeeAds: 'Voir mes annonces',
  helpUse: 'Elle pourra servir dans tes annonces.',
  helpCopy: 'Pour le coller ailleurs.',
  helpVariant: 'Pour tester une autre formulation.',
};

export const ASSETS_BANNER_EN: AssetsBannerCopy = {
  title: 'Pick the ideas to use',
  body:
    'These ideas are the raw material for your ads. Pick the ones you want to keep. You can review everything before sharing.',
  remaining: (n: number) =>
    n === 1
      ? '1 more idea to pick to create your ads.'
      : `${n} more ideas to pick to create your ads.`,
  ctaSeeAds: 'See my ads',
  helpUse: 'It can be used in your ads.',
  helpCopy: 'To paste it somewhere else.',
  helpVariant: 'To test another wording.',
};

// -----------------------------------------------------------------------------
// Idées tab — humanized button labels (Approuver → Utiliser cette idée, etc.)
// -----------------------------------------------------------------------------

export interface AssetActionLabels {
  use: string;
  used: string;
  copy: string;
  variant: string;
  unused: string;
}

export const ASSET_ACTION_LABELS_FR: AssetActionLabels = {
  use: 'Utiliser cette idée',
  used: 'Idée choisie',
  copy: 'Copier le texte',
  variant: 'Créer une autre version',
  unused: 'Remettre en idée',
};

export const ASSET_ACTION_LABELS_EN: AssetActionLabels = {
  use: 'Use this idea',
  used: 'Idea picked',
  copy: 'Copy text',
  variant: 'Create another version',
  unused: 'Back to idea',
};

// -----------------------------------------------------------------------------
// Annonces tab (Ad Studio) — top banner when ads exist + empty state copy +
// humanized action labels.
// -----------------------------------------------------------------------------

export interface AdStudioGuideCopy {
  topTitle: string;
  topBody: string;
  emptyTitle: string;
  emptyBody: string;
  emptyCta: string;
  copy: string;
  variant: string;
  exportKit: string;
  selectDiffusion: string;
  unselectDiffusion: string;
}

export const AD_STUDIO_GUIDE_FR: AdStudioGuideCopy = {
  topTitle: 'Tes annonces sont prêtes',
  topBody:
    "Relis-les, choisis celle que tu préfères, puis copie le texte ou télécharge les textes. Rien n'est publié automatiquement.",
  emptyTitle: 'Choisis 3 idées pour créer tes annonces',
  emptyBody:
    "SocialBoost a préparé des idées de textes, emails et messages. Choisis simplement les 3 idées que tu veux utiliser. Ensuite, on créera tes annonces prêtes à relire.",
  emptyCta: 'Choisir mes 3 idées',
  copy: 'Copier le texte',
  variant: 'Créer une autre version',
  exportKit: 'Télécharger les textes',
  selectDiffusion: 'Préparer la publication',
  unselectDiffusion: 'Retirer de la sélection',
};

export const AD_STUDIO_GUIDE_EN: AdStudioGuideCopy = {
  topTitle: 'Your ads are ready',
  topBody:
    'Review them, pick your favourite, then copy the text or download the texts. Nothing is published automatically.',
  emptyTitle: 'Pick 3 ideas to create your ads',
  emptyBody:
    'SocialBoost has prepared text ideas, emails and messages. Just pick the 3 ideas you want to use. Then we will create your ads ready to review.',
  emptyCta: 'Pick my 3 ideas',
  copy: 'Copy text',
  variant: 'Create another version',
  exportKit: 'Download the texts',
  selectDiffusion: 'Prepare for sharing',
  unselectDiffusion: 'Unselect',
};
