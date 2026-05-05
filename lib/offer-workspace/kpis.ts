/**
 * Pure KPI derivation from a list of offers + assets.
 * No I/O. No randomness. Deterministic.
 */

import type { Asset, Dimension, Offer, OfferStatus } from './types';

export interface OfferWorkspaceKpis {
  total: number;
  byStatus: Record<OfferStatus, number>;
  recent7d: number;
  avgConfidence: number; // 0..100, 0 if no offers
  withProofs: number; // count of offers with at least 1 proof point
  withProofsPct: number; // 0..100
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function computeOfferKpis(
  offers: Offer[],
  refDate: Date = new Date(),
): OfferWorkspaceKpis {
  const byStatus: Record<OfferStatus, number> = {
    draft: 0,
    ready: 0,
    scheduled_mock: 0,
    active_mock: 0,
    archived: 0,
  };
  let confidenceSum = 0;
  let confidenceCount = 0;
  let recent7d = 0;
  let withProofs = 0;
  const refMs = refDate.getTime();

  for (const o of offers) {
    byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;
    if (typeof o.confidence_score === 'number') {
      confidenceSum += o.confidence_score;
      confidenceCount += 1;
    }
    if (refMs - new Date(o.createdAt).getTime() <= SEVEN_DAYS_MS) {
      recent7d += 1;
    }
    if ((o.brief.proofPoints?.length ?? 0) > 0) {
      withProofs += 1;
    }
  }

  return {
    total: offers.length,
    byStatus,
    recent7d,
    avgConfidence: confidenceCount > 0 ? Math.round(confidenceSum / confidenceCount) : 0,
    withProofs,
    withProofsPct: offers.length > 0 ? Math.round((withProofs / offers.length) * 100) : 0,
  };
}

// -----------------------------------------------------------------------------
// Asset roll-ups
// -----------------------------------------------------------------------------

export interface AssetCountsByDimension {
  /** Asset count per dimension. An asset can contribute to multiple dimensions. */
  perDimension: Record<Dimension, number>;
  /** Asset count per kind. Each asset belongs to exactly one kind. */
  perKind: Record<string, number>;
  total: number;
}

export function computeAssetRollups(assets: Asset[]): AssetCountsByDimension {
  const perDimension: Record<Dimension, number> = {
    offer: 0,
    promise: 0,
    proof: 0,
    angle: 0,
    objection: 0,
    cta: 0,
    asset: 0,
    channel: 0,
  };
  const perKind: Record<string, number> = {};
  for (const a of assets) {
    perKind[a.kind] = (perKind[a.kind] ?? 0) + 1;
    for (const d of a.dimensions) {
      perDimension[d] = (perDimension[d] ?? 0) + 1;
    }
  }
  return { perDimension, perKind, total: assets.length };
}

// -----------------------------------------------------------------------------
// Filter helpers (also pure, used by table & kanban)
// -----------------------------------------------------------------------------

export interface OfferFilter {
  query?: string;
  status?: OfferStatus[];
  goal?: Offer['goal'][];
  channel?: string;
  language?: 'fr' | 'en';
  minConfidence?: number;
}

export function filterOffers(offers: Offer[], f: OfferFilter): Offer[] {
  const q = f.query?.trim().toLowerCase();
  return offers.filter((o) => {
    if (f.status && f.status.length > 0 && !f.status.includes(o.status)) return false;
    if (f.goal && f.goal.length > 0 && !f.goal.includes(o.goal)) return false;
    if (f.language && o.language !== f.language) return false;
    if (f.channel && !(o.brief.platforms ?? []).includes(f.channel)) return false;
    if (typeof f.minConfidence === 'number' && (o.confidence_score ?? 0) < f.minConfidence)
      return false;
    if (q) {
      const hay = `${o.name} ${o.brief.businessName} ${o.brief.offer} ${o.brief.targetAudience ?? ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export type SortDir = 'asc' | 'desc';
export type SortKey = 'updatedAt' | 'createdAt' | 'name' | 'confidence_score' | 'status';

export function sortOffers(offers: Offer[], key: SortKey, dir: SortDir = 'desc'): Offer[] {
  const factor = dir === 'asc' ? 1 : -1;
  return [...offers].sort((a, b) => {
    const av = a[key] ?? '';
    const bv = b[key] ?? '';
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * factor;
    return String(av).localeCompare(String(bv)) * factor;
  });
}
