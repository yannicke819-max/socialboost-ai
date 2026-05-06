/**
 * Workspace Persistence & Export Hardening (AI-012).
 *
 * Pure functions for safely serializing, validating, importing, merging and
 * repairing the local workspace. No I/O — the UI layer wires file I/O on top.
 *
 * Hard rules:
 *   - Never overwrite the live store without explicit caller intent.
 *   - Never silently drop an unrecognized envelope — return a typed error.
 *   - Imports are deterministic: same input → same output, no clocks.
 *   - Repair is reversible by the caller: returns a new envelope + a report;
 *     the caller chooses whether to persist.
 */

import { STORAGE_VERSION } from './types';
import type {
  Asset,
  CalendarSlot,
  FeedbackHistoryEntry,
  FeedbackPreference,
  FeedbackRecommendation,
  Offer,
  OfferBundle,
  OfferImportResult,
  Recommendation,
  RepairReport,
  WeeklyPlan,
  WorkspaceFile,
  WorkspaceImportResult,
  WorkspaceMergeMode,
  WorkspaceSummary,
} from './types';
import { validateWorkspaceFile } from './export-import';

// -----------------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------------

export function summarizeWorkspace(env: WorkspaceFile): WorkspaceSummary {
  return {
    version: env.version,
    offers: (env.offers ?? []).length,
    assets: (env.assets ?? []).length,
    calendar_slots: (env.calendar_slots ?? []).length,
    recommendations: (env.recommendations ?? []).length,
    weekly_plans: (env.weekly_plans ?? []).length,
    feedback_recommendations: (env.feedback_recommendations ?? []).length,
    feedback_history: (env.feedback_history ?? []).length,
    feedback_preferences: (env.feedback_preferences ?? []).length,
    last_saved_at: env.last_saved_at,
    exported_at: env.exported_at,
    mock: true,
  };
}

// -----------------------------------------------------------------------------
// Diagnostic (clipboard text)
// -----------------------------------------------------------------------------

export function diagnosticString(
  env: WorkspaceFile,
  storageKey = 'socialboost.offer_workspace',
  language: 'fr' | 'en' = 'fr',
): string {
  const s = summarizeWorkspace(env);
  const isEn = language === 'en';
  const ts = new Date().toISOString();
  const lines: string[] = [];
  lines.push(isEn ? '# Workspace diagnostic' : '# Diagnostic workspace');
  lines.push(`version: ${s.version}`);
  lines.push(`storage_key: ${storageKey}`);
  lines.push(`browser_timestamp: ${ts}`);
  lines.push(`last_saved_at: ${s.last_saved_at ?? '—'}`);
  lines.push(`exported_at: ${s.exported_at ?? '—'}`);
  lines.push('');
  lines.push(isEn ? '## Counts' : '## Décomptes');
  lines.push(`offers: ${s.offers}`);
  lines.push(`assets: ${s.assets}`);
  lines.push(`calendar_slots: ${s.calendar_slots}`);
  lines.push(`recommendations: ${s.recommendations}`);
  lines.push(`weekly_plans: ${s.weekly_plans}`);
  lines.push(`feedback_recommendations: ${s.feedback_recommendations}`);
  lines.push(`feedback_history: ${s.feedback_history}`);
  lines.push(`feedback_preferences: ${s.feedback_preferences}`);
  lines.push('');
  lines.push(isEn ? '## Flags' : '## Drapeaux');
  lines.push('mock: true');
  lines.push('real_publishing: false');
  lines.push('real_analytics: false');
  return lines.join('\n');
}

// -----------------------------------------------------------------------------
// Workspace serialize / parse
// -----------------------------------------------------------------------------

/**
 * Serialize an envelope to a stable JSON string. Stamps `exported_at` with the
 * provided ISO timestamp (or "unknown" if the caller does not supply one — we
 * never call new Date() here so the function stays deterministic).
 */
export function serializeWorkspace(
  env: WorkspaceFile,
  exportedAt: string,
): string {
  const stamped: WorkspaceFile = {
    ...emptyArrays(env),
    exported_at: exportedAt,
  };
  return JSON.stringify(stamped, null, 2);
}

/**
 * Parse + validate a JSON string into a typed result. Never throws — returns
 * a discriminated union the UI can branch on.
 */
export function parseWorkspaceImport(rawText: string): WorkspaceImportResult {
  if (typeof rawText !== 'string' || rawText.trim().length === 0) {
    return { ok: false, code: 'empty' };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return { ok: false, code: 'invalid_json' };
  }
  if (typeof parsed !== 'object' || parsed === null) {
    return { ok: false, code: 'not_an_envelope' };
  }
  const obj = parsed as Record<string, unknown>;
  // Reject offer bundles surfacing here — they should use parseOfferImport.
  if (obj.bundle === 'offer') {
    return { ok: false, code: 'wrong_bundle_kind' };
  }
  if (obj.version !== STORAGE_VERSION) {
    return { ok: false, code: 'unsupported_version' };
  }
  try {
    const envelope = validateWorkspaceFile(parsed);
    return { ok: true, envelope, summary: summarizeWorkspace(envelope) };
  } catch {
    return { ok: false, code: 'not_an_envelope' };
  }
}

