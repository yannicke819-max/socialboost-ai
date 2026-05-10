/**
 * Guided Offer Onboarding (AI-014).
 *
 * Pure module: shapes the 4-step wizard state, validates it, materializes a
 * `CreateOfferInput` for the existing store, and runs the full end-to-end
 * flow that turns the wizard state into a visible result (offer + creative
 * pack + ad gallery). No I/O of its own — wires existing AI-009 / AI-013
 * builders through the AI-008a store.
 *
 * Hard rules:
 *   - Additive only. No new envelope fields.
 *   - Source language for the public output is `offer.brief.language`
 *     (the AI-013 hardening).
 *   - Re-running on the same offer must not duplicate assets or ads:
 *     - assets are skipped if the offer already has any.
 *     - ads use `upsertAdUnits` (stable id `${offerId}:${templateId}`).
 *   - No backend, no env var, no model call, no network.
 */

import type {
  AdUnit,
  Asset,
  Offer,
  OfferBrief,
  OfferTone,
} from './types';
import type { CreateOfferInput, WorkspaceStore } from './store';
import { buildCreativePack } from './pack-generator';
import { buildAdGallery } from './ad-studio';

// -----------------------------------------------------------------------------
// Wizard shape
// -----------------------------------------------------------------------------

export const OFFER_TYPES = [
  'product',
  'service',
  'saas',
  'training',
  'event',
  'other',
] as const;
export type OnboardingOfferType = (typeof OFFER_TYPES)[number];

export const OFFER_TYPE_LABELS: Record<OnboardingOfferType, { fr: string; en: string }> = {
  product: { fr: 'Produit', en: 'Product' },
  service: { fr: 'Service', en: 'Service' },
  saas: { fr: 'SaaS', en: 'SaaS' },
  training: { fr: 'Formation', en: 'Training' },
  event: { fr: 'Événement', en: 'Event' },
  other: { fr: 'Autre', en: 'Other' },
};

export const MATURITY_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export type MaturityLevel = (typeof MATURITY_LEVELS)[number];

export const MATURITY_LABELS: Record<MaturityLevel, { fr: string; en: string }> = {
  beginner: { fr: 'Débutant', en: 'Beginner' },
  intermediate: { fr: 'Intermédiaire', en: 'Intermediate' },
  advanced: { fr: 'Avancé', en: 'Advanced' },
};

/**
 * Public-facing tone options. We expose 5 simple choices in the wizard rather
 * than the workspace's internal `OfferTone` (4 values). Mapped one-way to
 * `OfferTone` at materialize time.
 */
export const ONBOARDING_TONES = [
  'clear',
  'premium',
  'direct',
  'pedagogical',
  'energetic',
] as const;
export type OnboardingTone = (typeof ONBOARDING_TONES)[number];

export const ONBOARDING_TONE_LABELS: Record<OnboardingTone, { fr: string; en: string }> = {
  clear: { fr: 'Clair', en: 'Clear' },
  premium: { fr: 'Premium', en: 'Premium' },
  direct: { fr: 'Direct', en: 'Direct' },
  pedagogical: { fr: 'Pédagogique', en: 'Pedagogical' },
  energetic: { fr: 'Énergique', en: 'Energetic' },
};

const TONE_TO_OFFER_TONE: Record<OnboardingTone, OfferTone> = {
  clear: 'professional',
  premium: 'premium',
  direct: 'bold',
  pedagogical: 'professional',
  energetic: 'friendly',
};

/** Captured form state, all fields optional during editing. */
export interface OnboardingDraft {
  // Step 1 — what you sell.
  offerName: string;
  offerType: OnboardingOfferType;
  oneLiner: string;
  // Step 2 — for whom.
  audience: string;
  problem: string;
  maturity: MaturityLevel;
  // Step 3 — why believe.
  proof: string;
  benefit: string;
  objection: string;
  // Step 4 — expected action.
  cta: string;
  tone: OnboardingTone;
  language: 'fr' | 'en';
}

export const EMPTY_DRAFT: OnboardingDraft = {
  offerName: '',
  offerType: 'service',
  oneLiner: '',
  audience: '',
  problem: '',
  maturity: 'intermediate',
  proof: '',
  benefit: '',
  objection: '',
  cta: '',
  tone: 'clear',
  language: 'fr',
};

/**
 * One-click prefill example. Deterministic, used for "Utiliser l'exemple Nova
 * Studio". Stays consistent with the AI-013 BLOCKER fixture so language
 * hardening is exercised on a realistic case.
 */
