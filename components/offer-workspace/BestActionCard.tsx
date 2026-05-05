'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { nextActionMock } from '@/lib/offer-workspace/analytics-mock';
import type { Asset, CalendarSlot, Offer } from '@/lib/offer-workspace/types';

interface BestActionCardProps {
  offers: Offer[];
  assets: Asset[];
  slots: CalendarSlot[];
  language: 'fr' | 'en';
}

/**
 * Surfaces ONE clear next-best-action across the workspace.
 *
 * Priority order (deterministic, no model):
 *   1. No offers yet → "Créer une offre depuis Offer Brain"
 *   2. Latest offer → use nextActionMock (preuve / approuver / planifier / sent)
 */
export function BestActionCard({ offers, assets, slots, language }: BestActionCardProps) {
  const labels = language === 'en' ? L_EN : L_FR;
  if (offers.length === 0) {
    return (
      <CardShell language={language} title={labels.welcome} body={labels.welcomeSub}>
        <Link
          href="/ai/offer-brain"
          className="inline-flex items-center gap-1 rounded-md border border-brand bg-brand/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-fg shadow-glow hover:bg-brand/20"
        >
          <Sparkles size={12} /> {labels.openBrain}
          <ArrowRight size={12} />
        </Link>
      </CardShell>
    );
  }

  // Pick the most recently updated non-archived offer; fall back to most recent overall.
  const candidates = offers.filter((o) => o.status !== 'archived');
  const sorted = (candidates.length > 0 ? candidates : offers).slice().sort(
    (a, b) => b.updatedAt.localeCompare(a.updatedAt),
  );
  const offer = sorted[0]!;
  const a = assets.filter((x) => x.offerId === offer.id);
  const s = slots.filter((x) => x.offerId === offer.id);
  const action = nextActionMock(offer, a, s, language);

  return (
    <CardShell
      language={language}
      title={`${labels.next}: ${offer.name}`}
      body={action}
    >
      <Link
        href={`/ai/offers/${offer.id}`}
        className="inline-flex items-center gap-1 rounded-md border border-border bg-bg-elevated px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-fg-muted hover:border-border-strong hover:text-fg"
      >
        {labels.openOffer}
        <ArrowRight size={12} />
      </Link>
    </CardShell>
  );
}

function CardShell({
  language,
  title,
  body,
  children,
}: {
  language: 'fr' | 'en';
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        'rounded-md border border-border bg-bg-elevated p-4',
        'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
      )}
    >
      <div className="min-w-0">
        <p className="font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
          {language === 'en' ? 'Next best action' : 'Prochaine meilleure action'}
        </p>
        <h3 className="mt-1 truncate font-display text-lg font-semibold text-fg">{title}</h3>
        <p className="mt-0.5 line-clamp-2 text-sm text-fg-muted">{body}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </section>
  );
}

const L_FR = {
  next: 'À faire ensuite',
  welcome: 'Démarre par ta première offre',
  welcomeSub:
    "Décris ton offre dans Offer Brain et clique « Sauvegarder l'offre ». Elle apparaîtra ici avec ses assets, son calendrier et ses analytics mock.",
  openBrain: 'Créer depuis Offer Brain',
  openOffer: "Ouvrir l'offre",
};
const L_EN = {
  next: 'Up next',
  welcome: 'Start with your first offer',
  welcomeSub:
    'Describe your offer in Offer Brain and hit "Save offer". It will appear here with assets, calendar and mock analytics.',
  openBrain: 'Create from Offer Brain',
  openOffer: 'Open offer',
};
