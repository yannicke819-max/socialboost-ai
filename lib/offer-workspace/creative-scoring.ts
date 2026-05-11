/**
 * Creative Scoring v1 — pure module (AI-017G).
 *
 * Produces a deterministic six-axis scorecard for each creative
 * concept (image / video / storyboard) so the user can compare
 * concepts before any provider call. **Not** a performance
 * prediction — pure local heuristics over creative signals
 * (tier, guardrails, hook, overlay, platform context). Same input →
 * byte-identical scorecard. The pack carries `isPrediction: false`
 * and the spec-pinned microcopy lives in `creative-studio-labels`.
 *
 * Hard rules:
 *   - No `fetch`, no `process.env`, no `Date.now()`, no `Math.random()`.
 *   - No machine-learning call. No provider call.
 *   - Free hard rule unaffected: this module does not consume credits.
 *   - Cross-platform: rationales and watchouts adapt to the platform
 *     context (Meta Feed / Reels / TikTok / LinkedIn Feed / Shorts /
 *     Generic Social). No TikTok-only language in `generic_social`.
 */

import {
  CREATIVE_QUALITY_TIERS,
  type CreativeQualityTier,
} from './creative-quality-tiers';
import type { CreativePlatformFormat } from './creative-brief-engine';

// -----------------------------------------------------------------------------
// Public types
// -----------------------------------------------------------------------------

// Note: we deliberately use `conversion` (not `conversionIntent`) on the
// scoring axis surface to match the AI-017G product spec. The AI-017D
// `CreativeScoreHints` surface uses `conversionIntent` and stays unchanged
// for the existing UI / docs.
export const CREATIVE_SCORE_AXES = [
  'attention',
  'clarity',
  'credibility',
  'conversion',
  'distinctiveness',
  'brandSafety',
] as const;
export type CreativeScoreAxis = (typeof CREATIVE_SCORE_AXES)[number];

export const CREATIVE_SCORECARD_LEVELS = [
  'low',
  'medium',
  'high',
  'very_high',
  'needs_review',
] as const;
export type CreativeScorecardLevel = (typeof CREATIVE_SCORECARD_LEVELS)[number];

export const CREATIVE_PLATFORM_CONTEXTS = [
  'meta_feed',
  'instagram_reels',
  'tiktok',
  'linkedin_feed',
  'youtube_shorts',
  'generic_social',
] as const;
export type CreativePlatformContext = (typeof CREATIVE_PLATFORM_CONTEXTS)[number];

export const CREATIVE_OVERALL_LABELS = [
  'safe_to_test',
  'strong_candidate',
  'needs_refinement',
  'review_required',
] as const;
export type CreativeOverallLabel = (typeof CREATIVE_OVERALL_LABELS)[number];

export interface CreativeScore {
  axis: CreativeScoreAxis;
  level: CreativeScorecardLevel;
  /** Localised label, e.g. "Attention" / "Clarté" / "Crédibilité"… */
  label: string;
  rationale: string;
  positiveSignals: readonly string[];
  watchouts: readonly string[];
}

export interface CreativeScorecard {
  overallLabel: CreativeOverallLabel;
  scores: CreativeScore[];
  topStrength: CreativeScoreAxis;
  mainWatchout: CreativeScoreAxis;
  explanation: string;
  platformContext: CreativePlatformContext;
  isPrediction: false;
}

export type ScoredConceptKind = 'image' | 'video' | 'storyboard';

export interface BuildCreativeScorecardInput {
  kind: ScoredConceptKind;
  creativeQualityTier: CreativeQualityTier;
  title?: string;
  prompt: string;
  hook?: string;
  textOverlay?: string;
  avoid?: readonly string[];
  guardrails?: readonly string[];
  platformFormat?: CreativePlatformFormat;
  /** Overrides the platformFormat mapping when provided. */
  platformContext?: CreativePlatformContext;
  /** Defaults to 'fr'. */
  language?: 'fr' | 'en';
}

// -----------------------------------------------------------------------------
// Platform mapping
// -----------------------------------------------------------------------------

