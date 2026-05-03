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
        <span className={cn('text-sm', !yearly && 'font-semibold')}>{labels.monthly}</span>
        <button
          type="button"
          onClick={() => setYearly((y) => !y)}
          className="relative h-6 w-11 rounded-full bg-gray-200 transition dark:bg-gray-700"
          role="switch"
          aria-checked={yearly}
        >
          <span
            className={cn(
              'absolute top-0.5 h-5 w-5 rounded-full bg-brand-500 shadow transition',
              yearly ? 'left-5' : 'left-0.5',
            )}
          />
        </button>
        <span className={cn('text-sm', yearly && 'font-semibold')}>
          {labels.yearly} <span className="text-brand-500">{labels.yearlyBadge}</span>
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
                'relative flex flex-col rounded-2xl border bg-white p-6 dark:bg-gray-900',
                plan.highlight
                  ? 'border-brand-500 shadow-xl ring-1 ring-brand-500/30'
                  : 'border-gray-200 dark:border-gray-800',
              )}
            >
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {plan.highlight && (
                  <span className="inline-block rounded-full bg-brand-500/10 px-2.5 py-0.5 text-xs font-semibold text-brand-600">
                    {labels.popular}
                  </span>
                )}
                {plan.beta && (
                  <span className="inline-block rounded-full border border-amber-400/50 bg-amber-400/10 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                    {labels.betaBadge}
                  </span>
                )}
              </div>

              <h3 className="text-xl font-bold">{plan.name}</h3>
              <p className="text-sm text-gray-500">{plan.tagline}</p>

              <div className="mt-5">
                {isFree ? (
                  <span className="text-4xl font-bold">{labels.free}</span>
                ) : (
                  <>
                    <span className="text-4xl font-bold">{price} €</span>
                    <span className="text-sm text-gray-500"> {labels.perMonth}</span>
                  </>
                )}
              </div>
              {!isFree && yearly && (
                <p className="mt-1 text-xs text-gray-500">{yearlyTotal}</p>
              )}

              <Link
                href={`/signup?plan=${plan.id}`}
                className={cn(
                  'mt-6 rounded-lg px-4 py-2.5 text-center text-sm font-semibold transition',
                  plan.highlight
                    ? 'bg-brand-500 text-white hover:bg-brand-600'
                    : 'border border-gray-300 hover:border-brand-500 hover:text-brand-600 dark:border-gray-700',
                )}
              >
                {plan.cta}
              </Link>

              <ul className="mt-6 space-y-3 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check size={16} className="mt-0.5 shrink-0 text-brand-500" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {plan.soonFeatures && plan.soonFeatures.length > 0 && (
                <ul className="mt-4 space-y-2 border-t border-gray-100 pt-4 text-sm dark:border-gray-800">
                  {plan.soonFeatures.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-gray-500">
                      <Clock size={14} className="mt-1 shrink-0" />
                      <span>
                        {f} <span className="text-xs italic text-gray-400">— bientôt</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-center text-sm text-gray-500">{labels.fineprint}</p>
    </div>
  );
}
