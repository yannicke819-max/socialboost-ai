'use client';

/**
 * Creative Studio UI v1 — prompt-only (AI-017B).
 *
 * Reads from `buildCreativeBriefPack` (pure engine from AI-017A) and
 * surfaces 3 image concepts, 2 video concepts, and one 15s storyboard,
 * each with copy-only buttons. NO real media provider call. NO
 * "Generate image" button. NO fetch from this component.
 *
 * Hard rules pinned by tests:
 *   - Renders the literal "Aucun modèle image ou vidéo n'a été lancé".
 *   - Renders the "Prompt-only" badge.
 *   - Never includes "Générer image" or "Générer vidéo".
 *   - Never imports `fetch` or reads `process.env`.
 *   - Copy buttons write to `navigator.clipboard` only — no network.
 */

import { useMemo, useState } from 'react';
import {
  Brain,
  Check,
  ClipboardCopy,
  Image as ImageIcon,
  Film,
  ListOrdered,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  buildCreativeBriefPack,
  PLATFORM_FORMAT_ASPECT_RATIO,
  type CreativeBriefPack,
  type CreativeImagePrompt,
  type CreativeVideoPrompt,
  type CreativeStoryboard,
} from '@/lib/offer-workspace/creative-brief-engine';
import {
  CREATIVE_STUDIO_EN,
  CREATIVE_STUDIO_FR,
  type CreativeStudioCopy,
} from '@/lib/offer-workspace/creative-studio-labels';
import {
  CREATIVE_STRATEGIES,
  type CreativeQualityTier,
} from '@/lib/offer-workspace/creative-quality-tiers';
import {
  buildCreativeScorecard,
  type CreativeScorecard,
} from '@/lib/offer-workspace/creative-scoring';
import {
  CreativeQualitySelector,
  buildCreativeDirectionPrefix,
} from './CreativeQualitySelector';
import { CreativeScorePanel } from './CreativeScorePanel';
import type { Offer } from '@/lib/offer-workspace/types';

interface CreativeStudioProps {
  offer?: Offer;
  language?: 'fr' | 'en';
  /** Optional task hint forwarded to the engine. */
  task?: string;
}

type TabKey = 'images' | 'videos' | 'storyboard';

