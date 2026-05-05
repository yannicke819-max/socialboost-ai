'use client';

import { useId } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import type { Tone } from '@/lib/offer-brain-ui/ordering';
import type { BriefQuality } from '@/lib/offer-brain-ui/brief-quality';

export interface BriefFormState {
  businessName: string;
  offer: string;
  targetAudience: string;
  tone: Tone;
  language: 'fr' | 'en';
  platforms: string[];
  proofPointsText: string; // textarea source — newline-separated
}

const PLATFORM_OPTIONS: { id: string; label: string }[] = [
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'email', label: 'Email' },
  { id: 'landing_page', label: 'Landing page' },
];

const TONE_OPTIONS: { id: Tone; label_fr: string; label_en: string }[] = [
  { id: 'professional', label_fr: 'Professionnel', label_en: 'Professional' },
  { id: 'bold', label_fr: 'Audacieux', label_en: 'Bold' },
  { id: 'friendly', label_fr: 'Amical', label_en: 'Friendly' },
  { id: 'premium', label_fr: 'Premium', label_en: 'Premium' },
];

interface BriefFormProps {
  state: BriefFormState;
  onChange: (next: BriefFormState) => void;
  onSubmit: () => void;
  loading: boolean;
  quality: BriefQuality;
}

export function BriefForm({ state, onChange, onSubmit, loading, quality }: BriefFormProps) {
  const labels = state.language === 'en' ? L_EN : L_FR;
  const id = useId();
  const togglePlatform = (p: string) => {
    const has = state.platforms.includes(p);
    onChange({
      ...state,
      platforms: has ? state.platforms.filter((x) => x !== p) : [...state.platforms, p],
    });
  };

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (loading || !quality.readyToGenerate) return;
        onSubmit();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={labels.businessName} required htmlFor={`${id}-business`}>
          <input
            id={`${id}-business`}
            type="text"
            value={state.businessName}
            onChange={(e) => onChange({ ...state, businessName: e.target.value })}
            className={inputClass}
            placeholder={labels.businessNamePlaceholder}
            required
          />
        </Field>
        <Field label={labels.targetAudience} htmlFor={`${id}-audience`}>
          <input
            id={`${id}-audience`}
            type="text"
            value={state.targetAudience}
            onChange={(e) => onChange({ ...state, targetAudience: e.target.value })}
            className={inputClass}
            placeholder={labels.targetAudiencePlaceholder}
          />
        </Field>
      </div>

      <Field label={labels.offer} required htmlFor={`${id}-offer`}>
        <textarea
          id={`${id}-offer`}
          value={state.offer}
          onChange={(e) => onChange({ ...state, offer: e.target.value })}
          rows={5}
          className={cn(inputClass, 'min-h-[120px] resize-y')}
          placeholder={labels.offerPlaceholder}
          required
        />
      </Field>

      <Field label={labels.proofPoints} htmlFor={`${id}-proofs`}>
        <textarea
          id={`${id}-proofs`}
          value={state.proofPointsText}
          onChange={(e) => onChange({ ...state, proofPointsText: e.target.value })}
          rows={3}
          className={cn(inputClass, 'min-h-[80px] resize-y')}
          placeholder={labels.proofPointsPlaceholder}
        />
        <p className="mt-1 text-[11px] text-fg-subtle">{labels.proofPointsHelp}</p>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={labels.tone} htmlFor={`${id}-tone`}>
          <select
            id={`${id}-tone`}
            value={state.tone}
            onChange={(e) => onChange({ ...state, tone: e.target.value as Tone })}
            className={inputClass}
          >
            {TONE_OPTIONS.map((t) => (
              <option key={t.id} value={t.id}>
                {state.language === 'en' ? t.label_en : t.label_fr}
              </option>
            ))}
          </select>
        </Field>
        <Field label={labels.language} htmlFor={`${id}-lang`}>
          <select
            id={`${id}-lang`}
            value={state.language}
            onChange={(e) =>
              onChange({ ...state, language: e.target.value as 'fr' | 'en' })
            }
            className={inputClass}
          >
            <option value="fr">Français</option>
            <option value="en">English</option>
          </select>
        </Field>
      </div>

      <Field label={labels.platforms}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {PLATFORM_OPTIONS.map((p) => {
            const active = state.platforms.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => togglePlatform(p.id)}
                className={cn(
                  'rounded-md border px-3 py-2 text-sm transition',
                  active
                    ? 'border-brand bg-brand/10 font-medium text-fg'
                    : 'border-border bg-bg-elevated text-fg-muted hover:border-border-strong hover:text-fg',
                )}
                aria-pressed={active}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </Field>

      <div className="flex items-center justify-between gap-3 pt-2">
        <p className="text-xs text-fg-muted">{labels.disclaimer}</p>
        <Button
          type="submit"
          variant="brand"
          size="md"
          disabled={loading || !quality.readyToGenerate}
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin" /> {labels.generating}
            </>
          ) : (
            <>
              <Sparkles size={14} /> {labels.generate}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

const inputClass =
  'w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg';

interface FieldProps {
  label: string;
  required?: boolean;
  htmlFor?: string;
  children: React.ReactNode;
}
function Field({ label, required, htmlFor, children }: FieldProps) {
  return (
    <label htmlFor={htmlFor} className="block">
      <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
        {label}
        {required && <span className="ml-1 text-amber-400" aria-hidden>*</span>}
      </span>
      {children}
    </label>
  );
}

const L_FR = {
  businessName: 'Nom de votre marque',
  businessNamePlaceholder: 'Atelier Nova',
  targetAudience: 'Cible (optionnel)',
  targetAudiencePlaceholder: 'Indépendants B2B qui vendent des services',
  offer: 'Décrivez votre offre',
  offerPlaceholder: 'Accompagnement de 4 semaines pour clarifier l\'offre et créer une page de vente simple…',
  proofPoints: 'Preuves (optionnel)',
  proofPointsPlaceholder: 'Une preuve par ligne — ex. "Méthode testée sur 12 offres de consultants"',
  proofPointsHelp: 'Toute preuve sera reprise textuellement. Aucune métrique inventée.',
  tone: 'Ton',
  language: 'Langue',
  platforms: 'Plateformes ciblées',
  generate: 'Générer',
  generating: 'Génération…',
  disclaimer: 'Mock déterministe par défaut. Aucune publication réelle.',
};
const L_EN = {
  businessName: 'Brand name',
  businessNamePlaceholder: 'Atelier Nova',
  targetAudience: 'Target audience (optional)',
  targetAudiencePlaceholder: 'B2B solo consultants who sell services',
  offer: 'Describe your offer',
  offerPlaceholder: '4-week program to help consultants articulate their offer and ship a simple sales page…',
  proofPoints: 'Proof points (optional)',
  proofPointsPlaceholder: 'One proof per line — e.g. "Tested on 12 consultant offers"',
  proofPointsHelp: 'Proofs are reused verbatim. No invented metrics.',
  tone: 'Tone',
  language: 'Language',
  platforms: 'Target platforms',
  generate: 'Generate',
  generating: 'Generating…',
  disclaimer: 'Deterministic mock by default. No real publishing.',
};
