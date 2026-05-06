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
  type AdDiffusionSelection,
  type AdStatus,
  type AdUnit,
  type Asset,
  type AssetKind,
  type AssetStatus,
  type CalendarSlot,
  type CalendarSlotStatus,
  type FeedbackHistoryEntry,
  type FeedbackPreference,
  type FeedbackRecommendation,
  type FeedbackRecommendationStatus,
  type Offer,
  type OfferBundle,
  type OfferStatus,
  type PlanSlot,
  type PlanSlotStatus,
  type Recommendation,
  type RecommendationStatus,
  type RepairReport,
  type WeeklyPlan,
  type WorkspaceFile,
  type WorkspaceMergeMode,
  KIND_TO_DIMENSIONS,
} from './types';
import { mergeOfferBundle, mergeWorkspace, repairWorkspace } from './persistence';
import { diffusionSelectionId } from './ad-studio';

const STORAGE_KEY = 'socialboost.offer_workspace';

// -----------------------------------------------------------------------------
// Low-level: read / write the envelope
// -----------------------------------------------------------------------------

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function emptyEnvelope(): WorkspaceFile {
  return {
    version: STORAGE_VERSION,
    offers: [],
    assets: [],
    calendar_slots: [],
    recommendations: [],
    weekly_plans: [],
    feedback_recommendations: [],
    feedback_history: [],
    feedback_preferences: [],
    ad_units: [],
    ad_diffusion_selections: [],
  };
}

function readEnvelope(): WorkspaceFile {
  if (!isBrowser()) return emptyEnvelope();
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyEnvelope();
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
    weekly_plans: Array.isArray(env.weekly_plans) ? env.weekly_plans : [],
    feedback_recommendations: Array.isArray(env.feedback_recommendations)
      ? env.feedback_recommendations
      : [],
    feedback_history: Array.isArray(env.feedback_history) ? env.feedback_history : [],
    feedback_preferences: Array.isArray(env.feedback_preferences)
      ? env.feedback_preferences
      : [],
    ad_units: Array.isArray(env.ad_units) ? env.ad_units : [],
    ad_diffusion_selections: Array.isArray(env.ad_diffusion_selections)
      ? env.ad_diffusion_selections
      : [],
  };
}

