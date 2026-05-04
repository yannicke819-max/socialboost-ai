/**
 * Offer Brain — Zod schemas (strict).
 *
 * The agent's input/output contracts. NEVER bypass these.
 * - .strict() rejects unknown fields → agent versioning is explicit.
 * - .safeParse used at the route boundary; .parse used internally after retries.
 * - All scores constrained 0-100. Caps enforced via refine() at output level.
 */

import { z } from 'zod';

// -----------------------------------------------------------------------------
// Common enums
// -----------------------------------------------------------------------------

export const PlatformEnum = z.enum(['linkedin', 'instagram', 'x', 'tiktok', 'facebook']);
export const LocaleEnum = z.enum(['fr', 'en', 'es', 'it', 'de']);
export const GoalEnum = z.enum(['sales', 'leads', 'authority', 'audience']);
export const FunnelStageEnum = z.enum(['awareness', 'consideration', 'decision']);
export const AwarenessStageEnum = z.enum([
  'unaware',
  'problem-aware',
  'solution-aware',
  'product-aware',
  'most-aware',
]);
export const SophisticationEnum = z.enum(['low', 'medium', 'high', 'very-high']);
export const OfferMaturityEnum = z.enum(['concept', 'beta', 'launched', 'mature', 'sunsetting']);
export const ProofQualityEnum = z.enum(['strong', 'partial', 'weak', 'missing']);
export const CTAStrengthEnum = z.enum(['strong', 'medium', 'weak', 'absent']);
export const LegalSensitivityEnum = z.enum(['none', 'low', 'medium', 'high']);
export const ImprovementPriorityEnum = z.enum(['low', 'medium', 'high', 'critical']);

const Score0to100 = z.number().int().min(0).max(100);

// -----------------------------------------------------------------------------
// Input schema
// -----------------------------------------------------------------------------

export const OfferBrainInputSchema = z
  .object({
    // Required
    raw_offer_text: z.string().min(1).max(20000),

    // Optional core
    locale: LocaleEnum.optional(),
    user_goal: GoalEnum.optional(),
    known_url: z.string().url().optional(),
    target_platforms: z.array(PlatformEnum).max(5).optional(),
    constraints: z.array(z.string().max(500)).max(20).optional(),

    // Optional business context
    current_offer_name: z.string().max(200).optional(),
    current_price: z.number().min(0).optional(),
    currency: z.string().length(3).optional(),
    target_customer: z.string().max(500).optional(),
    existing_audience_size: z.number().int().min(0).optional(),
    current_channel: z.array(z.string().max(50)).max(20).optional(),
    proof_points: z.array(z.string().max(500)).max(50).optional(),
    testimonials: z.array(z.string().max(2000)).max(50).optional(),
    case_studies: z.array(z.string().max(2000)).max(20).optional(),
    competitor_urls: z.array(z.string().url()).max(10).optional(),
    landing_page_text: z.string().max(20000).optional(),
    product_page_text: z.string().max(20000).optional(),
    sales_call_notes: z.string().max(20000).optional(),
    customer_objections: z.array(z.string().max(500)).max(30).optional(),
    desired_cta: z.string().max(500).optional(),
    campaign_goal: z.string().max(500).optional(),
    monthly_goal: z.string().max(500).optional(),
    business_context: z.string().max(2000).optional(),
    forbidden_claims: z.array(z.string().max(200)).max(20).optional(),
    required_terms: z.array(z.string().max(200)).max(20).optional(),
    brand_tone_hint: z.string().max(500).optional(),
  })
  .strict();

export type OfferBrainInput = z.infer<typeof OfferBrainInputSchema>;

// -----------------------------------------------------------------------------
// Output schema — OfferBrief
// Sections A-I + learning_signals + future_memory_writes + versioning
// -----------------------------------------------------------------------------

// A. Identification offre
const OfferIdentification = z.object({
  offer_name: z.string().min(1).max(200),
  offer_type: z.enum([
    'coaching',
    'course',
    'product',
    'service',
    'audit',
    'webinar',
    'newsletter',
    'membership',
    'agency-service',
    'unknown',
  ]),
  business_model: z.enum([
    'one-time',
    'recurring',
    'subscription',
    'mixed',
    'freemium',
    'usage-based',
    'unknown',
  ]),
  market_category: z.string().max(200),
  offer_maturity: OfferMaturityEnum,
  core_promise: z.string().max(500),
  transformation_promised: z.string().max(500),
  primary_outcome: z.string().max(300),
  secondary_outcomes: z.array(z.string().max(300)).max(5),
});

