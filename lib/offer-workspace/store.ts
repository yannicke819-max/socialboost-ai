/**
 * Offer Workspace — localStorage CRUD (AI-008a).
 *
 * Hard rules:
 *   - Browser-only. Never import from server components.
 *   - Versioned envelope; incompatible reads throw WorkspaceStorageError.
 *   - No secrets, no credentials, no env vars stored.
 *   - Pure module — no React, no hooks. UI builds a hook on top of this.
 */

import {
  STORAGE_VERSION,
  WorkspaceStorageError,
  type Asset,
  type AssetKind,
  type AssetStatus,
  type CalendarSlot,
  type CalendarSlotStatus,
  type Offer,
  type OfferStatus,
  type Recommendation,
  type RecommendationStatus,
  type WorkspaceFile,
  KIND_TO_DIMENSIONS,
} from './types';

const STORAGE_KEY = 'socialboost.offer_workspace';

// -----------------------------------------------------------------------------
// Low-level: read / write the envelope
// -----------------------------------------------------------------------------

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readEnvelope(): WorkspaceFile {
  if (!isBrowser()) {
    return { version: STORAGE_VERSION, offers: [], assets: [], calendar_slots: [], recommendations: [] };
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return { version: STORAGE_VERSION, offers: [], assets: [], calendar_slots: [], recommendations: [] };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new WorkspaceStorageError('parse_error');
  }
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    (parsed as { version?: unknown }).version !== STORAGE_VERSION
  ) {
    throw new WorkspaceStorageError('incompatible_version');
  }
  const env = parsed as WorkspaceFile;
  return {
    version: STORAGE_VERSION,
    offers: Array.isArray(env.offers) ? env.offers : [],
    assets: Array.isArray(env.assets) ? env.assets : [],
    calendar_slots: Array.isArray(env.calendar_slots) ? env.calendar_slots : [],
    recommendations: Array.isArray(env.recommendations) ? env.recommendations : [],
  };
}

function writeEnvelope(env: WorkspaceFile): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...env, version: STORAGE_VERSION }),
  );
}

// -----------------------------------------------------------------------------
// IDs (no new package)
// -----------------------------------------------------------------------------

