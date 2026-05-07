'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ClipboardCopy,
  Download,
  Eye,
  Film,
  Sparkles,
  Star,
  Wand2,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AD_FORMAT_LABELS,
  AD_FORMATS,
  AD_STATUS_LABELS,
  AD_TYPE_LABELS,
  type AdFormat,
  type AdReadyChecklist,
  type AdStatus,
  type AdUnit,
  type Asset,
  type Offer,
} from '@/lib/offer-workspace/types';
import type { WorkspaceStore } from '@/lib/offer-workspace/store';
import {
  adToCleanText,
  adToDiffusionBrief,
  buildAdGallery,
  recommendedAds,
  reconcileAdUnits,
} from '@/lib/offer-workspace/ad-studio';
import { buildSingleVariant } from '@/lib/offer-workspace/pack-generator';

interface AdStudioTabProps {
  offer: Offer;
  assets: Asset[];
  language: 'fr' | 'en';
  store: WorkspaceStore;
  onUpdate: () => void;
  onNavigateTab?: (tab: 'brief' | 'assets' | 'plan' | 'calendar' | 'analytics' | 'feedback' | 'recos' | 'adstudio') => void;
}

type Mode = 'simple' | 'expert';

export function AdStudioTab({
  offer,
  assets,
  language,
  store,
  onUpdate,
  onNavigateTab,
}: AdStudioTabProps) {
  const labels = language === 'en' ? L_EN : L_FR;
  const [mode, setMode] = useState<Mode>('simple');
  const [filter, setFilter] = useState<AdFormat | 'all'>('all');
  const [scriptOpen, setScriptOpen] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'warn'; text: string } | null>(null);

  const showNotice = (tone: 'ok' | 'warn', text: string) => {
    setNotice({ tone, text });
    setTimeout(() => setNotice(null), 1800);
  };

  // Derive the gallery deterministically from offer + assets, reconcile with stored statuses.
  const derived = useMemo(
    () => buildAdGallery({ offer, assets, language, derivedAt: '2026-05-04T00:00:00Z' }),
    [offer, assets, language],
  );
  const stored = store.listAdUnits(offer.id);
  const reconciled = useMemo(() => reconcileAdUnits(derived, stored), [derived, stored]);
  const selections = store.listAdDiffusionSelections(offer.id);
  const selectedIds = new Set(selections.map((s) => s.adId));

  // Sync derived units into the store on mount / change so user statuses persist.
  useEffect(() => {
    store.upsertAdUnits(offer.id, derived);
    // intentionally no `derived` because it's an array reference; we rely on offer.id + assets
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offer.id, assets.length, language]);

  const approvedCount = assets.filter((a) => a.status === 'approved').length;
  const hasAnyAsset = assets.length > 0;

  // -------------------------------------------------------------------------
  // Empty / partial states
  // -------------------------------------------------------------------------
  if (!hasAnyAsset) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-dashed border-border bg-bg-elevated/40 p-8 text-center">
          <Sparkles size={22} className="mx-auto mb-3 text-fg-subtle" />
          <h2 className="font-display text-xl font-semibold text-fg">{labels.emptyNoAssetsTitle}</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-fg-muted">{labels.emptyNoAssetsBody}</p>
          <button
            type="button"
            onClick={() => onNavigateTab?.('assets')}
            className="mt-5 inline-flex items-center gap-1.5 rounded-md border border-brand/40 bg-brand/5 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-fg transition hover:border-brand"
          >
            <Sparkles size={12} /> {labels.emptyNoAssetsCta}
          </button>
        </div>
        <p className="text-center text-[11px] text-fg-subtle">{labels.mockBanner}</p>
      </div>
    );
  }

  if (approvedCount < 3) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-amber-400/30 bg-amber-400/5 p-6">
          <AlertTriangle size={18} className="mb-2 text-amber-400" />
          <h2 className="font-display text-lg font-semibold text-fg">{labels.emptyLowApprovedTitle}</h2>
          <p className="mt-1 max-w-xl text-sm text-fg-muted">
            {labels.emptyLowApprovedBody.replace('{n}', String(approvedCount))}
          </p>
          <button
            type="button"
            onClick={() => onNavigateTab?.('assets')}
            className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-brand/40 bg-brand/5 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-fg transition hover:border-brand"
          >
            <Sparkles size={12} /> {labels.emptyLowApprovedCta}
          </button>
        </div>
        <p className="text-[11px] text-fg-subtle">{labels.mockBanner}</p>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Populated
  // -------------------------------------------------------------------------
  const visible = mode === 'simple' ? recommendedAds(reconciled) : reconciled;
  const filtered = filter === 'all' ? visible : visible.filter((u) => u.format === filter);

  const handleCopy = async (ad: AdUnit) => {
    try {
      const text = adToCleanText(ad, language);
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
      showNotice('ok', labels.copied);
    } catch {
      showNotice('warn', labels.copyFailed);
    }
  };

  const handleExportKit = (ad: AdUnit) => {
    const text = adToDiffusionBrief(ad, language);
    if (typeof document === 'undefined' || typeof URL === 'undefined') return;
    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ad-${ad.templateId}.md`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotice('ok', labels.kitExported);
  };

  const handleVariant = (ad: AdUnit) => {
    if (!ad.sourceAssetId) {
      showNotice('warn', labels.variantNoSource);
      return;
    }
    const source = assets.find((a) => a.id === ad.sourceAssetId);
    if (!source) {
      showNotice('warn', labels.variantNoSource);
      return;
    }
    const seed =
      (Date.now() & 0xffff) ^
      source.id.split('').reduce((h, c) => h + c.charCodeAt(0), 0);
    const draft = buildSingleVariant(offer, source.kind, seed, language);
    store.createAsset(draft);
    onUpdate();
    showNotice('ok', labels.variantCreated);
  };

  const handleMarkReady = (ad: AdUnit) => {
    const next: AdStatus = ad.status === 'ready' ? 'draft' : 'ready';
    store.setAdStatus(ad.id, next);
    onUpdate();
    showNotice('ok', next === 'ready' ? labels.markedReady : labels.unmarkedReady);
  };

  const handleSelectDiffusion = (ad: AdUnit) => {
    const wasSelected = selectedIds.has(ad.id);
    store.setAdDiffusionSelection(offer.id, ad.id, !wasSelected);
    if (!wasSelected) store.setAdStatus(ad.id, 'selected');
    else if (ad.status === 'selected') store.setAdStatus(ad.id, 'ready');
    onUpdate();
    showNotice('ok', wasSelected ? labels.unselected : labels.selected);
  };

  return (
    <div className="space-y-5">
      {/* Hero */}
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
          <div className="flex items-center gap-1 rounded-md border border-border bg-bg-elevated p-0.5">
            <button
              type="button"
              onClick={() => setMode('simple')}
              aria-pressed={mode === 'simple'}
              className={cn(
                'rounded px-3 py-1 font-mono text-[10px] uppercase tracking-wider transition',
                mode === 'simple' ? 'bg-bg text-fg' : 'text-fg-muted hover:text-fg',
              )}
            >
              {labels.modeSimple}
            </button>
            <button
              type="button"
              onClick={() => setMode('expert')}
              aria-pressed={mode === 'expert'}
              className={cn(
                'rounded px-3 py-1 font-mono text-[10px] uppercase tracking-wider transition',
                mode === 'expert' ? 'bg-bg text-fg' : 'text-fg-muted hover:text-fg',
              )}
            >
              {labels.modeExpert}
            </button>
          </div>
        </div>
        {notice && (
          <p
            className={cn(
              'mt-3 inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider',
              notice.tone === 'ok'
                ? 'border-emerald-400/40 bg-emerald-400/5 text-emerald-400'
                : 'border-amber-400/40 bg-amber-400/5 text-amber-400',
            )}
          >
            <Check size={10} /> {notice.text}
          </p>
        )}
      </header>

      {/* Mock V1 banner */}
      <p className="rounded border border-amber-400/30 bg-amber-400/5 px-3 py-2 text-[11px] text-amber-400">
        {labels.mockBanner}
      </p>

      {/* Format filter — Expert mode only */}
      {mode === 'expert' && (
        <div className="flex flex-wrap items-center gap-2">
          <FilterPill
            active={filter === 'all'}
            label={labels.filterAll}
            onClick={() => setFilter('all')}
          />
          {AD_FORMATS.map((f) => (
            <FilterPill
              key={f}
              active={filter === f}
              label={AD_FORMAT_LABELS[f][language]}
              onClick={() => setFilter(f)}
            />
          ))}
        </div>
      )}

      {/* Gallery */}
      <ul className="grid gap-4 md:grid-cols-2">
        {filtered.map((ad) => (
          <AdCard
            key={ad.id}
            ad={ad}
            mode={mode}
            language={language}
            isSelected={selectedIds.has(ad.id)}
            onCopy={() => handleCopy(ad)}
            onExportKit={() => handleExportKit(ad)}
            onVariant={() => handleVariant(ad)}
            onMarkReady={() => handleMarkReady(ad)}
            onSelectDiffusion={() => handleSelectDiffusion(ad)}
            onOpenScript={() => setScriptOpen(ad.id)}
          />
        ))}
      </ul>

      {/* Script viewer */}
      {scriptOpen && (
        <ScriptViewer
          ad={reconciled.find((u) => u.id === scriptOpen)!}
          language={language}
          onClose={() => setScriptOpen(null)}
        />
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Sub-components
// -----------------------------------------------------------------------------

function FilterPill({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-wider transition',
        active
          ? 'border-brand bg-brand/10 text-fg'
          : 'border-border bg-bg-elevated text-fg-muted hover:border-border-strong',
      )}
    >
      {label}
    </button>
  );
}

function AdCard({
  ad,
  mode,
  language,
  isSelected,
  onCopy,
  onExportKit,
  onVariant,
  onMarkReady,
  onSelectDiffusion,
  onOpenScript,
}: {
  ad: AdUnit;
  mode: Mode;
  language: 'fr' | 'en';
  isSelected: boolean;
  onCopy: () => void;
  onExportKit: () => void;
  onVariant: () => void;
  onMarkReady: () => void;
  onSelectDiffusion: () => void;
  onOpenScript: () => void;
}) {
  const labels = language === 'en' ? L_EN : L_FR;
  return (
    <li className="flex flex-col rounded-md border border-border bg-bg-elevated">
      {/* Preview */}
      <div className="border-b border-border p-3">
        <Preview ad={ad} language={language} />
      </div>

      {/* Header */}
      <div className="px-3 pt-3">
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
              {AD_TYPE_LABELS[ad.type][language]}
            </span>
            <span className="rounded-full border border-border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-fg-muted">
              {AD_FORMAT_LABELS[ad.format][language]}
            </span>
            <span className="font-mono text-[9px] uppercase tracking-wider text-fg-subtle">
              · {ad.channel}
            </span>
          </div>
          <StatusPill status={ad.status} language={language} />
        </div>
        <h3 className="mt-1 font-display text-base font-semibold text-fg">{ad.name}</h3>
        <p className="mt-0.5 text-[12px] text-fg-muted">{ad.objective}</p>
      </div>

      {/* Body */}
      <div className="space-y-2 px-3 py-2">
        <p className="line-clamp-3 text-sm text-fg">{ad.copy}</p>
        <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
          {labels.cta}: <span className="text-fg">{ad.cta}</span>
        </p>
      </div>

      {/* Checklist + score */}
      <div className="space-y-2 border-t border-border px-3 py-2">
        <ChecklistView checklist={ad.checklist} language={language} />
        {mode === 'expert' && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <ScoreChip label={labels.scoreReady} value={ad.ready_score} accent />
            {typeof ad.audience_fit === 'number' && (
              <ScoreChip label={labels.scoreFit} value={ad.audience_fit} />
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-1.5 border-t border-border px-3 py-2">
        {ad.status !== 'ready' && ad.status !== 'selected' ? (
          <Btn icon={<CheckCircle2 size={11} />} label={labels.markReady} tone="emerald" onClick={onMarkReady} />
        ) : (
          <Btn icon={<CheckCircle2 size={11} />} label={labels.unmarkReady} onClick={onMarkReady} />
        )}
        <Btn
          icon={<Star size={11} />}
          label={isSelected ? labels.unselectDiffusion : labels.selectDiffusion}
          tone={isSelected ? 'amber' : undefined}
          onClick={onSelectDiffusion}
        />
        <Btn icon={<ClipboardCopy size={11} />} label={labels.copy} onClick={onCopy} />
        <Btn icon={<Wand2 size={11} />} label={labels.variant} onClick={onVariant} />
        {(ad.scenes && ad.scenes.length > 0) && (
          <Btn icon={<Eye size={11} />} label={labels.viewScript} onClick={onOpenScript} />
        )}
        <Btn icon={<Download size={11} />} label={labels.exportKit} onClick={onExportKit} />
      </div>
    </li>
  );
}

function Preview({ ad, language }: { ad: AdUnit; language: 'fr' | 'en' }) {
  // Pure CSS-only frames. No real media.
  if (ad.format === '9:16') return <FrameVertical ad={ad} />;
  if (ad.format === '1:1') return <FrameSquare ad={ad} />;
  if (ad.format === '16:9') return <FrameLandscape ad={ad} />;
  if (ad.format === 'linkedin') return <FrameLinkedIn ad={ad} language={language} />;
  if (ad.format === 'carousel') return <FrameCarousel ad={ad} />;
  if (ad.format === 'email') return <FrameEmail ad={ad} language={language} />;
  return null;
}

function FrameVertical({ ad }: { ad: AdUnit }) {
  return (
    <div className="mx-auto flex aspect-[9/16] w-32 flex-col rounded-lg border border-border bg-gradient-to-br from-bg via-bg-elevated to-bg p-2 text-fg">
      <p className="font-display text-[11px] font-semibold leading-tight">{ad.hook}</p>
      <div className="mt-auto rounded bg-fg/10 px-1.5 py-0.5 text-center font-mono text-[8px] uppercase tracking-wider text-fg">
        {ad.cta.length > 20 ? `${ad.cta.slice(0, 19)}…` : ad.cta}
      </div>
    </div>
  );
}

function FrameSquare({ ad }: { ad: AdUnit }) {
  return (
    <div className="mx-auto flex aspect-square w-40 flex-col justify-between rounded-md border border-border bg-gradient-to-br from-bg-elevated via-bg to-bg-elevated p-3 text-fg">
      <p className="font-display text-xs font-semibold leading-tight">{ad.hook}</p>
      <p className="rounded bg-fg/10 px-1.5 py-0.5 text-center font-mono text-[9px] uppercase tracking-wider">
        {ad.cta.length > 22 ? `${ad.cta.slice(0, 21)}…` : ad.cta}
      </p>
    </div>
  );
}

function FrameLandscape({ ad }: { ad: AdUnit }) {
  return (
    <div className="mx-auto flex aspect-video w-full flex-col justify-between rounded-md border border-border bg-gradient-to-r from-bg via-bg-elevated to-bg p-3 text-fg">
      <p className="font-display text-sm font-semibold">{ad.hook}</p>
      <p className="self-end rounded bg-fg/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider">
        {ad.cta}
      </p>
    </div>
  );
}

function FrameLinkedIn({ ad, language }: { ad: AdUnit; language: 'fr' | 'en' }) {
  const labels = language === 'en' ? L_EN : L_FR;
  return (
    <div className="rounded-md border border-border bg-bg p-3">
      <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
        {labels.linkedInPreview}
      </p>
      <p className="mt-1 line-clamp-3 text-sm text-fg">{ad.hook}</p>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
        ↳ {ad.cta}
      </p>
    </div>
  );
}

function FrameCarousel({ ad }: { ad: AdUnit }) {
  const slides = ad.slides ?? [];
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1">
      {slides.map((s) => (
        <div
          key={s.index}
          className="flex aspect-square w-24 shrink-0 flex-col rounded-md border border-border bg-bg p-2 text-fg"
        >
          <p className="font-mono text-[9px] uppercase tracking-wider text-fg-subtle">
            {String(s.index).padStart(2, '0')}/{String(slides.length).padStart(2, '0')}
          </p>
          <p className="mt-1 line-clamp-4 font-display text-[10px] font-semibold leading-tight">
            {s.headline}
          </p>
        </div>
      ))}
    </div>
  );
}

function FrameEmail({ ad, language }: { ad: AdUnit; language: 'fr' | 'en' }) {
  const labels = language === 'en' ? L_EN : L_FR;
  return (
    <div className="rounded-md border border-border bg-bg p-3">
      <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
        {labels.emailSubject}
      </p>
      <p className="mt-0.5 truncate text-sm font-semibold text-fg">{ad.emailSubject ?? ad.hook}</p>
      {ad.emailPreheader && (
        <>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
            {labels.emailPreheader}
          </p>
          <p className="truncate text-[12px] text-fg-muted">{ad.emailPreheader}</p>
        </>
      )}
    </div>
  );
}

function StatusPill({ status, language }: { status: AdStatus; language: 'fr' | 'en' }) {
  const tone: Record<AdStatus, string> = {
    draft: 'border-border text-fg-muted',
    ready: 'border-emerald-400/40 text-emerald-400',
    selected: 'border-amber-400/40 text-amber-400',
  };
  return (
    <span
      className={cn(
        'rounded-full border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider',
        tone[status],
      )}
    >
      {AD_STATUS_LABELS[status][language]}
    </span>
  );
}

function ChecklistView({
  checklist,
  language,
}: {
  checklist: AdReadyChecklist;
  language: 'fr' | 'en';
}) {
  const labels = language === 'en' ? L_EN : L_FR;
  const items: { key: keyof AdReadyChecklist; label: string }[] = [
    { key: 'hook_in_first_3s', label: labels.checkHook },
    { key: 'legible_without_sound', label: labels.checkLegible },
    { key: 'single_clear_cta', label: labels.checkCta },
    { key: 'explicit_benefit', label: labels.checkBenefit },
    { key: 'proof_or_credibility', label: labels.checkProof },
    { key: 'format_fits_channel', label: labels.checkFit },
    { key: 'language_consistency', label: labels.checkLanguage },
    { key: 'no_mock_leak_in_public_copy', label: labels.checkNoLeak },
  ];
  return (
    <ul className="grid gap-0.5 text-[11px] sm:grid-cols-2">
      {items.map((it) => (
        <li
          key={it.key}
          className={cn(
            'flex items-center gap-1.5',
            checklist[it.key] ? 'text-emerald-400' : 'text-fg-subtle',
          )}
        >
          {checklist[it.key] ? <Check size={11} /> : <XCircle size={11} />}
          <span className="text-fg-muted">{it.label}</span>
        </li>
      ))}
    </ul>
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
          : 'border-border bg-bg text-fg-muted',
      )}
    >
      {label} {value}/100
    </span>
  );
}

function Btn({
  icon,
  label,
  onClick,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  tone?: 'emerald' | 'amber';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        tone === 'emerald'
          ? 'border-emerald-400/40 bg-emerald-400/5 text-emerald-400 hover:border-emerald-400 hover:text-emerald-300'
          : tone === 'amber'
            ? 'border-amber-400/40 bg-amber-400/5 text-amber-400 hover:border-amber-400 hover:text-amber-300'
            : 'border-border bg-bg text-fg-muted hover:border-border-strong hover:text-fg',
      )}
    >
      {icon} {label}
    </button>
  );
}

function ScriptViewer({
  ad,
  language,
  onClose,
}: {
  ad: AdUnit;
  language: 'fr' | 'en';
  onClose: () => void;
}) {
  const labels = language === 'en' ? L_EN : L_FR;
  return (
    <section className="rounded-md border border-brand/30 bg-bg-elevated p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Film size={14} className="text-brand" />
          <h3 className="font-mono text-[11px] uppercase tracking-wider text-fg">
            {labels.scriptTitle} — {ad.name}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-bg px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-fg-muted hover:text-fg"
        >
          {labels.close}
        </button>
      </div>
      <ul className="space-y-2">
        {(ad.scenes ?? []).map((s, idx) => (
          <li key={idx} className="rounded border border-border bg-bg p-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
              {labels.sceneTime} {s.startSec}–{s.endSec}s · {s.intent}
            </p>
            <ul className="mt-1 grid gap-0.5 text-sm text-fg sm:grid-cols-2">
              <li>
                <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                  {labels.sceneVisual}
                </span>{' '}
                {s.visual}
              </li>
              <li>
                <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                  {labels.sceneVoice}
                </span>{' '}
                {s.voice}
              </li>
              <li className="sm:col-span-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                  {labels.sceneOnScreen}
                </span>{' '}
                {s.onScreen}
              </li>
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Microcopy
// -----------------------------------------------------------------------------

const L_FR = {
  heroEyebrow: 'Ad Studio',
  heroTitle: 'Tes annonces prêtes à diffuser',
  heroSubtitle:
    "Voici à quoi ressembleront tes annonces avant diffusion. Choisis-en quelques-unes, prépare-les, copie-les. Aucune publication réelle.",
  modeSimple: 'Mode Simple',
  modeExpert: 'Mode Expert',
  mockBanner:
    "Mock V1 : aucune annonce n'est publiée. Ces prévisualisations servent à préparer la diffusion.",
  filterAll: 'Tous les formats',

  cta: 'CTA',
  scoreReady: 'Prêt à diffuser',
  scoreFit: 'Audience fit',

  markReady: 'Marquer prête',
  unmarkReady: 'Remettre brouillon',
  selectDiffusion: 'Sélectionner pour diffusion mock',
  unselectDiffusion: 'Retirer de la sélection',
  copy: "Copier l'annonce",
  variant: 'Créer variante',
  viewScript: 'Voir script vidéo',
  exportKit: 'Exporter le kit texte',

  copied: 'Annonce copiée.',
  copyFailed: 'Copie indisponible.',
  kitExported: 'Kit texte exporté.',
  variantCreated: 'Variante créée dans Contenus.',
  variantNoSource: 'Aucun contenu source à dupliquer pour cette annonce.',
  markedReady: 'Annonce marquée prête.',
  unmarkedReady: 'Annonce remise en brouillon.',
  selected: 'Annonce sélectionnée pour diffusion mock.',
  unselected: 'Annonce retirée de la sélection.',

  checkHook: 'Hook visible dans les 3 premières secondes',
  checkLegible: 'Compréhensible sans son',
  checkCta: 'CTA unique et clair',
  checkBenefit: 'Bénéfice explicite',
  checkProof: 'Preuve ou crédibilité présente',
  checkFit: 'Format adapté au canal',
  checkLanguage: 'Texte cohérent dans une seule langue',
  checkNoLeak: 'Aucune mention « mock » dans le texte public',

  linkedInPreview: 'Aperçu post LinkedIn',
  emailSubject: 'Objet',
  emailPreheader: 'Préheader',

  scriptTitle: 'Script vidéo scène par scène',
  sceneTime: 'Scène',
  sceneVisual: 'Visuel :',
  sceneVoice: 'Voix / caption :',
  sceneOnScreen: 'Texte à l\'écran :',
  close: 'Fermer',

  emptyNoAssetsTitle: 'Crée d\'abord un pack créatif',
  emptyNoAssetsBody:
    "Ad Studio s'appuie sur tes contenus. Génère un pack créatif depuis l'onglet Contenus, puis reviens ici pour découvrir tes annonces.",
  emptyNoAssetsCta: 'Aller dans Contenus',

  emptyLowApprovedTitle: 'Approuve 3 contenus pour des annonces solides',
  emptyLowApprovedBody:
    "Tu as {n} contenu(s) approuvé(s). On a besoin d'au moins 3 contenus validés pour produire des annonces fiables. Approuve tes meilleurs hooks et preuves, puis reviens ici.",
  emptyLowApprovedCta: 'Approuver des contenus',
};

const L_EN: typeof L_FR = {
  heroEyebrow: 'Ad Studio',
  heroTitle: 'Your ads — ready to ship',
  heroSubtitle:
    'Here is what your ads will look like before any real diffusion. Pick a few, polish them, copy them. No real publishing.',
  modeSimple: 'Simple mode',
  modeExpert: 'Expert mode',
  mockBanner: 'Mock V1: nothing is published. These previews help you prepare the diffusion.',
  filterAll: 'All formats',

  cta: 'CTA',
  scoreReady: 'Ready to ship',
  scoreFit: 'Audience fit',

  markReady: 'Mark ready',
  unmarkReady: 'Back to draft',
  selectDiffusion: 'Select for mock diffusion',
  unselectDiffusion: 'Unselect',
  copy: 'Copy ad',
  variant: 'Create variant',
  viewScript: 'View video script',
  exportKit: 'Export text kit',

  copied: 'Ad copied.',
  copyFailed: 'Clipboard unavailable.',
  kitExported: 'Text kit exported.',
  variantCreated: 'Variant created under Contents.',
  variantNoSource: 'No source content to duplicate for this ad.',
  markedReady: 'Ad marked ready.',
  unmarkedReady: 'Ad back to draft.',
  selected: 'Ad selected for mock diffusion.',
  unselected: 'Ad unselected.',

  checkHook: 'Hook visible in the first 3 seconds',
  checkLegible: 'Readable without sound',
  checkCta: 'Single, clear CTA',
  checkBenefit: 'Explicit benefit',
  checkProof: 'Proof or credibility present',
  checkFit: 'Format fits the channel',
  checkLanguage: 'Copy consistent in a single language',
  checkNoLeak: 'No "mock" leak in the public copy',

  linkedInPreview: 'LinkedIn post preview',
  emailSubject: 'Subject',
  emailPreheader: 'Preheader',

  scriptTitle: 'Scene-by-scene video script',
  sceneTime: 'Scene',
  sceneVisual: 'Visual:',
  sceneVoice: 'Voice / caption:',
  sceneOnScreen: 'On-screen text:',
  close: 'Close',

  emptyNoAssetsTitle: 'Create a creative pack first',
  emptyNoAssetsBody:
    'Ad Studio reads your contents. Generate a creative pack from the Contents tab, then come back here to discover your ads.',
  emptyNoAssetsCta: 'Go to Contents',

  emptyLowApprovedTitle: 'Approve 3 contents for solid ads',
  emptyLowApprovedBody:
    'You have {n} approved content(s). We need at least 3 validated contents to produce reliable ads. Approve your best hooks and proofs, then come back here.',
  emptyLowApprovedCta: 'Approve contents',
};
