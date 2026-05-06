/**
 * Editorial Feedback Loop engine (AI-011).
 *
 * Pure deterministic rules. Given (offer, plan, slots, assets) the engine
 * produces:
 *   - per-slot mock metrics (impressions, engagement, clicks, leads,
 *     useful_score, global_score, audience_fit)
 *   - funnel classification (stage, intent, primary KPI)
 *   - week-level balance signals
 *   - 3..5 actionable recommendations
 *   - one A/B test idea ("Test à lancer la semaine prochaine")
 *
 * Mock V1 invariants:
 *   - Same inputs → identical outputs (Mulberry32 seeded by ids).
 *   - Source assets are NEVER mutated.
 *   - useful_score does not reward reach only.
 *   - Recommendations always carry a "why" + "impact" + effort + confidence.
 *   - Goal weights (visibility/leads/trust/launch/reactivation) shape both
 *     the score and the recommendations selection.
 *
 * No model call. No I/O. No randomness beyond the seeded PRNG.
 */

import type {
  Asset,
  ConfidenceLevel,
  EditorialPillar,
  EffortLevel,
  FeedbackRecommendation,
  FeedbackRecommendationStatus,
  FeedbackTest,
  FunnelStage,
  IntentLevel,
  Offer,
  PlanSlot,
  PrimaryKpi,
  SlotMetrics,
  WeeklyPlan,
  WeeklyPlanGoal,
} from './types';

// -----------------------------------------------------------------------------
// Deterministic PRNG (same family as pack/plan generators).
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

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

function round(n: number): number {
  return Math.round(n);
}

// -----------------------------------------------------------------------------
// Pillar / kind → funnel classification.
// -----------------------------------------------------------------------------

const PILLAR_FUNNEL: Record<EditorialPillar, FunnelStage> = {
  education: 'awareness',
  proof: 'consideration',
  objection: 'consideration',
  behind_scenes: 'awareness',
  conversion: 'decision',
};

const KIND_PRIMARY_KPI: Partial<Record<Asset['kind'], PrimaryKpi>> = {
  hook: 'reach',
  social_post: 'engagement',
  email: 'clicks',
  cta: 'conversion',
  objection: 'trust',
  angle: 'engagement',
  video_script: 'engagement',
  image_prompt: 'reach',
  landing_section: 'conversion',
};

const PILLAR_INTENT: Record<EditorialPillar, IntentLevel> = {
  education: 'low',
  proof: 'medium',
  objection: 'medium',
  behind_scenes: 'low',
  conversion: 'high',
};

// -----------------------------------------------------------------------------
// Channel weights — used to bias mock metrics realistically without faking
// real analytics. All are dimensionless multipliers on the seeded base.
// -----------------------------------------------------------------------------

const CHANNEL_REACH: Record<string, number> = {
  linkedin: 1.0,
  instagram: 1.2,
  email: 0.4,
  youtube: 0.7,
  twitter: 0.9,
  facebook: 0.8,
  tiktok: 1.4,
  landing: 0.3,
  free: 0.5,
};

const CHANNEL_CTR: Record<string, number> = {
  linkedin: 0.04,
  instagram: 0.02,
  email: 0.12,
  youtube: 0.05,
  twitter: 0.03,
  facebook: 0.025,
  tiktok: 0.018,
  landing: 0.08,
  free: 0.03,
};

// -----------------------------------------------------------------------------
// Per-slot metrics
// -----------------------------------------------------------------------------

export interface ComputeMetricsInput {
  offer: Offer;
  plan: WeeklyPlan;
  slot: PlanSlot;
  asset?: Asset;
}

