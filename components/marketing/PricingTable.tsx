'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

type Plan = {
  id: 'free' | 'creator' | 'pro' | 'agency';
  name: string;
  tagline: string;
  monthly: number;
  yearly: number;
  highlight?: boolean;
  cta: string;
  features: string[];
};

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Teste l’IA',
    monthly: 0,
    yearly: 0,
    cta: 'Commencer gratuitement',
    features: [
      '1 compte social',
      '10 posts IA / mois',
      'Calendrier basique',
      'Watermark "Créé avec SocialBoost"',
      'Support communautaire',
    ],
  },
  {
    id: 'creator',
    name: 'Creator',
    tagline: 'Créateur solo',
    monthly: 14.9,
    yearly: 11.9,
    highlight: true,
    cta: 'Essayer 7 jours',
    features: [
      '3 comptes sociaux',
      '100 posts IA / mois',
      'Toutes plateformes',
      'Smart scheduling + Boost Score',
      'Repurposing 5 / mois',
      '20 visuels IA / mois',
      'Support email 48 h',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'TPE / freelance',
    monthly: 29.9,
    yearly: 23.9,
    cta: 'Choisir Pro',
    features: [
      '6 comptes sociaux',
      '400 posts IA / mois',
      'Repurposing illimité',
      'Recos IA hebdo',
      '100 visuels IA / mois',
      'Auto-refresh des posts',
      'Export PDF rapports',
      'Support chat prioritaire',
    ],
  },
  {
    id: 'agency',
    name: 'Agency',
    tagline: 'Micro-agence',
    monthly: 79.9,
    yearly: 63.9,
    cta: 'Choisir Agency',
    features: [
      '20 comptes sociaux multi-clients',
      '1 500 posts IA / mois',
      '3 seats inclus',
      'White-label reports',
      'API access',
      'Support dédié + onboarding 1:1',
    ],
  },
];

export function PricingTable() {
  const [yearly, setYearly] = useState(true);

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-center gap-3">
        <span className={cn('text-sm', !yearly && 'font-semibold')}>Mensuel</span>
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
          Annuel <span className="text-brand-500">−20 %</span>
        </span>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan) => {
          const price = yearly ? plan.yearly : plan.monthly;
          return (
            <div
              key={plan.id}
              className={cn(
                'flex flex-col rounded-2xl border bg-white p-6 dark:bg-gray-900',
                plan.highlight
                  ? 'border-brand-500 shadow-xl ring-1 ring-brand-500/30'
                  : 'border-gray-200 dark:border-gray-800',
              )}
            >
              {plan.highlight && (
                <span className="mb-3 inline-block rounded-full bg-brand-500/10 px-2.5 py-0.5 text-xs font-semibold text-brand-600 w-fit">
                  Le plus populaire
                </span>
              )}
              <h3 className="text-xl font-bold">{plan.name}</h3>
              <p className="text-sm text-gray-500">{plan.tagline}</p>
              <div className="mt-4">
                <span className="text-4xl font-bold">
                  {price === 0 ? '0 €' : `${price.toFixed(2).replace('.', ',')} €`}
                </span>
                {price > 0 && <span className="text-sm text-gray-500"> / mois</span>}
              </div>
              {yearly && price > 0 && (
                <p className="mt-1 text-xs text-gray-500">
                  Facturé {(plan.yearly * 12).toFixed(0)} € / an
                </p>
              )}
              <Link
                href={plan.id === 'free' ? '/signup' : `/signup?plan=${plan.id}`}
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
            </div>
          );
        })}
      </div>

      <p className="text-center text-sm text-gray-500">
        Annulation en 1 clic · Sans engagement · Paiement sécurisé Stripe
      </p>
    </div>
  );
}
