/**
 * Brief quality meter — pure function.
 *
 * Maps the current form state to a per-criterion readiness map + a weighted
 * overall score (0..100). Used by the UI to nudge the user to enrich their
 * brief BEFORE they submit, so the actionables come back stronger.
 *
 * Deliberately mirror-only: no judgment about content, just structural
 * presence. The criteria match what the AI-006 actionables mock + invariants
 * actually rely on (proofPoints anchor confidence, audience drives hooks, etc.).
 */

export interface BriefDraft {
  businessName: string;
  offer: string;
  targetAudience?: string;
  proofPoints?: string[];
  platforms?: string[];
  goal?: string;
}

export type CriterionId =
  | 'offer'
  | 'audience'
  | 'proofs'
  | 'platforms'
  | 'goal';

export type CriterionState = 'ok' | 'partial' | 'missing';

export interface BriefQuality {
  perCriterion: Record<CriterionId, CriterionState>;
  score: number; // 0..100
  readyToGenerate: boolean; // requires offer + businessName at minimum
  hint: string | null; // single most actionable suggestion, or null when full
}

const WEIGHTS: Record<CriterionId, number> = {
  offer: 35,
  audience: 20,
  proofs: 25,
  platforms: 10,
  goal: 10,
};

function offerState(draft: BriefDraft): CriterionState {
  const t = draft.offer?.trim() ?? '';
  if (!t) return 'missing';
  if (t.length < 60) return 'partial';
  return 'ok';
}

function audienceState(draft: BriefDraft): CriterionState {
  const t = draft.targetAudience?.trim() ?? '';
  if (!t) return 'missing';
  if (t.length < 20) return 'partial';
  return 'ok';
}

function proofsState(draft: BriefDraft): CriterionState {
  const arr = (draft.proofPoints ?? []).map((p) => p.trim()).filter(Boolean);
  if (arr.length === 0) return 'missing';
  if (arr.length === 1 && arr[0]!.length < 25) return 'partial';
  return 'ok';
}

function platformsState(draft: BriefDraft): CriterionState {
  const n = draft.platforms?.length ?? 0;
  if (n === 0) return 'missing';
  if (n === 1) return 'partial';
  return 'ok';
}

function goalState(draft: BriefDraft): CriterionState {
  return draft.goal ? 'ok' : 'missing';
}

const STATE_FRACTION: Record<CriterionState, number> = {
  ok: 1,
  partial: 0.5,
  missing: 0,
};

const HINTS_FR: Record<CriterionId, string> = {
  offer: "Décrivez votre offre en 2-3 phrases (problème résolu, transformation, format).",
  audience: "Précisez votre cible : un segment court suffit (ex. \"consultants B2B solo\").",
  proofs: "Ajoutez au moins une preuve concrète : nombre, durée, témoignage textuel, expérience.",
  platforms: "Choisissez au moins une plateforme — l'IA adapte le format en conséquence.",
  goal: 'Sélectionnez un objectif pour prioriser les sorties.',
};

const HINTS_EN: Record<CriterionId, string> = {
  offer: 'Describe your offer in 2-3 sentences (problem solved, transformation, format).',
  audience: 'Specify your audience — a short segment is enough (e.g. "B2B solo consultants").',
  proofs: 'Add at least one concrete proof: number, duration, testimonial text, experience.',
  platforms: 'Pick at least one platform — the AI adapts the format accordingly.',
  goal: 'Select a goal to prioritize the output sections.',
};

/**
 * Compute the brief quality state for a draft.
 * Pure function. No side effects.
 */
export function computeBriefQuality(
  draft: BriefDraft,
  language: 'fr' | 'en' = 'fr',
): BriefQuality {
  const perCriterion: Record<CriterionId, CriterionState> = {
    offer: offerState(draft),
    audience: audienceState(draft),
    proofs: proofsState(draft),
    platforms: platformsState(draft),
    goal: goalState(draft),
  };

  let score = 0;
  for (const c of Object.keys(perCriterion) as CriterionId[]) {
    score += WEIGHTS[c] * STATE_FRACTION[perCriterion[c]];
  }
  score = Math.round(Math.max(0, Math.min(100, score)));

  // Min bar to enable "Generate": offer at least partial AND a businessName non-empty.
  const businessOk = (draft.businessName?.trim().length ?? 0) > 0;
  const readyToGenerate = businessOk && perCriterion.offer !== 'missing';

  // Single highest-impact hint to display next to the meter
  const HINTS = language === 'en' ? HINTS_EN : HINTS_FR;
  const order: CriterionId[] = ['offer', 'audience', 'proofs', 'platforms', 'goal'];
  let hint: string | null = null;
  for (const c of order) {
    if (perCriterion[c] !== 'ok') {
      hint = HINTS[c];
      break;
    }
  }

  return { perCriterion, score, readyToGenerate, hint };
}

export const CRITERION_LABELS: Record<CriterionId, { fr: string; en: string }> = {
  offer: { fr: 'Offre', en: 'Offer' },
  audience: { fr: 'Audience', en: 'Audience' },
  proofs: { fr: 'Preuves', en: 'Proofs' },
  platforms: { fr: 'Plateformes', en: 'Platforms' },
  goal: { fr: 'Objectif', en: 'Goal' },
};
