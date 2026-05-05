'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, X, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  deriveRecommendations,
} from '@/lib/offer-workspace/recommendations';
import type {
  Asset,
  CalendarSlot,
  Offer,
  Recommendation,
  RecommendationPriority,
  RecommendationStatus,
} from '@/lib/offer-workspace/types';
import type { WorkspaceStore } from '@/lib/offer-workspace/store';

interface RecommendationsTabProps {
  offer: Offer;
  assets: Asset[];
  slots: CalendarSlot[];
  language: 'fr' | 'en';
  store: WorkspaceStore;
  onUpdate: () => void;
}

const PRIO_TONE: Record<RecommendationPriority, string> = {
  high: 'border-amber-400/40 bg-amber-400/5 text-amber-400',
  medium: 'border-brand/40 bg-brand/10 text-fg',
  low: 'border-border bg-bg-elevated text-fg-muted',
};

const PRIO_LABEL: Record<RecommendationPriority, { fr: string; en: string }> = {
  high: { fr: 'Priorité haute', en: 'High priority' },
  medium: { fr: 'Priorité moyenne', en: 'Medium priority' },
  low: { fr: 'Priorité basse', en: 'Low priority' },
};

const STATUS_LABEL: Record<RecommendationStatus, { fr: string; en: string }> = {
  todo: { fr: 'À traiter', en: 'To do' },
  applied_mock: { fr: 'Appliquée (mock)', en: 'Applied (mock)' },
  dismissed: { fr: 'Ignorée', en: 'Dismissed' },
};

export function RecommendationsTab({
  offer,
  assets,
  slots,
  language,
  store,
  onUpdate,
}: RecommendationsTabProps) {
  const labels = language === 'en' ? L_EN : L_FR;
  const derived = useMemo(
    () => deriveRecommendations(offer, assets, slots, language),
    [offer, assets, slots, language],
  );

  useEffect(() => {
    // Sync derived recos into the store, preserving previous user statuses.
    store.upsertRecommendations(offer.id, derived);
  }, [derived, offer.id, store]);

  const stored = store.listRecommendationsByOffer(offer.id);
  // Preserve order from the rules engine
  const ordered = derived.map((d) => stored.find((s) => s.id === d.id) ?? d);

  if (ordered.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border bg-bg-elevated/40 p-10 text-center">
        <Lightbulb size={20} className="mx-auto mb-3 text-fg-subtle" />
        <h3 className="font-display text-lg font-semibold text-fg">{labels.empty}</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-fg-muted">{labels.emptyBody}</p>
      </div>
    );
  }

  const visible = ordered.filter((r) => r.status !== 'dismissed');
  const dismissed = ordered.filter((r) => r.status === 'dismissed');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
          {visible.length} / {ordered.length} {labels.shown}
        </p>
        <span className="rounded-full border border-amber-400/40 bg-amber-400/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-amber-400">
          {labels.mockBadge}
        </span>
      </div>

      <ul className="space-y-2">
        {visible.map((r) => (
          <RecoCard
            key={r.id}
            reco={r}
            language={language}
            onApply={() => {
              store.setRecommendationStatus(r.id, 'applied_mock');
              onUpdate();
            }}
            onDismiss={() => {
              store.setRecommendationStatus(r.id, 'dismissed');
              onUpdate();
            }}
          />
        ))}
      </ul>

      {dismissed.length > 0 && (
        <details className="rounded-md border border-border bg-bg-elevated/40 p-3">
          <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-wider text-fg-subtle hover:text-fg">
            {labels.dismissedSection} ({dismissed.length})
          </summary>
          <ul className="mt-3 space-y-2">
            {dismissed.map((r) => (
              <RecoCard
                key={r.id}
                reco={r}
                language={language}
                onApply={() => {
                  store.setRecommendationStatus(r.id, 'todo');
                  onUpdate();
                }}
                onDismiss={() => {}}
                muted
              />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function RecoCard({
  reco,
  language,
  onApply,
  onDismiss,
  muted,
}: {
  reco: Recommendation;
  language: 'fr' | 'en';
  onApply: () => void;
  onDismiss: () => void;
  muted?: boolean;
}) {
  const labels = language === 'en' ? L_EN : L_FR;
  return (
    <li
      className={cn(
        'rounded-md border bg-bg-elevated p-3',
        muted ? 'opacity-60' : 'border-border',
      )}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span
          className={cn(
            'rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider',
            PRIO_TONE[reco.priority],
          )}
        >
          {PRIO_LABEL[reco.priority][language]}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
          {STATUS_LABEL[reco.status][language]}
        </span>
      </div>
      <h4 className="font-display text-base font-semibold text-fg">{reco.title}</h4>
      <p className="mt-1 text-sm text-fg-muted">{reco.description}</p>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        {reco.cta && (
          <Link
            href={reco.cta.href ?? '#'}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-bg px-2 py-1 font-mono text-[11px] uppercase tracking-wider text-fg-muted hover:text-fg"
          >
            {reco.cta.label}
            <ArrowRight size={11} />
          </Link>
        )}
        {reco.status !== 'applied_mock' && !muted && (
          <button
            type="button"
            onClick={onApply}
            className="inline-flex items-center gap-1 rounded-md border border-emerald-400/40 bg-emerald-400/5 px-2 py-1 font-mono text-[11px] uppercase tracking-wider text-emerald-400 hover:text-emerald-300"
          >
            <Check size={11} /> {labels.apply}
          </button>
        )}
        {!muted && reco.status !== 'dismissed' && (
          <button
            type="button"
            onClick={onDismiss}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-bg px-2 py-1 font-mono text-[11px] uppercase tracking-wider text-fg-muted hover:text-fg"
          >
            <X size={11} /> {labels.dismiss}
          </button>
        )}
        {muted && (
          <button
            type="button"
            onClick={onApply}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-bg px-2 py-1 font-mono text-[11px] uppercase tracking-wider text-fg-muted hover:text-fg"
          >
            {labels.restore}
          </button>
        )}
      </div>
    </li>
  );
}

const L_FR = {
  empty: 'Pas de recommandation pour cette offre',
  emptyBody: "Tu peux remplir le brief plus en détail (preuves, plateformes) ou générer plus d'assets pour faire émerger des suggestions.",
  shown: 'visibles',
  apply: 'Appliquer (mock)',
  dismiss: 'Ignorer',
  restore: 'Restaurer',
  dismissedSection: 'Recommandations ignorées',
  mockBadge: 'MOCK V1',
};
const L_EN = {
  empty: 'No recommendation for this offer',
  emptyBody: 'You can fill the brief in more detail (proofs, platforms) or generate more assets to surface suggestions.',
  shown: 'shown',
  apply: 'Apply (mock)',
  dismiss: 'Dismiss',
  restore: 'Restore',
  dismissedSection: 'Dismissed recommendations',
  mockBadge: 'MOCK V1',
};
