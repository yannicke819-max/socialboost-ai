/**
 * Pure helpers for the Offer Brain UI v1.
 *
 * Goal-driven ordering of result sections + tone iteration utilities.
 * No I/O. No fetch. Used by the client view layer to pivot the result
 * presentation around the user's selected intent.
 */

export const GOALS = [
  'clarify_offer',
  'social_content',
  'landing_page',
  'objections',
  'sales_angles',
] as const;

export type Goal = (typeof GOALS)[number];

export const GOAL_LABELS: Record<Goal, { fr: string; en: string }> = {
  clarify_offer: { fr: "Clarifier mon offre", en: 'Clarify my offer' },
  social_content: { fr: 'Créer du contenu social', en: 'Create social content' },
  landing_page: { fr: 'Préparer une landing page', en: 'Prepare a landing page' },
  objections: { fr: 'Traiter les objections', en: 'Handle objections' },
  sales_angles: { fr: 'Générer des angles de vente', en: 'Generate sales angles' },
};

/**
 * The ordered list of result section IDs the UI must render.
 * Values match the keys produced by the API (`actionables.<key>`).
 *
 * Every section appears in every order — only the priority differs. We never
 * hide a section silently; users always see the full picture, just sorted to
 * match their stated goal.
 */
export type SectionId =
  | 'summary' // bundle: offer_summary, target_audience, value_proposition
  | 'pain_points'
  | 'hooks'
  | 'offer_angles'
  | 'objections'
  | 'ctas'
  | 'social_posts'
  | 'landing_page_sections'
  | 'proof_points'
  | 'warnings';

const ALL_SECTIONS: SectionId[] = [
  'summary',
  'pain_points',
  'hooks',
  'offer_angles',
  'objections',
  'ctas',
  'social_posts',
  'landing_page_sections',
  'proof_points',
  'warnings',
];

const PRIORITY: Record<Goal, SectionId[]> = {
  clarify_offer: ['summary', 'pain_points', 'offer_angles', 'hooks', 'ctas'],
  social_content: ['social_posts', 'hooks', 'ctas', 'summary'],
  landing_page: ['landing_page_sections', 'summary', 'proof_points', 'ctas'],
  objections: ['objections', 'proof_points', 'summary'],
  sales_angles: ['offer_angles', 'hooks', 'summary', 'ctas'],
};

/**
 * Returns the section IDs in the order the UI should render them, given
 * the goal. Sections in the goal's priority list come first, then the rest
 * in canonical order, then warnings at the end.
 */
export function sectionsForGoal(goal: Goal): SectionId[] {
  const head = PRIORITY[goal];
  const tail = ALL_SECTIONS.filter((s) => !head.includes(s) && s !== 'warnings');
  // warnings always last (they're a quality signal, not a primary deliverable)
  return [...head, ...tail.filter((s) => !head.includes(s)), 'warnings'];
}

/**
 * For tone-regenerate buttons: list the alternative tones to offer (excluding
 * the currently selected tone).
 */
export const ALL_TONES = ['professional', 'bold', 'friendly', 'premium'] as const;
export type Tone = (typeof ALL_TONES)[number];

export function alternativeTones(current: Tone): Tone[] {
  return ALL_TONES.filter((t) => t !== current);
}

export const TONE_LABELS: Record<Tone, { fr: string; en: string }> = {
  professional: { fr: 'professionnel', en: 'professional' },
  bold: { fr: 'audacieux', en: 'bolder' },
  friendly: { fr: 'amical', en: 'friendlier' },
  premium: { fr: 'premium', en: 'premium' },
};
