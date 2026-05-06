import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  diagnosticString,
  mergeOfferBundle,
  mergeWorkspace,
  parseOfferImport,
  parseWorkspaceImport,
  repairWorkspace,
  serializeOffer,
  serializeWorkspace,
  summarizeWorkspace,
} from '../persistence';
import {
  KIND_TO_DIMENSIONS,
  STORAGE_VERSION,
  type Asset,
  type CalendarSlot,
  type Offer,
  type WeeklyPlan,
  type WorkspaceFile,
} from '../types';

const NOW = '2026-05-06T12:00:00.000Z';

function makeOffer(over: Partial<Offer> = {}): Offer {
  return {
    id: over.id ?? 'ofr_a',
    name: over.name ?? 'Test',
    status: over.status ?? 'draft',
    goal: over.goal ?? 'clarify_offer',
    language: over.language ?? 'fr',
    brief: over.brief ?? {
      businessName: 'Test',
      offer: 'Test',
      tone: 'professional',
      language: 'fr',
      platforms: ['linkedin'],
      proofPoints: [],
    },
    confidence_score: 80,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function mkAsset(over: Partial<Asset> = {}): Asset {
  const kind = over.kind ?? 'hook';
  return {
    id: over.id ?? `ast_${Math.random().toString(36).slice(2, 8)}`,
    offerId: over.offerId ?? 'ofr_a',
    kind,
    body: over.body ?? 'body',
    dimensions: KIND_TO_DIMENSIONS[kind] ?? ['asset'],
    status: over.status ?? 'draft',
    source: 'mock',
    createdAt: NOW,
    ...over,
  };
}

function mkSlot(over: Partial<CalendarSlot> = {}): CalendarSlot {
  return {
    id: over.id ?? 'slt_x',
    offerId: over.offerId ?? 'ofr_a',
    channel: over.channel ?? 'linkedin',
    scheduledAt: over.scheduledAt ?? NOW,
    status: over.status ?? 'planned',
    createdAt: NOW,
    ...over,
  };
}

function mkPlan(over: Partial<WeeklyPlan> = {}): WeeklyPlan {
  return {
    id: over.id ?? 'wpl_x',
    offerId: over.offerId ?? 'ofr_a',
    weekStart: '2026-05-04',
    goal: 'visibility',
    slots: over.slots ?? [],
    createdAt: NOW,
    updatedAt: NOW,
    ...over,
  };
}

function emptyEnv(): WorkspaceFile {
  return {
    version: STORAGE_VERSION,
    offers: [],
    assets: [],
    calendar_slots: [],
    recommendations: [],
    weekly_plans: [],
    feedback_recommendations: [],
    feedback_history: [],
    feedback_preferences: [],
  };
}

// -----------------------------------------------------------------------------

describe('summarizeWorkspace', () => {
  it('counts every collection and surfaces mock=true', () => {
    const env: WorkspaceFile = {
      ...emptyEnv(),
      offers: [makeOffer()],
      assets: [mkAsset()],
      weekly_plans: [mkPlan()],
    };
    const s = summarizeWorkspace(env);
    assert.equal(s.offers, 1);
    assert.equal(s.assets, 1);
    assert.equal(s.weekly_plans, 1);
    assert.equal(s.calendar_slots, 0);
    assert.equal(s.feedback_recommendations, 0);
    assert.equal(s.mock, true);
    assert.equal(s.version, STORAGE_VERSION);
  });

  it('handles legacy envelopes missing optional arrays', () => {
    const legacy = {
      version: STORAGE_VERSION,
      offers: [],
      assets: [],
    } as WorkspaceFile;
    const s = summarizeWorkspace(legacy);
    assert.equal(s.weekly_plans, 0);
    assert.equal(s.feedback_recommendations, 0);
  });
});

describe('serializeWorkspace', () => {
  it('stamps exported_at and round-trips through parse', () => {
    const env: WorkspaceFile = {
      ...emptyEnv(),
      offers: [makeOffer()],
      assets: [mkAsset()],
    };
    const json = serializeWorkspace(env, NOW);
    const result = parseWorkspaceImport(json);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.envelope.exported_at, NOW);
      assert.equal(result.envelope.offers.length, 1);
      assert.equal(result.envelope.assets.length, 1);
    }
  });
});

