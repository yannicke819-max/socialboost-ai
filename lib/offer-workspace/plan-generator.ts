/**
 * Weekly Content Plan generator (AI-010).
 *
 * Pure, deterministic mock builder. Produces a balanced 5-7 day editorial
 * distribution from approved (then draft) assets of an offer. No model call,
 * no real publishing, no I/O. Operates on already-stored Assets only — never
 * creates, modifies or deletes them.
 *
 * Determinism: same (offerId, weekStart, goal, planSeed) yields the exact
 * same plan. A different `planSeed` shifts the distribution while preserving
 * the editorial mix invariants.
 */

import type {
  Asset,
  EditorialPillar,
  Offer,
  PlanSlot,
  WeeklyPlan,
  WeeklyPlanGoal,
} from './types';
import { isoDate, startOfWeekMonday } from './calendar';

// -----------------------------------------------------------------------------
// Editorial mix per goal (counts must sum to <=6, leaving room for a free slot)
// -----------------------------------------------------------------------------

type PillarMix = Record<EditorialPillar, number>;

const GOAL_MIX: Record<WeeklyPlanGoal, PillarMix> = {
  visibility: { education: 2, proof: 1, objection: 1, behind_scenes: 1, conversion: 0 },
  leads: { education: 1, proof: 2, objection: 1, behind_scenes: 0, conversion: 1 },
  trust: { education: 1, proof: 2, objection: 1, behind_scenes: 1, conversion: 0 },
  launch: { education: 1, proof: 1, objection: 1, behind_scenes: 1, conversion: 1 },
  reactivation: { education: 1, proof: 1, objection: 2, behind_scenes: 0, conversion: 1 },
};

/**
 * Map asset kinds to the pillar they're best suited for.
 * Multi-pillar kinds list a primary first; selection is best-effort.
 */
const KIND_TO_PILLAR: Partial<Record<Asset['kind'], EditorialPillar[]>> = {
  hook: ['education', 'objection'],
  social_post: ['education', 'proof', 'behind_scenes'],
  email: ['conversion', 'proof'],
  cta: ['conversion'],
  objection: ['objection'],
  angle: ['proof', 'education'],
  video_script: ['behind_scenes', 'education'],
  image_prompt: ['behind_scenes', 'proof'],
  landing_section: ['conversion'],
};

/**
 * Default suggested time per channel (local, HH:MM display-only).
 * Mocks editorial best-practice signals.
 */
const CHANNEL_TIMES: Record<string, string> = {
  linkedin: '08:30',
  instagram: '12:00',
  email: '07:30',
  twitter: '09:15',
  youtube: '18:00',
  facebook: '17:30',
  tiktok: '20:00',
};

const DEFAULT_TIME = '10:00';

// -----------------------------------------------------------------------------
// PRNG (Mulberry32) — same family used by pack-generator.ts.
// -----------------------------------------------------------------------------