export function CreativeStudio({
  offer,
  language = 'fr',
  task,
}: CreativeStudioProps) {
  const labels: CreativeStudioCopy =
    language === 'en' ? CREATIVE_STUDIO_EN : CREATIVE_STUDIO_FR;
  const [tab, setTab] = useState<TabKey>('images');
  const [notice, setNotice] = useState<string | null>(null);
  // AI-017E — Creative Quality Selector: drives the prompt-prefix on copy
  // and the visible "Direction créative sélectionnée" annotation. Default
  // is 'performance' per the AI-017E spec.
  const [tier, setTier] = useState<CreativeQualityTier>('performance');

  const pack: CreativeBriefPack | null = useMemo(() => {
    if (!offer || !offer.brief || !offer.brief.businessName || !offer.brief.offer) {
      return null;
    }
    // AI-017F: tier participates in the pack derivation so selecting a
    // different intent re-derives image/video/storyboard concepts.
    return buildCreativeBriefPack({ offer, task, language, creativeQualityTier: tier });
  }, [offer, task, language, tier]);

  // AI-017G — Compute per-concept scorecards. Pure deterministic
  // heuristics, no fetch, no env access. Memoized so re-renders
  // don't re-score until tier / pack changes.
  const imageScorecards: CreativeScorecard[] = useMemo(() => {
    if (!pack) return [];
    return pack.imageConcepts.map((c) =>
      buildCreativeScorecard({
        kind: 'image',
        creativeQualityTier: tier,
        title: c.title,
        prompt: c.prompt,
        textOverlay: c.textOverlay,
        guardrails: pack.tierGuardrails,
        platformFormat: c.platformFormat,
        language,
      }),
    );
  }, [pack, tier, language]);

  const videoScorecards: CreativeScorecard[] = useMemo(() => {
    if (!pack) return [];
    return pack.videoConcepts.map((c) =>
      buildCreativeScorecard({
        kind: 'video',
        creativeQualityTier: tier,
        title: c.title,
        prompt: c.prompt,
        hook: c.hook,
        avoid: c.avoid,
        guardrails: pack.tierGuardrails,
        platformFormat: c.platformFormat,
        language,
      }),
    );
  }, [pack, tier, language]);

  const storyboardScorecard: CreativeScorecard | null = useMemo(() => {
    if (!pack) return null;
    const beatsText = pack.storyboard.beats
      .map((b) => `[${b.secondRange}] ${b.visual} ${b.onScreenText} ${b.narration} ${b.purpose}`)
      .join(' ');
    return buildCreativeScorecard({
      kind: 'storyboard',
      creativeQualityTier: tier,
      title: pack.campaignTheme,
      prompt: `${pack.tierGuardrails.join(' ')} ${beatsText}`,
      guardrails: pack.tierGuardrails,
      language,
    });
  }, [pack, tier, language]);

  const handleCopy = async (text: string) => {
    // AI-017E: prepend the selected creative direction so the copied
    // prompt carries the strategic intent into any third-party media
    // tool. Pure string composition, no fetch.
    const prefix = buildCreativeDirectionPrefix(tier, language);
    const composed = `${prefix}\n\n${text}`;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(composed);
      }
      setNotice(labels.copiedToast);
      setTimeout(() => setNotice(null), 1800);
    } catch {
      setNotice(labels.copyFailedToast);
      setTimeout(() => setNotice(null), 1800);
    }
  };

  return (
    <section className="rounded-md border border-border bg-bg-elevated/40">
      <header className="flex flex-wrap items-start justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <p className="inline-flex items-center gap-2">
            <Brain size={14} className="text-fg-subtle" />
            <span className="font-display text-base font-semibold text-fg">
              {labels.sectionTitle}
            </span>
            <span className="rounded border border-amber-400/40 bg-amber-400/5 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-amber-400">
              {labels.badgePromptOnly}
            </span>
          </p>
          <p className="mt-1 text-[12px] text-fg-muted">{labels.sectionSubtitle}</p>
          <p className="mt-1 inline-flex items-center gap-1 rounded border border-amber-400/40 bg-amber-400/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-amber-400">
            {labels.safetyLine}
          </p>
        </div>
        {notice && (
          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-400/40 bg-emerald-400/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-emerald-400">
            <Check size={10} /> {notice}
          </span>
        )}
      </header>

      {!pack ? (
        <div className="px-4 py-6 text-[12px] text-fg-muted">{labels.emptyState}</div>
      ) : (
        <div className="space-y-4 px-4 py-4">
          <PackHeader pack={pack} labels={labels} />

          {/* AI-017E — Creative Quality Selector. Prompt-only intent
              picker. Selection drives the prefix that handleCopy
              prepends to every copied prompt. */}
          <CreativeQualitySelector
            language={language}
            selected={tier}
            onSelect={setTier}
          />

          <p
            className="rounded border border-brand/40 bg-brand/5 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-brand"
            data-testid="selected-direction"
          >
            {labels.selectorCurrentDirectionLabel}: {CREATIVE_STRATEGIES[tier].label}
          </p>

          <nav
            className="flex flex-wrap gap-1 border-b border-border"
            aria-label="Creative tabs"
          >
            <TabButton
              id="images"
              current={tab}
              onSelect={setTab}
              icon={<ImageIcon size={12} />}
              count={pack.imageConcepts.length}
            >
              {labels.tabImages}
            </TabButton>
            <TabButton
              id="videos"
              current={tab}
              onSelect={setTab}
              icon={<Film size={12} />}
              count={pack.videoConcepts.length}
            >
              {labels.tabVideos}
            </TabButton>
            <TabButton
              id="storyboard"
              current={tab}
              onSelect={setTab}
              icon={<ListOrdered size={12} />}
            >
              {labels.tabStoryboard}
            </TabButton>
          </nav>

          {tab === 'images' && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {pack.imageConcepts.map((c, i) => (
                <ImageCard
                  key={c.id}
                  concept={c}
                  labels={labels}
                  onCopy={handleCopy}
                  scorecard={imageScorecards[i] ?? null}
                  language={language}
                />
              ))}
            </div>
          )}

          {tab === 'videos' && (
            <div className="grid gap-3 sm:grid-cols-2">
              {pack.videoConcepts.map((c, i) => (
                <VideoCard
                  key={c.id}
                  concept={c}
                  labels={labels}
                  onCopy={handleCopy}
                  scorecard={videoScorecards[i] ?? null}
                  language={language}
                />
              ))}
            </div>
          )}

          {tab === 'storyboard' && (
            <StoryboardPanel
              storyboard={pack.storyboard}
              labels={labels}
              onCopy={handleCopy}
              scorecard={storyboardScorecard}
              language={language}
            />
          )}
        </div>
      )}
    </section>
  );
}

