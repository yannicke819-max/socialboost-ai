/**
 * Microcopy for the "Voir le brief IA" inspector (AI-015).
 *
 * Pure constants, importable from Node tests so we can pin the visible
 * strings without rendering React.
 */

export interface PromptInspectorCopy {
  triggerLabel: string;
  panelTitle: string;
  taskLabel: string;
  channelLabel: string;
  systemPromptLabel: string;
  userPromptLabel: string;
  expectedOutputLabel: string;
  guardrailsLabel: string;
  qualityLabel: string;
  copyButton: string;
  copiedToast: string;
  copyFailedToast: string;
  helperLine: string;
  taskPickerLabel: string;
  channelPickerLabel: string;
  channelAny: string;
  taskOptions: Record<string, string>;
}

export const PROMPT_INSPECTOR_FR: PromptInspectorCopy = {
  triggerLabel: 'Voir le brief IA',
  panelTitle: 'Brief IA utilisé',
  taskLabel: 'Tâche',
  channelLabel: 'Canal',
  systemPromptLabel: 'Prompt système',
  userPromptLabel: 'Prompt utilisateur',
  expectedOutputLabel: 'Format attendu',
  guardrailsLabel: 'Garde-fous',
  qualityLabel: 'Critères qualité',
  copyButton: 'Copier le brief IA',
  copiedToast: 'Brief IA copié.',
  copyFailedToast: 'Copie indisponible.',
  helperLine:
    "SocialBoost prépare ce brief structuré avant chaque génération. Tu peux le relire ou le copier pour transparence.",
  taskPickerLabel: 'Choisir la tâche',
  channelPickerLabel: 'Canal cible',
  channelAny: 'Au choix',
  taskOptions: {
    offer_diagnosis: "Diagnostic de l'offre",
    angle_discovery: 'Trouver des angles',
    post_ideas: 'Idées de posts',
    ad_generation: 'Générer des annonces',
    ad_critique: 'Critiquer une annonce',
    ad_improvement: 'Améliorer une annonce',
    weekly_plan: 'Planifier la semaine',
    user_advice: 'Conseiller la prochaine étape',
  },
};

export const PROMPT_INSPECTOR_EN: PromptInspectorCopy = {
  triggerLabel: 'View AI brief',
  panelTitle: 'AI brief used',
  taskLabel: 'Task',
  channelLabel: 'Channel',
  systemPromptLabel: 'System prompt',
  userPromptLabel: 'User prompt',
  expectedOutputLabel: 'Expected format',
  guardrailsLabel: 'Guardrails',
  qualityLabel: 'Quality checklist',
  copyButton: 'Copy AI brief',
  copiedToast: 'AI brief copied.',
  copyFailedToast: 'Clipboard unavailable.',
  helperLine:
    'SocialBoost prepares this structured brief before every generation. You can review or copy it for transparency.',
  taskPickerLabel: 'Pick the task',
  channelPickerLabel: 'Target channel',
  channelAny: 'Any',
  taskOptions: {
    offer_diagnosis: 'Offer diagnosis',
    angle_discovery: 'Find angles',
    post_ideas: 'Post ideas',
    ad_generation: 'Generate ads',
    ad_critique: 'Critique an ad',
    ad_improvement: 'Improve an ad',
    weekly_plan: 'Plan the week',
    user_advice: 'Advise next step',
  },
};

/** Microcopy for the AdStudio explainer line. */
export const AD_STUDIO_BRIEF_HINT_FR =
  'Chaque annonce est préparée à partir d\'un brief IA structuré : objectif, audience, preuve, objection et canal.';
export const AD_STUDIO_BRIEF_HINT_EN =
  'Each ad is prepared from a structured AI brief: goal, audience, proof, objection and channel.';
