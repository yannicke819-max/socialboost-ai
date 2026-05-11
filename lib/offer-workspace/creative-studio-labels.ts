/**
 * Microcopy for the Creative Studio UI (AI-017B).
 *
 * Pure constants. Importable from Node tests so we can pin the visible
 * strings without rendering React. Keep additions here only — no React
 * import.
 */

export interface CreativeStudioCopy {
  sectionTitle: string;
  sectionSubtitle: string;
  badgePromptOnly: string;
  safetyLine: string;

  tabImages: string;
  tabVideos: string;
  tabStoryboard: string;

  imageCardSceneLabel: string;
  imageCardSubjectLabel: string;
  imageCardStyleLabel: string;
  imageCardOverlayLabel: string;
  imageCardPromptLabel: string;
  imageCardNegativePromptLabel: string;
  imageCardCopyButton: string;

  videoCardDurationLabel: string;
  videoCardHookLabel: string;
  videoCardShotsLabel: string;
  videoCardOnScreenLabel: string;
  videoCardPromptLabel: string;
  videoCardAvoidLabel: string;
  videoCardCopyButton: string;

  storyboardTitle: string;
  storyboardDurationLabel: string;
  storyboardBeatVisualLabel: string;
  storyboardBeatOnScreenLabel: string;
  storyboardBeatNarrationLabel: string;
  storyboardBeatPurposeLabel: string;
  storyboardCopyButton: string;

  copiedToast: string;
  copyFailedToast: string;

  emptyState: string;

  campaignThemeLabel: string;
  visualDirectionLabel: string;
  audienceEmotionLabel: string;
  ctaVisualLabel: string;
  productionNotesLabel: string;
  onScreenSuggestionsLabel: string;

  // AI-017E — Creative Quality Selector
  selectorTitle: string;
  selectorSubtitle: string;
  selectorHelper: string;
  selectorUseWhenLabel: string;
  selectorRulesLabel: string;
  selectorScoreHintsLabel: string;
  selectorWarningBreakthrough: string;
  selectorCurrentDirectionLabel: string;
  selectorTaglines: Record<'safe' | 'social_proof' | 'performance' | 'breakthrough', string>;
  selectorUseWhen: Record<
    'safe' | 'social_proof' | 'performance' | 'breakthrough',
    readonly string[]
  >;
  selectorScoreAxisLabels: Record<
    'attention' | 'clarity' | 'credibility' | 'conversionIntent' | 'distinctiveness' | 'brandSafety',
    string
  >;
  selectorScoreLevelLabels: Record<
    'low' | 'medium' | 'high' | 'very_high' | 'needs_review',
    string
  >;
  /** Used as the line prefixed to every copied prompt: `${prefix} : ${label} — ${tagline}`. */
  copyPrefixLabel: string;

  // AI-017G — Creative scoring v1
  scoringTitle: string;
  scoringMicrocopyIndicative: string;
  scoringMicrocopyNoAi: string;
  scoringContextLabel: string;
  scoringTopStrengthLabel: string;
  scoringMainWatchoutLabel: string;
  scoringExpandLabel: string;
  scoringOverall: Record<
    'safe_to_test' | 'strong_candidate' | 'needs_refinement' | 'review_required',
    string
  >;
  scoringAxisLabels: Record<
    'attention' | 'clarity' | 'credibility' | 'conversion' | 'distinctiveness' | 'brandSafety',
    string
  >;
  scoringLevelLabels: Record<
    'low' | 'medium' | 'high' | 'very_high' | 'needs_review',
    string
  >;
  scoringPlatformLabels: Record<
    'meta_feed' | 'instagram_reels' | 'tiktok' | 'linkedin_feed' | 'youtube_shorts' | 'generic_social',
    string
  >;

  // AI-017H — Creative Test Plan v1
  testPlanTitle: string;
  testPlanSubtitle: string;
  testPlanHypothesisLabel: string;
  testPlanVariableLabel: string;
  testPlanPrimaryMetricLabel: string;
  testPlanDurationLabel: string;
  testPlanWhyLabel: string;
  testPlanWatchoutLabel: string;
  testPlanReviewRequiredBadge: string;
  testPlanCopyButton: string;
  testPlanCopiedToast: string;
  testPlanVariableLabels: Record<
    'hook' | 'visual_angle' | 'proof_mechanism' | 'cta' | 'format' | 'audience_pain' | 'offer_framing',
    string
  >;
}

