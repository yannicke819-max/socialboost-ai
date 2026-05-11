/**
 * Creative Test Plan v1 — pure module (AI-017H).
 *
 * Takes the AI-017F creative pack + AI-017G scorecards + the tier +
 * the platform context, and produces a **deterministic** ranked plan
 * of up to 3 priority tests. The plan exists so the user can move
 * from "I have concepts" to "I know what to test", without ever
 * publishing automatically.
 *
 * Hard rules:
 *   - No `fetch`, no `process.env`, no `Date.now()`, no `Math.random()`.
 *   - No publishing. `isPublishingPlan: false` is hardcoded on every
 *     plan; no campaign launch, no Stripe call, no Supabase write.
 *   - No performance prediction. `isPrediction: false` is hardcoded;
 *     the microcopy says scores do not predict results.
 *   - Test one variable at a time. The recommended variable per
 *     test is a single `CreativeTestVariable`.
 *   - At most 1 `breakthrough` concept in the top 3, and every
 *     breakthrough item carries `reviewRequired: true`.
 *
 * Free hard rule unaffected: the plan is pure data; producing it
 * consumes no credit.
 */

import type {
  CreativeBriefPack,
  CreativeImagePrompt,
  CreativeVideoPrompt,
} from './creative-brief-engine';
import type { CreativeQualityTier } from './creative-quality-tiers';
import type {
  CreativeOverallLabel,
  CreativePlatformContext,
  CreativeScorecard,
} from './creative-scoring';

// -----------------------------------------------------------------------------
// Public types
// -----------------------------------------------------------------------------

export const CREATIVE_TEST_VARIABLES = [
  'hook',
  'visual_angle',
  'proof_mechanism',
  'cta',
  'format',
  'audience_pain',
  'offer_framing',
] as const;
export type CreativeTestVariable = (typeof CREATIVE_TEST_VARIABLES)[number];

export const CREATIVE_TEST_METRICS = [
  'thumbstop_rate',
  'hold_rate',
  'ctr',
  'saves',
  'comments',
  'qualified_clicks',
  'demo_requests',
  'leads',
  'cpc',
  'cpa_proxy',
] as const;
export type CreativeTestMetric = (typeof CREATIVE_TEST_METRICS)[number];

export type ScoredConceptKind = 'image' | 'video' | 'storyboard';

export interface CreativeTestItem {
  id: string;
  conceptKind: ScoredConceptKind;
  conceptId: string;
  title: string;
  hypothesis: string;
  variableToTest: CreativeTestVariable;
  primaryMetric: CreativeTestMetric;
  secondaryMetric?: CreativeTestMetric;
  whyThisTest: string;
  expectedSignal: string;
  watchout: string;
  recommendedDuration: string;
  reviewRequired: boolean;
  /**
   * Short, human-readable summary that can be safely copied to the
   * clipboard along with the rest of the plan. No hidden metadata.
   */
  copyPromptSummary: string;
}

export interface CreativeTestPlan {
  recommendedOrder: CreativeTestItem[];
  platformContext: CreativePlatformContext;
  selectedTier: CreativeQualityTier;
  testBudgetNote: string;
  durationNote: string;
  safetyNote: string;
  /** Spec-pinned microcopy fields. */
  oneVariableAtATime: string;
  noAutomaticPublishing: string;
  scoresDoNotPredict: string;
  isPublishingPlan: false;
  isPrediction: false;
}

export interface BuildCreativeTestPlanInput {
  pack: CreativeBriefPack;
  imageScorecards: readonly CreativeScorecard[];
  videoScorecards: readonly CreativeScorecard[];
  storyboardScorecard: CreativeScorecard | null;
  selectedTier: CreativeQualityTier;
  /** Defaults to the first scorecard's platformContext, then `generic_social`. */
  platformContext?: CreativePlatformContext;
  /** Defaults to `'fr'`. */
  language?: 'fr' | 'en';
}

// -----------------------------------------------------------------------------
// Ranking
// -----------------------------------------------------------------------------

interface RankedCandidate {
  conceptKind: ScoredConceptKind;
  conceptId: string;
  title: string;
  scorecard: CreativeScorecard;
}

