'use client';

import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  OFFER_STATUSES,
  OFFER_GOALS,
  STATUS_LABELS,
  type OfferStatus,
  type OfferGoal,
} from '@/lib/offer-workspace/types';

export interface FiltersValue {
  query: string;
  statuses: OfferStatus[];
  goals: OfferGoal[];
  channel: string;
  minConfidence: number;
}

export const INITIAL_FILTERS: FiltersValue = {
  query: '',
  statuses: [],
  goals: [],
  channel: '',
  minConfidence: 0,
};

interface OfferFiltersProps {
  value: FiltersValue;
  onChange: (next: FiltersValue) => void;
  language: 'fr' | 'en';
}

const GOAL_LABELS_FR: Record<OfferGoal, string> = {
  clarify_offer: 'Clarifier',
  social_content: 'Social',
  landing_page: 'Landing',
  objections: 'Objections',
  sales_angles: 'Angles',
};
const GOAL_LABELS_EN: Record<OfferGoal, string> = {
  clarify_offer: 'Clarify',
  social_content: 'Social',
  landing_page: 'Landing',
  objections: 'Objections',
  sales_angles: 'Angles',
};

export function OfferFilters({ value, onChange, language }: OfferFiltersProps) {
  const labels = language === 'en' ? L_EN : L_FR;
  const goalLabels = language === 'en' ? GOAL_LABELS_EN : GOAL_LABELS_FR;

  const toggleStatus = (s: OfferStatus) =>
    onChange({
      ...value,
      statuses: value.statuses.includes(s)
        ? value.statuses.filter((x) => x !== s)
        : [...value.statuses, s],
    });
  const toggleGoal = (g: OfferGoal) =>
    onChange({
      ...value,
      goals: value.goals.includes(g) ? value.goals.filter((x) => x !== g) : [...value.goals, g],
    });

  const hasActive =
    value.query !== '' ||
    value.statuses.length > 0 ||
    value.goals.length > 0 ||
    value.channel !== '' ||
    value.minConfidence > 0;

  return (
    <div className="space-y-3 rounded-md border border-border bg-bg-elevated p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle"
          />
          <input
            type="text"
            value={value.query}
            onChange={(e) => onChange({ ...value, query: e.target.value })}
            placeholder={labels.search}
            className="w-full rounded-md border border-border bg-bg pl-9 pr-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          />
        </label>
        <select
          value={value.channel}
          onChange={(e) => onChange({ ...value, channel: e.target.value })}
          className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">{labels.allChannels}</option>
          <option value="linkedin">LinkedIn</option>
          <option value="instagram">Instagram</option>
          <option value="facebook">Facebook</option>
          <option value="email">Email</option>
          <option value="landing_page">Landing</option>
        </select>
        <label className="flex items-center gap-2 text-xs text-fg-muted">
          <span>{labels.minScore}</span>
          <input
            type="number"
            min={0}
            max={100}
            value={value.minConfidence}
            onChange={(e) =>
              onChange({ ...value, minConfidence: Math.max(0, Math.min(100, Number(e.target.value))) })
            }
            className="w-16 rounded-md border border-border bg-bg px-2 py-1 text-sm text-fg"
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        {OFFER_STATUSES.map((s) => {
          const active = value.statuses.includes(s);
          return (
            <button
              key={s}
              type="button"
              onClick={() => toggleStatus(s)}
              className={cn(
                'rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-wider transition',
                active
                  ? 'border-brand bg-brand/10 text-fg'
                  : 'border-border bg-bg text-fg-muted hover:border-border-strong',
              )}
              aria-pressed={active}
            >
              {STATUS_LABELS[s][language]}
            </button>
          );
        })}
        <span className="mx-1 text-fg-subtle" aria-hidden>
          ·
        </span>
        {OFFER_GOALS.map((g) => {
          const active = value.goals.includes(g);
          return (
            <button
              key={g}
              type="button"
              onClick={() => toggleGoal(g)}
              className={cn(
                'rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-wider transition',
                active
                  ? 'border-brand bg-brand/10 text-fg'
                  : 'border-border bg-bg text-fg-muted hover:border-border-strong',
              )}
              aria-pressed={active}
            >
              {goalLabels[g]}
            </button>
          );
        })}
        {hasActive && (
          <button
            type="button"
            onClick={() => onChange(INITIAL_FILTERS)}
            className="ml-2 inline-flex items-center gap-1 rounded-full border border-border bg-bg px-3 py-1 text-[11px] text-fg-muted hover:border-border-strong hover:text-fg"
          >
            <X size={12} /> {labels.clear}
          </button>
        )}
      </div>
    </div>
  );
}

const L_FR = {
  search: 'Rechercher une offre…',
  allChannels: 'Tous les canaux',
  minScore: 'Score min',
  clear: 'Réinitialiser',
};
const L_EN = {
  search: 'Search an offer…',
  allChannels: 'All channels',
  minScore: 'Min score',
  clear: 'Reset',
};