export function computeSlotMetrics(input: ComputeMetricsInput): SlotMetrics {
  const { offer, plan, slot, asset } = input;
  const seed = hash32(`${offer.id}|${plan.id}|${slot.id}|${plan.goal}`);
  const rand = mulberry32(seed);

  // Mock impressions: bounded range biased by channel and slot status.
  const reachMul = CHANNEL_REACH[slot.channel] ?? 0.6;
  const statusMul = slot.status === 'scheduled' ? 1.0 : slot.status === 'ready' ? 0.85 : 0.6;
  const baseImpressions = 600 + Math.floor(rand() * 2400);
  const impressions = Math.max(50, round(baseImpressions * reachMul * statusMul));

  // Engagement rate biased by pillar (proof/objection more "useful").
  const pillarEng: Record<EditorialPillar, number> = {
    education: 0.045,
    proof: 0.06,
    objection: 0.055,
    behind_scenes: 0.05,
    conversion: 0.035,
  };
  const engRate = pillarEng[slot.pillar] ?? 0.04;
  const engagement = round(impressions * engRate * (0.8 + rand() * 0.4));

  // Click-through.
  const ctrBase = CHANNEL_CTR[slot.channel] ?? 0.03;
  const clicks = round(impressions * ctrBase * (0.7 + rand() * 0.6));

  // Leads (mock): only meaningful for decision/conversion.
  const isDecision = slot.pillar === 'conversion' || slot.kind === 'cta' || slot.kind === 'email';
  const leads = isDecision ? round(clicks * (0.05 + rand() * 0.1)) : 0;

  // Useful score: NOT reach-only. Engagement, clicks, leads weigh more than
  // raw impressions. Pillar diversity bonus comes at the week level.
  const usefulScore = clamp(
    Math.round(
      (impressions / 100) * 0.6 +
        engagement * 1.4 +
        clicks * 4 +
        leads * 12,
    ) / 4,
  );

  const audienceFit = computeAudienceFit({ offer, plan, slot, asset });

  // Funnel classification.
  const funnelStage = PILLAR_FUNNEL[slot.pillar];
  const primaryKpi: PrimaryKpi = slot.kind
    ? KIND_PRIMARY_KPI[slot.kind] ?? defaultKpi(funnelStage)
    : defaultKpi(funnelStage);
  const intentLevel = PILLAR_INTENT[slot.pillar];

  // Goal-aware global score blends usefulScore + audienceFit + goal weight.
  const goalBoost = goalBoostFor(plan.goal, funnelStage, primaryKpi);
  const globalScore = clamp(
    Math.round(usefulScore * 0.55 + audienceFit * 0.3 + goalBoost * 0.15),
  );

  return {
    slotId: slot.id,
    impressions_mock: impressions,
    engagement_mock: engagement,
    clicks_mock: clicks,
    leads_mock: leads,
    useful_score: usefulScore,
    global_score: globalScore,
    funnelStage,
    intentLevel,
    primaryKpi,
    audience_fit: audienceFit,
  };
}

function defaultKpi(stage: FunnelStage): PrimaryKpi {
  switch (stage) {
    case 'awareness':
      return 'reach';
    case 'consideration':
      return 'engagement';
    case 'decision':
      return 'conversion';
    case 'retention':
      return 'trust';
  }
}

function goalBoostFor(goal: WeeklyPlanGoal, stage: FunnelStage, kpi: PrimaryKpi): number {
  switch (goal) {
    case 'visibility':
      return stage === 'awareness' ? 80 : kpi === 'reach' ? 60 : 35;
    case 'leads':
      return kpi === 'clicks' || kpi === 'leads' ? 80 : stage === 'decision' ? 70 : 35;
    case 'trust':
      return stage === 'consideration' || kpi === 'trust' ? 80 : 35;
    case 'launch':
      return stage === 'awareness' || stage === 'decision' ? 70 : 40;
    case 'reactivation':
      return stage === 'retention' || stage === 'consideration' ? 70 : 35;
  }
}

// -----------------------------------------------------------------------------
// Audience fit — heuristic blend across target/pain/promise/proof/channel.
// -----------------------------------------------------------------------------

