/**
 * JSON export / import for the workspace file.
 *
 * Browser-only — uses Blob + a synthetic <a> link. No package dependency.
 * Pure parse helpers (`parseImported`, `validateWorkspaceFile`) are usable
 * outside the browser (tests).
 */

import {
  STORAGE_VERSION,
  WorkspaceStorageError,
  type AdDiffusionSelection,
  type AdUnit,
  type Asset,
  type CalendarSlot,
  type FeedbackHistoryEntry,
  type FeedbackPreference,
  type FeedbackRecommendation,
  type Offer,
  type Recommendation,
  type WeeklyPlan,
  type WorkspaceFile,
} from './types';

// -----------------------------------------------------------------------------
// Validation (pure)
// -----------------------------------------------------------------------------

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string');
}

function isOffer(v: unknown): v is Offer {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    typeof o.name === 'string' &&
    typeof o.status === 'string' &&
    typeof o.goal === 'string' &&
    typeof o.language === 'string' &&
    typeof o.createdAt === 'string' &&
    typeof o.updatedAt === 'string' &&
    typeof o.brief === 'object'
  );
}

function isAsset(v: unknown): v is Asset {
  if (typeof v !== 'object' || v === null) return false;
  const a = v as Record<string, unknown>;
  return (
    typeof a.id === 'string' &&
    typeof a.offerId === 'string' &&
    typeof a.kind === 'string' &&
    typeof a.body === 'string' &&
    isStringArray(a.dimensions) &&
    typeof a.status === 'string' &&
    typeof a.source === 'string' &&
    typeof a.createdAt === 'string'
  );
}

function isSlot(v: unknown): v is CalendarSlot {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as Record<string, unknown>;
  return (
    typeof s.id === 'string' &&
    typeof s.offerId === 'string' &&
    typeof s.channel === 'string' &&
    typeof s.scheduledAt === 'string' &&
    typeof s.status === 'string' &&
    typeof s.createdAt === 'string'
  );
}

function isRecommendation(v: unknown): v is Recommendation {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    typeof r.offerId === 'string' &&
    typeof r.ruleId === 'string' &&
    typeof r.priority === 'string' &&
    typeof r.title === 'string' &&
    typeof r.description === 'string' &&
    typeof r.status === 'string'
  );
}

function isWeeklyPlan(v: unknown): v is WeeklyPlan {
  if (typeof v !== 'object' || v === null) return false;
  const p = v as Record<string, unknown>;
  return (
    typeof p.id === 'string' &&
    typeof p.offerId === 'string' &&
    typeof p.weekStart === 'string' &&
    typeof p.goal === 'string' &&
    Array.isArray(p.slots) &&
    typeof p.createdAt === 'string' &&
    typeof p.updatedAt === 'string'
  );
}

function isFeedbackRecommendation(v: unknown): v is FeedbackRecommendation {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    typeof r.offerId === 'string' &&
    typeof r.planId === 'string' &&
    typeof r.ruleId === 'string' &&
    typeof r.action === 'string' &&
    typeof r.why === 'string' &&
    typeof r.impact === 'string' &&
    typeof r.effort === 'string' &&
    typeof r.confidence === 'string' &&
    typeof r.status === 'string'
  );
}

function isFeedbackHistoryEntry(v: unknown): v is FeedbackHistoryEntry {
  if (typeof v !== 'object' || v === null) return false;
  const h = v as Record<string, unknown>;
  return (
    typeof h.id === 'string' &&
    typeof h.offerId === 'string' &&
    typeof h.date === 'string' &&
    typeof h.recommendation === 'string' &&
    typeof h.cause === 'string' &&
    typeof h.actionApplied === 'string' &&
    typeof h.expectedResult === 'string' &&
    typeof h.status === 'string'
  );
}

function isFeedbackPreference(v: unknown): v is FeedbackPreference {
  if (typeof v !== 'object' || v === null) return false;
  const p = v as Record<string, unknown>;
  return (
    typeof p.id === 'string' &&
    typeof p.offerId === 'string' &&
    typeof p.key === 'string' &&
    (typeof p.value === 'string' ||
      typeof p.value === 'number' ||
      typeof p.value === 'boolean') &&
    typeof p.createdAt === 'string'
  );
}

function isAdUnit(v: unknown): v is AdUnit {
  if (typeof v !== 'object' || v === null) return false;
  const a = v as Record<string, unknown>;
  return (
    typeof a.id === 'string' &&
    typeof a.offerId === 'string' &&
    typeof a.templateId === 'string' &&
    typeof a.type === 'string' &&
    typeof a.format === 'string' &&
    typeof a.channel === 'string' &&
    typeof a.name === 'string' &&
    typeof a.hook === 'string' &&
    typeof a.copy === 'string' &&
    typeof a.cta === 'string' &&
    typeof a.status === 'string' &&
    typeof a.ready_score === 'number' &&
    typeof a.checklist === 'object' &&
    typeof a.derivedAt === 'string'
  );
}

function isAdDiffusionSelection(v: unknown): v is AdDiffusionSelection {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as Record<string, unknown>;
  return (
    typeof s.id === 'string' &&
    typeof s.offerId === 'string' &&
    typeof s.adId === 'string' &&
    typeof s.selectedAt === 'string'
  );
}

export function validateWorkspaceFile(value: unknown): WorkspaceFile {
  if (typeof value !== 'object' || value === null) {
    throw new WorkspaceStorageError('parse_error');
  }
  const v = value as Record<string, unknown>;
  if (v.version !== STORAGE_VERSION) {
    throw new WorkspaceStorageError('incompatible_version');
  }
  const offers = Array.isArray(v.offers) ? v.offers.filter(isOffer) : [];
  const assets = Array.isArray(v.assets) ? v.assets.filter(isAsset) : [];
  const calendar_slots = Array.isArray(v.calendar_slots) ? v.calendar_slots.filter(isSlot) : [];
  const recommendations = Array.isArray(v.recommendations)
    ? v.recommendations.filter(isRecommendation)
    : [];
  const weekly_plans = Array.isArray(v.weekly_plans)
    ? v.weekly_plans.filter(isWeeklyPlan)
    : [];
  const feedback_recommendations = Array.isArray(v.feedback_recommendations)
    ? v.feedback_recommendations.filter(isFeedbackRecommendation)
    : [];
  const feedback_history = Array.isArray(v.feedback_history)
    ? v.feedback_history.filter(isFeedbackHistoryEntry)
    : [];
  const feedback_preferences = Array.isArray(v.feedback_preferences)
    ? v.feedback_preferences.filter(isFeedbackPreference)
    : [];
  const ad_units = Array.isArray(v.ad_units) ? v.ad_units.filter(isAdUnit) : [];
  const ad_diffusion_selections = Array.isArray(v.ad_diffusion_selections)
    ? v.ad_diffusion_selections.filter(isAdDiffusionSelection)
    : [];
  return {
    version: STORAGE_VERSION,
    exported_at: typeof v.exported_at === 'string' ? v.exported_at : undefined,
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
  };
}

export function parseImported(rawText: string): WorkspaceFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new WorkspaceStorageError('parse_error');
  }
  return validateWorkspaceFile(parsed);
}

// -----------------------------------------------------------------------------
// Browser-only IO
// -----------------------------------------------------------------------------

export function downloadJson(file: WorkspaceFile, filename = 'offer-workspace.json'): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined') return;
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function readUploadedFile(file: File): Promise<WorkspaceFile> {
  const text = await file.text();
  return parseImported(text);
}
