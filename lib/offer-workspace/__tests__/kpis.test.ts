import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeOfferKpis,
  computeAssetRollups,
  filterOffers,
  sortOffers,
} from '../kpis';
import { KIND_TO_DIMENSIONS } from '../types';
import type { Asset, Offer } from '../types';

const baseOffer = (over: Partial<Offer> = {}): Offer => ({
  id: 'o1',
  name: 'Atelier Nova',
  status: 'draft',
  goal: 'clarify_offer',
  language: 'fr',
  brief: {
    businessName: 'Atelier Nova',
    offer: 'Programme 4 semaines pour clarifier votre offre.',
    targetAudience: 'consultants',
    tone: 'professional',
    language: 'fr',
    platforms: ['linkedin'],
    proofPoints: [],
  },
  createdAt: '2026-05-04T12:00:00.000Z',
  updatedAt: '2026-05-04T12:00:00.000Z',
  ...over,
});

describe('computeOfferKpis', () => {
  it('returns zeros on empty', () => {
    const k = computeOfferKpis([]);
    assert.equal(k.total, 0);
    assert.equal(k.recent7d, 0);
    assert.equal(k.avgConfidence, 0);
    assert.equal(k.withProofs, 0);
    assert.equal(k.withProofsPct, 0);
    assert.equal(k.byStatus.draft, 0);
    assert.equal(k.byStatus.archived, 0);
  });

  it('counts by status', () => {
    const offers: Offer[] = [
      baseOffer({ id: 'o1', status: 'draft' }),
      baseOffer({ id: 'o2', status: 'ready' }),
      baseOffer({ id: 'o3', status: 'ready' }),
      baseOffer({ id: 'o4', status: 'scheduled_mock' }),
      baseOffer({ id: 'o5', status: 'archived' }),
    ];
    const k = computeOfferKpis(offers);
    assert.equal(k.byStatus.draft, 1);
    assert.equal(k.byStatus.ready, 2);
    assert.equal(k.byStatus.scheduled_mock, 1);
    assert.equal(k.byStatus.active_mock, 0);
    assert.equal(k.byStatus.archived, 1);
  });

  it('avgConfidence ignores undefined scores', () => {
    const offers: Offer[] = [
      baseOffer({ id: 'a', confidence_score: 80 }),
      baseOffer({ id: 'b', confidence_score: 60 }),
      baseOffer({ id: 'c' }), // no score
    ];
    const k = computeOfferKpis(offers);
    assert.equal(k.avgConfidence, 70);
  });

  it('recent7d counts only offers within 7 days of refDate', () => {
    const ref = new Date('2026-05-10T00:00:00.000Z');
    const offers: Offer[] = [
      baseOffer({ id: 'a', createdAt: '2026-05-09T00:00:00.000Z' }), // 1 day
      baseOffer({ id: 'b', createdAt: '2026-05-04T00:00:00.000Z' }), // 6 days
      baseOffer({ id: 'c', createdAt: '2026-05-02T00:00:00.000Z' }), // 8 days → out
    ];
    const k = computeOfferKpis(offers, ref);
    assert.equal(k.recent7d, 2);
  });

  it('withProofs counts non-empty proofPoints', () => {
    const offers: Offer[] = [
      baseOffer({ id: 'a', brief: { ...baseOffer().brief, proofPoints: ['x'] } }),
      baseOffer({ id: 'b', brief: { ...baseOffer().brief, proofPoints: [] } }),
    ];
    const k = computeOfferKpis(offers);
    assert.equal(k.withProofs, 1);
    assert.equal(k.withProofsPct, 50);
  });
});

describe('computeAssetRollups', () => {
  const mkAsset = (kind: Asset['kind']): Asset => ({
    id: kind,
    offerId: 'o1',
    kind,
    body: 'x',
    dimensions: KIND_TO_DIMENSIONS[kind] ?? ['asset'],
    status: 'draft',
    source: 'mock',
    createdAt: '2026-05-04T12:00:00.000Z',
  });

  it('rolls up per kind and per dimension', () => {
    const assets: Asset[] = [
      mkAsset('hook'),
      mkAsset('angle'),
      mkAsset('objection'),
      mkAsset('cta'),
      mkAsset('social_post'),
      mkAsset('landing_section'),
    ];
    const r = computeAssetRollups(assets);
    assert.equal(r.total, 6);
    assert.equal(r.perKind.hook, 1);
    assert.equal(r.perKind.angle, 1);
    // hook contributes to 'promise' + 'asset'; asset is hit by many kinds
    assert.equal(r.perDimension.promise >= 1, true);
    assert.equal(r.perDimension.asset >= 4, true);
    assert.equal(r.perDimension.channel >= 1, true);
    assert.equal(r.perDimension.objection >= 1, true);
    assert.equal(r.perDimension.cta >= 1, true);
  });
});

describe('filterOffers', () => {
  const offers: Offer[] = [
    baseOffer({ id: 'a', status: 'draft', goal: 'clarify_offer', language: 'fr', brief: { ...baseOffer().brief, platforms: ['linkedin'] }, confidence_score: 80 }),
    baseOffer({ id: 'b', status: 'ready', goal: 'social_content', language: 'en', brief: { ...baseOffer().brief, platforms: ['email'] }, confidence_score: 50 }),
    baseOffer({ id: 'c', status: 'archived', goal: 'objections', language: 'fr', brief: { ...baseOffer().brief, platforms: ['instagram'] }, confidence_score: 30 }),
  ];

  it('filters by status', () => {
    const res = filterOffers(offers, { status: ['draft', 'ready'] });
    assert.deepEqual(res.map((o) => o.id), ['a', 'b']);
  });

  it('filters by goal', () => {
    const res = filterOffers(offers, { goal: ['social_content'] });
    assert.deepEqual(res.map((o) => o.id), ['b']);
  });

  it('filters by language', () => {
    const res = filterOffers(offers, { language: 'en' });
    assert.deepEqual(res.map((o) => o.id), ['b']);
  });

  it('filters by channel (platform contains)', () => {
    const res = filterOffers(offers, { channel: 'instagram' });
    assert.deepEqual(res.map((o) => o.id), ['c']);
  });

  it('filters by minConfidence', () => {
    const res = filterOffers(offers, { minConfidence: 60 });
    assert.deepEqual(res.map((o) => o.id), ['a']);
  });

  it('text search hits name or business or audience', () => {
    const res = filterOffers(offers, { query: 'consult' });
    assert.equal(res.length, 3); // all have "consultants" audience
  });
});

describe('sortOffers', () => {
  const offers: Offer[] = [
    baseOffer({ id: 'a', name: 'Bbb', confidence_score: 50, updatedAt: '2026-05-01T00:00:00.000Z' }),
    baseOffer({ id: 'b', name: 'Aaa', confidence_score: 80, updatedAt: '2026-05-04T00:00:00.000Z' }),
    baseOffer({ id: 'c', name: 'Ccc', confidence_score: 30, updatedAt: '2026-05-02T00:00:00.000Z' }),
  ];

  it('sort by updatedAt desc', () => {
    const res = sortOffers(offers, 'updatedAt', 'desc');
    assert.deepEqual(res.map((o) => o.id), ['b', 'c', 'a']);
  });

  it('sort by confidence_score asc', () => {
    const res = sortOffers(offers, 'confidence_score', 'asc');
    assert.deepEqual(res.map((o) => o.id), ['c', 'a', 'b']);
  });

  it('sort by name asc', () => {
    const res = sortOffers(offers, 'name', 'asc');
    assert.deepEqual(res.map((o) => o.id), ['b', 'a', 'c']);
  });
});