export function computeAudienceFit(input: {
  offer: Offer;
  plan: WeeklyPlan;
  slot: PlanSlot;
  asset?: Asset;
}): number {
  const { offer, plan, slot, asset } = input;
  const text = ((asset?.title ?? '') + ' ' + (asset?.body ?? slot.hook)).toLowerCase();
  let score = 50;

  // Target audience cohesion.
  const target = (offer.brief.targetAudience ?? '').toLowerCase();
  if (target && containsAnyWord(text, target)) score += 12;

  // Promise (offer) cohesion.
  const promise = (offer.brief.offer ?? '').toLowerCase();
  if (promise && containsAnyWord(text, promise)) score += 10;

  // Proof reuse: a verbatim proofPoint snippet is the strongest signal.
  for (const p of offer.brief.proofPoints ?? []) {
    if (text && p && text.includes(p.toLowerCase())) {
      score += 10;
      break;
    }
  }

  // Channel match with brief.platforms.
  const platforms = (offer.brief.platforms ?? []).map((p) => p.toLowerCase());
  if (slot.channel === 'free') {
    score += 0;
  } else if (platforms.includes(slot.channel.toLowerCase())) {
    score += 10;
  } else if (platforms.length > 0) {
    score -= 6; // off-platform penalty
  }

  // Tone/pillar alignment with plan goal.
  if (plan.goal === 'leads' && slot.pillar === 'conversion') score += 6;
  if (plan.goal === 'trust' && slot.pillar === 'proof') score += 6;
  if (plan.goal === 'visibility' && slot.pillar === 'education') score += 4;

  return clamp(score);
}

function containsAnyWord(haystack: string, needle: string): boolean {
  const words = needle.split(/[^a-zA-Zàâäéèêëïîôöùûüç]+/i).filter((w) => w.length >= 4);
  return words.some((w) => haystack.includes(w.toLowerCase()));
}

// -----------------------------------------------------------------------------
// Week balance
// -----------------------------------------------------------------------------

export interface BalanceReport {
  flags: BalanceFlag[];
  pillarCounts: Record<EditorialPillar, number>;
  funnelCounts: Record<FunnelStage, number>;
  channelCounts: Record<string, number>;
  scheduledOrReadyCount: number;
}

export type BalanceFlag =
  | 'too_much_conversion'
  | 'not_enough_proof'
  | 'not_enough_education'
  | 'channel_overuse'
  | 'not_enough_trust'
  | 'missing_bofu_for_leads'
  | 'missing_tofu_for_visibility';

export function computeBalance(plan: WeeklyPlan): BalanceReport {
  const pillarCounts: Record<EditorialPillar, number> = {
    education: 0,
    proof: 0,
    objection: 0,
    behind_scenes: 0,
    conversion: 0,
  };
  const funnelCounts: Record<FunnelStage, number> = {
    awareness: 0,
    consideration: 0,
    decision: 0,
    retention: 0,
  };
  const channelCounts: Record<string, number> = {};
  let nonFreeCount = 0;
  let scheduledOrReadyCount = 0;
  for (const s of plan.slots) {
    if (s.free) continue;
    nonFreeCount += 1;
    pillarCounts[s.pillar] += 1;
    funnelCounts[PILLAR_FUNNEL[s.pillar]] += 1;
    channelCounts[s.channel] = (channelCounts[s.channel] ?? 0) + 1;
    if (s.status === 'ready' || s.status === 'scheduled') scheduledOrReadyCount += 1;
  }

  const flags: BalanceFlag[] = [];
  if (nonFreeCount > 0) {
    if (pillarCounts.conversion / nonFreeCount > 0.5) flags.push('too_much_conversion');
    if (pillarCounts.proof === 0) flags.push('not_enough_proof');
    if (pillarCounts.education === 0) flags.push('not_enough_education');
    if (pillarCounts.objection === 0 && pillarCounts.proof < 2) flags.push('not_enough_trust');
    for (const [channel, n] of Object.entries(channelCounts)) {
      if (n / nonFreeCount > 0.6 && nonFreeCount >= 3) {
        flags.push('channel_overuse');
        break;
      }
    }
    if (
      (plan.goal === 'leads' || plan.goal === 'launch') &&
      funnelCounts.decision === 0
    ) {
      flags.push('missing_bofu_for_leads');
    }
    if (plan.goal === 'visibility' && funnelCounts.awareness === 0) {
      flags.push('missing_tofu_for_visibility');
    }
  }

  return { flags, pillarCounts, funnelCounts, channelCounts, scheduledOrReadyCount };
}

// -----------------------------------------------------------------------------
// Headlines: "what works" / "what to improve"
// -----------------------------------------------------------------------------

export interface Headlines {
  whatWorks: string[];
  whatToImprove: string[];
}

