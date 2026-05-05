'use client';

import { useState } from 'react';
import { Sparkles, Loader2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { buildCreativePack } from '@/lib/offer-workspace/pack-generator';
import type { Offer } from '@/lib/offer-workspace/types';
import type { WorkspaceStore } from '@/lib/offer-workspace/store';

interface CreatePackButtonProps {
  offer: Offer;
  hasExistingAssets: boolean;
  language: 'fr' | 'en';
  store: WorkspaceStore;
  onAfterCreate: (createdCount: number) => void;
}

export function CreatePackButton({
  offer,
  hasExistingAssets,
  language,
  store,
  onAfterCreate,
}: CreatePackButtonProps) {
  const [busy, setBusy] = useState(false);
  const labels = language === 'en' ? L_EN : L_FR;

  const handleClick = () => {
    if (busy) return;
    setBusy(true);
    // Use a fresh variantSeed each click so "Add variants" actually varies.
    // Seed of 0 = first pack; subsequent clicks use Date.now() for uniqueness
    // (purely a seed input, the OUTPUT remains deterministic for the same seed).
    const variantSeed = hasExistingAssets ? Date.now() & 0xffff : 0;
    const drafts = buildCreativePack({ offer, variantSeed, language });
    for (const d of drafts) {
      store.createAsset(d);
    }
    setBusy(false);
    onAfterCreate(drafts.length);
  };

  const isAdd = hasExistingAssets;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-brand/40 bg-brand/5 p-4">
      <div className="min-w-0">
        <p className="font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
          {isAdd ? labels.addTitle : labels.createTitle}
        </p>
        <p className="mt-1 max-w-xl text-sm text-fg">
          {isAdd ? labels.addBody : labels.createBody}
        </p>
        <p
          className="mt-2 inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-400/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-amber-400"
          title={labels.mockTooltip}
        >
          {labels.mockBadge}
        </p>
      </div>
      <Button
        type="button"
        variant="brand"
        size="md"
        onClick={handleClick}
        disabled={busy}
        className={cn(busy && 'opacity-70')}
      >
        {busy ? (
          <>
            <Loader2 size={14} className="animate-spin" /> {labels.busy}
          </>
        ) : isAdd ? (
          <>
            <Plus size={14} /> {labels.addCta}
          </>
        ) : (
          <>
            <Sparkles size={14} /> {labels.createCta}
          </>
        )}
      </Button>
    </div>
  );
}

const L_FR = {
  createTitle: 'Pack créatif v1',
  createBody:
    "Génère 24 assets prêts à éditer : 5 hooks, 5 posts LinkedIn, 3 emails, 3 CTAs, 3 scripts vidéo courts, 3 prompts image, 1 carousel Instagram, 1 hero landing alternatif. Aucune publication réelle.",
  createCta: 'Créer un pack créatif',
  addTitle: 'Ajouter des variantes',
  addBody:
    "Ajoute un nouveau set de variantes (24 assets supplémentaires) avec un seed de variation différent. Tes assets existants ne sont jamais écrasés.",
  addCta: 'Ajouter des variantes',
  busy: 'Génération…',
  mockBadge: 'MOCK V1',
  mockTooltip:
    "Génération mock déterministe. Aucun appel modèle réel, aucune publication. Les preuves de l'offre sont reprises verbatim.",
};
const L_EN = {
  createTitle: 'Creative pack v1',
  createBody:
    'Generate 24 ready-to-edit assets: 5 hooks, 5 LinkedIn posts, 3 emails, 3 CTAs, 3 short video scripts, 3 image prompts, 1 Instagram carousel, 1 alternate landing hero. No real publishing.',
  createCta: 'Create a creative pack',
  addTitle: 'Add variants',
  addBody:
    "Adds a new variant set (24 more assets) with a different variation seed. Your existing assets are never overwritten.",
  addCta: 'Add variants',
  busy: 'Generating…',
  mockBadge: 'MOCK V1',
  mockTooltip:
    "Deterministic mock generation. No real model call, no publishing. Offer's proofs are reused verbatim.",
};