/** Lower number = better priority. */
function overallRank(label: CreativeOverallLabel): number {
  switch (label) {
    case 'strong_candidate':
      return 0;
    case 'safe_to_test':
      return 1;
    case 'needs_refinement':
      return 2;
    case 'review_required':
      return 3;
  }
}

/** Deterministic concept-id sort key — never timestamps. */
function tieBreak(c: RankedCandidate): string {
  return `${c.conceptKind}|${c.conceptId}`;
}

// -----------------------------------------------------------------------------
// Per-context metric selection
// -----------------------------------------------------------------------------

function primaryMetricFor(
  kind: ScoredConceptKind,
  ctx: CreativePlatformContext,
): { primary: CreativeTestMetric; secondary?: CreativeTestMetric } {
  if (ctx === 'linkedin_feed') {
    if (kind === 'image')
      return { primary: 'qualified_clicks', secondary: 'leads' };
    return { primary: 'qualified_clicks', secondary: 'demo_requests' };
  }
  if (ctx === 'tiktok') {
    if (kind === 'image') return { primary: 'ctr', secondary: 'saves' };
    return { primary: 'thumbstop_rate', secondary: 'hold_rate' };
  }
  if (ctx === 'instagram_reels') {
    if (kind === 'image') return { primary: 'saves', secondary: 'ctr' };
    return { primary: 'hold_rate', secondary: 'thumbstop_rate' };
  }
  if (ctx === 'youtube_shorts') {
    if (kind === 'image') return { primary: 'ctr', secondary: 'qualified_clicks' };
    return { primary: 'hold_rate', secondary: 'ctr' };
  }
  if (ctx === 'meta_feed') {
    if (kind === 'image')
      return { primary: 'ctr', secondary: 'qualified_clicks' };
    return { primary: 'thumbstop_rate', secondary: 'ctr' };
  }
  // generic_social
  if (kind === 'image') return { primary: 'ctr', secondary: 'saves' };
  return { primary: 'thumbstop_rate', secondary: 'ctr' };
}

// -----------------------------------------------------------------------------
// Per-tier variable selection
// -----------------------------------------------------------------------------

function variableFor(
  tier: CreativeQualityTier,
  kind: ScoredConceptKind,
): CreativeTestVariable {
  if (tier === 'safe') {
    return kind === 'image' ? 'offer_framing' : 'cta';
  }
  if (tier === 'social_proof') {
    return 'proof_mechanism';
  }
  if (tier === 'performance') {
    return kind === 'image' ? 'cta' : 'hook';
  }
  // breakthrough
  return 'visual_angle';
}

// -----------------------------------------------------------------------------
// Per-tier hypothesis + signals
// -----------------------------------------------------------------------------

interface TierHypothesisCopy {
  hypothesis: string;
  whyThisTest: string;
  expectedSignal: string;
  watchout: string;
}