export function computeHeadlines(
  metrics: SlotMetrics[],
  balance: BalanceReport,
  plan: WeeklyPlan,
  language: 'fr' | 'en' = 'fr',
): Headlines {
  const isEn = language === 'en';
  const whatWorks: string[] = [];
  const whatToImprove: string[] = [];

  if (metrics.length === 0) return { whatWorks, whatToImprove };

  // Top performer.
  const top = [...metrics].sort((a, b) => b.global_score - a.global_score)[0]!;
  whatWorks.push(
    isEn
      ? `Best slot: ${top.primaryKpi} signal (score ${top.global_score}/100, audience fit ${top.audience_fit}/100).`
      : `Meilleur créneau : signal ${PRIMARY_KPI_LABELS_FR[top.primaryKpi]} (score ${top.global_score}/100, audience fit ${top.audience_fit}/100).`,
  );

  // Diversity highlight.
  const distinctPillars = (Object.keys(balance.pillarCounts) as EditorialPillar[]).filter(
    (p) => balance.pillarCounts[p] > 0,
  ).length;
  if (distinctPillars >= 3) {
    whatWorks.push(
      isEn
        ? `Editorial mix is varied (${distinctPillars} pillars used).`
        : `Le mix éditorial est varié (${distinctPillars} piliers utilisés).`,
    );
  }

  // Goal alignment.
  const aligned = metrics.filter((m) => m.global_score >= 70).length;
  if (aligned >= 2) {
    whatWorks.push(
      isEn
        ? `${aligned} slots align well with the "${plan.goal}" goal.`
        : `${aligned} créneaux alignés avec l'objectif « ${plan.goal} ».`,
    );
  }

  // Improvements.
  if (balance.flags.includes('too_much_conversion')) {
    whatToImprove.push(
      isEn
        ? 'Too much conversion content — risk of fatigue. Add at least one proof or education slot.'
        : 'Trop de conversion — risque de saturation. Ajoute au moins une preuve ou une éducation.',
    );
  }
  if (balance.flags.includes('not_enough_proof')) {
    whatToImprove.push(
      isEn
        ? 'No proof slot this week. Conversion suffers without anchored credibility.'
        : 'Aucun créneau preuve cette semaine. La conversion souffre sans crédibilité ancrée.',
    );
  }
  if (balance.flags.includes('channel_overuse')) {
    whatToImprove.push(
      isEn
        ? 'One channel dominates. Diversify to validate the message across audiences.'
        : 'Un canal domine. Diversifie pour valider le message sur plusieurs audiences.',
    );
  }
  if (balance.flags.includes('missing_bofu_for_leads')) {
    whatToImprove.push(
      isEn
        ? 'Goal is leads/launch but no decision-stage slot. Add a CTA or email.'
        : "Objectif leads/launch mais aucun créneau de décision. Ajoute un CTA ou un email.",
    );
  }
  if (balance.flags.includes('missing_tofu_for_visibility')) {
    whatToImprove.push(
      isEn
        ? 'Goal is visibility but no awareness-stage slot. Add a hook or educational post.'
        : "Objectif visibilité mais aucun créneau awareness. Ajoute un hook ou un post éducatif.",
    );
  }

  // Low audience fit warning.
  const lowFit = metrics.filter((m) => m.audience_fit < 45).length;
  if (lowFit >= 2) {
    whatToImprove.push(
      isEn
        ? `${lowFit} slots show weak audience fit (<45). Re-anchor to brief proof or audience.`
        : `${lowFit} créneaux ont un audience fit faible (<45). Réancre une preuve ou la cible du brief.`,
    );
  }

  return { whatWorks, whatToImprove };
}

const PRIMARY_KPI_LABELS_FR: Record<PrimaryKpi, string> = {
  reach: 'portée',
  engagement: 'engagement',
  clicks: 'clics',
  leads: 'leads',
  trust: 'confiance',
  conversion: 'conversion',
};

// -----------------------------------------------------------------------------
// Recommendations
// -----------------------------------------------------------------------------

export interface DerivedRecommendation {
  ruleId: string;
  action: string;
  why: string;
  impact: string;
  effort: EffortLevel;
  confidence: ConfidenceLevel;
  linkedSlotId?: string;
  linkedAssetId?: string;
  preferenceKey?: string;
}

export interface DeriveRecsInput {
  offer: Offer;
  plan: WeeklyPlan;
  metrics: SlotMetrics[];
  balance: BalanceReport;
  language?: 'fr' | 'en';
}