export function platformFormatToContext(
  fmt: CreativePlatformFormat | undefined,
): CreativePlatformContext {
  switch (fmt) {
    case 'tiktok_reel':
      return 'tiktok';
    case 'story_vertical':
      return 'instagram_reels';
    case 'instagram_square':
    case 'instagram_portrait':
      return 'meta_feed';
    case 'linkedin_feed':
      return 'linkedin_feed';
    default:
      return 'generic_social';
  }
}

// -----------------------------------------------------------------------------
// Level helpers — ordered ladder, `needs_review` lives outside.
// -----------------------------------------------------------------------------

const LADDER: ReadonlyArray<CreativeScorecardLevel> = ['low', 'medium', 'high', 'very_high'];

function bump(level: CreativeScorecardLevel, n: number): CreativeScorecardLevel {
  if (level === 'needs_review') return 'needs_review';
  const i = LADDER.indexOf(level);
  if (i < 0) return level;
  const next = Math.max(0, Math.min(LADDER.length - 1, i + n));
  return LADDER[next]!;
}

function levelToOrdinal(level: CreativeScorecardLevel): number {
  if (level === 'needs_review') return -1;
  return LADDER.indexOf(level);
}

// -----------------------------------------------------------------------------
// Per-tier baseline per axis
// -----------------------------------------------------------------------------

type AxisRecord = Record<CreativeScoreAxis, CreativeScorecardLevel>;

const BASELINE: Record<CreativeQualityTier, AxisRecord> = {
  safe: {
    attention: 'medium',
    clarity: 'very_high',
    credibility: 'medium',
    conversion: 'medium',
    distinctiveness: 'low',
    brandSafety: 'very_high',
  },
  social_proof: {
    attention: 'medium',
    clarity: 'high',
    credibility: 'very_high',
    conversion: 'medium',
    distinctiveness: 'medium',
    brandSafety: 'high',
  },
  performance: {
    attention: 'high',
    clarity: 'high',
    credibility: 'medium',
    conversion: 'very_high',
    distinctiveness: 'medium',
    brandSafety: 'high',
  },
  breakthrough: {
    attention: 'very_high',
    clarity: 'medium',
    credibility: 'medium',
    conversion: 'high',
    distinctiveness: 'very_high',
    brandSafety: 'needs_review',
  },
};

// -----------------------------------------------------------------------------
// Signal scan — substring search over a normalised blob of the concept.
// -----------------------------------------------------------------------------

interface ConceptBlob {
  full: string;
  guardrails: readonly string[];
}

function buildBlob(input: BuildCreativeScorecardInput): ConceptBlob {
  const parts: string[] = [
    input.title ?? '',
    input.prompt,
    input.hook ?? '',
    input.textOverlay ?? '',
    (input.avoid ?? []).join(' '),
    (input.guardrails ?? []).join(' '),
  ];
  return {
    full: parts.join(' ').toLowerCase(),
    guardrails: input.guardrails ?? [],
  };
}

function hasSignal(blob: ConceptBlob, needle: string): boolean {
  return blob.full.includes(needle);
}

// -----------------------------------------------------------------------------
// Platform-aware labels (FR primary). EN added defensively for parity.
// -----------------------------------------------------------------------------

const AXIS_LABEL_FR: Record<CreativeScoreAxis, string> = {
  attention: 'Attention',
  clarity: 'Clarté',
  credibility: 'Crédibilité',
  conversion: 'Conversion',
  distinctiveness: 'Distinctivité',
  brandSafety: 'Brand safety',
};

const AXIS_LABEL_EN: Record<CreativeScoreAxis, string> = {
  attention: 'Attention',
  clarity: 'Clarity',
  credibility: 'Credibility',
  conversion: 'Conversion',
  distinctiveness: 'Distinctiveness',
  brandSafety: 'Brand safety',
};

const LEVEL_LABEL_FR: Record<CreativeScorecardLevel, string> = {
  low: 'Faible',
  medium: 'Moyen',
  high: 'Fort',
  very_high: 'Très fort',
  needs_review: 'À valider',
};

const LEVEL_LABEL_EN: Record<CreativeScorecardLevel, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'Strong',
  very_high: 'Very strong',
  needs_review: 'Needs review',
};

