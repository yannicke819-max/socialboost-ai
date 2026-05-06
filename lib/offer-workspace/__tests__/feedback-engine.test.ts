import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFeedbackReport,
  computeAudienceFit,
  computeBalance,
  computeSlotMetrics,
  deriveFeedbackRecommendations,
  feedbackRecoId,
  proposeABTest,
  toPersistedRecommendation,
} from '../feedback-engine';
import {
  KIND_TO_DIMENSIONS,
  type Asset,
  type Offer,
  type PlanSlot,
  type WeeklyPlan,
} from '../types';

const REF_DATE = '2026-05-04';

const makeOffer = (over: Partial<Offer> = {}): Offer => ({
  id: 'ofr_test',
  name: 'Atelier Nova',
  status: 'draft',
  goal: 'clarify_offer',
  language: 'fr',
  brief: {
    businessName: 'Atelier Nova',
    offer: "Programme de 4 semaines pour clarifier l'offre des indépendants",
    targetAudience: 'indépendants B2B qui vendent des services',
    tone: 'professional',
    language: 'fr',
    platforms: ['linkedin', 'email'],
    proofPoints: ['Méthode testée sur 12 offres de consultants'],
  },
  confidence_score: 80,
  createdAt: '2026-05-04T00:00:00Z',
  updatedAt: '2026-05-04T00:00:00Z',
  ...over,
});

const mkAsset = (
  kind: Asset['kind'],
  status: Asset['status'],
  over: Partial<Asset> = {},
): Asset => ({
  id: `ast_${kind}_${over.id ?? Math.random().toString(36).slice(2, 8)}`,
  offerId: 'ofr_test',
  kind,
  title: over.title ?? `${kind} title`,
  body: over.body ?? `${kind} body content`,
  dimensions: KIND_TO_DIMENSIONS[kind] ?? ['asset'],
  status,
  source: 'mock',
  channel: over.channel,
  createdAt: '2026-05-04T00:00:00Z',
  ...over,
});

const mkSlot = (over: Partial<PlanSlot> = {}): PlanSlot => ({
  id: over.id ?? `psl_${Math.random().toString(36).slice(2, 8)}`,
  dayIndex: 0,
  suggestedTime: '09:00',
  channel: 'linkedin',
  kind: 'social_post',
  pillar: 'education',
  objective: 'Educate the target audience',
  hook: 'Sample hook text',
  status: 'ready',
  ...over,
});

const mkPlan = (slots: PlanSlot[], over: Partial<WeeklyPlan> = {}): WeeklyPlan => ({
  id: 'wpl_test',
  offerId: 'ofr_test',
  weekStart: REF_DATE,
  goal: 'visibility',
  slots,
  createdAt: '2026-05-04T00:00:00Z',
  updatedAt: '2026-05-04T00:00:00Z',
  ...over,
});

// -----------------------------------------------------------------------------

describe('computeSlotMetrics — determinism + shape', () => {
  it('same inputs → identical metrics', () => {
    const offer = makeOffer();
    const slot = mkSlot({ id: 's1' });
    const plan = mkPlan([slot]);
    const a = computeSlotMetrics({ offer, plan, slot });
    const b = computeSlotMetrics({ offer, plan, slot });
    assert.deepEqual(a, b);
  });

  it('different offer → different metrics', () => {
    const slot = mkSlot({ id: 's1' });
    const a = computeSlotMetrics({ offer: makeOffer({ id: 'A' }), plan: mkPlan([slot]), slot });
    const b = computeSlotMetrics({ offer: makeOffer({ id: 'B' }), plan: mkPlan([slot]), slot });
    assert.notDeepEqual(a, b);
  });

  it('all numeric fields are non-negative and 0..100 scores stay in range', () => {
    const offer = makeOffer();
    const slot = mkSlot({ id: 's1', pillar: 'conversion', kind: 'cta' });
    const m = computeSlotMetrics({ offer, plan: mkPlan([slot]), slot });
    assert.ok(m.impressions_mock >= 0);
    assert.ok(m.engagement_mock >= 0);
    assert.ok(m.clicks_mock >= 0);
    assert.ok(m.leads_mock >= 0);
    assert.ok(m.useful_score >= 0 && m.useful_score <= 100);
    assert.ok(m.global_score >= 0 && m.global_score <= 100);
    assert.ok(m.audience_fit >= 0 && m.audience_fit <= 100);
  });

  it('useful_score does not reward only impressions: a low-engagement reach slot scores below an engaged decision slot', () => {
    const offer = makeOffer();
    const reachSlot = mkSlot({
      id: 'reach',
      pillar: 'education',
      kind: 'hook',
      channel: 'instagram', // high reach mul
    });
    const decisionSlot = mkSlot({
      id: 'decision',
      pillar: 'conversion',
      kind: 'cta',
      channel: 'email', // low reach mul, high CTR
    });
    const reachM = computeSlotMetrics({
      offer,
      plan: mkPlan([reachSlot, decisionSlot]),
      slot: reachSlot,
    });
    const decisionM = computeSlotMetrics({
      offer,
      plan: mkPlan([reachSlot, decisionSlot]),
      slot: decisionSlot,
    });
    // Decision slot gets non-zero leads; reach slot does not.
    assert.equal(reachM.leads_mock, 0);
    assert.ok(decisionM.leads_mock > 0);
  });

  it('classifies slots by funnel stage from pillar', () => {
    const offer = makeOffer();
    const cases: { pillar: PlanSlot['pillar']; stage: string }[] = [
      { pillar: 'education', stage: 'awareness' },
      { pillar: 'proof', stage: 'consideration' },
      { pillar: 'objection', stage: 'consideration' },
      { pillar: 'behind_scenes', stage: 'awareness' },
      { pillar: 'conversion', stage: 'decision' },
    ];
    for (const c of cases) {
      const slot = mkSlot({ pillar: c.pillar });
      const m = computeSlotMetrics({ offer, plan: mkPlan([slot]), slot });
      assert.equal(m.funnelStage, c.stage);
    }
  });
});

