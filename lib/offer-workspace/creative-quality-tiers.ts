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

// -----------------------------------------------------------------------------
// AI-017D — Creative score hints + creative rules per tier.
// Discrete, deterministic levels exposed as data for the UI, the
// entitlements layer, and any future media gateway. No analytics call,
// no telemetry — these are advisory product signals.
// -----------------------------------------------------------------------------

export const CREATIVE_SCORE_LEVELS = [
  'low',
  'medium',
  'high',
  'very_high',
  'needs_review',
] as const;
export type CreativeScoreLevel = (typeof CREATIVE_SCORE_LEVELS)[number];

export interface CreativeScoreHints {
  attention: CreativeScoreLevel;
  clarity: CreativeScoreLevel;
  credibility: CreativeScoreLevel;
  conversionIntent: CreativeScoreLevel;
  distinctiveness: CreativeScoreLevel;
  brandSafety: CreativeScoreLevel;
}

export const CREATIVE_SCORE_HINTS_BY_TIER: Record<
  CreativeQualityTier,
  CreativeScoreHints
> = {
  safe: {
    attention: 'medium',
    clarity: 'high',
    credibility: 'medium',
    conversionIntent: 'medium',
    distinctiveness: 'low',
    brandSafety: 'high',
  },
  social_proof: {
    attention: 'medium',
    clarity: 'high',
    credibility: 'high',
    conversionIntent: 'medium',
    distinctiveness: 'medium',
    brandSafety: 'high',
  },
  performance: {
    attention: 'high',
    clarity: 'high',
    credibility: 'medium',
    conversionIntent: 'high',
    distinctiveness: 'medium',
    brandSafety: 'medium',
  },
  breakthrough: {
    attention: 'very_high',
    clarity: 'medium',
    credibility: 'medium',
    conversionIntent: 'high',
    distinctiveness: 'very_high',
    brandSafety: 'needs_review',
  },
};

/**
 * Strategy rule library. Each rule is a stable, lower-cased,
 * kebab-cased identifier. The set per tier matches the AI-017D spec
 * exactly and is pinned by tests.
 */
export const CREATIVE_RULES_BY_TIER: Record<CreativeQualityTier, readonly string[]> = {
  safe: [
    'single-message',
    'benefit-led',
    'no-aggressive-claim',
    'brand-safe-visual',
  ],
  social_proof: [
    'human-first',
    'product-in-use',
    'proof-without-fabrication',
    'no-fake-testimonial',
    'ugc-compatible',
  ],
  performance: [
    'hook-first-2s',
    'objection-handling',
    'explicit-cta',
    'mobile-first',
    'product-visible-early',
  ],
  breakthrough: [
    'pattern-interrupt',
    'emotional-contrast',
    'unusual-angle',
    'memorable-visual',
    'human-review-required',
    'never-automatic-video',
  ],
};

// -----------------------------------------------------------------------------
// AI-017D — Creative Quality Ladder. Doc-grade descriptors per tier.
// Surfaced as data so docs/UI/tests share one source of truth.
// -----------------------------------------------------------------------------

export interface CreativeLadderEntry {
  tier: CreativeQualityTier;
  /** What the tier is for, in one sentence. */
  objective: string;
  /** Concrete situations where this tier is the right pick. */
  whenToUse: string;
  /** The creative structure / template the brief should follow. */
  creativeStructure: readonly string[];
  /** Performance signals expected when the tier lands. */
  performanceSignals: readonly string[];
  /** Risks specific to this tier. */
  risks: readonly string[];
  /** Hard guardrails the tier must respect. */
  guardrails: readonly string[];
  /**
   * Very short directional prompt example. Non-generative — meant as a
   * compass, not a copy-paste. The Creative Brief Engine remains the
   * source of full-fledged prompts.
   */
  directionalPromptExample: string;
}