export const PLATFORM_CONTEXT_LABEL_FR: Record<CreativePlatformContext, string> = {
  meta_feed: 'Meta Feed',
  instagram_reels: 'Instagram Reels',
  tiktok: 'TikTok',
  linkedin_feed: 'LinkedIn Feed',
  youtube_shorts: 'YouTube Shorts',
  generic_social: 'Social (générique)',
};

export const PLATFORM_CONTEXT_LABEL_EN: Record<CreativePlatformContext, string> = {
  meta_feed: 'Meta Feed',
  instagram_reels: 'Instagram Reels',
  tiktok: 'TikTok',
  linkedin_feed: 'LinkedIn Feed',
  youtube_shorts: 'YouTube Shorts',
  generic_social: 'Social (generic)',
};

// -----------------------------------------------------------------------------
// Platform rationale snippets — FR. Used to enrich rationales / watchouts.
// -----------------------------------------------------------------------------

interface PlatformSnippet {
  attentionPositive: string;
  attentionWatchout: string;
  clarityPositive: string;
  clarityWatchout: string;
  credibilityPositive: string;
  credibilityWatchout: string;
  conversionPositive: string;
  conversionWatchout: string;
  distinctivenessPositive: string;
  distinctivenessWatchout: string;
  brandSafetyPositive: string;
  brandSafetyWatchout: string;
}

