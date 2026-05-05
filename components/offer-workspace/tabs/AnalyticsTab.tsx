'use client';

import { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  computeOfferKpisMock,
  breakdownByChannel,
  breakdownByAsset,
  breakdownByDimension,
  PERIODS,
  type Period,
} from '@/lib/offer-workspace/analytics-mock';
import type { Asset, Offer } from '@/lib/offer-workspace/types';
import { Sparkline } from '../Sparkline';

interface AnalyticsTabProps {
  offer: Offer;
  assets: Asset[];
  language: 'fr' | 'en';
}

export function AnalyticsTab({ offer, assets, language }: AnalyticsTabProps) {
  const [period, setPeriod] = useState<Period>('30d');
  const labels = language === 'en' ? L_EN : L_FR;
  const k = useMemo(() => computeOfferKpisMock(offer, period), [offer, period]);

  const channels = Array.from(
    new Set([...(offer.brief.platforms ?? []), ...assets.map((a) => a.channel).filter(Boolean) as string[]]),
  );
  const channelRows = breakdownByChannel(offer, k, channels);
  const assetRows = breakdownByAsset(offer, k, assets);
  const dimensions = Array.from(new Set(assets.flatMap((a) => a.dimensions)));
  const dimensionRows = breakdownByDimension(offer, k, dimensions);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
            {labels.period}
          </span>
          <div className="inline-flex rounded-md border border-border bg-bg-elevated p-0.5">
            {PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={cn(
                  'rounded px-2 py-1 font-mono text-[11px] uppercase tracking-wider transition',
                  period === p ? 'bg-bg text-fg' : 'text-fg-muted hover:text-fg',
                )}
                aria-pressed={period === p}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <span className="rounded-full border border-amber-400/40 bg-amber-400/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-amber-400">
          {labels.mockBadge}
        </span>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <KpiCard label={labels.impressions} value={k.impressions} delta={k.deltaPct.impressions} series={k.series.impressions} />
        <KpiCard label={labels.clicks} value={k.clicks} delta={k.deltaPct.clicks} series={k.series.clicks} />
        <KpiCard label={labels.replies} value={k.replies} delta={k.deltaPct.replies} series={k.series.replies} />
        <KpiCard label={labels.conversions} value={k.conversions} delta={k.deltaPct.conversions} series={k.series.conversions} />
        <KpiCard label={labels.ctr} value={`${k.ctrPct}%`} delta={k.deltaPct.ctrPct} />
        <KpiCard label={labels.cr} value={`${k.conversionRatePct}%`} delta={k.deltaPct.conversionRatePct} />
      </div>

      <BreakdownSection title={labels.byChannel} rows={channelRows} language={language} />
      <BreakdownSection title={labels.byAsset} rows={assetRows.slice(0, 8)} language={language} emptyHint={labels.noAssets} />
      <BreakdownSection title={labels.byDimension} rows={dimensionRows} language={language} emptyHint={labels.noDimensions} />

      <p className="text-[11px] text-fg-subtle">{labels.disclaimer}</p>
    </div>
  );
}

function KpiCard({
  label,
  value,
  delta,
  series,
}: {
  label: string;
  value: number | string;
  delta: number;
  series?: number[];
}) {
  const Arrow = delta > 0 ? ArrowUpRight : delta < 0 ? ArrowDownRight : Minus;
  const tone =
    delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-amber-400' : 'text-fg-subtle';
  return (
    <div className="rounded-md border border-border bg-bg-elevated p-3">
      <div className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">{label}</div>
      <div className="mt-1.5 flex items-end justify-between gap-2">
        <div className="font-display text-lg font-semibold text-fg">{value}</div>
        {series && series.length > 0 && (
          <Sparkline values={series} width={64} height={20} className="text-fg-muted" />
        )}
      </div>
      <div className={cn('mt-1.5 flex items-center gap-0.5 text-[11px]', tone)}>
        <Arrow size={11} />
        <span>{delta > 0 ? '+' : ''}{delta}%</span>
      </div>
    </div>
  );
}

function BreakdownSection({
  title,
  rows,
  language,
  emptyHint,
}: {
  title: string;
  rows: { key: string; label: string; kpi: { impressions: number; clicks: number; conversions: number; ctrPct: number } }[];
  language: 'fr' | 'en';
  emptyHint?: string;
}) {
  const labels = language === 'en' ? L_EN : L_FR;
  if (rows.length === 0) {
    return (
      <section className="rounded-md border border-border bg-bg-elevated p-4">
        <h3 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-fg">{title}</h3>
        <p className="text-sm text-fg-muted">{emptyHint ?? '—'}</p>
      </section>
    );
  }
  return (
    <section className="rounded-md border border-border bg-bg-elevated">
      <header className="border-b border-border px-4 py-2.5">
        <h3 className="font-mono text-[11px] uppercase tracking-wider text-fg">{title}</h3>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-bg-muted/30 text-left">
            <tr>
              <Th>{labels.label}</Th>
              <Th right>{labels.impressions}</Th>
              <Th right>{labels.clicks}</Th>
              <Th right>{labels.conversions}</Th>
              <Th right>{labels.ctr}</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-t border-border/60">
                <td className="px-3 py-2 text-fg">{r.label}</td>
                <td className="px-3 py-2 text-right font-mono">{r.kpi.impressions}</td>
                <td className="px-3 py-2 text-right font-mono">{r.kpi.clicks}</td>
                <td className="px-3 py-2 text-right font-mono">{r.kpi.conversions}</td>
                <td className="px-3 py-2 text-right font-mono text-fg-muted">{r.kpi.ctrPct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th className={cn('px-3 py-2 font-mono text-[10px] font-medium uppercase tracking-wider text-fg-subtle', right && 'text-right')}>
      {children}
    </th>
  );
}

const L_FR = {
  period: 'Période',
  mockBadge: 'MOCK V1',
  impressions: 'Impressions',
  clicks: 'Clics',
  replies: 'Réponses',
  conversions: 'Conversions',
  ctr: 'CTR',
  cr: 'Taux conv.',
  byChannel: 'Par canal',
  byAsset: 'Par asset',
  byDimension: 'Par dimension',
  label: 'Libellé',
  noAssets: 'Aucun asset à analyser pour le moment.',
  noDimensions: 'Aucune dimension matérialisée.',
  disclaimer: 'Données factices générées de manière déterministe à partir de l’ID de l’offre. Aucun connecteur réel.',
};
const L_EN = {
  period: 'Period',
  mockBadge: 'MOCK V1',
  impressions: 'Impressions',
  clicks: 'Clicks',
  replies: 'Replies',
  conversions: 'Conversions',
  ctr: 'CTR',
  cr: 'Conv. rate',
  byChannel: 'By channel',
  byAsset: 'By asset',
  byDimension: 'By dimension',
  label: 'Label',
  noAssets: 'No assets to analyze yet.',
  noDimensions: 'No materialised dimensions.',
  disclaimer: 'Fake data deterministically generated from the offer id. No real connectors.',
};