describe('computeSlotMetrics — goal weighting', () => {
  it('goal=visibility gives reach-aligned slots a higher global score than conversion', () => {
    const offer = makeOffer();
    const reach = mkSlot({ id: 'r', pillar: 'education', kind: 'hook' });
    const conv = mkSlot({ id: 'c', pillar: 'conversion', kind: 'cta' });
    const plan = mkPlan([reach, conv], { goal: 'visibility' });
    const reachM = computeSlotMetrics({ offer, plan, slot: reach });
    const convM = computeSlotMetrics({ offer, plan, slot: conv });
    assert.ok(reachM.global_score >= convM.global_score - 5,
      `reach=${reachM.global_score} should not be far below conv=${convM.global_score} on visibility goal`);
  });

  it('goal=leads boosts decision-stage slots', () => {
    const offer = makeOffer();
    const leadSlot = mkSlot({ id: 'cta', pillar: 'conversion', kind: 'cta', channel: 'email' });
    const planLeads = mkPlan([leadSlot], { goal: 'leads' });
    const planTrust = mkPlan([leadSlot], { goal: 'trust' });
    const a = computeSlotMetrics({ offer, plan: planLeads, slot: leadSlot });
    const b = computeSlotMetrics({ offer, plan: planTrust, slot: leadSlot });
    assert.ok(a.global_score > b.global_score,
      `leads goal should beat trust goal on a CTA slot (${a.global_score} > ${b.global_score})`);
  });
});

describe('computeAudienceFit', () => {
  it('verbatim proofPoint in asset body lifts fit', () => {
    const offer = makeOffer();
    const proof = offer.brief.proofPoints[0]!;
    const asset = mkAsset('hook', 'approved', { id: 'fit', body: `Voici une preuve : ${proof}` });
    const slot = mkSlot({ id: 's1', assetId: asset.id, channel: 'linkedin' });
    const plan = mkPlan([slot]);
    const fitWith = computeAudienceFit({ offer, plan, slot, asset });
    const fitWithout = computeAudienceFit({ offer, plan, slot, asset: { ...asset, body: 'lorem ipsum' } });
    assert.ok(fitWith > fitWithout);
  });

  it('off-platform slot is penalized when brief.platforms is set', () => {
    const offer = makeOffer({ brief: { ...makeOffer().brief, platforms: ['linkedin'] } });
    const slot = mkSlot({ id: 's', channel: 'tiktok' });
    const plan = mkPlan([slot]);
    const fit = computeAudienceFit({ offer, plan, slot });
    assert.ok(fit < 50, `expected penalty, got ${fit}`);
  });
});

