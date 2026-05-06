import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateWeeklyPlan, planToText } from '../plan-generator';
import { KIND_TO_DIMENSIONS, type Asset, type Offer, type WeeklyPlan } from '../types';

const REF_DATE = new Date('2026-05-04T12:00:00Z'); // Monday

const makeOffer = (over: Partial<Offer> = {}): Offer => ({
  id: 'ofr_test',
  name: 'Atelier Nova',
  status: 'draft',
  goal: 'clarify_offer',
  language: 'fr',
  brief: {
    businessName: 'Atelier Nova',
    offer: "Programme de 4 semaines pour clarifier l'offre.",
    targetAudience: 'indépendants B2B',
    tone: 'professional',
    language: 'fr',
    platforms: ['linkedin', 'email'],
    proofPoints: ['Méthode testée sur 12 offres'],
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

function fullPool(): Asset[] {
  return [
    mkAsset('hook', 'approved', { id: 'h1', channel: 'linkedin' }),
    mkAsset('hook', 'approved', { id: 'h2', channel: 'linkedin' }),
    mkAsset('social_post', 'approved', { id: 's1', channel: 'linkedin' }),
    mkAsset('social_post', 'approved', { id: 's2', channel: 'instagram' }),
    mkAsset('email', 'approved', { id: 'e1', channel: 'email' }),
    mkAsset('cta', 'approved', { id: 'c1' }),
    mkAsset('objection', 'approved', { id: 'o1' }),
    mkAsset('video_script', 'approved', { id: 'v1', channel: 'youtube' }),
    mkAsset('image_prompt', 'approved', { id: 'i1', channel: 'instagram' }),
    mkAsset('landing_section', 'draft', { id: 'l1', channel: 'landing' }),
  ];
}

// -----------------------------------------------------------------------------

describe('generateWeeklyPlan — basic shape', () => {
  it('returns a weekStart aligned on Monday', () => {
    const p = generateWeeklyPlan({
      offer: makeOffer(),
      assets: fullPool(),
      goal: 'visibility',
      reference: REF_DATE,
    });
    assert.equal(p.weekStart, '2026-05-04');
  });

  it('produces 1..7 slots, including at least one free slot', () => {
    const p = generateWeeklyPlan({
      offer: makeOffer(),
      assets: fullPool(),
      goal: 'visibility',
      reference: REF_DATE,
    });
    assert.ok(p.slots.length >= 1 && p.slots.length <= 7);
    assert.ok(p.slots.some((s) => s.free === true), 'at least one free slot expected');
  });

  it('every non-free slot references an existing asset', () => {
    const pool = fullPool();
    const p = generateWeeklyPlan({
      offer: makeOffer(),
      assets: pool,
      goal: 'visibility',
      reference: REF_DATE,
    });
    const ids = new Set(pool.map((a) => a.id));
    for (const s of p.slots) {
      if (s.free) continue;
      assert.ok(s.assetId, `non-free slot missing assetId`);
      assert.ok(ids.has(s.assetId!), `non-free slot points at unknown asset ${s.assetId}`);
    }
  });

  it('dayIndex is always 0..6', () => {
    const p = generateWeeklyPlan({
      offer: makeOffer(),
      assets: fullPool(),
      goal: 'leads',
      reference: REF_DATE,
    });
    for (const s of p.slots) {
      assert.ok(s.dayIndex >= 0 && s.dayIndex <= 6);
    }
  });
});

describe('generateWeeklyPlan — determinism + variants', () => {
  it('same inputs + same seed → identical output', () => {
    const a = generateWeeklyPlan({
      offer: makeOffer(),
      assets: fullPool(),
      goal: 'visibility',
      reference: REF_DATE,
      planSeed: 0,
    });
    const b = generateWeeklyPlan({
      offer: makeOffer(),
      assets: fullPool(),
      goal: 'visibility',
      reference: REF_DATE,
      planSeed: 0,
    });
    assert.equal(JSON.stringify(a), JSON.stringify(b));
  });

  it('different planSeed → different output', () => {
    const a = generateWeeklyPlan({
      offer: makeOffer(),
      assets: fullPool(),
      goal: 'visibility',
      reference: REF_DATE,
      planSeed: 0,
    });
    const b = generateWeeklyPlan({
      offer: makeOffer(),
      assets: fullPool(),
      goal: 'visibility',
      reference: REF_DATE,
      planSeed: 7,
    });
    assert.notEqual(JSON.stringify(a), JSON.stringify(b));
  });

  it('different goal → different mix', () => {
    const a = generateWeeklyPlan({
      offer: makeOffer(),
      assets: fullPool(),
      goal: 'visibility',
      reference: REF_DATE,
    });
    const b = generateWeeklyPlan({
      offer: makeOffer(),
      assets: fullPool(),
      goal: 'leads',
      reference: REF_DATE,
    });
    const aPillars = a.slots.filter((s) => !s.free).map((s) => s.pillar).sort();
    const bPillars = b.slots.filter((s) => !s.free).map((s) => s.pillar).sort();
    assert.notDeepEqual(aPillars, bPillars);
  });

  it('different offer ids → different output', () => {
    const a = generateWeeklyPlan({
      offer: makeOffer({ id: 'ofr_a' }),
      assets: fullPool(),
      goal: 'visibility',
      reference: REF_DATE,
    });
    const b = generateWeeklyPlan({
      offer: makeOffer({ id: 'ofr_b' }),
      assets: fullPool(),
      goal: 'visibility',
      reference: REF_DATE,
    });
    assert.notEqual(JSON.stringify(a), JSON.stringify(b));
  });
});

describe('generateWeeklyPlan — editorial mix invariants', () => {
  it('no single non-free pillar dominates the week (max 3 of same pillar across non-free slots)', () => {
    const p = generateWeeklyPlan({
      offer: makeOffer(),
      assets: fullPool(),
      goal: 'visibility',
      reference: REF_DATE,
    });
    const counts: Record<string, number> = {};
    for (const s of p.slots) {
      if (s.free) continue;
      counts[s.pillar] = (counts[s.pillar] ?? 0) + 1;
    }
    for (const [pillar, n] of Object.entries(counts)) {
      assert.ok(n <= 3, `pillar ${pillar} has ${n} slots, expected ≤ 3`);
    }
  });

  it('does not produce 7 promo (conversion) posts', () => {
    const p = generateWeeklyPlan({
      offer: makeOffer(),
      assets: fullPool(),
      goal: 'leads',
      reference: REF_DATE,
    });
    const conversion = p.slots.filter((s) => !s.free && s.pillar === 'conversion').length;
    assert.ok(conversion < 7, 'should never schedule 7 promo posts');
  });

  it('always reserves at least one free / spontaneous slot', () => {
    const p = generateWeeklyPlan({
      offer: makeOffer(),
      assets: fullPool(),
      goal: 'launch',
      reference: REF_DATE,
    });
    assert.ok(p.slots.some((s) => s.free === true));
  });
});

describe('generateWeeklyPlan — asset selection', () => {
  it('prioritizes approved over draft', () => {
    const approvedHook = mkAsset('hook', 'approved', { id: 'A' });
    const draftHook = mkAsset('hook', 'draft', { id: 'B' });
    const p = generateWeeklyPlan({
      offer: makeOffer(),
      assets: [draftHook, approvedHook],
      goal: 'visibility',
      reference: REF_DATE,
    });
    const planned = p.slots.find((s) => s.assetId === 'A');
    assert.ok(planned, 'approved asset should be selected first');
  });

  it('excludes archived and review_mock assets', () => {
    const archived = mkAsset('hook', 'archived', { id: 'X' });
    const review = mkAsset('email', 'review_mock', { id: 'Y' });
    const ok = mkAsset('hook', 'approved', { id: 'Z' });
    const p = generateWeeklyPlan({
      offer: makeOffer(),
      assets: [archived, review, ok],
      goal: 'visibility',
      reference: REF_DATE,
    });
    for (const s of p.slots) {
      assert.notEqual(s.assetId, 'X');
      assert.notEqual(s.assetId, 'Y');
    }
  });

  it('handles empty asset pool: returns at least the free slot, no crash', () => {
    const p = generateWeeklyPlan({
      offer: makeOffer(),
      assets: [],
      goal: 'visibility',
      reference: REF_DATE,
    });
    assert.ok(p.slots.length >= 1);
    assert.ok(p.slots.every((s) => s.free === true || s.assetId));
  });

  it('caps total non-free slots at 6 even if many assets are available', () => {
    const many: Asset[] = [];
    for (let i = 0; i < 20; i++) {
      many.push(mkAsset('hook', 'approved', { id: `m${i}`, channel: 'linkedin' }));
    }
    const p = generateWeeklyPlan({
      offer: makeOffer(),
      assets: many,
      goal: 'visibility',
      reference: REF_DATE,
    });
    const nonFree = p.slots.filter((s) => !s.free).length;
    assert.ok(nonFree <= 6, `expected ≤6 non-free slots, got ${nonFree}`);
  });

  it('does not mutate or remove source assets', () => {
    const pool = fullPool();
    const before = JSON.stringify(pool);
    generateWeeklyPlan({
      offer: makeOffer(),
      assets: pool,
      goal: 'visibility',
      reference: REF_DATE,
    });
    assert.equal(JSON.stringify(pool), before);
  });

  it('hook field is non-empty for every slot', () => {
    const p = generateWeeklyPlan({
      offer: makeOffer(),
      assets: fullPool(),
      goal: 'visibility',
      reference: REF_DATE,
    });
    for (const s of p.slots) {
      assert.ok(s.hook && s.hook.length > 0, 'every slot needs a non-empty hook');
    }
  });

  it('falls back to derived hook when asset has no title', () => {
    const noTitle = mkAsset('hook', 'approved', {
      id: 'nt',
      title: undefined,
      body: 'First line of the hook\nsecond line',
    });
    const p = generateWeeklyPlan({
      offer: makeOffer(),
      assets: [noTitle],
      goal: 'visibility',
      reference: REF_DATE,
    });
    const slot = p.slots.find((s) => s.assetId === 'nt');
    assert.ok(slot);
    assert.equal(slot!.hook, 'First line of the hook');
  });
});

describe('planToText', () => {
  const fakePlan: WeeklyPlan = {
    id: 'wpl_1',
    offerId: 'ofr_test',
    weekStart: '2026-05-04',
    goal: 'visibility',
    slots: [
      {
        id: 'psl_1',
        dayIndex: 0,
        suggestedTime: '08:30',
        channel: 'linkedin',
        kind: 'social_post',
        pillar: 'education',
        objective: 'Test objective',
        hook: 'First hook',
        assetId: 'a1',
        status: 'draft',
      },
      {
        id: 'psl_2',
        dayIndex: 6,
        suggestedTime: '10:00',
        channel: 'free',
        pillar: 'behind_scenes',
        objective: 'Slot libre',
        hook: 'Idée spontanée',
        status: 'draft',
        free: true,
      },
    ],
    createdAt: '2026-05-04T00:00:00Z',
    updatedAt: '2026-05-04T00:00:00Z',
  };

  it('produces a non-empty text export with header + slots', () => {
    const txt = planToText(fakePlan, 'fr');
    assert.match(txt, /Plan semaine/);
    assert.match(txt, /First hook/);
    assert.match(txt, /Idée spontanée/);
    assert.match(txt, /Mock V1/);
  });

  it('respects language for header/footer', () => {
    const fr = planToText(fakePlan, 'fr');
    const en = planToText(fakePlan, 'en');
    assert.match(fr, /Plan semaine/);
    assert.match(en, /Weekly plan/);
    assert.notEqual(fr, en);
  });
});