function mulberry32(seed: number) {
  let s = seed >>> 0;
  return function next(): number {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash32(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mixSeed(planSeed: number, baseHash: number): number {
  return ((planSeed * 2654435761) + baseHash) >>> 0;
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

export interface GeneratePlanInput {
  offer: Offer;
  assets: Asset[];
  goal: WeeklyPlanGoal;
  /** UTC date inside the target week. Falls back to "now". */
  reference?: Date;
  /** Variation seed. 0 = canonical. */
  planSeed?: number;
}

export interface GeneratedPlan {
  weekStart: string;
  goal: WeeklyPlanGoal;
  slots: Omit<PlanSlot, 'id'>[];
}

/**
 * Build a weekly plan draft from approved (preferred) then draft assets.
 * Pure: returns plain data, never touches any store.
 */
export function generateWeeklyPlan(input: GeneratePlanInput): GeneratedPlan {
  const { offer, assets, goal, reference, planSeed = 0 } = input;
  const weekStart = startOfWeekMonday(reference ?? new Date());
  const weekStartIso = isoDate(weekStart);
  const baseHash = hash32(`${offer.id}|${weekStartIso}|${goal}`);
  const rand = mulberry32(mixSeed(planSeed, baseHash));

  // Pool: approved assets first, then drafts. Archived/in-review excluded.
  const usable = assets.filter(
    (a) => a.status === 'approved' || a.status === 'draft',
  );
  const approvedFirst = [
    ...usable.filter((a) => a.status === 'approved'),
    ...usable.filter((a) => a.status !== 'approved'),
  ];

  // Group usable assets by pillar (their primary mapping).
  const byPillar: Record<EditorialPillar, Asset[]> = {
    education: [],
    proof: [],
    objection: [],
    behind_scenes: [],
    conversion: [],
  };
  for (const a of approvedFirst) {
    const candidates = KIND_TO_PILLAR[a.kind];
    if (!candidates || candidates.length === 0) continue;
    byPillar[candidates[0]!].push(a);
  }

  // Editorial mix: clamp every pillar count to what we actually have.
  const wanted = GOAL_MIX[goal];
  const planned: { asset: Asset; pillar: EditorialPillar }[] = [];
  for (const pillar of Object.keys(wanted) as EditorialPillar[]) {
    const want = wanted[pillar];
    const have = byPillar[pillar];
    for (let i = 0; i < want && i < have.length; i++) {
      planned.push({ asset: have[i]!, pillar });
    }
  }

  // Backfill from any pillar if we have spare assets and a few empty buckets,
  // capping each pillar at 3 to keep the editorial mix readable, and total
  // non-free slots at MAX_BOUND (leaves a free slot for spontaneous idea).
  const MAX_BOUND = 6;
  const PILLAR_CAP = 3;
  if (planned.length < MAX_BOUND) {
    const used = new Set(planned.map((p) => p.asset.id));
    const perPillar = new Map<EditorialPillar, number>();
    for (const p of planned) perPillar.set(p.pillar, (perPillar.get(p.pillar) ?? 0) + 1);
    const remaining = approvedFirst.filter((a) => !used.has(a.id));
    for (const a of remaining) {
      if (planned.length >= MAX_BOUND) break;
      const candidates = KIND_TO_PILLAR[a.kind];
      // Pick the first candidate pillar that hasn't hit the cap.
      const pillar = (candidates ?? ['education']).find(
        (p) => (perPillar.get(p) ?? 0) < PILLAR_CAP,
      );
      if (!pillar) continue;
      planned.push({ asset: a, pillar });
      perPillar.set(pillar, (perPillar.get(pillar) ?? 0) + 1);
    }
  }

  // Reorder `planned` so consecutive items prefer distinct channels — this
  // gives a naturally varied week without needing day-pool gymnastics.
  const interleaved = interleaveByChannel(planned);

  // Day distribution: spread across Mon..Sat, skip Sunday by default,
  // randomized via the seeded PRNG so different seeds yield different layouts.
  const dayPool = [0, 1, 2, 3, 4, 5]; // Mon..Sat
  shuffleInPlace(dayPool, rand);
  const slots: Omit<PlanSlot, 'id'>[] = [];

  for (let i = 0; i < interleaved.length && i < dayPool.length; i++) {
    const { asset, pillar } = interleaved[i]!;
    const channel = asset.channel ?? channelFromKind(asset.kind);
    const day = dayPool[i]!;
    slots.push({
      dayIndex: day,
      suggestedTime: CHANNEL_TIMES[channel] ?? DEFAULT_TIME,
      channel,
      kind: asset.kind,
      pillar,
      objective: objectiveFor(pillar, goal),
      hook: deriveHook(asset),
      assetId: asset.id,
      status: 'draft',
    });
  }

  // Always append a "free idea" slot on the first remaining empty day in pool,
  // if one exists. Otherwise, on Sunday.
  const usedDays = new Set(slots.map((s) => s.dayIndex));
  const freeDay =
    [0, 1, 2, 3, 4, 5, 6].find((d) => !usedDays.has(d)) ?? 6;
  slots.push({
    dayIndex: freeDay,
    suggestedTime: DEFAULT_TIME,
    channel: 'free',
    pillar: 'behind_scenes',
    objective: 'Slot libre — idée spontanée ou réaction à l\'actualité de la semaine.',
    hook: 'Idée spontanée',
    status: 'draft',
    free: true,
  });

  // Sort by dayIndex so the UI can render Mon..Sun.
  slots.sort((a, b) => a.dayIndex - b.dayIndex || a.suggestedTime.localeCompare(b.suggestedTime));

  return {
    weekStart: weekStartIso,
    goal,
    slots,
  };
}

/**
 * Build a textual export of a plan, suitable for clipboard.
 */
export function planToText(plan: WeeklyPlan, language: 'fr' | 'en' = 'fr'): string {
  const isEn = language === 'en';
  const dayLabels = isEn
    ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    : ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const header = isEn
    ? `# Weekly plan — week of ${plan.weekStart}`
    : `# Plan semaine — semaine du ${plan.weekStart}`;
  const goalLine = isEn ? `Goal: ${plan.goal}` : `Objectif : ${plan.goal}`;

  const lines: string[] = [header, goalLine, ''];
  const sorted = [...plan.slots].sort(
    (a, b) => a.dayIndex - b.dayIndex || a.suggestedTime.localeCompare(b.suggestedTime),
  );
  for (const s of sorted) {
    const day = dayLabels[s.dayIndex] ?? '?';
    const head = `- ${day} ${s.suggestedTime} · ${s.channel} · ${s.pillar}`;
    lines.push(head);
    lines.push(`  ${s.hook}`);
    if (s.objective) lines.push(`  ↳ ${s.objective}`);
    lines.push('');
  }
  lines.push(
    isEn
      ? '— Mock V1: nothing is published. Local simulation.'
      : "— Mock V1 : rien n'est publié. Simulation locale.",
  );
  return lines.join('\n');
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/**
 * Greedy channel-interleaver: returns a reordering where no two consecutive
 * items share the same channel when an alternative exists in the pool.
 * Stable for items that have no conflict.
 */
function interleaveByChannel(
  items: { asset: Asset; pillar: EditorialPillar }[],
): { asset: Asset; pillar: EditorialPillar }[] {
  const remaining = [...items];
  const out: { asset: Asset; pillar: EditorialPillar }[] = [];
  let lastChannel: string | undefined;
  while (remaining.length > 0) {
    let pickIndex = remaining.findIndex(
      (it) => (it.asset.channel ?? channelFromKind(it.asset.kind)) !== lastChannel,
    );
    if (pickIndex < 0) pickIndex = 0;
    const picked = remaining.splice(pickIndex, 1)[0]!;
    out.push(picked);
    lastChannel = picked.asset.channel ?? channelFromKind(picked.asset.kind);
  }
  return out;
}

function shuffleInPlace<T>(arr: T[], rand: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
}

function channelFromKind(kind: Asset['kind']): string {
  switch (kind) {
    case 'email':
      return 'email';
    case 'social_post':
      return 'linkedin';
    case 'video_script':
      return 'youtube';
    case 'image_prompt':
    case 'image_asset':
      return 'instagram';
    case 'landing_section':
      return 'landing';
    default:
      return 'linkedin';
  }
}

function objectiveFor(pillar: EditorialPillar, goal: WeeklyPlanGoal): string {
  const base: Record<EditorialPillar, string> = {
    education: 'Faire comprendre une idée précise sans jargon.',
    proof: 'Montrer un résultat concret de la méthode.',
    objection: "Lever un frein fréquent du public cible.",
    behind_scenes: 'Humaniser la marque et créer du lien.',
    conversion: 'Inviter à la prochaine étape claire.',
  };
  const goalNuance: Record<WeeklyPlanGoal, string> = {
    visibility: ' Optique : maximiser la portée.',
    leads: ' Optique : capter un signal d\'intérêt.',
    trust: ' Optique : ancrer la crédibilité.',
    launch: ' Optique : préparer le lancement.',
    reactivation: ' Optique : réveiller une audience tiède.',
  };
  return base[pillar] + goalNuance[goal];
}

function deriveHook(asset: Asset): string {
  if (asset.title && asset.title.length > 0) return asset.title;
  // Take the first line, trim, clamp length.
  const first = (asset.body ?? '').split('\n').find((l) => l.trim().length > 0) ?? '';
  const trimmed = first.trim().replace(/^[#>\-*]+\s*/, '');
  if (trimmed.length === 0) return '—';
  return trimmed.length <= 80 ? trimmed : `${trimmed.slice(0, 77)}…`;
}
