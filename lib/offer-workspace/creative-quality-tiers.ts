/**
 * Creative Quality Tiers v1 — pure module (AI-017C).
 *
 * SocialBoost differentiates creative output by social-ad **strategy**,
 * not by generic technical labels. The four tiers below each map to a
 * proven creative pattern in social advertising:
 *
 *   safe          — clarity-first, low brand risk, simple benefit.
 *   social_proof  — human / UGC, real testimonial, "people like me use it".
 *   performance   — 2-second hook, immediate benefit, objection +
 *                   clear CTA, mobile-first text.
 *   breakthrough  — pattern interrupt, unexpected angle, distinctive
 *                   visual, scroll-stopping. Always requires human
 *                   review before any future real provider call.
 *
 * Hard rules:
 *   - Pure: no `fetch`, no `process.env`, no `Date.now()` in output.
 *   - The labels `'draft'`, `'standard'`, `'premium'` are NOT used in
 *     this media model. Pinned by tests.
 *   - Free always = `'prompt_only'`, regardless of plan/flag/tier.
 *   - `breakthrough` video → `humanReviewRequired: true` for every
 *     plan, no exception.
 *   - SocialBoost does not call any real image / video provider in
 *     AI-017C. The estimates here are credit budgets used by the
 *     entitlements layer; no money is moved.
 */

// -----------------------------------------------------------------------------
// Public types
// -----------------------------------------------------------------------------

export const CREATIVE_QUALITY_TIERS = [
  'safe',
  'social_proof',
  'performance',
  'breakthrough',
] as const;
export type CreativeQualityTier = (typeof CREATIVE_QUALITY_TIERS)[number];

export const MEDIA_KINDS = ['image', 'video'] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

/**
 * Documented criteria for each tier — exposed as data so the UI and
 * the entitlements layer share the same source of truth.
 */
export interface CreativeStrategy {
  tier: CreativeQualityTier;
  /** One-line label, mostly for the UI. */
  label: string;
  /** Short pitch (FR primary, kept short). */
  rationale: string;
  /** Concrete creative criteria the brief must satisfy. */
  criteria: readonly string[];
  /** Brand-safety risk on a 1-4 scale. 1 = lowest, 4 = highest. */
  brandSafetyRisk: 1 | 2 | 3 | 4;
  /** Hint of attention captured by this tier (0-100, advisory only). */
  attentionScoreHint: number;
  /** Hint of conversion intent (0-100, advisory only). */
  conversionIntentHint: number;
  /**
   * `true` when the tier requires explicit human review before any
   * future real provider call — even on plans that would otherwise
   * have credits.
   */
  humanReviewRequired: boolean;
}

export const CREATIVE_STRATEGIES: Record<CreativeQualityTier, CreativeStrategy> = {
  safe: {
    tier: 'safe',
    label: 'Safe — message clair',
    rationale:
      "Concept lisible, à faible risque, idéal pour marques prudentes ou audiences nouvelles.",
    criteria: [
      'message clair en moins de 8 mots',
      'lecture en 2 secondes maximum',
      'aucun claim absolu',
      "aucune promesse de résultats garantis",
      'visuel reconnaissable, pas de symbole ambigu',
    ],
    brandSafetyRisk: 1,
    attentionScoreHint: 35,
    conversionIntentHint: 45,
    humanReviewRequired: false,
  },
  social_proof: {
    tier: 'social_proof',
    label: 'Social Proof — preuve réelle',
    rationale:
      "Humain au centre, témoignage ou usage réel, déclenche le 'des gens comme moi l'utilisent'.",
    criteria: [
      'humain au centre, regard direct',
      'témoignage authentique uniquement',
      "aucun faux témoignage, aucun acteur présenté comme client",
      "avant/après uniquement si mesurable et non trompeur",
      "consentement écrit pour tout visage humain représenté",
    ],
    brandSafetyRisk: 2,
    attentionScoreHint: 55,
    conversionIntentHint: 65,
    humanReviewRequired: false,
  },
  performance: {
    tier: 'performance',
    label: 'Performance — conçu pour conversion',
    rationale:
      "Hook fort en 2s, bénéfice immédiat, objection traitée, CTA clair, format mobile-first.",
    criteria: [
      'hook visuel ou textuel dans les 2 premières secondes',
      'bénéfice principal énoncé immédiatement',
      "une objection majeure adressée explicitement",
      'CTA clair, verbe + objet + délai concret',
      'texte à l\'écran lisible muet, contraste AA minimum',
      'cadrage mobile-first 9:16 ou 4:5',
    ],
    brandSafetyRisk: 2,
    attentionScoreHint: 75,
    conversionIntentHint: 85,
    humanReviewRequired: false,
  },
  breakthrough: {
    tier: 'breakthrough',
    label: 'Breakthrough — pattern interrupt',
    rationale:
      "Angle inattendu, contraste visuel fort, conçu pour stopper le scroll et marquer la mémoire.",
    criteria: [
      'pattern interrupt visuel ou narratif',
      'angle inattendu, distinctif vs concurrents',
      'émotion forte, mais respect strict des guardrails',
      'contraste visuel marqué, palette à risque maîtrisé',
      "review humaine obligatoire avant tout futur appel provider réel",
    ],
    brandSafetyRisk: 4,
    attentionScoreHint: 92,
    conversionIntentHint: 70,
    humanReviewRequired: true,
  },
};