export const NOVA_STUDIO_EXAMPLE: OnboardingDraft = {
  offerName: 'Nova Studio',
  offerType: 'service',
  oneLiner:
    "J'aide les indépendants B2B à clarifier leur offre et à publier une page de vente simple en 4 semaines.",
  audience: 'indépendants B2B qui vendent des services',
  problem:
    "Leur offre est noyée dans cinq versions différentes et personne ne se reconnaît.",
  maturity: 'intermediate',
  proof: 'Méthode testée sur 12 offres de consultants',
  benefit: 'Une seule offre claire et une page de vente prête en 4 semaines.',
  objection: "Je n'ai pas le temps de refaire toute mon offre.",
  cta: 'Réserver un appel de cadrage de 20 minutes',
  tone: 'clear',
  language: 'fr',
};

// -----------------------------------------------------------------------------
// Validation
// -----------------------------------------------------------------------------

/**
 * Per-step validation: which fields belong to each step, and which errors must
 * block progression. Errors are typed strings the UI maps to localized copy.
 */
export type OnboardingErrorCode =
  | 'name_required'
  | 'one_liner_required'
  | 'audience_required'
  | 'problem_required'
  | 'proof_or_benefit_required'
  | 'cta_required'
  | 'language_required';

export interface OnboardingErrors {
  step1?: OnboardingErrorCode[];
  step2?: OnboardingErrorCode[];
  step3?: OnboardingErrorCode[];
  step4?: OnboardingErrorCode[];
}

const MIN_TEXT = 3;

function isPresent(s: string | undefined | null): boolean {
  return typeof s === 'string' && s.trim().length >= MIN_TEXT;
}

export function validateStep(draft: OnboardingDraft, step: 1 | 2 | 3 | 4): OnboardingErrorCode[] {
  const out: OnboardingErrorCode[] = [];
  if (step === 1) {
    if (!isPresent(draft.offerName)) out.push('name_required');
    if (!isPresent(draft.oneLiner)) out.push('one_liner_required');
  } else if (step === 2) {
    if (!isPresent(draft.audience)) out.push('audience_required');
    if (!isPresent(draft.problem)) out.push('problem_required');
  } else if (step === 3) {
    // Step 3 accepts either a proof OR a benefit — not both required, but at
    // least one must be present so the engine has something to anchor.
    if (!isPresent(draft.proof) && !isPresent(draft.benefit)) {
      out.push('proof_or_benefit_required');
    }
  } else if (step === 4) {
    if (!isPresent(draft.cta)) out.push('cta_required');
    if (draft.language !== 'fr' && draft.language !== 'en') {
      out.push('language_required');
    }
  }
  return out;
}

export function validateAll(draft: OnboardingDraft): OnboardingErrors {
  const out: OnboardingErrors = {};
  const s1 = validateStep(draft, 1);
  const s2 = validateStep(draft, 2);
  const s3 = validateStep(draft, 3);
  const s4 = validateStep(draft, 4);
  if (s1.length > 0) out.step1 = s1;
  if (s2.length > 0) out.step2 = s2;
  if (s3.length > 0) out.step3 = s3;
  if (s4.length > 0) out.step4 = s4;
  return out;
}

export function isDraftComplete(draft: OnboardingDraft): boolean {
  return Object.keys(validateAll(draft)).length === 0;
}

// -----------------------------------------------------------------------------
// Materialize: turn the wizard state into a CreateOfferInput.
// -----------------------------------------------------------------------------

/**
 * Map a validated draft to the existing CreateOfferInput shape so the AI-008a
 * store can persist it without changes. Pure: no I/O.
 */
export function materializeFromOnboarding(draft: OnboardingDraft): CreateOfferInput {
  const language = draft.language === 'en' ? 'en' : 'fr';
  const proofPoints = isPresent(draft.proof) ? [draft.proof.trim()] : [];
  // platforms default — minimal mock surface compatible with feedback-engine.
  const platforms = ['linkedin', 'email'];
  const brief: OfferBrief = {
    businessName: draft.offerName.trim(),
    offer: draft.oneLiner.trim(),
    targetAudience: draft.audience.trim(),
    tone: TONE_TO_OFFER_TONE[draft.tone] ?? 'professional',
    language,
    platforms,
    proofPoints,
  };
  return {
    name: draft.offerName.trim(),
    status: 'draft',
    goal: 'social_content',
    language,
    brief,
    confidence_score: estimateConfidence(draft),
    primary_channel: 'linkedin',
    notes: buildInternalNotes(draft),
  };
}

/**
 * Soft confidence heuristic so the workspace surfaces a sensible score from
 * day one. NOT a real model call — pure derivation from form completeness.
 */
