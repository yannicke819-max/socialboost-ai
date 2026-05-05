'use client';

import { Sparkles, Bookmark, Check, Calendar, BarChart3, Lightbulb, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Asset, CalendarSlot, Offer } from '@/lib/offer-workspace/types';

interface OfferTimelineProps {
  offer: Offer;
  assets: Asset[];
  slots: CalendarSlot[];
  language: 'fr' | 'en';
}

type StepKey = 'generate' | 'save' | 'approve' | 'schedule' | 'analyse' | 'improve';

interface StepDef {
  key: StepKey;
  icon: LucideIcon;
  fr: string;
  en: string;
}

const STEPS: StepDef[] = [
  { key: 'generate', icon: Sparkles,  fr: 'Générée', en: 'Generated' },
  { key: 'save',     icon: Bookmark,  fr: 'Sauvegardée', en: 'Saved' },
  { key: 'approve',  icon: Check,     fr: 'Asset approuvé', en: 'Asset approved' },
  { key: 'schedule', icon: Calendar,  fr: 'Créneau planifié', en: 'Slot planned' },
  { key: 'analyse',  icon: BarChart3, fr: 'Analytics consultée', en: 'Analytics seen' },
  { key: 'improve',  icon: Lightbulb, fr: 'Recommandation appliquée', en: 'Reco applied' },
];

/**
 * Mini timeline at the top of the offer detail page.
 * Each step is "done" when its derived condition is met. The timeline never
 * claims a real publishing event — only structural progress.
 */
export function OfferTimeline({ offer, assets, slots, language }: OfferTimelineProps) {
  const done: Record<StepKey, boolean> = {
    generate: !!offer.lastActionables,
    save: true, // user landed here → offer was saved
    approve: assets.some((a) => a.status === 'approved'),
    schedule: slots.some((s) => s.status === 'planned' || s.status === 'sent_mock'),
    analyse: false, // V1: analytics is computed on demand; no event tracking
    improve: false, // V1: recommendation status is per-reco; we don't aggregate
  };

  return (
    <ol className="flex flex-wrap items-stretch gap-2">
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        const isDone = done[s.key];
        return (
          <li
            key={s.key}
            className={cn(
              'flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-[11px]',
              isDone
                ? 'border-emerald-400/40 bg-emerald-400/5 text-fg'
                : 'border-border bg-bg-elevated text-fg-muted',
            )}
            aria-current={isDone ? 'step' : undefined}
          >
            <Icon size={12} className={cn(isDone ? 'text-emerald-400' : 'text-fg-subtle')} />
            <span className="font-mono uppercase tracking-wider">
              {language === 'en' ? s.en : s.fr}
            </span>
            {i < STEPS.length - 1 && (
              <span aria-hidden className="text-fg-subtle/50">
                ›
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
