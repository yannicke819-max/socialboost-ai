'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Brain,
  Check,
  ChevronRight,
  ClipboardCopy,
  Play,
  Plus,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  EXTERNAL_INSPIRATION_PLATFORMS,
  EXTERNAL_INSPIRATION_SOURCE_TYPES,
  PROMPT_TASKS,
  PROMPT_CHANNELS,
  buildExpertPrompt,
  promptToClipboardText,
  type ExternalInspirationInput,
  type ExternalInspirationPlatform,
  type ExternalInspirationSourceType,
  type PromptChannel,
  type PromptTask,
} from '@/lib/offer-workspace/prompt-orchestrator';
import {
  PROMPT_INSPECTOR_EN,
  PROMPT_INSPECTOR_FR,
} from '@/lib/offer-workspace/prompt-inspector-labels';
import {
  estimateAiActionCost,
  selectRecommendedModel,
  type SocialBoostAction,
  type SocialBoostPlan,
} from '@/lib/offer-workspace/ai-cost-model';
import { decideAiExecution } from '@/lib/offer-workspace/ai-entitlements';
import {
  buildFreePromptPack,
  type FreePromptFormat,
} from '@/lib/offer-workspace/free-prompt-generator';
import type { AiProviderRunResult } from '@/lib/offer-workspace/ai-provider-runner';
import type { AdUnit, Asset, Offer } from '@/lib/offer-workspace/types';

interface PromptInspectorProps {
  offer: Offer;
  language: 'fr' | 'en';
  /** Optional pre-selected task. Defaults to user_advice. */
  defaultTask?: PromptTask;
  defaultChannel?: PromptChannel;
  selectedAssets?: Asset[];
  adUnit?: AdUnit;
  /** AI-016A — current plan. Defaults to 'free' (safest). */
  plan?: SocialBoostPlan;
  /** AI-016A — for non-free plans only. Defaults to 0 on free. */
  remainingCredits?: number;
}

/**
 * Discrete inspector mounted as a `<details>` block. Closed by default — not
 * a first-level surface for non-technical users, exposed only for transparency
 * and advanced users.
 */