// B. Audience / ICP
const Audience = z.object({
  target_audience: z.string().max(500),
  audience_segment: z.string().max(200),
  buyer_persona: z.string().max(500),
  awareness_stage: AwarenessStageEnum,
  sophistication_level: SophisticationEnum,
  pain_points: z.array(z.string().max(300)).max(10),
  urgent_triggers: z.array(z.string().max(300)).max(10),
  desired_outcome: z.string().max(300),
  buying_motivations: z.array(z.string().max(200)).max(10),
  buying_objections: z.array(z.string().max(300)).max(15),
});

// C. Positionnement
const Positioning = z.object({
  positioning_summary: z.string().max(500),
  differentiation_points: z.array(z.string().max(300)).max(10),
  perceived_value: z.string().max(500),
  price_positioning: z.enum(['budget', 'mid-tier', 'premium', 'luxury', 'unclear']),
  value_metric: z.string().max(200),
  category_alternatives: z.array(z.string().max(150)).max(10),
  why_now_angle: z.string().max(500),
});

// D. Preuves
const Proofs = z.object({
  proof_points: z.array(z.string().max(500)).max(20),
  proof_quality: ProofQualityEnum,
  proof_gaps: z.array(z.string().max(300)).max(10),
  credibility_assets: z.array(z.string().max(300)).max(10),
  risky_claims_detected: z.array(z.string().max(300)).max(15),
  unsupported_claims: z.array(z.string().max(300)).max(15),
});

// E. Conversion
const Conversion = z.object({
  funnel_stage: FunnelStageEnum,
  cta: z.string().max(300),
  cta_strength: CTAStrengthEnum,
  conversion_path: z.string().max(500),
  friction_points: z.array(z.string().max(300)).max(10),
  recommended_offer_fix: z.array(z.string().max(300)).max(10),
  recommended_lead_magnet: z.string().max(300),
  recommended_next_action: z.string().max(300),
});

// F. Canaux probables
const ChannelRelevance = z.object({
  best_channels: z.array(PlatformEnum).max(5),
  channel_rationale: z.record(PlatformEnum, z.string().max(500)),
  content_formats_likely_to_work: z
    .array(
      z.enum([
        'long-form-post',
        'short-post',
        'carousel-outline',
        'thread',
        'video-script',
        'image-caption',
        'newsletter',
        'webinar',
        'live',
      ]),
    )
    .max(10),
  video_relevance: z.enum(['high', 'medium', 'low', 'not-recommended']),
  avatar_video_relevance: z.enum(['high', 'medium', 'low', 'not-recommended']),
  carousel_relevance: z.enum(['high', 'medium', 'low', 'not-recommended']),
  long_form_relevance: z.enum(['high', 'medium', 'low', 'not-recommended']),
});

// G. Intelligence business
const BusinessIntelligence = z.object({
  business_potential_score: Score0to100,
  business_potential_rationale: z.string().min(10).max(800),
  clarity_score: Score0to100,
  differentiation_score: Score0to100,
  proof_score: Score0to100,
  audience_fit_score: Score0to100,
  conversion_readiness_score: Score0to100,
  confidence_score: Score0to100,
});

// H. Questions manquantes
const MissingInformation = z.object({
  missing_information: z.array(z.string().max(300)).max(20),
  recommended_followup_questions: z.array(z.string().max(300)).max(3), // hard cap per brief
  must_have_before_campaign: z.array(z.string().max(300)).max(10),
  nice_to_have_before_campaign: z.array(z.string().max(300)).max(10),
});

// I. Sécurité / conformité
const Compliance = z.object({
  legal_sensitivity: LegalSensitivityEnum,
  regulated_claims_risk: z.array(z.string().max(300)).max(10),
  prohibited_promises: z.array(z.string().max(300)).max(15),
  safe_language_guidance: z.array(z.string().max(300)).max(10),
});

