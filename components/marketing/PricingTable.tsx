'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

type Plan = {
  id: 'starter' | 'pro' | 'studio';
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
    id: 'starter',
    name: 'Starter',
    tagline: 'Tester le wedge',
    monthly: 29,
    yearly: 24,
    cta: 'Commencer',
    features: [
      '1 Brand Voice',
      '20 inputs / mois',
      '3 plateformes (LinkedIn, IG, X)',
      '2 variantes par plateforme',
      'Brand Voice Setup standard',
      'Publication manuelle (copier-coller)',
      'Support email',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'Ma machine de prod hebdo',
    monthly: 79,
    yearly: 66,
    highlight: true,
    cta: 'Démarrer 14 j gratuits',
    features: [
      '3 Brand Voices',
      '100 inputs / mois',
      'Toutes plateformes (5)',
      '3 variantes par plateforme',
      'Brand Voice Setup avancé (analyse posts)',
      'Boost Score prédictif',
      'Publication LinkedIn auto',
      'Support prioritaire',
    ],
  },
  {
    id: 'studio',
    name: 'Studio',
    tagline: 'Je gère mes clients',
    monthly: 199,
    yearly: 166,
    cta: 'Choisir Studio',
    features: [
      '10 Brand Voices (équipe / clients)',
      'Inputs illimités',
      '5 variantes par plateforme',
      'Import posts existants',
      'Boost Score + recommandations',
      'Publication multi-réseaux',
      '3 sièges inclus (+39 €/siège)',
      'Slack partagé avec l’équipe',
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
          Annuel <span className="text-brand-500">soit 2 mois offerts</span>
        </span>
      </div>

      <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
        {PLANS.map((plan) => {
          const price = yearly ? plan.yearly : plan.monthly;
          return (
            <div
              key={plan.id}
              className={cn(
                'flex flex-col rounded-2xl border bg-white p-7 dark:bg-gray-900',
                plan.highlight
                  ? 'border-brand-500 shadow-xl ring-1 ring-brand-500/30'
                  : 'border-gray-200 dark:border-gray-800',
              )}
            >
              {plan.highlight && (
                <span className="mb-3 inline-block w-fit rounded-full bg-brand-500/10 px-2.5 py-0.5 text-xs font-semibold text-brand-600">
                  Le plus populaire
                </span>
              )}
              <h3 className="text-xl font-bold">{plan.name}</h3>
              <p className="text-sm text-gray-500">{plan.tagline}</p>
              <div className="mt-5">
                <span className="text-4xl font-bold">
                  {price} €
                </span>
                <span className="text-sm text-gray-500"> / mois</span>
              </div>
              {yearly && (
                <p className="mt-1 text-xs text-gray-500">
                  Soit {plan.yearly * 12} € / an facturés
                </p>
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
            </div>
          );
        })}
      </div>

      <p className="text-center text-sm text-gray-500">
        Trial 14 jours sur le Pro · Annulation en 1 clic · Paiement sécurisé Stripe
      </p>
    </div>
  );
}
