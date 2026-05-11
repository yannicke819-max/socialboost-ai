'use client';

/**
 * Creative Score Panel — visible scoring badges per concept (AI-017G).
 *
 * Renders the six-axis CreativeScorecard produced by
 * `buildCreativeScorecard`. No fetch, no process.env, no AI model
 * call. Scores are deterministic local heuristics — pinned by the
 * spec-required microcopy *"Scores indicatifs, pas une prédiction de
 * performance."* and *"Basé sur les signaux créatifs du concept, sans
 * appel à un modèle IA."*
 */

import { useState } from 'react';
import { AlertTriangle, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CREATIVE_SCORE_AXES,
  type CreativeScorecard,
  type CreativeScorecardLevel,
} from '@/lib/offer-workspace/creative-scoring';
import {
  CREATIVE_STUDIO_EN,
  CREATIVE_STUDIO_FR,
  type CreativeStudioCopy,
} from '@/lib/offer-workspace/creative-studio-labels';

interface CreativeScorePanelProps {
  scorecard: CreativeScorecard;
  language?: 'fr' | 'en';
  /** Tighter visual on small concept cards. */
  compact?: boolean;
}

export function CreativeScorePanel({
  scorecard,
  language = 'fr',
  compact = false,
}: CreativeScorePanelProps) {
  const labels: CreativeStudioCopy =
    language === 'en' ? CREATIVE_STUDIO_EN : CREATIVE_STUDIO_FR;
  const [open, setOpen] = useState(false);

  return (
    <section
      aria-label={labels.scoringTitle}
      className={cn(
        'rounded border border-border bg-bg-elevated/30 px-2 py-1.5',
        compact ? '' : 'p-3',
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-1">
        <p className="font-mono text-[9px] uppercase tracking-wider text-fg-subtle">
          {labels.scoringTitle}
        </p>
        <OverallPill
          label={labels.scoringOverall[scorecard.overallLabel]}
          overall={scorecard.overallLabel}
        />
      </header>

      <p className="mt-0.5 font-mono text-[9px] text-fg-subtle">
        {labels.scoringContextLabel}:{' '}
        <span className="text-fg-muted">
          {labels.scoringPlatformLabels[scorecard.platformContext]}
        </span>
      </p>

      <ul
        role="list"
        className={cn(
          'mt-1 flex flex-wrap gap-1',
          compact ? 'gap-x-1.5' : 'gap-x-2',
        )}
      >
        {CREATIVE_SCORE_AXES.map((axis) => {
          const s = scorecard.scores.find((x) => x.axis === axis);
          if (!s) return null;
          return (
            <li key={axis}>
              <ScoreBadge
                axisLabel={labels.scoringAxisLabels[axis]}
                level={s.level}
                levelLabel={labels.scoringLevelLabels[s.level]}
              />
            </li>
          );
        })}
      </ul>

      <p className="mt-1 grid gap-0.5 font-mono text-[10px] text-fg-muted">
        <span>
          <span className="text-fg-subtle">{labels.scoringTopStrengthLabel}:</span>{' '}
          <span className="text-emerald-400">
            {labels.scoringAxisLabels[scorecard.topStrength]}
          </span>
        </span>
        <span>
          <span className="text-fg-subtle">{labels.scoringMainWatchoutLabel}:</span>{' '}
          <span className="text-amber-400">
            {labels.scoringAxisLabels[scorecard.mainWatchout]}
          </span>
        </span>
      </p>

      <button
        type="button"
        onClick={() => setOpen((b) => !b)}
        aria-expanded={open}
        className="mt-1 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-fg-subtle hover:text-fg focus-visible:ring-2 focus-visible:ring-brand"
      >
        {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}{' '}
        {labels.scoringExpandLabel}
      </button>

      {open && (
        <ul role="list" className="mt-1 grid gap-1 text-[10px] text-fg-muted">
          {scorecard.scores.map((s) => (
            <li key={s.axis} className="rounded border border-border bg-bg px-2 py-1">
              <p className="font-mono text-[10px]">
                <span className="text-fg-subtle">
                  {labels.scoringAxisLabels[s.axis]}:
                </span>{' '}
                <span className="text-fg">{labels.scoringLevelLabels[s.level]}</span>
              </p>
              <p className="mt-0.5 italic text-fg-subtle">{s.rationale}</p>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-1 font-mono text-[9px] italic text-fg-subtle">
        {labels.scoringMicrocopyIndicative}
      </p>
      <p className="font-mono text-[9px] italic text-fg-subtle">
        {labels.scoringMicrocopyNoAi}
      </p>
    </section>
  );
}

function ScoreBadge({
  axisLabel,
  level,
  levelLabel,
}: {
  axisLabel: string;
  level: CreativeScorecardLevel;
  levelLabel: string;
}) {
  const tone =
    level === 'needs_review'
      ? 'border-amber-400/60 bg-amber-400/5 text-amber-400'
      : level === 'very_high'
        ? 'border-emerald-400/60 bg-emerald-400/5 text-emerald-400'
        : level === 'high'
          ? 'border-emerald-400/40 bg-emerald-400/5 text-emerald-400/80'
          : level === 'low'
            ? 'border-border bg-bg text-fg-subtle'
            : 'border-border bg-bg-elevated text-fg-muted';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider',
        tone,
      )}
    >
      {level === 'needs_review' ? (
        <AlertTriangle size={9} />
      ) : level === 'very_high' || level === 'high' ? (
        <Check size={9} />
      ) : null}
      <span className="text-fg-subtle">{axisLabel}:</span>{' '}
      <span className="text-fg-muted">{levelLabel}</span>
    </span>
  );
}

function OverallPill({
  label,
  overall,
}: {
  label: string;
  overall: CreativeScorecard['overallLabel'];
}) {
  const tone =
    overall === 'review_required'
      ? 'border-amber-400/60 bg-amber-400/5 text-amber-400'
      : overall === 'strong_candidate'
        ? 'border-emerald-400/60 bg-emerald-400/5 text-emerald-400'
        : overall === 'safe_to_test'
          ? 'border-brand/40 bg-brand/5 text-brand'
          : 'border-border bg-bg-elevated text-fg-muted';
  return (
    <span
      className={cn(
        'rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider',
        tone,
      )}
    >
      {label}
    </span>
  );
}
