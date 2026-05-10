'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Beaker,
  Check,
  ChevronDown,
  Sparkles,
  TrendingUp,
  X,
  History,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  FUNNEL_STAGE_LABELS,
  PRIMARY_KPI_LABELS,
  type Asset,
  type ConfidenceLevel,
  type EffortLevel,
  type FeedbackRecommendation,
  type Offer,
} from '@/lib/offer-workspace/types';
import type { WorkspaceStore } from '@/lib/offer-workspace/store';
import {
  buildFeedbackReport,
  toPersistedRecommendation,
} from '@/lib/offer-workspace/feedback-engine';
import { buildSingleVariant } from '@/lib/offer-workspace/pack-generator';

interface FeedbackTabProps {
  offer: Offer;
  assets: Asset[];
  language: 'fr' | 'en';
  store: WorkspaceStore;
  onUpdate: () => void;
  onNavigateTab?: (tab: 'brief' | 'assets' | 'plan' | 'calendar' | 'analytics' | 'recos' | 'feedback') => void;
}

export function FeedbackTab({
  offer,
  assets,
  language,
  store,
  onUpdate,
  onNavigateTab,
}: FeedbackTabProps) {
  const labels = language === 'en' ? L_EN : L_FR;
  const plan = store.getWeeklyPlanByOffer(offer.id);
  const history = store.listFeedbackHistory(offer.id);

  const report = useMemo(() => {
    if (!plan) return undefined;
    return buildFeedbackReport({ offer, plan, assets, language });
  }, [offer, plan, assets, language]);

  // Sync derived recos into the store, preserving applied/dismissed.
  useEffect(() => {
    if (!plan || !report) return;
    const persisted = report.recommendations.map((d) =>
      toPersistedRecommendation(d, offer.id, plan.id),
    );
    store.upsertFeedbackRecommendations(plan.id, persisted);
  }, [offer.id, plan, report, store]);

  const stored = plan ? store.listFeedbackRecommendations(plan.id) : [];
  // Preserve engine order, fall back to derived.
  const orderedRecos = useMemo(() => {
    if (!plan || !report) return [] as FeedbackRecommendation[];
    return report.recommendations
      .map((d) => {
        const id = `${plan.id}:${d.ruleId}`;
        return stored.find((s) => s.id === id) ?? toPersistedRecommendation(d, offer.id, plan.id);
      });
  }, [plan, report, stored, offer.id]);

  const [notice, setNotice] = useState<string | null>(null);
  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 1800);
  };

  // -------------------------------------------------------------------------
  // Empty state 1 — no plan
  // -------------------------------------------------------------------------
  if (!plan) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-dashed border-border bg-bg-elevated/40 p-8 text-center">
          <TrendingUp size={22} className="mx-auto mb-3 text-fg-subtle" />
          <h2 className="font-display text-xl font-semibold text-fg">{labels.emptyNoPlanTitle}</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-fg-muted">{labels.emptyNoPlanBody}</p>
          <button
            type="button"
            onClick={() => onNavigateTab?.('plan')}
            className="mt-5 inline-flex items-center gap-1.5 rounded-md border border-brand/40 bg-brand/5 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-fg transition hover:border-brand"
          >
            <Target size={12} /> {labels.emptyNoPlanCta}
          </button>
        </div>
        <p className="text-center text-[11px] text-fg-subtle">{labels.mockExplain}</p>
      </div>
    );
  }

  const readyOrScheduled = plan.slots.filter(
    (s) => !s.free && (s.status === 'ready' || s.status === 'scheduled'),
  ).length;

  // -------------------------------------------------------------------------
  // Empty state 2 — plan but no ready/scheduled slot
  // -------------------------------------------------------------------------
  if (readyOrScheduled === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-amber-400/30 bg-amber-400/5 p-6">
          <AlertTriangle size={18} className="mb-2 text-amber-400" />
          <h2 className="font-display text-lg font-semibold text-fg">{labels.emptyNoReadyTitle}</h2>
          <p className="mt-1 max-w-xl text-sm text-fg-muted">{labels.emptyNoReadyBody}</p>
          <button
            type="button"
            onClick={() => onNavigateTab?.('plan')}
            className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-brand/40 bg-brand/5 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-fg transition hover:border-brand"
          >
            <Target size={12} /> {labels.emptyNoReadyCta}
          </button>
        </div>
        <p className="text-[11px] text-fg-subtle">{labels.mockExplain}</p>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Full report
  // -------------------------------------------------------------------------
  const r = report!;
  const partial = readyOrScheduled < 3;
  const avgGlobal =
    r.metrics.length === 0
      ? 0
      : Math.round(r.metrics.reduce((s, m) => s + m.global_score, 0) / r.metrics.length);
  const avgFit =
    r.metrics.length === 0
      ? 0
      : Math.round(r.metrics.reduce((s, m) => s + m.audience_fit, 0) / r.metrics.length);

  return (
    <div className="space-y-5">
      {/* Hero: scores */}
      <header className="rounded-md border border-brand/30 bg-brand/5 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-wider text-brand">
              {labels.heroEyebrow}
            </p>
            <h2 className="mt-1 font-display text-xl font-semibold text-fg sm:text-2xl">
              {labels.heroTitle}
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-fg-muted">{labels.heroSubtitle}</p>
          </div>
          <div className="flex flex-wrap items-stretch gap-2">
            <ScoreBadge label={labels.scoreEditorial} value={avgGlobal} accent="brand" />
            <ScoreBadge label={labels.scoreFit} value={avgFit} accent="emerald" />
          </div>
        </div>
        {notice && (
          <p className="mt-3 inline-flex items-center gap-1 rounded-md border border-emerald-400/40 bg-emerald-400/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-emerald-400">
            <Check size={10} /> {notice}
          </p>
        )}
      </header>

      <p className="rounded border border-amber-400/30 bg-amber-400/5 px-3 py-2 text-[11px] text-amber-400">
        {labels.mockExplain}
      </p>

      {partial && (
        <div className="rounded-md border border-amber-400/30 bg-amber-400/5 p-3 text-sm">
          <span className="font-mono text-[10px] uppercase tracking-wider text-amber-400">
            {labels.partialBadge}
          </span>{' '}
          <span className="text-fg-muted">{labels.partialBody}</span>
        </div>
      )}

      {/* What works / What to improve */}
      <div className="grid gap-3 md:grid-cols-2">
        <SignalsBlock
          title={labels.whatWorks}
          icon={<BadgeCheck size={14} className="text-emerald-400" />}
          tone="emerald"
          items={r.headlines.whatWorks}
          empty={labels.whatWorksEmpty}
        />
        <SignalsBlock
          title={labels.whatToImprove}
          icon={<AlertTriangle size={14} className="text-amber-400" />}
          tone="amber"
          items={r.headlines.whatToImprove}
          empty={labels.whatToImproveEmpty}
        />
      </div>

      {/* Balance flags */}
      <BalanceCard
        title={labels.balanceTitle}
        flags={r.balance.flags}
        labels={labels}
        pillarCounts={r.balance.pillarCounts}
        funnelCounts={r.balance.funnelCounts}
        channelCounts={r.balance.channelCounts}
      />

      {/* Per-slot metrics */}
      <section className="rounded-md border border-border bg-bg-elevated">
        <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <h3 className="font-mono text-[11px] uppercase tracking-wider text-fg">
            {labels.slotsTitle}
          </h3>
          <span className="font-mono text-[10px] text-fg-subtle">
            {r.metrics.length} {labels.slotsSuffix}
          </span>
        </header>
        <ul className="divide-y divide-border/60">
          {r.metrics.map((m) => {
            const slot = plan.slots.find((s) => s.id === m.slotId);
            return (
              <li key={m.slotId} className="px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                      {slot?.suggestedTime ?? '—'} · {slot?.channel ?? '—'}
                    </span>
                    <span className="rounded-full border border-brand/30 bg-brand/5 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-fg-muted">
                      {FUNNEL_STAGE_LABELS[m.funnelStage][language]}
                    </span>
                    <span className="rounded-full border border-border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-fg-subtle">
                      {labels.intent} {m.intentLevel}
                    </span>
                    <span className="rounded-full border border-border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-fg-subtle">
                      KPI {PRIMARY_KPI_LABELS[m.primaryKpi][language]}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ScoreChip label={labels.fit} value={m.audience_fit} />
                    <ScoreChip label={labels.score} value={m.global_score} accent />
                  </div>
                </div>
                <p className="mt-1 truncate text-sm font-medium text-fg">
                  {slot?.hook ?? '—'}
                </p>
                <div className="mt-1 grid grid-cols-2 gap-1 sm:grid-cols-4">
                  <Metric label={labels.impressions} value={m.impressions_mock} />
                  <Metric label={labels.engagement} value={m.engagement_mock} />
                  <Metric label={labels.clicks} value={m.clicks_mock} />
                  <Metric label={labels.leads} value={m.leads_mock} />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Recommendations */}
      <section className="space-y-2">
        <h3 className="font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
          {labels.recsTitle}
        </h3>
        <ul className="space-y-2">
          {orderedRecos.map((reco) => (
            <RecoCard
              key={reco.id}
              reco={reco}
              language={language}
              onApply={() => {
                store.setFeedbackRecommendationStatus(reco.id, 'applied_mock');
                store.appendFeedbackHistoryEntry({
                  offerId: offer.id,
                  date: new Date().toISOString(),
                  recommendation: reco.action,
                  cause: reco.why,
                  actionApplied: reco.action,
                  expectedResult: reco.impact,
                  status: 'applied_mock',
                });
                onUpdate();
                showNotice(labels.applied);
              }}
              onDismiss={() => {
                store.setFeedbackRecommendationStatus(reco.id, 'dismissed');
                onUpdate();
                showNotice(labels.dismissed);
              }}
              onApplyToNextPlan={() => {
                if (!reco.preferenceKey) return;
                store.setFeedbackPreference({
                  offerId: offer.id,
                  key: reco.preferenceKey,
                  value: true,
                });
                onUpdate();
                showNotice(labels.preferenceSaved);
              }}
              onCreateVariant={() => {
                const linkedAsset = reco.linkedSlotId
                  ? assets.find(
                      (a) =>
                        a.id ===
                        plan.slots.find((s) => s.id === reco.linkedSlotId)?.assetId,
                    )
                  : undefined;
                if (!linkedAsset) {
                  showNotice(labels.variantNoSource);
                  return;
                }
                const seed =
                  (Date.now() & 0xffff) ^
                  linkedAsset.id.split('').reduce((h, c) => h + c.charCodeAt(0), 0);
                const draft = buildSingleVariant(offer, linkedAsset.kind, seed, language);
                store.createAsset(draft);
                onUpdate();
                showNotice(labels.variantCreated);
              }}
            />
          ))}
        </ul>
      </section>

      {/* A/B test card */}
      <section className="rounded-md border border-brand/30 bg-bg-elevated p-4">
        <div className="flex items-center gap-2">
          <Beaker size={14} className="text-brand" />
          <h3 className="font-mono text-[11px] uppercase tracking-wider text-fg">
            {labels.testTitle}
          </h3>
        </div>
        <p className="mt-2 text-sm text-fg">{r.abTest.hypothesis}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded border border-border bg-bg p-2 text-sm text-fg-muted">
            {r.abTest.variantA}
          </div>
          <div className="rounded border border-border bg-bg p-2 text-sm text-fg-muted">
            {r.abTest.variantB}
          </div>
        </div>
        <ul className="mt-3 grid gap-1 text-[12px] text-fg-muted sm:grid-cols-3">
          <li>
            <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
              {labels.testMetric}
            </span>{' '}
            {PRIMARY_KPI_LABELS[r.abTest.successMetric][language]}
          </li>
          <li>
            <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
              {labels.testDuration}
            </span>{' '}
            {r.abTest.durationDays} {labels.days}
          </li>
          <li className="sm:col-span-3">
            <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
              {labels.testRule}
            </span>{' '}
            {r.abTest.decisionRule}
          </li>
        </ul>
      </section>

      {/* Mini history */}
      {history.length > 0 && (
        <details className="rounded-md border border-border bg-bg-elevated/40 p-3">
          <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-wider text-fg-subtle hover:text-fg">
            <span className="inline-flex items-center gap-1.5">
              <History size={11} /> {labels.historyTitle} ({history.length})
            </span>
          </summary>
          <ul className="mt-3 space-y-2">
            {history.slice(0, 10).map((h) => (
              <li key={h.id} className="rounded border border-border bg-bg p-2">
                <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                  {h.date.slice(0, 10)} · {labels.historyApplied}
                </p>
                <p className="mt-1 text-sm font-medium text-fg">{h.actionApplied}</p>
                <p className="text-[12px] text-fg-muted">↳ {h.expectedResult}</p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Sub-components
// -----------------------------------------------------------------------------

function ScoreBadge({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: 'brand' | 'emerald';
}) {
  return (
    <div
      className={cn(
        'rounded-md border px-3 py-2 text-center',
        accent === 'brand'
          ? 'border-brand/40 bg-brand/10'
          : 'border-emerald-400/40 bg-emerald-400/5',
      )}
    >
      <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">{label}</p>
      <p className="mt-0.5 font-display text-2xl font-semibold text-fg">{value}<span className="text-sm text-fg-subtle">/100</span></p>
    </div>
  );
}

function ScoreChip({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider',
        accent
          ? 'border-brand/40 bg-brand/10 text-fg'
          : 'border-border bg-bg-elevated text-fg-muted',
      )}
    >
      {label} {value}/100
    </span>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-border bg-bg p-1.5 text-center">
      <p className="font-mono text-[9px] uppercase tracking-wider text-fg-subtle">{label}</p>
      <p className="font-display text-sm font-semibold text-fg">{value}</p>
    </div>
  );
}

function SignalsBlock({
  title,
  icon,
  tone,
  items,
  empty,
}: {
  title: string;
  icon: React.ReactNode;
  tone: 'emerald' | 'amber';
  items: string[];
  empty: string;
}) {
  return (
    <section
      className={cn(
        'rounded-md border bg-bg-elevated p-4',
        tone === 'emerald' ? 'border-emerald-400/30' : 'border-amber-400/30',
      )}
    >
      <div className="mb-2 flex items-center gap-1.5">
        {icon}
        <h3 className="font-mono text-[11px] uppercase tracking-wider text-fg">{title}</h3>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-fg-subtle">{empty}</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((s, idx) => (
            <li key={idx} className="text-sm text-fg-muted">
              · {s}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function BalanceCard({
  title,
  flags,
  labels,
  pillarCounts,
  funnelCounts,
  channelCounts,
}: {
  title: string;
  flags: string[];
  labels: typeof L_FR;
  pillarCounts: Record<string, number>;
  funnelCounts: Record<string, number>;
  channelCounts: Record<string, number>;
}) {
  const flagCopy: Record<string, string> = {
    too_much_conversion: labels.flagTooMuchConversion,
    not_enough_proof: labels.flagNotEnoughProof,
    not_enough_education: labels.flagNotEnoughEducation,
    channel_overuse: labels.flagChannelOveruse,
    not_enough_trust: labels.flagNotEnoughTrust,
    missing_bofu_for_leads: labels.flagMissingBofu,
    missing_tofu_for_visibility: labels.flagMissingTofu,
  };
  return (
    <section className="rounded-md border border-border bg-bg-elevated p-4">
      <h3 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
        {title}
      </h3>
      {flags.length === 0 ? (
        <p className="text-sm text-emerald-400">{labels.balanceClean}</p>
      ) : (
        <ul className="space-y-1.5">
          {flags.map((f) => (
            <li key={f} className="flex items-start gap-1.5 text-sm text-fg-muted">
              <AlertTriangle size={12} className="mt-0.5 shrink-0 text-amber-400" />
              <span>{flagCopy[f] ?? f}</span>
            </li>
          ))}
        </ul>
      )}
      <details className="mt-3">
        <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-wider text-fg-subtle hover:text-fg">
          <span className="inline-flex items-center gap-1">
            <ChevronDown size={11} /> {labels.detailsToggle}
          </span>
        </summary>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          <Counts title={labels.pillars} entries={pillarCounts} />
          <Counts title={labels.funnel} entries={funnelCounts} />
          <Counts title={labels.channels} entries={channelCounts} />
        </div>
      </details>
    </section>
  );
}

function Counts({
  title,
  entries,
}: {
  title: string;
  entries: Record<string, number>;
}) {
  const filtered = Object.entries(entries).filter(([, v]) => v > 0);
  return (
    <div className="rounded border border-border bg-bg p-2">
      <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">{title}</p>
      <ul className="mt-1 space-y-0.5">
        {filtered.length === 0 ? (
          <li className="text-[12px] text-fg-subtle">—</li>
        ) : (
          filtered.map(([k, v]) => (
            <li key={k} className="flex items-center justify-between text-[12px] text-fg-muted">
              <span>{k}</span>
              <span className="font-mono text-fg">{v}</span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function RecoCard({
  reco,
  language,
  onApply,
  onDismiss,
  onApplyToNextPlan,
  onCreateVariant,
}: {
  reco: FeedbackRecommendation;
  language: 'fr' | 'en';
  onApply: () => void;
  onDismiss: () => void;
  onApplyToNextPlan: () => void;
  onCreateVariant: () => void;
}) {
  const labels = language === 'en' ? L_EN : L_FR;
  const dismissed = reco.status === 'dismissed';
  const applied = reco.status === 'applied_mock';
  return (
    <li
      className={cn(
        'rounded-md border bg-bg-elevated p-3',
        dismissed ? 'opacity-60' : 'border-border',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <EffortBadge effort={reco.effort} language={language} />
          <ConfidenceBadge confidence={reco.confidence} language={language} />
          {reco.linkedSlotId && (
            <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
              ↳ slot {reco.linkedSlotId.slice(-6)}
            </span>
          )}
        </div>
        <span
          className={cn(
            'rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider',
            applied
              ? 'border-emerald-400/40 text-emerald-400'
              : dismissed
                ? 'border-border text-fg-subtle'
                : 'border-amber-400/40 text-amber-400',
          )}
        >
          {applied ? labels.statusApplied : dismissed ? labels.statusDismissed : labels.statusTodo}
        </span>
      </div>
      <p className="mt-1.5 text-sm font-semibold text-fg">{reco.action}</p>
      <p className="mt-1 text-[12px] text-fg-muted">
        <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
          {labels.because}
        </span>{' '}
        {reco.why}
      </p>
      <p className="mt-1 text-[12px] text-fg-muted">
        <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
          {labels.impact}
        </span>{' '}
        {reco.impact}
      </p>
      {!dismissed && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {!applied && (
            <button
              type="button"
              onClick={onApply}
              className="inline-flex items-center gap-1 rounded-md border border-emerald-400/40 bg-emerald-400/5 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-emerald-400 transition hover:border-emerald-400 hover:text-emerald-300"
            >
              <Check size={11} /> {labels.applyMock}
            </button>
          )}
          {reco.preferenceKey && (
            <button
              type="button"
              onClick={onApplyToNextPlan}
              className="inline-flex items-center gap-1 rounded-md border border-brand/40 bg-brand/5 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-fg transition hover:border-brand"
            >
              <ArrowRight size={11} /> {labels.applyNextPlan}
            </button>
          )}
          {reco.linkedSlotId && (
            <button
              type="button"
              onClick={onCreateVariant}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-bg-elevated px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-fg-muted transition hover:border-border-strong hover:text-fg"
            >
              <Sparkles size={11} /> {labels.createVariant}
            </button>
          )}
          <button
            type="button"
            onClick={onDismiss}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-bg px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-fg-subtle transition hover:text-fg"
          >
            <X size={11} /> {labels.dismiss}
          </button>
        </div>
      )}
    </li>
  );
}

function EffortBadge({
  effort,
  language,
}: {
  effort: EffortLevel;
  language: 'fr' | 'en';
}) {
  const labels = language === 'en' ? L_EN : L_FR;
  return (
    <span
      className={cn(
        'rounded-full border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider',
        effort === 'low'
          ? 'border-emerald-400/40 text-emerald-400'
          : effort === 'medium'
            ? 'border-amber-400/40 text-amber-400'
            : 'border-border text-fg-subtle',
      )}
    >
      {labels.effort} {effort}
    </span>
  );
}

function ConfidenceBadge({
  confidence,
  language,
}: {
  confidence: ConfidenceLevel;
  language: 'fr' | 'en';
}) {
  const labels = language === 'en' ? L_EN : L_FR;
  return (
    <span
      className={cn(
        'rounded-full border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider',
        confidence === 'high'
          ? 'border-brand/40 text-fg'
          : confidence === 'medium'
            ? 'border-border text-fg-muted'
            : 'border-border text-fg-subtle',
      )}
    >
      {labels.confidence} {confidence}
    </span>
  );
}

// -----------------------------------------------------------------------------
// Microcopy
// -----------------------------------------------------------------------------

const L_FR = {
  heroEyebrow: 'Boucle de feedback',
  heroTitle: 'Mesure le rendement éditorial',
  heroSubtitle:
    "Ce score ne récompense pas seulement la portée, il privilégie les signaux utiles : engagement, clics, leads et adéquation à l'audience.",
  scoreEditorial: 'Rendement éditorial',
  scoreFit: 'Audience fit',
  mockExplain:
    "Mode démonstration : aucune analytics réelle n'est mesurée. Les scores servent à tester le parcours.",
  partialBadge: 'Feedback partiel',
  partialBody:
    'Ajoute plus de contenus prêts ou planifiés pour fiabiliser les recommandations.',
  whatWorks: 'Ce qui marche',
  whatWorksEmpty: 'Pas encore de signal positif marqué.',
  whatToImprove: 'À améliorer',
  whatToImproveEmpty: 'Rien de critique cette semaine.',
  balanceTitle: 'Équilibre de la semaine',
  balanceClean: 'Mix éditorial équilibré.',
  detailsToggle: 'Détails du mix',
  pillars: 'Piliers',
  funnel: 'Funnel',
  channels: 'Canaux',
  flagTooMuchConversion:
    'Trop de conversion cette semaine — risque de saturation.',
  flagNotEnoughProof:
    'Pas assez de preuve cette semaine — la conversion en pâtit.',
  flagNotEnoughEducation:
    'Pas assez d\'éducation cette semaine — TOFU faible.',
  flagChannelOveruse:
    'Un canal domine — diversifie pour valider sur plusieurs audiences.',
  flagNotEnoughTrust:
    'Pas assez de contenu confiance (preuve + objection cumulés).',
  flagMissingBofu:
    'Objectif leads/launch sans aucun créneau de décision (BOFU).',
  flagMissingTofu:
    "Objectif visibilité sans aucun créneau awareness (TOFU).",
  slotsTitle: 'Détail par créneau',
  slotsSuffix: 'créneaux mesurés',
  intent: 'intent',
  fit: 'Fit',
  score: 'Score',
  impressions: 'Impressions',
  engagement: 'Engagement',
  clicks: 'Clics',
  leads: 'Leads',
  recsTitle: 'Recommandations actionnables',
  applyMock: 'Appliquer (mock)',
  applyNextPlan: 'Appliquer au prochain plan',
  createVariant: 'Créer variante mock',
  dismiss: 'Ignorer',
  applied: 'Recommandation appliquée',
  dismissed: 'Recommandation ignorée',
  preferenceSaved: 'Préférence enregistrée',
  variantCreated: 'Variante créée',
  variantNoSource: 'Pas de contenu source à dupliquer.',
  statusApplied: 'Appliquée',
  statusDismissed: 'Ignorée',
  statusTodo: 'À traiter',
  effort: 'effort',
  confidence: 'conf.',
  because: 'Pourquoi :',
  impact: 'Impact attendu :',
  testTitle: 'Test à lancer la semaine prochaine',
  testMetric: 'Métrique de succès :',
  testDuration: 'Durée :',
  testRule: 'Critère de décision :',
  days: 'jours',
  historyTitle: "Ce qu'on apprend",
  historyApplied: 'Appliquée (mock)',
  emptyNoPlanTitle: 'Crée ton plan semaine avant de mesurer le rendement éditorial.',
  emptyNoPlanBody:
    'La boucle de feedback lit les créneaux prêts/planifiés du plan semaine. Génère un plan dans l\'onglet « Plan semaine », puis reviens ici.',
  emptyNoPlanCta: 'Aller au plan semaine',
  emptyNoReadyTitle:
    'Marque au moins 3 contenus comme prêts ou planifiés pour générer un feedback utile.',
  emptyNoReadyBody:
    'Sans créneaux prêts/planifiés, les scores ne reflètent pas un état de publication. Ouvre le plan semaine et passe quelques créneaux en « Prêt » ou « Planifié ».',
  emptyNoReadyCta: 'Ouvrir le plan semaine',
};

const L_EN: typeof L_FR = {
  heroEyebrow: 'Feedback loop',
  heroTitle: 'Measure editorial performance',
  heroSubtitle:
    "This score does not reward reach alone — it favors useful signals: engagement, clicks, leads and audience fit.",
  scoreEditorial: 'Editorial performance',
  scoreFit: 'Audience fit',
  mockExplain:
    'Demo mode: no real analytics is measured. Scores are here to test the journey.',
  partialBadge: 'Partial feedback',
  partialBody:
    'Add more ready or scheduled contents to make recommendations reliable.',
  whatWorks: 'What works',
  whatWorksEmpty: 'No positive signal flagged yet.',
  whatToImprove: 'What to improve',
  whatToImproveEmpty: 'Nothing critical this week.',
  balanceTitle: 'Week balance',
  balanceClean: 'Editorial mix is balanced.',
  detailsToggle: 'Mix details',
  pillars: 'Pillars',
  funnel: 'Funnel',
  channels: 'Channels',
  flagTooMuchConversion: 'Too much conversion — saturation risk.',
  flagNotEnoughProof: 'Not enough proof — conversion suffers.',
  flagNotEnoughEducation: 'Not enough education — weak TOFU.',
  flagChannelOveruse: 'One channel dominates — diversify.',
  flagNotEnoughTrust: 'Not enough trust content (proof + objection combined).',
  flagMissingBofu: 'Leads/launch goal without any decision (BOFU) slot.',
  flagMissingTofu: 'Visibility goal without any awareness (TOFU) slot.',
  slotsTitle: 'Per-slot detail',
  slotsSuffix: 'slots measured',
  intent: 'intent',
  fit: 'Fit',
  score: 'Score',
  impressions: 'Impressions',
  engagement: 'Engagement',
  clicks: 'Clicks',
  leads: 'Leads',
  recsTitle: 'Actionable recommendations',
  applyMock: 'Apply (mock)',
  applyNextPlan: 'Apply to next plan',
  createVariant: 'Create variant',
  dismiss: 'Dismiss',
  applied: 'Recommendation applied',
  dismissed: 'Recommendation dismissed',
  preferenceSaved: 'Preference saved',
  variantCreated: 'Variant created',
  variantNoSource: 'No source content to duplicate.',
  statusApplied: 'Applied',
  statusDismissed: 'Dismissed',
  statusTodo: 'Todo',
  effort: 'effort',
  confidence: 'conf.',
  because: 'Why:',
  impact: 'Expected impact:',
  testTitle: 'Test to run next week',
  testMetric: 'Success metric:',
  testDuration: 'Duration:',
  testRule: 'Decision rule:',
  days: 'days',
  historyTitle: 'What we are learning',
  historyApplied: 'Applied (mock)',
  emptyNoPlanTitle: 'Create your weekly plan before measuring editorial performance.',
  emptyNoPlanBody:
    'The feedback loop reads ready/scheduled slots from the weekly plan. Generate a plan in the "Weekly plan" tab, then come back here.',
  emptyNoPlanCta: 'Go to weekly plan',
  emptyNoReadyTitle:
    'Mark at least 3 contents as ready or scheduled to generate useful feedback.',
  emptyNoReadyBody:
    'Without ready/scheduled slots, scores do not reflect any publishing state. Open the weekly plan and switch a few slots to "Ready" or "Scheduled".',
  emptyNoReadyCta: 'Open weekly plan',
};