const PLATFORM_SNIPPETS_FR: Record<CreativePlatformContext, PlatformSnippet> = {
  meta_feed: {
    attentionPositive: 'Lecture mobile-first prise en compte.',
    attentionWatchout: 'À surveiller sur Meta : le message principal doit rester lisible en mobile.',
    clarityPositive: 'Single focal point compatible avec le scroll Meta.',
    clarityWatchout: 'Single focal point à confirmer pour le format Meta.',
    credibilityPositive: 'Preuve courte alignée avec la lecture rapide Meta.',
    credibilityWatchout: 'Preuve à condenser pour la lecture rapide Meta.',
    conversionPositive: 'CTA visible tôt, compatible avec le format Meta.',
    conversionWatchout: 'CTA à rendre visible tôt sur Meta.',
    distinctivenessPositive: "Distinctivité maîtrisée pour rester brand-safe sur Meta.",
    distinctivenessWatchout: 'Différencier sans casser le brand-safe Meta.',
    brandSafetyPositive: 'Brand safety solide pour Meta.',
    brandSafetyWatchout: 'À revoir avant diffusion Meta paid.',
  },
  instagram_reels: {
    attentionPositive: 'Hook visuel rapide compatible Reels.',
    attentionWatchout: 'Hook à rendre encore plus rapide pour Reels.',
    clarityPositive: 'Overlay lisible et court pour Reels.',
    clarityWatchout: 'Overlay à raccourcir pour la lecture verticale Reels.',
    credibilityPositive: 'Style natif crédible sur Reels.',
    credibilityWatchout: 'Ton à ré-aligner sur le style natif Reels.',
    conversionPositive: 'CTA simple compatible Reels.',
    conversionWatchout: 'CTA à simplifier pour le rythme Reels.',
    distinctivenessPositive: 'Distinctivité visible en vertical-first.',
    distinctivenessWatchout: "Distinctivité à amplifier sur le vertical Reels.",
    brandSafetyPositive: 'Brand safety adaptée au feed Reels.',
    brandSafetyWatchout: 'À revalider avant boost Reels.',
  },
  tiktok: {
    attentionPositive: 'Hook immédiat compatible avec le scroll TikTok.',
    attentionWatchout: 'Hook à rendre immédiat pour TikTok.',
    clarityPositive: 'Authenticité + clarté compatibles TikTok.',
    clarityWatchout: 'Trop publicitaire pour TikTok — assouplir.',
    credibilityPositive: 'Proof-in-use et style créateur crédibles TikTok.',
    credibilityWatchout: 'Manque de proof-in-use pour TikTok.',
    conversionPositive: 'Structure hook/body/close compatible TikTok.',
    conversionWatchout: 'Manque de close direct pour TikTok.',
    distinctivenessPositive: 'Distinctivité native compatible avec le ton TikTok.',
    distinctivenessWatchout: 'Distinctivité à pousser pour sortir du scroll TikTok.',
    brandSafetyPositive: 'Brand safety compatible TikTok.',
    brandSafetyWatchout: 'À revalider avant publication TikTok.',
  },
  linkedin_feed: {
    attentionPositive: 'Ouverture claire compatible LinkedIn.',
    attentionWatchout: 'Hook à formaliser pour LinkedIn.',
    clarityPositive: 'Clarté professionnelle adaptée à LinkedIn.',
    clarityWatchout: 'Trop de jargon pour LinkedIn.',
    credibilityPositive: 'Fort pour LinkedIn : bénéfice clair et audience professionnelle explicite.',
    credibilityWatchout: 'Preuve à renforcer pour LinkedIn.',
    conversionPositive: 'CTA business clair compatible LinkedIn.',
    conversionWatchout: 'CTA à rendre business-explicite pour LinkedIn.',
    distinctivenessPositive: 'Distinctivité mesurée pour LinkedIn.',
    distinctivenessWatchout: 'Eviter le sensationnalisme sur LinkedIn.',
    brandSafetyPositive: 'Brand safety élevée pour LinkedIn.',
    brandSafetyWatchout: 'À revalider avant publication LinkedIn.',
  },
  youtube_shorts: {
    attentionPositive: 'Hook rapide compatible YouTube Shorts.',
    attentionWatchout: 'Eviter une intro lente pour YouTube Shorts.',
    clarityPositive: 'Histoire courte et claire pour Shorts.',
    clarityWatchout: "Récit à condenser pour Shorts.",
    credibilityPositive: 'Démonstration crédible compatible Shorts.',
    credibilityWatchout: 'Démonstration à étoffer pour Shorts.',
    conversionPositive: 'CTA clair compatible Shorts.',
    conversionWatchout: "Manque de CTA explicite pour Shorts.",
    distinctivenessPositive: 'Brand recall favorisé sur Shorts.',
    distinctivenessWatchout: 'Brand recall à renforcer pour Shorts.',
    brandSafetyPositive: 'Brand safety conforme Shorts.',
    brandSafetyWatchout: 'À revalider avant publication Shorts.',
  },
  generic_social: {
    attentionPositive: 'Attention de base solide en social générique.',
    attentionWatchout: "Hook à clarifier pour un usage social générique.",
    clarityPositive: 'Bénéfice clair en lecture rapide.',
    clarityWatchout: 'Message principal à clarifier.',
    credibilityPositive: 'Preuve présente en social générique.',
    credibilityWatchout: 'Preuve à confirmer en social générique.',
    conversionPositive: 'CTA compréhensible en social générique.',
    conversionWatchout: 'CTA à formuler explicitement.',
    distinctivenessPositive: 'Lisible et différenciable en social générique.',
    distinctivenessWatchout: 'Différenciation à renforcer en social générique.',
    brandSafetyPositive: 'Brand safety standard en social générique.',
    brandSafetyWatchout: 'À revalider avant publication.',
  },
};

// -----------------------------------------------------------------------------
// Build scorecard
// -----------------------------------------------------------------------------

