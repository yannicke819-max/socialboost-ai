'use client';

import { useMemo } from 'react';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { computeAssetRollups } from '@/lib/offer-workspace/kpis';
import { ASSET_KINDS, type Asset, type AssetKind, type Offer } from '@/lib/offer-workspace/types';
import type { WorkspaceStore } from '@/lib/offer-workspace/store';

interface AssetsTabProps {
  offer: Offer;
  assets: Asset[];
  language: 'fr' | 'en';
  onUpdate: () => void;
  store: WorkspaceStore;
}

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

export function AssetsTab({ offer, assets, language, onUpdate, store }: AssetsTabProps) {
  const labels = language === 'en' ? L_EN : L_FR;
  const kindLabels = language === 'en' ? KIND_LABELS_EN : KIND_LABELS_FR;
  const rollups = useMemo(() => computeAssetRollups(assets), [assets]);

  const grouped = useMemo(() => {
    const map = new Map<AssetKind, Asset[]>();
    for (const a of assets) {
      const arr = map.get(a.kind) ?? [];
      arr.push(a);
      map.set(a.kind, arr);
    }
    return map;
  }, [assets]);

  if (assets.length === 0) {
    return (
      <div className="space-y-4">
        <Empty
          language={language}
          regenerateHref={`/ai/offer-brain?fromOffer=${offer.id}`}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <DimensionsRollup rollups={rollups} language={language} />

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
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                        <StatusPill status={a.status} language={language} />
                        {a.channel && <span>· {a.channel}</span>}
                        {a.dimensions.length > 0 && (
                          <span className="text-fg-muted/80">· {a.dimensions.join(' · ')}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {a.status !== 'review_mock' && (
                          <button
                            type="button"
                            onClick={() => {
                              store.setAssetStatus(a.id, 'review_mock');
                              onUpdate();
                            }}
                            className="font-mono text-[10px] uppercase tracking-wider text-fg-muted hover:text-fg"
                          >
                            {labels.markReview}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            const next = a.status === 'approved' ? 'draft' : 'approved';
                            store.setAssetStatus(a.id, next);
                            onUpdate();
                          }}
                          className="font-mono text-[10px] uppercase tracking-wider text-fg-muted hover:text-fg"
                        >
                          {a.status === 'approved' ? labels.markDraft : labels.markApproved}
                        </button>
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
      </div>

      <div className="text-center">
        <Link href={`/ai/offer-brain?fromOffer=${offer.id}`}>
          <Button variant="outline" size="sm">
            <Plus size={12} /> {labels.addMore}
          </Button>
        </Link>
      </div>
    </div>
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

function StatusPill({ status, language }: { status: Asset['status']; language: 'fr' | 'en' }) {
  const map: Record<Asset['status'], { fr: string; en: string; tone: string }> = {
    draft: { fr: 'Brouillon', en: 'Draft', tone: 'text-fg-muted border-border' },
    review_mock: { fr: 'En revue', en: 'In review', tone: 'text-amber-400 border-amber-400/40' },
    approved: { fr: 'Approuvé', en: 'Approved', tone: 'text-emerald-400 border-emerald-400/40' },
    archived: { fr: 'Archivé', en: 'Archived', tone: 'text-fg-subtle border-border' },
  };
  const e = map[status];
  return (
    <span className={cn('rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider', e.tone)}>
      {language === 'en' ? e.en : e.fr}
    </span>
  );
}

function Empty({
  language,
  regenerateHref,
}: {
  language: 'fr' | 'en';
  regenerateHref: string;
}) {
  return (
    <div className="rounded-md border border-dashed border-border bg-bg-elevated/40 p-10 text-center">
      <h3 className="font-display text-lg font-semibold text-fg">
        {language === 'en' ? 'No assets yet for this offer' : 'Aucun asset pour cette offre'}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-fg-muted">
        {language === 'en'
          ? 'Generate actionables from Offer Brain — they will be saved as assets here.'
          : 'Génère des actionables depuis Offer Brain — ils seront enregistrés comme assets ici.'}
      </p>
      <Link href={regenerateHref} className="mt-4 inline-block">
        <Button variant="brand" size="sm">
          {language === 'en' ? 'Open Offer Brain' : 'Ouvrir Offer Brain'}
        </Button>
      </Link>
    </div>
  );
}

const L_FR = {
  dimensions: 'Performance par dimension',
  markReview: 'Mettre en revue',
  markApproved: 'Approuver',
  markDraft: 'Repasser brouillon',
  addMore: 'Générer plus',
};
const L_EN = {
  dimensions: 'Performance by dimension',
  markReview: 'Send to review',
  markApproved: 'Approve',
  markDraft: 'Back to draft',
  addMore: 'Generate more',
};