describe('parseWorkspaceImport — error paths', () => {
  it('empty input → empty', () => {
    const r = parseWorkspaceImport('');
    assert.deepEqual(r, { ok: false, code: 'empty' });
  });

  it('invalid JSON → invalid_json', () => {
    const r = parseWorkspaceImport('{not valid');
    assert.deepEqual(r, { ok: false, code: 'invalid_json' });
  });

  it('non-object root → not_an_envelope', () => {
    const r = parseWorkspaceImport('"hello"');
    assert.deepEqual(r, { ok: false, code: 'not_an_envelope' });
  });

  it('wrong version → unsupported_version', () => {
    const r = parseWorkspaceImport(JSON.stringify({ version: 999, offers: [], assets: [] }));
    assert.deepEqual(r, { ok: false, code: 'unsupported_version' });
  });

  it('an offer bundle is rejected → wrong_bundle_kind', () => {
    const bundle = {
      bundle: 'offer',
      version: STORAGE_VERSION,
      offer: makeOffer(),
    };
    const r = parseWorkspaceImport(JSON.stringify(bundle));
    assert.deepEqual(r, { ok: false, code: 'wrong_bundle_kind' });
  });

  it('valid empty envelope succeeds', () => {
    const env = JSON.stringify({ version: STORAGE_VERSION, offers: [], assets: [] });
    const r = parseWorkspaceImport(env);
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.summary.offers, 0);
      assert.equal(r.summary.assets, 0);
    }
  });
});

describe('mergeWorkspace', () => {
  it('skip duplicates by id (current wins)', () => {
    const current: WorkspaceFile = {
      ...emptyEnv(),
      offers: [makeOffer({ id: 'A', name: 'CurrentName' })],
      assets: [mkAsset({ id: 'a1', offerId: 'A', body: 'kept' })],
    };
    const incoming: WorkspaceFile = {
      ...emptyEnv(),
      offers: [
        makeOffer({ id: 'A', name: 'IncomingName' }),
        makeOffer({ id: 'B', name: 'NewOffer' }),
      ],
      assets: [
        mkAsset({ id: 'a1', offerId: 'A', body: 'overwritten' }),
        mkAsset({ id: 'a2', offerId: 'B' }),
      ],
    };
    const merged = mergeWorkspace(current, incoming, 'merge');
    assert.equal(merged.offers!.length, 2);
    assert.equal(merged.offers!.find((o) => o.id === 'A')!.name, 'CurrentName');
    assert.ok(merged.offers!.find((o) => o.id === 'B'));
    assert.equal(merged.assets!.length, 2);
    assert.equal(merged.assets!.find((a) => a.id === 'a1')!.body, 'kept');
  });

  it('replace mode returns the incoming envelope verbatim (no merge)', () => {
    const current: WorkspaceFile = {
      ...emptyEnv(),
      offers: [makeOffer({ id: 'A' })],
    };
    const incoming: WorkspaceFile = {
      ...emptyEnv(),
      offers: [makeOffer({ id: 'B' })],
    };
    const merged = mergeWorkspace(current, incoming, 'replace');
    assert.deepEqual(
      merged.offers!.map((o) => o.id),
      ['B'],
    );
  });

  it('does not mutate the inputs', () => {
    const current: WorkspaceFile = {
      ...emptyEnv(),
      offers: [makeOffer({ id: 'A' })],
    };
    const incoming: WorkspaceFile = {
      ...emptyEnv(),
      offers: [makeOffer({ id: 'B' })],
    };
    const beforeCurrent = JSON.stringify(current);
    const beforeIncoming = JSON.stringify(incoming);
    mergeWorkspace(current, incoming);
    assert.equal(JSON.stringify(current), beforeCurrent);
    assert.equal(JSON.stringify(incoming), beforeIncoming);
  });
});

