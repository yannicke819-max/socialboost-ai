'use client';

import Link from 'next/link';
import { Sparkles, Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface EmptyStateLoadExamplesProps {
  onLoad: () => void;
  onImport: () => void;
  language: 'fr' | 'en';
}

export function EmptyStateLoadExamples({ onLoad, onImport, language }: EmptyStateLoadExamplesProps) {
  const labels = language === 'en' ? L_EN : L_FR;
  return (
    <div className="rounded-md border border-dashed border-border bg-bg-elevated/40 p-10 text-center">
      <Sparkles size={20} className="mx-auto mb-3 text-fg-subtle" />
      <h3 className="font-display text-xl font-semibold text-fg">{labels.title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-fg-muted">{labels.body}</p>
      <ul className="mx-auto mt-4 max-w-md space-y-1 text-left text-xs text-fg-muted">
        <li>· {labels.flow1}</li>
        <li>· {labels.flow2}</li>
        <li>· {labels.flow3}</li>
      </ul>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/ai/offer-brain"
          className="inline-flex h-10 items-center gap-2 rounded-md bg-brand px-4 font-semibold text-brand-fg shadow-glow transition hover:bg-brand/90"
        >
          <Sparkles size={14} /> {labels.openBrain}
        </Link>
        <Button type="button" variant="outline" size="md" onClick={onLoad}>
          <Sparkles size={14} /> {labels.loadExamples}
        </Button>
        <Button type="button" variant="ghost" size="md" onClick={onImport}>
          <Upload size={14} /> {labels.import}
        </Button>
      </div>
      <p className="mx-auto mt-4 max-w-md text-[11px] text-fg-subtle">
        {labels.localOnly}
      </p>
    </div>
  );
}

const L_FR = {
  title: 'Aucune offre — démarre ton Offer OS',
  body: 'Le workspace transforme une offre brute en système prêt à diffuser et améliorer. Aucune publication réelle pour l’instant.',
  flow1: 'Décris ton offre dans Offer Brain — résultat structuré en 5 secondes.',
  flow2: 'Sauvegarde-la : ses hooks, angles, objections et CTAs deviennent des assets.',
  flow3: 'Planifie, suis (mock) et améliore via les recommandations.',
  openBrain: 'Créer depuis Offer Brain',
  loadExamples: 'Charger des exemples',
  import: 'Importer JSON',
  localOnly: 'Stockage local uniquement (localStorage). Aucune donnée envoyée. Aucun connecteur réel.',
};
const L_EN = {
  title: 'No offers yet — start your Offer OS',
  body: "The workspace turns a raw offer into a system ready to ship and improve. No real publishing yet.",
  flow1: 'Describe your offer in Offer Brain — structured output in 5 seconds.',
  flow2: 'Save it: hooks, angles, objections, CTAs become assets.',
  flow3: 'Schedule, track (mock) and improve via recommendations.',
  openBrain: 'Create from Offer Brain',
  loadExamples: 'Load examples',
  import: 'Import JSON',
  localOnly: 'Local storage only (localStorage). No data sent. No real connectors.',
};
