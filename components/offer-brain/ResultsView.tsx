'use client';

import {
  AlertTriangle,
  Anchor,
  Layout,
  Megaphone,
  MessageSquareWarning,
  Quote,
  ShieldCheck,
  Sparkles,
  Target,
  ThumbsDown,
  ThumbsUp,
  Lightbulb,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { CopyButton } from './CopyButton';
import {
  type Goal,
  type SectionId,
  TONE_LABELS,
  type Tone,
  alternativeTones,
  sectionsForGoal,
} from '@/lib/offer-brain-ui/ordering';

// -----------------------------------------------------------------------------
// Types — match the AI-006 actionables shape
// -----------------------------------------------------------------------------

interface Hook {
  type: 'pain' | 'curiosity' | 'identity' | 'contrarian' | 'before_after';
  text: string;
}
interface OfferAngle {
  name: string;
  angle: string;
  best_for: string;
}
interface Objection {
  objection: string;
  response: string;
}
interface CtaVariant {
  label: string;
  intent: 'awareness' | 'consideration' | 'decision';
}
interface SocialPost {
  platform: 'linkedin' | 'instagram' | 'facebook' | 'email' | 'landing_page';
  post: string;
  cta: string;
}
interface LandingSectionItem {
  section: 'hero' | 'problem' | 'solution' | 'proof' | 'cta';
  headline: string;
  body: string;
}

export interface Actionables {
  schema_version: string;
  offer_summary: string;
  target_audience: string;
  pain_points: string[];
  value_proposition: string;
  proof_points: string[];
  objections: Objection[];
  offer_angles: OfferAngle[];
  hooks: Hook[];
  ctas: CtaVariant[];
  social_posts: SocialPost[];
  landing_page_sections: LandingSectionItem[];
  confidence_score: number;
  confidence_rationale: string;
  warnings: string[];
}

interface ResultsViewProps {
  actionables: Actionables;
  goal: Goal;
  language: 'fr' | 'en';
  currentTone: Tone;
  onRegenerateWithTone: (t: Tone) => void;
  loading: boolean;
}

export function ResultsView({
  actionables,
  goal,
  language,
  currentTone,
  onRegenerateWithTone,
  loading,
}: ResultsViewProps) {
  const order = sectionsForGoal(goal);
  return (
    <div className="space-y-5">
      <TrustBar
        score={actionables.confidence_score}
        rationale={actionables.confidence_rationale}
        proofs={actionables.proof_points}
        language={language}
      />
      <ToneIterator
        currentTone={currentTone}
        onRegenerate={onRegenerateWithTone}
        loading={loading}
        language={language}
      />
      {order.map((sid) => (
        <Section key={sid} sid={sid} actionables={actionables} language={language} />
      ))}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Trust bar (confidence + proofs)
// -----------------------------------------------------------------------------

function TrustBar({
  score,
  rationale,
  proofs,
  language,
}: {
  score: number;
  rationale: string;
  proofs: string[];
  language: 'fr' | 'en';
}) {
  const tone =
    score >= 70 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-fg-muted';
  return (
    <div className="rounded-md border border-border bg-bg-elevated p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-fg-muted" />
          <span className="font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
            {language === 'en' ? 'Confidence' : 'Confiance'}
          </span>
          <span className={cn('font-display text-lg font-semibold', tone)}>{score}/100</span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
          {language === 'en' ? 'Mock generation' : 'Génération mock'}
        </span>
      </div>
      <p className="mt-1.5 text-sm text-fg-muted">{rationale}</p>
      {proofs.length > 0 ? (
        <div className="mt-3 rounded border border-border-strong bg-bg p-3">
          <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
            {language === 'en' ? 'Proof anchors used (verbatim)' : 'Preuves utilisées (verbatim)'}
          </p>
          <ul className="space-y-1 text-sm text-fg">
            {proofs.map((p, i) => (
              <li key={i} className="flex items-start gap-2">
                <Anchor size={12} className="mt-1 shrink-0 text-fg-subtle" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-3 rounded border border-amber-400/40 bg-amber-400/5 p-3 text-sm text-fg-muted">
          {language === 'en'
            ? 'No proofs provided — add at least one verifiable proof to lift confidence past 60.'
            : 'Aucune preuve fournie — ajoutez au moins une preuve vérifiable pour dépasser 60 de confiance.'}
        </p>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Tone iterator
// -----------------------------------------------------------------------------

function ToneIterator({
  currentTone,
  onRegenerate,
  loading,
  language,
}: {
  currentTone: Tone;
  onRegenerate: (t: Tone) => void;
  loading: boolean;
  language: 'fr' | 'en';
}) {
  const labelPrefix = language === 'en' ? 'Regenerate as ' : 'Régénérer en ';
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-bg-elevated px-4 py-3">
      <span className="font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
        {language === 'en' ? 'Iterate' : 'Itérer'}
      </span>
      {alternativeTones(currentTone).map((t) => (
        <Button
          key={t}
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onRegenerate(t)}
          disabled={loading}
        >
          {labelPrefix}
          {TONE_LABELS[t][language]}
        </Button>
      ))}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Section dispatcher
// -----------------------------------------------------------------------------

function Section({
  sid,
  actionables: a,
  language,
}: {
  sid: SectionId;
  actionables: Actionables;
  language: 'fr' | 'en';
}) {
  switch (sid) {
    case 'summary':
      return <SummarySection a={a} language={language} />;
    case 'pain_points':
      if (a.pain_points.length === 0) return null;
      return <PainPointsSection items={a.pain_points} language={language} />;
    case 'hooks':
      return <HooksSection items={a.hooks} language={language} />;
    case 'offer_angles':
      return <AnglesSection items={a.offer_angles} language={language} />;
    case 'objections':
      return <ObjectionsSection items={a.objections} language={language} />;
    case 'ctas':
      return <CtasSection items={a.ctas} language={language} />;
    case 'social_posts':
      if (a.social_posts.length === 0) return null;
      return <SocialPostsSection items={a.social_posts} language={language} />;
    case 'landing_page_sections':
      return <LandingSectionsView items={a.landing_page_sections} language={language} />;
    case 'proof_points':
      // already shown in TrustBar — only render here when goal puts it in priority
      return null;
    case 'warnings':
      if (a.warnings.length === 0) return null;
      return <WarningsSection items={a.warnings} language={language} />;
    default:
      return null;
  }
}

// -----------------------------------------------------------------------------
// Section components
// -----------------------------------------------------------------------------

function SectionShell({
  icon: Icon,
  title,
  rightSlot,
  children,
}: {
  icon: LucideIcon;
  title: string;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-border bg-bg-elevated">
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Icon size={14} className="text-fg-subtle" />
          <h3 className="font-mono text-[11px] uppercase tracking-wider text-fg">{title}</h3>
        </div>
        {rightSlot}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

function SummarySection({ a, language }: { a: Actionables; language: 'fr' | 'en' }) {
  return (
    <SectionShell
      icon={Target}
      title={language === 'en' ? 'Summary' : 'Résumé'}
    >
      <dl className="space-y-3 text-sm">
        <Row
          label={language === 'en' ? 'Offer summary' : 'Résumé de l\'offre'}
          value={a.offer_summary}
        />
        <Row
          label={language === 'en' ? 'Target audience' : 'Cible'}
          value={a.target_audience}
        />
        <Row
          label={language === 'en' ? 'Value proposition' : 'Proposition de valeur'}
          value={a.value_proposition}
        />
      </dl>
    </SectionShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="mb-0.5 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
        {label}
      </dt>
      <dd className="text-fg">{value}</dd>
    </div>
  );
}

function PainPointsSection({ items, language }: { items: string[]; language: 'fr' | 'en' }) {
  return (
    <SectionShell
      icon={MessageSquareWarning}
      title={language === 'en' ? 'Pain points' : 'Points de friction'}
    >
      <ul className="space-y-1.5 text-sm">
        {items.map((p, i) => (
          <li key={i} className="flex items-start gap-2 text-fg">
            <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-fg-subtle" />
            {p}
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}

const HOOK_LABELS_FR: Record<Hook['type'], string> = {
  pain: 'Pain',
  curiosity: 'Curiosité',
  identity: 'Identité',
  contrarian: 'Contrarian',
  before_after: 'Avant / Après',
};
const HOOK_LABELS_EN: Record<Hook['type'], string> = {
  pain: 'Pain',
  curiosity: 'Curiosity',
  identity: 'Identity',
  contrarian: 'Contrarian',
  before_after: 'Before / After',
};

function HooksSection({ items, language }: { items: Hook[]; language: 'fr' | 'en' }) {
  const labels = language === 'en' ? HOOK_LABELS_EN : HOOK_LABELS_FR;
  return (
    <SectionShell icon={Sparkles} title={language === 'en' ? 'Hooks' : 'Accroches'}>
      <div className="grid gap-2 md:grid-cols-2">
        {items.map((h, i) => (
          <div
            key={i}
            className="rounded-md border border-border bg-bg p-3"
          >
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                {labels[h.type]}
              </span>
              <CopyButton text={h.text} label={language === 'en' ? 'Copy' : 'Copier'} />
            </div>
            <p className="text-sm text-fg">{h.text}</p>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

function AnglesSection({ items, language }: { items: OfferAngle[]; language: 'fr' | 'en' }) {
  return (
    <SectionShell icon={Lightbulb} title={language === 'en' ? 'Sales angles' : 'Angles de vente'}>
      <div className="space-y-3">
        {items.map((angle, i) => (
          <div key={i} className="rounded-md border border-border bg-bg p-3">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="font-display text-sm font-semibold text-fg">{angle.name}</span>
              <CopyButton
                text={`${angle.name}\n\n${angle.angle}\n\n${language === 'en' ? 'Best for' : 'Pour'} ${angle.best_for}`}
                label={language === 'en' ? 'Copy' : 'Copier'}
              />
            </div>
            <p className="text-sm text-fg-muted">{angle.angle}</p>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
              {language === 'en' ? `Best for · ${angle.best_for}` : `Pour · ${angle.best_for}`}
            </p>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

function ObjectionsSection({ items, language }: { items: Objection[]; language: 'fr' | 'en' }) {
  return (
    <SectionShell
      icon={Quote}
      title={language === 'en' ? 'Objections + responses' : 'Objections + réponses'}
    >
      <div className="space-y-2.5">
        {items.map((o, i) => (
          <div key={i} className="rounded-md border border-border bg-bg p-3">
            <div className="mb-1.5 flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-fg">« {o.objection} »</p>
              <CopyButton
                text={`Objection: ${o.objection}\nRéponse: ${o.response}`}
                label={language === 'en' ? 'Copy' : 'Copier'}
              />
            </div>
            <p className="text-sm text-fg-muted">{o.response}</p>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

function CtasSection({ items, language }: { items: CtaVariant[]; language: 'fr' | 'en' }) {
  const intentLabel = (intent: CtaVariant['intent']): string => {
    if (language === 'en') {
      return intent === 'awareness' ? 'Low friction' : intent === 'consideration' ? 'Mid' : 'Decision';
    }
    return intent === 'awareness' ? 'Faible friction' : intent === 'consideration' ? 'Mid' : 'Décision';
  };
  return (
    <SectionShell icon={Megaphone} title={language === 'en' ? 'Calls to action' : 'Appels à l\'action'}>
      <div className="grid gap-2 md:grid-cols-3">
        {items.map((c, i) => (
          <div key={i} className="rounded-md border border-border bg-bg p-3">
            <div className="mb-1.5 flex items-start justify-between gap-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                {intentLabel(c.intent)}
              </span>
              <CopyButton text={c.label} label={language === 'en' ? 'Copy' : 'Copier'} />
            </div>
            <p className="text-sm font-medium text-fg">{c.label}</p>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

function SocialPostsSection({
  items,
  language,
}: {
  items: SocialPost[];
  language: 'fr' | 'en';
}) {
  return (
    <SectionShell icon={Megaphone} title={language === 'en' ? 'Social posts' : 'Posts sociaux'}>
      <div className="space-y-3">
        {items.map((p, i) => (
          <div key={i} className="rounded-md border border-border bg-bg p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-fg">
                {p.platform}
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                  CTA · {p.cta}
                </span>
                <CopyButton text={p.post} label={language === 'en' ? 'Copy post' : 'Copier'} />
              </div>
            </div>
            <pre className="whitespace-pre-wrap break-words font-sans text-sm text-fg">
              {p.post}
            </pre>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

function LandingSectionsView({
  items,
  language,
}: {
  items: LandingSectionItem[];
  language: 'fr' | 'en';
}) {
  const allText = items.map((s) => `# ${s.headline}\n\n${s.body}`).join('\n\n---\n\n');
  return (
    <SectionShell
      icon={Layout}
      title={language === 'en' ? 'Landing page' : 'Page d\'atterrissage'}
      rightSlot={
        <CopyButton text={allText} label={language === 'en' ? 'Copy all' : 'Tout copier'} />
      }
    >
      <div className="space-y-3">
        {items.map((s) => (
          <div key={s.section} className="rounded-md border border-border bg-bg p-3">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                {s.section}
              </span>
              <CopyButton
                text={`${s.headline}\n\n${s.body}`}
                label={language === 'en' ? 'Copy' : 'Copier'}
              />
            </div>
            <h4 className="font-display text-base font-semibold text-fg">{s.headline}</h4>
            <p className="mt-1 text-sm text-fg-muted">{s.body}</p>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

function WarningsSection({ items, language }: { items: string[]; language: 'fr' | 'en' }) {
  const [feedback, setFeedback] = useState<Record<number, 'up' | 'down' | undefined>>({});
  return (
    <SectionShell
      icon={AlertTriangle}
      title={language === 'en' ? 'Warnings' : 'Avertissements'}
    >
      <ul className="space-y-2 text-sm">
        {items.map((w, i) => (
          <li
            key={i}
            className="flex items-start justify-between gap-3 rounded border border-amber-400/40 bg-amber-400/5 p-2.5"
          >
            <span className="text-fg">{w}</span>
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                aria-label="Useful"
                onClick={() => setFeedback({ ...feedback, [i]: 'up' })}
                className={cn(
                  'rounded border border-border p-1 transition hover:border-border-strong',
                  feedback[i] === 'up' && 'border-emerald-400 text-emerald-400',
                )}
              >
                <ThumbsUp size={12} />
              </button>
              <button
                type="button"
                aria-label="Not useful"
                onClick={() => setFeedback({ ...feedback, [i]: 'down' })}
                className={cn(
                  'rounded border border-border p-1 transition hover:border-border-strong',
                  feedback[i] === 'down' && 'border-amber-400 text-amber-400',
                )}
              >
                <ThumbsDown size={12} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}
