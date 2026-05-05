'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Send, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import {
  isoDate,
  startOfWeekMonday,
  weekDays,
  groupSlotsByDay,
  generateSlotDrafts,
} from '@/lib/offer-workspace/calendar';
import {
  type Asset,
  type CalendarSlot,
  type CalendarSlotStatus,
  type Offer,
} from '@/lib/offer-workspace/types';
import type { WorkspaceStore } from '@/lib/offer-workspace/store';

interface CalendarTabProps {
  offer: Offer;
  assets: Asset[];
  slots: CalendarSlot[];
  language: 'fr' | 'en';
  store: WorkspaceStore;
  onUpdate: () => void;
}

const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const DAYS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const STATUS_TONE: Record<CalendarSlotStatus, string> = {
  planned: 'border-brand/40 bg-brand/10 text-fg',
  sent_mock: 'border-emerald-400/40 bg-emerald-400/5 text-fg',
  cancelled: 'border-border bg-bg-muted text-fg-subtle line-through',
};

export function CalendarTab({ offer, assets, slots, language, store, onUpdate }: CalendarTabProps) {
  const [weekRef, setWeekRef] = useState<Date>(() => startOfWeekMonday(new Date()));
  const labels = language === 'en' ? L_EN : L_FR;
  const dayLabels = language === 'en' ? DAYS_EN : DAYS_FR;

  const grouped = useMemo(() => groupSlotsByDay(slots, weekRef), [slots, weekRef]);
  const days = weekDays(weekRef);
  const socialPosts = assets.filter((a) => a.kind === 'social_post');
  const totalThisWeek = Object.values(grouped).flat().length;

  const shiftWeek = (delta: number) => {
    const next = new Date(weekRef);
    next.setUTCDate(weekRef.getUTCDate() + 7 * delta);
    setWeekRef(startOfWeekMonday(next));
  };

  const seedThreeSlots = () => {
    const channel = offer.brief.platforms?.[0] ?? 'linkedin';
    const drafts = generateSlotDrafts({
      offerId: offer.id,
      channel,
      weekStart: weekRef,
      count: 3,
    });
    for (const d of drafts) store.createSlot(d);
    onUpdate();
  };

  const scheduleAsset = (assetId: string, channel: string, isoDay: string) => {
    const at = new Date(`${isoDay}T10:00:00.000Z`);
    store.createSlot({
      offerId: offer.id,
      assetId,
      channel,
      scheduledAt: at.toISOString(),
      status: 'planned',
    });
    onUpdate();
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shiftWeek(-1)}
            aria-label={labels.prev}
            className="grid h-8 w-8 place-items-center rounded-md border border-border bg-bg-elevated text-fg-muted hover:text-fg"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="font-mono text-[11px] uppercase tracking-wider text-fg">
            {`${days[0]} → ${days[6]}`}
          </span>
          <button
            type="button"
            onClick={() => shiftWeek(1)}
            aria-label={labels.next}
            className="grid h-8 w-8 place-items-center rounded-md border border-border bg-bg-elevated text-fg-muted hover:text-fg"
          >
            <ChevronRight size={14} />
          </button>
          <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
            {totalThisWeek} {totalThisWeek === 1 ? labels.slot : labels.slots}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={seedThreeSlots}>
            <Plus size={12} /> {labels.seedThree}
          </Button>
          <span
            className="cursor-help rounded-full border border-amber-400/40 bg-amber-400/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-amber-400"
            title={labels.mockTooltip}
          >
            {labels.mockBadge}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-7">
        {days.map((day, i) => (
          <div
            key={day}
            className="min-h-[120px] rounded-md border border-border bg-bg-elevated/40 p-2"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                {dayLabels[i]}
              </span>
              <span className="font-mono text-[10px] text-fg-muted">{day.slice(5)}</span>
            </div>
            <ul className="space-y-1.5">
              {(grouped[day] ?? []).map((s) => (
                <SlotCard
                  key={s.id}
                  slot={s}
                  language={language}
                  onMarkSent={() => {
                    store.setSlotStatus(s.id, 'sent_mock');
                    onUpdate();
                  }}
                  onCancel={() => {
                    store.setSlotStatus(s.id, 'cancelled');
                    onUpdate();
                  }}
                  onShift={(delta) => {
                    store.shiftSlot(s.id, delta);
                    onUpdate();
                  }}
                  onDelete={() => {
                    store.deleteSlot(s.id);
                    onUpdate();
                  }}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>

      {socialPosts.length > 0 && (
        <div className="rounded-md border border-border bg-bg-elevated p-3">
          <h3 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-fg">
            {labels.scheduleFromAsset}
          </h3>
          <ul className="space-y-1.5">
            {socialPosts.slice(0, 4).map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded border border-border bg-bg p-2 text-xs"
              >
                <span className="truncate text-fg-muted">
                  <span className="mr-2 font-mono uppercase tracking-wider text-fg-subtle">
                    {a.channel ?? '—'}
                  </span>
                  {a.body.split('\n')[0]?.slice(0, 80) ?? ''}
                </span>
                <div className="flex items-center gap-1">
                  <select
                    aria-label={labels.scheduleFromAsset}
                    onChange={(e) => {
                      if (!e.target.value) return;
                      scheduleAsset(a.id, a.channel ?? offer.brief.platforms?.[0] ?? 'linkedin', e.target.value);
                      e.currentTarget.value = '';
                    }}
                    className="rounded-md border border-border bg-bg px-1.5 py-1 text-[11px] text-fg"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      {labels.pickDay}
                    </option>
                    {days.map((d, i) => (
                      <option key={d} value={d}>
                        {dayLabels[i]} · {d.slice(5)}
                      </option>
                    ))}
                  </select>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SlotCard({
  slot,
  language,
  onMarkSent,
  onCancel,
  onShift,
  onDelete,
}: {
  slot: CalendarSlot;
  language: 'fr' | 'en';
  onMarkSent: () => void;
  onCancel: () => void;
  onShift: (delta: number) => void;
  onDelete: () => void;
}) {
  const labels = language === 'en' ? L_EN : L_FR;
  return (
    <li
      className={cn('rounded border px-2 py-1.5 text-[11px]', STATUS_TONE[slot.status])}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="font-mono uppercase tracking-wider">{slot.channel}</span>
        <div className="flex items-center gap-0.5 text-fg-muted">
          <button
            type="button"
            aria-label={labels.shiftMinus}
            onClick={onShift.bind(null, -1)}
            className="rounded px-1 hover:text-fg"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label={labels.shiftPlus}
            onClick={onShift.bind(null, 1)}
            className="rounded px-1 hover:text-fg"
          >
            ›
          </button>
          <button
            type="button"
            aria-label={labels.delete}
            onClick={onDelete}
            className="rounded px-1 hover:text-fg"
          >
            <X size={10} />
          </button>
        </div>
      </div>
      <p className="mt-0.5 truncate">{slot.assetId ?? labels.slot}</p>
      {slot.status === 'planned' && (
        <div className="mt-1 flex items-center gap-1 text-[10px]">
          <button
            type="button"
            onClick={onMarkSent}
            title={labels.markSentTooltip}
            className="inline-flex items-center gap-0.5 rounded border border-border bg-bg px-1.5 py-0.5 hover:text-fg"
          >
            <Send size={9} /> {labels.markSent}
          </button>
          <button type="button" onClick={onCancel} className="rounded border border-border bg-bg px-1.5 py-0.5 hover:text-fg">
            {labels.cancel}
          </button>
        </div>
      )}
    </li>
  );
}

const L_FR = {
  prev: 'Semaine précédente',
  next: 'Semaine suivante',
  slot: 'créneau',
  slots: 'créneaux',
  seedThree: 'Planifier 3 créneaux',
  mockBadge: 'MOCK V1',
  scheduleFromAsset: 'Programmer depuis un asset',
  pickDay: 'Choisir un jour',
  shiftMinus: 'Décaler -1 jour',
  shiftPlus: 'Décaler +1 jour',
  delete: 'Supprimer',
  markSent: 'Envoyé (mock)',
  markSentTooltip:
    'Mock V1 — marque le créneau comme « envoyé » localement. Aucun post n\'est publié sur un réseau social.',
  cancel: 'Annuler',
  mockTooltip:
    "Mock V1 — Aucune publication réelle. Tout reste local (localStorage). Les connecteurs LinkedIn / Meta / email arriveront plus tard.",
};
const L_EN = {
  prev: 'Previous week',
  next: 'Next week',
  slot: 'slot',
  slots: 'slots',
  seedThree: 'Schedule 3 slots',
  mockBadge: 'MOCK V1',
  scheduleFromAsset: 'Schedule from an asset',
  pickDay: 'Pick a day',
  shiftMinus: 'Shift -1 day',
  shiftPlus: 'Shift +1 day',
  delete: 'Delete',
  markSent: 'Sent (mock)',
  markSentTooltip: 'Mock V1 — marks the slot as locally "sent". No real social-network post is published.',
  cancel: 'Cancel',
  mockTooltip:
    'Mock V1 — no real publishing. Everything stays local (localStorage). LinkedIn / Meta / email connectors will land later.',
};