function estimateConfidence(draft: OnboardingDraft): number {
  let score = 50;
  if (isPresent(draft.proof)) score += 12;
  if (isPresent(draft.benefit)) score += 8;
  if (isPresent(draft.objection)) score += 8;
  if (isPresent(draft.audience)) score += 5;
  if (isPresent(draft.problem)) score += 5;
  if (isPresent(draft.cta)) score += 5;
  return Math.max(0, Math.min(100, score));
}

function buildInternalNotes(draft: OnboardingDraft): string {
  // Internal-only memo. Never surfaces in public ad copy.
  const lines = [
    `[onboarding] type=${draft.offerType}`,
    `[onboarding] maturity=${draft.maturity}`,
    `[onboarding] tone=${draft.tone}`,
  ];
  if (isPresent(draft.benefit)) lines.push(`[onboarding] benefit=${draft.benefit.trim()}`);
  if (isPresent(draft.objection)) lines.push(`[onboarding] objection=${draft.objection.trim()}`);
  if (isPresent(draft.cta)) lines.push(`[onboarding] cta=${draft.cta.trim()}`);
  return lines.join('\n');
}

// -----------------------------------------------------------------------------
// Apply: full end-to-end execution against the store.
// -----------------------------------------------------------------------------

export interface OnboardingResult {
  offer: Offer;
  /** True when at least one new asset was inserted in this run. */
  packGenerated: boolean;
  /** Number of ad units after upsert. */
  adCount: number;
}

/**
 * Run the full onboarding pipeline:
 *  1. Create the offer (or update an existing one when `improveOfferId` is set).
 *  2. Generate the creative pack mock if no asset exists yet for this offer.
 *  3. Build and upsert the ad gallery (idempotent — `upsertAdUnits` keeps
 *     existing user statuses by id).
 *
 * Pure-ish: the only side effects go through the provided WorkspaceStore.
 * Throws if the draft is incomplete (caller must validate first).
 */
export function runOnboarding(
  store: WorkspaceStore,
  draft: OnboardingDraft,
  options: { improveOfferId?: string } = {},
): OnboardingResult {
  if (!isDraftComplete(draft)) {
    throw new Error('onboarding_draft_incomplete');
  }
  const input = materializeFromOnboarding(draft);
  let offer: Offer;
  if (options.improveOfferId) {
    const updated = store.updateOffer(options.improveOfferId, {
      name: input.name,
      goal: input.goal,
      language: input.language,
      brief: input.brief,
      confidence_score: input.confidence_score,
      primary_channel: input.primary_channel,
      notes: input.notes,
    });
    if (!updated) {
      // Fall back to creation if the id no longer exists.
      offer = store.createOffer(input);
    } else {
      offer = updated;
    }
  } else {
    offer = store.createOffer(input);
  }

  // Generate the creative pack only if this offer has no assets yet.
  // Re-running on the same offer never duplicates the pack.
  const existingAssets = store.listAssetsByOffer(offer.id);
  let packGenerated = false;
  if (existingAssets.length === 0) {
    const drafts = buildCreativePack({ offer });
    for (const d of drafts) {
      store.createAsset(d);
    }
    packGenerated = true;
  }

  // Build and upsert ad units. `upsertAdUnits` is idempotent and preserves
  // user statuses by stable id, so a second run does NOT create duplicates.
  const assetsAfter = store.listAssetsByOffer(offer.id);
  const ads: AdUnit[] = buildAdGallery({ offer, assets: assetsAfter });
  store.upsertAdUnits(offer.id, ads);

  return {
    offer,
    packGenerated,
    adCount: ads.length,
  };
}

/**
 * Build a draft pre-filled from an existing offer. Used when entering the
 * wizard in "improve" mode. Only fields the engine can safely recover are
 * pre-filled; the rest defaults to empty so the user can refresh them.
 */
export function draftFromOffer(offer: Offer): OnboardingDraft {
  const lang = offer.brief.language === 'en' ? 'en' : 'fr';
  // Reverse-map OfferTone → OnboardingTone (lossy; default to clear).
  const reverse: Record<OfferTone, OnboardingTone> = {
    professional: 'clear',
    premium: 'premium',
    bold: 'direct',
    friendly: 'energetic',
  };
  return {
    ...EMPTY_DRAFT,
    offerName: offer.name ?? offer.brief.businessName ?? '',
    offerType: 'service',
    oneLiner: offer.brief.offer ?? '',
    audience: offer.brief.targetAudience ?? '',
    problem: '',
    maturity: 'intermediate',
    proof: offer.brief.proofPoints?.[0] ?? '',
    benefit: '',
    objection: '',
    cta: '',
    tone: reverse[offer.brief.tone] ?? 'clear',
    language: lang,
  };
}

// Re-export an Asset reference type so test fixtures don't need to import it
// from a separate module.
export type { Asset };