export function buildCreativeScorecard(
  input: BuildCreativeScorecardInput,
): CreativeScorecard {
  if (!input || !input.prompt) {
    throw new Error('creative_scorecard_missing_prompt');
  }
  const tier = input.creativeQualityTier;
  if (!CREATIVE_QUALITY_TIERS.includes(tier)) {
    throw new Error(`unknown_creative_quality_tier:${tier}`);
  }
  const blob = buildBlob(input);
  const platformContext: CreativePlatformContext =
    input.platformContext ?? platformFormatToContext(input.platformFormat);
  const lang = input.language ?? 'fr';
  const axisLabels = lang === 'en' ? AXIS_LABEL_EN : AXIS_LABEL_FR;
  const levelLabels = lang === 'en' ? LEVEL_LABEL_EN : LEVEL_LABEL_FR;
  const snippet = PLATFORM_SNIPPETS_FR[platformContext];

  // attention
  const attention = scoreAttention(tier, blob, platformContext, snippet, axisLabels.attention, levelLabels);
  const clarity = scoreClarity(tier, blob, platformContext, snippet, axisLabels.clarity, levelLabels);
  const credibility = scoreCredibility(tier, blob, platformContext, snippet, axisLabels.credibility, levelLabels);
  const conversion = scoreConversion(tier, blob, platformContext, snippet, axisLabels.conversion, levelLabels);
  const distinctiveness = scoreDistinctiveness(tier, blob, platformContext, snippet, axisLabels.distinctiveness, levelLabels);
  const brandSafety = scoreBrandSafety(tier, blob, platformContext, snippet, axisLabels.brandSafety, levelLabels);

  const scores: CreativeScore[] = [
    attention,
    clarity,
    credibility,
    conversion,
    distinctiveness,
    brandSafety,
  ];

  // Pick topStrength / mainWatchout
  let topStrength: CreativeScoreAxis = scores[0]!.axis;
  let topOrd = levelToOrdinal(scores[0]!.level);
  let mainWatchout: CreativeScoreAxis = scores[0]!.axis;
  let mainOrd = levelToOrdinal(scores[0]!.level);
  for (const s of scores) {
    const ord = levelToOrdinal(s.level);
    if (s.level === 'needs_review') {
      mainWatchout = s.axis;
      mainOrd = -1;
      continue;
    }
    if (ord > topOrd) {
      topStrength = s.axis;
      topOrd = ord;
    }
    if (ord < mainOrd && mainOrd !== -1) {
      mainWatchout = s.axis;
      mainOrd = ord;
    }
  }

  // Overall label
  let overallLabel: CreativeOverallLabel;
  if (brandSafety.level === 'needs_review') {
    overallLabel = 'review_required';
  } else {
    const hasVeryHigh = scores.some(
      (s) => s.level === 'very_high' && s.axis !== 'brandSafety',
    );
    const allAtLeastMedium = scores.every(
      (s) => s.level !== 'low' && s.level !== 'needs_review',
    );
    if (hasVeryHigh && allAtLeastMedium) {
      overallLabel = 'strong_candidate';
    } else if (allAtLeastMedium) {
      overallLabel = 'safe_to_test';
    } else {
      overallLabel = 'needs_refinement';
    }
  }

  const explanation =
    lang === 'en'
      ? 'Scores are indicative — based on creative signals from the concept, no AI model call.'
      : "Scores indicatifs, basés sur les signaux créatifs du concept, sans appel à un modèle IA.";

  return {
    overallLabel,
    scores,
    topStrength,
    mainWatchout,
    explanation,
    platformContext,
    isPrediction: false,
  };
}

// -----------------------------------------------------------------------------
// Per-axis scoring helpers
// -----------------------------------------------------------------------------

function scoreAttention(
  tier: CreativeQualityTier,
  blob: ConceptBlob,
  platform: CreativePlatformContext,
  snippet: PlatformSnippet,
  axisLabel: string,
  levelLabels: Record<CreativeScorecardLevel, string>,
): CreativeScore {
  let level: CreativeScorecardLevel = BASELINE[tier].attention;
  const positives: string[] = [];
  const watchouts: string[] = [];
  if (hasSignal(blob, 'hook-first-2s') || hasSignal(blob, 'hook (0-')) {
    level = bump(level, 1);
    positives.push('hook-first-2s');
  }
  if (hasSignal(blob, 'pattern-interrupt')) {
    level = bump(level, 1);
    positives.push('pattern-interrupt');
  }
  if (platform === 'tiktok' || platform === 'youtube_shorts') {
    if (hasSignal(blob, 'hook')) {
      level = bump(level, 1);
      positives.push(snippet.attentionPositive);
    } else {
      watchouts.push(snippet.attentionWatchout);
    }
  } else if (platform === 'meta_feed' || platform === 'linkedin_feed') {
    if (hasSignal(blob, 'mobile-first') || hasSignal(blob, 'single focal')) {
      positives.push(snippet.attentionPositive);
    } else {
      watchouts.push(snippet.attentionWatchout);
    }
  } else if (platform === 'instagram_reels') {
    if (hasSignal(blob, 'hook')) positives.push(snippet.attentionPositive);
    else watchouts.push(snippet.attentionWatchout);
  } else {
    positives.push(snippet.attentionPositive);
  }
  return makeScore('attention', level, axisLabel, levelLabels, positives, watchouts);
}

