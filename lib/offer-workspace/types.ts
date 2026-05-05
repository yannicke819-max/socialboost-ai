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
// Errors
// -----------------------------------------------------------------------------

export class WorkspaceStorageError extends Error {
  constructor(public readonly code: 'incompatible_version' | 'parse_error' | 'unavailable') {
    super(code);
    this.name = 'WorkspaceStorageError';
  }
}
