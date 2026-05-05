import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { deriveRecommendations, RECOMMENDATION_RULE_IDS } from '../recommendations';
import type { Asset, CalendarSlot, Offer } from '../types';

const makeOffer = (over: Partial<Offer> = {}): Offer => ({
  id: 'ofr_reco_1',
  name: 'Reco Test',
  status: 'draft',
  goal: 'clarify_offer',
  language: 'fr',
  brief: {
    businessName: 'Brand',
    offer: 'an offer',
    tone: 'professional',
    language: 'fr',
    platforms: ['linkedin'],
    proofPoints: ['12 cas testés'],
  },
  confidence_score: 80,
  createdAt: '2026-05-04T00:00:00.000Z',
  updatedAt: '2026-05-04T00:00:00.000Z',
  ...over,
});

const a = (over: Partial<Asset>): Asset => ({
  id: 'ast',
  offerId: 'ofr_reco_1',
  kind: 'hook',
  body: '',
  dimensions: ['asset'],
  status: 'draft',
  source: 'mock',
  createdAt: '2026-05-04T00:00:00Z',
  ...over,
});

describe('deriveRecommendations — global', () => {
  it('returns at most 8 recommendations', () => {
    const o = makeOffer({ confidence_score: 30, brief: { ...makeOffer().brief, platforms: [], proofPoints: [] } });
    const recs = deriveRecommendations(o, [], [], 'fr');
    assert.ok(recs.length <= 8);
  });

  it('every recommendation id is `${offerId}:${ruleId}` and stable', () => {
    const o = makeOffer({ confidence_score: 50 });
    const r1 = deriveRecommendations(o, [], [], 'fr');
    const r2 = deriveRecommendations(o, [], [], 'fr');
    assert.deepEqual(r1.map((r) => r.id), r2.map((r) => r.id));
    for (const r of r1) {
      assert.equal(r.id, `${o.id}:${r.ruleId}`);
      assert.ok(RECOMMENDATION_RULE_IDS.includes(r.ruleId));
    }
  });
});

describe('rule: add_proof_low_confidence', () => {
  it('triggers when confidence_score < 70', () => {
    const recs = deriveRecommendations(makeOffer({ confidence_score: 60 }), [], [], 'fr');
    assert.ok(recs.some((r) => r.ruleId === 'add_proof_low_confidence'));
  });
  it('does NOT trigger when confidence_score >= 70', () => {
    const recs = deriveRecommendations(makeOffer({ confidence_score: 80 }), [], [], 'fr');
    assert.equal(recs.some((r) => r.ruleId === 'add_proof_low_confidence'), false);
  });
});

describe('rule: try_email_channel', () => {
  it('triggers when no email asset', () => {
    const recs = deriveRecommendations(makeOffer(), [], [], 'fr');
    assert.ok(recs.some((r) => r.ruleId === 'try_email_channel'));
  });
  it('does NOT trigger when email asset present', () => {
    const recs = deriveRecommendations(
      makeOffer(),
      [a({ kind: 'email', body: 'an email' })],
      [],
      'fr',
    );
    assert.equal(recs.some((r) => r.ruleId === 'try_email_channel'), false);
  });
});

describe('rule: add_linkedin_post', () => {
  it('triggers when no LinkedIn social_post asset', () => {
    const recs = deriveRecommendations(makeOffer(), [], [], 'fr');
    assert.ok(recs.some((r) => r.ruleId === 'add_linkedin_post'));
  });
  it('does NOT trigger when a LinkedIn post exists', () => {
    const recs = deriveRecommendations(
      makeOffer(),
      [a({ kind: 'social_post', channel: 'linkedin', body: 'post' })],
      [],
      'fr',
    );
    assert.equal(recs.some((r) => r.ruleId === 'add_linkedin_post'), false);
  });
});

describe('rule: diversify_channels', () => {
  it('triggers with one platform', () => {
    const recs = deriveRecommendations(
      makeOffer({ brief: { ...makeOffer().brief, platforms: ['linkedin'] } }),
      [],
      [],
      'fr',
    );
    assert.ok(recs.some((r) => r.ruleId === 'diversify_channels'));
  });
  it('does NOT trigger with two+ platforms', () => {
    const recs = deriveRecommendations(
      makeOffer({ brief: { ...makeOffer().brief, platforms: ['linkedin', 'email'] } }),
      [],
      [],
      'fr',
    );
    assert.equal(recs.some((r) => r.ruleId === 'diversify_channels'), false);
  });
});

describe('rule: schedule_three_slots (social_content goal)', () => {
  it('triggers when goal=social_content + slots < 3', () => {
    const recs = deriveRecommendations(
      makeOffer({ goal: 'social_content' }),
      [],
      [],
      'fr',
    );
    assert.ok(recs.some((r) => r.ruleId === 'schedule_three_slots'));
  });
  it('does NOT trigger when goal=clarify_offer', () => {
    const recs = deriveRecommendations(makeOffer({ goal: 'clarify_offer' }), [], [], 'fr');
    assert.equal(recs.some((r) => r.ruleId === 'schedule_three_slots'), false);
  });
  it('does NOT trigger when goal=social_content + 3+ slots', () => {
    const slots: CalendarSlot[] = [1, 2, 3].map((i) => ({
      id: `s${i}`,
      offerId: 'ofr_reco_1',
      channel: 'linkedin',
      scheduledAt: `2026-05-${i + 5}T00:00:00Z`,
      status: 'planned',
      createdAt: '2026-05-04T00:00:00Z',
    }));
    const recs = deriveRecommendations(makeOffer({ goal: 'social_content' }), [], slots, 'fr');
    assert.equal(recs.some((r) => r.ruleId === 'schedule_three_slots'), false);
  });
});

describe('rule: approve_first_asset', () => {
  it('triggers when assets present + none approved', () => {
    const recs = deriveRecommendations(
      makeOffer(),
      [a({ kind: 'hook', status: 'draft' })],
      [],
      'fr',
    );
    assert.ok(recs.some((r) => r.ruleId === 'approve_first_asset'));
  });
  it('does NOT trigger when no assets at all', () => {
    const recs = deriveRecommendations(makeOffer(), [], [], 'fr');
    assert.equal(recs.some((r) => r.ruleId === 'approve_first_asset'), false);
  });
  it('does NOT trigger when at least one asset approved', () => {
    const recs = deriveRecommendations(
      makeOffer(),
      [a({ kind: 'hook', status: 'approved' })],
      [],
      'fr',
    );
    assert.equal(recs.some((r) => r.ruleId === 'approve_first_asset'), false);
  });
});

describe('language passthrough', () => {
  it('FR titles in fr mode', () => {
    const recs = deriveRecommendations(makeOffer({ confidence_score: 50 }), [], [], 'fr');
    assert.ok(recs.find((r) => /Ajoutez|Tester|Créer|Diversifier/.test(r.title)));
  });
  it('EN titles in en mode', () => {
    const recs = deriveRecommendations(makeOffer({ confidence_score: 50 }), [], [], 'en');
    assert.ok(recs.find((r) => /Add|Try|Create|Diversify/.test(r.title)));
  });
});
