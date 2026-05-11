'use client';

/**
 * Creative Test Plan section — read-only UI (AI-017H).
 *
 * Renders the deterministic plan produced by `buildCreativeTestPlan`.
 * No fetch, no env access, no API call. The single "Copier le plan
 * de test" button writes plain text to `navigator.clipboard`.
 *
 * Hard rules pinned by tests:
 *   - Renders the three spec-pinned microcopy sentences:
 *       "Plan indicatif : teste une variable à la fois."
 *       "SocialBoost ne publie rien automatiquement."
 *       "Les scores ne prédisent pas les résultats…"
 *   - Never renders "Publier", "Lancer campagne", "Générer image",
 *     "Générer vidéo", "Optimiser avec IA".
 *   - At most 3 ranked test cards.
 *   - reviewRequired badge surfaces clearly on relevant cards.
 */

import { useState } from 'react';
import { AlertTriangle, Check, ClipboardCopy, ListChecks } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  creativeTestPlanToText,
  type CreativeTestPlan,
} from '@/lib/offer-workspace/creative-test-plan';
import {
  CREATIVE_STUDIO_EN,
  CREATIVE_STUDIO_FR,
  type CreativeStudioCopy,
} from '@/lib/offer-workspace/creative-studio-labels';

interface CreativeTestPlanProps {
  plan: CreativeTestPlan | null;
  language?: 'fr' | 'en';
}

export function CreativeTestPlanSection({
  plan,
  language = 'fr',
}: CreativeTestPlanProps) {
  const labels: CreativeStudioCopy =
    language === 'en' ? CREATIVE_STUDIO_EN : CREATIVE_STUDIO_FR;
  const [notice, setNotice] = useState<string | null>(null);

  if (!plan || plan.recommendedOrder.length === 0) return null;

  const handleCopy = async () => {
    const text = creativeTestPlanToText(plan);
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
      setNotice(labels.testPlanCopiedToast);
      setTimeout(() => setNotice(null), 1800);
    } catch {
      setNotice(labels.copyFailedToast);
      setTimeout(() => setNotice(null), 1800);
    }
  };

  return (
    <section
      aria-label={labels.testPlanTitle}
      className="rounded-md border border-border bg-bg-elevated/30 p-3"
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="inline-flex items-center gap-1.5 font-display text-sm font-semibold text-fg">
            <ListChecks size={14} className="text-fg-subtle" />
            {labels.testPlanTitle}
          </p>
          <p className="mt-0.5 text-[12px] text-fg-muted">{labels.testPlanSubtitle}</p>
        </div>
        {notice && (
          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-400/40 bg-emerald-400/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-emerald-400">
            <Check size={10} /> {notice}
          </span>
        )}
      </header>

      <ul role="list" className="mt-3 grid gap-2">
        {plan.recommendedOrder.map((t, i) => (
          <li
            key={t.id}
            className="rounded border border-border bg-bg p-3"
          >
            <header className="flex flex-wrap items-center justify-between gap-1">
              <p className="font-mono text-[11px] uppercase tracking-wider text-brand">
                #{i + 1} · {t.title}
              </p>
              {t.reviewRequired && (
                <span className="inline-flex items-center gap-1 rounded border border-amber-400/50 bg-amber-400/5 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-amber-400">
                  <AlertTriangle size={10} /> {labels.testPlanReviewRequiredBadge}
                </span>
              )}
            </header>

            <ul className="mt-1 grid gap-0.5 font-mono text-[10px] text-fg-muted">
              <li>
                <span className="text-fg-subtle">{labels.testPlanHypothesisLabel}:</span>{' '}
                <span className="text-fg">{t.hypothesis}</span>
              </li>
              <li>
                <span className="text-fg-subtle">{labels.testPlanVariableLabel}:</span>{' '}
                <span className="text-fg">
                  {labels.testPlanVariableLabels[t.variableToTest] ?? t.variableToTest}
                </span>
              </li>
              <li>
                <span className="text-fg-subtle">{labels.testPlanPrimaryMetricLabel}:</span>{' '}
                <span className="text-fg">{t.primaryMetric}</span>
                {t.secondaryMetric ? (
                  <span className="text-fg-subtle"> · {t.secondaryMetric}</span>
                ) : null}
              </li>
              <li>
                <span className="text-fg-subtle">{labels.testPlanDurationLabel}:</span>{' '}
                <span className="text-fg">{t.recommendedDuration}</span>
              </li>
            </ul>

            <details className="mt-1 rounded border border-border bg-bg-elevated/40">
              <summary className="cursor-pointer px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-fg-subtle hover:text-fg">
                {labels.testPlanWhyLabel}
              </summary>
              <div className="border-t border-border px-2 py-1 text-[11px] text-fg-muted">
                <p>{t.whyThisTest}</p>
                <p className="mt-1">
                  <span className="text-fg-subtle">{labels.testPlanWatchoutLabel}:</span>{' '}
                  {t.watchout}
                </p>
                <p className="mt-1 italic text-fg-subtle">
                  Signal : {t.expectedSignal}
                </p>
              </div>
            </details>
          </li>
        ))}
      </ul>

      <div className="mt-3">
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            'inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-brand/40 bg-brand/5 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-fg transition hover:border-brand focus-visible:ring-2 focus-visible:ring-brand',
          )}
        >
          <ClipboardCopy size={12} /> {labels.testPlanCopyButton}
        </button>
      </div>

      <ul className="mt-2 grid gap-0.5 font-mono text-[10px] italic text-fg-subtle">
        <li>{plan.oneVariableAtATime}</li>
        <li>{plan.noAutomaticPublishing}</li>
        <li>{plan.scoresDoNotPredict}</li>
      </ul>
    </section>
  );
}
