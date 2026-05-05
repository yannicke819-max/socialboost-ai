'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import { Sparkles, AlertCircle, BookOpen } from 'lucide-react';
import { GoalSelector } from './GoalSelector';
import { BriefForm, type BriefFormState } from './BriefForm';
import { BriefQualityMeter } from './BriefQualityMeter';
import { ResultsView, type Actionables } from './ResultsView';
import { SaveOfferButton } from '@/components/offer-workspace/SaveOfferButton';
import {
  type Goal,
  type Tone,
} from '@/lib/offer-brain-ui/ordering';
import {
  computeBriefQuality,
  type BriefDraft,
} from '@/lib/offer-brain-ui/brief-quality';

const ENDPOINT = '/api/ai/offer-brain';

type ApiSuccess = {
  diagnostic: unknown;
  actionables: Actionables;
  metadata?: unknown;
};

type ApiErrorBody = {
  error?: { code?: string; message?: string; fields?: { path: string; message: string }[] };
};

type UiError =
  | { kind: 'validation'; message: string; fields: { path: string; message: string }[] }
  | { kind: 'feature_disabled' }
  | { kind: 'network'; message: string }
  | { kind: 'server'; message: string };

const INITIAL_STATE: BriefFormState = {
  businessName: '',
  offer: '',
  targetAudience: '',
  tone: 'professional',
  language: 'fr',
  platforms: ['linkedin', 'email'],
  proofPointsText: '',
};

interface OfferBrainStudioProps {
  /**
   * Server-evaluated `OFFER_BRAIN_API_ENABLED` flag. When false, the UI shows
   * a "feature disabled" panel and never attempts a fetch.
   */
  endpointEnabled: boolean;
}

