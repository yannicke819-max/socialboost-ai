'use client';

import { TrendingUp, FileText, ShieldCheck, CalendarPlus } from 'lucide-react';
import type { OfferWorkspaceKpis } from '@/lib/offer-workspace/kpis';

interface KpiBarProps {
  kpis: OfferWorkspaceKpis;
  language: 'fr' | 'en';
}

export function KpiBar({ kpis, language }: KpiBarProps) {
  const labels = language === 'en' ? L_EN : L_FR;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Kpi icon={<FileText size={14} />} label={labels.total} value={String(kpis.total)} />
      <Kpi
        icon={<TrendingUp size={14} />}
        label={labels.recent}
        value={String(kpis.recent7d)}
      />
      <Kpi
        icon={<ShieldCheck size={14} />}
        label={labels.confidence}
        value={`${kpis.avgConfidence}/100`}
      />
      <Kpi
        icon={<CalendarPlus size={14} />}
        label={labels.proofs}
        value={`${kpis.withProofsPct}%`}
      />
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-border bg-bg-elevated p-4">
      <div className="flex items-center gap-1.5">
        <span className="text-fg-subtle">{icon}</span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
          {label}
        </span>
      </div>
      <div className="mt-2 font-display text-2xl font-semibold text-fg">{value}</div>
    </div>
  );
}

const L_FR = {
  total: 'Offres',
  recent: '7 derniers jours',
  confidence: 'Confiance moyenne',
  proofs: 'Avec preuves',
};
const L_EN = {
  total: 'Offers',
  recent: 'Last 7 days',
  confidence: 'Avg confidence',
  proofs: 'With proofs',
};
