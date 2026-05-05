'use client';

import { useMemo, useState } from 'react';
import { Archive, Copy, Calendar as CalendarIcon, Check, RefreshCw, Send, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { computeAssetRollups } from '@/lib/offer-workspace/kpis';
import { ASSET_KINDS, type Asset, type AssetKind, type AssetStatus, type Offer } from '@/lib/offer-workspace/types';
import type { WorkspaceStore } from '@/lib/offer-workspace/store';
import { CreatePackButton } from '../CreatePackButton';
import { PackCoverageCard } from '../PackCoverage';
import { buildSingleVariant } from '@/lib/offer-workspace/pack-generator';
import { startOfWeekMonday } from '@/lib/offer-workspace/calendar';

interface AssetsTabProps {
  offer: Offer;
  assets: Asset[];
  language: 'fr' | 'en';
  onUpdate: () => void;
  store: WorkspaceStore;
}

// -----------------------------------------------------------------------------
// Categories
// -----------------------------------------------------------------------------

type Category = 'all' | 'texts' | 'emails' | 'videos' | 'images' | 'landing' | 'hooks_ctas';

const CATEGORY_LABELS_FR: Record<Category, string> = {
  all: 'Tout',
  texts: 'Textes',
  emails: 'Emails',
  videos: 'Vidéos',
  images: 'Images',
  landing: 'Landing',
  hooks_ctas: 'Hooks / CTAs',
};
const CATEGORY_LABELS_EN: Record<Category, string> = {
  all: 'All',
  texts: 'Texts',
  emails: 'Emails',
  videos: 'Videos',
  images: 'Images',
  landing: 'Landing',
  hooks_ctas: 'Hooks / CTAs',
};

function categoryOf(asset: Asset): Category[] {
  const out: Category[] = ['all'];
  if (asset.kind === 'social_post') out.push('texts');
  if (asset.kind === 'email') out.push('emails');
  if (asset.kind === 'video_script' || asset.kind === 'video_storyboard' || asset.kind === 'thumbnail')
    out.push('videos');
  if (asset.kind === 'image_prompt' || asset.kind === 'image_asset') out.push('images');
  if (asset.kind === 'landing_section') out.push('landing');
  if (asset.kind === 'hook' || asset.kind === 'cta') out.push('hooks_ctas');
  return out;
}

// -----------------------------------------------------------------------------
// Kind labels
// -----------------------------------------------------------------------------

const KIND_LABELS_FR: Record<AssetKind, string> = {
  hook: 'Hook',
  angle: 'Angle',
  objection: 'Objection',
  cta: 'CTA',
  social_post: 'Post social',
  landing_section: 'Section landing',
  email: 'Email',
  image_prompt: 'Prompt image',
  image_asset: 'Image',
  video_script: 'Script vidéo',
  video_storyboard: 'Storyboard',
  thumbnail: 'Thumbnail',
  creative_brief: 'Brief créatif',
};
const KIND_LABELS_EN: Record<AssetKind, string> = {
  hook: 'Hook',
  angle: 'Angle',
  objection: 'Objection',
  cta: 'CTA',
  social_post: 'Social post',
  landing_section: 'Landing section',
  email: 'Email',
  image_prompt: 'Image prompt',
  image_asset: 'Image',
  video_script: 'Video script',
  video_storyboard: 'Storyboard',
  thumbnail: 'Thumbnail',
  creative_brief: 'Creative brief',
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const SCHEDULABLE_KINDS = new Set<AssetKind>(['social_post', 'email', 'video_script', 'image_prompt']);

export function AssetsTab({ offer, assets, language, onUpdate, store }: AssetsTabProps) {
  const labels = language === 'en' ? L_EN : L_FR;
  const kindLabels = language === 'en' ? KIND_LABELS_EN : KIND_LABELS_FR;
  const categoryLabels = language === 'en' ? CATEGORY_LABELS_EN : CATEGORY_LABELS_FR;
  const rollups = useMemo(() => computeAssetRollups(assets), [assets]);

  const [category, setCategory] = useState<Category>('all');
  const [recentNotice, setRecentNotice] = useState<string | null>(null);

  const filtered = useMemo(
    () => assets.filter((a) => categoryOf(a).includes(category)),
    [assets, category],
  );

  const grouped = useMemo(() => {
    const map = new Map<AssetKind, Asset[]>();
    for (const a of filtered) {
      const arr = map.get(a.kind) ?? [];
      arr.push(a);
      map.set(a.kind, arr);
    }
    return map;
  }, [filtered]);

  const handleCopy = async (text: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
      setRecentNotice(labels.copied);
      setTimeout(() => setRecentNotice(null), 1500);
    } catch {
      // best-effort
    }
  };

  const handleRegenerate = (a: Asset) => {
    const seed = (Date.now() & 0xffff) ^ a.id.split('').reduce((h, c) => h + c.charCodeAt(0), 0);
    const draft = buildSingleVariant(offer, a.kind, seed, language);
    store.createAsset(draft);
    onUpdate();
    setRecentNotice(labels.variantCreated);
    setTimeout(() => setRecentNotice(null), 1500);
  };

  const handleScheduleMock = (a: Asset) => {
    if (!SCHEDULABLE_KINDS.has(a.kind)) return;
    // Default: 2 days from start-of-week (Monday + 2 = Wednesday), mid-day UTC
    const week = startOfWeekMonday(new Date());
    const day = new Date(week);
    day.setUTCDate(week.getUTCDate() + 2);
    day.setUTCHours(10, 0, 0, 0);
    store.createSlot({
      offerId: offer.id,
      assetId: a.id,
      channel: a.channel ?? offer.brief.platforms?.[0] ?? 'linkedin',
      scheduledAt: day.toISOString(),
      status: 'planned',
    });
    onUpdate();
    setRecentNotice(labels.scheduled);
    setTimeout(() => setRecentNotice(null), 1500);
  };

  return (
    <div className="space-y-5">
      <CreatePackButton
        offer={offer}
        hasExistingAssets={assets.length > 0}
        language={language}
        store={store}
        onAfterCreate={(n) => {
          onUpdate();
          setRecentNotice(`${labels.created} ${n}`);
          setTimeout(() => setRecentNotice(null), 2000);
        }}
      />

      <PackCoverageCard assets={assets} language={language} />

      <DimensionsRollup rollups={rollups} language={language} />

      {assets.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {(['all', 'texts', 'emails', 'videos', 'images', 'landing', 'hooks_ctas'] as Category[]).map((c) => {
            const active = c === category;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={cn(
                  'rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-wider transition',
                  active
                    ? 'border-brand bg-brand/10 text-fg'
                    : 'border-border bg-bg-elevated text-fg-muted hover:border-border-strong',
                )}
                aria-pressed={active}
              >
                {categoryLabels[c]}
              </button>
            );
          })}
          {recentNotice && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-md border border-emerald-400/40 bg-emerald-400/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-emerald-400">
              <Check size={10} /> {recentNotice}
            </span>
          )}
        </div>
      )}

      {assets.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-bg-elevated/40 p-8 text-center text-sm text-fg-muted">
          <p>{labels.emptyHint}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {ASSET_KINDS.filter((k) => grouped.get(k)?.length).map((kind) => {
            const items = grouped.get(kind)!;
            return (
              <section key={kind} className="rounded-md border border-border bg-bg-elevated">
                <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
                  <h3 className="font-mono text-[11px] uppercase tracking-wider text-fg">
                    {kindLabels[kind]}
                  </h3>
                  <span className="font-mono text-[10px] text-fg-subtle">{items.length}</span>
                </header>
                <ul className="divide-y divide-border/60">
                  {items.map((a) => (
                    <li key={a.id} className="px-4 py-3">
                      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusPill status={a.status} language={language} />
                          {a.title && (
                            <span className="font-display text-sm font-semibold text-fg">
                              {a.title}
                            </span>
                          )}
                          {a.channel && (
                            <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                              · {a.channel}
                            </span>
                          )}
                          {(a.tags ?? []).filter((t) => t.startsWith('angle:') || t.startsWith('cta:') || t.startsWith('proof:')).slice(0, 3).map((t) => (
                            <span
                              key={t}
                              className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle"
                            >
                              · {t}
                            </span>
                          ))}
                        </div>
                        <div className="flex flex-wrap items-center gap-1">
                          <ActionBtn
                            icon={<Copy size={11} />}
                            label={labels.copy}
                            onClick={() => handleCopy(a.body)}
                          />
                          {a.status !== 'review_mock' && (
                            <ActionBtn
                              icon={<RefreshCw size={11} />}
                              label={labels.review}
                              onClick={() => {
                                store.setAssetStatus(a.id, 'review_mock');
                                onUpdate();
                              }}
                            />
                          )}
                          {a.status !== 'approved' ? (
                            <ActionBtn
                              icon={<Check size={11} />}
                              label={labels.approve}
                              tone="emerald"
                              onClick={() => {
                                store.setAssetStatus(a.id, 'approved');
                                onUpdate();
                              }}
                            />
                          ) : (
                            <ActionBtn
                              icon={<RefreshCw size={11} />}
                              label={labels.unapprove}
                              onClick={() => {
                                store.setAssetStatus(a.id, 'draft');
                                onUpdate();
                              }}
                            />
                          )}
                          {a.status !== 'archived' && (
                            <ActionBtn
                              icon={<Archive size={11} />}
                              label={labels.archive}
                              onClick={() => {
                                store.setAssetStatus(a.id, 'archived');
                                onUpdate();
                              }}
                            />
                          )}
                          <ActionBtn
                            icon={<Sparkles size={11} />}
                            label={labels.regenerate}
                            tone="brand"
                            onClick={() => handleRegenerate(a)}
                          />
                          {SCHEDULABLE_KINDS.has(a.kind) && (
                            <ActionBtn
                              icon={<CalendarIcon size={11} />}
                              label={labels.schedule}
                              onClick={() => handleScheduleMock(a)}
                              title={labels.scheduleTooltip}
                            />
                          )}
                        </div>
                      </div>
                      <pre className="whitespace-pre-wrap break-words font-sans text-sm text-fg">
                        {a.body}
                      </pre>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
          {filtered.length === 0 && (
            <div className="rounded-md border border-dashed border-border bg-bg-elevated/40 p-6 text-center text-sm text-fg-muted">
              {labels.emptyCategory}
            </div>
          )}
        </div>
      )}

      <div className="text-center">
        <Link href={`/ai/offer-brain?fromOffer=${offer.id}`}>
          <Button variant="outline" size="sm">
            <Send size={12} /> {labels.regenerateFromBrain}
          </Button>
        </Link>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Sub-components
// -----------------------------------------------------------------------------

function ActionBtn({
  icon,
  label,
  onClick,
  tone,
  title,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  tone?: 'emerald' | 'brand';
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'inline-flex items-center gap-1 rounded border border-border bg-bg px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-fg-muted transition hover:border-border-strong hover:text-fg',
        tone === 'emerald' && 'border-emerald-400/40 bg-emerald-400/5 text-emerald-400 hover:border-emerald-400 hover:text-emerald-300',
        tone === 'brand' && 'border-brand/40 bg-brand/5 text-fg hover:border-brand',
      )}
    >
      {icon} {label}
    </button>
  );
}

function DimensionsRollup({
  rollups,
  language,
}: {
  rollups: ReturnType<typeof computeAssetRollups>;
  language: 'fr' | 'en';
}) {
  const labels = language === 'en' ? L_EN : L_FR;
  return (
    <div className="rounded-md border border-border bg-bg-elevated p-4">
      <h3 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
        {labels.dimensions}
      </h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-8">
        {Object.entries(rollups.perDimension).map(([dim, count]) => (
          <div key={dim} className="rounded-md border border-border bg-bg p-2 text-center">
            <div className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">{dim}</div>
            <div className="mt-1 font-display text-base font-semibold text-fg">{count}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusPill({ status, language }: { status: AssetStatus; language: 'fr' | 'en' }) {
  const map: Record<AssetStatus, { fr: string; en: string; tone: string; tipFr: string; tipEn: string }> = {
    draft: {
      fr: 'Brouillon',
      en: 'Draft',
      tone: 'text-fg-muted border-border',
      tipFr: 'Brouillon — non encore validé. Modifie ou approuve avant publication.',
      tipEn: 'Draft — not validated yet. Edit or approve before publishing.',
    },
    review_mock: {
      fr: 'En revue',
      en: 'In review',
      tone: 'text-amber-400 border-amber-400/40',
      tipFr: 'En revue (mock) — étape simulée. AI-008b ne branche aucun workflow d\'approbation collaborative.',
      tipEn: 'In review (mock) — simulated step. AI-008b does not wire a collaborative approval workflow.',
    },
    approved: {
      fr: 'Approuvé',
      en: 'Approved',
      tone: 'text-emerald-400 border-emerald-400/40',
      tipFr: 'Approuvé — figé localement. Sera la base des futures variantes.',
      tipEn: 'Approved — locally frozen. Will be the base for future variants.',
    },
    archived: {
      fr: 'Archivé',
      en: 'Archived',
      tone: 'text-fg-subtle border-border',
      tipFr: 'Archivé — gardé pour audit, exclu des recommandations actives.',
      tipEn: 'Archived — kept for audit, excluded from active recommendations.',
    },
  };
  const e = map[status];
  const tip = language === 'en' ? e.tipEn : e.tipFr;
  return (
    <span
      className={cn('cursor-help rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider', e.tone)}
      title={tip}
    >
      {language === 'en' ? e.en : e.fr}
    </span>
  );
}

const L_FR = {
  dimensions: 'Performance par dimension',
  emptyHint: 'Aucun asset pour cette offre. Génère un pack créatif pour démarrer.',
  emptyCategory: 'Aucun asset dans cette catégorie.',
  copy: 'Copier',
  review: 'Mettre en revue',
  approve: 'Approuver',
  unapprove: 'Remettre brouillon',
  archive: 'Archiver',
  regenerate: 'Variante',
  schedule: 'Planifier mock',
  scheduleTooltip: "Crée un créneau planned dans le calendrier mock. Aucun POST réseau, aucune publication réelle.",
  regenerateFromBrain: 'Régénérer depuis Offer Brain',
  copied: 'Copié',
  variantCreated: 'Variante créée',
  scheduled: 'Planifié (mock)',
  created: 'Pack créé :',
};
const L_EN = {
  dimensions: 'Performance by dimension',
  emptyHint: 'No assets for this offer. Generate a creative pack to start.',
  emptyCategory: 'No asset in this category.',
  copy: 'Copy',
  review: 'Send to review',
  approve: 'Approve',
  unapprove: 'Back to draft',
  archive: 'Archive',
  regenerate: 'Variant',
  schedule: 'Schedule mock',
  scheduleTooltip: 'Creates a planned slot in the mock calendar. No network POST, no real publishing.',
  regenerateFromBrain: 'Regenerate from Offer Brain',
  copied: 'Copied',
  variantCreated: 'Variant created',
  scheduled: 'Scheduled (mock)',
  created: 'Pack created:',
};