function tierCopyFor(
  tier: CreativeQualityTier,
  kind: ScoredConceptKind,
  primaryMetric: CreativeTestMetric,
  isEn: boolean,
): TierHypothesisCopy {
  const metricLabel = METRIC_LABEL_FR[primaryMetric]; // FR primary; EN block follows.
  if (tier === 'safe') {
    return isEn
      ? {
          hypothesis:
            `A simple, brand-safe ${kind} that names the offer clearly will lift ${primaryMetric.replace('_', ' ')}.`,
          whyThisTest:
            'You need a clean baseline before testing bolder angles.',
          expectedSignal:
            'Stable, predictable performance; few negative comments.',
          watchout:
            'May plateau quickly — rotate after the baseline is set.',
        }
      : {
          hypothesis: `Un concept ${kind} simple et brand-safe, qui nomme l'offre, fait monter le ${metricLabel}.`,
          whyThisTest:
            "Tu as besoin d'une base propre avant de tester des angles plus audacieux.",
          expectedSignal:
            'Performance stable et prévisible ; peu de commentaires négatifs.',
          watchout:
            'Peut plafonner vite — fais tourner après avoir établi la base.',
        };
  }
  if (tier === 'social_proof') {
    return isEn
      ? {
          hypothesis:
            `A real ${kind} with authentic usage will improve credibility-driven ${primaryMetric.replace('_', ' ')}.`,
          whyThisTest: 'Audiences trust people, not slogans.',
          expectedSignal:
            'Higher save / share rate; positive sentiment in comments.',
          watchout:
            'Avoid any wording that could be read as a fabricated testimonial.',
        }
      : {
          hypothesis: `Un ${kind} réel, usage authentique, améliore le ${metricLabel} porté par la crédibilité.`,
          whyThisTest: 'Les audiences font confiance aux gens, pas aux slogans.',
          expectedSignal:
            'Taux de save / share plus élevé ; sentiment positif en commentaires.',
          watchout:
            'Eviter toute formulation qui ressemblerait à un faux témoignage.',
        };
  }
  if (tier === 'performance') {
    return isEn
      ? {
          hypothesis:
            `A 2-second hook with an explicit CTA improves ${primaryMetric.replace('_', ' ')} on the chosen platform.`,
          whyThisTest:
            'You need to learn whether the hook earns the next 5 seconds.',
          expectedSignal:
            'Higher thumbstop / hold rate in the first 2-3 seconds; clearer click intent.',
          watchout:
            "Watch CTA fatigue — vary the verb if the same hook runs more than 4 days.",
        }
      : {
          hypothesis: `Un hook de 2 secondes avec un CTA explicite améliore le ${metricLabel} sur la plateforme choisie.`,
          whyThisTest:
            "Il faut apprendre si le hook gagne les 5 secondes suivantes.",
          expectedSignal:
            'Thumbstop / hold rate plus élevé dans les 2-3 premières secondes ; intention de clic plus claire.',
          watchout:
            "Attention à la fatigue CTA — varie le verbe si le même hook tourne plus de 4 jours.",
        };
  }
  // breakthrough
  return isEn
    ? {
        hypothesis:
          `An unexpected ${kind} pattern interrupt earns disproportionate attention vs. baseline.`,
        whyThisTest:
          'Distinctiveness is the lever; brand recall matters more than direct ROAS.',
        expectedSignal:
          'Saves, shares, qualitative comments; unaided recall in surveys.',
        watchout:
          'Brand safety risk — review the concept manually before any paid run.',
      }
    : {
        hypothesis: `Un pattern interrupt ${kind} inattendu capte une attention disproportionnée vs. baseline.`,
        whyThisTest:
          'La distinctivité est le levier ; le brand recall compte plus que le ROAS direct.',
        expectedSignal:
          'Saves, partages, commentaires qualitatifs ; recall non-aidé en survey.',
        watchout:
          'Risque brand safety — revoir le concept manuellement avant tout boost payant.',
      };
}

const METRIC_LABEL_FR: Record<CreativeTestMetric, string> = {
  thumbstop_rate: 'thumbstop rate',
  hold_rate: 'hold rate',
  ctr: 'CTR',
  saves: 'saves',
  comments: 'commentaires qualitatifs',
  qualified_clicks: 'clics qualifiés',
  demo_requests: 'demandes de démo',
  leads: 'leads',
  cpc: 'CPC',
  cpa_proxy: 'proxy CPA',
};

// -----------------------------------------------------------------------------
// Duration note per tier
// -----------------------------------------------------------------------------

function durationFor(tier: CreativeQualityTier, isEn: boolean): string {
  if (tier === 'safe') {
    return isEn ? '5–7 days (baseline)' : '5–7 jours (baseline)';
  }
  if (tier === 'social_proof') {
    return isEn ? '5–7 days' : '5–7 jours';
  }
  if (tier === 'performance') {
    return isEn ? '3–5 days (rotate fast)' : '3–5 jours (rotation rapide)';
  }
  return isEn ? '3–4 days (after human review)' : '3–4 jours (après revue humaine)';
}

// -----------------------------------------------------------------------------
// Builder
// -----------------------------------------------------------------------------

