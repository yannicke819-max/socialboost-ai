'use client';

import { OfferCard } from './OfferCard';
import {
  OFFER_STATUSES,
  STATUS_LABELS,
  type Asset,
  type CalendarSlot,
  type Offer,
  type OfferStatus,
} from '@/lib/offer-workspace/types';

interface OfferKanbanProps {
  offers: Offer[];
  language: 'fr' | 'en';
  onChangeStatus: (offerId: string, next: OfferStatus) => void;
  /** Optional: provide assets/slots so each card can show the rich context. */
  assets?: Asset[];
  slots?: CalendarSlot[];
}

export function OfferKanban({
  offers,
  language,
  onChangeStatus,
  assets,
  slots,
}: OfferKanbanProps) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-5">
      {OFFER_STATUSES.map((status) => {
        const items = offers.filter((o) => o.status === status);
        return (
          <div
            key={status}
            className="flex flex-col rounded-md border border-border bg-bg-elevated/40 p-3"
          >
            <header className="mb-2 flex items-center justify-between">
              <h3 className="font-mono text-[11px] uppercase tracking-wider text-fg">
                {STATUS_LABELS[status][language]}
              </h3>
              <span className="font-mono text-[10px] text-fg-subtle">{items.length}</span>
            </header>
            <div className="flex flex-1 flex-col gap-2">
              {items.length === 0 && (
                <p className="rounded border border-dashed border-border/60 p-3 text-center text-xs text-fg-subtle">
                  —
                </p>
              )}
              {items.map((o) => (
                <KanbanItem
                  key={o.id}
                  offer={o}
                  language={language}
                  onChangeStatus={onChangeStatus}
                  assets={assets?.filter((a) => a.offerId === o.id)}
                  slots={slots?.filter((s) => s.offerId === o.id)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KanbanItem({
  offer,
  language,
  onChangeStatus,
  assets,
  slots,
}: {
  offer: Offer;
  language: 'fr' | 'en';
  onChangeStatus: (id: string, next: OfferStatus) => void;
  assets?: Asset[];
  slots?: CalendarSlot[];
}) {
  return (
    <div className="space-y-2">
      <OfferCard
        offer={offer}
        language={language}
        context={assets || slots ? { assets: assets ?? [], slots: slots ?? [] } : undefined}
      />
      <div className="flex items-center gap-1.5">
        <label className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
          {language === 'en' ? 'Move' : 'Déplacer'}
        </label>
        <select
          value={offer.status}
          onChange={(e) => onChangeStatus(offer.id, e.target.value as OfferStatus)}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 rounded-md border border-border bg-bg px-2 py-1 text-[11px] text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {OFFER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s][language]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