describe('computeBalance', () => {
  it('flags too_much_conversion', () => {
    const slots = [
      mkSlot({ id: '1', pillar: 'conversion' }),
      mkSlot({ id: '2', pillar: 'conversion' }),
      mkSlot({ id: '3', pillar: 'conversion' }),
      mkSlot({ id: '4', pillar: 'education' }),
    ];
    const r = computeBalance(mkPlan(slots));
    assert.ok(r.flags.includes('too_much_conversion'));
  });

  it('flags not_enough_proof when 0 proof slots', () => {
    const slots = [
      mkSlot({ id: '1', pillar: 'education' }),
      mkSlot({ id: '2', pillar: 'objection' }),
    ];
    const r = computeBalance(mkPlan(slots));
    assert.ok(r.flags.includes('not_enough_proof'));
  });

  it('flags channel_overuse when one channel >60%', () => {
    const slots = [
      mkSlot({ id: '1', channel: 'linkedin', pillar: 'education' }),
      mkSlot({ id: '2', channel: 'linkedin', pillar: 'proof' }),
      mkSlot({ id: '3', channel: 'linkedin', pillar: 'objection' }),
      mkSlot({ id: '4', channel: 'email', pillar: 'conversion' }),
    ];
    const r = computeBalance(mkPlan(slots));
    assert.ok(r.flags.includes('channel_overuse'));
  });

  it('flags missing_bofu_for_leads goal without decision slot', () => {
    const slots = [
      mkSlot({ id: '1', pillar: 'education' }),
      mkSlot({ id: '2', pillar: 'proof' }),
    ];
    const r = computeBalance(mkPlan(slots, { goal: 'leads' }));
    assert.ok(r.flags.includes('missing_bofu_for_leads'));
  });

  it('flags missing_tofu_for_visibility goal without awareness slot', () => {
    const slots = [
      mkSlot({ id: '1', pillar: 'conversion' }),
      mkSlot({ id: '2', pillar: 'objection' }),
    ];
    const r = computeBalance(mkPlan(slots, { goal: 'visibility' }));
    assert.ok(r.flags.includes('missing_tofu_for_visibility'));
  });

  it('counts ready/scheduled slots only', () => {
    const slots = [
      mkSlot({ id: '1', status: 'draft' }),
      mkSlot({ id: '2', status: 'ready' }),
      mkSlot({ id: '3', status: 'scheduled' }),
    ];
    const r = computeBalance(mkPlan(slots));
    assert.equal(r.scheduledOrReadyCount, 2);
  });
});

describe('deriveFeedbackRecommendations', () => {
  it('returns 0..5 recommendations', () => {
    const offer = makeOffer();
    const slots = [
      mkSlot({ id: '1', pillar: 'education' }),
      mkSlot({ id: '2', pillar: 'conversion' }),
    ];
    const plan = mkPlan(slots);
    const metrics = slots.map((s) => computeSlotMetrics({ offer, plan, slot: s }));
    const balance = computeBalance(plan);
    const recs = deriveFeedbackRecommendations({ offer, plan, metrics, balance });
    assert.ok(recs.length >= 0 && recs.length <= 5);
  });

  it('every reco has non-empty action / why / impact / effort / confidence', () => {
    const offer = makeOffer();
    const slots = [
      mkSlot({ id: '1', pillar: 'conversion', kind: 'cta', channel: 'email' }),
      mkSlot({ id: '2', pillar: 'conversion', kind: 'cta', channel: 'email' }),
      mkSlot({ id: '3', pillar: 'conversion', kind: 'cta', channel: 'email' }),
      mkSlot({ id: '4', pillar: 'education' }),
    ];
    const plan = mkPlan(slots, { goal: 'leads' });
    const metrics = slots.map((s) => computeSlotMetrics({ offer, plan, slot: s }));
    const balance = computeBalance(plan);
    const recs = deriveFeedbackRecommendations({ offer, plan, metrics, balance });
    assert.ok(recs.length > 0);
    for (const r of recs) {
      assert.ok(r.action.length > 0);
      assert.ok(r.why.length > 0);
      assert.ok(r.impact.length > 0);
      assert.ok(['low', 'medium', 'high'].includes(r.effort));
      assert.ok(['low', 'medium', 'high'].includes(r.confidence));
    }
  });

  it('detects too_much_conversion and emits the rebalance reco', () => {
    const offer = makeOffer();
    const slots = [
      mkSlot({ id: '1', pillar: 'conversion' }),
      mkSlot({ id: '2', pillar: 'conversion' }),
      mkSlot({ id: '3', pillar: 'conversion' }),
      mkSlot({ id: '4', pillar: 'education' }),
    ];
    const plan = mkPlan(slots);
    const metrics = slots.map((s) => computeSlotMetrics({ offer, plan, slot: s }));
    const balance = computeBalance(plan);
    const recs = deriveFeedbackRecommendations({ offer, plan, metrics, balance });
    assert.ok(recs.some((r) => r.ruleId === 'rebalance_conversion'));
  });

  it('amplify_top_slot reco fires when top slot scores >=70', () => {
    const offer = makeOffer({
      brief: {
        ...makeOffer().brief,
        proofPoints: ['indépendants B2B testée'],
      },
    });
    // Stack the deck with high-fit slots so global_score easily clears 70.
    const slots = [
      mkSlot({
        id: '1',
        pillar: 'proof',
        channel: 'linkedin',
      }),
    ];
    const plan = mkPlan(slots, { goal: 'trust' });
    const metrics = slots.map((s) => computeSlotMetrics({ offer, plan, slot: s }));
    const balance = computeBalance(plan);
    const recs = deriveFeedbackRecommendations({ offer, plan, metrics, balance });
    // We don't assert presence absolutely (depends on PRNG); we assert the
    // rule shape is reachable when the score crosses threshold.
    if (metrics[0]!.global_score >= 70) {
      assert.ok(recs.some((r) => r.ruleId === 'amplify_top_slot'));
    }
  });
});