describe('serializeOffer / parseOfferImport — round trip', () => {
  it('extracts only the requested offer + its dependents', () => {
    const env: WorkspaceFile = {
      ...emptyEnv(),
      offers: [makeOffer({ id: 'A' }), makeOffer({ id: 'B' })],
      assets: [
        mkAsset({ id: 'a1', offerId: 'A' }),
        mkAsset({ id: 'a2', offerId: 'B' }),
      ],
      weekly_plans: [mkPlan({ id: 'p1', offerId: 'A' }), mkPlan({ id: 'p2', offerId: 'B' })],
    };
    const text = serializeOffer(env, 'A', NOW);
    assert.ok(text);
    const parsed = parseOfferImport(text!);
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(parsed.bundle.offer.id, 'A');
      assert.equal(parsed.bundle.assets.length, 1);
      assert.equal(parsed.bundle.assets[0]!.id, 'a1');
      assert.equal(parsed.bundle.weekly_plans.length, 1);
      assert.equal(parsed.bundle.weekly_plans[0]!.id, 'p1');
    }
  });

  it('returns undefined when offer id is unknown', () => {
    const env: WorkspaceFile = { ...emptyEnv(), offers: [makeOffer({ id: 'A' })] };
    assert.equal(serializeOffer(env, 'unknown', NOW), undefined);
  });

  it('strips orphan asset references from calendar slots', () => {
    const env: WorkspaceFile = {
      ...emptyEnv(),
      offers: [makeOffer({ id: 'A' })],
      assets: [mkAsset({ id: 'a1', offerId: 'A' })],
      calendar_slots: [
        mkSlot({ id: 's1', offerId: 'A', assetId: 'a1' }),
        mkSlot({ id: 's2', offerId: 'A', assetId: 'missing' }),
      ],
    };
    const text = serializeOffer(env, 'A', NOW);
    assert.ok(text);
    const parsed = parseOfferImport(text!);
    if (!parsed.ok) throw new Error('parse should succeed');
    const s2 = parsed.bundle.calendar_slots.find((s) => s.id === 's2');
    assert.ok(s2);
    assert.equal(s2!.assetId, undefined);
  });
});

describe('parseOfferImport — error paths', () => {
  it('rejects a workspace envelope', () => {
    const env = JSON.stringify({ version: STORAGE_VERSION, offers: [], assets: [] });
    const r = parseOfferImport(env);
    assert.deepEqual(r, { ok: false, code: 'wrong_bundle_kind' });
  });

  it('rejects wrong version', () => {
    const r = parseOfferImport(
      JSON.stringify({ bundle: 'offer', version: 999, offer: makeOffer() }),
    );
    assert.deepEqual(r, { ok: false, code: 'unsupported_version' });
  });

  it('rejects malformed offer field', () => {
    const r = parseOfferImport(
      JSON.stringify({ bundle: 'offer', version: STORAGE_VERSION, offer: 'not an offer' }),
    );
    assert.deepEqual(r, { ok: false, code: 'not_an_envelope' });
  });
});

describe('mergeOfferBundle', () => {
  it('integrates the bundle as a partial workspace via merge', () => {
    const current: WorkspaceFile = {
      ...emptyEnv(),
      offers: [makeOffer({ id: 'A' })],
    };
    const text = serializeOffer(
      {
        ...emptyEnv(),
        offers: [makeOffer({ id: 'B' })],
        assets: [mkAsset({ id: 'b1', offerId: 'B' })],
      },
      'B',
      NOW,
    );
    if (!text) throw new Error('serializeOffer failed');
    const parsed = parseOfferImport(text);
    if (!parsed.ok) throw new Error('parse failed');
    const merged = mergeOfferBundle(current, parsed.bundle);
    assert.deepEqual(
      merged.offers!.map((o) => o.id).sort(),
      ['A', 'B'],
    );
    assert.equal(merged.assets!.find((a) => a.id === 'b1')!.offerId, 'B');
  });
});