export function deriveFeedbackRecommendations(input: DeriveRecsInput): DerivedRecommendation[] {
  const { offer, plan, metrics, balance, language = 'fr' } = input;
  const isEn = language === 'en';
  const out: DerivedRecommendation[] = [];

  // Lowest-fit slot — recommend re-anchor.
  if (metrics.length > 0) {
    const worst = [...metrics].sort((a, b) => a.audience_fit - b.audience_fit)[0]!;
    if (worst.audience_fit < 55) {
      out.push({
        ruleId: 'reanchor_lowest_fit',
        action: isEn
          ? 'Re-anchor the lowest-fit slot with a verbatim proof point.'
          : 'Réancre le créneau au plus faible audience fit avec une preuve verbatim du brief.',
        why: isEn
          ? `Slot ${worst.slotId.slice(-6)} has audience fit ${worst.audience_fit}/100, well below target.`
          : `Le créneau ${worst.slotId.slice(-6)} a un audience fit de ${worst.audience_fit}/100, sous le seuil cible.`,
        impact: isEn
          ? '+10 to +20 audience fit, similar global score uplift.'
          : '+10 à +20 d\'audience fit, gain similaire sur le score global.',
        effort: 'low',
        confidence: 'medium',
        linkedSlotId: worst.slotId,
        preferenceKey: 'prefer_verbatim_proof',
      });
    }
  }

  // Mix flags → recos.
  if (balance.flags.includes('too_much_conversion')) {
    out.push({
      ruleId: 'rebalance_conversion',
      action: isEn
        ? 'Replace one conversion slot with a proof or education slot.'
        : 'Remplace un créneau conversion par une preuve ou une éducation.',
      why: isEn
        ? 'Over half of the week is conversion. Audiences saturate fast.'
        : "Plus de la moitié de la semaine est conversion. L'audience sature vite.",
      impact: isEn
        ? 'Better mid-funnel coverage, less unsubscribe risk.'
        : 'Meilleure couverture milieu de funnel, moins de risque de désabo.',
      effort: 'low',
      confidence: 'high',
      preferenceKey: 'avoid_conversion_overload',
    });
  }
  if (balance.flags.includes('not_enough_proof')) {
    out.push({
      ruleId: 'add_proof_slot',
      action: isEn
        ? 'Add at least one proof-pillar slot (testimonial, outcome, before/after).'
        : 'Ajoute au moins un créneau pilier preuve (témoignage, résultat, avant/après).',
      why: isEn
        ? 'No proof slot this week. Conversion needs anchored credibility.'
        : 'Aucun créneau preuve cette semaine. La conversion a besoin de crédibilité ancrée.',
      impact: isEn
        ? '+15 to +25 audience fit on conversion slots downstream.'
        : "+15 à +25 d'audience fit sur les créneaux conversion en aval.",
      effort: 'medium',
      confidence: 'high',
      preferenceKey: 'min_one_proof_per_week',
    });
  }
  if (balance.flags.includes('channel_overuse')) {
    out.push({
      ruleId: 'diversify_channels',
      action: isEn
        ? 'Diversify channels: replace one repeated-channel slot with a different platform.'
        : "Diversifie les canaux : remplace un créneau d'un canal répété par une autre plateforme.",
      why: isEn
        ? 'Single-channel weeks make it hard to validate the message.'
        : 'Une semaine mono-canal complique la validation du message.',
      impact: isEn
        ? 'More signal across audiences, less risk of channel fatigue.'
        : "Plus de signal multi-audience, moins de fatigue d'un canal.",
      effort: 'medium',
      confidence: 'medium',
      preferenceKey: 'avoid_same_channel_overuse',
    });
  }
  if (balance.flags.includes('missing_bofu_for_leads')) {
    out.push({
      ruleId: 'add_bofu_slot',
      action: isEn
        ? 'Add a decision-stage slot (CTA or email) before the week ends.'
        : "Ajoute un créneau de décision (CTA ou email) avant la fin de la semaine.",
      why: isEn
        ? `Goal "${plan.goal}" without any decision slot rarely converts.`
        : `L'objectif « ${plan.goal} » sans créneau de décision convertit rarement.`,
      impact: isEn
        ? 'Lifts leads_mock by ~30% in the per-slot estimate.'
        : 'Augmente leads_mock de ~30% sur le créneau ajouté.',
      effort: 'low',
      confidence: 'high',
      preferenceKey: 'always_one_bofu_for_leads',
    });
  }
  if (balance.flags.includes('missing_tofu_for_visibility')) {
    out.push({
      ruleId: 'add_tofu_slot',
      action: isEn
        ? 'Add an awareness-stage slot (hook or educational post).'
        : "Ajoute un créneau awareness (hook ou post éducatif).",
      why: isEn
        ? 'Visibility without any TOFU content limits reach.'
        : 'Visibilité sans contenu TOFU limite la portée.',
      impact: isEn
        ? '+25% impressions_mock estimated on the new slot.'
        : "+25% impressions_mock estimés sur le nouveau créneau.",
      effort: 'low',
      confidence: 'medium',
      preferenceKey: 'always_one_tofu_for_visibility',
    });
  }

  // Goal-specific extras.
  if (plan.goal === 'leads' && metrics.filter((m) => m.primaryKpi === 'clicks').length === 0) {
    out.push({
      ruleId: 'leads_needs_clicks',
      action: isEn
        ? 'Promote one slot whose primary KPI is clicks (LinkedIn link post or email).'
        : 'Mets en avant un créneau dont le KPI principal est clics (post LinkedIn lien ou email).',
      why: isEn
        ? 'Leads goal without any click-driver leaves the funnel open.'
        : "Objectif leads sans levier clics laisse l'entonnoir ouvert.",
      impact: isEn
        ? 'Adds a measurable click signal next week.'
        : 'Ajoute un signal clics mesurable la semaine prochaine.',
      effort: 'low',
      confidence: 'medium',
      preferenceKey: 'leads_needs_click_driver',
    });
  }
  if (plan.goal === 'trust' && balance.pillarCounts.proof < 2) {
    out.push({
      ruleId: 'trust_needs_proof_repetition',
      action: isEn
        ? 'Run two distinct proof angles (case study + testimonial).'
        : 'Lance deux angles preuve distincts (étude de cas + témoignage).',
      why: isEn
        ? 'Trust goal benefits from proof repetition with distinct angles.'
        : "L'objectif confiance gagne à répéter la preuve sous deux angles distincts.",
      impact: isEn
        ? 'Lifts audience fit on consideration slots downstream.'
        : "Améliore l'audience fit sur les créneaux considération en aval.",
      effort: 'medium',
      confidence: 'medium',
      preferenceKey: 'trust_double_proof',
    });
  }
  if (plan.goal === 'reactivation' && balance.pillarCounts.objection === 0) {
    out.push({
      ruleId: 'reactivation_objection',
      action: isEn
        ? 'Address one common objection of the dormant audience.'
        : "Adresse une objection fréquente de l'audience dormante.",
      why: isEn
        ? 'Reactivation almost always fails on a silent objection.'
        : 'La réactivation échoue presque toujours sur une objection silencieuse.',
      impact: isEn
        ? 'Lifts engagement_mock on the reactivation slot.'
        : 'Améliore engagement_mock sur le créneau de réactivation.',
      effort: 'medium',
      confidence: 'high',
      preferenceKey: 'reactivation_address_objection',
    });
  }

  // Best slot → "amplify" reco.
  if (metrics.length > 0) {
    const top = [...metrics].sort((a, b) => b.global_score - a.global_score)[0]!;
    if (top.global_score >= 70) {
      out.push({
        ruleId: 'amplify_top_slot',
        action: isEn
          ? 'Create a variant of the top slot to amplify the working signal.'
          : 'Crée une variante du meilleur créneau pour amplifier le signal qui fonctionne.',
        why: isEn
          ? `Top slot scored ${top.global_score}/100. A variant compounds the learning.`
          : `Le meilleur créneau a obtenu ${top.global_score}/100. Une variante capitalise sur l'apprentissage.`,
        impact: isEn
          ? 'Higher confidence on what works for this audience.'
          : "Meilleure confiance sur ce qui fonctionne pour cette audience.",
        effort: 'low',
        confidence: 'medium',
        linkedSlotId: top.slotId,
        preferenceKey: 'amplify_best_slot',
      });
    }
  }

  // Always cap to 5 to keep the surface readable.
  return out.slice(0, 5);
}

