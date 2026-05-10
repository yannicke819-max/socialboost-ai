'use client';

import { useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Sparkles,
  Trash2,
  Layers,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  EDITORIAL_PILLAR_LABELS,
  PLAN_SLOT_STATUS_LABELS,
  WEEKLY_PLAN_GOAL_LABELS,
  WEEKLY_PLAN_GOALS,
  type Asset,
  type Offer,
  type PlanSlot,
  type PlanSlotStatus,
  type WeeklyPlan,
  type WeeklyPlanGoal,
} from '@/lib/offer-workspace/types';
import type { WorkspaceStore } from '@/lib/offer-workspace/store';
import { generateWeeklyPlan, planToText } from '@/lib/offer-workspace/plan-generator';

interface WeeklyPlanTabProps {
  offer: Offer;
  assets: Asset[];
  language: 'fr' | 'en';
  store: WorkspaceStore;
  onUpdate: () => void;
  onNavigateTab?: (tab: 'brief' | 'assets' | 'calendar' | 'analytics' | 'recos' | 'plan') => void;
}

const DAY_LABELS_FR = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const DAY_LABELS_EN = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function WeeklyPlanTab({
  offer,
  assets,
  language,
  store,
  onUpdate,
  onNavigateTab,
}: WeeklyPlanTabProps) {
  const labels = language === 'en' ? L_EN : L_FR;
  const dayLabels = language === 'en' ? DAY_LABELS_EN : DAY_LABELS_FR;
  const plan = store.getWeeklyPlanByOffer(offer.id);
  const approvedCount = useMemo(
    () => assets.filter((a) => a.status === 'approved').length,
    [assets],
  );

  const [goal, setGoal] = useState<WeeklyPlanGoal>(plan?.goal ?? 'visibility');
  const [notice, setNotice] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 1800);
  };

  const handleGenerate = () => {
    const draft = generateWeeklyPlan({
      offer,
      assets,
      goal,
      planSeed: plan ? Date.now() & 0xffff : 0,
    });
    store.upsertWeeklyPlan({
      offerId: offer.id,
      weekStart: draft.weekStart,
      goal: draft.goal,
      slots: draft.slots,
    });
    onUpdate();
    showNotice(plan ? labels.regenerated : labels.created);
  };

  const handleCopy = async () => {
    if (!plan) return;
    const text = planToText(plan, language);
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
      showNotice(labels.copied);
    } catch {
      // best-effort
    }
  };

  // -------------------------------------------------------------------------
  // Empty: no approved assets at all
  // -------------------------------------------------------------------------

  if (approvedCount === 0 && !plan) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-dashed border-border bg-bg-elevated/40 p-8 text-center">
          <Layers size={22} className="mx-auto mb-3 text-fg-subtle" />
          <h2 className="font-display text-xl font-semibold text-fg">{labels.emptyTitle}</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-fg-muted">{labels.emptyBody}</p>
          <button
            type="button"
            onClick={() => onNavigateTab?.('assets')}
            className="mt-5 inline-flex items-center gap-1.5 rounded-md border border-brand/40 bg-brand/5 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-fg transition hover:border-brand"
          >
            <Sparkles size={12} /> {labels.emptyCta}
          </button>
        </div>
        <p className="text-center text-[11px] text-fg-subtle">{labels.mockExplain}</p>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Insufficient: <3 approved + no plan yet
  // -------------------------------------------------------------------------

  if (approvedCount < 3 && !plan) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-amber-400/30 bg-amber-400/5 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-400" />
            <div className="min-w-0">
              <h2 className="font-display text-lg font-semibold text-fg">{labels.lowTitle}</h2>
              <p className="mt-1 text-sm text-fg-muted">
                {labels.lowBody.replace('{n}', String(approvedCount))}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onNavigateTab?.('assets')}
                  className="inline-flex items-center gap-1.5 rounded-md border border-brand/40 bg-brand/5 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-fg transition hover:border-brand"
                >
                  <Sparkles size={12} /> {labels.lowCtaApprove}
                </button>
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-elevated px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-fg-muted transition hover:border-border-strong hover:text-fg"
                >
                  <CalendarIcon size={12} /> {labels.lowCtaMini}
                </button>
              </div>
            </div>
          </div>
        </div>
        <GoalSelector goal={goal} onChange={setGoal} language={language} />
        <p className="text-[11px] text-fg-subtle">{labels.mockExplain}</p>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Plan exists OR enough approved assets
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-5">
      <header className="rounded-md border border-brand/30 bg-brand/5 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-wider text-brand">
              {labels.heroEyebrow}
            </p>
            <h2 className="mt-1 font-display text-xl font-semibold text-fg sm:text-2xl">
              {labels.heroTitle}
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-fg-muted">{labels.heroSubtitle}</p>
            {plan && (
              <p className="mt-2 font-mono text-[11px] text-fg-subtle">
                {labels.weekOf} {plan.weekStart} ·{' '}
                {WEEKLY_PLAN_GOAL_LABELS[plan.goal][language]}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleGenerate}
              className="inline-flex items-center gap-1.5 rounded-md border border-brand/60 bg-brand/15 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-fg transition hover:border-brand hover:bg-brand/25"
            >
              <Sparkles size={12} /> {plan ? labels.regenerate : labels.generate}
            </button>
            {plan && (
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-elevated px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-fg-muted transition hover:border-border-strong hover:text-fg"
              >
                <Clipboard size={12} /> {labels.copyPlan}
              </button>
            )}
          </div>
        </div>
        {notice && (
          <p className="mt-3 inline-flex items-center gap-1 rounded-md border border-emerald-400/40 bg-emerald-400/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-emerald-400">
            <Check size={10} /> {notice}
          </p>
        )}
      </header>

      <p className="rounded border border-amber-400/30 bg-amber-400/5 px-3 py-2 text-[11px] text-amber-400">
        {labels.mockExplain}
      </p>

      <GoalSelector goal={goal} onChange={setGoal} language={language} />

      {plan ? (
        <PlanGrid
          plan={plan}
          assets={assets}
          dayLabels={dayLabels}
          language={language}
          store={store}
          onUpdate={onUpdate}
          onNotice={showNotice}
        />
      ) : (
        <div className="rounded-md border border-dashed border-border bg-bg-elevated/40 p-6 text-center text-sm text-fg-muted">
          {labels.notGenerated}
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Goal selector
// -----------------------------------------------------------------------------

function GoalSelector({
  goal,
  onChange,
  language,
}: {
  goal: WeeklyPlanGoal;
  onChange: (g: WeeklyPlanGoal) => void;
  language: 'fr' | 'en';
}) {
  const labels = language === 'en' ? L_EN : L_FR;
  return (
    <div className="rounded-md border border-border bg-bg-elevated p-4">
      <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
        {labels.goalTitle}
      </p>
      <div className="flex flex-wrap gap-2">
        {WEEKLY_PLAN_GOALS.map((g) => {
          const active = g === goal;
          return (
            <button
              key={g}
              type="button"
              onClick={() => onChange(g)}
              aria-pressed={active}
              className={cn(
                'rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-wider transition',
                active
                  ? 'border-brand bg-brand/10 text-fg'
                  : 'border-border bg-bg text-fg-muted hover:border-border-strong',
              )}
            >
              {WEEKLY_PLAN_GOAL_LABELS[g][language]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Plan grid
// -----------------------------------------------------------------------------

function PlanGrid({
  plan,
  assets,
  dayLabels,
  language,
  store,
  onUpdate,
  onNotice,
}: {
  plan: WeeklyPlan;
  assets: Asset[];
  dayLabels: string[];
  language: 'fr' | 'en';
  store: WorkspaceStore;
  onUpdate: () => void;
  onNotice: (msg: string) => void;
}) {
  const labels = language === 'en' ? L_EN : L_FR;
  const slotsByDay: PlanSlot[][] = Array.from({ length: 7 }, () => []);
  const sorted = [...plan.slots].sort(
    (a, b) => a.dayIndex - b.dayIndex || a.suggestedTime.localeCompare(b.suggestedTime),
  );
  for (const s of sorted) slotsByDay[s.dayIndex]!.push(s);

  return (
    <div className="grid gap-3 lg:grid-cols-7">
      {dayLabels.map((dayLabel, dayIdx) => (
        <section
          key={dayIdx}
          className="rounded-md border border-border bg-bg-elevated"
        >
          <header className="border-b border-border px-3 py-2">
            <p className="font-mono text-[11px] uppercase tracking-wider text-fg">
              {dayLabel}
            </p>
            <p className="font-mono text-[10px] text-fg-subtle">
              {slotsByDay[dayIdx]!.length} {labels.slotSuffix}
            </p>
          </header>
          <ul className="space-y-2 p-3">
            {slotsByDay[dayIdx]!.length === 0 && (
              <li className="rounded border border-dashed border-border/60 px-2 py-3 text-center font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                {labels.emptyDay}
              </li>
            )}
            {slotsByDay[dayIdx]!.map((slot) => (
              <SlotCard
                key={slot.id}
                slot={slot}
                plan={plan}
                asset={assets.find((a) => a.id === slot.assetId)}
                language={language}
                onMoveLeft={() => {
                  if (slot.dayIndex <= 0) return;
                  store.movePlanSlot(plan.id, slot.id, slot.dayIndex - 1);
                  onUpdate();
                  onNotice(labels.moved);
                }}
                onMoveRight={() => {
                  if (slot.dayIndex >= 6) return;
                  store.movePlanSlot(plan.id, slot.id, slot.dayIndex + 1);
                  onUpdate();
                  onNotice(labels.moved);
                }}
                onSetStatus={(status) => {
                  store.setPlanSlotStatus(plan.id, slot.id, status);
                  onUpdate();
                  onNotice(labels.statusUpdated);
                }}
                onRemove={() => {
                  store.removePlanSlot(plan.id, slot.id);
                  onUpdate();
                  onNotice(labels.removed);
                }}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Slot card
// -----------------------------------------------------------------------------

function SlotCard({
  slot,
  plan,
  asset,
  language,
  onMoveLeft,
  onMoveRight,
  onSetStatus,
  onRemove,
}: {
  slot: PlanSlot;
  plan: WeeklyPlan;
  asset?: Asset;
  language: 'fr' | 'en';
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onSetStatus: (s: PlanSlotStatus) => void;
  onRemove: () => void;
}) {
  const labels = language === 'en' ? L_EN : L_FR;
  const isFree = !!slot.free;

  return (
    <li
      className={cn(
        'rounded-md border bg-bg p-3',
        isFree ? 'border-border/60 border-dashed' : 'border-border',
      )}
    >
      <div className="mb-1 flex flex-wrap items-center justify-between gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
            {slot.suggestedTime}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
            · {slot.channel}
          </span>
          {!isFree && (
            <span className="rounded-full border border-brand/30 bg-brand/5 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-fg-muted">
              {EDITORIAL_PILLAR_LABELS[slot.pillar][language]}
            </span>
          )}
        </div>
        <StatusBadge status={slot.status} language={language} />
      </div>

      <p className="text-sm font-semibold text-fg">{slot.hook}</p>
      {slot.objective && (
        <p className="mt-1 text-[12px] text-fg-muted">{slot.objective}</p>
      )}
      {asset?.title && asset.title !== slot.hook && (
        <p className="mt-1 truncate font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
          ↳ {asset.title}
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center justify-between gap-1.5">
        <div className="flex items-center gap-1">
          <IconBtn
            ariaLabel={labels.moveLeft}
            onClick={onMoveLeft}
            disabled={slot.dayIndex <= 0}
            icon={<ChevronLeft size={12} />}
          />
          <IconBtn
            ariaLabel={labels.moveRight}
            onClick={onMoveRight}
            disabled={slot.dayIndex >= 6}
            icon={<ChevronRight size={12} />}
          />
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {slot.status !== 'ready' && (
            <button
              type="button"
              onClick={() => onSetStatus('ready')}
              className="inline-flex items-center gap-1 rounded border border-emerald-400/40 bg-emerald-400/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-emerald-400 transition hover:border-emerald-400 hover:text-emerald-300"
            >
              <Check size={10} /> {labels.markReady}
            </button>
          )}
          {slot.status !== 'scheduled' && (
            <button
              type="button"
              onClick={() => onSetStatus('scheduled')}
              className="inline-flex items-center gap-1 rounded border border-border bg-bg-elevated px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-fg-muted transition hover:border-border-strong hover:text-fg"
            >
              <CalendarIcon size={10} /> {labels.markScheduled}
            </button>
          )}
          <IconBtn
            ariaLabel={labels.remove}
            onClick={onRemove}
            icon={<Trash2 size={11} />}
          />
        </div>
      </div>
      {/* Hidden but accessible plan-context for screen readers */}
      <span className="sr-only">{plan.weekStart}</span>
    </li>
  );
}

function StatusBadge({ status, language }: { status: PlanSlotStatus; language: 'fr' | 'en' }) {
  const tone: Record<PlanSlotStatus, string> = {
    draft: 'border-border text-fg-muted',
    ready: 'border-emerald-400/40 text-emerald-400',
    scheduled: 'border-amber-400/40 text-amber-400',
  };
  return (
    <span
      className={cn(
        'rounded-full border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider',
        tone[status],
      )}
    >
      {PLAN_SLOT_STATUS_LABELS[status][language]}
    </span>
  );
}

function IconBtn({
  icon,
  ariaLabel,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  ariaLabel: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      title={ariaLabel}
      disabled={disabled}
      className={cn(
        'inline-flex h-6 w-6 items-center justify-center rounded-md text-fg-subtle transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        disabled
          ? 'cursor-not-allowed opacity-30'
          : 'hover:bg-bg-elevated hover:text-fg-muted',
      )}
    >
      {icon}
    </button>
  );
}

// -----------------------------------------------------------------------------
// Microcopy
// -----------------------------------------------------------------------------

const L_FR = {
  heroEyebrow: 'Plan semaine',
  heroTitle: 'Organise ta semaine éditoriale',
  heroSubtitle:
    "Génère un plan équilibré (éducation, preuve, objection, coulisses, conversion) à partir de tes contenus approuvés.",
  weekOf: 'Semaine du',
  generate: 'Générer le plan',
  regenerate: 'Régénérer',
  copyPlan: 'Copier le plan',
  copied: 'Plan copié',
  created: 'Plan créé',
  regenerated: 'Plan régénéré',
  goalTitle: 'Objectif de la semaine',
  notGenerated:
    'Choisis un objectif puis clique sur « Générer le plan ». Aucune publication, simulation locale.',
  emptyTitle: 'Approuve d\'abord 3 contenus',
  emptyBody:
    'Le plan semaine se construit à partir des contenus approuvés. Va dans l\'onglet Contenus, lis et approuve 3 contenus, puis reviens ici pour générer ta semaine.',
  emptyCta: 'Aller dans Contenus',
  lowTitle: 'Plan possible mais incomplet',
  lowBody:
    "Tu as {n} contenu(s) approuvé(s). On recommande au moins 3 pour un mix équilibré, mais tu peux quand même créer un mini-plan dès maintenant.",
  lowCtaApprove: 'Approuver plus de contenus',
  lowCtaMini: 'Créer un mini-plan',
  mockExplain:
    "Mode démonstration : rien n'est publié automatiquement. Ce planning t'aide à organiser ta semaine avant publication réelle.",
  emptyDay: 'Repos',
  slotSuffix: 'créneau(x)',
  moveLeft: 'Déplacer au jour précédent',
  moveRight: 'Déplacer au jour suivant',
  markReady: 'Prêt',
  markScheduled: 'Planifié',
  remove: 'Retirer du plan',
  moved: 'Déplacé',
  statusUpdated: 'Statut mis à jour',
  removed: 'Retiré du plan',
};

const L_EN = {
  heroEyebrow: 'Weekly plan',
  heroTitle: 'Organize your editorial week',
  heroSubtitle:
    'Generate a balanced plan (education, proof, objection, behind the scenes, conversion) from your approved contents.',
  weekOf: 'Week of',
  generate: 'Generate the plan',
  regenerate: 'Regenerate',
  copyPlan: 'Copy plan',
  copied: 'Plan copied',
  created: 'Plan created',
  regenerated: 'Plan regenerated',
  goalTitle: 'Weekly goal',
  notGenerated: 'Pick a goal, then click "Generate the plan". No publishing, local simulation.',
  emptyTitle: 'Approve 3 contents first',
  emptyBody:
    'The weekly plan is built from approved contents. Go to the Contents tab, read and approve 3 contents, then come back here to generate your week.',
  emptyCta: 'Go to Contents',
  lowTitle: 'Plan possible but incomplete',
  lowBody:
    'You have {n} approved content(s). We recommend at least 3 for a balanced mix, but you can still create a mini-plan now.',
  lowCtaApprove: 'Approve more contents',
  lowCtaMini: 'Create a mini-plan',
  mockExplain:
    'Demo mode: nothing is published automatically. This plan helps you organize your week before any real publishing.',
  emptyDay: 'Rest',
  slotSuffix: 'slot(s)',
  moveLeft: 'Move to previous day',
  moveRight: 'Move to next day',
  markReady: 'Ready',
  markScheduled: 'Scheduled',
  remove: 'Remove from plan',
  moved: 'Moved',
  statusUpdated: 'Status updated',
  removed: 'Removed from plan',
};
