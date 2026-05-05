'use client';

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
      <div className="mt-5 flex items-center justify-center gap-3">
        <Button type="button" variant="brand" size="md" onClick={onLoad}>
          <Sparkles size={14} /> {labels.loadExamples}
        </Button>
        <Button type="button" variant="outline" size="md" onClick={onImport}>
          <Upload size={14} /> {labels.import}
        </Button>
      </div>
    </div>
  );
}

const L_FR = {
  title: 'Aucune offre',
  body: 'Crée une offre depuis Offer Brain ou charge des exemples pour explorer le workspace.',
  loadExamples: 'Charger des exemples',
  import: 'Importer JSON',
};
const L_EN = {
  title: 'No offers yet',
  body: 'Create an offer from Offer Brain, or load demo examples to explore the workspace.',
  loadExamples: 'Load examples',
  import: 'Import JSON',
};
