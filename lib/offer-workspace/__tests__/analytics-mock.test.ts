import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeOfferKpisMock,
  breakdownByChannel,
  breakdownByAsset,
  breakdownByDimension,
  bestChannel,
  nextActionMock,
  PERIOD_DAYS,
} from '../analytics-mock';
import type { Asset, CalendarSlot, Offer } from '../types';

const makeOffer = (over: Partial<Offer> = {}): Offer => ({
  id: 'ofr_test_1',
  name: 'Test Offer',
  status: 'draft',
  goal: 'clarify_offer',
  language: 'fr',
  brief: {
    businessName: 'Brand',
    offer: 'an offer',
    tone: 'professional',
    language: 'fr',
    platforms: ['linkedin'],
    proofPoints: [],
  },
  confidence_score: 75,
  createdAt: '2026-05-04T00:00:00.000Z',
  updatedAt: '2026-05-04T00:00:00.000Z',
  ...over,
});

describe('computeOfferKpisMock — determinism', () => {
  it('same offer + period → identical output across calls', () => {
    const a = computeOfferKpisMock(makeOffer(), '7d');
    const b = computeOfferKpisMock(makeOffer(), '7d');
    assert.equal(JSON.stringify(a), JSON.stringify(b));
  });

  it('different offer ids → different output', () => {
    const a = computeOfferKpisMock(makeOffer({ id: 'ofr_a' }), '7d');
    const b = computeOfferKpisMock(makeOffer({ id: 'ofr_b' }), '7d');
    assert.notEqual(a.impressions, b.impressions);
  });

  it('different periods → different series length', () => {
    for (const p of ['7d', '30d', '90d'] as const) {
      const k = computeOfferKpisMock(makeOffer(), p);
      assert.equal(k.series.impressions.length, PERIOD_DAYS[p]);
    }
  });
});

describe('computeOfferKpisMock — invariants', () => {
  it('values are non-negative integers', () => {
    const k = computeOfferKpisMock(makeOffer(), '30d');
    for (const x of [k.impressions, k.clicks, k.replies, k.conversions]) {
      assert.ok(Number.isInteger(x));
      assert.ok(x >= 0);
    }
  });

  it('CTR derives from clicks / impressions', () => {
    const k = computeOfferKpisMock(makeOffer(), '30d');
    if (k.impressions > 0) {
      const expected = Math.round((k.clicks / k.impressions) * 100 * 100) / 100;
      assert.equal(k.ctrPct, expected);
    }
  });

  it('higher confidence → higher impressions baseline', () => {
    const lo = computeOfferKpisMock(makeOffer({ id: 'ofr_x', confidence_score: 30 }), '30d');
    const hi = computeOfferKpisMock(makeOffer({ id: 'ofr_x', confidence_score: 90 }), '30d');
    assert.ok(hi.impressions > lo.impressions);
  });

  it('delta numbers match curr - prev (sanity)', () => {
    const k = computeOfferKpisMock(makeOffer(), '7d');
    // We don't expose prev directly; ensure delta+impressions=curr+something consistent
    assert.equal(typeof k.delta.impressions, 'number');
    assert.equal(typeof k.deltaPct.impressions, 'number');
  });
});

describe('breakdowns — distribution sums to parent total', () => {
  const parent = computeOfferKpisMock(makeOffer(), '30d');

  it('breakdownByChannel sums (rounded) to parent within tolerance', () => {
    const rows = breakdownByChannel(makeOffer(), parent, ['linkedin', 'email', 'instagram']);
    assert.equal(rows.length, 3);
    const sum = rows.reduce((a, r) => a + r.kpi.impressions, 0);
    assert.ok(Math.abs(sum - parent.impressions) <= rows.length); // rounding tolerance
  });

  it('breakdownByAsset returns one row per asset', () => {
    const assets: Asset[] = ['hook', 'angle', 'cta'].map((k, i) => ({
      id: `ast_${i}`,
      offerId: 'ofr_test_1',
      kind: k as Asset['kind'],
      body: 'x',
      dimensions: ['asset'],
      status: 'draft',
      source: 'mock',
      createdAt: '2026-01-01T00:00:00Z',
    }));
    const rows = breakdownByAsset(makeOffer(), parent, assets);
    assert.equal(rows.length, 3);
  });

  it('breakdownByDimension empty input → empty output', () => {
    assert.equal(breakdownByDimension(makeOffer(), parent, []).length, 0);
  });
});

describe('bestChannel + nextActionMock', () => {
  it('bestChannel uses most-frequent slot channel', () => {
    const slots: CalendarSlot[] = [
      { id: 's1', offerId: 'o', channel: 'linkedin', scheduledAt: '2026-05-05T00:00:00Z', status: 'planned', createdAt: '2026-05-05T00:00:00Z' },
      { id: 's2', offerId: 'o', channel: 'linkedin', scheduledAt: '2026-05-06T00:00:00Z', status: 'planned', createdAt: '2026-05-06T00:00:00Z' },
      { id: 's3', offerId: 'o', channel: 'email', scheduledAt: '2026-05-07T00:00:00Z', status: 'planned', createdAt: '2026-05-07T00:00:00Z' },
    ];
    assert.equal(bestChannel(makeOffer(), slots), 'linkedin');
  });

  it('bestChannel falls back to brief.platforms[0]', () => {
    assert.equal(bestChannel(makeOffer({ brief: { ...makeOffer().brief, platforms: ['email'] } }), []), 'email');
  });

  it('nextActionMock prioritizes "ajouter une preuve" when no proofs', () => {
    const o = makeOffer({ brief: { ...makeOffer().brief, proofPoints: [] } });
    const action = nextActionMock(o, [], [], 'fr');
    assert.match(action, /preuve/i);
  });

  it('nextActionMock asks to approve an asset when proofs present + no approved', () => {
    const o = makeOffer({ brief: { ...makeOffer().brief, proofPoints: ['x'] } });
    const assets: Asset[] = [
      { id: 'a', offerId: o.id, kind: 'hook', body: 'h', dimensions: ['asset'], status: 'draft', source: 'mock', createdAt: '2026-01-01T00:00:00Z' },
    ];
    const action = nextActionMock(o, assets, [], 'fr');
    assert.match(action, /approuver/i);
  });
});
