/**
 * Offer Workspace — V1 data model (AI-008a).
 *
 * Local-first (localStorage). No DB, no Supabase, no server persistence.
 * The Asset.kind enum is intentionally wide so future sprints (AI-009+) can
 * land without migrating existing offers.
 */

// -----------------------------------------------------------------------------
// Storage envelope (versioned)
// -----------------------------------------------------------------------------

/**
 * Bumped when the on-disk shape changes. Incompatible reads fail fast and the
 * UI surfaces an "incompatible storage" notice with an export-then-reset path.
 */
export const STORAGE_VERSION = 1;

export interface WorkspaceFile {
  version: typeof STORAGE_VERSION;
  exported_at?: string;
  offers: Offer[];
  assets: Asset[];
  /** AI-008b additive — older imports without these arrays remain valid. */
  calendar_slots?: CalendarSlot[];
  recommendations?: Recommendation[];
  /** AI-010 additive — older imports without this array remain valid. */
  weekly_plans?: WeeklyPlan[];
  /** AI-011 additive — older imports without these arrays remain valid. */
  feedback_recommendations?: FeedbackRecommendation[];
  feedback_history?: FeedbackHistoryEntry[];
  feedback_preferences?: FeedbackPreference[];
}

// -----------------------------------------------------------------------------
// Statuses (5)
// -----------------------------------------------------------------------------

export const OFFER_STATUSES = [
  'draft',
  'ready',
  'scheduled_mock',
  'active_mock',
  'archived',
] as const;
export type OfferStatus = (typeof OFFER_STATUSES)[number];

export const STATUS_LABELS: Record<OfferStatus, { fr: string; en: string }> = {
  draft: { fr: 'Brouillon', en: 'Draft' },
  ready: { fr: 'Prête', en: 'Ready' },
  scheduled_mock: { fr: 'Planifiée (mock)', en: 'Scheduled (mock)' },
  active_mock: { fr: 'Active (mock)', en: 'Active (mock)' },
  archived: { fr: 'Archivée', en: 'Archived' },
};

// -----------------------------------------------------------------------------
// Goals (mirror of AI-007)
// -----------------------------------------------------------------------------

export const OFFER_GOALS = [
  'clarify_offer',
  'social_content',
  'landing_page',
  'objections',
  'sales_angles',
] as const;
export type OfferGoal = (typeof OFFER_GOALS)[number];

// -----------------------------------------------------------------------------
// Tones (mirror of AI-006)
// -----------------------------------------------------------------------------

export type OfferTone = 'professional' | 'bold' | 'friendly' | 'premium';

// -----------------------------------------------------------------------------
// Dimensions — performance lens (V1 conceptual, stored on assets)
// -----------------------------------------------------------------------------

/**
 * The 8 dimensions across which the workspace measures and compares.
 * The dashboard rolls up KPIs by any combination of these.
 */
export const DIMENSIONS = [
  'offer',
  'promise',
  'proof',
  'angle',
  'objection',
  'cta',
  'asset',
  'channel',
] as const;
export type Dimension = (typeof DIMENSIONS)[number];

// -----------------------------------------------------------------------------
// Asset.kind — wide enum for future sprints (AI-009+)
// -----------------------------------------------------------------------------

export const ASSET_KINDS = [
  'hook',
  'angle',
  'objection',
  'cta',
  'social_post',
  'landing_section',
  'email',
  'image_prompt',
  'image_asset',
  'video_script',
  'video_storyboard',
  'thumbnail',
  'creative_brief',
] as const;
export type AssetKind = (typeof ASSET_KINDS)[number];

/** Static map: which dimensions does each kind primarily measure? */
export const KIND_TO_DIMENSIONS: Record<AssetKind, Dimension[]> = {
  hook: ['promise', 'asset'],
  angle: ['angle', 'asset'],
  objection: ['objection'],
  cta: ['cta'],
  social_post: ['asset', 'channel'],
  landing_section: ['asset'],
  email: ['asset', 'channel'],
  image_prompt: ['asset'],
  image_asset: ['asset'],
  video_script: ['asset'],
  video_storyboard: ['asset'],
  thumbnail: ['asset'],
  creative_brief: ['asset'],
};

// -----------------------------------------------------------------------------
// Brief (the input snapshot)
// -----------------------------------------------------------------------------

