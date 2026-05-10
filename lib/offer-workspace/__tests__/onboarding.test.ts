import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Mock localStorage on the global BEFORE the store module reads it.
class MemoryStorage {
  private map = new Map<string, string>();
  getItem(k: string): string | null { return this.map.get(k) ?? null; }
  setItem(k: string, v: string): void { this.map.set(k, v); }
  removeItem(k: string): void { this.map.delete(k); }
  clear(): void { this.map.clear(); }
  get length(): number { return this.map.size; }
  key(i: number): string | null { return Array.from(this.map.keys())[i] ?? null; }
}

const g = globalThis as unknown as { window?: { localStorage: MemoryStorage } };
g.window = { localStorage: new MemoryStorage() };

import {
  EMPTY_DRAFT,
  NOVA_STUDIO_EXAMPLE,
  draftFromOffer,
  isDraftComplete,
  materializeFromOnboarding,
  runOnboarding,
  validateAll,
  validateStep,
  type OnboardingDraft,
} from '../onboarding';
import { createWorkspaceStore } from '../store';
import { parseWorkspaceImport, serializeWorkspace } from '../persistence';

beforeEach(() => {
  g.window!.localStorage.clear();
});

// -----------------------------------------------------------------------------

describe('validateStep / validateAll', () => {
  it('blocks an empty draft on step 1 essentials (name + one-liner)', () => {
    const errs = validateStep(EMPTY_DRAFT, 1);
    assert.ok(errs.includes('name_required'));
    assert.ok(errs.includes('one_liner_required'));
  });

  it('blocks step 2 when audience or problem missing', () => {
    const errs = validateStep(EMPTY_DRAFT, 2);
    assert.ok(errs.includes('audience_required'));
    assert.ok(errs.includes('problem_required'));
  });

  it('step 3 fails when both proof AND benefit are empty', () => {
    const errs = validateStep(EMPTY_DRAFT, 3);
    assert.ok(errs.includes('proof_or_benefit_required'));
  });

  it('step 3 passes when only one of proof / benefit is set', () => {
    const d: OnboardingDraft = { ...EMPTY_DRAFT, proof: 'Tested with 12 customers' };
    const errs = validateStep(d, 3);
    assert.equal(errs.includes('proof_or_benefit_required'), false);
    const d2: OnboardingDraft = { ...EMPTY_DRAFT, benefit: 'Save 3 weeks' };
    const errs2 = validateStep(d2, 3);
    assert.equal(errs2.includes('proof_or_benefit_required'), false);
  });

  it('step 4 blocks on missing CTA and rejects unknown language', () => {
    const errs = validateStep(EMPTY_DRAFT, 4);
    assert.ok(errs.includes('cta_required'));
    const bogus: OnboardingDraft = { ...EMPTY_DRAFT, language: 'xx' as 'fr' };
    const errs2 = validateStep(bogus, 4);
    assert.ok(errs2.includes('language_required'));
  });

  it('NOVA_STUDIO_EXAMPLE is a complete valid draft', () => {
    assert.deepEqual(validateAll(NOVA_STUDIO_EXAMPLE), {});
    assert.equal(isDraftComplete(NOVA_STUDIO_EXAMPLE), true);
  });
});

describe('materializeFromOnboarding', () => {
  it('produces a CreateOfferInput compatible with the store', () => {
    const input = materializeFromOnboarding(NOVA_STUDIO_EXAMPLE);
    assert.equal(input.name, 'Nova Studio');
    assert.equal(input.language, 'fr');
    assert.equal(input.brief.businessName, 'Nova Studio');
    assert.equal(input.brief.language, 'fr');
    assert.ok(input.brief.proofPoints && input.brief.proofPoints.length > 0);
    assert.ok(typeof input.confidence_score === 'number');
    assert.equal(input.brief.tone, 'professional');
  });

  it('omits proofPoints when proof field is empty', () => {
    const d: OnboardingDraft = { ...NOVA_STUDIO_EXAMPLE, proof: '' };
    const input = materializeFromOnboarding(d);
    assert.equal((input.brief.proofPoints ?? []).length, 0);
  });

  it('confidence score grows with form completeness', () => {
    const minimal = materializeFromOnboarding({ ...NOVA_STUDIO_EXAMPLE, proof: '', benefit: '', objection: '' });
    const rich = materializeFromOnboarding(NOVA_STUDIO_EXAMPLE);
    assert.ok((rich.confidence_score ?? 0) > (minimal.confidence_score ?? 0));
  });
});

describe('runOnboarding — happy path FR', () => {
  it('creates an offer + creative pack + ad gallery in one shot', () => {
    const store = createWorkspaceStore();
    const result = runOnboarding(store, NOVA_STUDIO_EXAMPLE);
    assert.ok(result.offer.id);
    assert.equal(result.packGenerated, true);
    assert.ok(result.adCount > 0);
    // Persisted in the store.
    assert.equal(store.listOffers().length, 1);
    assert.ok(store.listAssetsByOffer(result.offer.id).length > 0);
    assert.ok(store.listAdUnits(result.offer.id).length > 0);
  });

  it('FR onboarding produces FR ads with no English shell leak', () => {
    const store = createWorkspaceStore();
    const result = runOnboarding(store, NOVA_STUDIO_EXAMPLE);
    const ads = store.listAdUnits(result.offer.id);
    for (const ad of ads) {
      const blob = `${ad.hook}\n${ad.copy}\n${ad.cta}`.toLowerCase();
      assert.equal(/\btoday\b|\bbook a |\btap the |\byour audience\b|\bhere is\b/.test(blob), false,
        `FR ad leaks English: ${ad.hook}`);
    }
  });

  it('every ad in an FR onboarding passes language_consistency', () => {
    const store = createWorkspaceStore();
    const result = runOnboarding(store, NOVA_STUDIO_EXAMPLE);
    const ads = store.listAdUnits(result.offer.id);
    for (const ad of ads) {
      assert.equal(ad.checklist.language_consistency, true,
        `FR ad fails language_consistency: ${ad.hook}`);
    }
  });
});

