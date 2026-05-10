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
  /** AI-015 addendum: External Inspiration Intelligence section. */
  inspirationsTitle: string;
  inspirationsHelper: string;
  inspirationsAdd: string;
  inspirationsRemove: string;
  inspirationsListTitle: string;
  inspirationsEmpty: string;
  inspirationsBriefSection: string;
  inspirationsPatternsSection: string;
  inspirationsAdaptSection: string;
  inspirationsDoNotCopy: string;
  inspirationsPlatformLabel: string;
  inspirationsSourceTypeLabel: string;
  inspirationsPastedLabel: string;
  inspirationsPastedPh: string;
  inspirationsSignalsLabel: string;
  inspirationsSignalsPh: string;
  inspirationsNotesLabel: string;
  inspirationsNotesPh: string;
  /** AI-016A Free-mode block. */
  freeModeBadge: string;
  freeModeTitle: string;
  freeModeBody: string;
  freeModeNoAdminCost: string;
  freeModeNoModelLaunched: string;
  freeModeUpgradeCta: string;
  freeModeEstimateLabel: string;
  freeModeEstimateSuffix: string;
  freeModeRecommendedModelLabel: string;
  freeModeCopyGeneric: string;
  freeModeCopyClaude: string;
  freeModeCopyChatGpt: string;
  /** AI-016B: paid-plan provider runner button + result panel. */
  paidTestButton: string;
  paidTestRunningLabel: string;
  paidTestResultTitle: string;
  paidTestResultDryRunFlagOff: string;
  paidTestResultDryRunNoKey: string;
  paidTestResultBlockedLabel: string;
  paidTestResultValidationErrorsLabel: string;
  paidTestResultOutputLabel: string;
  paidTestResultDraftReminder: string;
  paidTestDisabledForFreeTooltip: string;
  /** AI-016D: smoke-test three-state explainers + enriched result panel. */
  smokeFreeStateExplain: string;
  smokePaidDisabledExplain: string;
  smokePaidEnabledCta: string;
  smokeSimulatedPlanLabel: string;
  smokeSimulatedPlanHint: string;
  smokeSimulatedPlanReset: string;
  resultPanelEstimatedCreditsLabel: string;
  resultPanelStatusLabel: string;
  resultPanelStatusOk: string;
  resultPanelStatusBlocked: string;
  resultPanelStatusDryRun: string;
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
    external_inspiration_analysis: 'Analyser des inspirations externes',
  },
  inspirationsTitle: 'Inspirations externes',
  inspirationsHelper:
    "Colle ici des posts ou publicités qui semblent bien fonctionner dans ton marché. SocialBoost n'en copiera pas le texte : il analysera les mécaniques pour créer une campagne originale.",
  inspirationsAdd: 'Ajouter une inspiration',
  inspirationsRemove: 'Retirer',
  inspirationsListTitle: 'Inspirations utilisées',
  inspirationsEmpty: 'Aucune inspiration ajoutée pour cette offre.',
  inspirationsBriefSection: 'Inspirations utilisées',
  inspirationsPatternsSection: 'Patterns extraits',
  inspirationsAdaptSection: 'Comment SocialBoost les adapte',
  inspirationsDoNotCopy: 'Garde-fou : ne pas copier',
  inspirationsPlatformLabel: 'Plateforme',
  inspirationsSourceTypeLabel: 'Type',
  inspirationsPastedLabel: 'Texte collé (optionnel)',
  inspirationsPastedPh:
    "Colle ici le texte du post ou de l'annonce qui semble bien fonctionner.",
  inspirationsSignalsLabel: 'Signaux observés (un par ligne, optionnels)',
  inspirationsSignalsPh:
    'beaucoup de commentaires\npublicité active depuis longtemps\nformat récurrent chez plusieurs concurrents',
  inspirationsNotesLabel: 'Notes (optionnel)',
  inspirationsNotesPh: 'Pourquoi tu trouves cet exemple intéressant ?',
  freeModeBadge: 'Mode gratuit',
  freeModeTitle: 'Le brief IA est prêt',
  freeModeBody:
    'SocialBoost prépare ton brief IA expert, sans lancer de modèle payant.',
  freeModeNoAdminCost: "Aucun coût IA n'est généré.",
  freeModeNoModelLaunched:
    "Aucun modèle IA n'a été lancé par SocialBoost en mode gratuit.",
  freeModeUpgradeCta: 'Passer en Starter pour générer automatiquement',
  freeModeEstimateLabel: 'Exécution automatique estimée',
  freeModeEstimateSuffix: 'crédits',
  freeModeRecommendedModelLabel: 'Modèle recommandé',
  freeModeCopyGeneric: 'Copier le brief IA',
  freeModeCopyClaude: 'Copier format Claude',
  freeModeCopyChatGpt: 'Copier format ChatGPT',
  paidTestButton: 'Tester le brief IA',
  paidTestRunningLabel: 'Test en cours…',
  paidTestResultTitle: 'Résultat du test',
  paidTestResultDryRunFlagOff:
    "Provider IA désactivé sur cet environnement. Aucun appel réel n'a été effectué.",
  paidTestResultDryRunNoKey:
    'Aucune clé API configurée pour cet environnement. Test en mode démonstration.',
  paidTestResultBlockedLabel: 'Bloqué',
  paidTestResultValidationErrorsLabel: 'Erreurs de validation',
  paidTestResultOutputLabel: 'Sortie (brouillon, à relire)',
  paidTestResultDraftReminder:
    "Cette sortie est un brouillon. Aucune annonce n'est créée ou publiée automatiquement. Relis avant de l'utiliser.",
  paidTestDisabledForFreeTooltip:
    'Le test provider IA est réservé aux plans payants. Le brief reste copiable en Free.',
  smokeFreeStateExplain: 'Mode gratuit : copie le brief IA, aucun modèle lancé.',
  smokePaidDisabledExplain: 'Génération IA indisponible sur cet environnement.',
  smokePaidEnabledCta: 'Générer un test IA',
  smokeSimulatedPlanLabel: 'Plan simulé (Preview)',
  smokeSimulatedPlanHint:
    'Disponible uniquement sur Preview. Aucun appel Stripe, aucune facturation.',
  smokeSimulatedPlanReset: 'Réinitialiser',
  resultPanelEstimatedCreditsLabel: 'Crédits estimés',
  resultPanelStatusLabel: 'Statut',
  resultPanelStatusOk: 'OK',
  resultPanelStatusBlocked: 'Bloqué',
  resultPanelStatusDryRun: 'Démonstration (dry-run)',
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
    external_inspiration_analysis: 'Analyse external inspirations',
  },
  inspirationsTitle: 'External inspirations',
  inspirationsHelper:
    "Paste posts or ads that seem to perform well in your market. SocialBoost won't copy the text — it will analyse the mechanics to create an original campaign.",
  inspirationsAdd: 'Add an inspiration',
  inspirationsRemove: 'Remove',
  inspirationsListTitle: 'Inspirations used',
  inspirationsEmpty: 'No inspiration added for this offer.',
  inspirationsBriefSection: 'Inspirations used',
  inspirationsPatternsSection: 'Patterns extracted',
  inspirationsAdaptSection: 'How SocialBoost adapts them',
  inspirationsDoNotCopy: 'Guardrail: do not copy',
  inspirationsPlatformLabel: 'Platform',
  inspirationsSourceTypeLabel: 'Type',
  inspirationsPastedLabel: 'Pasted text (optional)',
  inspirationsPastedPh:
    'Paste the text of the post or ad that seems to perform well.',
  inspirationsSignalsLabel: 'Observed signals (one per line, optional)',
  inspirationsSignalsPh:
    'lots of comments\nrunning for months\nrecurring format across competitors',
  inspirationsNotesLabel: 'Notes (optional)',
  inspirationsNotesPh: 'Why do you find this example interesting?',
  freeModeBadge: 'Free mode',
  freeModeTitle: 'AI brief is ready',
  freeModeBody:
    'SocialBoost prepares your expert AI brief without firing a paid model.',
  freeModeNoAdminCost: 'No AI cost is generated.',
  freeModeNoModelLaunched: 'No AI model has been launched by SocialBoost in free mode.',
  freeModeUpgradeCta: 'Upgrade to Starter to generate automatically',
  freeModeEstimateLabel: 'Auto-run estimate',
  freeModeEstimateSuffix: 'credits',
  freeModeRecommendedModelLabel: 'Recommended model',
  freeModeCopyGeneric: 'Copy AI brief',
  freeModeCopyClaude: 'Copy Claude format',
  freeModeCopyChatGpt: 'Copy ChatGPT format',
  paidTestButton: 'Test AI brief',
  paidTestRunningLabel: 'Testing…',
  paidTestResultTitle: 'Test result',
  paidTestResultDryRunFlagOff:
    'AI provider is disabled on this environment. No real call was made.',
  paidTestResultDryRunNoKey: 'No API key configured for this environment. Demo-only test.',
  paidTestResultBlockedLabel: 'Blocked',
  paidTestResultValidationErrorsLabel: 'Validation errors',
  paidTestResultOutputLabel: 'Output (draft, please review)',
  paidTestResultDraftReminder:
    'This output is a draft. No ad is created or published automatically. Review before using it.',
  paidTestDisabledForFreeTooltip:
    'The AI provider test is reserved for paid plans. The brief stays copyable on Free.',
  smokeFreeStateExplain: 'Free mode: copy the AI brief, no model is launched.',
  smokePaidDisabledExplain: 'AI generation is unavailable on this environment.',
  smokePaidEnabledCta: 'Run an AI test',
  smokeSimulatedPlanLabel: 'Simulated plan (Preview)',
  smokeSimulatedPlanHint: 'Preview only. No Stripe call, no billing.',
  smokeSimulatedPlanReset: 'Reset',
  resultPanelEstimatedCreditsLabel: 'Estimated credits',
  resultPanelStatusLabel: 'Status',
  resultPanelStatusOk: 'OK',
  resultPanelStatusBlocked: 'Blocked',
  resultPanelStatusDryRun: 'Demo (dry-run)',
};

/** Microcopy for the AdStudio explainer line. */
export const AD_STUDIO_BRIEF_HINT_FR =
  'Chaque annonce est préparée à partir d\'un brief IA structuré : objectif, audience, preuve, objection et canal.';
export const AD_STUDIO_BRIEF_HINT_EN =
  'Each ad is prepared from a structured AI brief: goal, audience, proof, objection and channel.';