// -----------------------------------------------------------------------------
// Single-offer bundle
// -----------------------------------------------------------------------------

export function serializeOffer(
  env: WorkspaceFile,
  offerId: string,
  exportedAt: string,
): string | undefined {
  const offer = (env.offers ?? []).find((o) => o.id === offerId);
  if (!offer) return undefined;
  const assets = (env.assets ?? []).filter((a) => a.offerId === offerId);
  const assetIds = new Set(assets.map((a) => a.id));
  const calendar_slots = (env.calendar_slots ?? []).filter((s) => s.offerId === offerId);
  const recommendations = (env.recommendations ?? []).filter((r) => r.offerId === offerId);
  const weekly_plans = (env.weekly_plans ?? []).filter((p) => p.offerId === offerId);
  const planIds = new Set(weekly_plans.map((p) => p.id));
  const feedback_recommendations = (env.feedback_recommendations ?? []).filter(
    (r) => r.offerId === offerId && planIds.has(r.planId),
  );
  const feedback_history = (env.feedback_history ?? []).filter((h) => h.offerId === offerId);
  const feedback_preferences = (env.feedback_preferences ?? []).filter(
    (p) => p.offerId === offerId,
  );
  // Strip orphan asset references from slots so the bundle is self-consistent.
  const cleanCalendarSlots = calendar_slots.map((s) =>
    s.assetId && !assetIds.has(s.assetId) ? { ...s, assetId: undefined } : s,
  );
  const bundle: OfferBundle = {
    bundle: 'offer',
    version: STORAGE_VERSION,
    exported_at: exportedAt,
    offer,
    assets,
    calendar_slots: cleanCalendarSlots,
    recommendations,
    weekly_plans,
    feedback_recommendations,
    feedback_history,
    feedback_preferences,
  };
  return JSON.stringify(bundle, null, 2);
}

export function parseOfferImport(rawText: string): OfferImportResult {
  if (typeof rawText !== 'string' || rawText.trim().length === 0) {
    return { ok: false, code: 'empty' };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return { ok: false, code: 'invalid_json' };
  }
  if (typeof parsed !== 'object' || parsed === null) {
    return { ok: false, code: 'not_an_envelope' };
  }
  const o = parsed as Record<string, unknown>;
  if (o.bundle !== 'offer') {
    return { ok: false, code: 'wrong_bundle_kind' };
  }
  if (o.version !== STORAGE_VERSION) {
    return { ok: false, code: 'unsupported_version' };
  }
  if (!isOfferLike(o.offer)) {
    return { ok: false, code: 'not_an_envelope' };
  }
  const bundle: OfferBundle = {
    bundle: 'offer',
    version: STORAGE_VERSION,
    exported_at: typeof o.exported_at === 'string' ? o.exported_at : '',
    offer: o.offer as Offer,
    assets: arrOf<Asset>(o.assets),
    calendar_slots: arrOf<CalendarSlot>(o.calendar_slots),
    recommendations: arrOf<Recommendation>(o.recommendations),
    weekly_plans: arrOf<WeeklyPlan>(o.weekly_plans),
    feedback_recommendations: arrOf<FeedbackRecommendation>(o.feedback_recommendations),
    feedback_history: arrOf<FeedbackHistoryEntry>(o.feedback_history),
    feedback_preferences: arrOf<FeedbackPreference>(o.feedback_preferences),
  };
  return { ok: true, bundle };
}

// -----------------------------------------------------------------------------
// Merge / replace
// -----------------------------------------------------------------------------

/**
 * Non-destructive merge. Records present in `current` win on id conflicts;
 * new records from `incoming` are appended. Mode `replace` returns `incoming`
 * verbatim (caller bears the risk).
 *
 * Returns a fresh envelope; never mutates either input.
 */
export function mergeWorkspace(
  current: WorkspaceFile,
  incoming: WorkspaceFile,
  mode: WorkspaceMergeMode = 'merge',
): WorkspaceFile {
  if (mode === 'replace') return emptyArrays(incoming);
  const env = emptyArrays(current);
  const inc = emptyArrays(incoming);
  return {
    version: STORAGE_VERSION,
    exported_at: env.exported_at,
    last_saved_at: env.last_saved_at,
    offers: mergeById(env.offers!, inc.offers!),
    assets: mergeById(env.assets!, inc.assets!),
    calendar_slots: mergeById(env.calendar_slots!, inc.calendar_slots!),
    recommendations: mergeById(env.recommendations!, inc.recommendations!),
    weekly_plans: mergeById(env.weekly_plans!, inc.weekly_plans!),
    feedback_recommendations: mergeById(env.feedback_recommendations!, inc.feedback_recommendations!),
    feedback_history: mergeById(env.feedback_history!, inc.feedback_history!),
    feedback_preferences: mergeById(env.feedback_preferences!, inc.feedback_preferences!),
  };
}

/**
 * Merge a single-offer bundle into the current envelope. Behaves like
 * `mergeWorkspace` in 'merge' mode, scoped to the bundle's offer.
 */