let _idCounter = 0;
export function newId(prefix = 'ofr'): string {
  // crypto.randomUUID is available on modern browsers; fall back otherwise.
  const cryptoObj = (globalThis as { crypto?: Crypto }).crypto;
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return `${prefix}_${cryptoObj.randomUUID()}`;
  }
  _idCounter += 1;
  const t = Date.now().toString(36);
  return `${prefix}_${t}_${_idCounter}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

// -----------------------------------------------------------------------------
// Offer CRUD
// -----------------------------------------------------------------------------

export interface CreateOfferInput {
  name?: string;
  status?: OfferStatus;
  goal: Offer['goal'];
  language: 'fr' | 'en';
  brief: Offer['brief'];
  lastActionables?: Offer['lastActionables'];
  lastDiagnostic?: Offer['lastDiagnostic'];
  confidence_score?: number;
  primary_channel?: string;
  notes?: string;
}

export interface WorkspaceStore {
  // queries
  listOffers(): Offer[];
  getOffer(id: string): Offer | undefined;
  listAssetsByOffer(offerId: string): Asset[];
  listSlotsByOffer(offerId: string): CalendarSlot[];
  listRecommendationsByOffer(offerId: string): Recommendation[];

  // commands — offers
  createOffer(input: CreateOfferInput): Offer;
  updateOffer(id: string, patch: Partial<Omit<Offer, 'id' | 'createdAt'>>): Offer | undefined;
  setStatus(id: string, status: OfferStatus): Offer | undefined;
  duplicateOffer(id: string): Offer | undefined;
  deleteOffer(id: string): boolean;

  // commands — assets
  createAsset(input: Omit<Asset, 'id' | 'dimensions' | 'createdAt' | 'source'> & { source?: Asset['source'] }): Asset;
  setAssetStatus(id: string, status: AssetStatus): Asset | undefined;

  // commands — calendar slots (AI-008b)
  createSlot(input: Omit<CalendarSlot, 'id' | 'createdAt'>): CalendarSlot;
  updateSlot(id: string, patch: Partial<Omit<CalendarSlot, 'id' | 'createdAt' | 'offerId'>>): CalendarSlot | undefined;
  setSlotStatus(id: string, status: CalendarSlotStatus): CalendarSlot | undefined;
  shiftSlot(id: string, deltaDays: number): CalendarSlot | undefined;
  deleteSlot(id: string): boolean;

  // commands — recommendations (AI-008b)
  upsertRecommendations(offerId: string, recs: Recommendation[]): void;
  setRecommendationStatus(id: string, status: RecommendationStatus): Recommendation | undefined;

  // bulk
  replaceAll(env: WorkspaceFile): void;
  exportAll(): WorkspaceFile;
  reset(): void;
}

export function createWorkspaceStore(): WorkspaceStore {
  const list = (): WorkspaceFile => readEnvelope();

  return {
    listOffers() {
      return list().offers;
    },
    getOffer(id) {
      return list().offers.find((o) => o.id === id);
    },
    listAssetsByOffer(offerId) {
      return list().assets.filter((a) => a.offerId === offerId);
    },
    listSlotsByOffer(offerId) {
      return (list().calendar_slots ?? []).filter((s) => s.offerId === offerId);
    },
    listRecommendationsByOffer(offerId) {
      return (list().recommendations ?? []).filter((r) => r.offerId === offerId);
    },

    createOffer(input) {
      const env = list();
      const now = nowIso();
      const offer: Offer = {
        id: newId('ofr'),
        name: input.name?.trim() || input.brief.businessName,
        status: input.status ?? 'draft',
        goal: input.goal,
        language: input.language,
        brief: input.brief,
        lastActionables: input.lastActionables,
        lastDiagnostic: input.lastDiagnostic,
        confidence_score: input.confidence_score,
        primary_channel:
          input.primary_channel ??
          (input.brief.platforms?.[0] ?? undefined),
        notes: input.notes,
        createdAt: now,
        updatedAt: now,
      };
      writeEnvelope({ ...env, offers: [offer, ...env.offers] });
      return offer;
    },

    updateOffer(id, patch) {
      const env = list();
      let updated: Offer | undefined;
      const offers = env.offers.map((o) => {
        if (o.id !== id) return o;
        updated = { ...o, ...patch, id: o.id, createdAt: o.createdAt, updatedAt: nowIso() };
        return updated;
      });
      if (!updated) return undefined;
      writeEnvelope({ ...env, offers });
      return updated;
    },

    setStatus(id, status) {
      return this.updateOffer(id, { status });
    },

    duplicateOffer(id) {
      const env = list();
      const orig = env.offers.find((o) => o.id === id);
      if (!orig) return undefined;
      const copy: Offer = {
        ...orig,
        id: newId('ofr'),
        name: `${orig.name} (copie)`,
        status: 'draft',
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      // also clone assets attached to it
      const clonedAssets: Asset[] = env.assets
        .filter((a) => a.offerId === id)
        .map((a) => ({ ...a, id: newId('ast'), offerId: copy.id, createdAt: nowIso() }));
      writeEnvelope({
        ...env,
        offers: [copy, ...env.offers],
        assets: [...env.assets, ...clonedAssets],
      });
      return copy;
    },

    deleteOffer(id) {
      const env = list();
      const before = env.offers.length;
      const offers = env.offers.filter((o) => o.id !== id);
      if (offers.length === before) return false;
      const assets = env.assets.filter((a) => a.offerId !== id);
      const calendar_slots = (env.calendar_slots ?? []).filter((s) => s.offerId !== id);
      const recommendations = (env.recommendations ?? []).filter((r) => r.offerId !== id);
      writeEnvelope({ ...env, offers, assets, calendar_slots, recommendations });
      return true;
    },

    createAsset(input) {
      const env = list();
      const dimensions = KIND_TO_DIMENSIONS[input.kind] ?? ['asset'];
      const asset: Asset = {
        id: newId('ast'),
        offerId: input.offerId,
        kind: input.kind as AssetKind,
        title: input.title,
        body: input.body,
        dimensions,
        status: input.status,
        source: input.source ?? 'mock',
        tags: input.tags,
        channel: input.channel,
        createdAt: nowIso(),
      };
      writeEnvelope({ ...env, assets: [...env.assets, asset] });
      return asset;
    },

    setAssetStatus(id, status) {
      const env = list();
      let updated: Asset | undefined;
      const assets = env.assets.map((a) => {
        if (a.id !== id) return a;
        updated = { ...a, status };
        return updated;
      });
      if (!updated) return undefined;
      writeEnvelope({ ...env, assets });
      return updated;
    },

    // -------------------------------------------------------------------------
    // Calendar slots (AI-008b)
    // -------------------------------------------------------------------------

    createSlot(input) {
      const env = list();
      const slot: CalendarSlot = {
        ...input,
        id: newId('slt'),
        createdAt: nowIso(),
      };
      writeEnvelope({
        ...env,
        calendar_slots: [...(env.calendar_slots ?? []), slot],
      });
      return slot;
    },

    updateSlot(id, patch) {
      const env = list();
      let updated: CalendarSlot | undefined;
      const calendar_slots = (env.calendar_slots ?? []).map((s) => {
        if (s.id !== id) return s;
        updated = { ...s, ...patch, id: s.id, offerId: s.offerId, createdAt: s.createdAt };
        return updated;
      });
      if (!updated) return undefined;
      writeEnvelope({ ...env, calendar_slots });
      return updated;
    },

    setSlotStatus(id, status) {
      return this.updateSlot(id, { status });
    },

    shiftSlot(id, deltaDays) {
      const env = list();
      const slot = (env.calendar_slots ?? []).find((s) => s.id === id);
      if (!slot) return undefined;
      const next = new Date(slot.scheduledAt);
      next.setUTCDate(next.getUTCDate() + deltaDays);
      return this.updateSlot(id, { scheduledAt: next.toISOString() });
    },

    deleteSlot(id) {
      const env = list();
      const before = (env.calendar_slots ?? []).length;
      const calendar_slots = (env.calendar_slots ?? []).filter((s) => s.id !== id);
      if (calendar_slots.length === before) return false;
      writeEnvelope({ ...env, calendar_slots });
      return true;
    },

    // -------------------------------------------------------------------------
    // Recommendations (AI-008b)
    // -------------------------------------------------------------------------

    upsertRecommendations(offerId, recs) {
      const env = list();
      // Drop previous recos for this offer; replace with the new set, but
      // preserve `status` for ids that already existed (so applied/dismissed
      // survives a re-derivation).
      const existing = new Map(
        (env.recommendations ?? [])
          .filter((r) => r.offerId === offerId)
          .map((r) => [r.id, r] as const),
      );
      const merged: Recommendation[] = recs.map((r) => {
        const prev = existing.get(r.id);
        return prev ? { ...r, status: prev.status, updatedAt: prev.updatedAt } : r;
      });
      const others = (env.recommendations ?? []).filter((r) => r.offerId !== offerId);
      writeEnvelope({ ...env, recommendations: [...others, ...merged] });
    },

    setRecommendationStatus(id, status) {
      const env = list();
      let updated: Recommendation | undefined;
      const recommendations = (env.recommendations ?? []).map((r) => {
        if (r.id !== id) return r;
        updated = { ...r, status, updatedAt: nowIso() };
        return updated;
      });
      if (!updated) return undefined;
      writeEnvelope({ ...env, recommendations });
      return updated;
    },

    replaceAll(env) {
      const sanitized: WorkspaceFile = {
        version: STORAGE_VERSION,
        exported_at: env.exported_at,
        offers: Array.isArray(env.offers) ? env.offers : [],
        assets: Array.isArray(env.assets) ? env.assets : [],
        calendar_slots: Array.isArray(env.calendar_slots) ? env.calendar_slots : [],
        recommendations: Array.isArray(env.recommendations) ? env.recommendations : [],
      };
      writeEnvelope(sanitized);
    },

    exportAll() {
      const env = list();
      return { ...env, exported_at: nowIso() };
    },

    reset() {
      writeEnvelope({
        version: STORAGE_VERSION,
        offers: [],
        assets: [],
        calendar_slots: [],
        recommendations: [],
      });
    },
  };
}

// -----------------------------------------------------------------------------
// Convenience: derive assets from an actionables snapshot.
// -----------------------------------------------------------------------------

interface ActionablesLike {
  hooks?: { type: string; text: string }[];
  offer_angles?: { name: string; angle: string; best_for: string }[];
  objections?: { objection: string; response: string }[];
  ctas?: { label: string; intent: string }[];
  social_posts?: { platform: string; post: string; cta: string }[];
  landing_page_sections?: { section: string; headline: string; body: string }[];
}

/**
 * Pure helper: builds the Asset[] derivable from an ActionablesOutput.
 * Returns the array WITHOUT inserting (caller decides). Used by the "Save offer"
 * flow to materialise assets next to the offer.
 */
export function deriveAssetsFromActionables(
  offerId: string,
  actionables: ActionablesLike,
): Array<Omit<Asset, 'id' | 'createdAt'>> {
  const out: Array<Omit<Asset, 'id' | 'createdAt'>> = [];

  for (const h of actionables.hooks ?? []) {
    out.push({
      offerId,
      kind: 'hook',
      body: h.text,
      dimensions: KIND_TO_DIMENSIONS.hook,
      status: 'draft',
      source: 'mock',
    });
  }
  for (const a of actionables.offer_angles ?? []) {
    out.push({
      offerId,
      kind: 'angle',
      body: `${a.name} — ${a.angle}\n\n[best for: ${a.best_for}]`,
      dimensions: KIND_TO_DIMENSIONS.angle,
      status: 'draft',
      source: 'mock',
    });
  }
  for (const o of actionables.objections ?? []) {
    out.push({
      offerId,
      kind: 'objection',
      body: `« ${o.objection} »\n\n${o.response}`,
      dimensions: KIND_TO_DIMENSIONS.objection,
      status: 'draft',
      source: 'mock',
    });
  }
  for (const c of actionables.ctas ?? []) {
    out.push({
      offerId,
      kind: 'cta',
      body: `${c.label} — intent: ${c.intent}`,
      dimensions: KIND_TO_DIMENSIONS.cta,
      status: 'draft',
      source: 'mock',
    });
  }
  for (const sp of actionables.social_posts ?? []) {
    out.push({
      offerId,
      kind: 'social_post',
      body: sp.post,
      dimensions: KIND_TO_DIMENSIONS.social_post,
      status: 'draft',
      source: 'mock',
      channel: sp.platform,
    });
  }
  for (const ls of actionables.landing_page_sections ?? []) {
    out.push({
      offerId,
      kind: 'landing_section',
      body: `# ${ls.headline}\n\n${ls.body}`,
      dimensions: KIND_TO_DIMENSIONS.landing_section,
      status: 'draft',
      source: 'mock',
      channel: 'landing_page',
    });
  }
  return out;
}
