'use client';

import { Sparkles, Bookmark, Check, Calendar, BarChart3, Lightbulb } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface HowItWorksBannerProps {
  language: 'fr' | 'en';
}

interface Step {
  icon: LucideIcon;
  fr: { label: string; sub: string };
  en: { label: string; sub: string };
}

const STEPS: Step[] = [
  {
    icon: Sparkles,
    fr: { label: '1 · Générer', sub: "depuis Offer Brain" },
    en: { label: '1 · Generate', sub: 'from Offer Brain' },
  },
  {
    icon: Bookmark,
    fr: { label: '2 · Sauvegarder', sub: "l'offre dans le workspace" },
    en: { label: '2 · Save', sub: 'the offer to the workspace' },
  },
  {
    icon: Check,
    fr: { label: '3 · Approuver', sub: 'les meilleurs assets' },
    en: { label: '3 · Approve', sub: 'the best assets' },
  },
  {
    icon: Calendar,
    fr: { label: '4 · Planifier', sub: 'les créneaux (mock)' },
    en: { label: '4 · Schedule', sub: 'slots (mock)' },
  },
  {
    icon: BarChart3,
    fr: { label: '5 · Analyser', sub: 'la performance par dimension' },
    en: { label: '5 · Analyse', sub: 'performance by dimension' },
  },
  {
    icon: Lightbulb,
    fr: { label: '6 · Améliorer', sub: 'via les recommandations' },
    en: { label: '6 · Improve', sub: 'via recommendations' },
  },
];

export function HowItWorksBanner({ language }: HowItWorksBannerProps) {
  const labels = language === 'en' ? L_EN : L_FR;
  return (
    <section
      aria-labelledby="how-it-works"
      className="rounded-md border border-border bg-bg-elevated p-4"
    >
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p
            id="how-it-works"
            className="font-mono text-[11px] uppercase tracking-wider text-fg-subtle"
          >
            {labels.title}
          </p>
          <p className="mt-1 max-w-2xl text-sm text-fg-muted">{labels.sub}</p>
        </div>
        <span
          className="rounded-full border border-amber-400/40 bg-amber-400/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-amber-400"
          title={labels.mockTooltip}
        >
          {labels.mockBadge}
        </span>
      </header>
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const t = language === 'en' ? s.en : s.fr;
          return (
            <li
              key={i}
              className="flex items-start gap-2 rounded-md border border-border bg-bg p-2.5"
            >
              <Icon size={14} className="mt-0.5 shrink-0 text-fg-subtle" />
              <div className="min-w-0">
                <p className="truncate font-mono text-[11px] uppercase tracking-wider text-fg">
                  {t.label}
                </p>
                <p className="mt-0.5 line-clamp-2 text-[11px] text-fg-muted">{t.sub}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

const L_FR = {
  title: 'Comment ça marche',
  sub: "Le workspace transforme une offre brute en système diffusion + analyse + amélioration. Tout est mock V1 : aucune publication, aucune analytics réelle.",
  mockBadge: 'MOCK V1',
  mockTooltip:
    "Aucune publication réelle, aucune analytics réelle. Les données sont locales (localStorage) et déterministes pour permettre la démonstration.",
};
const L_EN = {
  title: 'How it works',
  sub: 'The workspace turns a raw offer into a distribution + analysis + improvement system. Everything is MOCK V1: no real publishing, no real analytics.',
  mockBadge: 'MOCK V1',
  mockTooltip:
    'No real publishing, no real analytics. Data is local (localStorage) and deterministic for demo purposes.',
};