// -----------------------------------------------------------------------------
// A/B test idea
// -----------------------------------------------------------------------------

export function proposeABTest(
  plan: WeeklyPlan,
  metrics: SlotMetrics[],
  language: 'fr' | 'en' = 'fr',
): FeedbackTest {
  const isEn = language === 'en';
  const top = metrics.length > 0
    ? [...metrics].sort((a, b) => b.global_score - a.global_score)[0]!
    : undefined;

  const successMetric: PrimaryKpi = (() => {
    switch (plan.goal) {
      case 'visibility':
        return 'reach';
      case 'leads':
        return 'leads';
      case 'trust':
        return 'trust';
      case 'launch':
        return 'conversion';
      case 'reactivation':
        return 'engagement';
    }
  })();

  const hypothesis = isEn
    ? `If we lead with a proof anchor, ${successMetric} will rise on the same channel.`
    : `Si on ouvre par une preuve ancrée, ${successMetric} augmente sur le même canal.`;

  const variantA = isEn
    ? top
      ? `A — Same hook style as top slot (${top.primaryKpi}-driven).`
      : 'A — Open with a proof anchor (verbatim from brief).'
    : top
      ? `A — Même style de hook que le meilleur créneau (orienté ${PRIMARY_KPI_LABELS_FR[top.primaryKpi]}).`
      : 'A — Ouvre par une preuve ancrée (verbatim du brief).';

  const variantB = isEn
    ? 'B — Open with the audience pain (no proof first).'
    : "B — Ouvre par la douleur de l'audience (sans preuve en ouverture).";

  return {
    hypothesis,
    variantA,
    variantB,
    successMetric,
    durationDays: 7,
    decisionRule: isEn
      ? `Pick the variant with ≥10% higher ${successMetric} after 7 days; otherwise keep current.`
      : `Garde la variante avec ${successMetric} ≥10% supérieur après 7 jours ; sinon, conserve l'actuelle.`,
  };
}

