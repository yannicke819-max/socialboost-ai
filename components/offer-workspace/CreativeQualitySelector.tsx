'use client';

/**
 * Creative Quality Selector v1 — prompt-only (AI-017E).
 *
 * Lets the user pick a creative intent (safe / social_proof /
 * performance / breakthrough) before reading the Creative Studio
 * pack. This component is a navigation surface only — selecting a
 * tier does NOT call any provider, NOT spend any credit, NOT trigger
 * any fetch. Selecting `breakthrough` shows a non-blocking warning
 * that the tier requires human review before any future media call.
 *
 * Hard rules pinned by tests:
 *   - Renders all four tiers from CREATIVE_QUALITY_TIERS.
 *   - Default selection is `'performance'`.
 *   - Selecting `breakthrough` reveals the human-review warning.
 *   - `aria-pressed` reflects the selected card.
 *   - No `fetch`, no `process.env`, no `OPENAI_API_KEY`.
 *   - No "Générer image" / "Générer vidéo" anywhere in runtime.
 */

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CREATIVE_QUALITY_TIERS,
  CREATIVE_RULES_BY_TIER,
  CREATIVE_SCORE_HINTS_BY_TIER,
  CREATIVE_STRATEGIES,
  type CreativeQualityTier,
  type CreativeScoreHints,
} from '@/lib/offer-workspace/creative-quality-tiers';
import {
  CREATIVE_STUDIO_EN,
  CREATIVE_STUDIO_FR,
  type CreativeStudioCopy,
} from '@/lib/offer-workspace/creative-studio-labels';

interface CreativeQualitySelectorProps {
  language?: 'fr' | 'en';
  selected: CreativeQualityTier;
  onSelect: (tier: CreativeQualityTier) => void;
}

export function CreativeQualitySelector({
  language = 'fr',
  selected,
  onSelect,
}: CreativeQualitySelectorProps) {
  const labels: CreativeStudioCopy =
    language === 'en' ? CREATIVE_STUDIO_EN : CREATIVE_STUDIO_FR;
  return (
    <section
      aria-label={labels.selectorTitle}
      className="rounded-md border border-border bg-bg-elevated/30 p-3"
    >
      <header>
        <p className="font-display text-sm font-semibold text-fg">
          {labels.selectorTitle}
        </p>
        <p className="mt-0.5 text-[12px] text-fg-muted">{labels.selectorSubtitle}</p>
        <p className="mt-1 text-[11px] italic text-fg-subtle">{labels.selectorHelper}</p>
      </header>

      <div
        role="radiogroup"
        aria-label={labels.selectorCurrentDirectionLabel}
        className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
      >
        {CREATIVE_QUALITY_TIERS.map((t) => (
          <TierCard
            key={t}
            tier={t}
            active={selected === t}
            language={language}
            labels={labels}
            onSelect={onSelect}
          />
        ))}
      </div>

      {selected === 'breakthrough' && (
        <p
          role="alert"
          className="mt-3 inline-flex items-center gap-1 rounded border border-amber-400/50 bg-amber-400/5 px-2 py-1 font-mono text-[11px] uppercase tracking-wider text-amber-400"
        >
          {labels.selectorWarningBreakthrough}
        </p>
      )}
    </section>
  );
}

function TierCard({
  tier,
  active,
  language,
  labels,
  onSelect,
}: {
  tier: CreativeQualityTier;
  active: boolean;
  language: 'fr' | 'en';
  labels: CreativeStudioCopy;
  onSelect: (tier: CreativeQualityTier) => void;
}) {
  const strategy = CREATIVE_STRATEGIES[tier];
  const tagline = labels.selectorTaglines[tier];
  const useWhen = labels.selectorUseWhen[tier];
  const rules = CREATIVE_RULES_BY_TIER[tier];
  const hints = CREATIVE_SCORE_HINTS_BY_TIER[tier];
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      aria-pressed={active}
      onClick={() => onSelect(tier)}
      className={cn(
        'flex w-full flex-col gap-2 rounded-md border bg-bg p-3 text-left transition focus-visible:ring-2 focus-visible:ring-brand',
        active
          ? 'border-brand bg-brand/5 ring-1 ring-brand'
          : 'border-border hover:border-border-strong',
      )}
    >
      <header className="flex items-center justify-between gap-2">
        <p className="font-display text-sm font-semibold text-fg">{strategy.label}</p>
        {active ? (
          <Check size={14} className="text-brand" />
        ) : (
          <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
            {tier}
          </span>
        )}
      </header>
      <p className="text-[11px] text-fg-muted">{tagline}</p>

      <section>
        <p className="font-mono text-[9px] uppercase tracking-wider text-fg-subtle">
          {labels.selectorUseWhenLabel}
        </p>
        <ul className="mt-0.5 space-y-0.5 text-[11px] text-fg-muted">
          {useWhen.map((u, i) => (
            <li key={i}>· {u}</li>
          ))}
        </ul>
      </section>

      <section>
        <p className="font-mono text-[9px] uppercase tracking-wider text-fg-subtle">
          {labels.selectorRulesLabel}
        </p>
        <p className="mt-0.5 font-mono text-[10px] text-fg-muted">
          {rules.join(' · ')}
        </p>
      </section>

      <section>
        <p className="font-mono text-[9px] uppercase tracking-wider text-fg-subtle">
          {labels.selectorScoreHintsLabel}
        </p>
        <ScoreHintsGrid hints={hints} labels={labels} />
      </section>

      {tier === 'breakthrough' && (
        <p className="rounded border border-amber-400/40 bg-amber-400/5 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-amber-400">
          {labels.selectorWarningBreakthrough}
        </p>
      )}
    </button>
  );
}

function ScoreHintsGrid({
  hints,
  labels,
}: {
  hints: CreativeScoreHints;
  labels: CreativeStudioCopy;
}) {
  const axes: (keyof CreativeScoreHints)[] = [
    'attention',
    'clarity',
    'credibility',
    'conversionIntent',
    'distinctiveness',
    'brandSafety',
  ];
  return (
    <ul className="mt-0.5 grid grid-cols-2 gap-x-2 gap-y-0.5 font-mono text-[10px] text-fg-muted">
      {axes.map((a) => {
        const v = hints[a];
        const tone =
          v === 'needs_review'
            ? 'text-amber-400'
            : v === 'very_high'
              ? 'text-emerald-400'
              : v === 'high'
                ? 'text-emerald-400/80'
                : v === 'low'
                  ? 'text-fg-subtle'
                  : 'text-fg-muted';
        return (
          <li key={a}>
            <span className="text-fg-subtle">{labels.selectorScoreAxisLabels[a]}: </span>
            <span className={tone}>{labels.selectorScoreLevelLabels[v]}</span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Build the prefix line that the Creative Studio prepends to every
 * copied prompt, e.g. *"Direction créative : Performance — Hook fort,
 * objection, CTA"*. Pure: no I/O.
 */
export function buildCreativeDirectionPrefix(
  tier: CreativeQualityTier,
  language: 'fr' | 'en' = 'fr',
): string {
  const labels = language === 'en' ? CREATIVE_STUDIO_EN : CREATIVE_STUDIO_FR;
  const strategy = CREATIVE_STRATEGIES[tier];
  const tagline = labels.selectorTaglines[tier];
  return `${labels.copyPrefixLabel} : ${strategy.label} — ${tagline}`;
}
