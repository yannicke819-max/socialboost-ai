'use client';

import {
  Compass,
  Megaphone,
  Layout,
  MessageSquareWarning,
  Lightbulb,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { GOALS, GOAL_LABELS, type Goal } from '@/lib/offer-brain-ui/ordering';

const ICON: Record<Goal, LucideIcon> = {
  clarify_offer: Compass,
  social_content: Megaphone,
  landing_page: Layout,
  objections: MessageSquareWarning,
  sales_angles: Lightbulb,
};

interface GoalSelectorProps {
  value: Goal;
  onChange: (g: Goal) => void;
  language: 'fr' | 'en';
}

export function GoalSelector({ value, onChange, language }: GoalSelectorProps) {
  return (
    <fieldset className="space-y-3">
      <legend className="font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
        {language === 'en' ? 'Your goal' : 'Votre objectif'}
      </legend>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {GOALS.map((g) => {
          const Icon = ICON[g];
          const active = value === g;
          return (
            <button
              key={g}
              type="button"
              onClick={() => onChange(g)}
              className={cn(
                'group flex items-start gap-2 rounded-md border px-3 py-2.5 text-left text-sm transition',
                active
                  ? 'border-brand bg-brand/10 text-fg shadow-glow'
                  : 'border-border bg-bg-elevated text-fg-muted hover:border-border-strong hover:text-fg',
              )}
              aria-pressed={active}
            >
              <Icon
                size={16}
                className={cn('mt-0.5 shrink-0', active ? 'text-brand' : 'text-fg-subtle group-hover:text-fg-muted')}
              />
              <span className="font-medium leading-snug">{GOAL_LABELS[g][language]}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
