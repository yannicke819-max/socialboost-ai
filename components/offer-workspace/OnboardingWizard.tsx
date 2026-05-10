'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkspaceStore } from './useWorkspaceStore';
import {
  EMPTY_DRAFT,
  MATURITY_LABELS,
  MATURITY_LEVELS,
  NOVA_STUDIO_EXAMPLE,
  OFFER_TYPE_LABELS,
  OFFER_TYPES,
  ONBOARDING_TONE_LABELS,
  ONBOARDING_TONES,
  draftFromOffer,
  runOnboarding,
  validateStep,
  type OnboardingDraft,
  type OnboardingErrorCode,
} from '@/lib/offer-workspace/onboarding';

interface OnboardingWizardProps {
  language?: 'fr' | 'en';
}

type Step = 1 | 2 | 3 | 4;

export function OnboardingWizard({ language = 'fr' }: OnboardingWizardProps) {
  const labels = language === 'en' ? L_EN : L_FR;
  const router = useRouter();
  const params = useSearchParams();
  const { hydrated, offers, store, refresh } = useWorkspaceStore();

  // The wizard can be entered in three modes:
  //  - first run: no offers exist yet → straight to step 1.
  //  - new offer: explicit `?mode=new` query.
  //  - improve existing: explicit `?improve=<offerId>` query — pre-fills the form.
  const improveOfferId = params.get('improve') ?? undefined;
  const explicitMode = params.get('mode'); // 'new' | null

  const [draft, setDraft] = useState<OnboardingDraft>(() => {
    if (improveOfferId && hydrated) {
      const o = offers.find((x) => x.id === improveOfferId);
      if (o) return draftFromOffer(o);
    }
    return { ...EMPTY_DRAFT, language };
  });
  const [step, setStep] = useState<Step>(1);
  const [errors, setErrors] = useState<OnboardingErrorCode[]>([]);
  const [busy, setBusy] = useState(false);

  // Show the intro chooser when offers already exist and the user did not
  // explicitly ask for new/improve via query.
  const showIntro = hydrated && offers.length > 0 && !improveOfferId && explicitMode !== 'new';

  const setField = <K extends keyof OnboardingDraft>(key: K, value: OnboardingDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  const handlePrefillNova = () => {
    setDraft({ ...NOVA_STUDIO_EXAMPLE });
    setErrors([]);
  };

  const handleNext = () => {
    const stepErrors = validateStep(draft, step);
    if (stepErrors.length > 0) {
      setErrors(stepErrors);
      return;
    }
    setErrors([]);
    if (step < 4) setStep((s) => (s + 1) as Step);
  };

  const handleBack = () => {
    setErrors([]);
    if (step > 1) setStep((s) => (s - 1) as Step);
  };

  const handleSubmit = () => {
    const stepErrors = validateStep(draft, 4);
    if (stepErrors.length > 0) {
      setErrors(stepErrors);
      return;
    }
    setBusy(true);
    try {
      const result = runOnboarding(store, draft, { improveOfferId });
      refresh();
      router.push(`/ai/offers/${result.offer.id}?tab=adstudio`);
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = () => {
    router.push('/ai/offers');
  };

  // -----------------------------------------------------------------------
  // Hydration guard
  // -----------------------------------------------------------------------

  if (!hydrated) {
    return <div className="h-40 animate-pulse rounded-md bg-bg-elevated/60" />;
  }

  // -----------------------------------------------------------------------
  // Intro: choose between "new offer" and "improve existing offer"
  // -----------------------------------------------------------------------
  if (showIntro) {
    return (
      <div className="space-y-5">
        <header>
          <p className="font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
            {labels.eyebrow}
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold italic leading-tight text-fg sm:text-3xl">
            {labels.introTitle}
          </h1>
          <p className="mt-1 max-w-xl text-sm text-fg-muted">{labels.introBody}</p>
        </header>

        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/ai/onboarding?mode=new"
            className="rounded-md border border-brand/40 bg-brand/5 p-4 transition hover:border-brand"
          >
            <Sparkles size={16} className="text-brand" />
            <p className="mt-2 font-display text-base font-semibold text-fg">{labels.choiceNew}</p>
            <p className="mt-1 text-[12px] text-fg-muted">{labels.choiceNewBody}</p>
          </Link>
          <details className="rounded-md border border-border bg-bg-elevated p-4">
            <summary className="cursor-pointer">
              <Wand2 size={16} className="inline text-fg-subtle" />
              <span className="ml-2 font-display text-base font-semibold text-fg">
                {labels.choiceImprove}
              </span>
              <p className="mt-1 text-[12px] text-fg-muted">{labels.choiceImproveBody}</p>
            </summary>
            <ul className="mt-3 space-y-1.5">
              {offers.slice(0, 6).map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/ai/onboarding?improve=${o.id}`}
                    className="inline-flex w-full items-center justify-between rounded border border-border bg-bg px-2 py-1.5 text-sm text-fg-muted hover:border-border-strong hover:text-fg"
                  >
                    <span className="truncate">{o.name}</span>
                    <ArrowRight size={11} />
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        </div>
        <button
          type="button"
          onClick={handleCancel}
          className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-fg-subtle hover:text-fg"
        >
          <ArrowLeft size={12} /> {labels.backToOffers}
        </button>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Wizard steps
  // -----------------------------------------------------------------------
  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-wider text-brand">
            {labels.eyebrow}
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold italic leading-tight text-fg sm:text-3xl">
            {improveOfferId ? labels.improveTitle : labels.title}
          </h1>
          <p className="mt-1 max-w-xl text-sm text-fg-muted">{labels.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={handleCancel}
          aria-label={labels.cancel}
          title={labels.cancel}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-bg text-fg-subtle hover:border-border-strong hover:text-fg"
        >
          <X size={14} />
        </button>
      </header>

      <ProgressBar step={step} language={language} />

      <button
        type="button"
        onClick={handlePrefillNova}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-elevated px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-fg-muted transition hover:border-border-strong hover:text-fg"
      >
        <Sparkles size={12} /> {labels.useExample}
      </button>

      <section className="rounded-md border border-border bg-bg-elevated p-4 sm:p-5">
        {step === 1 && (
          <Step1
            draft={draft}
            setField={setField}
            errors={errors}
            language={language}
          />
        )}
        {step === 2 && (
          <Step2
            draft={draft}
            setField={setField}
            errors={errors}
            language={language}
          />
        )}
        {step === 3 && (
          <Step3
            draft={draft}
            setField={setField}
            errors={errors}
            language={language}
          />
        )}
        {step === 4 && (
          <Step4
            draft={draft}
            setField={setField}
            errors={errors}
            language={language}
          />
        )}
      </section>

      <p className="rounded border border-amber-400/30 bg-amber-400/5 px-3 py-2 text-[11px] text-amber-400">
        {labels.mockBanner}
      </p>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleBack}
          disabled={step === 1}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md border border-border bg-bg px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-fg-muted transition focus-visible:ring-2 focus-visible:ring-brand',
            step === 1 ? 'cursor-not-allowed opacity-40' : 'hover:border-border-strong hover:text-fg',
          )}
        >
          <ArrowLeft size={12} /> {labels.back}
        </button>
        {step < 4 ? (
          <button
            type="button"
            onClick={handleNext}
            className="inline-flex items-center gap-1.5 rounded-md border border-brand/60 bg-brand/15 px-4 py-1.5 font-mono text-[11px] uppercase tracking-wider text-fg transition hover:border-brand hover:bg-brand/25 focus-visible:ring-2 focus-visible:ring-brand"
          >
            {labels.continue} <ArrowRight size={12} />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={busy}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md border border-emerald-400/60 bg-emerald-400/15 px-4 py-1.5 font-mono text-[11px] uppercase tracking-wider text-emerald-300 transition hover:border-emerald-400 hover:bg-emerald-400/25 focus-visible:ring-2 focus-visible:ring-brand',
              busy && 'opacity-60',
            )}
          >
            <Check size={12} /> {busy ? labels.busy : labels.finalCta}
          </button>
        )}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Sub-components
// -----------------------------------------------------------------------------

function ProgressBar({ step, language }: { step: Step; language: 'fr' | 'en' }) {
  const labels = language === 'en' ? L_EN : L_FR;
  const pct = (step / 4) * 100;
  return (
    <div>
      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
        <span>
          {labels.stepLabel} {step} / 4
        </span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div className="mt-1 h-1.5 w-full rounded-full bg-bg-elevated">
        <div
          className="h-1.5 rounded-full bg-brand transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

interface StepProps {
  draft: OnboardingDraft;
  setField: <K extends keyof OnboardingDraft>(key: K, value: OnboardingDraft[K]) => void;
  errors: OnboardingErrorCode[];
  language: 'fr' | 'en';
}

function Step1({ draft, setField, errors, language }: StepProps) {
  const labels = language === 'en' ? L_EN : L_FR;
  return (
    <div className="space-y-4">
      <StepHeader title={labels.s1Title} hint={labels.s1Hint} />
      <Field
        id="offerName"
        label={labels.s1Name}
        value={draft.offerName}
        onChange={(v) => setField('offerName', v)}
        placeholder="Nova Studio"
        error={errors.includes('name_required') ? labels.errName : undefined}
      />
      <PillGroup
        label={labels.s1Type}
        value={draft.offerType}
        onChange={(v) => setField('offerType', v as OnboardingDraft['offerType'])}
        options={OFFER_TYPES.map((t) => ({ value: t, label: OFFER_TYPE_LABELS[t][language] }))}
      />
      <Textarea
        id="oneLiner"
        label={labels.s1OneLiner}
        value={draft.oneLiner}
        onChange={(v) => setField('oneLiner', v)}
        placeholder={labels.s1OneLinerPh}
        error={errors.includes('one_liner_required') ? labels.errOneLiner : undefined}
        rows={3}
      />
    </div>
  );
}

function Step2({ draft, setField, errors, language }: StepProps) {
  const labels = language === 'en' ? L_EN : L_FR;
  return (
    <div className="space-y-4">
      <StepHeader title={labels.s2Title} hint={labels.s2Hint} />
      <Textarea
        id="audience"
        label={labels.s2Audience}
        value={draft.audience}
        onChange={(v) => setField('audience', v)}
        placeholder={labels.s2AudiencePh}
        error={errors.includes('audience_required') ? labels.errAudience : undefined}
        rows={2}
      />
      <Textarea
        id="problem"
        label={labels.s2Problem}
        value={draft.problem}
        onChange={(v) => setField('problem', v)}
        placeholder={labels.s2ProblemPh}
        error={errors.includes('problem_required') ? labels.errProblem : undefined}
        rows={2}
      />
      <PillGroup
        label={labels.s2Maturity}
        value={draft.maturity}
        onChange={(v) => setField('maturity', v as OnboardingDraft['maturity'])}
        options={MATURITY_LEVELS.map((m) => ({ value: m, label: MATURITY_LABELS[m][language] }))}
      />
    </div>
  );
}

function Step3({ draft, setField, errors, language }: StepProps) {
  const labels = language === 'en' ? L_EN : L_FR;
  return (
    <div className="space-y-4">
      <StepHeader title={labels.s3Title} hint={labels.s3Hint} />
      <Textarea
        id="proof"
        label={labels.s3Proof}
        value={draft.proof}
        onChange={(v) => setField('proof', v)}
        placeholder={labels.s3ProofPh}
        rows={2}
      />
      <Textarea
        id="benefit"
        label={labels.s3Benefit}
        value={draft.benefit}
        onChange={(v) => setField('benefit', v)}
        placeholder={labels.s3BenefitPh}
        rows={2}
      />
      {errors.includes('proof_or_benefit_required') && (
        <ErrorLine text={labels.errProofOrBenefit} />
      )}
      <Textarea
        id="objection"
        label={labels.s3Objection}
        value={draft.objection}
        onChange={(v) => setField('objection', v)}
        placeholder={labels.s3ObjectionPh}
        rows={2}
      />
    </div>
  );
}

function Step4({ draft, setField, errors, language }: StepProps) {
  const labels = language === 'en' ? L_EN : L_FR;
  return (
    <div className="space-y-4">
      <StepHeader title={labels.s4Title} hint={labels.s4Hint} />
      <Field
        id="cta"
        label={labels.s4Cta}
        value={draft.cta}
        onChange={(v) => setField('cta', v)}
        placeholder={labels.s4CtaPh}
        error={errors.includes('cta_required') ? labels.errCta : undefined}
      />
      <PillGroup
        label={labels.s4Tone}
        value={draft.tone}
        onChange={(v) => setField('tone', v as OnboardingDraft['tone'])}
        options={ONBOARDING_TONES.map((t) => ({
          value: t,
          label: ONBOARDING_TONE_LABELS[t][language],
        }))}
      />
      <PillGroup
        label={labels.s4Language}
        value={draft.language}
        onChange={(v) => setField('language', v as OnboardingDraft['language'])}
        options={[
          { value: 'fr', label: 'Français' },
          { value: 'en', label: 'English' },
        ]}
      />
      {errors.includes('language_required') && <ErrorLine text={labels.errLanguage} />}
    </div>
  );
}

function StepHeader({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="space-y-1">
      <h2 className="font-display text-lg font-semibold text-fg">{title}</h2>
      <p className="text-[12px] text-fg-muted">{hint}</p>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full rounded-md border bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-brand',
          error ? 'border-amber-400/60' : 'border-border',
        )}
      />
      {error && <ErrorLine text={error} />}
    </div>
  );
}

function Textarea({
  id,
  label,
  value,
  onChange,
  placeholder,
  rows,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  error?: string;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows ?? 3}
        className={cn(
          'w-full rounded-md border bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-brand',
          error ? 'border-amber-400/60' : 'border-border',
        )}
      />
      {error && <ErrorLine text={error} />}
    </div>
  );
}

function PillGroup<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="space-y-1">
      <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              aria-pressed={active}
              className={cn(
                'rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-wider transition focus-visible:ring-2 focus-visible:ring-brand',
                active
                  ? 'border-brand bg-brand/10 text-fg'
                  : 'border-border bg-bg text-fg-muted hover:border-border-strong',
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ErrorLine({ text }: { text: string }) {
  return (
    <p className="inline-flex items-center gap-1 text-[12px] text-amber-400">
      <AlertTriangle size={11} /> {text}
    </p>
  );
}

// -----------------------------------------------------------------------------
// Microcopy
// -----------------------------------------------------------------------------

const L_FR = {
  eyebrow: 'Onboarding',
  title: 'Crée ta première annonce',
  improveTitle: 'Améliore ton offre existante',
  subtitle:
    "On va générer tes premières annonces à partir de ces réponses. Aucune publication réelle.",
  introTitle: 'Crée ta première annonce',
  introBody: "Tu as déjà une offre. On peut en créer une nouvelle ou améliorer une existante.",
  choiceNew: 'Créer une nouvelle annonce',
  choiceNewBody: 'Démarre depuis zéro avec un nouveau brief.',
  choiceImprove: 'Améliorer une offre existante',
  choiceImproveBody: 'Reprends une offre déjà saisie et régénère ses annonces.',
  backToOffers: 'Retour aux offres',
  useExample: "Utiliser l'exemple Nova Studio",
  mockBanner:
    "Mock V1 : aucune annonce n'est publiée. Ces prévisualisations servent à préparer la diffusion.",
  stepLabel: 'Étape',
  back: 'Retour',
  continue: 'Continuer',
  finalCta: 'Voir mes annonces',
  busy: 'Génération…',
  cancel: 'Annuler',

  s1Title: 'Ce que tu vends',
  s1Hint: "Donne un nom et explique en une phrase ce que tu vends.",
  s1Name: "Nom de l'offre",
  s1Type: 'Type',
  s1OneLiner: "J'aide qui à obtenir quoi ?",
  s1OneLinerPh:
    "J'aide les indépendants B2B à clarifier leur offre et à publier une page de vente simple en 4 semaines.",

  s2Title: 'Pour qui',
  s2Hint: "Décris l'audience et son problème principal.",
  s2Audience: 'Audience cible',
  s2AudiencePh: 'indépendants B2B qui vendent des services',
  s2Problem: 'Problème principal',
  s2ProblemPh: "Leur offre n'est pas claire, ils perdent des prospects.",
  s2Maturity: 'Niveau de maturité',

  s3Title: 'Pourquoi croire',
  s3Hint:
    "Donne au moins une preuve OU un bénéfice principal. L'objection est facultative mais utile.",
  s3Proof: 'Preuve ou crédibilité',
  s3ProofPh: 'Méthode testée sur 12 offres de consultants',
  s3Benefit: 'Bénéfice principal',
  s3BenefitPh: 'Une seule offre claire et une page de vente prête en 4 semaines.',
  s3Objection: 'Objection fréquente',
  s3ObjectionPh: "Je n'ai pas le temps de refaire toute mon offre.",

  s4Title: 'Action attendue',
  s4Hint: 'Choisis le CTA principal, le ton et la langue.',
  s4Cta: 'CTA principal',
  s4CtaPh: 'Réserver un appel de cadrage de 20 minutes',
  s4Tone: 'Ton souhaité',
  s4Language: 'Langue de tes annonces',

  errName: 'Ajoute un nom court.',
  errOneLiner: 'Ajoute au moins une phrase.',
  errAudience: "Ajoute une audience cible (au moins quelques mots).",
  errProblem: 'Ajoute le problème principal.',
  errProofOrBenefit: 'Ajoute au moins une preuve OU un bénéfice principal.',
  errCta: 'Ajoute un CTA.',
  errLanguage: 'Choisis une langue.',
};

const L_EN: typeof L_FR = {
  eyebrow: 'Onboarding',
  title: 'Create your first ad',
  improveTitle: 'Improve your existing offer',
  subtitle: 'We will generate your first ads from these answers. No real publishing.',
  introTitle: 'Create your first ad',
  introBody: 'You already have an offer. You can create a new one or improve an existing one.',
  choiceNew: 'Create a new ad',
  choiceNewBody: 'Start fresh with a new brief.',
  choiceImprove: 'Improve an existing offer',
  choiceImproveBody: 'Pick an existing offer and regenerate its ads.',
  backToOffers: 'Back to offers',
  useExample: 'Use the Nova Studio example',
  mockBanner: 'Mock V1: nothing is published. These previews help you prepare the diffusion.',
  stepLabel: 'Step',
  back: 'Back',
  continue: 'Continue',
  finalCta: 'See my ads',
  busy: 'Generating…',
  cancel: 'Cancel',

  s1Title: 'What you sell',
  s1Hint: 'Give it a name and describe what you sell in one sentence.',
  s1Name: 'Offer name',
  s1Type: 'Type',
  s1OneLiner: 'I help who get what?',
  s1OneLinerPh:
    'I help B2B consultants articulate their offer and ship a simple sales page in 4 weeks.',

  s2Title: 'For whom',
  s2Hint: 'Describe the audience and their main problem.',
  s2Audience: 'Target audience',
  s2AudiencePh: 'B2B consultants who sell services',
  s2Problem: 'Main problem',
  s2ProblemPh: 'Their offer is unclear, they lose prospects.',
  s2Maturity: 'Maturity level',

  s3Title: 'Why believe',
  s3Hint: 'Give at least one proof OR one main benefit. The objection is optional but useful.',
  s3Proof: 'Proof or credibility',
  s3ProofPh: 'Tested with 12 consultant offers',
  s3Benefit: 'Main benefit',
  s3BenefitPh: 'One clear offer and a sales page ready in 4 weeks.',
  s3Objection: 'Frequent objection',
  s3ObjectionPh: "I don't have time to redo my whole offer.",

  s4Title: 'Expected action',
  s4Hint: 'Pick the main CTA, the tone and the language.',
  s4Cta: 'Main CTA',
  s4CtaPh: 'Book a 20-minute scoping call',
  s4Tone: 'Desired tone',
  s4Language: 'Language of your ads',

  errName: 'Add a short name.',
  errOneLiner: 'Add at least one sentence.',
  errAudience: 'Add a target audience (at least a few words).',
  errProblem: 'Add the main problem.',
  errProofOrBenefit: 'Add at least one proof OR one main benefit.',
  errCta: 'Add a CTA.',
  errLanguage: 'Choose a language.',
};
