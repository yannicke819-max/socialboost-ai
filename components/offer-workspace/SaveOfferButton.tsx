'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bookmark, Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { createWorkspaceStore, deriveAssetsFromActionables } from '@/lib/offer-workspace/store';
import type { OfferGoal } from '@/lib/offer-workspace/types';

interface SaveOfferButtonProps {
  /** Brief used for the just-completed generation. */
  brief: {
    businessName: string;
    offer: string;
    targetAudience?: string;
    tone: 'professional' | 'bold' | 'friendly' | 'premium';
    language: 'fr' | 'en';
    platforms: string[];
    proofPoints: string[];
  };
  /** Goal selected at generation time. */
  goal: OfferGoal;
  /** Actionables snapshot to persist next to the offer. */
  actionables: unknown;
  diagnostic?: unknown;
  /** Confidence to copy onto the offer card. */
  confidenceScore?: number;
  language: 'fr' | 'en';
}

export function SaveOfferButton({
  brief,
  goal,
  actionables,
  diagnostic,
  confidenceScore,
  language,
}: SaveOfferButtonProps) {
  const [savedId, setSavedId] = useState<string | null>(null);
  const labels = language === 'en' ? L_EN : L_FR;

  const onSave = () => {
    const store = createWorkspaceStore();
    const offer = store.createOffer({
      goal,
      language: brief.language,
      brief,
      lastActionables: actionables,
      lastDiagnostic: diagnostic,
      confidence_score: confidenceScore,
    });
    // Materialise assets from the actionables block
    const drafts = deriveAssetsFromActionables(offer.id, (actionables ?? {}) as never);
    for (const a of drafts) {
      store.createAsset(a);
    }
    setSavedId(offer.id);
  };

  if (savedId) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-emerald-400/40 bg-emerald-400/5 px-3 py-2 text-sm">
        <Check size={14} className="text-emerald-400" />
        <span className="text-fg">{labels.saved}</span>
        <Link
          href={`/ai/offers/${savedId}`}
          className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-fg-muted hover:text-fg"
        >
          {labels.openOffer}
          <ExternalLink size={11} />
        </Link>
      </div>
    );
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={onSave}>
      <Bookmark size={12} /> {labels.save}
    </Button>
  );
}

const L_FR = {
  save: "Sauvegarder l'offre",
  saved: 'Offre sauvegardée localement.',
  openOffer: "Ouvrir dans le workspace",
};
const L_EN = {
  save: 'Save offer',
  saved: 'Offer saved locally.',
  openOffer: 'Open in workspace',
};