export function PromptInspector({
  offer,
  language,
  defaultTask = 'user_advice',
  defaultChannel,
  selectedAssets,
  adUnit,
  plan = 'free',
  remainingCredits = 0,
}: PromptInspectorProps) {
  const labels = language === 'en' ? PROMPT_INSPECTOR_EN : PROMPT_INSPECTOR_FR;
  const [task, setTask] = useState<PromptTask>(defaultTask);
  const [channel, setChannel] = useState<PromptChannel | ''>(defaultChannel ?? '');
  const [notice, setNotice] = useState<string | null>(null);
  const [inspirations, setInspirations] = useState<ExternalInspirationInput[]>([]);

  // AI-016A: pure-derived cost + entitlements decision. No fetch, no env.
  const costAction: SocialBoostAction =
    task === 'offer_diagnosis' ||
    task === 'external_inspiration_analysis' ||
    task === 'angle_discovery' ||
    task === 'post_ideas' ||
    task === 'ad_generation' ||
    task === 'ad_critique' ||
    task === 'ad_improvement' ||
    task === 'weekly_plan' ||
    task === 'user_advice'
      ? task
      : 'user_advice';
  const recommended = useMemo(
    () =>
      selectRecommendedModel({
        action: costAction,
        plan,
        qualityMode: 'balanced',
      }),
    [costAction, plan],
  );
  const estimate = useMemo(
    () =>
      estimateAiActionCost({
        action: costAction,
        provider: recommended.provider,
        model: recommended.model,
      }),
    [costAction, recommended.provider, recommended.model],
  );
  const decision = useMemo(
    () =>
      decideAiExecution({
        plan,
        remainingCredits,
        action: costAction,
        requestedProvider: recommended.provider,
        requestedModel: recommended.model,
      }),
    [plan, remainingCredits, costAction, recommended.provider, recommended.model],
  );

  const prompt = useMemo(
    () =>
      buildExpertPrompt({
        offer,
        task,
        channel: channel || undefined,
        selectedAssets,
        adUnit,
        language,
        inspirations: inspirations.length > 0 ? inspirations : undefined,
      }),
    [offer, task, channel, selectedAssets, adUnit, language, inspirations],
  );

  const handleCopy = async () => {
    try {
      const text = promptToClipboardText(prompt, language);
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
      setNotice(labels.copiedToast);
      setTimeout(() => setNotice(null), 1800);
    } catch {
      setNotice(labels.copyFailedToast);
      setTimeout(() => setNotice(null), 1800);
    }
  };

  // AI-016B: paid-plan provider runner. Free users NEVER see the active
  // button — it is rendered as disabled and short-circuits client-side
  // before any fetch. The Free hard rule is also enforced server-side by
  // the gateway via decideAiExecution.
  const [testRunning, setTestRunning] = useState(false);
  const [testResult, setTestResult] = useState<AiProviderRunResult | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const isFree = plan === 'free';

  const handleTest = async () => {
    if (isFree) return; // belt-and-suspenders client guard
    setTestRunning(true);
    setTestError(null);
    setTestResult(null);
    try {
      const res = await fetch('/api/ai/run-prompt', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          promptVersion: prompt,
          inspirations: inspirations.length > 0 ? inspirations : undefined,
          offer: { brief: { language: offer.brief.language } },
          plan,
          remainingCredits,
          action: costAction,
        }),
      });
      const json = (await res.json()) as AiProviderRunResult;
      setTestResult(json);
    } catch {
      setTestError('network_error');
    } finally {
      setTestRunning(false);
    }
  };

  return (
    <details className="rounded-md border border-border bg-bg-elevated/40">
      <summary className="cursor-pointer list-none rounded-md px-4 py-3 hover:bg-bg-elevated">
        <span className="inline-flex items-center gap-2">
          <Brain size={14} className="text-fg-subtle" />
          <span className="font-mono text-[11px] uppercase tracking-wider text-fg">
            {labels.triggerLabel}
          </span>
        </span>
      </summary>

      <div className="space-y-4 border-t border-border px-4 py-4">
        <p className="text-[12px] text-fg-muted">{labels.helperLine}</p>

        {(plan === 'free' || decision.mode === 'dry_run' || decision.mode === 'byok') && (
          <FreeModeBlock
            language={language}
            promptVersion={prompt}
            estimatedCredits={estimate.estimatedCredits}
            recommendedModel={`${recommended.provider}:${recommended.model}`}
          />
        )}

        <div className="grid gap-2 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
              {labels.taskPickerLabel}
            </span>
            <select
              value={task}
              onChange={(e) => setTask(e.target.value as PromptTask)}
              className="w-full rounded border border-border bg-bg px-2 py-1 font-mono text-[11px] text-fg focus-visible:ring-2 focus-visible:ring-brand"
            >
              {PROMPT_TASKS.map((t) => (
                <option key={t} value={t}>
                  {labels.taskOptions[t] ?? t}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
              {labels.channelPickerLabel}
            </span>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value as PromptChannel | '')}
              className="w-full rounded border border-border bg-bg px-2 py-1 font-mono text-[11px] text-fg focus-visible:ring-2 focus-visible:ring-brand"
            >
              <option value="">{labels.channelAny}</option>
              {PROMPT_CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-md border border-brand/40 bg-brand/5 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-fg transition hover:border-brand focus-visible:ring-2 focus-visible:ring-brand"
          >
            <ClipboardCopy size={12} /> {labels.copyButton}
          </button>
          {/* AI-016B: paid-plan provider runner. Free → disabled visually
              + early return in handleTest. Server-side, the gateway also
              refuses any Free call via decideAiExecution. */}
          <button
            type="button"
            onClick={handleTest}
            disabled={isFree || testRunning}
            title={isFree ? labels.paidTestDisabledForFreeTooltip : undefined}
            aria-disabled={isFree || testRunning}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition focus-visible:ring-2 focus-visible:ring-brand',
              isFree
                ? 'cursor-not-allowed border-border bg-bg-elevated text-fg-subtle opacity-60'
                : testRunning
                  ? 'border-emerald-400/40 bg-emerald-400/5 text-emerald-400 opacity-60'
                  : 'border-emerald-400/40 bg-emerald-400/5 text-emerald-400 hover:border-emerald-400 hover:text-emerald-300',
            )}
          >
            <Play size={12} />{' '}
            {testRunning ? labels.paidTestRunningLabel : labels.paidTestButton}
          </button>
          {notice && (
            <span className="inline-flex items-center gap-1 rounded-md border border-emerald-400/40 bg-emerald-400/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-emerald-400">
              <Check size={10} /> {notice}
            </span>
          )}
        </div>

        {(testResult || testError) && (
          <PaidTestResultPanel result={testResult} error={testError} language={language} />
        )}

        <Section title={labels.taskLabel} mono>
          {prompt.task} {prompt.channel ? `· ${prompt.channel}` : ''}
        </Section>

        <InspirationsSection
          language={language}
          inspirations={inspirations}
          onAdd={(it) => setInspirations((arr) => [...arr, it])}
          onRemove={(idx) =>
            setInspirations((arr) => arr.filter((_, i) => i !== idx))
          }
        />

        <Section title={labels.systemPromptLabel}>
          <Pre>{prompt.systemPrompt}</Pre>
        </Section>

        <Section title={labels.userPromptLabel}>
          <Pre>{prompt.userPrompt}</Pre>
        </Section>

        <Section title={labels.expectedOutputLabel} mono>
          {prompt.expectedOutput}
        </Section>

        <Section title={labels.guardrailsLabel}>
          <ul className="space-y-1 text-[12px] text-fg-muted">
            {prompt.guardrails.map((g, i) => (
              <li key={i} className="flex gap-1.5">
                <ChevronRight size={11} className="mt-0.5 text-fg-subtle" />
                <span>{g}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title={labels.qualityLabel}>
          <ul className="space-y-1 text-[12px] text-fg-muted">
            {prompt.qualityChecklist.map((q, i) => (
              <li key={i} className="flex gap-1.5">
                <ChevronRight size={11} className="mt-0.5 text-fg-subtle" />
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </details>
  );
}

function Section({
  title,
  children,
  mono,
}: {
  title: string;
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <section>
      <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">{title}</p>
      <div className={cn(mono ? 'font-mono text-[11px] text-fg' : 'text-sm text-fg-muted')}>
        {children}
      </div>
    </section>
  );
}

function FreeModeBlock({
  language,
  promptVersion,
  estimatedCredits,
  recommendedModel,
}: {
  language: 'fr' | 'en';
  promptVersion: import('@/lib/offer-workspace/prompt-orchestrator').PromptVersion;
  estimatedCredits: number;
  recommendedModel: string;
}) {
  const labels = language === 'en' ? PROMPT_INSPECTOR_EN : PROMPT_INSPECTOR_FR;
  const [copied, setCopied] = useState<FreePromptFormat | null>(null);

  const handleCopy = async (format: FreePromptFormat) => {
    const pack = buildFreePromptPack({
      promptVersion,
      format,
      estimatedCreditsIfRun: estimatedCredits,
    });
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(pack.copyablePrompt);
      }
      setCopied(format);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // best-effort
    }
  };

  return (
    <section className="rounded-md border border-amber-400/30 bg-amber-400/5 p-3">
      <span className="font-mono text-[10px] uppercase tracking-wider text-amber-400">
        {labels.freeModeBadge}
      </span>
      <p className="mt-1 font-display text-sm font-semibold text-fg">{labels.freeModeTitle}</p>
      <p className="mt-1 text-[12px] text-fg-muted">{labels.freeModeBody}</p>
      <p className="mt-1 text-[12px] text-fg-muted">{labels.freeModeNoAdminCost}</p>
      <p className="mt-1 text-[12px] text-fg-subtle italic">
        {labels.freeModeNoModelLaunched}
      </p>
      <ul className="mt-2 grid gap-0.5 font-mono text-[10px] text-fg-subtle sm:grid-cols-2">
        <li>
          {labels.freeModeEstimateLabel}:{' '}
          <span className="text-fg-muted">
            {estimatedCredits} {labels.freeModeEstimateSuffix}
          </span>
        </li>
        <li>
          {labels.freeModeRecommendedModelLabel}: <span className="text-fg-muted">{recommendedModel}</span>
        </li>
      </ul>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <FreeModeCopyButton
          label={labels.freeModeCopyGeneric}
          active={copied === 'generic_markdown'}
          onClick={() => handleCopy('generic_markdown')}
        />
        <FreeModeCopyButton
          label={labels.freeModeCopyClaude}
          active={copied === 'claude_xml'}
          onClick={() => handleCopy('claude_xml')}
        />
        <FreeModeCopyButton
          label={labels.freeModeCopyChatGpt}
          active={copied === 'chatgpt_markdown'}
          onClick={() => handleCopy('chatgpt_markdown')}
        />
      </div>

      <p className="mt-2 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
        <ArrowRight size={10} /> {labels.freeModeUpgradeCta}
      </p>
    </section>
  );
}

function PaidTestResultPanel({
  result,
  error,
  language,
}: {
  result: AiProviderRunResult | null;
  error: string | null;
  language: 'fr' | 'en';
}) {
  const labels = language === 'en' ? PROMPT_INSPECTOR_EN : PROMPT_INSPECTOR_FR;
  if (error) {
    return (
      <section className="rounded-md border border-amber-400/40 bg-amber-400/5 p-3">
        <p className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-amber-400">
          <AlertTriangle size={11} /> {error}
        </p>
      </section>
    );
  }
  if (!result) return null;
  const isDryRun = result.meta.dryRun;
  const dryRunMsg = isDryRun
    ? result.meta.flagEnabled
      ? labels.paidTestResultDryRunNoKey
      : labels.paidTestResultDryRunFlagOff
    : null;
  return (
    <section className="rounded-md border border-brand/30 bg-brand/5 p-3">
      <p className="font-mono text-[11px] uppercase tracking-wider text-brand">
        {labels.paidTestResultTitle}
      </p>
      {dryRunMsg && (
        <p className="mt-1 inline-flex items-center gap-1 rounded border border-amber-400/40 bg-amber-400/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-amber-400">
          {dryRunMsg}
        </p>
      )}
      <ul className="mt-2 grid gap-0.5 font-mono text-[10px] text-fg-muted sm:grid-cols-2">
        <li>provider: <span className="text-fg">{result.provider}</span></li>
        <li>model: <span className="text-fg">{result.model}</span></li>
        {result.meta.decisionReason && (
          <li className="sm:col-span-2">
            decision: <span className="text-fg">{result.meta.decisionReason}</span>
          </li>
        )}
        {result.blockedReason && (
          <li className="text-amber-400 sm:col-span-2">
            {labels.paidTestResultBlockedLabel}: {result.blockedReason}
          </li>
        )}
        {result.validationErrors && result.validationErrors.length > 0 && (
          <li className="text-amber-400 sm:col-span-2">
            {labels.paidTestResultValidationErrorsLabel}: {result.validationErrors.join(', ')}
          </li>
        )}
      </ul>
      {result.outputText && (
        <div className="mt-2">
          <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
            {labels.paidTestResultOutputLabel}
          </p>
          <Pre>{result.outputText}</Pre>
        </div>
      )}
      <p className="mt-2 text-[12px] text-fg-muted">{labels.paidTestResultDraftReminder}</p>
    </section>
  );
}

function FreeModeCopyButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition focus-visible:ring-2 focus-visible:ring-brand',
        active
          ? 'border-emerald-400/60 bg-emerald-400/10 text-emerald-300'
          : 'border-border bg-bg text-fg-muted hover:border-border-strong hover:text-fg',
      )}
    >
      {active ? <Check size={10} /> : <ClipboardCopy size={10} />}
      {label}
    </button>
  );
}

