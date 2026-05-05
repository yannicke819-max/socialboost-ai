'use client';

import { CheckCircle2, AlertCircle, Circle, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CRITERION_LABELS,
  type BriefQuality,
  type CriterionId,
  type CriterionState,
} from '@/lib/offer-brain-ui/brief-quality';

const ICON: Record<CriterionState, LucideIcon> = {
  ok: CheckCircle2,
  partial: AlertCircle,
  missing: Circle,
};

const ICON_TONE: Record<CriterionState, string> = {
  ok: 'text-emerald-400',
  partial: 'text-amber-400',
  missing: 'text-fg-subtle',
};

const ORDER: CriterionId[] = ['offer', 'audience', 'proofs', 'platforms', 'goal'];

interface BriefQualityMeterProps {
  quality: BriefQuality;
  language: 'fr' | 'en';
}

export function BriefQualityMeter({ quality, language }: BriefQualityMeterProps) {
  const scoreLabel = language === 'en' ? 'Brief readiness' : 'Qualité du brief';
  return (
    <div className="rounded-md border border-border bg-bg-elevated p-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
          {scoreLabel}
        </span>
        <span className="font-display text-lg font-semibold text-fg">{quality.score}/100</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg-muted">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            quality.score >= 80
              ? 'bg-emerald-400'
              : quality.score >= 50
              ? 'bg-amber-400'
              : 'bg-fg-subtle',
          )}
          style={{ width: `${Math.max(2, quality.score)}%` }}
        />
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-y-1.5 sm:grid-cols-5 sm:gap-x-2">
        {ORDER.map((c) => {
          const state = quality.perCriterion[c];
          const Icon = ICON[state];
          return (
            <li
              key={c}
              className="flex items-center gap-1.5 text-xs text-fg-muted"
              title={state}
            >
              <Icon size={13} className={ICON_TONE[state]} />
              <span className="truncate">{CRITERION_LABELS[c][language]}</span>
            </li>
          );
        })}
      </ul>
      {quality.hint && (
        <p className="mt-3 text-xs leading-relaxed text-fg-muted">{quality.hint}</p>
      )}
    </div>
  );
}
