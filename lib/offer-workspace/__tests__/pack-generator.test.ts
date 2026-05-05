import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCreativePack,
  buildSingleVariant,
  computePackCoverage,
  DEFAULT_PACK_COUNTS,
} from '../pack-generator';
import type { Offer, Asset } from '../types';
import { KIND_TO_DIMENSIONS } from '../types';

const makeOffer = (over: Partial<Offer> = {}): Offer => ({
  id: 'ofr_test_pack',
  name: 'Atelier Nova',
  status: 'draft',
  goal: 'clarify_offer',
  language: 'fr',
  brief: {
    businessName: 'Atelier Nova',
    offer:
      "Programme de 4 semaines pour clarifier l'offre des indépendants et créer une page de vente simple.",
    targetAudience: 'indépendants B2B qui vendent des services',
    tone: 'professional',
    language: 'fr',
    platforms: ['linkedin', 'email'],
    proofPoints: ['Méthode testée sur 12 offres de consultants'],
  },
  confidence_score: 80,
  createdAt: '2026-05-04T00:00:00.000Z',
  updatedAt: '2026-05-04T00:00:00.000Z',
  ...over,
});

const NUMERIC_INVENTION = /(?:\bx\s?\d{1,3}\b|\b\d{1,4}\s?[%‰](?!\w)|\+\d{1,4}\b|\b\d{1,4}\s?(?:rdv|leads?|clients?|abonn[ée]s?|followers?|sales?|euros?|dollars?|€|\$)\b)/gi;

describe('buildCreativePack — counts', () => {
  it('produces the expected default counts', () => {
    const drafts = buildCreativePack({ offer: makeOffer() });
    const counts = {
      hooks: drafts.filter((a) => a.kind === 'hook').length,
      linkedin: drafts.filter((a) => a.kind === 'social_post' && a.channel === 'linkedin').length,
      emails: drafts.filter((a) => a.kind === 'email').length,
      ctas: drafts.filter((a) => a.kind === 'cta').length,
      video: drafts.filter((a) => a.kind === 'video_script').length,
      image: drafts.filter((a) => a.kind === 'image_prompt').length,
      carousel: drafts.filter((a) => a.kind === 'social_post' && a.channel === 'instagram').length,
      landing: drafts.filter((a) => a.kind === 'landing_section').length,
    };
    assert.equal(counts.hooks, DEFAULT_PACK_COUNTS.hooks);
    assert.equal(counts.linkedin, DEFAULT_PACK_COUNTS.linkedin_posts);
    assert.equal(counts.emails, DEFAULT_PACK_COUNTS.emails);
    assert.equal(counts.ctas, DEFAULT_PACK_COUNTS.ctas);
    assert.equal(counts.video, DEFAULT_PACK_COUNTS.video_scripts);
    assert.equal(counts.image, DEFAULT_PACK_COUNTS.image_prompts);
    assert.equal(counts.carousel, 1);
    assert.equal(counts.landing, 1);
    // 5 + 5 + 3 + 3 + 3 + 3 + 1 + 1 = 24
    assert.equal(drafts.length, 24);
  });

  it('every draft is status=draft, source=mock, has title and tags', () => {
    const drafts = buildCreativePack({ offer: makeOffer() });
    for (const d of drafts) {
      assert.equal(d.status, 'draft');
      assert.equal(d.source, 'mock');
      assert.ok(typeof d.title === 'string' && d.title.length > 0);
      assert.ok(Array.isArray(d.tags) && d.tags.length > 0);
    }
  });
});

describe('buildCreativePack — determinism + variants', () => {
  it('same offer + same seed → identical output', () => {
    const a = buildCreativePack({ offer: makeOffer(), variantSeed: 0 });
    const b = buildCreativePack({ offer: makeOffer(), variantSeed: 0 });
    assert.equal(JSON.stringify(a), JSON.stringify(b));
  });

  it('different variantSeed → at least one body changes', () => {
    const a = buildCreativePack({ offer: makeOffer(), variantSeed: 0 });
    const b = buildCreativePack({ offer: makeOffer(), variantSeed: 7 });
    assert.notEqual(JSON.stringify(a), JSON.stringify(b));
  });

  it('different offer ids → different output', () => {
    const a = buildCreativePack({ offer: makeOffer({ id: 'ofr_a' }) });
    const b = buildCreativePack({ offer: makeOffer({ id: 'ofr_b' }) });
    assert.notEqual(JSON.stringify(a), JSON.stringify(b));
  });
});