describe('runOnboarding — EN branch', () => {
  const enDraft: OnboardingDraft = {
    offerName: 'Nova Studio',
    offerType: 'service',
    oneLiner: 'I help B2B consultants articulate their offer and ship a simple sales page in 4 weeks.',
    audience: 'B2B consultants who sell services',
    problem: 'Their offer is unclear and they lose prospects.',
    maturity: 'intermediate',
    proof: 'Validated with 12 consultant offers',
    benefit: 'One clear offer and a sales page ready in 4 weeks.',
    objection: "I don't have time to redo my whole offer.",
    cta: 'Book a 20-minute scoping call',
    tone: 'clear',
    language: 'en',
  };

  it('EN onboarding produces EN ads with no French shell leak', () => {
    const store = createWorkspaceStore();
    const result = runOnboarding(store, enDraft);
    const ads = store.listAdUnits(result.offer.id);
    for (const ad of ads) {
      const blob = `${ad.hook}\n${ad.copy}\n${ad.cta}`.toLowerCase();
      assert.equal(/\baujourd'hui\b|\bréserver?\b|\bcliquer?\b|\bvoici\b/.test(blob), false,
        `EN ad leaks French: ${ad.hook}`);
    }
  });

  it('every ad in an EN onboarding passes language_consistency', () => {
    const store = createWorkspaceStore();
    const result = runOnboarding(store, enDraft);
    const ads = store.listAdUnits(result.offer.id);
    for (const ad of ads) {
      assert.equal(ad.checklist.language_consistency, true,
        `EN ad fails language_consistency: ${ad.hook}`);
    }
  });
});

describe('runOnboarding — re-run idempotency', () => {
  it('re-running on the same offer (improve mode) does not duplicate assets', () => {
    const store = createWorkspaceStore();
    const r1 = runOnboarding(store, NOVA_STUDIO_EXAMPLE);
    const assetsAfterFirst = store.listAssetsByOffer(r1.offer.id).length;
    const adsAfterFirst = store.listAdUnits(r1.offer.id).length;

    // Improve the same offer with a slightly different draft.
    const r2 = runOnboarding(
      store,
      { ...NOVA_STUDIO_EXAMPLE, cta: 'Réserver une démo' },
      { improveOfferId: r1.offer.id },
    );
    assert.equal(r2.offer.id, r1.offer.id, 'should reuse the same offer id');
    assert.equal(r2.packGenerated, false, 'pack must not be regenerated');

    const assetsAfterSecond = store.listAssetsByOffer(r1.offer.id).length;
    const adsAfterSecond = store.listAdUnits(r1.offer.id).length;
    assert.equal(assetsAfterSecond, assetsAfterFirst, 'assets must not duplicate');
    assert.equal(adsAfterSecond, adsAfterFirst, 'ads must not duplicate (upsert by stable id)');
  });

  it('re-running without improveOfferId creates a new offer, never overwrites the previous one', () => {
    const store = createWorkspaceStore();
    const r1 = runOnboarding(store, NOVA_STUDIO_EXAMPLE);
    const r2 = runOnboarding(store, NOVA_STUDIO_EXAMPLE);
    assert.notEqual(r1.offer.id, r2.offer.id);
    assert.equal(store.listOffers().length, 2);
  });
});

describe('runOnboarding — export round-trip', () => {
  it('AI-012 export preserves the onboarding-generated offer + assets + ads', () => {
    const store = createWorkspaceStore();
    const r = runOnboarding(store, NOVA_STUDIO_EXAMPLE);
    const env = store.getEnvelope();
    const text = serializeWorkspace(env, '2026-05-06T00:00:00Z');
    const parsed = parseWorkspaceImport(text);
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.envelope.offers.length, 1);
    assert.equal(parsed.envelope.offers[0]!.id, r.offer.id);
    assert.ok((parsed.envelope.assets ?? []).length > 0);
    assert.ok((parsed.envelope.ad_units ?? []).length > 0);
  });
});

describe('runOnboarding — validation guard', () => {
  it('throws when called with an incomplete draft', () => {
    const store = createWorkspaceStore();
    assert.throws(
      () => runOnboarding(store, EMPTY_DRAFT),
      /onboarding_draft_incomplete/,
    );
  });
});

describe('draftFromOffer', () => {
  it('round-trips name + brief.offer + targetAudience + proofPoints + language', () => {
    const store = createWorkspaceStore();
    const r = runOnboarding(store, NOVA_STUDIO_EXAMPLE);
    const offer = store.getOffer(r.offer.id)!;
    const draft = draftFromOffer(offer);
    assert.equal(draft.offerName, 'Nova Studio');
    assert.equal(draft.oneLiner, NOVA_STUDIO_EXAMPLE.oneLiner);
    assert.equal(draft.audience, NOVA_STUDIO_EXAMPLE.audience);
    assert.equal(draft.proof, NOVA_STUDIO_EXAMPLE.proof);
    assert.equal(draft.language, 'fr');
    assert.equal(draft.tone, 'clear');
  });
});
