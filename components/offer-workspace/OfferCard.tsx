'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STATUS_LABELS, type Offer } from '@/lib/offer-workspace/types';

interface OfferCardProps {
  offer: Offer;
  language: 'fr' | 'en';
  density?: 'kanban' | 'row';
}

export function OfferCard({ offer, language, density = 'kanban' }: OfferCardProps) {
  const labels = language === 'en' ? L_EN : L_FR;
  const score = offer.confidence_score ?? 0;
  const tone =
    score >= 70 ? 'text-emerald-400' : score >= 40 ? 'text-amber-400' : 'text-fg-subtle';

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
          {offer.primary_channel && (
            <>
              <span aria-hidden>·</span>
              <span className="font-mono">{offer.primary_channel}</span>
            </>
          )}
          <span aria-hidden>·</span>
          <span className={cn('font-mono', tone)}>
            {score}/100
          </span>
        </div>
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

const L_FR = { goal: 'Objectif' };
const L_EN = { goal: 'Goal' };