// -----------------------------------------------------------------------------
// Stable id helper for FeedbackRecommendation persistence.
// -----------------------------------------------------------------------------

export function feedbackRecoId(planId: string, ruleId: string): string {
  return `${planId}:${ruleId}`;
}

/**
 * Convenience: build the persistable shape for a derived reco.
 */
export function toPersistedRecommendation(
  derived: DerivedRecommendation,
  offerId: string,
  planId: string,
  status: FeedbackRecommendationStatus = 'todo',
): FeedbackRecommendation {
  return {
    id: feedbackRecoId(planId, derived.ruleId),
    offerId,
    planId,
    ruleId: derived.ruleId,
    action: derived.action,
    why: derived.why,
    impact: derived.impact,
    effort: derived.effort,
    confidence: derived.confidence,
    linkedSlotId: derived.linkedSlotId,
    linkedAssetId: derived.linkedAssetId,
    status,
    preferenceKey: derived.preferenceKey,
  };
}

// -----------------------------------------------------------------------------
// Top-level orchestrator: one call to compute all feedback artifacts.
// -----------------------------------------------------------------------------

export interface FeedbackReport {
  metrics: SlotMetrics[];
  balance: BalanceReport;
  headlines: Headlines;
  recommendations: DerivedRecommendation[];
  abTest: FeedbackTest;
}

export function buildFeedbackReport(input: {
  offer: Offer;
  plan: WeeklyPlan;
  assets: Asset[];
  language?: 'fr' | 'en';
}): FeedbackReport {
  const { offer, plan, assets, language = 'fr' } = input;
  const considerable = plan.slots.filter(
    (s) => !s.free && (s.status === 'ready' || s.status === 'scheduled'),
  );
  const metricsPool = considerable.length > 0
    ? considerable
    : plan.slots.filter((s) => !s.free);
  const metrics = metricsPool.map((slot) =>
    computeSlotMetrics({
      offer,
      plan,
      slot,
      asset: assets.find((a) => a.id === slot.assetId),
    }),
  );
  const balance = computeBalance(plan);
  const headlines = computeHeadlines(metrics, balance, plan, language);
  const recommendations = deriveFeedbackRecommendations({
    offer,
    plan,
    metrics,
    balance,
    language,
  });
  const abTest = proposeABTest(plan, metrics, language);
  return { metrics, balance, headlines, recommendations, abTest };
}
