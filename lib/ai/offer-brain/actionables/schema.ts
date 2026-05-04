/**
 * Offer Brain — Actionables v1 (AI-006).
 *
 * Public-facing input + output for the v1 endpoint.
 * FR/EN only. No carousel. Plain-text social posts. Anti-invention enforced
 * by both Zod refinements and runtime invariants (see ./invariants.ts).
 */

import { z } from 'zod';

export const ACTIONABLES_SCHEMA_VERSION = '1.0.0';

// -----------------------------------------------------------------------------
// Input (v1)
// -----------------------------------------------------------------------------

export const ActionablesPlatformEnum = z.enum([
  'linkedin',
  'instagram',
  'facebook',
  'email',
  'landing_page',
]);

export const ActionablesToneEnum = z.enum([
  'professional',
  'bold',
  'friendly',
  'premium',
]);

export const ActionablesLangEnum = z.enum(['fr', 'en']);

export const ActionablesV1InputSchema = z
  .object({
    businessName: z.string().min(1, 'businessName is required').max(200),
    offer: z.string().min(1, 'offer is required').max(20000),
    targetAudience: z.string().min(1).max(1000).optional(),
    tone: ActionablesToneEnum.optional(),
    language: ActionablesLangEnum.optional(),
    platforms: z.array(ActionablesPlatformEnum).max(5).optional(),
    proofPoints: z.array(z.string().min(1).max(500)).max(20).optional(),
    include_actionables: z.boolean().optional(),
  })
  .strict();

export type ActionablesV1Input = z.infer<typeof ActionablesV1InputSchema>;

// -----------------------------------------------------------------------------
// Output: actionables block
// -----------------------------------------------------------------------------

export const HookTypeEnum = z.enum([
  'pain',
  'curiosity',
  'identity',
  'contrarian',
  'before_after',
]);

export const HookSchema = z
  .object({
    type: HookTypeEnum,
    text: z.string().min(1).max(240),
  })
  .strict();

export const ObjectionSchema = z
  .object({
    objection: z.string().min(1).max(280),
    response: z.string().min(1).max(500),
  })
  .strict();

export const OfferAngleSchema = z
  .object({
    name: z.string().min(1).max(80),
    angle: z.string().min(1).max(300),
    best_for: z.string().min(1).max(200),
  })
  .strict();

export const CtaIntentEnum = z.enum(['awareness', 'consideration', 'decision']);

export const CtaSchema = z
  .object({
    label: z.string().min(1).max(80),
    intent: CtaIntentEnum,
  })
  .strict();

const PLATFORM_BODY_CAP: Record<string, number> = {
  linkedin: 3000,
  instagram: 2200,
  facebook: 2000,
  email: 1200,
  // landing_page is intentionally NOT a social_post target — but we accept it
  // in the input platforms list. The mock excludes landing_page from posts.
  landing_page: 5000,
};

export const SocialPostSchema = z
  .object({
    platform: ActionablesPlatformEnum,
    post: z.string().min(1).max(3000),
    cta: z.string().min(1).max(120),
  })
  .strict()
  .superRefine((p, ctx) => {
    const cap = PLATFORM_BODY_CAP[p.platform];
    if (cap && p.post.length > cap) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `post exceeds ${p.platform} limit (${p.post.length} > ${cap})`,
        path: ['post'],
      });
    }
  });

export const LandingSectionEnum = z.enum([
  'hero',
  'problem',
  'solution',
  'proof',
  'cta',
]);

export const LandingPageSectionSchema = z
  .object({
    section: LandingSectionEnum,
    headline: z.string().min(1).max(200),
    body: z.string().min(1).max(800),
  })
  .strict();

export const ActionablesOutputSchema = z
  .object({
    schema_version: z.string().min(1).max(20),
    offer_summary: z.string().min(1).max(500),
    target_audience: z.string().min(1).max(500),
    pain_points: z.array(z.string().min(1).max(300)).min(1).max(10),
    value_proposition: z.string().min(1).max(500),
    proof_points: z.array(z.string().min(1).max(500)).max(20),
    objections: z.array(ObjectionSchema).min(4).max(8),
    offer_angles: z.array(OfferAngleSchema).min(3).max(6),
    hooks: z.array(HookSchema).min(5).max(8),
    ctas: z.array(CtaSchema).min(3).max(6),
    social_posts: z.array(SocialPostSchema).max(5),
    landing_page_sections: z.array(LandingPageSectionSchema).length(5),
    confidence_score: z.number().int().min(0).max(100),
    confidence_rationale: z.string().min(1).max(400),
    warnings: z.array(z.string().min(1).max(280)).max(20),
  })
  .strict()
  .superRefine((out, ctx) => {
    // Exactly 5 landing sections, one per kind, all required
    const required = ['hero', 'problem', 'solution', 'proof', 'cta'];
    const got = out.landing_page_sections.map((s) => s.section).sort();
    const exp = [...required].sort();
    if (JSON.stringify(got) !== JSON.stringify(exp)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `landing_page_sections must contain exactly: ${required.join(', ')}`,
        path: ['landing_page_sections'],
      });
    }
    // platform unicity in social_posts
    const platforms = out.social_posts.map((p) => p.platform);
    if (new Set(platforms).size !== platforms.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'social_posts platforms must be unique',
        path: ['social_posts'],
      });
    }
  });

export type ActionablesOutput = z.infer<typeof ActionablesOutputSchema>;

// -----------------------------------------------------------------------------
// Top-level v1 response
// -----------------------------------------------------------------------------

/**
 * v1 response = `{ diagnostic, actionables }`.
 *
 * `diagnostic` is the existing OfferBrief (validated by the legacy schema).
 * We don't redeclare it here to avoid duplication; route.ts attaches the
 * already-validated diagnostic produced by `runOfferBrain`.
 */
export const ActionablesV1ResponseShape = {
  // referenced informally in tests; the runtime diagnostic schema lives in
  // ../schema.ts (OfferBriefOutputSchema).
  schema_version: ACTIONABLES_SCHEMA_VERSION,
} as const;
