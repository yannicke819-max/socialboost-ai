import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AD_TEMPLATES_COUNT,
  adToCleanText,
  adToDiffusionBrief,
  buildAdGallery,
  checkLanguageConsistency,
  computeChecklist,
  computeReadyScore,
  diffusionSelectionId,
  reconcileAdUnits,
  recommendedAds,
} from '../ad-studio';
import { repairWorkspace, mergeOfferBundle, parseOfferImport, serializeOffer } from '../persistence';
import {
  AD_FORMATS,
  AD_TYPES,
  KIND_TO_DIMENSIONS,
  STORAGE_VERSION,
  type Asset,
  type Offer,
  type WorkspaceFile,
} from '../types';

const NOW = '2026-05-04T00:00:00Z';

function makeOffer(over: Partial<Offer> = {}): Offer {
  return {
    id: over.id ?? 'ofr_test',
    name: over.name ?? 'Atelier Nova',
    status: 'draft',
    goal: 'clarify_offer',
    language: over.language ?? 'fr',
    brief: over.brief ?? {
      businessName: 'Atelier Nova',
      offer: "Programme de 4 semaines pour clarifier l'offre des indépendants B2B.",
      targetAudience: 'indépendants B2B qui vendent des services',
      tone: 'professional',
      language: 'fr',
      platforms: ['linkedin', 'instagram', 'email'],
      proofPoints: ['Méthode testée sur 12 offres de consultants'],
    },
    confidence_score: 80,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function mkAsset(over: Partial<Asset> = {}): Asset {
  const kind = over.kind ?? 'hook';
  return {
    id: over.id ?? `ast_${kind}_${Math.random().toString(36).slice(2, 8)}`,
    offerId: over.offerId ?? 'ofr_test',
    kind,
    title: over.title,
    body: over.body ?? `${kind} body content`,
    dimensions: KIND_TO_DIMENSIONS[kind] ?? ['asset'],
    status: over.status ?? 'approved',
    source: 'mock',
    channel: over.channel,
    createdAt: NOW,
  };
}

function fullPool(): Asset[] {
  return [
    mkAsset({ id: 'h1', kind: 'hook', body: 'Tu n\'as pas un problème de temps. Tu as un problème d\'offre.' }),
    mkAsset({ id: 'h2', kind: 'hook' }),
    mkAsset({ id: 'o1', kind: 'objection', body: '« Je n\'ai pas le temps »\n\nLe vrai sujet, c\'est la priorité.' }),
    mkAsset({ id: 'sp1', kind: 'social_post', channel: 'linkedin' }),
    mkAsset({ id: 'e1', kind: 'email', channel: 'email' }),
    mkAsset({ id: 'cta1', kind: 'cta', body: 'Réserver un appel de 20 minutes' }),
  ];
}

// -----------------------------------------------------------------------------

describe('buildAdGallery — gallery shape', () => {
  it('returns at least one ad per AdType (≥10 entries)', () => {
    const gallery = buildAdGallery({ offer: makeOffer(), assets: fullPool(), derivedAt: NOW });
    assert.ok(gallery.length >= AD_TYPES.length, `expected ≥${AD_TYPES.length}, got ${gallery.length}`);
    assert.equal(gallery.length, AD_TEMPLATES_COUNT);
  });

  it('covers every required format at least once', () => {
    const gallery = buildAdGallery({ offer: makeOffer(), assets: fullPool(), derivedAt: NOW });
    for (const f of AD_FORMATS) {
      assert.ok(gallery.some((u) => u.format === f), `missing format ${f}`);
    }
  });

  it('produces ≥1 vertical 9:16 video, ≥1 LinkedIn B2B, ≥1 conversion CTA (email)', () => {
    const gallery = buildAdGallery({ offer: makeOffer(), assets: fullPool(), derivedAt: NOW });
    assert.ok(gallery.some((u) => u.format === '9:16' && (u.scenes?.length ?? 0) > 0));
    assert.ok(gallery.some((u) => u.channel === 'linkedin' && u.format === 'linkedin'));
    assert.ok(gallery.some((u) => u.format === 'email' && u.channel === 'email'));
  });

  it('every ad has non-empty hook / copy / cta and a status of "draft" by default', () => {
    const gallery = buildAdGallery({ offer: makeOffer(), assets: fullPool(), derivedAt: NOW });
    for (const u of gallery) {
      assert.ok(u.hook.length > 0);
      assert.ok(u.copy.length > 0);
      assert.ok(u.cta.length > 0);
      assert.equal(u.status, 'draft');
      assert.ok(typeof u.ready_score === 'number' && u.ready_score >= 0 && u.ready_score <= 100);
    }
  });

  it('public copy NEVER contains the word "mock"', () => {
    const gallery = buildAdGallery({ offer: makeOffer(), assets: fullPool(), derivedAt: NOW });
    for (const u of gallery) {
      const blob = `${u.hook}\n${u.copy}\n${u.cta}`;
      assert.equal(/mock/i.test(blob), false, `ad ${u.id} contains "mock" in public copy`);
    }
  });
});

describe('buildAdGallery — determinism + immutability', () => {
  it('same (offer, assets) → identical output', () => {
    const a = buildAdGallery({ offer: makeOffer(), assets: fullPool(), derivedAt: NOW });
    const b = buildAdGallery({ offer: makeOffer(), assets: fullPool(), derivedAt: NOW });
    assert.equal(JSON.stringify(a), JSON.stringify(b));
  });

  it('different offer ids → different output', () => {
    const a = buildAdGallery({ offer: makeOffer({ id: 'A' }), assets: fullPool(), derivedAt: NOW });
    const b = buildAdGallery({ offer: makeOffer({ id: 'B' }), assets: fullPool(), derivedAt: NOW });
    assert.notEqual(JSON.stringify(a), JSON.stringify(b));
  });

  it('does not mutate source assets', () => {
    const pool = fullPool();
    const before = JSON.stringify(pool);
    buildAdGallery({ offer: makeOffer(), assets: pool, derivedAt: NOW });
    assert.equal(JSON.stringify(pool), before);
  });

  it('stable id format ${offerId}:${templateId}', () => {
    const offer = makeOffer({ id: 'ofr_42' });
    const gallery = buildAdGallery({ offer, assets: fullPool(), derivedAt: NOW });
    for (const u of gallery) {
      assert.match(u.id, /^ofr_42:/);
    }
  });
});

describe('computeChecklist + computeReadyScore', () => {
  it('a clean ad with proof verbatim + short CTA scores high', () => {
    const offer = makeOffer();
    const checklist = computeChecklist({
      offer,
      hook: 'Une offre claire en 4 semaines.',
      copy: `Méthode testée sur 12 offres de consultants. Programme pour clarifier offre indépendants.`,
      cta: 'Réserver un créneau.',
      format: 'linkedin',
      channel: 'linkedin',
      hasScenes: false,
    });
    const score = computeReadyScore(checklist, 80);
    assert.ok(score >= 80, `expected ≥80, got ${score}`);
  });

  it('fails the no_mock_leak check if copy contains "mock"', () => {
    const offer = makeOffer();
    const checklist = computeChecklist({
      offer,
      hook: 'mock title',
      copy: 'this is a mock copy',
      cta: 'click',
      format: '9:16',
      channel: 'tiktok',
      hasScenes: true,
    });
    assert.equal(checklist.no_mock_leak_in_public_copy, false);
  });

  it('fails single_clear_cta if the CTA contains "or" disjunction', () => {
    const offer = makeOffer();
    const checklist = computeChecklist({
      offer,
      hook: 'Hook',
      copy: 'Body indépendants programme',
      cta: 'Click here or there',
      format: '1:1',
      channel: 'instagram',
      hasScenes: false,
    });
    assert.equal(checklist.single_clear_cta, false);
  });

  it('fails format_fits_channel when format does not match', () => {
    const offer = makeOffer();
    const checklist = computeChecklist({
      offer,
      hook: 'h',
      copy: 'c',
      cta: 'go',
      format: 'linkedin',
      channel: 'tiktok',
      hasScenes: false,
    });
    assert.equal(checklist.format_fits_channel, false);
  });
});

describe('recommendedAds', () => {
  it('returns at least 3 recommended ads', () => {
    const gallery = buildAdGallery({ offer: makeOffer(), assets: fullPool(), derivedAt: NOW });
    const recs = recommendedAds(gallery);
    assert.ok(recs.length >= 3);
  });
});

describe('reconcileAdUnits', () => {
  it('preserves user-set status (ready / selected) across re-derivation', () => {
    const offer = makeOffer();
    const a = buildAdGallery({ offer, assets: fullPool(), derivedAt: NOW });
    const stored = a.map((u, i) =>
      i === 0 ? { ...u, status: 'ready' as const } : i === 1 ? { ...u, status: 'selected' as const } : u,
    );
    const b = buildAdGallery({ offer, assets: fullPool(), derivedAt: NOW });
    const merged = reconcileAdUnits(b, stored);
    assert.equal(merged[0]!.status, 'ready');
    assert.equal(merged[1]!.status, 'selected');
  });
});

describe('adToCleanText / adToDiffusionBrief', () => {
  it('clean text never contains "mock"', () => {
    const gallery = buildAdGallery({ offer: makeOffer(), assets: fullPool(), derivedAt: NOW });
    for (const u of gallery) {
      const text = adToCleanText(u);
      assert.equal(/mock/i.test(text), false, `ad ${u.id} clean text contains "mock"`);
    }
  });

  it('diffusion brief is multi-section markdown', () => {
    const gallery = buildAdGallery({ offer: makeOffer(), assets: fullPool(), derivedAt: NOW });
    const brief = adToDiffusionBrief(gallery[0]!);
    assert.match(brief, /Brief diffusion/);
    assert.match(brief, /Format/);
    assert.match(brief, /Hook/);
  });

  it('email format export carries Objet + body', () => {
    const gallery = buildAdGallery({ offer: makeOffer(), assets: fullPool(), derivedAt: NOW });
    const email = gallery.find((u) => u.format === 'email');
    assert.ok(email);
    const text = adToCleanText(email!);
    assert.match(text, /Objet:/);
  });

  it('carousel export lists every slide', () => {
    const gallery = buildAdGallery({ offer: makeOffer(), assets: fullPool(), derivedAt: NOW });
    const carousel = gallery.find((u) => u.format === 'carousel');
    assert.ok(carousel);
    const text = adToCleanText(carousel!);
    for (let i = 1; i <= (carousel!.slides ?? []).length; i++) {
      assert.match(text, new RegExp(`Slide ${i} —`));
    }
  });
});

describe('diffusionSelectionId', () => {
  it('combines offer + ad ids deterministically', () => {
    assert.equal(diffusionSelectionId('ofr_a', 'ofr_a:product_promo_vertical'),
      'ofr_a:ofr_a:product_promo_vertical');
  });
});

describe('AI-013 — language hardening (BLOCKER fix)', () => {
  // Reproduce the original BLOCKER: an offer whose brief was written in EN
  // (offer/targetAudience), but rendered through a chrome `language: 'fr'`
  // prop must still produce a fully French public copy — no English shell
  // fragments leaking from `brief.offer` or `brief.targetAudience`.
  const englishBriefOffer = makeOffer({
    id: 'ofr_blocker',
    name: 'Nova Studio',
    language: 'fr',
    brief: {
      businessName: 'Nova Studio',
      offer: 'A 4-week program helping consultants articulate their offer and ship a simple sales page.',
      targetAudience: 'consultants who sell services',
      tone: 'professional',
      language: 'fr',
      platforms: ['linkedin', 'email'],
      proofPoints: ['Méthode testée sur 12 offres de consultants'],
    },
  });

  it('engine output language follows offer.brief.language, not the chrome prop', () => {
    const gallery = buildAdGallery({
      offer: englishBriefOffer,
      assets: fullPool(),
      // Even if chrome says 'en', the brief says 'fr' → output must be French.
      language: 'en',
      derivedAt: NOW,
    });
    const linkedin = gallery.find((u) => u.templateId === 'launch_linkedin');
    assert.ok(linkedin);
    assert.match(linkedin!.copy, /Aujourd'hui|Nova Studio lance/);
  });

  it('FR ad copy never contains the English shell fragments from the BLOCKER', () => {
    const gallery = buildAdGallery({
      offer: englishBriefOffer,
      assets: fullPool(),
      derivedAt: NOW,
    });
    for (const u of gallery) {
      // The two leak fragments reported in the BLOCKER review.
      assert.equal(
        /A 4-week program/i.test(`${u.hook}\n${u.copy}\n${u.cta}`),
        false,
        `ad ${u.id} still leaks "A 4-week program"`,
      );
      assert.equal(
        /\bconsultants who sell services\b/i.test(`${u.hook}\n${u.copy}\n${u.cta}`),
        false,
        `ad ${u.id} still leaks the EN targetAudience`,
      );
    }
  });

  it('FR ads do not contain English clause openers (today / book a / tap the / your audience)', () => {
    const gallery = buildAdGallery({
      offer: englishBriefOffer,
      assets: fullPool(),
      derivedAt: NOW,
    });
    for (const u of gallery) {
      const blob = `${u.hook}\n${u.copy}\n${u.cta}`.toLowerCase();
      assert.equal(
        /\btoday\b|\bbook a |\btap the |\byour audience\b|\bhere is\b/.test(blob),
        false,
        `ad ${u.id} leaks an English opener: ${u.hook}`,
      );
    }
  });

  it('EN ads do not contain French clause openers (aujourd\'hui / réserver / cliquer)', () => {
    const enOffer = makeOffer({
      id: 'ofr_en',
      language: 'en',
      brief: {
        businessName: 'Nova Studio',
        offer: 'Programme de 4 semaines.',
        targetAudience: 'B2B consultants',
        tone: 'professional',
        language: 'en',
        platforms: ['linkedin', 'email'],
        proofPoints: ['Tested on 12 consultant offers'],
      },
    });
    const gallery = buildAdGallery({ offer: enOffer, assets: [], derivedAt: NOW });
    for (const u of gallery) {
      const blob = `${u.hook}\n${u.copy}\n${u.cta}`.toLowerCase();
      assert.equal(
        /\baujourd'hui\b|\bréserver?\b|\bcliquer?\b|\bvoici\b/.test(blob),
        false,
        `ad ${u.id} leaks a French opener: ${u.hook}`,
      );
    }
  });

  it('checkLanguageConsistency flags a French shell with English openers', () => {
    const txt = `Aujourd'hui, Nova Studio ships a new version. Book a 20-minute slot.`;
    assert.equal(checkLanguageConsistency(txt, 'fr'), false);
  });

  it('checkLanguageConsistency flags an English shell with "réserver"', () => {
    const txt = `Today, Nova Studio ships a new version. Réserver un appel.`;
    assert.equal(checkLanguageConsistency(txt, 'en'), false);
  });

  it('checkLanguageConsistency passes a clean monolingual FR copy', () => {
    const txt = `Aujourd'hui, Nova Studio lance une nouvelle version.\n\nRéserve un créneau de cadrage.`;
    assert.equal(checkLanguageConsistency(txt, 'fr'), true);
  });

  it('language inconsistency caps the ready score at 50', () => {
    const offer = englishBriefOffer;
    const inconsistent = computeChecklist({
      offer,
      hook: `Aujourd'hui, Nova Studio ships a new version.`,
      copy: `Today, here is what you get. Réserver un appel.`,
      cta: `Book a slot.`,
      format: 'linkedin',
      channel: 'linkedin',
      hasScenes: false,
      language: 'fr',
    });
    assert.equal(inconsistent.language_consistency, false);
    const score = computeReadyScore(inconsistent, 90);
    assert.ok(score <= 50, `expected ≤50, got ${score}`);
  });

  it('clean exports (copy + diffusion brief) carry no cross-language leak when brief is in EN but UI says FR', () => {
    const gallery = buildAdGallery({
      offer: englishBriefOffer,
      assets: fullPool(),
      language: 'en', // chrome says EN but brief says FR
      derivedAt: NOW,
    });
    for (const u of gallery) {
      const text = adToCleanText(u, 'fr');
      assert.equal(/A 4-week program/i.test(text), false);
      assert.equal(/consultants who sell services/i.test(text), false);
      const brief = adToDiffusionBrief(u, 'fr');
      assert.equal(/A 4-week program/i.test(brief), false);
      assert.equal(/consultants who sell services/i.test(brief), false);
    }
  });

  it('every generated ad in the gallery passes language_consistency when offer + proofPoints are aligned', () => {
    // Assets and proofPoints carry user-typed text whose language is not
    // enforced by the engine. To assert the engine itself is monolingual we
    // test with an empty asset pool AND a proofPoint written in the brief's
    // language — that way every public string is in a single language.
    const aligned = {
      fr: {
        offer: makeOffer({
          id: 'ofr_fr',
          language: 'fr',
          brief: {
            ...makeOffer().brief,
            language: 'fr',
            proofPoints: ['Méthode testée sur 12 offres de consultants'],
          },
        }),
      },
      en: {
        offer: makeOffer({
          id: 'ofr_en',
          language: 'en',
          brief: {
            businessName: 'Nova Studio',
            offer: 'A 4-week program.',
            targetAudience: 'B2B consultants',
            tone: 'professional',
            language: 'en',
            platforms: ['linkedin', 'email'],
            proofPoints: ['Validated with 12 consultant offers'],
          },
        }),
      },
    };
    for (const lang of ['fr', 'en'] as const) {
      const gallery = buildAdGallery({ offer: aligned[lang].offer, assets: [], derivedAt: NOW });
      for (const u of gallery) {
        assert.equal(
          u.checklist.language_consistency,
          true,
          `ad ${u.id} fails language_consistency for language=${lang}: ${u.hook} | ${u.copy}`,
        );
      }
    }
  });
});

describe('persistence cascade — ad units and selections', () => {
  function envWithAds(): WorkspaceFile {
    const offer = makeOffer({ id: 'ofr_a' });
    const orphan = makeOffer({ id: 'ofr_ghost' });
    const assets = fullPool();
    const gallery = buildAdGallery({ offer, assets, derivedAt: NOW });
    const orphanGallery = buildAdGallery({ offer: orphan, assets: [], derivedAt: NOW });
    return {
      version: STORAGE_VERSION,
      offers: [offer], // orphan offer NOT included → orphan ads should be repaired away
      assets,
      calendar_slots: [],
      recommendations: [],
      weekly_plans: [],
      feedback_recommendations: [],
      feedback_history: [],
      feedback_preferences: [],
      ad_units: [...gallery, ...orphanGallery],
      ad_diffusion_selections: [
        { id: 'ofr_a:keep', offerId: 'ofr_a', adId: gallery[0]!.id, selectedAt: NOW },
        { id: 'ofr_ghost:lose', offerId: 'ofr_ghost', adId: orphanGallery[0]!.id, selectedAt: NOW },
      ],
    };
  }

  it('repairWorkspace drops orphan ad units and orphan diffusion selections', () => {
    const env = envWithAds();
    const { repaired, report } = repairWorkspace(env);
    assert.ok(repaired.ad_units!.every((u) => u.offerId === 'ofr_a'));
    assert.ok(repaired.ad_diffusion_selections!.every((s) => s.offerId === 'ofr_a'));
    assert.ok(report.removed.ad_units > 0);
    assert.ok(report.removed.ad_diffusion_selections > 0);
  });

  it('repairWorkspace strips ad sourceAssetId when the asset is missing without dropping the ad', () => {
    const offer = makeOffer({ id: 'ofr_a' });
    const ghostAsset = mkAsset({ id: 'ast_ghost', offerId: 'ofr_a' });
    const gallery = buildAdGallery({ offer, assets: [ghostAsset], derivedAt: NOW });
    const adWithGhost = gallery.find((u) => u.sourceAssetId);
    if (!adWithGhost) throw new Error('expected at least one ad with sourceAssetId in fixture');
    const env: WorkspaceFile = {
      version: STORAGE_VERSION,
      offers: [offer],
      assets: [], // ghostAsset removed → ad unit's sourceAssetId is now broken
      calendar_slots: [],
      recommendations: [],
      weekly_plans: [],
      feedback_recommendations: [],
      feedback_history: [],
      feedback_preferences: [],
      ad_units: gallery,
      ad_diffusion_selections: [],
    };
    const { repaired, report } = repairWorkspace(env);
    assert.equal(repaired.ad_units!.length, gallery.length);
    const stripped = repaired.ad_units!.find((u) => u.id === adWithGhost.id)!;
    assert.equal(stripped.sourceAssetId, undefined);
    assert.ok(report.removed.ad_unit_links >= 1);
  });

  it('serializeOffer / parseOfferImport / mergeOfferBundle round-trip carries ad_units', () => {
    const env = envWithAds();
    const text = serializeOffer(env, 'ofr_a', NOW);
    assert.ok(text);
    const parsed = parseOfferImport(text!);
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.ok((parsed.bundle.ad_units ?? []).length > 0);
    assert.ok((parsed.bundle.ad_diffusion_selections ?? []).length > 0);
    // Round-trip into an empty workspace.
    const empty: WorkspaceFile = {
      version: STORAGE_VERSION,
      offers: [],
      assets: [],
    };
    const merged = mergeOfferBundle(empty, parsed.bundle);
    assert.ok((merged.ad_units ?? []).length > 0);
  });
});