describe('repairWorkspace', () => {
  it('drops orphan assets when their offer is missing', () => {
    const env: WorkspaceFile = {
      ...emptyEnv(),
      offers: [makeOffer({ id: 'A' })],
      assets: [mkAsset({ id: 'good', offerId: 'A' }), mkAsset({ id: 'bad', offerId: 'GHOST' })],
    };
    const { repaired, report } = repairWorkspace(env);
    assert.equal(repaired.assets!.length, 1);
    assert.equal(repaired.assets![0]!.id, 'good');
    assert.equal(report.removed.assets, 1);
  });

  it('strips broken asset references on calendar slots without dropping the slot', () => {
    const env: WorkspaceFile = {
      ...emptyEnv(),
      offers: [makeOffer({ id: 'A' })],
      assets: [mkAsset({ id: 'a1', offerId: 'A' })],
      calendar_slots: [mkSlot({ id: 's', offerId: 'A', assetId: 'GHOST' })],
    };
    const { repaired, report } = repairWorkspace(env);
    assert.equal(repaired.calendar_slots!.length, 1);
    assert.equal(repaired.calendar_slots![0]!.assetId, undefined);
    assert.equal(report.removed.calendar_slot_links, 1);
    assert.equal(report.removed.calendar_slots, 0);
  });

  it('drops orphan plans + their feedback recos', () => {
    const env: WorkspaceFile = {
      ...emptyEnv(),
      offers: [makeOffer({ id: 'A' })],
      weekly_plans: [
        mkPlan({ id: 'p_alive', offerId: 'A' }),
        mkPlan({ id: 'p_orphan', offerId: 'GHOST' }),
      ],
      feedback_recommendations: [
        {
          id: 'p_alive:r1',
          offerId: 'A',
          planId: 'p_alive',
          ruleId: 'r1',
          action: 'a',
          why: 'b',
          impact: 'c',
          effort: 'low',
          confidence: 'high',
          status: 'todo',
        },
        {
          id: 'p_orphan:r2',
          offerId: 'GHOST',
          planId: 'p_orphan',
          ruleId: 'r2',
          action: 'a',
          why: 'b',
          impact: 'c',
          effort: 'low',
          confidence: 'high',
          status: 'todo',
        },
      ],
    };
    const { repaired, report } = repairWorkspace(env);
    assert.equal(repaired.weekly_plans!.length, 1);
    assert.equal(repaired.weekly_plans![0]!.id, 'p_alive');
    assert.equal(repaired.feedback_recommendations!.length, 1);
    assert.equal(report.removed.weekly_plans, 1);
    assert.equal(report.removed.feedback_recommendations, 1);
  });

  it('clean envelope returns zero removals', () => {
    const env: WorkspaceFile = {
      ...emptyEnv(),
      offers: [makeOffer({ id: 'A' })],
      assets: [mkAsset({ id: 'a1', offerId: 'A' })],
    };
    const { report } = repairWorkspace(env);
    assert.equal(report.removed.assets, 0);
    assert.equal(report.removed.calendar_slots, 0);
    assert.equal(report.removed.recommendations, 0);
    assert.equal(report.removed.weekly_plans, 0);
  });
});

describe('diagnosticString', () => {
  it('contains storage_key + counts + mock flag', () => {
    const env: WorkspaceFile = {
      ...emptyEnv(),
      offers: [makeOffer({ id: 'A' })],
      assets: [mkAsset({ offerId: 'A' })],
    };
    const text = diagnosticString(env, 'socialboost.offer_workspace', 'fr');
    assert.match(text, /Diagnostic workspace/);
    assert.match(text, /storage_key: socialboost\.offer_workspace/);
    assert.match(text, /offers: 1/);
    assert.match(text, /assets: 1/);
    assert.match(text, /mock: true/);
    assert.match(text, /real_publishing: false/);
    assert.match(text, /real_analytics: false/);
  });

  it('respects language for header', () => {
    const env = emptyEnv();
    assert.match(diagnosticString(env, 'k', 'fr'), /Diagnostic workspace/);
    assert.match(diagnosticString(env, 'k', 'en'), /Workspace diagnostic/);
  });
});
