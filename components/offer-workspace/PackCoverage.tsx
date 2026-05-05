'use client';

import { ArrowRight } from 'lucide-react';
import { computePackCoverage } from '@/lib/offer-workspace/pack-generator';
import type { Asset } from '@/lib/offer-workspace/types';

interface PackCoverageProps {
  assets: Asset[];
  language: 'fr' | 'en';
}

export function PackCoverageCard({ assets, language }: PackCoverageProps) {
  const c = computePackCoverage(assets);
  const labels = language === 'en' ? L_EN : L_FR;
  const items: { key: string; label: string; count: number }[] = [
    { key: 'linkedin', label: labels.linkedin, count: c.linkedin_posts },
    { key: 'emails', label: labels.emails, count: c.emails },
    { key: 'hooks', label: labels.hooks, count: c.hooks },
    { key: 'ctas', label: labels.ctas, count: c.ctas },
    { key: 'video', label: labels.video, count: c.video_scripts },
    { key: 'image', label: labels.image, count: c.image_prompts },
    { key: 'carousel', label: labels.carousel, count: c.carousels },
    { key: 'landing', label: labels.landing, count: c.landing_heroes },
  ];

  return (
    <section className="rounded-md border border-border bg-bg-elevated p-4">
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
          {labels.title}
        </p>
        <p className="font-mono text-[11px] text-fg-muted">
          {c.approved}/{c.total} {labels.approvedSuffix}
        </p>
      </header>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
        {items.map((it) => (
          <li
            key={it.key}
            className="rounded-md border border-border bg-bg p-2 text-center"
          >
            <div className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
              {it.label}
            </div>
            <div className="mt-1 font-display text-lg font-semibold text-fg">
              {it.count}
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center gap-2 rounded-md border border-amber-400/30 bg-amber-400/5 px-3 py-2 text-[12px]">
        <ArrowRight size={12} className="text-amber-400" />
        <span className="text-fg">
          <span className="font-mono text-[10px] uppercase tracking-wider text-amber-400">
            {labels.nextLabel}
          </span>
          {' · '}
          {language === 'en' ? c.nextAction.en : c.nextAction.fr}
        </span>
      </div>
    </section>
  );
}

const L_FR = {
  title: 'Ce pack contient',
  approvedSuffix: 'approuvés',
  linkedin: 'LinkedIn',
  emails: 'Emails',
  hooks: 'Hooks',
  ctas: 'CTAs',
  video: 'Vidéos',
  image: 'Images',
  carousel: 'Carousel',
  landing: 'Landing',
  nextLabel: 'Prochaine action',
};
const L_EN = {
  title: 'This pack contains',
  approvedSuffix: 'approved',
  linkedin: 'LinkedIn',
  emails: 'Emails',
  hooks: 'Hooks',
  ctas: 'CTAs',
  video: 'Videos',
  image: 'Images',
  carousel: 'Carousel',
  landing: 'Landing',
  nextLabel: 'Next action',
};
