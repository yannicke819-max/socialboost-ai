'use client';

import { useState } from 'react';
import { Save, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { OFFER_GOALS, type Offer, type OfferGoal } from '@/lib/offer-workspace/types';
import type { WorkspaceStore } from '@/lib/offer-workspace/store';

interface BriefTabProps {
  offer: Offer;
  language: 'fr' | 'en';
  onUpdate: () => void;
  store: WorkspaceStore;
}

const GOAL_LABELS_FR: Record<OfferGoal, string> = {
  clarify_offer: "Clarifier l'offre",
  social_content: 'Créer du contenu social',
  landing_page: 'Préparer une landing page',
  objections: 'Traiter les objections',
  sales_angles: 'Générer des angles de vente',
};
const GOAL_LABELS_EN: Record<OfferGoal, string> = {
  clarify_offer: 'Clarify the offer',
  social_content: 'Create social content',
  landing_page: 'Prepare a landing page',
  objections: 'Handle objections',
  sales_angles: 'Generate sales angles',
};

export function BriefTab({ offer, language, onUpdate, store }: BriefTabProps) {
  const [goal, setGoal] = useState<OfferGoal>(offer.goal);
  const [name, setName] = useState(offer.name);
  const [notes, setNotes] = useState(offer.notes ?? '');
  const goalLabels = language === 'en' ? GOAL_LABELS_EN : GOAL_LABELS_FR;
  const labels = language === 'en' ? L_EN : L_FR;

  const goalDirty = goal !== offer.goal;
  const nameDirty = name !== offer.name;
  const notesDirty = notes !== (offer.notes ?? '');
  const dirty = goalDirty || nameDirty || notesDirty;

  const onSave = () => {
    store.updateOffer(offer.id, { goal, name, notes: notes.trim() || undefined });
    onUpdate();
  };

  return (
    <div className="space-y-5">
      <div className="rounded-md border border-border bg-bg-elevated p-4">
        <h3 className="mb-3 font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
          {labels.identification}
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={labels.name}>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label={labels.goal}>
            <select
              value={goal}
              onChange={(e) => setGoal(e.target.value as OfferGoal)}
              className={inputClass}
            >
              {OFFER_GOALS.map((g) => (
                <option key={g} value={g}>
                  {goalLabels[g]}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      <div className="rounded-md border border-border bg-bg-elevated p-4">
        <h3 className="mb-3 font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
          {labels.snapshot}
        </h3>
        <dl className="space-y-3 text-sm">
          <Row label={labels.businessName} value={offer.brief.businessName} />
          <Row label={labels.offer} value={offer.brief.offer} multiline />
          {offer.brief.targetAudience && <Row label={labels.audience} value={offer.brief.targetAudience} />}
          <Row label={labels.tone} value={offer.brief.tone} mono />
          <Row label={labels.platforms} value={offer.brief.platforms.join(', ') || '—'} mono />
          {offer.brief.proofPoints.length > 0 && (
            <div>
              <dt className="mb-1 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                {labels.proofs}
              </dt>
              <ul className="space-y-1 pl-1">
                {offer.brief.proofPoints.map((p, i) => (
                  <li key={i} className="text-fg">
                    · {p}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </dl>
        <p className="mt-4 text-[11px] text-fg-subtle">
          {labels.briefHint}{' '}
          <Link
            href={{ pathname: '/ai/offer-brain', query: { fromOffer: offer.id } }}
            className="text-fg-muted underline hover:text-fg"
          >
            {labels.regenerateLink}
          </Link>
          .
        </p>
      </div>

      <div className="rounded-md border border-border bg-bg-elevated p-4">
        <h3 className="mb-3 font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
          {labels.notes}
        </h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder={labels.notesPlaceholder}
          className={`${inputClass} resize-y`}
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-fg-muted">
          {dirty ? labels.unsaved : labels.upToDate}
        </p>
        <div className="flex items-center gap-2">
          <Link href={{ pathname: '/ai/offer-brain', query: { fromOffer: offer.id } }}>
            <Button type="button" variant="outline" size="sm">
              <Sparkles size={12} /> {labels.regenerateNow}
            </Button>
          </Link>
          <Button type="button" variant="brand" size="sm" onClick={onSave} disabled={!dirty}>
            <Save size={12} /> {labels.save}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
        {label}
      </span>
      {children}
    </label>
  );
}

function Row({
  label,
  value,
  multiline,
  mono,
}: {
  label: string;
  value: string;
  multiline?: boolean;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="mb-0.5 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
        {label}
      </dt>
      <dd className={mono ? 'font-mono text-sm text-fg' : multiline ? 'whitespace-pre-wrap text-fg' : 'text-fg'}>
        {value}
      </dd>
    </div>
  );
}

const inputClass =
  'w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg';

const L_FR = {
  identification: 'Identification',
  snapshot: 'Brief utilisé',
  notes: 'Notes',
  name: "Nom de l'offre",
  goal: 'Objectif',
  businessName: 'Marque',
  offer: 'Offre',
  audience: 'Cible',
  tone: 'Ton',
  platforms: 'Plateformes',
  proofs: 'Preuves',
  briefHint: 'Pour modifier le brief lui-même,',
  regenerateLink: 'régénère depuis Offer Brain',
  regenerateNow: 'Régénérer maintenant',
  save: 'Enregistrer',
  unsaved: 'Modifications non enregistrées.',
  upToDate: 'À jour.',
  notesPlaceholder: 'Notes internes, contexte, choix éditoriaux…',
};
const L_EN = {
  identification: 'Identification',
  snapshot: 'Brief used',
  notes: 'Notes',
  name: 'Offer name',
  goal: 'Goal',
  businessName: 'Brand',
  offer: 'Offer',
  audience: 'Audience',
  tone: 'Tone',
  platforms: 'Platforms',
  proofs: 'Proofs',
  briefHint: 'To edit the brief itself,',
  regenerateLink: 'regenerate from Offer Brain',
  regenerateNow: 'Regenerate now',
  save: 'Save',
  unsaved: 'Unsaved changes.',
  upToDate: 'Up to date.',
  notesPlaceholder: 'Internal notes, context, editorial choices…',
};
