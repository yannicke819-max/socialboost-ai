'use client';

import Link from 'next/link';
import { ChevronRight, Calendar, Layers, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STATUS_LABELS, type Asset, type CalendarSlot, type Offer } from '@/lib/offer-workspace/types';
import { Sparkline } from './Sparkline';
import { computeOfferKpisMock, bestChannel, nextActionMock } from '@/lib/offer-workspace/analytics-mock';
import { nextPlannedSlot, daysUntil } from '@/lib/offer-workspace/calendar';

interface OfferCardProps {
  offer: Offer;
  language: 'fr' | 'en';
  density?: 'kanban' | 'row';
  /**
   * AI-008b enrichment context. When provided, the card shows next action,
   * best channel, approval ratio and a 7d sparkline. Optional so AI-008a
   * call sites still compile.
   */
  context?: {
    assets: Asset[];
    slots: CalendarSlot[];
  };
}

export function OfferCard({ offer, language, density = 'kanban', context }: OfferCardProps) {
  const labels = language === 'en' ? L_EN : L_FR;
  const score = offer.confidence_score ?? 0;
  const tone =
    score >= 70 ? 'text-emerald-400' : score >= 40 ? 'text-amber-400' : 'text-fg-subtle';

  const offerAssets = context?.assets ?? [];
  const offerSlots = context?.slots ?? [];
  const approved = offerAssets.filter((a) => a.status === 'approved').length;
  const totalAssets = offerAssets.length;
  const next = nextPlannedSlot(offerSlots);
  const channel = bestChannel(offer, offerSlots);
  const action = context ? nextActionMock(offer, offerAssets, offerSlots, language) : undefined;

  // Mini sparkline: 7-day impressions series, deterministic from offer id
  const series = context ? computeOfferKpisMock(offer, '7d').series.impressions : [];

  return (
    <Link
      href={`/ai/offers/${offer.id}`}
      className={cn(
        'group block rounded-md border border-border bg-bg p-3 transition hover:border-border-strong hover:bg-bg-elevated',
        density === 'row' && 'flex items-center gap-4',
      )}
    >
      <div className={cn(density === 'row' ? 'flex-1 min-w-0' : '')}>
        <div className="flex items-start justify-between gap-2">
          <h4 className="truncate font-display text-sm font-semibold text-fg group-hover:text-fg">
            {offer.name}
          </h4>
          <ChevronRight size={14} className="mt-0.5 shrink-0 text-fg-subtle group-hover:text-fg-muted" />
        </div>
        <p className="mt-0.5 truncate text-xs text-fg-muted">{offer.brief.businessName}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-fg-muted">
          <span className="font-mono uppercase tracking-wider text-fg-subtle">
            {STATUS_LABELS[offer.status][language]}
          </span>
          <span aria-hidden>·</span>
          <span>{labels.goal}: {goalLabel(offer.goal, language)}</span>
          {channel && (
            <>
              <span aria-hidden>·</span>
              <span className="font-mono">{channel}</span>
            </>
          )}
          <span aria-hidden>·</span>
          <span className={cn('font-mono', tone)}>{score}/100</span>
        </div>
        {context && (
          <div className="mt-2.5 flex items-end justify-between gap-2 border-t border-border/60 pt-2.5">
            <div className="space-y-1 text-[11px] text-fg-muted">
              {totalAssets > 0 && (
                <div className="flex items-center gap-1">
                  <Layers size={11} className="text-fg-subtle" />
                  <span>
                    {labels.approved}: <span className="font-mono text-fg">{approved}/{totalAssets}</span>
                  </span>
                </div>
              )}
              {next && (
                <div className="flex items-center gap-1">
                  <Calendar size={11} className="text-fg-subtle" />
                  <span>
                    {labels.nextSlot}:{' '}
                    <span className="font-mono text-fg">
                      {daysUntil(next.scheduledAt) === 0 ? labels.today : `${labels.in} ${daysUntil(next.scheduledAt)}j`}
                    </span>
                  </span>
                </div>
              )}
              {action && (
                <div className="flex items-center gap-1">
                  <Send size={11} className="text-fg-subtle" />
                  <span className="text-fg-muted">{labels.next}: <span className="text-fg">{action}</span></span>
                </div>
              )}
            </div>
            {series.length > 0 && (
              <Sparkline values={series} width={56} height={20} className="text-fg-muted" />
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

function goalLabel(goal: Offer['goal'], lang: 'fr' | 'en'): string {
  const map: Record<Offer['goal'], { fr: string; en: string }> = {
    clarify_offer: { fr: 'Clarifier', en: 'Clarify' },
    social_content: { fr: 'Social', en: 'Social' },
    landing_page: { fr: 'Landing', en: 'Landing' },
    objections: { fr: 'Objections', en: 'Objections' },
    sales_angles: { fr: 'Angles', en: 'Angles' },
  };
  return map[goal][lang];
}

const L_FR = {
  goal: 'Objectif',
  approved: 'Approuvés',
  nextSlot: 'Prochain slot',
  today: "aujourd'hui",
  in: 'dans',
  next: 'Prochaine action',
};
const L_EN = {
  goal: 'Goal',
  approved: 'Approved',
  nextSlot: 'Next slot',
  today: 'today',
  in: 'in',
  next: 'Next action',
};
