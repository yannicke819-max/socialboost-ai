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

export interface Asset {
  id: string;
  offerId: string;
  kind: AssetKind;
  /** Free text content for V1 (markdown allowed). Empty for image_asset etc. */
  body: string;
  /** Convenience cache; computed via KIND_TO_DIMENSIONS at insert time. */
  dimensions: Dimension[];
  status: 'draft' | 'approved' | 'archived';
  /** Always 'mock' at AI-008a. 'real' will be reserved for future real-model runs. */
  source: 'mock' | 'real';
  channel?: string;
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
