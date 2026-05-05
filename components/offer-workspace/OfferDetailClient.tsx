'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Briefcase, Layers, Calendar, BarChart3, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkspaceStore } from './useWorkspaceStore';
import { BriefTab } from './tabs/BriefTab';
import { AssetsTab } from './tabs/AssetsTab';
import { CalendarTab } from './tabs/CalendarTab';
import { AnalyticsTab } from './tabs/AnalyticsTab';
import { RecommendationsTab } from './tabs/RecommendationsTab';
import { OfferTimeline } from './OfferTimeline';
import { QuickActions } from './QuickActions';
import { STATUS_LABELS } from '@/lib/offer-workspace/types';

interface OfferDetailClientProps {
  offerId: string;
  language?: 'fr' | 'en';
}

type TabKey = 'brief' | 'assets' | 'calendar' | 'analytics' | 'recos';

export function OfferDetailClient({ offerId, language = 'fr' }: OfferDetailClientProps) {
  const { hydrated, offers, assets, slots, refresh, store } = useWorkspaceStore();
  const offer = useMemo(() => offers.find((o) => o.id === offerId), [offers, offerId]);
  const offerAssets = useMemo(() => assets.filter((a) => a.offerId === offerId), [assets, offerId]);
  const offerSlots = useMemo(() => slots.filter((s) => s.offerId === offerId), [slots, offerId]);
  const [tab, setTab] = useState<TabKey>('brief');

  if (!hydrated) {
    return <div className="h-40 animate-pulse rounded-md bg-bg-elevated/60" />;
  }

  if (!offer) {
    return <NotFound language={language} />;
  }

  const labels = language === 'en' ? L_EN : L_FR;

  return (
    <div className="space-y-5">
      <Link
        href="/ai/offers"
        className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-fg-subtle hover:text-fg"
      >
        <ArrowLeft size={12} /> {labels.back}
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold italic leading-tight text-fg sm:text-4xl">
            {offer.name}
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            {offer.brief.businessName} · {offer.brief.language.toUpperCase()} ·{' '}
            <span className="font-mono uppercase tracking-wider text-fg-subtle">
              {STATUS_LABELS[offer.status][language]}
            </span>{' '}
            · {labels.score}: {offer.confidence_score ?? 0}/100
          </p>
        </div>
        <QuickActions
          offer={offer}
          language={language}
          onAfterChange={refresh}
          store={store}
        />
      </header>

      <OfferTimeline offer={offer} assets={offerAssets} slots={offerSlots} language={language} />

      <p
        className="rounded border border-amber-400/30 bg-amber-400/5 px-3 py-2 text-[11px] text-amber-400"
        title={labels.mockTooltip}
      >
        {labels.mockNotice}
      </p>

      <nav className="flex flex-wrap gap-1 border-b border-border" aria-label="Tabs">
        <Tab id="brief" current={tab} onSelect={setTab} icon={<Briefcase size={13} />}>
          {labels.brief}
        </Tab>
        <Tab id="assets" current={tab} onSelect={setTab} icon={<Layers size={13} />}>
          {labels.assets} <span className="ml-1 text-[10px] text-fg-subtle">{offerAssets.length}</span>
        </Tab>
        <Tab id="calendar" current={tab} onSelect={setTab} icon={<Calendar size={13} />}>
          {labels.calendar}{' '}
          {offerSlots.length > 0 && (
            <span className="ml-1 text-[10px] text-fg-subtle">{offerSlots.length}</span>
          )}
        </Tab>
        <Tab id="analytics" current={tab} onSelect={setTab} icon={<BarChart3 size={13} />}>
          {labels.analytics}
          <span className="ml-1 rounded-full border border-amber-400/40 bg-amber-400/5 px-1.5 text-[9px] font-medium text-amber-400">
            mock
          </span>
        </Tab>
        <Tab id="recos" current={tab} onSelect={setTab} icon={<Sparkles size={13} />}>
          {labels.recos}
        </Tab>
      </nav>

      <section>
        {tab === 'brief' && (
          <BriefTab offer={offer} language={language} onUpdate={() => refresh()} store={store} />
        )}
        {tab === 'assets' && (
          <AssetsTab offer={offer} assets={offerAssets} language={language} onUpdate={() => refresh()} store={store} />
        )}
        {tab === 'calendar' && (
          <CalendarTab
            offer={offer}
            assets={offerAssets}
            slots={offerSlots}
            language={language}
            store={store}
            onUpdate={refresh}
          />
        )}
        {tab === 'analytics' && (
          <AnalyticsTab offer={offer} assets={offerAssets} language={language} />
        )}
        {tab === 'recos' && (
          <RecommendationsTab
            offer={offer}
            assets={offerAssets}
            slots={offerSlots}
            language={language}
            store={store}
            onUpdate={refresh}
          />
        )}
      </section>
    </div>
  );
}

function Tab({
  id,
  current,
  onSelect,
  icon,
  children,
}: {
  id: TabKey;
  current: TabKey;
  onSelect: (k: TabKey) => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const active = id === current;
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      role="tab"
      aria-selected={active}
      className={cn(
        '-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 font-mono text-[11px] uppercase tracking-wider transition',
        active
          ? 'border-brand text-fg'
          : 'border-transparent text-fg-muted hover:border-border-strong hover:text-fg',
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function NotFound({ language }: { language: 'fr' | 'en' }) {
  return (
    <div className="rounded-md border border-dashed border-border bg-bg-elevated/40 p-10 text-center">
      <h3 className="font-display text-xl font-semibold text-fg">
        {language === 'en' ? 'Offer not found' : 'Offre introuvable'}
      </h3>
      <p className="mt-2 text-sm text-fg-muted">
        {language === 'en'
          ? 'This offer is not in your local workspace. It may have been deleted or you may be on a different browser.'
          : "Cette offre n'est pas dans ton workspace local. Elle a pu être supprimée, ou tu es sur un autre navigateur."}
      </p>
      <Link
        href="/ai/offers"
        className="mt-4 inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-fg-muted hover:text-fg"
      >
        <ArrowLeft size={12} /> {language === 'en' ? 'Back to workspace' : 'Retour au workspace'}
      </Link>
    </div>
  );
}

const L_FR = {
  back: 'Retour aux offres',
  brief: 'Brief',
  assets: 'Assets',
  calendar: 'Calendrier',
  analytics: 'Analytics',
  recos: 'Recommandations',
  score: 'Score',
  mockNotice:
    "Tout est mock V1 : aucun post n'est publié, aucune analytics n'est mesurée. Données locales (localStorage) pour permettre la démonstration.",
  mockTooltip:
    'Les statuts « sent_mock » / « scheduled_mock » indiquent une simulation locale. Aucune intégration LinkedIn / Meta / email n\'est branchée.',
};
const L_EN = {
  back: 'Back to offers',
  brief: 'Brief',
  assets: 'Assets',
  calendar: 'Calendar',
  analytics: 'Analytics',
  recos: 'Recommendations',
  score: 'Score',
  mockNotice:
    'Everything is MOCK V1: no post is published, no real analytics is measured. Local data (localStorage) for demo purposes.',
  mockTooltip:
    'The "sent_mock" / "scheduled_mock" statuses indicate a local simulation. No LinkedIn / Meta / email integration is wired.',
};
