/**
 * Store + export/import tests with a mocked localStorage.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Mock localStorage on the global BEFORE the store module reads it.
// (store.ts only checks `typeof window !== 'undefined'` inside functions, so
// installing the mock at module load is sufficient.)
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

import { createWorkspaceStore, deriveAssetsFromActionables } from '../store';
import { parseImported, validateWorkspaceFile } from '../export-import';
import { STORAGE_VERSION, WorkspaceStorageError } from '../types';

beforeEach(() => {
  g.window!.localStorage.clear();
});

describe('createWorkspaceStore — basic CRUD', () => {
  it('creates and retrieves an offer', () => {
    const store = createWorkspaceStore();
    const created = store.createOffer({
      goal: 'clarify_offer',
      language: 'fr',
      brief: {
        businessName: 'Atelier Nova',
        offer: 'Programme 4 semaines.',
        tone: 'professional',
        language: 'fr',
        platforms: ['linkedin'],
        proofPoints: ['Méthode testée'],
      },
      confidence_score: 80,
    });
    assert.ok(created.id.startsWith('ofr_'));
    assert.equal(created.name, 'Atelier Nova');
    assert.equal(created.status, 'draft');
    assert.equal(created.confidence_score, 80);
    assert.equal(created.primary_channel, 'linkedin');

    const fetched = store.getOffer(created.id);
    assert.ok(fetched);
    assert.equal(fetched.id, created.id);
    assert.equal(fetched.name, created.name);
    assert.equal(fetched.status, created.status);
    assert.equal(fetched.confidence_score, created.confidence_score);
    assert.equal(fetched.brief.businessName, created.brief.businessName);
    assert.equal(store.listOffers().length, 1);
  });

  it('updateOffer patches without losing id/createdAt', () => {
    const store = createWorkspaceStore();
    const o = store.createOffer({
      goal: 'clarify_offer',
      language: 'fr',
      brief: {
        businessName: 'X',
        offer: 'Y',
        tone: 'professional',
        language: 'fr',
        platforms: [],
        proofPoints: [],
      },
    });
    const updated = store.updateOffer(o.id, { name: 'New name', status: 'ready' });
    assert.ok(updated);
    assert.equal(updated.id, o.id);
    assert.equal(updated.createdAt, o.createdAt);
    assert.equal(updated.name, 'New name');
    assert.equal(updated.status, 'ready');
    // updatedAt is regenerated; it must be a parseable ISO ≥ createdAt
    assert.ok(new Date(updated.updatedAt).getTime() >= new Date(o.createdAt).getTime());
  });

  it('setStatus moves offer between Kanban columns', () => {
    const store = createWorkspaceStore();
    const o = store.createOffer({
      goal: 'clarify_offer',
      language: 'fr',
      brief: { businessName: 'X', offer: 'Y', tone: 'professional', language: 'fr', platforms: [], proofPoints: [] },
    });
    store.setStatus(o.id, 'scheduled_mock');
    const got = store.getOffer(o.id)!;
    assert.equal(got.status, 'scheduled_mock');
  });

  it('duplicateOffer clones offer + assets with new ids', () => {
    const store = createWorkspaceStore();
    const o = store.createOffer({
      goal: 'clarify_offer',
      language: 'fr',
      brief: { businessName: 'X', offer: 'Y', tone: 'professional', language: 'fr', platforms: [], proofPoints: [] },
    });
    store.createAsset({
      offerId: o.id,
      kind: 'hook',
      body: 'h1',
      status: 'draft',
    });
    const dup = store.duplicateOffer(o.id)!;
    assert.notEqual(dup.id, o.id);
    assert.match(dup.name, /\(copie\)$/);
    assert.equal(dup.status, 'draft');
    const dupAssets = store.listAssetsByOffer(dup.id);
    assert.equal(dupAssets.length, 1);
    assert.notEqual(dupAssets[0]!.id, store.listAssetsByOffer(o.id)[0]!.id);
    assert.equal(store.listOffers().length, 2);
  });

  it('deleteOffer removes offer + cascading assets', () => {
    const store = createWorkspaceStore();
    const o = store.createOffer({
      goal: 'clarify_offer',
      language: 'fr',
      brief: { businessName: 'X', offer: 'Y', tone: 'professional', language: 'fr', platforms: [], proofPoints: [] },
    });
    store.createAsset({ offerId: o.id, kind: 'hook', body: 'h', status: 'draft' });
    assert.equal(store.deleteOffer(o.id), true);
    assert.equal(store.listOffers().length, 0);
    assert.equal(store.listAssetsByOffer(o.id).length, 0);
  });
});

describe('createAsset — dimensions are auto-derived', () => {
  it('hook → [promise, asset]', () => {
    const store = createWorkspaceStore();
    const o = store.createOffer({
      goal: 'clarify_offer',
      language: 'fr',
      brief: { businessName: 'X', offer: 'Y', tone: 'professional', language: 'fr', platforms: [], proofPoints: [] },
    });
    const a = store.createAsset({ offerId: o.id, kind: 'hook', body: 'h', status: 'draft' });
    assert.deepEqual(a.dimensions, ['promise', 'asset']);
  });

  it('social_post → [asset, channel]', () => {
    const store = createWorkspaceStore();
    const o = store.createOffer({
      goal: 'clarify_offer',
      language: 'fr',
      brief: { businessName: 'X', offer: 'Y', tone: 'professional', language: 'fr', platforms: [], proofPoints: [] },
    });
    const a = store.createAsset({ offerId: o.id, kind: 'social_post', body: 'p', status: 'draft', channel: 'linkedin' });
    assert.deepEqual(a.dimensions, ['asset', 'channel']);
    assert.equal(a.channel, 'linkedin');
  });
});

describe('exportAll / replaceAll round-trip', () => {
  it('export → import yields equivalent state', () => {
    const store = createWorkspaceStore();
    const o = store.createOffer({
      goal: 'clarify_offer',
      language: 'fr',
      brief: { businessName: 'X', offer: 'Y', tone: 'professional', language: 'fr', platforms: ['linkedin'], proofPoints: [] },
    });
    store.createAsset({ offerId: o.id, kind: 'hook', body: 'h', status: 'draft' });
    const exported = store.exportAll();
    assert.equal(exported.version, STORAGE_VERSION);
    assert.equal(exported.offers.length, 1);
    assert.equal(exported.assets.length, 1);

    store.reset();
    assert.equal(store.listOffers().length, 0);

    store.replaceAll(exported);
    assert.equal(store.listOffers().length, 1);
    assert.equal(store.listAssetsByOffer(o.id).length, 1);
  });
});

describe('parseImported / validateWorkspaceFile', () => {
  it('rejects non-object', () => {
    assert.throws(() => validateWorkspaceFile('hello'), WorkspaceStorageError);
  });

  it('rejects missing version', () => {
    assert.throws(() => validateWorkspaceFile({ offers: [], assets: [] }), WorkspaceStorageError);
  });

  it('rejects wrong version', () => {
    assert.throws(
      () => validateWorkspaceFile({ version: 999, offers: [], assets: [] }),
      WorkspaceStorageError,
    );
  });

  it('parses valid JSON string', () => {
    const valid = JSON.stringify({ version: STORAGE_VERSION, offers: [], assets: [] });
    const out = parseImported(valid);
    assert.equal(out.version, STORAGE_VERSION);
    assert.deepEqual(out.offers, []);
    assert.deepEqual(out.assets, []);
  });

  it('drops invalid offer entries silently (defensive)', () => {
    const env = { version: STORAGE_VERSION, offers: ['not_an_offer', null, {}], assets: [] };
    const out = validateWorkspaceFile(env);
    assert.equal(out.offers.length, 0);
  });
});

describe('deriveAssetsFromActionables', () => {
  it('produces one asset per hook/angle/objection/cta/social_post/landing', () => {
    const out = deriveAssetsFromActionables('off1', {
      hooks: [{ type: 'pain', text: 'h1' }, { type: 'curiosity', text: 'h2' }],
      offer_angles: [{ name: 'A', angle: 'frame', best_for: 'them' }],
      objections: [{ objection: 'too expensive', response: 'because…' }],
      ctas: [{ label: 'Book', intent: 'decision' }],
      social_posts: [{ platform: 'linkedin', post: 'post body', cta: 'Book' }],
      landing_page_sections: [{ section: 'hero', headline: 'h', body: 'b' }],
    });
    assert.equal(out.length, 7);
    assert.equal(out.filter((a) => a.kind === 'hook').length, 2);
    assert.equal(out.filter((a) => a.kind === 'angle').length, 1);
    assert.equal(out.filter((a) => a.kind === 'objection').length, 1);
    assert.equal(out.filter((a) => a.kind === 'cta').length, 1);
    assert.equal(out.filter((a) => a.kind === 'social_post').length, 1);
    assert.equal(out.filter((a) => a.kind === 'landing_section').length, 1);
    // social_post carries channel
    assert.equal(out.find((a) => a.kind === 'social_post')!.channel, 'linkedin');
  });
});
