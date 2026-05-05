'use client';

/**
 * React hook around the workspace store. Hydration-safe: returns an empty
 * state on the server / first client render, then loads from localStorage
 * on mount via useEffect.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createWorkspaceStore,
  type WorkspaceStore,
} from '@/lib/offer-workspace/store';
import type {
  Asset,
  CalendarSlot,
  Offer,
  OfferStatus,
  Recommendation,
  WorkspaceFile,
} from '@/lib/offer-workspace/types';

export interface WorkspaceState {
  hydrated: boolean;
  offers: Offer[];
  assets: Asset[];
  slots: CalendarSlot[];
  recommendations: Recommendation[];
}

export interface UseWorkspaceStoreApi extends WorkspaceState {
  refresh: () => void;
  store: WorkspaceStore;
}

export function useWorkspaceStore(): UseWorkspaceStoreApi {
  const storeRef = useRef<WorkspaceStore | null>(null);
  if (!storeRef.current) storeRef.current = createWorkspaceStore();
  const store = storeRef.current;

  const [hydrated, setHydrated] = useState(false);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [slots, setSlots] = useState<CalendarSlot[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  const refresh = useCallback(() => {
    const file = store.exportAll();
    setOffers(file.offers);
    setAssets(file.assets);
    setSlots(file.calendar_slots ?? []);
    setRecommendations(file.recommendations ?? []);
  }, [store]);

  useEffect(() => {
    refresh();
    setHydrated(true);
  }, [refresh]);

  return useMemo(
    () => ({ hydrated, offers, assets, slots, recommendations, refresh, store }),
    [hydrated, offers, assets, slots, recommendations, refresh, store],
  );
}

export type { Offer, Asset, CalendarSlot, Recommendation, OfferStatus, WorkspaceFile };