function scoreClarity(
  tier: CreativeQualityTier,
  blob: ConceptBlob,
  platform: CreativePlatformContext,
  snippet: PlatformSnippet,
  axisLabel: string,
  levelLabels: Record<CreativeScorecardLevel, string>,
): CreativeScore {
  let level: CreativeScorecardLevel = BASELINE[tier].clarity;
  const positives: string[] = [];
  const watchouts: string[] = [];
  if (hasSignal(blob, 'single-message')) {
    level = bump(level, 1);
    positives.push('single-message');
  }
  if (hasSignal(blob, 'benefit-led')) {
    level = bump(level, 1);
    positives.push('benefit-led');
  }
  if (hasSignal(blob, 'explicit-cta')) {
    positives.push('explicit-cta');
  }
  if (platform === 'linkedin_feed') {
    level = bump(level, 1);
    positives.push(snippet.clarityPositive);
  } else if (platform === 'instagram_reels' || platform === 'youtube_shorts') {
    positives.push(snippet.clarityPositive);
  } else if (platform === 'meta_feed') {
    if (hasSignal(blob, 'single focal') || hasSignal(blob, 'single-message')) {
      positives.push(snippet.clarityPositive);
    } else {
      watchouts.push(snippet.clarityWatchout);
    }
  } else if (platform === 'tiktok') {
    if (hasSignal(blob, 'authentic') || hasSignal(blob, 'creator')) {
      positives.push(snippet.clarityPositive);
    } else {
      watchouts.push(snippet.clarityWatchout);
    }
  } else {
    positives.push(snippet.clarityPositive);
  }
  return makeScore('clarity', level, axisLabel, levelLabels, positives, watchouts);
}

function scoreCredibility(
  tier: CreativeQualityTier,
  blob: ConceptBlob,
  platform: CreativePlatformContext,
  snippet: PlatformSnippet,
  axisLabel: string,
  levelLabels: Record<CreativeScorecardLevel, string>,
): CreativeScore {
  let level: CreativeScorecardLevel = BASELINE[tier].credibility;
  const positives: string[] = [];
  const watchouts: string[] = [];
  if (hasSignal(blob, 'no-fake-testimonial')) {
    level = bump(level, 1);
    positives.push('no-fake-testimonial');
  }
  if (hasSignal(blob, 'proof-without-fabrication')) {
    level = bump(level, 1);
    positives.push('proof-without-fabrication');
  }
  if (hasSignal(blob, 'product-in-use') || hasSignal(blob, 'human-first')) {
    positives.push('product-in-use');
  }
  if (platform === 'linkedin_feed') {
    level = bump(level, 1);
    positives.push(snippet.credibilityPositive);
  } else if (platform === 'tiktok') {
    if (hasSignal(blob, 'creator') || hasSignal(blob, 'usage')) {
      positives.push(snippet.credibilityPositive);
    } else {
      watchouts.push(snippet.credibilityWatchout);
    }
  } else {
    positives.push(snippet.credibilityPositive);
  }
  return makeScore('credibility', level, axisLabel, levelLabels, positives, watchouts);
}