// 8.bis Learning signals
const LearningSignals = z.object({
  extraction_confidence: Score0to100,
  ambiguity_level: Score0to100,
  missing_data_categories: z
    .array(
      z.enum(['proof', 'audience', 'cta', 'pricing', 'objections', 'positioning', 'channel', 'goal', 'other']),
    )
    .max(15),
  likely_user_corrections: z.array(z.string().max(300)).max(10),
  feedback_hooks: z.array(z.string().max(300)).max(10),
  improvement_priority: ImprovementPriorityEnum,
});

// Future memory writes (preparation only — no DB write in AI-001)
const FutureMemoryWrites = z.object({
  offer_memory_candidates: z.array(z.string().max(500)).max(15),
  style_dna_candidates: z.array(z.string().max(500)).max(15),
  objection_memory_candidates: z.array(z.string().max(500)).max(15),
  proof_memory_candidates: z.array(z.string().max(500)).max(15),
  channel_preference_candidates: z.array(z.string().max(300)).max(10),
});

// Master output schema with all sections
export const OfferBriefOutputSchema = z
  .object({
    // Versioning (for replay + diff vs main)
    diagnostic_version: z.string().min(1).max(50),
    prompt_version: z.string().min(1).max(50),
    schema_version: z.string().min(1).max(50),

    // A
    identification: OfferIdentification,
    // B
    audience: Audience,
    // C
    positioning: Positioning,
    // D
    proofs: Proofs,
    // E
    conversion: Conversion,
    // F
    channels: ChannelRelevance,
    // G
    intelligence: BusinessIntelligence,
    // H
    missing: MissingInformation,
    // I
    compliance: Compliance,

    // 8.bis Learning loop preparation
    learning_signals: LearningSignals,
    future_memory_writes: FutureMemoryWrites,
  })
  .strict()
  // Score-cap business invariants per brief
  .superRefine((brief, ctx) => {
    // confidence_score ≤ 70 if proof_points empty
    if (brief.proofs.proof_points.length === 0 && brief.intelligence.confidence_score > 70) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'confidence_score must be ≤ 70 when proof_points is empty',
        path: ['intelligence', 'confidence_score'],
      });
    }
    // conversion_readiness_score ≤ 70 if cta is absent or weak
    if (
      (brief.conversion.cta_strength === 'absent' || brief.conversion.cta_strength === 'weak') &&
      brief.intelligence.conversion_readiness_score > 70
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'conversion_readiness_score must be ≤ 70 when CTA is weak or absent',
        path: ['intelligence', 'conversion_readiness_score'],
      });
    }
    // proof_score ≤ 40 if proof_points is empty
    if (brief.proofs.proof_points.length === 0 && brief.intelligence.proof_score > 40) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'proof_score must be ≤ 40 when no proof_points are provided',
        path: ['intelligence', 'proof_score'],
      });
    }
    // business_potential_rationale must be ≥ 10 chars (already enforced) — semantic check is handled by length
    // unsupported_claims and risky_claims_detected: model is responsible, schema only ensures arrays exist
    // Max 3 followup_questions: enforced by .max(3) on the field itself
  });

export type OfferBrief = z.infer<typeof OfferBriefOutputSchema>;

// -----------------------------------------------------------------------------
// API response wrappers
// -----------------------------------------------------------------------------

export const OfferBrainSuccessResponseSchema = z.object({
  ok: z.literal(true),
  output: OfferBriefOutputSchema,
  metadata: z.object({
    source: z.enum(['mock', 'anthropic']),
    model: z.string().optional(),
    tokens_in: z.number().int().min(0).optional(),
    tokens_out: z.number().int().min(0).optional(),
    cached_tokens: z.number().int().min(0).optional(),
    duration_ms: z.number().int().min(0),
    retries: z.number().int().min(0),
    diagnostic_version: z.string(),
  }),
});

export const OfferBrainErrorResponseSchema = z.object({
  ok: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

export type OfferBrainSuccessResponse = z.infer<typeof OfferBrainSuccessResponseSchema>;
export type OfferBrainErrorResponse = z.infer<typeof OfferBrainErrorResponseSchema>;

// Stable versions (bump on prompt/schema/mock changes)
export const SCHEMA_VERSION = '0.1.0';
export const PROMPT_VERSION = '0.1.0';
export const DIAGNOSTIC_VERSION = '0.1.0';