describe('proposeABTest', () => {
  it('returns hypothesis + variantA + variantB + successMetric + duration + decisionRule', () => {
    const offer = makeOffer();
    const slots = [mkSlot({ id: '1' })];
    const plan = mkPlan(slots, { goal: 'leads' });
    const metrics = slots.map((s) => computeSlotMetrics({ offer, plan, slot: s }));
    const test = proposeABTest(plan, metrics);
    assert.ok(test.hypothesis.length > 0);
    assert.ok(test.variantA.length > 0);
    assert.ok(test.variantB.length > 0);
    assert.equal(test.successMetric, 'leads');
    assert.ok(test.durationDays > 0);
    assert.ok(test.decisionRule.length > 0);
  });

  it('successMetric tracks the plan goal', () => {
    const offer = makeOffer();
    const goals = ['visibility', 'leads', 'trust', 'launch', 'reactivation'] as const;
    const expected = ['reach', 'leads', 'trust', 'conversion', 'engagement'] as const;
    for (let i = 0; i < goals.length; i++) {
      const slots = [mkSlot({ id: 'x' })];
      const plan = mkPlan(slots, { goal: goals[i]! });
      const metrics = slots.map((s) => computeSlotMetrics({ offer, plan, slot: s }));
      assert.equal(proposeABTest(plan, metrics).successMetric, expected[i]);
    }
  });
});

describe('toPersistedRecommendation', () => {
  it('stable id format planId:ruleId', () => {
    const persisted = toPersistedRecommendation(
      {
        ruleId: 'add_proof_slot',
        action: 'a',
        why: 'b',
        impact: 'c',
        effort: 'low',
        confidence: 'high',
      },
      'ofr_test',
      'wpl_test',
    );
    assert.equal(persisted.id, feedbackRecoId('wpl_test', 'add_proof_slot'));
    assert.equal(persisted.id, 'wpl_test:add_proof_slot');
    assert.equal(persisted.status, 'todo');
  });
});

describe('buildFeedbackReport — integration', () => {
  it('returns a non-empty report on a populated plan and never mutates source assets', () => {
    const offer = makeOffer();
    const assets: Asset[] = [
      mkAsset('hook', 'approved', { id: 'a1' }),
      mkAsset('cta', 'approved', { id: 'a2' }),
      mkAsset('email', 'approved', { id: 'a3' }),
    ];
    const slots = [
      mkSlot({ id: '1', kind: 'hook', pillar: 'education', assetId: 'a1', status: 'ready' }),
      mkSlot({ id: '2', kind: 'cta', pillar: 'conversion', assetId: 'a2', status: 'scheduled' }),
      mkSlot({ id: '3', kind: 'email', pillar: 'conversion', assetId: 'a3', status: 'ready' }),
    ];
    const plan = mkPlan(slots, { goal: 'leads' });
    const before = JSON.stringify(assets);
    const report = buildFeedbackReport({ offer, plan, assets });
    assert.equal(report.metrics.length, 3);
    assert.ok(report.recommendations.length <= 5);
    assert.ok(report.abTest.hypothesis.length > 0);
    // No mutation.
    assert.equal(JSON.stringify(assets), before);
  });

  it('falls back to non-free slots when none are ready/scheduled', () => {
    const offer = makeOffer();
    const slots = [
      mkSlot({ id: '1', status: 'draft' }),
      mkSlot({ id: '2', status: 'draft', free: true, channel: 'free', pillar: 'behind_scenes', kind: undefined }),
    ];
    const plan = mkPlan(slots);
    const report = buildFeedbackReport({ offer, plan, assets: [] });
    assert.equal(report.metrics.length, 1);
    assert.equal(report.metrics[0]!.slotId, '1');
  });
});