export function mergeOfferBundle(
  current: WorkspaceFile,
  bundle: OfferBundle,
): WorkspaceFile {
  const partial: WorkspaceFile = {
    version: STORAGE_VERSION,
    offers: [bundle.offer],
    assets: bundle.assets,
    calendar_slots: bundle.calendar_slots,
    recommendations: bundle.recommendations,
    weekly_plans: bundle.weekly_plans,
    feedback_recommendations: bundle.feedback_recommendations,
    feedback_history: bundle.feedback_history,
    feedback_preferences: bundle.feedback_preferences,
  };
  return mergeWorkspace(current, partial, 'merge');
}

// -----------------------------------------------------------------------------
// Repair — drop orphans and broken references, return the cleanup report.
// -----------------------------------------------------------------------------

export function repairWorkspace(env: WorkspaceFile): {
  repaired: WorkspaceFile;
  report: RepairReport;
} {
  const offers = env.offers ?? [];
  const offerIds = new Set(offers.map((o) => o.id));

  const beforeAssets = (env.assets ?? []).length;
  const assets = (env.assets ?? []).filter((a) => offerIds.has(a.offerId));
  const assetIds = new Set(assets.map((a) => a.id));

  const beforeSlots = (env.calendar_slots ?? []).length;
  const calendar_slots = (env.calendar_slots ?? [])
    .filter((s) => offerIds.has(s.offerId))
    .map((s) =>
      s.assetId && !assetIds.has(s.assetId) ? { ...s, assetId: undefined } : s,
    );

  const beforeRecs = (env.recommendations ?? []).length;
  const recommendations = (env.recommendations ?? []).filter((r) =>
    offerIds.has(r.offerId),
  );

  const beforePlans = (env.weekly_plans ?? []).length;
  const cleanedPlans: WeeklyPlan[] = [];
  let planSlotLinkRepairs = 0;
  for (const p of env.weekly_plans ?? []) {
    if (!offerIds.has(p.offerId)) continue;
    const slots = p.slots.map((s) => {
      if (s.assetId && !assetIds.has(s.assetId)) {
        planSlotLinkRepairs += 1;
        return { ...s, assetId: undefined };
      }
      return s;
    });
    cleanedPlans.push({ ...p, slots });
  }
  const planIds = new Set(cleanedPlans.map((p) => p.id));

  const beforeFbRecs = (env.feedback_recommendations ?? []).length;
  const feedback_recommendations = (env.feedback_recommendations ?? []).filter(
    (r) => offerIds.has(r.offerId) && planIds.has(r.planId),
  );

  const beforeFbHist = (env.feedback_history ?? []).length;
  const feedback_history = (env.feedback_history ?? []).filter((h) =>
    offerIds.has(h.offerId),
  );

  const beforeFbPref = (env.feedback_preferences ?? []).length;
  const feedback_preferences = (env.feedback_preferences ?? []).filter((p) =>
    offerIds.has(p.offerId),
  );

  const calendarSlotLinkRepairs = (env.calendar_slots ?? []).filter(
    (s) => s.assetId && !assetIds.has(s.assetId) && offerIds.has(s.offerId),
  ).length;

  const repaired: WorkspaceFile = {
    version: STORAGE_VERSION,
    exported_at: env.exported_at,
    last_saved_at: env.last_saved_at,
    offers,
    assets,
    calendar_slots,
    recommendations,
    weekly_plans: cleanedPlans,
    feedback_recommendations,
    feedback_history,
    feedback_preferences,
  };
  const report: RepairReport = {
    removed: {
      assets: beforeAssets - assets.length,
      calendar_slots: beforeSlots - calendar_slots.length,
      recommendations: beforeRecs - recommendations.length,
      weekly_plans: beforePlans - cleanedPlans.length,
      feedback_recommendations: beforeFbRecs - feedback_recommendations.length,
      feedback_history: beforeFbHist - feedback_history.length,
      feedback_preferences: beforeFbPref - feedback_preferences.length,
      plan_slot_links: planSlotLinkRepairs,
      calendar_slot_links: calendarSlotLinkRepairs,
    },
  };
  return { repaired, report };
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function emptyArrays(env: WorkspaceFile): WorkspaceFile {
  return {
    version: STORAGE_VERSION,
    exported_at: env.exported_at,
    last_saved_at: env.last_saved_at,
    offers: env.offers ?? [],
    assets: env.assets ?? [],
    calendar_slots: env.calendar_slots ?? [],
    recommendations: env.recommendations ?? [],
    weekly_plans: env.weekly_plans ?? [],
    feedback_recommendations: env.feedback_recommendations ?? [],
    feedback_history: env.feedback_history ?? [],
    feedback_preferences: env.feedback_preferences ?? [],
  };
}

function mergeById<T extends { id: string }>(current: T[], incoming: T[]): T[] {
  const seen = new Set(current.map((x) => x.id));
  const additions = incoming.filter((x) => !seen.has(x.id));
  return [...current, ...additions];
}

function isOfferLike(v: unknown): boolean {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    typeof o.name === 'string' &&
    typeof o.status === 'string' &&
    typeof o.brief === 'object' &&
    o.brief !== null
  );
}

function arrOf<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}
