'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PlanId = 'free' | 'solo' | 'pro' | 'agency';

export type Plan = {
  id: PlanId;
  name: string;
  tagline: string;
  monthly: number;
  yearly: number;
  highlight?: boolean;
  beta?: boolean;
  cta: string;
  features: ReadonlyArray<string>;
  soonFeatures?: ReadonlyArray<string>;
};

export type PricingLabels = {
  monthly: string;
  yearly: string;
  yearlyBadge: string;
  perMonth: string;
  yearlyTotal: string;
  popular: string;
  betaBadge: string;
  free: string;
  fineprint: string;
};

export function PricingTable({
  plans,
  labels,
}: {
  plans: ReadonlyArray<Plan>;
  labels: PricingLabels;
}) {
  const [yearly, setYearly] = useState(true);

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <span className={cn('text-sm text-fg-muted', !yearly && 'font-semibold text-fg')}>
          {labels.monthly}
        </span>
        <button
          type="button"
          onClick={() => setYearly((y) => !y)}
          className="relative h-6 w-11 rounded-full bg-bg-muted transition"
          role="switch"
          aria-checked={yearly}
          aria-label={`Toggle ${yearly ? labels.monthly : labels.yearly}`}
        >
          <span
            className={cn(
              'absolute top-0.5 h-5 w-5 rounded-full bg-brand shadow transition',
              yearly ? 'left-5' : 'left-0.5',
            )}
          />
        </button>
        <span className={cn('text-sm text-fg-muted', yearly && 'font-semibold text-fg')}>
          {labels.yearly}{' '}
          <span className="font-mono text-xs text-amber">{labels.yearlyBadge}</span>
        </span>
      </div>

      <div className="mx-auto grid max-w-6xl gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
        {plans.map((plan) => {
          const isFree = plan.id === 'free';
          const price = yearly ? plan.yearly : plan.monthly;
          const yearlyTotal = labels.yearlyTotal.replace('{total}', String(plan.yearly * 12));

          return (
            <div
              key={plan.id}
              className={cn(
                'relative flex flex-col rounded-2xl border bg-bg-elevated p-6',
                plan.highlight
                  ? 'border-brand/40 shadow-glow'
                  : 'border-border hover:border-border-strong',
              )}
            >
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {plan.highlight && (
                  <span className="inline-block rounded-full bg-brand-soft px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-brand">
                    {labels.popular}
                  </span>
                )}
                {plan.beta && (
                  <span className="inline-block rounded-full border border-amber/40 bg-amber-soft px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-amber">
                    {labels.betaBadge}
                  </span>
                )}
              </div>

              <h3 className="text-xl font-bold text-fg">{plan.name}</h3>
              <p className="text-sm text-fg-muted">{plan.tagline}</p>

              <div className="mt-5">
                {isFree ? (
                  <span className="font-display text-4xl text-fg">{labels.free}</span>
                ) : (
                  <>
                    <span className="font-display text-4xl text-fg">{price} €</span>
                    <span className="font-mono text-xs uppercase tracking-wider text-fg-subtle">
                      {' '}
                      {labels.perMonth}
                    </span>
                  </>
                )}
              </div>
              {!isFree && yearly && (
                <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                  {yearlyTotal}
                </p>
              )}

              <Link
                href={`/signup?plan=${plan.id}`}
                className={cn(
                  'mt-6 rounded-md px-4 py-2.5 text-center text-sm font-semibold transition',
                  plan.highlight
                    ? 'bg-brand text-brand-fg hover:bg-brand/90'
                    : 'border border-border-strong text-fg hover:border-fg hover:bg-bg-muted',
                )}
              >
                {plan.cta}
              </Link>

              <ul className="mt-6 space-y-3 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-fg">
                    <Check size={16} className="mt-0.5 shrink-0 text-fg-muted" aria-hidden />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {plan.soonFeatures && plan.soonFeatures.length > 0 && (
                <ul className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
                  {plan.soonFeatures.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-fg-muted">
                      <Clock size={14} className="mt-1 shrink-0 text-fg-subtle" aria-hidden />
                      <span>
                        {f}{' '}
                        <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                          — bientôt
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-center font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
        {labels.fineprint}
      </p>
    </div>
  );
}
