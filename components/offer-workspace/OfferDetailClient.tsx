'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Briefcase, Layers, Calendar, BarChart3, Sparkles, CalendarDays, TrendingUp, Megaphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkspaceStore } from './useWorkspaceStore';
import { BriefTab } from './tabs/BriefTab';
import { AssetsTab } from './tabs/AssetsTab';
import { CalendarTab } from './tabs/CalendarTab';
import { AnalyticsTab } from './tabs/AnalyticsTab';
import { RecommendationsTab } from './tabs/RecommendationsTab';
import { WeeklyPlanTab } from './tabs/WeeklyPlanTab';
import { FeedbackTab } from './tabs/FeedbackTab';
import { AdStudioTab } from './tabs/AdStudioTab';
import { OfferTimeline } from './OfferTimeline';
import { QuickActions } from './QuickActions';
import { STATUS_LABELS } from '@/lib/offer-workspace/types';
import { buildAdGallery } from '@/lib/offer-workspace/ad-studio';

interface OfferDetailClientProps {
  offerId: string;
  language?: 'fr' | 'en';
}

type TabKey = 'brief' | 'assets' | 'adstudio' | 'plan' | 'calendar' | 'analytics' | 'feedback' | 'recos';

export function OfferDetailClient({ offerId, language = 'fr' }: OfferDetailClientProps) {
  const { hydrated, offers, assets, slots, refresh, store } = useWorkspaceStore();
  const offer = useMemo(() => offers.find((o) => o.id === offerId), [offers, offerId]);
  const offerAssets = useMemo(() => assets.filter((a) => a.offerId === offerId), [assets, offerId]);
  const offerSlots = useMemo(() => slots.filter((s) => s.offerId === offerId), [slots, offerId]);
  const params = useSearchParams();
  const [tab, setTab] = useState<TabKey>('brief');

  // AI-014: pick up `?tab=<key>` on mount so deep-links from the onboarding
  // wizard (e.g. /ai/offers/<id>?tab=adstudio) land on the right tab.
  useEffect(() => {
    const t = params.get('tab');
    const valid: TabKey[] = ['brief', 'assets', 'adstudio', 'plan', 'calendar', 'analytics', 'feedback', 'recos'];
    if (t && (valid as string[]).includes(t)) {
      setTab(t as TabKey);
    }
    // Only honour on mount; user clicks override afterwards.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      {hydrated && store.listAdUnits(offer.id).length === 0 && offerAssets.length > 0 && tab !== 'adstudio' && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-brand/40 bg-brand/5 p-3">
          <p className="text-sm text-fg">
            <Megaphone size={14} className="mr-1.5 inline text-brand" />
            {labels.noAdsBanner}
          </p>
          <button
            type="button"
            onClick={() => {
              const ads = buildAdGallery({ offer, assets: offerAssets });
              store.upsertAdUnits(offer.id, ads);
              refresh();
              setTab('adstudio');
            }}
            className="inline-flex items-center gap-1.5 rounded-md border border-brand/60 bg-brand/15 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-fg transition hover:border-brand hover:bg-brand/25 focus-visible:ring-2 focus-visible:ring-brand"
          >
            <Sparkles size={12} /> {labels.noAdsCta}
          </button>
        </div>
      )}

      <nav className="flex flex-wrap gap-1 border-b border-border" aria-label="Tabs">
        <Tab id="brief" current={tab} onSelect={setTab} icon={<Briefcase size={13} />}>
          {labels.brief}
        </Tab>
        <Tab id="assets" current={tab} onSelect={setTab} icon={<Layers size={13} />}>
          {labels.assets} <span className="ml-1 text-[10px] text-fg-subtle">{offerAssets.length}</span>
        </Tab>
        <Tab id="adstudio" current={tab} onSelect={setTab} icon={<Megaphone size={13} />}>
          {labels.adstudio}
          <span className="ml-1 rounded-full border border-amber-400/40 bg-amber-400/5 px-1.5 text-[9px] font-medium text-amber-400">
            mock
          </span>
        </Tab>
        <Tab id="plan" current={tab} onSelect={setTab} icon={<CalendarDays size={13} />}>
          {labels.plan}
          <span className="ml-1 rounded-full border border-amber-400/40 bg-amber-400/5 px-1.5 text-[9px] font-medium text-amber-400">
            mock
          </span>
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
        <Tab id="feedback" current={tab} onSelect={setTab} icon={<TrendingUp size={13} />}>
          {labels.feedback}
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
        {tab === 'adstudio' && (
          <AdStudioTab
            offer={offer}
            assets={offerAssets}
            language={language}
            store={store}
            onUpdate={refresh}
            onNavigateTab={(t) => setTab(t as TabKey)}
          />
        )}
        {tab === 'plan' && (
          <WeeklyPlanTab
            offer={offer}
            assets={offerAssets}
            language={language}
            store={store}
            onUpdate={refresh}
            onNavigateTab={(t) => setTab(t as TabKey)}
          />
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
        {tab === 'feedback' && (
          <FeedbackTab
            offer={offer}
            assets={offerAssets}
            language={language}
            store={store}
            onUpdate={refresh}
            onNavigateTab={(t) => setTab(t as TabKey)}
          />
        )}
        {tab === 'recos' && (
          <RecommendationsTab
            offer={offer}
            assets={offerAssets}
            slots={offerSlots}
            language={language}
            store={store}
            onUpdate={refresh}
            onNavigateTab={(t) => setTab(t as TabKey)}
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
  assets: 'Contenus',
  adstudio: 'Ad Studio',
  plan: 'Plan semaine',
  calendar: 'Calendrier',
  analytics: 'Analytics',
  feedback: 'Feedback',
  recos: 'Recommandations',
  score: 'Score',
  mockNotice:
    "Tout est mock V1 : aucun post n'est publié, aucune analytics n'est mesurée. Données locales (localStorage) pour permettre la démonstration.",
  mockTooltip:
    'Les statuts « sent_mock » / « scheduled_mock » indiquent une simulation locale. Aucune intégration LinkedIn / Meta / email n\'est branchée.',
  noAdsBanner: 'Aucune annonce générée pour cette offre.',
  noAdsCta: 'Générer mes annonces',
};
const L_EN = {
  back: 'Back to offers',
  brief: 'Brief',
  assets: 'Contents',
  adstudio: 'Ad Studio',
  plan: 'Weekly plan',
  calendar: 'Calendar',
  analytics: 'Analytics',
  feedback: 'Feedback',
  recos: 'Recommendations',
  score: 'Score',
  mockNotice:
    'Everything is MOCK V1: no post is published, no real analytics is measured. Local data (localStorage) for demo purposes.',
  mockTooltip:
    'The "sent_mock" / "scheduled_mock" statuses indicate a local simulation. No LinkedIn / Meta / email integration is wired.',
  noAdsBanner: 'No ads generated yet for this offer.',
  noAdsCta: 'Generate my ads',
};