function Pre({ children }: { children: React.ReactNode }) {
  return (
    <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded border border-border bg-bg p-3 font-mono text-[11px] text-fg">
      {children}
    </pre>
  );
}

// -----------------------------------------------------------------------------
// External Inspirations sub-section (AI-015 addendum)
// -----------------------------------------------------------------------------

function InspirationsSection({
  language,
  inspirations,
  onAdd,
  onRemove,
}: {
  language: 'fr' | 'en';
  inspirations: ExternalInspirationInput[];
  onAdd: (it: ExternalInspirationInput) => void;
  onRemove: (idx: number) => void;
}) {
  const labels = language === 'en' ? PROMPT_INSPECTOR_EN : PROMPT_INSPECTOR_FR;
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<ExternalInspirationPlatform>('linkedin');
  const [sourceType, setSourceType] = useState<ExternalInspirationSourceType>('organic_post');
  const [pastedText, setPastedText] = useState('');
  const [signals, setSignals] = useState('');
  const [notes, setNotes] = useState('');

  const handleAdd = () => {
    if (
      pastedText.trim().length === 0 &&
      signals.trim().length === 0 &&
      notes.trim().length === 0
    ) {
      return;
    }
    const observed = signals
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    onAdd({
      sourcePlatform: platform,
      sourceType,
      pastedText: pastedText.trim() || undefined,
      observedSignals: observed.length > 0 ? observed : undefined,
      userNotes: notes.trim() || undefined,
      language,
      doNotCopy: true,
    });
    setPastedText('');
    setSignals('');
    setNotes('');
    setOpen(false);
  };

  return (
    <section>
      <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
        {labels.inspirationsTitle}
      </p>
      <p className="text-[12px] text-fg-muted">{labels.inspirationsHelper}</p>
      <p className="mt-1 inline-flex items-center gap-1 rounded border border-amber-400/40 bg-amber-400/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-amber-400">
        {labels.inspirationsDoNotCopy}
      </p>

      {inspirations.length === 0 ? (
        <p className="mt-2 text-[12px] text-fg-subtle">{labels.inspirationsEmpty}</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {inspirations.map((it, idx) => (
            <li
              key={idx}
              className="flex flex-wrap items-center justify-between gap-1.5 rounded border border-border bg-bg p-2"
            >
              <span className="font-mono text-[11px] text-fg-muted">
                {it.sourcePlatform} · {it.sourceType}
                {it.pastedText
                  ? ` · ${it.pastedText.slice(0, 60)}${it.pastedText.length > 60 ? '…' : ''}`
                  : ''}
              </span>
              <button
                type="button"
                onClick={() => onRemove(idx)}
                className="inline-flex items-center gap-1 rounded border border-border bg-bg-elevated px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-fg-subtle hover:text-fg"
              >
                <X size={10} /> {labels.inspirationsRemove}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((b) => !b)}
          className="inline-flex items-center gap-1.5 rounded-md border border-brand/40 bg-brand/5 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-fg transition hover:border-brand"
        >
          <Plus size={12} /> {labels.inspirationsAdd}
        </button>
      </div>

      {open && (
        <div className="mt-3 space-y-2 rounded border border-border bg-bg p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                {labels.inspirationsPlatformLabel}
              </span>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as ExternalInspirationPlatform)}
                className="w-full rounded border border-border bg-bg-elevated px-2 py-1 font-mono text-[11px] text-fg focus-visible:ring-2 focus-visible:ring-brand"
              >
                {EXTERNAL_INSPIRATION_PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                {labels.inspirationsSourceTypeLabel}
              </span>
              <select
                value={sourceType}
                onChange={(e) =>
                  setSourceType(e.target.value as ExternalInspirationSourceType)
                }
                className="w-full rounded border border-border bg-bg-elevated px-2 py-1 font-mono text-[11px] text-fg focus-visible:ring-2 focus-visible:ring-brand"
              >
                {EXTERNAL_INSPIRATION_SOURCE_TYPES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block space-y-1">
            <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
              {labels.inspirationsPastedLabel}
            </span>
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder={labels.inspirationsPastedPh}
              rows={3}
              className="w-full rounded border border-border bg-bg-elevated px-2 py-1 text-sm text-fg outline-none focus:border-brand"
            />
          </label>
          <label className="block space-y-1">
            <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
              {labels.inspirationsSignalsLabel}
            </span>
            <textarea
              value={signals}
              onChange={(e) => setSignals(e.target.value)}
              placeholder={labels.inspirationsSignalsPh}
              rows={3}
              className="w-full rounded border border-border bg-bg-elevated px-2 py-1 text-sm text-fg outline-none focus:border-brand"
            />
          </label>
          <label className="block space-y-1">
            <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
              {labels.inspirationsNotesLabel}
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={labels.inspirationsNotesPh}
              rows={2}
              className="w-full rounded border border-border bg-bg-elevated px-2 py-1 text-sm text-fg outline-none focus:border-brand"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleAdd}
              className="inline-flex items-center gap-1.5 rounded-md border border-emerald-400/60 bg-emerald-400/15 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-emerald-300 hover:border-emerald-400"
            >
              <Plus size={12} /> {labels.inspirationsAdd}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-elevated px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-fg-muted hover:text-fg"
            >
              <X size={12} /> {labels.inspirationsRemove}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