export function buildCreativeTestPlan(
  input: BuildCreativeTestPlanInput,
): CreativeTestPlan {
  if (!input || !input.pack) {
    throw new Error('creative_test_plan_missing_pack');
  }
  const lang = input.language ?? 'fr';
  const isEn = lang === 'en';
  const tier = input.selectedTier;

  // -----------------------------------------------------------------------
  // Collect candidates from all concept kinds
  // -----------------------------------------------------------------------
  const candidates: RankedCandidate[] = [];
  for (let i = 0; i < input.pack.imageConcepts.length; i++) {
    const sc = input.imageScorecards[i];
    if (!sc) continue;
    const c = input.pack.imageConcepts[i] as CreativeImagePrompt;
    candidates.push({
      conceptKind: 'image',
      conceptId: c.id,
      title: c.title,
      scorecard: sc,
    });
  }
  for (let i = 0; i < input.pack.videoConcepts.length; i++) {
    const sc = input.videoScorecards[i];
    if (!sc) continue;
    const c = input.pack.videoConcepts[i] as CreativeVideoPrompt;
    candidates.push({
      conceptKind: 'video',
      conceptId: c.id,
      title: c.title,
      scorecard: sc,
    });
  }
  if (input.storyboardScorecard) {
    candidates.push({
      conceptKind: 'storyboard',
      conceptId: 'storyboard_15s',
      title:
        isEn ? '15-second storyboard' : 'Storyboard 15 secondes',
      scorecard: input.storyboardScorecard,
    });
  }

  // -----------------------------------------------------------------------
  // Sort by overall priority + deterministic tie-break (no timestamps).
  // -----------------------------------------------------------------------
  candidates.sort((a, b) => {
    const ra = overallRank(a.scorecard.overallLabel);
    const rb = overallRank(b.scorecard.overallLabel);
    if (ra !== rb) return ra - rb;
    return tieBreak(a).localeCompare(tieBreak(b));
  });

  // -----------------------------------------------------------------------
  // Pick top 3 with the breakthrough cap (max 1).
  // A "breakthrough" candidate is identified by:
  //   - tier === 'breakthrough' for the whole pack, OR
  //   - scorecard.overallLabel === 'review_required' (means brandSafety is
  //     needs_review, typically for breakthrough or human-review concepts).
  // -----------------------------------------------------------------------
  const isBreakthroughCandidate = (c: RankedCandidate): boolean =>
    tier === 'breakthrough' ||
    c.scorecard.overallLabel === 'review_required' ||
    c.scorecard.mainWatchout === 'brandSafety';

  const top: RankedCandidate[] = [];
  let breakthroughCount = 0;
  for (const c of candidates) {
    if (top.length >= 3) break;
    if (isBreakthroughCandidate(c)) {
      if (breakthroughCount >= 1) continue;
      breakthroughCount += 1;
    }
    top.push(c);
  }
  // If we ended up with fewer than 3 because of the breakthrough cap and
  // there are still candidates left, top up with the remaining items.
  if (top.length < 3) {
    for (const c of candidates) {
      if (top.length >= 3) break;
      if (top.find((t) => t.conceptId === c.conceptId && t.conceptKind === c.conceptKind)) continue;
      top.push(c);
    }
  }

  // -----------------------------------------------------------------------
  // Resolve platform context (input override → first scorecard → generic).
  // -----------------------------------------------------------------------
  const platformContext: CreativePlatformContext =
    input.platformContext ??
    candidates[0]?.scorecard.platformContext ??
    'generic_social';

  // -----------------------------------------------------------------------
  // Build each test item.
  // -----------------------------------------------------------------------
  const recommendedOrder: CreativeTestItem[] = top.map((c, i) => {
    const m = primaryMetricFor(c.conceptKind, platformContext);
    const tierKindCopy = tierCopyFor(tier, c.conceptKind, m.primary, isEn);
    const variable = variableFor(tier, c.conceptKind);
    const reviewRequired =
      c.scorecard.overallLabel === 'review_required' ||
      c.scorecard.mainWatchout === 'brandSafety' ||
      tier === 'breakthrough';
    const copyPromptSummary = [
      `${i + 1}. ${c.title}`,
      isEn
        ? `Hypothesis: ${tierKindCopy.hypothesis}`
        : `Hypothèse : ${tierKindCopy.hypothesis}`,
      isEn ? `Variable: ${variable}` : `Variable : ${variable}`,
      isEn
        ? `Primary metric: ${m.primary}`
        : `Métrique principale : ${METRIC_LABEL_FR[m.primary]}`,
      isEn
        ? `Duration: ${durationFor(tier, true)}`
        : `Durée : ${durationFor(tier, false)}`,
      reviewRequired
        ? isEn
          ? 'Human review required before launch.'
          : 'Revue humaine obligatoire avant lancement.'
        : '',
    ]
      .filter(Boolean)
      .join('\n');

    return {
      id: `test_${i + 1}_${c.conceptKind}_${c.conceptId}`,
      conceptKind: c.conceptKind,
      conceptId: c.conceptId,
      title: c.title,
      hypothesis: tierKindCopy.hypothesis,
      variableToTest: variable,
      primaryMetric: m.primary,
      secondaryMetric: m.secondary,
      whyThisTest: tierKindCopy.whyThisTest,
      expectedSignal: tierKindCopy.expectedSignal,
      watchout: tierKindCopy.watchout,
      recommendedDuration: durationFor(tier, isEn),
      reviewRequired,
      copyPromptSummary,
    };
  });

  const oneVariableAtATime = isEn
    ? 'Indicative plan: test one variable at a time.'
    : 'Plan indicatif : teste une variable à la fois.';
  const noAutomaticPublishing = isEn
    ? "SocialBoost does not publish anything automatically."
    : "SocialBoost ne publie rien automatiquement.";
  const scoresDoNotPredict = isEn
    ? 'Scores do not predict results — they help pick what to test.'
    : 'Les scores ne prédisent pas les résultats ; ils aident à choisir quoi tester.';
  const testBudgetNote = isEn
    ? 'Budget per test: minimal — enough to learn, not enough to optimise.'
    : 'Budget par test : minimal — assez pour apprendre, pas pour optimiser.';
  const durationNote = isEn
    ? 'Per-test duration is indicative; rotate fast if a variant under-performs.'
    : 'Durée par test indicative ; fais tourner vite si une variante sous-performe.';
  const safetyNote = isEn
    ? 'Never run a breakthrough concept without a human review.'
    : "Ne jamais lancer un concept breakthrough sans revue humaine.";

  return {
    recommendedOrder,
    platformContext,
    selectedTier: tier,
    testBudgetNote,
    durationNote,
    safetyNote,
    oneVariableAtATime,
    noAutomaticPublishing,
    scoresDoNotPredict,
    isPublishingPlan: false,
    isPrediction: false,
  };
}

