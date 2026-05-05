'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { sortOffers, type SortDir, type SortKey } from '@/lib/offer-workspace/kpis';
import { STATUS_LABELS, type Offer } from '@/lib/offer-workspace/types';

interface OfferTableProps {
  offers: Offer[];
  language: 'fr' | 'en';
}

export function OfferTable({ offers, language }: OfferTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('updatedAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const sorted = useMemo(() => sortOffers(offers, sortKey, sortDir), [offers, sortKey, sortDir]);
  const labels = language === 'en' ? L_EN : L_FR;

  const onHeader = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  return (
    <div className="overflow-x-auto rounded-md border border-border bg-bg-elevated">
      <table className="w-full text-sm">
        <thead className="bg-bg-muted/40 text-left">
          <tr className="border-b border-border">
            <Th label={labels.name} active={sortKey === 'name'} dir={sortDir} onClick={() => onHeader('name')} />
            <Th label={labels.status} active={sortKey === 'status'} dir={sortDir} onClick={() => onHeader('status')} />
            <Th label={labels.goal} />
            <Th label={labels.channel} />
            <Th label={labels.confidence} active={sortKey === 'confidence_score'} dir={sortDir} onClick={() => onHeader('confidence_score')} />
            <Th label={labels.updated} active={sortKey === 'updatedAt'} dir={sortDir} onClick={() => onHeader('updatedAt')} />
          </tr>
        </thead>
        <tbody>
          {sorted.map((o) => (
            <tr key={o.id} className="border-b border-border/60 last:border-b-0 hover:bg-bg-muted/20">
              <td className="px-3 py-2.5 align-top">
                <Link href={`/ai/offers/${o.id}`} className="font-medium text-fg hover:underline">
                  {o.name}
                </Link>
                <div className="mt-0.5 truncate text-[11px] text-fg-subtle">
                  {o.brief.businessName}
                </div>
              </td>
              <td className="px-3 py-2.5 align-top">
                <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">
                  {STATUS_LABELS[o.status][language]}
                </span>
              </td>
              <td className="px-3 py-2.5 align-top text-fg-muted">{o.goal}</td>
              <td className="px-3 py-2.5 align-top text-fg-muted">{o.primary_channel ?? '—'}</td>
              <td className="px-3 py-2.5 align-top">
                <span
                  className={cn(
                    'font-mono',
                    (o.confidence_score ?? 0) >= 70
                      ? 'text-emerald-400'
                      : (o.confidence_score ?? 0) >= 40
                      ? 'text-amber-400'
                      : 'text-fg-subtle',
                  )}
                >
                  {(o.confidence_score ?? 0)}/100
                </span>
              </td>
              <td className="px-3 py-2.5 align-top text-[11px] text-fg-subtle">
                {new Date(o.updatedAt).toLocaleDateString(language)}
              </td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={6} className="px-3 py-6 text-center text-sm text-fg-subtle">
                —
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Th({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active?: boolean;
  dir?: SortDir;
  onClick?: () => void;
}) {
  return (
    <th className="px-3 py-2 font-mono text-[10px] font-medium uppercase tracking-wider text-fg-subtle">
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="inline-flex items-center gap-1 hover:text-fg"
        >
          {label}
          <ArrowUpDown
            size={11}
            className={active ? 'text-fg' : 'text-fg-subtle'}
            aria-label={dir}
          />
        </button>
      ) : (
        label
      )}
    </th>
  );
}

const L_FR = {
  name: 'Offre',
  status: 'Statut',
  goal: 'Objectif',
  channel: 'Canal',
  confidence: 'Confiance',
  updated: 'Modifiée',
};
const L_EN = {
  name: 'Offer',
  status: 'Status',
  goal: 'Goal',
  channel: 'Channel',
  confidence: 'Confidence',
  updated: 'Updated',
};
