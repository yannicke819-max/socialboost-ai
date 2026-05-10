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
};