export const CREATIVE_STUDIO_FR: CreativeStudioCopy = {
  sectionTitle: 'Creative Studio',
  sectionSubtitle:
    'Prépare tes visuels et vidéos à tester — sans lancer de modèle média.',
  badgePromptOnly: 'Prompt-only',
  safetyLine: "Aucun modèle image ou vidéo n'a été lancé.",

  tabImages: 'Images',
  tabVideos: 'Vidéos',
  tabStoryboard: 'Storyboard 15s',

  imageCardSceneLabel: 'Scène',
  imageCardSubjectLabel: 'Sujet',
  imageCardStyleLabel: 'Style',
  imageCardOverlayLabel: 'Texte incrusté',
  imageCardPromptLabel: 'Prompt prêt à copier',
  imageCardNegativePromptLabel: 'À éviter',
  imageCardCopyButton: 'Copier le prompt image',

  videoCardDurationLabel: 'Durée',
  videoCardHookLabel: 'Hook',
  videoCardShotsLabel: 'Plans',
  videoCardOnScreenLabel: 'On-screen',
  videoCardPromptLabel: 'Prompt prêt à copier',
  videoCardAvoidLabel: 'À éviter',
  videoCardCopyButton: 'Copier le prompt vidéo',

  storyboardTitle: 'Storyboard 15 secondes',
  storyboardDurationLabel: 'Durée totale',
  storyboardBeatVisualLabel: 'Visuel',
  storyboardBeatOnScreenLabel: 'À l’écran',
  storyboardBeatNarrationLabel: 'Voix off',
  storyboardBeatPurposeLabel: 'Intention',
  storyboardCopyButton: 'Copier le storyboard',

  copiedToast: 'Prompt copié.',
  copyFailedToast: 'Copie indisponible.',

  emptyState: 'Complète ton offre pour préparer les concepts créatifs.',

  campaignThemeLabel: 'Thème de campagne',
  visualDirectionLabel: 'Direction visuelle',
  audienceEmotionLabel: 'Emotion visée',
  ctaVisualLabel: 'CTA visuel',
  productionNotesLabel: 'Notes de production',
  onScreenSuggestionsLabel: 'Règles texte à l’écran',

  selectorTitle: 'Choisis ton intention créative',
  selectorSubtitle:
    'Safe, Social Proof, Performance ou Breakthrough — selon ce que tu veux tester.',
  selectorHelper:
    "Ce choix guide les prompts. Aucun modèle image ou vidéo n'est lancé.",
  selectorUseWhenLabel: "Quand l'utiliser",
  selectorRulesLabel: 'Règles créatives',
  selectorScoreHintsLabel: 'Signaux',
  selectorWarningBreakthrough:
    'À valider humainement avant toute future génération média.',
  selectorCurrentDirectionLabel: 'Direction créative sélectionnée',
  selectorTaglines: {
    safe: 'Clair, propre, brand-safe',
    social_proof: "Humain, crédible, preuve d'usage",
    performance: 'Hook fort, objection, CTA',
    breakthrough: 'Pattern interrupt, émotion, mémorisation',
  },
  selectorUseWhen: {
    safe: [
      'tu veux une création simple et rassurante',
      'tu testes une offre encore fragile',
      'ta marque doit rester prudente',
    ],
    social_proof: [
      'tu veux rassurer',
      "tu veux montrer l'usage réel",
      'tu veux un style UGC / créateur / client',
    ],
    performance: [
      'tu veux tester la conversion',
      'tu as une offre claire',
      'tu veux un angle direct-response',
    ],
    breakthrough: [
      'tu veux stopper le scroll',
      'tu veux un angle différenciant',
      'tu acceptes une review humaine',
    ],
  },
  selectorScoreAxisLabels: {
    attention: 'Attention',
    clarity: 'Clarté',
    credibility: 'Crédibilité',
    conversionIntent: 'Intention conversion',
    distinctiveness: 'Distinctivité',
    brandSafety: 'Sécurité marque',
  },
  selectorScoreLevelLabels: {
    low: 'faible',
    medium: 'moyen',
    high: 'élevé',
    very_high: 'très élevé',
    needs_review: 'à valider',
  },
  copyPrefixLabel: 'Direction créative',

  scoringTitle: 'Score créatif',
  scoringMicrocopyIndicative: 'Scores indicatifs, pas une prédiction de performance.',
  scoringMicrocopyNoAi:
    "Basé sur les signaux créatifs du concept, sans appel à un modèle IA.",
  scoringContextLabel: 'Contexte scoring',
  scoringTopStrengthLabel: 'Point fort',
  scoringMainWatchoutLabel: 'À surveiller',
  scoringExpandLabel: 'Pourquoi ce score ?',
  scoringOverall: {
    safe_to_test: 'Prêt à tester',
    strong_candidate: 'Candidat fort',
    needs_refinement: 'À affiner',
    review_required: 'Revue humaine',
  },
  scoringAxisLabels: {
    attention: 'Attention',
    clarity: 'Clarté',
    credibility: 'Crédibilité',
    conversion: 'Conversion',
    distinctiveness: 'Distinctivité',
    brandSafety: 'Brand safety',
  },
  scoringLevelLabels: {
    low: 'Faible',
    medium: 'Moyen',
    high: 'Fort',
    very_high: 'Très fort',
    needs_review: 'À valider',
  },
  scoringPlatformLabels: {
    meta_feed: 'Meta Feed',
    instagram_reels: 'Instagram Reels',
    tiktok: 'TikTok',
    linkedin_feed: 'LinkedIn Feed',
    youtube_shorts: 'YouTube Shorts',
    generic_social: 'Social (générique)',
  },

  testPlanTitle: 'Plan de test créatif',
  testPlanSubtitle:
    '3 tests prioritaires pour apprendre vite, sans publier automatiquement.',
  testPlanHypothesisLabel: 'Hypothèse',
  testPlanVariableLabel: 'Variable testée',
  testPlanPrimaryMetricLabel: 'Métrique principale',
  testPlanDurationLabel: 'Durée',
  testPlanWhyLabel: 'Pourquoi ce test ?',
  testPlanWatchoutLabel: 'À surveiller',
  testPlanReviewRequiredBadge: 'Revue humaine',
  testPlanCopyButton: 'Copier le plan de test',
  testPlanCopiedToast: 'Plan copié.',
  testPlanVariableLabels: {
    hook: 'Hook',
    visual_angle: 'Angle visuel',
    proof_mechanism: 'Mécanique de preuve',
    cta: 'CTA',
    format: 'Format',
    audience_pain: 'Pain audience',
    offer_framing: 'Framing offre',
  },
};

