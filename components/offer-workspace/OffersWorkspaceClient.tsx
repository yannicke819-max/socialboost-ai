'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { LayoutGrid, Rows3, Sparkles } from 'lucide-react';
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
import { WorkspaceBackupPanel } from './WorkspaceBackupPanel';
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
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/ai/onboarding"
            className="inline-flex items-center gap-1.5 rounded-md border border-brand/60 bg-brand/15 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-fg transition hover:border-brand hover:bg-brand/25 focus-visible:ring-2 focus-visible:ring-brand"
          >
            <Sparkles size={12} /> {labels.heroCta}
          </Link>
          <ExportImport
            language={language}
            onExport={() => store.exportAll()}
            onImport={(file) => {
              store.replaceAll(file);
              refresh();
            }}
          />
        </div>
      </header>

      {hydrated && (
        <WorkspaceBackupPanel store={store} refresh={refresh} language={language} />
      )}

      {!hydrated ? (
        <SkeletonShell />
      ) : showEmpty ? (
        <>
          <OnboardingEmptyState language={language} />
          <EmptyStateLoadExamples
            language={language}
            onLoad={loadDemoSeed}
            onImport={() => {
              // The ExportImport above is already in the header. Nothing else.
            }}
          />
        </>
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

function OnboardingEmptyState({ language }: { language: 'fr' | 'en' }) {
  const labels = language === 'en' ? L_EN : L_FR;
  return (
    <section className="rounded-md border border-brand/40 bg-brand/5 p-5 sm:p-6">
      <p className="font-mono text-[11px] uppercase tracking-wider text-brand">
        {labels.onboardingEyebrow}
      </p>
      <h2 className="mt-1 font-display text-2xl font-semibold italic leading-tight text-fg">
        {labels.onboardingTitle}
      </h2>
      <p className="mt-1 max-w-xl text-sm text-fg-muted">{labels.onboardingBody}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link
          href="/ai/onboarding"
          className="inline-flex items-center gap-1.5 rounded-md border border-brand/60 bg-brand/15 px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-fg transition hover:border-brand hover:bg-brand/25 focus-visible:ring-2 focus-visible:ring-brand"
        >
          <Sparkles size={12} /> {labels.onboardingCta}
        </Link>
      </div>
    </section>
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
  heroCta: 'Créer ma première annonce',
  onboardingEyebrow: 'Démarrer',
  onboardingTitle: 'Crée ta première annonce en 3 minutes',
  onboardingBody:
    "Réponds à 4 questions simples. On génère ensuite tes premières annonces prêtes à prévisualiser dans Ad Studio. Aucune publication réelle.",
  onboardingCta: 'Commencer',
};
const L_EN = {
  title: 'Your offers, one frame.',
  subtitle:
    'Create, track and ship your offers. The dashboard measures performance across offer, promise, proof, angle, objection, CTA, asset and channel.',
  shown: 'shown',
  heroCta: 'Create my first ad',
  onboardingEyebrow: 'Start here',
  onboardingTitle: 'Create your first ad in 3 minutes',
  onboardingBody:
    'Answer 4 simple questions. We then generate your first ads ready to preview inside Ad Studio. No real publishing.',
  onboardingCta: 'Start',
};