// -----------------------------------------------------------------------------
// Human-readable plan text (for the single "Copier le plan de test" button).
// Pure: no I/O.
// -----------------------------------------------------------------------------

export function creativeTestPlanToText(plan: CreativeTestPlan): string {
  const lines: string[] = [];
  lines.push('Plan de test créatif');
  lines.push(`Contexte : ${plan.platformContext}`);
  lines.push(`Direction créative : ${plan.selectedTier}`);
  lines.push('');
  lines.push(plan.oneVariableAtATime);
  lines.push(plan.noAutomaticPublishing);
  lines.push(plan.scoresDoNotPredict);
  lines.push('');
  for (const t of plan.recommendedOrder) {
    lines.push(`— ${t.title} (${t.conceptKind})`);
    lines.push(`  Hypothèse : ${t.hypothesis}`);
    lines.push(`  Variable : ${t.variableToTest}`);
    lines.push(`  Métrique principale : ${METRIC_LABEL_FR[t.primaryMetric] ?? t.primaryMetric}`);
    if (t.secondaryMetric) {
      lines.push(`  Métrique secondaire : ${METRIC_LABEL_FR[t.secondaryMetric] ?? t.secondaryMetric}`);
    }
    lines.push(`  Pourquoi : ${t.whyThisTest}`);
    lines.push(`  Signal attendu : ${t.expectedSignal}`);
    lines.push(`  À surveiller : ${t.watchout}`);
    lines.push(`  Durée : ${t.recommendedDuration}`);
    if (t.reviewRequired) {
      lines.push('  Revue humaine obligatoire avant lancement.');
    }
    lines.push('');
  }
  lines.push(plan.testBudgetNote);
  lines.push(plan.durationNote);
  lines.push(plan.safetyNote);
  return lines.join('\n');
}