export function OfferBrainStudio({ endpointEnabled }: OfferBrainStudioProps) {
  const [form, setForm] = useState<BriefFormState>(INITIAL_STATE);
  const [goal, setGoal] = useState<Goal>('clarify_offer');
  const [actionables, setActionables] = useState<Actionables | null>(null);
  const [uiError, setUiError] = useState<UiError | null>(null);
  const [isPending, startTransition] = useTransition();
  const abortRef = useRef<AbortController | null>(null);

  const proofPointsArray = useMemo(
    () =>
      form.proofPointsText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
    [form.proofPointsText],
  );

  const draft: BriefDraft = useMemo(
    () => ({
      businessName: form.businessName,
      offer: form.offer,
      targetAudience: form.targetAudience,
      proofPoints: proofPointsArray,
      platforms: form.platforms,
      goal,
    }),
    [form, proofPointsArray, goal],
  );

  const quality = useMemo(
    () => computeBriefQuality(draft, form.language),
    [draft, form.language],
  );

  const submit = (toneOverride?: Tone) => {
    if (!endpointEnabled) {
      setUiError({ kind: 'feature_disabled' });
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const tone = toneOverride ?? form.tone;
    if (toneOverride) {
      // surface the iteration in the form state too
      setForm({ ...form, tone: toneOverride });
    }

    const payload = {
      businessName: form.businessName.trim(),
      offer: form.offer.trim(),
      ...(form.targetAudience.trim() ? { targetAudience: form.targetAudience.trim() } : {}),
      tone,
      language: form.language,
      ...(form.platforms.length > 0 ? { platforms: form.platforms } : {}),
      ...(proofPointsArray.length > 0 ? { proofPoints: proofPointsArray } : {}),
      include_actionables: true,
    };

    setUiError(null);

    startTransition(async () => {
      try {
        const res = await fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: ctrl.signal,
        });

        if (res.status === 404) {
          setUiError({ kind: 'feature_disabled' });
          setActionables(null);
          return;
        }

        const text = await res.text();
        let json: unknown = null;
        try {
          json = JSON.parse(text);
        } catch {
          // non-JSON response, treat as server error
        }

        if (res.status === 400) {
          const e = (json as ApiErrorBody)?.error ?? {};
          setUiError({
            kind: 'validation',
            message: e.message ?? 'Invalid input',
            fields: e.fields ?? [],
          });
          setActionables(null);
          return;
        }
        if (!res.ok) {
          const e = (json as ApiErrorBody)?.error ?? {};
          setUiError({
            kind: 'server',
            message: e.message ?? `Server error (${res.status})`,
          });
          setActionables(null);
          return;
        }

        const ok = json as ApiSuccess;
        if (!ok || !ok.actionables) {
          setUiError({
            kind: 'server',
            message: 'Unexpected response shape — actionables missing.',
          });
          setActionables(null);
          return;
        }
        setActionables(ok.actionables);
      } catch (err) {
        if ((err as DOMException)?.name === 'AbortError') return;
        setUiError({
          kind: 'network',
          message: err instanceof Error ? err.message : 'Network error',
        });
      }
    });
  };

  const language = form.language;

  return (
    <div className="space-y-6">
      <Header language={language} />

      <GoalSelector value={goal} onChange={setGoal} language={language} />

      <BriefQualityMeter quality={quality} language={language} />

      <BriefForm
        state={form}
        onChange={setForm}
        onSubmit={() => submit()}
        loading={isPending}
        quality={quality}
      />

      {!endpointEnabled && (
        <FeatureDisabledNotice language={language} />
      )}

      {uiError && (
        <ErrorPanel error={uiError} language={language} onClear={() => setUiError(null)} />
      )}

      {!actionables && !uiError && !isPending && endpointEnabled && (
        <EmptyState language={language} />
      )}

      {isPending && <LoadingState language={language} />}

      {actionables && (
        <>
          <div className="flex items-center justify-end">
            <SaveOfferButton
              brief={{
                businessName: form.businessName,
                offer: form.offer,
                targetAudience: form.targetAudience.trim() || undefined,
                tone: form.tone,
                language: form.language,
                platforms: form.platforms,
                proofPoints: proofPointsArray,
              }}
              goal={goal}
              actionables={actionables}
              confidenceScore={actionables.confidence_score}
              language={language}
            />
          </div>
          <ResultsView
            actionables={actionables}
            goal={goal}
            language={language}
            currentTone={form.tone}
            onRegenerateWithTone={(t) => submit(t)}
            loading={isPending}
          />
        </>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Sub-components
// -----------------------------------------------------------------------------

function Header({ language }: { language: 'fr' | 'en' }) {
  return (
    <header className="space-y-2">
      <div className="flex items-center gap-2">
        <Sparkles size={14} className="text-brand" />
        <span className="font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
          Offer Brain · v1
        </span>
      </div>
      <h2 className="font-display text-3xl font-semibold italic leading-tight text-fg sm:text-4xl">
        {language === 'en'
          ? 'Turn a raw offer into actionable content.'
          : 'Transformez une offre brute en contenu exploitable.'}
      </h2>
      <p className="max-w-2xl text-sm text-fg-muted">
        {language === 'en'
          ? 'Describe your offer below. The AI returns hooks, angles, objections, CTAs, social posts and a full landing-page outline — anchored to the proofs you provide. No invented metrics.'
          : 'Décrivez votre offre. L\'IA renvoie hooks, angles, objections, CTAs, posts sociaux et une trame de landing page — ancrés sur les preuves que vous fournissez. Aucune métrique inventée.'}
      </p>
    </header>
  );
}

function FeatureDisabledNotice({ language }: { language: 'fr' | 'en' }) {
  return (
    <div className="rounded-md border border-amber-400/40 bg-amber-400/5 p-4">
      <div className="flex items-start gap-3">
        <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-400" />
        <div className="space-y-1.5 text-sm">
          <p className="font-medium text-fg">
            {language === 'en'
              ? 'Offer Brain is not enabled in this environment.'
              : 'Offer Brain n\'est pas activé dans cet environnement.'}
          </p>
          <p className="text-fg-muted">
            {language === 'en'
              ? 'The API at /api/ai/offer-brain returns 404 until the OFFER_BRAIN_API_ENABLED flag is set. The form is shown for layout testing only — submitting will trigger a feature-disabled response.'
              : 'L\'API /api/ai/offer-brain retourne 404 tant que le flag OFFER_BRAIN_API_ENABLED n\'est pas défini. Le formulaire est affiché à titre indicatif — soumettre déclenchera une réponse "feature disabled".'}
          </p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ language }: { language: 'fr' | 'en' }) {
  return (
    <div className="rounded-md border border-dashed border-border bg-bg-elevated/40 p-8 text-center">
      <BookOpen size={20} className="mx-auto mb-3 text-fg-subtle" />
      <p className="font-display text-lg font-semibold text-fg">
        {language === 'en' ? 'Your output will appear here.' : 'Votre sortie apparaîtra ici.'}
      </p>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-fg-muted">
        {language === 'en'
          ? 'Fill the form, hit Generate. The order of sections adapts to the goal you picked above.'
          : 'Remplissez le formulaire et lancez la génération. L\'ordre des sections s\'adapte à l\'objectif que vous avez sélectionné.'}
      </p>
    </div>
  );
}

function LoadingState({ language }: { language: 'fr' | 'en' }) {
  return (
    <div className="rounded-md border border-border bg-bg-elevated p-6">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-brand" />
          <span className="font-mono text-[11px] uppercase tracking-wider text-fg">
            {language === 'en' ? 'Generating actionables…' : 'Génération en cours…'}
          </span>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-3 animate-pulse rounded bg-bg-muted"
              style={{ width: `${100 - i * 12}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ErrorPanel({
  error,
  language,
  onClear,
}: {
  error: UiError;
  language: 'fr' | 'en';
  onClear: () => void;
}) {
  let title = '';
  let body: React.ReactNode = null;
  if (error.kind === 'validation') {
    title = language === 'en' ? 'Some fields need attention' : 'Certains champs doivent être corrigés';
    body =
      error.fields.length > 0 ? (
        <ul className="space-y-1 text-sm">
          {error.fields.map((f, i) => (
            <li key={i}>
              <span className="font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
                {f.path}
              </span>{' '}
              <span className="text-fg-muted">— {humanizeFieldMessage(f.message, language)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-fg-muted">{error.message}</p>
      );
  } else if (error.kind === 'feature_disabled') {
    title = language === 'en' ? 'Offer Brain is currently disabled' : 'Offer Brain est désactivé';
    body = (
      <p className="text-sm text-fg-muted">
        {language === 'en'
          ? 'The API responded with 404. Set OFFER_BRAIN_API_ENABLED=true on this environment to enable it.'
          : 'L\'API a répondu 404. Définissez OFFER_BRAIN_API_ENABLED=true sur cet environnement pour l\'activer.'}
      </p>
    );
  } else if (error.kind === 'network') {
    title = language === 'en' ? 'Network error' : 'Erreur réseau';
    body = <p className="text-sm text-fg-muted">{error.message}</p>;
  } else {
    title = language === 'en' ? 'Server error' : 'Erreur serveur';
    body = <p className="text-sm text-fg-muted">{error.message}</p>;
  }

  return (
    <div className="rounded-md border border-amber-400/40 bg-amber-400/5 p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h4 className="font-display text-sm font-semibold text-fg">{title}</h4>
        <button
          type="button"
          onClick={onClear}
          className="font-mono text-[11px] uppercase tracking-wider text-fg-subtle hover:text-fg"
          aria-label={language === 'en' ? 'Dismiss' : 'Fermer'}
        >
          {language === 'en' ? 'Dismiss' : 'Fermer'}
        </button>
      </div>
      {body}
    </div>
  );
}

function humanizeFieldMessage(msg: string, language: 'fr' | 'en'): string {
  // Keep server messages where possible; just translate the most common Zod ones.
  if (/Required|is required/i.test(msg)) return language === 'en' ? 'required' : 'requis';
  if (/Invalid enum/i.test(msg)) return language === 'en' ? 'invalid value' : 'valeur invalide';
  return msg;
}