function PackHeader({
  pack,
  labels,
}: {
  pack: CreativeBriefPack;
  labels: CreativeStudioCopy;
}) {
  return (
    <ul className="grid gap-1 font-mono text-[10px] text-fg-muted sm:grid-cols-2">
      <li className="sm:col-span-2">
        <span className="text-fg-subtle">{labels.campaignThemeLabel}:</span>{' '}
        <span className="text-fg">{pack.campaignTheme}</span>
      </li>
      <li>
        <span className="text-fg-subtle">{labels.visualDirectionLabel}:</span>{' '}
        <span className="text-fg-muted">{pack.visualDirection}</span>
      </li>
      <li>
        <span className="text-fg-subtle">{labels.audienceEmotionLabel}:</span>{' '}
        <span className="text-fg-muted">{pack.audienceEmotion}</span>
      </li>
      <li className="sm:col-span-2">
        <span className="text-fg-subtle">{labels.ctaVisualLabel}:</span>{' '}
        <span className="text-fg-muted">{pack.ctaVisual}</span>
      </li>
    </ul>
  );
}

function TabButton({
  id,
  current,
  onSelect,
  icon,
  count,
  children,
}: {
  id: TabKey;
  current: TabKey;
  onSelect: (id: TabKey) => void;
  icon: React.ReactNode;
  count?: number;
  children: React.ReactNode;
}) {
  const active = id === current;
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1 border-b-2 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition',
        active
          ? 'border-brand text-brand'
          : 'border-transparent text-fg-muted hover:text-fg',
      )}
    >
      {icon} {children}
      {typeof count === 'number' && (
        <span className="ml-1 text-[10px] text-fg-subtle">{count}</span>
      )}
    </button>
  );
}

function ImageCard({
  concept,
  labels,
  onCopy,
  scorecard,
  language,
}: {
  concept: CreativeImagePrompt;
  labels: CreativeStudioCopy;
  onCopy: (t: string) => void;
  scorecard: CreativeScorecard | null;
  language: 'fr' | 'en';
}) {
  const aspect = PLATFORM_FORMAT_ASPECT_RATIO[concept.platformFormat];
  return (
    <article className="flex flex-col gap-2 rounded-md border border-border bg-bg p-3">
      <header className="flex flex-wrap items-center justify-between gap-1">
        <p className="font-display text-sm font-semibold text-fg">
          {concept.title}
        </p>
        <span className="rounded border border-border bg-bg-elevated px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-fg-muted">
          {concept.platformFormat} · {aspect}
        </span>
      </header>
      <ul className="grid gap-0.5 font-mono text-[10px] text-fg-muted">
        <li>
          <span className="text-fg-subtle">{labels.imageCardSceneLabel}:</span>{' '}
          {concept.scene}
        </li>
        <li>
          <span className="text-fg-subtle">{labels.imageCardSubjectLabel}:</span>{' '}
          {concept.subject}
        </li>
        <li>
          <span className="text-fg-subtle">{labels.imageCardStyleLabel}:</span>{' '}
          {concept.style}
        </li>
        <li>
          <span className="text-fg-subtle">{labels.imageCardOverlayLabel}:</span>{' '}
          {concept.textOverlay}
        </li>
      </ul>
      <details className="rounded border border-border bg-bg-elevated/40">
        <summary className="cursor-pointer px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-fg-subtle hover:text-fg">
          {labels.imageCardPromptLabel}
        </summary>
        <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words border-t border-border bg-bg p-2 font-mono text-[10px] text-fg">
          {concept.prompt}
        </pre>
      </details>
      <p className="text-[10px] italic text-fg-subtle">
        <span className="text-fg-muted">{labels.imageCardNegativePromptLabel}:</span>{' '}
        {concept.negativePrompt}
      </p>
      <button
        type="button"
        onClick={() => onCopy(concept.prompt)}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-brand/40 bg-brand/5 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-fg transition hover:border-brand focus-visible:ring-2 focus-visible:ring-brand"
      >
        <ClipboardCopy size={12} /> {labels.imageCardCopyButton}
      </button>
      {scorecard && (
        <CreativeScorePanel scorecard={scorecard} language={language} compact />
      )}
    </article>
  );
}

