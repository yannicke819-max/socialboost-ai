'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Briefcase, Layers, Calendar, BarChart3, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkspaceStore } from './useWorkspaceStore';
import { BriefTab } from './tabs/BriefTab';
import { AssetsTab } from './tabs/AssetsTab';
import { ComingSoonTab } from './tabs/ComingSoonTab';
import { QuickActions } from './QuickActions';
import { STATUS_LABELS } from '@/lib/offer-workspace/types';

interface OfferDetailClientProps {
  offerId: string;
  language?: 'fr' | 'en';
}

type TabKey = 'brief' | 'assets' | 'calendar' | 'analytics' | 'recos';

export function OfferDetailClient({ offerId, language = 'fr' }: OfferDetailClientProps) {
  const { hydrated, offers, assets, refresh, store } = useWorkspaceStore();
  const offer = useMemo(() => offers.find((o) => o.id === offerId), [offers, offerId]);
  const offerAssets = useMemo(() => assets.filter((a) => a.offerId === offerId), [assets, offerId]);
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

      <nav className="flex flex-wrap gap-1 border-b border-border" aria-label="Tabs">
        <Tab id="brief" current={tab} onSelect={setTab} icon={<Briefcase size={13} />}>
          {labels.brief}
        </Tab>
        <Tab id="assets" current={tab} onSelect={setTab} icon={<Layers size={13} />}>
          {labels.assets} <span className="ml-1 text-[10px] text-fg-subtle">{offerAssets.length}</span>
        </Tab>
        <Tab id="calendar" current={tab} onSelect={setTab} icon={<Calendar size={13} />}>
          {labels.calendar}
          <SoonBadge />
        </Tab>
        <Tab id="analytics" current={tab} onSelect={setTab} icon={<BarChart3 size={13} />}>
          {labels.analytics}
          <SoonBadge />
        </Tab>
        <Tab id="recos" current={tab} onSelect={setTab} icon={<Sparkles size={13} />}>
          {labels.recos}
          <SoonBadge />
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
          <ComingSoonTab
            language={language}
            title={labels.calendar}
            body={
              language === 'en'
                ? 'Mock calendar will land in AI-008b: scheduled posts visualised per offer & channel, no real publishing.'
                : 'Le calendrier mock arrive en AI-008b : visualisation des posts planifiés par offre & canal, sans publication réelle.'
            }
          />
        )}
        {tab === 'analytics' && (
          <ComingSoonTab
            language={language}
            title={labels.analytics}
            body={
              language === 'en'
                ? "AI-008b will show mock analytics rolled up by dimension (offer / promise / proof / angle / objection / CTA / asset / channel). No real connectors."
                : "AI-008b ajoutera l'analytics mock agrégé par dimension (offre / promesse / preuve / angle / objection / CTA / asset / canal). Aucun connecteur réel."
            }
          />
        )}
        {tab === 'recos' && (
          <ComingSoonTab
            language={language}
            title={labels.recos}
            body={
              language === 'en'
                ? 'AI-008b will surface mock recommendations: "Add a proof to lift confidence", "Try a bolder hook for LinkedIn", etc.'
                : "AI-008b proposera des recommandations mock : « Ajoutez une preuve pour lever la confiance », « Testez un hook plus audacieux pour LinkedIn », etc."
            }
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

function SoonBadge() {
  return (
    <span className="ml-1 rounded-full border border-border bg-bg-elevated px-1.5 text-[9px] font-medium text-fg-subtle">
      008b
    </span>
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
};
const L_EN = {
  back: 'Back to offers',
  brief: 'Brief',
  assets: 'Assets',
  calendar: 'Calendar',
  analytics: 'Analytics',
  recos: 'Recommendations',
  score: 'Score',
};
