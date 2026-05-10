'use client';

import { useMemo, useState } from 'react';
import { Brain, Check, ClipboardCopy, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  PROMPT_TASKS,
  PROMPT_CHANNELS,
  buildExpertPrompt,
  promptToClipboardText,
  type PromptChannel,
  type PromptTask,
} from '@/lib/offer-workspace/prompt-orchestrator';
import {
  PROMPT_INSPECTOR_EN,
  PROMPT_INSPECTOR_FR,
} from '@/lib/offer-workspace/prompt-inspector-labels';
import type { AdUnit, Asset, Offer } from '@/lib/offer-workspace/types';

interface PromptInspectorProps {
  offer: Offer;
  language: 'fr' | 'en';
  /** Optional pre-selected task. Defaults to user_advice. */
  defaultTask?: PromptTask;
  defaultChannel?: PromptChannel;
  selectedAssets?: Asset[];
  adUnit?: AdUnit;
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
}: PromptInspectorProps) {
  const labels = language === 'en' ? PROMPT_INSPECTOR_EN : PROMPT_INSPECTOR_FR;
  const [task, setTask] = useState<PromptTask>(defaultTask);
  const [channel, setChannel] = useState<PromptChannel | ''>(defaultChannel ?? '');
  const [notice, setNotice] = useState<string | null>(null);

  const prompt = useMemo(
    () =>
      buildExpertPrompt({
        offer,
        task,
        channel: channel || undefined,
        selectedAssets,
        adUnit,
        language,
      }),
    [offer, task, channel, selectedAssets, adUnit, language],
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
          {notice && (
            <span className="inline-flex items-center gap-1 rounded-md border border-emerald-400/40 bg-emerald-400/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-emerald-400">
              <Check size={10} /> {notice}
            </span>
          )}
        </div>

        <Section title={labels.taskLabel} mono>
          {prompt.task} {prompt.channel ? `· ${prompt.channel}` : ''}
        </Section>

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

function Pre({ children }: { children: React.ReactNode }) {
  return (
    <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded border border-border bg-bg p-3 font-mono text-[11px] text-fg">
      {children}
    </pre>
  );
}
