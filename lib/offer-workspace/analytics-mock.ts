/**
 * Analytics — deterministic mock series.
 *
 * Pure functions only. No fetch, no real data.
 * Hash(offer.id) seeds a 32-bit Mulberry32 PRNG so the same offer always
 * yields the same series across reloads / browsers.
 *
 * AI-008b — every value is fake. The UI badges this clearly.
 */

import type { Asset, CalendarSlot, Offer } from './types';

// -----------------------------------------------------------------------------
// Determinism: hash → PRNG
// -----------------------------------------------------------------------------

function hash32(s: string): number {
  // FNV-1a-ish, 32-bit. Sufficient for stable seeding.
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// -----------------------------------------------------------------------------
// Public types
// -----------------------------------------------------------------------------

export const PERIODS = ['7d', '30d', '90d'] as const;
export type Period = (typeof PERIODS)[number];

export const PERIOD_DAYS: Record<Period, number> = { '7d': 7, '30d': 30, '90d': 90 };

export interface AnalyticsKpi {
  impressions: number;
  clicks: number;
  replies: number;
  conversions: number;
  ctrPct: number;        // 0..100, 2 decimals
  conversionRatePct: number; // 0..100, 2 decimals
}

export interface PeriodKpis extends AnalyticsKpi {
  period: Period;
  /** Delta vs the previous period of equal length (signed). */
  delta: AnalyticsKpi;
  /** Same as delta but expressed as percentage of previous (signed, can be 0). */
  deltaPct: AnalyticsKpi;
  /** Per-day series (length = period days), aligned end-of-period. */
  series: { impressions: number[]; clicks: number[]; replies: number[]; conversions: number[] };
}

export interface BreakdownRow {
  key: string;
  label: string;
  kpi: AnalyticsKpi;
}

// -----------------------------------------------------------------------------
// Core: per-day series for an offer
// -----------------------------------------------------------------------------

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Generate a deterministic per-day series for a metric.
 * Values are positive integers with mild trend + noise.
 * Bounds depend on the metric "intensity" (impressions >> conversions).
 */
function generateSeries(
  rng: () => number,
  days: number,
  base: number,
  noise: number,
  trend: number,
): number[] {
  const out: number[] = [];
  for (let i = 0; i < days; i++) {
    // Linear trend + bounded gaussian-ish noise
    const t = i / Math.max(1, days - 1);
    const trended = base * (1 + trend * t);
    const jitter = (rng() - 0.5) * 2 * noise * trended;
    const v = Math.max(0, Math.round(trended + jitter));
    out.push(v);
  }
  return out;
}

function sum(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}

function deltaPct(curr: number, prev: number): number {
  if (prev === 0) return curr === 0 ? 0 : 100;
  return round2(((curr - prev) / prev) * 100);
}

// -----------------------------------------------------------------------------
// Per-offer KPIs
// -----------------------------------------------------------------------------

/**
 * Returns 2 × period-length series (current + previous period) for an offer.
 * The seed is derived from `offer.id` so the same offer always returns the
 * same numbers — even across reloads, browsers, and CI environments.
 *
 * Values are biased by the offer's confidence_score: higher confidence →
 * higher base impressions and conversion rate.
 */
export function computeOfferKpisMock(offer: Offer, period: Period): PeriodKpis {
  const days = PERIOD_DAYS[period];
  const totalDays = days * 2;
  const seed = hash32(offer.id) ^ hash32(period);
  const rng = mulberry32(seed);

  // Bias by confidence_score (clamped 30..90 → 1.0..2.0 multiplier)
  const conf = clamp(offer.confidence_score ?? 60, 30, 90);
  const confMultiplier = 1 + (conf - 30) / 60;

  const baseImp = 80 * confMultiplier;
  const baseClick = baseImp * 0.04;       // ~4% CTR baseline
  const baseReply = baseClick * 0.18;     // ~18% replies-to-clicks
  const baseConv = baseClick * 0.06;      // ~6% conversion-to-clicks

  const impSeries = generateSeries(rng, totalDays, baseImp, 0.18, 0.12);
  const clickSeries = generateSeries(rng, totalDays, baseClick, 0.22, 0.18);
  const replySeries = generateSeries(rng, totalDays, baseReply, 0.30, 0.10);
  const convSeries = generateSeries(rng, totalDays, baseConv, 0.40, 0.15);

  // Slice: first half = previous period, second half = current.
  const prevImp = impSeries.slice(0, days);
  const currImp = impSeries.slice(days);
  const prevClick = clickSeries.slice(0, days);
  const currClick = clickSeries.slice(days);
  const prevReply = replySeries.slice(0, days);
  const currReply = replySeries.slice(days);
  const prevConv = convSeries.slice(0, days);
  const currConv = convSeries.slice(days);

  const kpi = (
    imp: number[],
    cl: number[],
    rep: number[],
    cv: number[],
  ): AnalyticsKpi => {
    const i = sum(imp);
    const c = sum(cl);
    const r = sum(rep);
    const v = sum(cv);
    return {
      impressions: i,
      clicks: c,
      replies: r,
      conversions: v,
      ctrPct: i > 0 ? round2((c / i) * 100) : 0,
      conversionRatePct: c > 0 ? round2((v / c) * 100) : 0,
    };
  };

  const curr = kpi(currImp, currClick, currReply, currConv);
  const prev = kpi(prevImp, prevClick, prevReply, prevConv);

  const delta: AnalyticsKpi = {
    impressions: curr.impressions - prev.impressions,
    clicks: curr.clicks - prev.clicks,
    replies: curr.replies - prev.replies,
    conversions: curr.conversions - prev.conversions,
    ctrPct: round2(curr.ctrPct - prev.ctrPct),
    conversionRatePct: round2(curr.conversionRatePct - prev.conversionRatePct),
  };
  const deltaP: AnalyticsKpi = {
    impressions: deltaPct(curr.impressions, prev.impressions),
    clicks: deltaPct(curr.clicks, prev.clicks),
    replies: deltaPct(curr.replies, prev.replies),
    conversions: deltaPct(curr.conversions, prev.conversions),
    ctrPct: deltaPct(curr.ctrPct, prev.ctrPct),
    conversionRatePct: deltaPct(curr.conversionRatePct, prev.conversionRatePct),
  };

  return {
    period,
    ...curr,
    delta,
    deltaPct: deltaP,
    series: {
      impressions: currImp,
      clicks: currClick,
      replies: currReply,
      conversions: currConv,
    },
  };
}

// -----------------------------------------------------------------------------
// Breakdowns
// -----------------------------------------------------------------------------

/**
 * Distribute a parent KPI across N keys deterministically. Each key gets a
 * share computed from a per-key seed; shares always sum to the parent total.
 */
function distribute(
  parent: AnalyticsKpi,
  seedRoot: string,
  keys: { key: string; label: string }[],
): BreakdownRow[] {
  if (keys.length === 0) return [];
  const weights = keys.map((k) => {
    const r = mulberry32(hash32(`${seedRoot}|${k.key}`))();
    return 0.25 + r * 0.75; // 0.25..1.0
  });
  const w = sum(weights);
  return keys.map((k, i) => {
    const share = weights[i]! / w;
    const child: AnalyticsKpi = {
      impressions: Math.round(parent.impressions * share),
      clicks: Math.round(parent.clicks * share),
      replies: Math.round(parent.replies * share),
      conversions: Math.round(parent.conversions * share),
      ctrPct: round2(parent.ctrPct * (0.7 + 0.6 * weights[i]! / Math.max(...weights))),
      conversionRatePct: round2(parent.conversionRatePct * (0.7 + 0.6 * weights[i]! / Math.max(...weights))),
    };
    return { key: k.key, label: k.label, kpi: child };
  });
}

export function breakdownByChannel(
  offer: Offer,
  parent: AnalyticsKpi,
  channels: string[],
): BreakdownRow[] {
  const set = Array.from(new Set(channels.length > 0 ? channels : ['linkedin']));
  return distribute(
    parent,
    `${offer.id}|channel`,
    set.map((c) => ({ key: c, label: c })),
  );
}

export function breakdownByAsset(
  offer: Offer,
  parent: AnalyticsKpi,
  assets: Asset[],
): BreakdownRow[] {
  if (assets.length === 0) return [];
  return distribute(
    parent,
    `${offer.id}|asset`,
    assets.map((a) => ({ key: a.id, label: `${a.kind} · ${a.id.slice(-6)}` })),
  );
}

export function breakdownByDimension(
  offer: Offer,
  parent: AnalyticsKpi,
  dimensions: string[],
): BreakdownRow[] {
  if (dimensions.length === 0) return [];
  return distribute(
    parent,
    `${offer.id}|dim`,
    dimensions.map((d) => ({ key: d, label: d })),
  );
}

// -----------------------------------------------------------------------------
// Helpers used by the workspace overview (mini sparkline + best channel)
// -----------------------------------------------------------------------------

export function bestChannel(offer: Offer, slots: CalendarSlot[]): string | undefined {
  // Mock signal: most-frequent channel across calendar slots. Falls back to
  // brief.platforms[0]. Pure derivation — no analytics call.
  if (slots.length > 0) {
    const counts = new Map<string, number>();
    for (const s of slots) counts.set(s.channel, (counts.get(s.channel) ?? 0) + 1);
    let best = '';
    let max = 0;
    for (const [k, v] of counts) {
      if (v > max) {
        max = v;
        best = k;
      }
    }
    if (best) return best;
  }
  return offer.brief.platforms?.[0];
}

export function nextActionMock(
  offer: Offer,
  assets: Asset[],
  slots: CalendarSlot[],
  language: 'fr' | 'en' = 'fr',
): string {
  const hasProofs = (offer.brief.proofPoints?.length ?? 0) > 0;
  const approved = assets.filter((a) => a.status === 'approved').length;
  const planned = slots.filter((s) => s.status === 'planned').length;
  if (!hasProofs) return language === 'en' ? 'Add a proof point' : 'Ajouter une preuve';
  if (approved === 0) return language === 'en' ? 'Approve a first asset' : 'Approuver un premier asset';
  if (planned === 0) return language === 'en' ? 'Schedule a slot' : 'Planifier un créneau';
  return language === 'en' ? 'Mark a slot as sent' : "Marquer un créneau envoyé";
}
