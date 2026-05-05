'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Copy, RefreshCw, Send, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { Offer } from '@/lib/offer-workspace/types';
import type { WorkspaceStore } from '@/lib/offer-workspace/store';

interface QuickActionsProps {
  offer: Offer;
  language: 'fr' | 'en';
  onAfterChange: () => void;
  store: WorkspaceStore;
}

export function QuickActions({ offer, language, onAfterChange, store }: QuickActionsProps) {
  const router = useRouter();
  const labels = language === 'en' ? L_EN : L_FR;

  const onDuplicate = () => {
    const dup = store.duplicateOffer(offer.id);
    onAfterChange();
    if (dup) router.push(`/ai/offers/${dup.id}`);
  };

  const onDelete = () => {
    const confirmed = typeof window !== 'undefined' ? window.confirm(labels.confirmDelete) : true;
    if (!confirmed) return;
    store.deleteOffer(offer.id);
    onAfterChange();
    router.push('/ai/offers');
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link href={{ pathname: '/ai/offer-brain', query: { fromOffer: offer.id } }}>
        <Button type="button" variant="outline" size="sm">
          <RefreshCw size={12} /> {labels.regenerate}
        </Button>
      </Link>
      <Button type="button" variant="outline" size="sm" onClick={onDuplicate}>
        <Copy size={12} /> {labels.duplicate}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={onDelete}>
        <Trash2 size={12} /> {labels.delete}
      </Button>
      <span className="relative inline-flex">
        <Button type="button" variant="outline" size="sm" disabled title={labels.distributeTooltip}>
          <Send size={12} /> {labels.distribute}
        </Button>
        <span
          className="pointer-events-none absolute -top-1.5 -right-2 rounded-full border border-border bg-bg-elevated px-1.5 text-[9px] font-medium text-fg-subtle"
          aria-hidden
        >
          {labels.soon}
        </span>
      </span>
    </div>
  );
}

const L_FR = {
  regenerate: 'Régénérer',
  duplicate: 'Dupliquer',
  delete: 'Supprimer',
  distribute: 'Préparer diffusion',
  distributeTooltip: 'Bientôt — connecteurs sociaux à venir',
  soon: 'Bientôt',
  confirmDelete: 'Supprimer cette offre et ses assets ? Cette action est locale (workspace).',
};
const L_EN = {
  regenerate: 'Regenerate',
  duplicate: 'Duplicate',
  delete: 'Delete',
  distribute: 'Prepare distribution',
  distributeTooltip: 'Coming soon — social connectors not wired yet',
  soon: 'Soon',
  confirmDelete: 'Delete this offer and its assets? This is a local-only action.',
};