export const CREATIVE_LADDER: Record<CreativeQualityTier, CreativeLadderEntry> = {
  safe: {
    tier: 'safe',
    objective:
      "Communiquer un bénéfice clair sans risque de marque, pour audiences nouvelles ou marchés réglementés.",
    whenToUse:
      "Lancement, audience peu informée, marque prudente, vertical réglementé (santé, finance, éducation).",
    creativeStructure: [
      'un seul message principal',
      'visuel reconnaissable, palette cohérente',
      'CTA simple, descriptif',
      'preuve courte ou source citée si chiffre',
    ],
    performanceSignals: [
      'CTR stable',
      'taux de complétion vidéo correct',
      'baisse du coût d\'apprentissage de campagne',
    ],
    risks: [
      'sous-performance vs créatifs plus distinctifs',
      'banalisation visuelle si répétée trop longtemps',
    ],
    guardrails: [
      'no-aggressive-claim',
      'brand-safe-visual',
      'no guaranteed-results promise',
      'no medical/financial absolute claim',
    ],
    directionalPromptExample:
      "Image plan moyen, lumière douce, sujet humain au travail, texte court, palette neutre.",
  },
  social_proof: {
    tier: 'social_proof',
    objective:
      "Activer le déclencheur 'des gens comme moi l'utilisent' avec témoignage authentique ou usage réel.",
    whenToUse:
      "Audience sceptique, bouche-à-oreille fort, communauté active, créateurs / UGC à disposition.",
    creativeStructure: [
      'humain au centre, regard direct',
      'contexte d\'usage réel',
      'citation courte ou voix off authentique',
      'CTA secondaire simple',
    ],
    performanceSignals: [
      'lift en credibility surveyed',
      'augmentation du taux de partage / save',
      'CPL plus stable sur audiences froides',
    ],
    risks: [
      'effet inverse si la preuve semble fabriquée',
      'risque légal sur consentement non documenté',
    ],
    guardrails: [
      'no-fake-testimonial',
      'proof-without-fabrication',
      'consentement écrit pour tout visage humain',
      "avant/après uniquement si mesurable et non trompeur",
    ],
    directionalPromptExample:
      "Plan moyen, client réel, regard caméra, légende courte 'Pourquoi je l'utilise'.",
  },
  performance: {
    tier: 'performance',
    objective:
      "Maximiser conversion sur trafic payant : hook fort, bénéfice immédiat, CTA explicite.",
    whenToUse:
      "Acquisition payante, retargeting, bottom-funnel, A/B testing de hooks et CTAs.",
    creativeStructure: [
      'hook visuel ou textuel dans les 2 premières secondes',
      'bénéfice principal énoncé immédiatement',
      'une objection majeure adressée',
      'CTA verbe + objet + délai concret',
      'cadrage mobile-first 9:16 ou 4:5',
    ],
    performanceSignals: [
      'CTR au-dessus de la baseline',
      'CVR amélioré sur le hook A/B gagnant',
      'CPM stable, ROAS au-dessus de la baseline',
    ],
    risks: [
      "fatigue créative rapide si format unique",
      "sur-promesse si CTA non aligné avec page d'arrivée",
    ],
    guardrails: [
      'hook-first-2s',
      'objection-handling',
      'explicit-cta',
      'mobile-first',
      'product-visible-early',
    ],
    directionalPromptExample:
      "9:16, hook visuel 0-2s, bénéfice 2-5s, CTA dernier seconde, contraste élevé, texte court.",
  },
  breakthrough: {
    tier: 'breakthrough',
    objective:
      "Stopper le scroll par un pattern interrupt, créer mémorisation distinctive vs concurrents.",
    whenToUse:
      "Brand campaigns, launch hero, repositionnement, distinctiveness work — toujours avec review humaine.",
    creativeStructure: [
      'pattern interrupt visuel ou narratif',
      'angle inattendu',
      'émotion forte mais sous guardrails',
      'contraste visuel marqué',
      'récit mémorable',
    ],
    performanceSignals: [
      'recall non-aidé en hausse',
      'partages organiques au-dessus de la moyenne',
      'mention spontanée en commentaires',
    ],
    risks: [
      'brand safety risk plus élevé',
      'dérive émotionnelle ou claim ambigu',
      "fatigue d'audience si non suivi par exécution propre",
    ],
    guardrails: [
      'human-review-required',
      'never-automatic-video',
      'no medical/financial absolute claim',
      'no deceptive before/after',
      'no celebrity likeness, no copyrighted character',
    ],
    directionalPromptExample:
      "Plan inattendu, contraste fort, métaphore visuelle, légende courte qui inverse l'attente.",
  },
};

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
  /** AI-017D: discrete level hints. Source of truth lives in
   *  `CREATIVE_SCORE_HINTS_BY_TIER` and is mirrored here for callers
   *  that already hold a `CreativeStrategy`. */
  scoreHints: CreativeScoreHints;
  /** AI-017D: kebab-cased strategy rules. Source of truth lives in
   *  `CREATIVE_RULES_BY_TIER`. */
  rules: readonly string[];
  /** AI-017D: full ladder entry (objective, whenToUse, structure,
   *  signals, risks, guardrails, directional prompt example). */
  ladder: CreativeLadderEntry;
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
    scoreHints: CREATIVE_SCORE_HINTS_BY_TIER.safe,
    rules: CREATIVE_RULES_BY_TIER.safe,
    ladder: CREATIVE_LADDER.safe,
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
    scoreHints: CREATIVE_SCORE_HINTS_BY_TIER.social_proof,
    rules: CREATIVE_RULES_BY_TIER.social_proof,
    ladder: CREATIVE_LADDER.social_proof,
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
    scoreHints: CREATIVE_SCORE_HINTS_BY_TIER.performance,
    rules: CREATIVE_RULES_BY_TIER.performance,
    ladder: CREATIVE_LADDER.performance,
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
    scoreHints: CREATIVE_SCORE_HINTS_BY_TIER.breakthrough,
    rules: CREATIVE_RULES_BY_TIER.breakthrough,
    ladder: CREATIVE_LADDER.breakthrough,
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
  /** AI-017D: discrete level hints across the six axes. */
  scoreHints: CreativeScoreHints;
  /** AI-017D: kebab-cased strategy rules. */
  rules: readonly string[];
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
    scoreHints: strategy.scoreHints,
    rules: strategy.rules,
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