describe('buildCreativePack — content invariants', () => {
  it('proofPoint reused VERBATIM at least once', () => {
    const offer = makeOffer();
    const proof = offer.brief.proofPoints[0]!;
    const drafts = buildCreativePack({ offer });
    const found = drafts.some((d) => d.body.includes(proof));
    assert.equal(found, true);
  });

  it('NO invented numeric metric across the entire pack', () => {
    const offer = makeOffer();
    const knownNumbers = new Set(
      [offer.brief.offer, offer.brief.targetAudience, ...offer.brief.proofPoints, offer.brief.businessName]
        .join(' ')
        .match(/\d+(?:[.,]\d+)?/g) ?? [],
    );
    const drafts = buildCreativePack({ offer });
    for (const d of drafts) {
      for (const hit of d.body.match(NUMERIC_INVENTION) ?? []) {
        const num = hit.match(/\d+(?:[.,]\d+)?/)?.[0]?.replace(',', '.') ?? '';
        if (num) {
          assert.equal(
            knownNumbers.has(num),
            true,
            `unsupported metric "${hit}" in draft "${d.title}"`,
          );
        }
      }
    }
  });

  it('FR offer → no EN-only marker phrases leak', () => {
    const drafts = buildCreativePack({ offer: makeOffer({ language: 'fr' }) });
    const all = drafts.map((d) => d.body).join('\n');
    assert.equal(/Built for|Cut to the truth|Clear frame|No fluff|Schedule a scoping/.test(all), false);
  });

  it('EN offer → no FR-only marker phrases leak', () => {
    const drafts = buildCreativePack({
      offer: makeOffer({
        language: 'en',
        brief: {
          ...makeOffer().brief,
          language: 'en',
          targetAudience: 'B2B consultants',
          proofPoints: ['Tested on 12 consultant offers'],
        },
      }),
    });
    const all = drafts.map((d) => d.body).join('\n');
    assert.equal(/Cadre clair|Pas de blabla|On regarde ça|Réserver un créneau|Pour /.test(all), false);
  });

  it('tone changes some content (professional vs bold differ)', () => {
    const a = buildCreativePack({
      offer: makeOffer({ brief: { ...makeOffer().brief, tone: 'professional' } }),
    });
    const b = buildCreativePack({
      offer: makeOffer({ brief: { ...makeOffer().brief, tone: 'bold' } }),
    });
    assert.notEqual(
      a.filter((x) => x.kind === 'cta').map((x) => x.body).join('|'),
      b.filter((x) => x.kind === 'cta').map((x) => x.body).join('|'),
    );
  });

  it('proofPoint absent → pack still cohesive (no crash, no stray "undefined")', () => {
    const offer = makeOffer({ brief: { ...makeOffer().brief, proofPoints: [] } });
    const drafts = buildCreativePack({ offer });
    for (const d of drafts) {
      assert.equal(/undefined/i.test(d.body), false);
      assert.ok(d.body.length > 0);
    }
  });
});

describe('buildSingleVariant', () => {
  it('returns one draft of the requested kind', () => {
    const v = buildSingleVariant(makeOffer(), 'hook', 1);
    assert.equal(v.kind, 'hook');
    assert.equal(v.status, 'draft');
    assert.equal(v.source, 'mock');
  });

  it('different variantSeed → different body', () => {
    const a = buildSingleVariant(makeOffer(), 'hook', 0);
    const b = buildSingleVariant(makeOffer(), 'hook', 7);
    assert.notEqual(a.body, b.body);
  });

  it('handles social_post (LinkedIn variant)', () => {
    const v = buildSingleVariant(makeOffer(), 'social_post', 0);
    assert.equal(v.channel, 'linkedin');
  });

  it('handles email/cta/video_script/image_prompt/landing_section', () => {
    for (const kind of ['email', 'cta', 'video_script', 'image_prompt', 'landing_section'] as const) {
      const v = buildSingleVariant(makeOffer(), kind, 1);
      assert.equal(v.kind, kind);
      assert.ok(v.title && v.title.length > 0);
      assert.ok(v.body.length > 0);
    }
  });
});

describe('computePackCoverage', () => {
  const mk = (kind: Asset['kind'], status: Asset['status'], over: Partial<Asset> = {}): Asset => ({
    id: `a_${kind}_${over.id ?? Math.random().toString(36).slice(2, 6)}`,
    offerId: 'o',
    kind,
    body: 'x',
    dimensions: KIND_TO_DIMENSIONS[kind] ?? ['asset'],
    status,
    source: 'mock',
    createdAt: '2026-05-04T00:00:00Z',
    ...over,
  });

  it('zero on empty', () => {
    const c = computePackCoverage([]);
    assert.equal(c.total, 0);
    assert.equal(c.approved, 0);
    assert.match(c.nextAction.fr, /Créer un pack/);
  });

  it('counts each category', () => {
    const assets: Asset[] = [
      mk('social_post', 'draft', { channel: 'linkedin', id: 'l1' }),
      mk('social_post', 'draft', { channel: 'linkedin', id: 'l2' }),
      mk('social_post', 'draft', { channel: 'instagram', id: 'c1', tags: ['format:carousel'] }),
      mk('email', 'draft', { id: 'e1' }),
      mk('hook', 'draft', { id: 'h1' }),
      mk('cta', 'draft', { id: 'cta1' }),
      mk('video_script', 'draft', { id: 'v1' }),
      mk('image_prompt', 'draft', { id: 'i1' }),
      mk('landing_section', 'draft', { id: 'ls1', tags: ['section:hero'] }),
    ];
    const c = computePackCoverage(assets);
    assert.equal(c.linkedin_posts, 2);
    assert.equal(c.emails, 1);
    assert.equal(c.hooks, 1);
    assert.equal(c.ctas, 1);
    assert.equal(c.video_scripts, 1);
    assert.equal(c.image_prompts, 1);
    assert.equal(c.carousels, 1);
    assert.equal(c.landing_heroes, 1);
    assert.equal(c.total, 9);
    assert.equal(c.approved, 0);
  });

  it('next action shifts to "Planifier 3 créneaux" when 3+ approved', () => {
    const assets: Asset[] = [
      mk('hook', 'approved', { id: 'h1' }),
      mk('hook', 'approved', { id: 'h2' }),
      mk('hook', 'approved', { id: 'h3' }),
      mk('hook', 'draft', { id: 'h4' }),
    ];
    const c = computePackCoverage(assets);
    assert.equal(c.approved, 3);
    assert.match(c.nextAction.fr, /Planifier 3 créneaux/);
  });
});