function writeEnvelope(env: WorkspaceFile): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...env,
      version: STORAGE_VERSION,
      // AI-012: stamp every persisted write so the UI can show "last saved".
      last_saved_at: new Date().toISOString(),
    }),
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
  /** AI-010 — current weekly plan for an offer (latest weekStart wins). */
  getWeeklyPlanByOffer(offerId: string): WeeklyPlan | undefined;
  /** AI-011 — feedback artifacts. */
  listFeedbackRecommendations(planId: string): FeedbackRecommendation[];
  listFeedbackHistory(offerId: string): FeedbackHistoryEntry[];
  listFeedbackPreferences(offerId: string): FeedbackPreference[];
  /** AI-012 — direct envelope read for backup/diagnostic. */
  getEnvelope(): WorkspaceFile;
  /** AI-013 — ad studio queries. */
  listAdUnits(offerId: string): AdUnit[];
  listAdDiffusionSelections(offerId: string): AdDiffusionSelection[];

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

  // commands — weekly plan (AI-010)
  upsertWeeklyPlan(input: Omit<WeeklyPlan, 'id' | 'createdAt' | 'updatedAt' | 'slots'> & {
    slots: Omit<PlanSlot, 'id'>[];
  }): WeeklyPlan;
  movePlanSlot(planId: string, slotId: string, dayIndex: number): WeeklyPlan | undefined;
  setPlanSlotStatus(planId: string, slotId: string, status: PlanSlotStatus): WeeklyPlan | undefined;
  removePlanSlot(planId: string, slotId: string): WeeklyPlan | undefined;
  deleteWeeklyPlan(planId: string): boolean;

  // commands — editorial feedback loop (AI-011)
  upsertFeedbackRecommendations(planId: string, recs: FeedbackRecommendation[]): void;
  setFeedbackRecommendationStatus(
    id: string,
    status: FeedbackRecommendationStatus,
  ): FeedbackRecommendation | undefined;
  appendFeedbackHistoryEntry(entry: Omit<FeedbackHistoryEntry, 'id'>): FeedbackHistoryEntry;
  setFeedbackPreference(input: Omit<FeedbackPreference, 'id' | 'createdAt'>): FeedbackPreference;

  // bulk
  replaceAll(env: WorkspaceFile): void;
  exportAll(): WorkspaceFile;
  reset(): void;

  // AI-012 — safe import (never silently overwrites)
  mergeIncoming(env: WorkspaceFile, mode?: WorkspaceMergeMode): WorkspaceFile;
  mergeIncomingOffer(bundle: OfferBundle): WorkspaceFile;
  repair(): RepairReport;

  // AI-013 — ad studio commands
  upsertAdUnits(offerId: string, units: AdUnit[]): void;
  setAdStatus(adId: string, status: AdStatus): AdUnit | undefined;
  setAdDiffusionSelection(offerId: string, adId: string, selected: boolean): void;
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

    getWeeklyPlanByOffer(offerId) {
      const plans = (list().weekly_plans ?? []).filter((p) => p.offerId === offerId);
      if (plans.length === 0) return undefined;
      // Latest weekStart wins; ties broken by createdAt.
      return plans.sort((a, b) =>
        b.weekStart.localeCompare(a.weekStart) || b.createdAt.localeCompare(a.createdAt),
      )[0];
    },

    listFeedbackRecommendations(planId) {
      return (list().feedback_recommendations ?? []).filter((r) => r.planId === planId);
    },
    listFeedbackHistory(offerId) {
      return (list().feedback_history ?? [])
        .filter((h) => h.offerId === offerId)
        .sort((a, b) => b.date.localeCompare(a.date));
    },
    listFeedbackPreferences(offerId) {
      return (list().feedback_preferences ?? []).filter((p) => p.offerId === offerId);
    },

    getEnvelope() {
      return list();
    },

    listAdUnits(offerId) {
      return (list().ad_units ?? []).filter((u) => u.offerId === offerId);
    },
    listAdDiffusionSelections(offerId) {
      return (list().ad_diffusion_selections ?? []).filter((s) => s.offerId === offerId);
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
      const weekly_plans = (env.weekly_plans ?? []).filter((p) => p.offerId !== id);
      const feedback_recommendations = (env.feedback_recommendations ?? []).filter(
        (r) => r.offerId !== id,
      );
      const feedback_history = (env.feedback_history ?? []).filter((h) => h.offerId !== id);
      const feedback_preferences = (env.feedback_preferences ?? []).filter(
        (p) => p.offerId !== id,
      );
      const ad_units = (env.ad_units ?? []).filter((u) => u.offerId !== id);
      const ad_diffusion_selections = (env.ad_diffusion_selections ?? []).filter(
        (s) => s.offerId !== id,
      );
      writeEnvelope({
        ...env,
        offers,
        assets,
        calendar_slots,
        recommendations,
        weekly_plans,
        feedback_recommendations,
        feedback_history,
        feedback_preferences,
        ad_units,
        ad_diffusion_selections,
      });
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

    // -------------------------------------------------------------------------
    // Weekly plan (AI-010) — one plan per (offer, weekStart). Re-upsert replaces.
    // -------------------------------------------------------------------------

    upsertWeeklyPlan(input) {
      const env = list();
      const now = nowIso();
      const slots: PlanSlot[] = input.slots.map((s) => ({ ...s, id: newId('psl') }));
      const existing = (env.weekly_plans ?? []).find(
        (p) => p.offerId === input.offerId && p.weekStart === input.weekStart,
      );
      const plan: WeeklyPlan = {
        id: existing?.id ?? newId('wpl'),
        offerId: input.offerId,
        weekStart: input.weekStart,
        goal: input.goal,
        slots,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      const others = (env.weekly_plans ?? []).filter((p) => p.id !== plan.id);
      writeEnvelope({ ...env, weekly_plans: [...others, plan] });
      return plan;
    },

    movePlanSlot(planId, slotId, dayIndex) {
      if (dayIndex < 0 || dayIndex > 6) return undefined;
      const env = list();
      let updated: WeeklyPlan | undefined;
      const weekly_plans = (env.weekly_plans ?? []).map((p) => {
        if (p.id !== planId) return p;
        const slots = p.slots.map((s) => (s.id === slotId ? { ...s, dayIndex } : s));
        updated = { ...p, slots, updatedAt: nowIso() };
        return updated;
      });
      if (!updated) return undefined;
      writeEnvelope({ ...env, weekly_plans });
      return updated;
    },

    setPlanSlotStatus(planId, slotId, status) {
      const env = list();
      let updated: WeeklyPlan | undefined;
      const weekly_plans = (env.weekly_plans ?? []).map((p) => {
        if (p.id !== planId) return p;
        const slots = p.slots.map((s) => (s.id === slotId ? { ...s, status } : s));
        updated = { ...p, slots, updatedAt: nowIso() };
        return updated;
      });
      if (!updated) return undefined;
      writeEnvelope({ ...env, weekly_plans });
      return updated;
    },

    removePlanSlot(planId, slotId) {
      const env = list();
      let updated: WeeklyPlan | undefined;
      const weekly_plans = (env.weekly_plans ?? []).map((p) => {
        if (p.id !== planId) return p;
        const slots = p.slots.filter((s) => s.id !== slotId);
        updated = { ...p, slots, updatedAt: nowIso() };
        return updated;
      });
      if (!updated) return undefined;
      writeEnvelope({ ...env, weekly_plans });
      return updated;
    },

    deleteWeeklyPlan(planId) {
      const env = list();
      const before = (env.weekly_plans ?? []).length;
      const weekly_plans = (env.weekly_plans ?? []).filter((p) => p.id !== planId);
      if (weekly_plans.length === before) return false;
      const feedback_recommendations = (env.feedback_recommendations ?? []).filter(
        (r) => r.planId !== planId,
      );
      writeEnvelope({ ...env, weekly_plans, feedback_recommendations });
      return true;
    },

    // -------------------------------------------------------------------------
    // Editorial feedback loop (AI-011)
    // -------------------------------------------------------------------------

    upsertFeedbackRecommendations(planId, recs) {
      const env = list();
      // Preserve previous user statuses (applied_mock/dismissed) across re-derivation.
      const existing = new Map(
        (env.feedback_recommendations ?? [])
          .filter((r) => r.planId === planId)
          .map((r) => [r.id, r] as const),
      );
      const merged: FeedbackRecommendation[] = recs.map((r) => {
        const prev = existing.get(r.id);
        return prev ? { ...r, status: prev.status, updatedAt: prev.updatedAt } : r;
      });
      const others = (env.feedback_recommendations ?? []).filter((r) => r.planId !== planId);
      writeEnvelope({ ...env, feedback_recommendations: [...others, ...merged] });
    },

    setFeedbackRecommendationStatus(id, status) {
      const env = list();
      let updated: FeedbackRecommendation | undefined;
      const feedback_recommendations = (env.feedback_recommendations ?? []).map((r) => {
        if (r.id !== id) return r;
        updated = { ...r, status, updatedAt: nowIso() };
        return updated;
      });
      if (!updated) return undefined;
      writeEnvelope({ ...env, feedback_recommendations });
      return updated;
    },

    appendFeedbackHistoryEntry(entry) {
      const env = list();
      const stored: FeedbackHistoryEntry = { ...entry, id: newId('fbh') };
      // Keep the history bounded client-side (most recent 100 per offer).
      const sameOffer = (env.feedback_history ?? []).filter((h) => h.offerId === entry.offerId);
      const others = (env.feedback_history ?? []).filter((h) => h.offerId !== entry.offerId);
      const trimmed = [stored, ...sameOffer].slice(0, 100);
      writeEnvelope({ ...env, feedback_history: [...others, ...trimmed] });
      return stored;
    },

    setFeedbackPreference(input) {
      const env = list();
      // One row per (offerId, key). Replace if exists.
      const others = (env.feedback_preferences ?? []).filter(
        (p) => !(p.offerId === input.offerId && p.key === input.key),
      );
      const stored: FeedbackPreference = {
        id: newId('fbp'),
        offerId: input.offerId,
        key: input.key,
        value: input.value,
        createdAt: nowIso(),
      };
      writeEnvelope({ ...env, feedback_preferences: [...others, stored] });
      return stored;
    },

    replaceAll(env) {
      const sanitized: WorkspaceFile = {
        version: STORAGE_VERSION,
        exported_at: env.exported_at,
        offers: Array.isArray(env.offers) ? env.offers : [],
        assets: Array.isArray(env.assets) ? env.assets : [],
        calendar_slots: Array.isArray(env.calendar_slots) ? env.calendar_slots : [],
        recommendations: Array.isArray(env.recommendations) ? env.recommendations : [],
        weekly_plans: Array.isArray(env.weekly_plans) ? env.weekly_plans : [],
        feedback_recommendations: Array.isArray(env.feedback_recommendations)
          ? env.feedback_recommendations
          : [],
        feedback_history: Array.isArray(env.feedback_history) ? env.feedback_history : [],
        feedback_preferences: Array.isArray(env.feedback_preferences)
          ? env.feedback_preferences
          : [],
        ad_units: Array.isArray(env.ad_units) ? env.ad_units : [],
        ad_diffusion_selections: Array.isArray(env.ad_diffusion_selections)
          ? env.ad_diffusion_selections
          : [],
      };
      writeEnvelope(sanitized);
    },

    exportAll() {
      const env = list();
      return { ...env, exported_at: nowIso() };
    },

    reset() {
      writeEnvelope(emptyEnvelope());
    },

    // -------------------------------------------------------------------------
    // AI-012 — safe import / merge / repair
    // -------------------------------------------------------------------------

    mergeIncoming(env, mode = 'merge') {
      const current = list();
      const merged = mergeWorkspace(current, env, mode);
      writeEnvelope(merged);
      return merged;
    },

    mergeIncomingOffer(bundle) {
      const current = list();
      const merged = mergeOfferBundle(current, bundle);
      writeEnvelope(merged);
      return merged;
    },

    repair() {
      const current = list();
      const { repaired, report } = repairWorkspace(current);
      writeEnvelope(repaired);
      return report;
    },

    // -------------------------------------------------------------------------
    // AI-013 — ad studio
    // -------------------------------------------------------------------------

    upsertAdUnits(offerId, units) {
      const env = list();
      const existing = new Map(
        (env.ad_units ?? [])
          .filter((u) => u.offerId === offerId)
          .map((u) => [u.id, u] as const),
      );
      // Preserve user statuses (ready/selected) across re-derivation.
      const merged: AdUnit[] = units.map((u) => {
        const prev = existing.get(u.id);
        return prev ? { ...u, status: prev.status } : u;
      });
      const others = (env.ad_units ?? []).filter((u) => u.offerId !== offerId);
      writeEnvelope({ ...env, ad_units: [...others, ...merged] });
    },

    setAdStatus(adId, status) {
      const env = list();
      let updated: AdUnit | undefined;
      const ad_units = (env.ad_units ?? []).map((u) => {
        if (u.id !== adId) return u;
        updated = { ...u, status };
        return updated;
      });
      if (!updated) return undefined;
      writeEnvelope({ ...env, ad_units });
      return updated;
    },

    setAdDiffusionSelection(offerId, adId, selected) {
      const env = list();
      const id = diffusionSelectionId(offerId, adId);
      const others = (env.ad_diffusion_selections ?? []).filter((s) => s.id !== id);
      if (!selected) {
        writeEnvelope({ ...env, ad_diffusion_selections: others });
        return;
      }
      const stored: AdDiffusionSelection = {
        id,
        offerId,
        adId,
        selectedAt: nowIso(),
      };
      writeEnvelope({
        ...env,
        ad_diffusion_selections: [...others, stored],
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
