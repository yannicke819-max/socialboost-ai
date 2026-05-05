import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildUtm, slugify, mediumFromChannel, utmToQuery } from '../utm';
import type { Asset, Offer } from '../types';

const offer: Offer = {
  id: 'ofr_test',
  name: 'Atelier Nova — Programme 4 semaines',
  status: 'draft',
  goal: 'clarify_offer',
  language: 'fr',
  brief: { businessName: 'Atelier Nova', offer: 'x', tone: 'professional', language: 'fr', platforms: [], proofPoints: [] },
  createdAt: '2026-05-04T00:00:00Z',
  updatedAt: '2026-05-04T00:00:00Z',
};

const asset: Asset = {
  id: 'ast_abcdef123456',
  offerId: 'ofr_test',
  kind: 'social_post',
  body: 'post',
  dimensions: ['asset', 'channel'],
  status: 'approved',
  source: 'mock',
  channel: 'linkedin',
  createdAt: '2026-05-04T00:00:00Z',
};

describe('slugify', () => {
  it('lowercases + dashes', () => {
    assert.equal(slugify('Atelier Nova — Programme 4 semaines'), 'atelier-nova-programme-4-semaines');
  });
  it('strips diacritics', () => {
    assert.equal(slugify('Indépendants B2B'), 'independants-b2b');
  });
  it('caps to 60 chars', () => {
    const s = slugify('a'.repeat(120));
    assert.ok(s.length <= 60);
  });
});

describe('mediumFromChannel', () => {
  it('linkedin → social', () => assert.equal(mediumFromChannel('linkedin'), 'social'));
  it('email → email', () => assert.equal(mediumFromChannel('email'), 'email'));
  it('landing_page → web', () => assert.equal(mediumFromChannel('landing_page'), 'web'));
  it('unknown → other', () => assert.equal(mediumFromChannel('zzz'), 'other'));
});

describe('buildUtm', () => {
  it('campaign uses offer name slug', () => {
    const u = buildUtm(offer, 'linkedin', asset);
    assert.equal(u.utm_campaign, 'atelier-nova-programme-4-semaines');
  });
  it('source = channel slug', () => {
    const u = buildUtm(offer, 'linkedin', asset);
    assert.equal(u.utm_source, 'linkedin');
  });
  it('medium = derived from channel', () => {
    assert.equal(buildUtm(offer, 'email', asset).utm_medium, 'email');
    assert.equal(buildUtm(offer, 'linkedin', asset).utm_medium, 'social');
  });
  it('content = kind + last 6 chars of asset id', () => {
    const u = buildUtm(offer, 'linkedin', asset);
    assert.equal(u.utm_content, 'social-post-123456');
  });
  it('content fallback "generic" without asset', () => {
    assert.equal(buildUtm(offer, 'linkedin').utm_content, 'generic');
  });
  it('campaign fallback "offer" when name empty + id slugifies cleanly', () => {
    const o2: Offer = { ...offer, name: '', id: 'OnlyDigits-123' };
    const u = buildUtm(o2, 'linkedin');
    assert.equal(u.utm_campaign, 'onlydigits-123');
  });
});

describe('utmToQuery', () => {
  it('builds a ?utm_… query string deterministically', () => {
    const q = utmToQuery(buildUtm(offer, 'linkedin', asset));
    assert.match(q, /^\?utm_campaign=atelier-nova-programme-4-semaines/);
    assert.match(q, /utm_source=linkedin/);
    assert.match(q, /utm_medium=social/);
    assert.match(q, /utm_content=social-post-123456/);
  });
});