// -----------------------------------------------------------------------------
// Credit policy — flat per image, per second for video.
// Surfaced as data so a future media entitlements layer can compose budgets.
// -----------------------------------------------------------------------------

export const IMAGE_CREDITS_BY_TIER: Record<CreativeQualityTier, number> = {
  safe: 5,
  social_proof: 10,
  performance: 15,
  breakthrough: 35,
};

export const VIDEO_CREDITS_PER_SECOND_BY_TIER: Record<CreativeQualityTier, number> = {
  safe: 6,
  social_proof: 10,
  performance: 15,
  breakthrough: 40,
};

/**
 * Estimate the credit cost of a single creative run.
 *
 * Pure: same input → same output. Returns the granular numbers AND a
 * snapshot of the strategy so the consumer doesn't need a second
 * lookup.
 */
export interface MediaEstimateInput {
  kind: MediaKind;
  tier: CreativeQualityTier;
  /** Required when kind is 'video'. Ignored otherwise. */
  videoDurationSec?: number;
}

export interface MediaEstimate {
  kind: MediaKind;
  creativeQualityTier: CreativeQualityTier;
  creativeStrategy: CreativeStrategy;
  estimatedCredits: number;
  attentionScoreHint: number;
  conversionIntentHint: number;
  brandSafetyRisk: 1 | 2 | 3 | 4;
  humanReviewRequired: boolean;
}

export function estimateMediaCost(input: MediaEstimateInput): MediaEstimate {
  if (!CREATIVE_QUALITY_TIERS.includes(input.tier)) {
    throw new Error(`unknown_creative_quality_tier:${input.tier}`);
  }
  if (input.kind !== 'image' && input.kind !== 'video') {
    throw new Error(`unknown_media_kind:${input.kind}`);
  }
  const strategy = CREATIVE_STRATEGIES[input.tier];

  let estimatedCredits: number;
  if (input.kind === 'image') {
    estimatedCredits = IMAGE_CREDITS_BY_TIER[input.tier];
  } else {
    if (
      typeof input.videoDurationSec !== 'number' ||
      !Number.isFinite(input.videoDurationSec) ||
      input.videoDurationSec <= 0
    ) {
      throw new Error('video_duration_required');
    }
    const seconds = Math.max(1, Math.floor(input.videoDurationSec));
    estimatedCredits = VIDEO_CREDITS_PER_SECOND_BY_TIER[input.tier] * seconds;
  }

  return {
    kind: input.kind,
    creativeQualityTier: input.tier,
    creativeStrategy: strategy,
    estimatedCredits,
    attentionScoreHint: strategy.attentionScoreHint,
    conversionIntentHint: strategy.conversionIntentHint,
    brandSafetyRisk: strategy.brandSafetyRisk,
    // Breakthrough video is a hard gate even if strategy.humanReviewRequired
    // would already be true; the override below is belt-and-suspenders for
    // tests pinning this invariant on the video kind.
    humanReviewRequired:
      strategy.humanReviewRequired ||
      (input.kind === 'video' && input.tier === 'breakthrough'),
  };
}

// -----------------------------------------------------------------------------
// Forbidden-vocabulary guard — for tests + future audits.
// -----------------------------------------------------------------------------

/**
 * Generic technical labels that SocialBoost intentionally does NOT use
 * for the creative quality tier system. The text quality tiers in
 * `ai-cost-model.ts` (economy / standard / premium / expert) are a
 * different surface — kept separate.
 */
export const FORBIDDEN_MEDIA_TIER_LABELS = ['draft', 'standard', 'premium'] as const;
export type ForbiddenMediaTierLabel = (typeof FORBIDDEN_MEDIA_TIER_LABELS)[number];