function scoreConversion(
  tier: CreativeQualityTier,
  blob: ConceptBlob,
  platform: CreativePlatformContext,
  snippet: PlatformSnippet,
  axisLabel: string,
  levelLabels: Record<CreativeScorecardLevel, string>,
): CreativeScore {
  let level: CreativeScorecardLevel = BASELINE[tier].conversion;
  const positives: string[] = [];
  const watchouts: string[] = [];
  if (hasSignal(blob, 'explicit-cta')) {
    level = bump(level, 1);
    positives.push('explicit-cta');
  }
  if (hasSignal(blob, 'objection-handling')) {
    level = bump(level, 1);
    positives.push('objection-handling');
  }
  if (hasSignal(blob, 'mobile-first')) {
    positives.push('mobile-first');
  }
  if (platform === 'linkedin_feed' || platform === 'youtube_shorts' || platform === 'tiktok') {
    if (hasSignal(blob, 'cta') || hasSignal(blob, 'explicit-cta')) {
      positives.push(snippet.conversionPositive);
    } else {
      watchouts.push(snippet.conversionWatchout);
    }
  } else if (platform === 'meta_feed' || platform === 'instagram_reels') {
    if (hasSignal(blob, 'cta')) positives.push(snippet.conversionPositive);
    else watchouts.push(snippet.conversionWatchout);
  } else {
    if (hasSignal(blob, 'cta')) positives.push(snippet.conversionPositive);
    else watchouts.push(snippet.conversionWatchout);
  }
  return makeScore('conversion', level, axisLabel, levelLabels, positives, watchouts);
}

function scoreDistinctiveness(
  tier: CreativeQualityTier,
  blob: ConceptBlob,
  platform: CreativePlatformContext,
  snippet: PlatformSnippet,
  axisLabel: string,
  levelLabels: Record<CreativeScorecardLevel, string>,
): CreativeScore {
  let level: CreativeScorecardLevel = BASELINE[tier].distinctiveness;
  const positives: string[] = [];
  const watchouts: string[] = [];
  if (hasSignal(blob, 'pattern-interrupt')) {
    level = bump(level, 1);
    positives.push('pattern-interrupt');
  }
  if (hasSignal(blob, 'unusual-angle')) {
    level = bump(level, 1);
    positives.push('unusual-angle');
  }
  if (hasSignal(blob, 'memorable-visual')) {
    positives.push('memorable-visual');
  }
  if (platform === 'linkedin_feed') {
    if (hasSignal(blob, 'sensational')) watchouts.push(snippet.distinctivenessWatchout);
    else positives.push(snippet.distinctivenessPositive);
  } else {
    positives.push(snippet.distinctivenessPositive);
  }
  return makeScore(
    'distinctiveness',
    level,
    axisLabel,
    levelLabels,
    positives,
    watchouts,
  );
}

function scoreBrandSafety(
  tier: CreativeQualityTier,
  blob: ConceptBlob,
  platform: CreativePlatformContext,
  snippet: PlatformSnippet,
  axisLabel: string,
  levelLabels: Record<CreativeScorecardLevel, string>,
): CreativeScore {
  let level: CreativeScorecardLevel = BASELINE[tier].brandSafety;
  const positives: string[] = [];
  const watchouts: string[] = [];
  if (hasSignal(blob, 'no-aggressive-claim')) {
    if (level !== 'needs_review') level = bump(level, 1);
    positives.push('no-aggressive-claim');
  }
  if (hasSignal(blob, 'brand-safe-visual')) {
    positives.push('brand-safe-visual');
  }
  if (hasSignal(blob, 'human-review-required') || hasSignal(blob, 'never-automatic-video')) {
    level = 'needs_review';
    watchouts.push('human-review-required');
  }
  if (tier === 'breakthrough') {
    level = 'needs_review';
    watchouts.push(snippet.brandSafetyWatchout);
  } else {
    positives.push(snippet.brandSafetyPositive);
  }
  return makeScore('brandSafety', level, axisLabel, levelLabels, positives, watchouts);
}

function makeScore(
  axis: CreativeScoreAxis,
  level: CreativeScorecardLevel,
  axisLabel: string,
  levelLabels: Record<CreativeScorecardLevel, string>,
  positives: string[],
  watchouts: string[],
): CreativeScore {
  const rationale =
    `${axisLabel}: ${levelLabels[level]}.` +
    (positives.length > 0 ? ` Positifs : ${positives.join(', ')}.` : '') +
    (watchouts.length > 0 ? ` À surveiller : ${watchouts.join(', ')}.` : '');
  return {
    axis,
    level,
    label: axisLabel,
    rationale,
    positiveSignals: positives,
    watchouts,
  };
}
