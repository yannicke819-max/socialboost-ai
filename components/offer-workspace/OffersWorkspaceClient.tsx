'use client';

import { useMemo, useState } from 'react';
import { LayoutGrid, Rows3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { useWorkspaceStore } from './useWorkspaceStore';
import { KpiBar } from './KpiBar';
import { OfferFilters, INITIAL_FILTERS, type FiltersValue } from './OfferFilters';
import { OfferKanban } from './OfferKanban';
import { OfferTable } from './OfferTable';
import { EmptyStateLoadExamples } from './EmptyStateLoadExamples';
import { ExportImport } from './ExportImport';
import { HowItWorksBanner } from './HowItWorksBanner';
import { BestActionCard } from './BestActionCard';
import { computeOfferKpis, filterOffers } from '@/lib/offer-workspace/kpis';
import { DEMO_SEED } from '@/lib/offer-workspace/seed';
import type { OfferStatus } from '@/lib/offer-workspace/types';

type ViewMode = 'kanban' | 'table';

interface OffersWorkspaceClientProps {
  language?: 'fr' | 'en';
}

export function OffersWorkspaceClient({ language = 'fr' }: OffersWorkspaceClientProps) {
  const { hydrated, offers, assets, slots, refresh, store } = useWorkspaceStore();
  const [filters, setFilters] = useState<FiltersValue>(INITIAL_FILTERS);
  const [view, setView] = useState<ViewMode>('kanban');

  const filtered = useMemo(
    () =>
      filterOffers(offers, {
        query: filters.query,
        statuses: filters.statuses.length > 0 ? filters.statuses : undefined,
        goals: filters.goals.length > 0 ? filters.goals : undefined,
        channel: filters.channel || undefined,
        minConfidence: filters.minConfidence > 0 ? filters.minConfidence : undefined,
      } as Parameters<typeof filterOffers>[1]),
    [offers, filters],
  );

  const kpis = useMemo(() => computeOfferKpis(offers), [offers]);

  const handleStatusChange = (id: string, next: OfferStatus) => {
    store.setStatus(id, next);
    refresh();
  };

  const loadDemoSeed = () => {
    const file = store.exportAll();
    store.replaceAll({
      ...file,
      offers: [...DEMO_SEED.offers, ...file.offers],
      assets: [...DEMO_SEED.assets, ...file.assets],
    });
    refresh();
  };

  const labels = language === 'en' ? L_EN : L_FR;
  const showEmpty = hydrated && offers.length === 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
            Offer Workspace · v1
          </p>
          <h1 className="font-display text-3xl font-semibold italic leading-tight text-fg sm:text-4xl">
            {labels.title}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-fg-muted">{labels.subtitle}</p>
        </div>
        <ExportImport
          language={language}
          onExport={() => store.exportAll()}
          onImport={(file) => {
            store.replaceAll(file);
            refresh();
          }}
        />
      </header>

      {!hydrated ? (
        <SkeletonShell />
      ) : showEmpty ? (
        <EmptyStateLoadExamples
          language={language}
          onLoad={loadDemoSeed}
          onImport={() => {
            // The ExportImport above is already in the header. Nothing else.
          }}
        />
      ) : (
        <>
          <BestActionCard offers={offers} assets={assets} slots={slots} language={language} />
          <HowItWorksBanner language={language} />
          <KpiBar kpis={kpis} language={language} />
          <OfferFilters value={filters} onChange={setFilters} language={language} />
          <div className="flex items-center justify-between gap-2">
            <p className="font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
              {filtered.length} / {offers.length} {labels.shown}
            </p>
            <div className="flex items-center gap-1 rounded-md border border-border bg-bg-elevated p-0.5">
              <ViewToggle
                active={view === 'kanban'}
                onClick={() => setView('kanban')}
                label="Kanban"
                icon={<LayoutGrid size={13} />}
              />
              <ViewToggle
                active={view === 'table'}
                onClick={() => setView('table')}
                label="Table"
                icon={<Rows3 size={13} />}
              />
            </div>
          </div>
          {view === 'kanban' ? (
            <OfferKanban
              offers={filtered}
              language={language}
              onChangeStatus={handleStatusChange}
              assets={assets}
              slots={slots}
            />
          ) : (
            <OfferTable offers={filtered} language={language} />
          )}
        </>
      )}
    </div>
  );
}

function ViewToggle({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded px-2 py-1 font-mono text-[11px] uppercase tracking-wider transition',
        active ? 'bg-bg text-fg' : 'text-fg-muted hover:text-fg',
      )}
      aria-pressed={active}
    >
      {icon} {label}
    </button>
  );
}

function SkeletonShell() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-md bg-bg-elevated/60" />
        ))}
      </div>
      <div className="h-12 animate-pulse rounded-md bg-bg-elevated/60" />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-md bg-bg-elevated/60" />
        ))}
      </div>
    </div>
  );
}

const L_FR = {
  title: 'Vos offres, dans un seul cadre.',
  subtitle:
    "Crée, suit et active tes offres. Le dashboard mesure la performance par offre, promesse, preuve, angle, objection, CTA, asset et canal.",
  shown: 'visibles',
};
const L_EN = {
  title: 'Your offers, one frame.',
  subtitle:
    'Create, track and ship your offers. The dashboard measures performance across offer, promise, proof, angle, objection, CTA, asset and channel.',
  shown: 'shown',
};