function VideoCard({
  concept,
  labels,
  onCopy,
  scorecard,
  language,
}: {
  concept: CreativeVideoPrompt;
  labels: CreativeStudioCopy;
  onCopy: (t: string) => void;
  scorecard: CreativeScorecard | null;
  language: 'fr' | 'en';
}) {
  const aspect = PLATFORM_FORMAT_ASPECT_RATIO[concept.platformFormat];
  return (
    <article className="flex flex-col gap-2 rounded-md border border-border bg-bg p-3">
      <header className="flex flex-wrap items-center justify-between gap-1">
        <p className="font-display text-sm font-semibold text-fg">
          {concept.title}
        </p>
        <span className="rounded border border-border bg-bg-elevated px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-fg-muted">
          {concept.platformFormat} · {aspect} · {concept.durationSec}s
        </span>
      </header>
      <ul className="grid gap-0.5 font-mono text-[10px] text-fg-muted">
        <li>
          <span className="text-fg-subtle">{labels.videoCardHookLabel}:</span>{' '}
          {concept.hook}
        </li>
        <li>
          <span className="text-fg-subtle">{labels.videoCardShotsLabel}:</span>{' '}
          {concept.shots.length}
        </li>
        <li>
          <span className="text-fg-subtle">{labels.videoCardOnScreenLabel}:</span>{' '}
          {concept.onScreenText.join(' · ')}
        </li>
      </ul>
      <details className="rounded border border-border bg-bg-elevated/40">
        <summary className="cursor-pointer px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-fg-subtle hover:text-fg">
          {labels.videoCardPromptLabel}
        </summary>
        <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words border-t border-border bg-bg p-2 font-mono text-[10px] text-fg">
          {concept.prompt}
        </pre>
      </details>
      <p className="text-[10px] italic text-fg-subtle">
        <span className="text-fg-muted">{labels.videoCardAvoidLabel}:</span>{' '}
        {concept.avoid.join('; ')}
      </p>
      <button
        type="button"
        onClick={() => onCopy(concept.prompt)}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-brand/40 bg-brand/5 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-fg transition hover:border-brand focus-visible:ring-2 focus-visible:ring-brand"
      >
        <ClipboardCopy size={12} /> {labels.videoCardCopyButton}
      </button>
      {scorecard && (
        <CreativeScorePanel scorecard={scorecard} language={language} compact />
      )}
    </article>
  );
}

function StoryboardPanel({
  storyboard,
  labels,
  onCopy,
  scorecard,
  language,
}: {
  storyboard: CreativeStoryboard;
  labels: CreativeStudioCopy;
  onCopy: (t: string) => void;
  scorecard: CreativeScorecard | null;
  language: 'fr' | 'en';
}) {
  const text = useMemo(() => storyboardToText(storyboard, labels), [storyboard, labels]);
  return (
    <section className="space-y-2">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-display text-sm font-semibold text-fg">
          {labels.storyboardTitle}
        </p>
        <span className="rounded border border-border bg-bg-elevated px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
          {labels.storyboardDurationLabel}: {storyboard.durationSec}s
        </span>
      </header>
      <ol className="space-y-2">
        {storyboard.beats.map((b, idx) => (
          <li
            key={idx}
            className="rounded border border-border bg-bg p-3"
          >
            <p className="font-mono text-[10px] uppercase tracking-wider text-brand">
              {b.secondRange}
            </p>
            <ul className="mt-1 grid gap-0.5 font-mono text-[10px] text-fg-muted">
              <li>
                <span className="text-fg-subtle">
                  {labels.storyboardBeatVisualLabel}:
                </span>{' '}
                {b.visual}
              </li>
              <li>
                <span className="text-fg-subtle">
                  {labels.storyboardBeatOnScreenLabel}:
                </span>{' '}
                {b.onScreenText}
              </li>
              <li>
                <span className="text-fg-subtle">
                  {labels.storyboardBeatNarrationLabel}:
                </span>{' '}
                {b.narration}
              </li>
              <li>
                <span className="text-fg-subtle">
                  {labels.storyboardBeatPurposeLabel}:
                </span>{' '}
                {b.purpose}
              </li>
            </ul>
          </li>
        ))}
      </ol>
      <button
        type="button"
        onClick={() => onCopy(text)}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-brand/40 bg-brand/5 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-fg transition hover:border-brand focus-visible:ring-2 focus-visible:ring-brand"
      >
        <ClipboardCopy size={12} /> {labels.storyboardCopyButton}
      </button>
      {scorecard && (
        <CreativeScorePanel scorecard={scorecard} language={language} />
      )}
    </section>
  );
}

function storyboardToText(
  storyboard: CreativeStoryboard,
  labels: CreativeStudioCopy,
): string {
  const lines: string[] = [
    `${labels.storyboardTitle} — ${storyboard.durationSec}s`,
  ];
  for (const b of storyboard.beats) {
    lines.push('');
    lines.push(`[${b.secondRange}]`);
    lines.push(`${labels.storyboardBeatVisualLabel}: ${b.visual}`);
    lines.push(`${labels.storyboardBeatOnScreenLabel}: ${b.onScreenText}`);
    lines.push(`${labels.storyboardBeatNarrationLabel}: ${b.narration}`);
    lines.push(`${labels.storyboardBeatPurposeLabel}: ${b.purpose}`);
  }
  return lines.join('\n');
}