export interface OfferBrief {
  businessName: string;
  offer: string;
  targetAudience?: string;
  tone: OfferTone;
  language: 'fr' | 'en';
  platforms: string[];
  proofPoints: string[];
}

// -----------------------------------------------------------------------------
// Snapshots — kept opaque on the workspace side; shapes live in lib/ai/...
// -----------------------------------------------------------------------------

/**
 * Cached actionables snapshot from the last successful generation.
 * Stored as `unknown` to keep this module decoupled from lib/ai schemas.
 * Consumers cast to `ActionablesOutput` (lib/ai/offer-brain/actionables/schema).
 */
export type ActionablesSnapshot = unknown;

/**
 * Cached diagnostic snapshot. Stored as `unknown` for the same reason.
 * Consumers cast to `OfferBrief` (lib/ai/offer-brain/schema).
 */
export type DiagnosticSnapshot = unknown;

// -----------------------------------------------------------------------------
// Offer (root entity)
// -----------------------------------------------------------------------------

export interface Offer {
  id: string;
  name: string;
  status: OfferStatus;
  goal: OfferGoal;
  language: 'fr' | 'en';
  brief: OfferBrief;
  lastActionables?: ActionablesSnapshot;
  lastDiagnostic?: DiagnosticSnapshot;
  /** 0..100 — usually copied from actionables.confidence_score on save. */
  confidence_score?: number;
  /** Best/primary channel from brief.platforms[0] or actionables. Display only. */
  primary_channel?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// Asset (per-offer creative item)
// -----------------------------------------------------------------------------

export const ASSET_STATUSES = ['draft', 'review_mock', 'approved', 'archived'] as const;
export type AssetStatus = (typeof ASSET_STATUSES)[number];

export interface Asset {
  id: string;
  offerId: string;
  kind: AssetKind;
  /** Short human label for cards (AI-009). Optional for backward compat. */
  title?: string;
  /** Free text content for V1 (markdown allowed). Empty for image_asset etc. */
  body: string;
  /** Convenience cache; computed via KIND_TO_DIMENSIONS at insert time. */
  dimensions: Dimension[];
  /**
   * AI-008b extends the V1 'draft|approved|archived' set with 'review_mock'.
   * Pre-008b assets reading 'draft' or 'approved' continue to validate.
   */
  status: AssetStatus;
  /** Always 'mock' at AI-008a. 'real' will be reserved for future real-model runs. */
  source: 'mock' | 'real';
  channel?: string;
  /** Optional free tags (dimensions overlay, e.g. 'promise:transformation', 'channel:linkedin'). */
  tags?: string[];
  createdAt: string;
}

// -----------------------------------------------------------------------------
// Calendar slots (AI-008b — mock only, no real scheduling)
// -----------------------------------------------------------------------------

export const CALENDAR_SLOT_STATUSES = ['planned', 'sent_mock', 'cancelled'] as const;
export type CalendarSlotStatus = (typeof CALENDAR_SLOT_STATUSES)[number];

export interface CalendarSlot {
  id: string;
  offerId: string;
  assetId?: string;
  channel: string;
  /** ISO 8601. AI-008b uses local date precision; granularity is per-day in V1. */
  scheduledAt: string;
  status: CalendarSlotStatus;
  /** Optional dimension tags for cross-cutting filters. */
  tags?: string[];
  createdAt: string;
}

// -----------------------------------------------------------------------------
// Recommendations (AI-008b — deterministic rules, no model call)
// -----------------------------------------------------------------------------

export const RECOMMENDATION_STATUSES = ['todo', 'applied_mock', 'dismissed'] as const;
export type RecommendationStatus = (typeof RECOMMENDATION_STATUSES)[number];

export const RECOMMENDATION_PRIORITIES = ['high', 'medium', 'low'] as const;
export type RecommendationPriority = (typeof RECOMMENDATION_PRIORITIES)[number];

/**
 * Recommendations are derived from offer + assets + slots state by a pure
 * rules engine (lib/offer-workspace/recommendations.ts). The engine yields a
 * stable id per `(offerId, ruleId)` so the user can mark one as applied/dismissed
 * and the status persists across regenerations.
 */
export interface Recommendation {
  /** Stable id `${offerId}:${ruleId}`. */
  id: string;
  offerId: string;
  ruleId: string;
  priority: RecommendationPriority;
  title: string;
  description: string;
  /** Optional CTA: link OR action label. */
  cta?: { label: string; href?: string; action?: string };
  status: RecommendationStatus;
  /** ISO 8601 — when the user changed status. Optional in V1. */
  updatedAt?: string;
}

// -----------------------------------------------------------------------------
// Weekly Content Plan (AI-010 — mock only, no real publishing)
// -----------------------------------------------------------------------------

export const WEEKLY_PLAN_GOALS = [
  'visibility',
  'leads',
  'trust',
  'launch',
  'reactivation',
] as const;
export type WeeklyPlanGoal = (typeof WEEKLY_PLAN_GOALS)[number];

export const WEEKLY_PLAN_GOAL_LABELS: Record<WeeklyPlanGoal, { fr: string; en: string }> = {
  visibility: { fr: 'Visibilité', en: 'Visibility' },
  leads: { fr: 'Leads', en: 'Leads' },
  trust: { fr: 'Confiance', en: 'Trust' },
  launch: { fr: 'Lancement', en: 'Launch' },
  reactivation: { fr: 'Réactivation', en: 'Reactivation' },
};

export const EDITORIAL_PILLARS = [
  'education',
  'proof',
  'objection',
  'behind_scenes',
  'conversion',
] as const;
export type EditorialPillar = (typeof EDITORIAL_PILLARS)[number];

export const EDITORIAL_PILLAR_LABELS: Record<EditorialPillar, { fr: string; en: string }> = {
  education: { fr: 'Éducation', en: 'Education' },
  proof: { fr: 'Preuve', en: 'Proof' },
  objection: { fr: 'Objection', en: 'Objection' },
  behind_scenes: { fr: 'Coulisses', en: 'Behind the scenes' },
  conversion: { fr: 'Conversion', en: 'Conversion' },
};

export const PLAN_SLOT_STATUSES = ['draft', 'ready', 'scheduled'] as const;
export type PlanSlotStatus = (typeof PLAN_SLOT_STATUSES)[number];

export const PLAN_SLOT_STATUS_LABELS: Record<PlanSlotStatus, { fr: string; en: string }> = {
  draft: { fr: 'Brouillon', en: 'Draft' },
  ready: { fr: 'Prêt', en: 'Ready' },
  scheduled: { fr: 'Planifié', en: 'Scheduled' },
};

/**
 * A single slot in the weekly plan. dayIndex 0=Mon..6=Sun.
 * `assetId` references an Asset; `free=true` marks a reserved slot for a
 * spontaneous idea (no asset bound).
 */
export interface PlanSlot {
  id: string;
  dayIndex: number;
  /** Suggested HH:MM (local). Display-only mock. */
  suggestedTime: string;
  channel: string;
  /** Asset kind (echoes `Asset.kind` for filtering); empty when `free=true`. */
  kind?: AssetKind;
  pillar: EditorialPillar;
  /** One-line editorial intent shown on the card. */
  objective: string;
  /** Short hook/title surfaced on the card. */
  hook: string;
  assetId?: string;
  status: PlanSlotStatus;
  free?: boolean;
}

/**
 * One plan per offer per week. V1 keeps a single "current" plan per offer
 * (latest weekStart wins). Future sprints may keep history.
 */
export interface WeeklyPlan {
  id: string;
  offerId: string;
  /** ISO Y-M-D of the Monday of the planned week (UTC). */
  weekStart: string;
  goal: WeeklyPlanGoal;
  slots: PlanSlot[];
  createdAt: string;
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// Editorial Feedback Loop (AI-011 — mock only, no real analytics)
// -----------------------------------------------------------------------------

export const FUNNEL_STAGES = [
  'awareness',
  'consideration',
  'decision',
  'retention',
] as const;
export type FunnelStage = (typeof FUNNEL_STAGES)[number];

export const FUNNEL_STAGE_LABELS: Record<FunnelStage, { fr: string; en: string }> = {
  awareness: { fr: 'Découverte', en: 'Awareness' },
  consideration: { fr: 'Considération', en: 'Consideration' },
  decision: { fr: 'Décision', en: 'Decision' },
  retention: { fr: 'Rétention', en: 'Retention' },
};

export const INTENT_LEVELS = ['low', 'medium', 'high'] as const;
export type IntentLevel = (typeof INTENT_LEVELS)[number];

export const PRIMARY_KPIS = [
  'reach',
  'engagement',
  'clicks',
  'leads',
  'trust',
  'conversion',
] as const;
export type PrimaryKpi = (typeof PRIMARY_KPIS)[number];

export const PRIMARY_KPI_LABELS: Record<PrimaryKpi, { fr: string; en: string }> = {
  reach: { fr: 'Portée', en: 'Reach' },
  engagement: { fr: 'Engagement', en: 'Engagement' },
  clicks: { fr: 'Clics', en: 'Clicks' },
  leads: { fr: 'Leads', en: 'Leads' },
  trust: { fr: 'Confiance', en: 'Trust' },
  conversion: { fr: 'Conversion', en: 'Conversion' },
};

export const EFFORT_LEVELS = ['low', 'medium', 'high'] as const;
export type EffortLevel = (typeof EFFORT_LEVELS)[number];

export const CONFIDENCE_LEVELS = ['low', 'medium', 'high'] as const;
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

export const FEEDBACK_RECOMMENDATION_STATUSES = [
  'todo',
  'applied_mock',
  'dismissed',
] as const;
export type FeedbackRecommendationStatus =
  (typeof FEEDBACK_RECOMMENDATION_STATUSES)[number];

/**
 * Mock metrics for a single plan slot. Computed on the fly from a deterministic
 * seeded PRNG; never persisted. The "_mock" suffix is intentional: these
 * values are NOT real analytics.
 */
export interface SlotMetrics {
  slotId: string;
  impressions_mock: number;
  engagement_mock: number;
  clicks_mock: number;
  leads_mock: number;
  /** 0..100 — weighted blend that does not reward only reach. */
  useful_score: number;
  /** 0..100 — goal-aware score combining useful_score + audience_fit. */
  global_score: number;
  funnelStage: FunnelStage;
  intentLevel: IntentLevel;
  primaryKpi: PrimaryKpi;
  /** 0..100 — coherence with target / pain / promise / proof / channel. */
  audience_fit: number;
}

/**
 * Recommendation derived by the feedback engine. Stored so the user's
 * applied/dismissed status survives recomputation. Stable id `${planId}:${ruleId}`.
 */
export interface FeedbackRecommendation {
  /** Stable id `${planId}:${ruleId}`. */
  id: string;
  offerId: string;
  planId: string;
  ruleId: string;
  action: string;
  why: string;
  impact: string;
  effort: EffortLevel;
  confidence: ConfidenceLevel;
  /** Optional anchors back to a slot or asset for display. */
  linkedSlotId?: string;
  linkedAssetId?: string;
  status: FeedbackRecommendationStatus;
  /** Optional preference key written when status='applied_mock'. */
  preferenceKey?: string;
  updatedAt?: string;
}

/**
 * "Test à lancer la semaine prochaine" — a small A/B card surfaced on the
 * feedback tab. Computed deterministically; not stored separately, recomputed
 * each render to stay in sync with the underlying plan.
 */
export interface FeedbackTest {
  hypothesis: string;
  variantA: string;
  variantB: string;
  successMetric: PrimaryKpi;
  durationDays: number;
  decisionRule: string;
}

/**
 * Local "Ce qu'on apprend" history entry. Append-only, capped client-side.
 */
export interface FeedbackHistoryEntry {
  id: string;
  offerId: string;
  date: string;
  recommendation: string;
  cause: string;
  actionApplied: string;
  expectedResult: string;
  status: 'applied_mock';
}

/**
 * Local-only preference toggle that the next plan generator could consult
 * later to bias its mix (e.g. "prefer more proof", "avoid 2 LinkedIn in a row").
 * AI-011 stores them but does not yet read them in the plan-generator — that's
 * intentional, AI-011.x or AI-010.x will wire the consumer side.
 */
export interface FeedbackPreference {
  id: string;
  offerId: string;
  key: string;
  value: string | number | boolean;
  createdAt: string;
}

// -----------------------------------------------------------------------------
// Errors
// -----------------------------------------------------------------------------

export class WorkspaceStorageError extends Error {
  constructor(public readonly code: 'incompatible_version' | 'parse_error' | 'unavailable') {
    super(code);
    this.name = 'WorkspaceStorageError';
  }
}