export const CREATIVE_STUDIO_EN: CreativeStudioCopy = {
  sectionTitle: 'Creative Studio',
  sectionSubtitle:
    'Prepare visuals and videos to test — without launching a media model.',
  badgePromptOnly: 'Prompt-only',
  safetyLine: 'No image or video model has been launched.',

  tabImages: 'Images',
  tabVideos: 'Videos',
  tabStoryboard: '15s Storyboard',

  imageCardSceneLabel: 'Scene',
  imageCardSubjectLabel: 'Subject',
  imageCardStyleLabel: 'Style',
  imageCardOverlayLabel: 'Text overlay',
  imageCardPromptLabel: 'Copy-ready prompt',
  imageCardNegativePromptLabel: 'Avoid',
  imageCardCopyButton: 'Copy image prompt',

  videoCardDurationLabel: 'Duration',
  videoCardHookLabel: 'Hook',
  videoCardShotsLabel: 'Shots',
  videoCardOnScreenLabel: 'On-screen',
  videoCardPromptLabel: 'Copy-ready prompt',
  videoCardAvoidLabel: 'Avoid',
  videoCardCopyButton: 'Copy video prompt',

  storyboardTitle: '15-second storyboard',
  storyboardDurationLabel: 'Total duration',
  storyboardBeatVisualLabel: 'Visual',
  storyboardBeatOnScreenLabel: 'On-screen',
  storyboardBeatNarrationLabel: 'Narration',
  storyboardBeatPurposeLabel: 'Purpose',
  storyboardCopyButton: 'Copy storyboard',

  copiedToast: 'Prompt copied.',
  copyFailedToast: 'Clipboard unavailable.',

  emptyState: 'Complete your offer to prepare the creative concepts.',

  campaignThemeLabel: 'Campaign theme',
  visualDirectionLabel: 'Visual direction',
  audienceEmotionLabel: 'Audience emotion',
  ctaVisualLabel: 'Visual CTA',
  productionNotesLabel: 'Production notes',
  onScreenSuggestionsLabel: 'On-screen text rules',

  selectorTitle: 'Pick your creative intent',
  selectorSubtitle:
    'Safe, Social Proof, Performance or Breakthrough — depending on what you want to test.',
  selectorHelper:
    'This choice guides the prompts. No image or video model is launched.',
  selectorUseWhenLabel: 'When to use',
  selectorRulesLabel: 'Creative rules',
  selectorScoreHintsLabel: 'Signals',
  selectorWarningBreakthrough:
    'Requires human review before any future media generation.',
  selectorCurrentDirectionLabel: 'Selected creative direction',
  selectorTaglines: {
    safe: 'Clear, clean, brand-safe',
    social_proof: 'Human, credible, real usage',
    performance: 'Strong hook, objection, CTA',
    breakthrough: 'Pattern interrupt, emotion, memorability',
  },
  selectorUseWhen: {
    safe: [
      'you want a simple, reassuring creative',
      'you are still testing a fragile offer',
      'your brand has to stay cautious',
    ],
    social_proof: [
      'you want to reassure',
      'you want to show real usage',
      'you want a UGC / creator / client style',
    ],
    performance: [
      'you want to test conversion',
      'you have a clear offer',
      'you want a direct-response angle',
    ],
    breakthrough: [
      'you want to stop the scroll',
      'you want a differentiating angle',
      'you accept a human review',
    ],
  },
  selectorScoreAxisLabels: {
    attention: 'Attention',
    clarity: 'Clarity',
    credibility: 'Credibility',
    conversionIntent: 'Conversion intent',
    distinctiveness: 'Distinctiveness',
    brandSafety: 'Brand safety',
  },
  selectorScoreLevelLabels: {
    low: 'low',
    medium: 'medium',
    high: 'high',
    very_high: 'very high',
    needs_review: 'needs review',
  },
  copyPrefixLabel: 'Creative direction',

  scoringTitle: 'Creative score',
  scoringMicrocopyIndicative: 'Indicative scores — not a performance prediction.',
  scoringMicrocopyNoAi:
    "Based on the concept's creative signals — no AI model call.",
  scoringContextLabel: 'Scoring context',
  scoringTopStrengthLabel: 'Top strength',
  scoringMainWatchoutLabel: 'Watch out',
  scoringExpandLabel: 'Why this score?',
  scoringOverall: {
    safe_to_test: 'Safe to test',
    strong_candidate: 'Strong candidate',
    needs_refinement: 'Needs refinement',
    review_required: 'Human review',
  },
  scoringAxisLabels: {
    attention: 'Attention',
    clarity: 'Clarity',
    credibility: 'Credibility',
    conversion: 'Conversion',
    distinctiveness: 'Distinctiveness',
    brandSafety: 'Brand safety',
  },
  scoringLevelLabels: {
    low: 'Low',
    medium: 'Medium',
    high: 'Strong',
    very_high: 'Very strong',
    needs_review: 'Needs review',
  },
  scoringPlatformLabels: {
    meta_feed: 'Meta Feed',
    instagram_reels: 'Instagram Reels',
    tiktok: 'TikTok',
    linkedin_feed: 'LinkedIn Feed',
    youtube_shorts: 'YouTube Shorts',
    generic_social: 'Social (generic)',
  },

  testPlanTitle: 'Creative test plan',
  testPlanSubtitle:
    'Three priority tests to learn fast — without publishing anything automatically.',
  testPlanHypothesisLabel: 'Hypothesis',
  testPlanVariableLabel: 'Variable to test',
  testPlanPrimaryMetricLabel: 'Primary metric',
  testPlanDurationLabel: 'Duration',
  testPlanWhyLabel: 'Why this test?',
  testPlanWatchoutLabel: 'Watch out',
  testPlanReviewRequiredBadge: 'Human review',
  testPlanCopyButton: 'Copy test plan',
  testPlanCopiedToast: 'Plan copied.',
  testPlanVariableLabels: {
    hook: 'Hook',
    visual_angle: 'Visual angle',
    proof_mechanism: 'Proof mechanism',
    cta: 'CTA',
    format: 'Format',
    audience_pain: 'Audience pain',
    offer_framing: 'Offer framing',
  },
};
