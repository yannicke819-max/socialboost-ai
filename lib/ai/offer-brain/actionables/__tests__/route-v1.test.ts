/**
 * Endpoint integration tests for the v1 input format on /api/ai/offer-brain.
 * No HTTP server — invokes the POST handler directly.
 */
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { POST } from '../../../../../app/api/ai/offer-brain/route';

const ENV = process.env as Record<string, string | undefined>;

function clearEnv(): void {
  delete ENV.OFFER_BRAIN_API_ENABLED;
  delete ENV.OFFER_BRAIN_USE_REAL_MODEL;
  delete ENV.ANTHROPIC_API_KEY;
}

function mkReq(body: unknown): Request {
  return new Request('http://localhost/api/ai/offer-brain', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const v1Sample = {
  businessName: 'Atelier Nova',
  offer:
    "Accompagnement de 4 semaines pour aider les indépendants à clarifier leur offre et créer une page de vente simple.",
  targetAudience: 'indépendants et consultants',
  tone: 'professional',
  language: 'fr',
  platforms: ['linkedin', 'email', 'landing_page'],
  proofPoints: ['Méthode testée sur 12 offres de consultants'],
  include_actionables: true,
};

describe('POST /api/ai/offer-brain — v1 flag OFF', () => {
  beforeEach(clearEnv);
  afterEach(clearEnv);

  it('returns 404 with v1 input when flag is absent', async () => {
    const res = await POST(mkReq(v1Sample));
    assert.equal(res.status, 404);
  });

  it('returns 404 with v1 input when flag is "false"', async () => {
    ENV.OFFER_BRAIN_API_ENABLED = 'false';
    const res = await POST(mkReq(v1Sample));
    assert.equal(res.status, 404);
  });
});

describe('POST /api/ai/offer-brain — v1 flag ON: success path', () => {
  beforeEach(() => {
    clearEnv();
    ENV.OFFER_BRAIN_API_ENABLED = 'true';
  });
  afterEach(clearEnv);

  it('returns 200 with diagnostic + actionables on a valid v1 input', async () => {
    const res = await POST(mkReq(v1Sample));
    assert.equal(res.status, 200);
    const json = (await res.json()) as Record<string, unknown>;
    assert.ok(json.diagnostic, 'diagnostic must be present');
    assert.ok(json.actionables, 'actionables must be present');
    assert.ok(json.metadata, 'metadata must be present');
  });

  it('actionables contains all required top-level sections', async () => {
    const res = await POST(mkReq(v1Sample));
    const json = (await res.json()) as { actionables: Record<string, unknown> };
    const a = json.actionables;
    for (const key of [
      'schema_version',
      'offer_summary',
      'target_audience',
      'pain_points',
      'value_proposition',
      'proof_points',
      'objections',
      'offer_angles',
      'hooks',
      'ctas',
      'social_posts',
      'landing_page_sections',
      'confidence_score',
      'confidence_rationale',
      'warnings',
    ]) {
      assert.ok(key in a, `missing key: ${key}`);
    }
  });

  it('hooks ≥ 5, angles ≥ 3, objections ≥ 4, ctas ≥ 3, landing = 5', async () => {
    const res = await POST(mkReq(v1Sample));
    const json = (await res.json()) as { actionables: Record<string, unknown[]> };
    const a = json.actionables;
    assert.ok((a.hooks as unknown[]).length >= 5);
    assert.ok((a.offer_angles as unknown[]).length >= 3);
    assert.ok((a.objections as unknown[]).length >= 4);
    assert.ok((a.ctas as unknown[]).length >= 3);
    assert.equal((a.landing_page_sections as unknown[]).length, 5);
  });

  it('respects requested platforms (no instagram if not requested)', async () => {
    const res = await POST(mkReq(v1Sample));
    const json = (await res.json()) as { actionables: { social_posts: { platform: string }[] } };
    const platforms = json.actionables.social_posts.map((p) => p.platform);
    assert.ok(!platforms.includes('instagram'));
    assert.ok(!platforms.includes('landing_page'));
  });

  it('returns 200 without actionables when include_actionables=false', async () => {
    const res = await POST(mkReq({ ...v1Sample, include_actionables: false }));
    assert.equal(res.status, 200);
    const json = (await res.json()) as Record<string, unknown>;
    assert.ok(json.diagnostic);
    assert.equal('actionables' in json, false);
  });

  it('returns 200 with actionables by default (include_actionables omitted)', async () => {
    const { include_actionables, ...without } = v1Sample;
    void include_actionables;
    const res = await POST(mkReq(without));
    assert.equal(res.status, 200);
    const json = (await res.json()) as Record<string, unknown>;
    assert.ok(json.actionables);
  });
});

describe('POST /api/ai/offer-brain — v1 flag ON: validation', () => {
  beforeEach(() => {
    clearEnv();
    ENV.OFFER_BRAIN_API_ENABLED = 'true';
  });
  afterEach(clearEnv);

  it('returns 400 with structured error when businessName is missing', async () => {
    const res = await POST(mkReq({ offer: 'X' }));
    assert.equal(res.status, 400);
    const json = (await res.json()) as { error: { code: string; fields: { path: string }[] } };
    assert.equal(json.error.code, 'INVALID_INPUT');
    assert.ok(Array.isArray(json.error.fields));
    assert.ok(json.error.fields.length >= 1);
  });

  it('returns 400 with structured error when offer is missing', async () => {
    const res = await POST(mkReq({ businessName: 'X' }));
    assert.equal(res.status, 400);
    const json = (await res.json()) as { error: { code: string } };
    assert.equal(json.error.code, 'INVALID_INPUT');
  });

  it('returns 400 with structured error when tone is invalid', async () => {
    const res = await POST(mkReq({ ...v1Sample, tone: 'aggressive' }));
    assert.equal(res.status, 400);
    const json = (await res.json()) as { error: { code: string; fields: unknown[] } };
    assert.equal(json.error.code, 'INVALID_INPUT');
    assert.ok((json.error.fields as unknown[]).length >= 1);
  });

  it('returns 400 with structured error on malformed JSON', async () => {
    const req = new Request('http://localhost/api/ai/offer-brain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ broken',
    });
    const res = await POST(req);
    assert.equal(res.status, 400);
    const json = (await res.json()) as { error: { code: string } };
    assert.equal(json.error.code, 'INVALID_INPUT');
  });

  it('error responses do not contain stack traces', async () => {
    const res = await POST(mkReq({ tone: 'invalid' })); // missing required fields
    const text = await res.text();
    assert.equal(/at\s+\S+\s+\(.*:\d+:\d+\)/.test(text), false);
    assert.equal(/Error:\s+/.test(text), false);
  });
});

describe('POST /api/ai/offer-brain — legacy AI-001 path still works', () => {
  beforeEach(() => {
    clearEnv();
    ENV.OFFER_BRAIN_API_ENABLED = 'true';
  });
  afterEach(clearEnv);

  it('legacy { raw_offer_text } input → 200 with { ok, output, metadata }', async () => {
    const res = await POST(
      mkReq({
        raw_offer_text:
          'Programme LinkedIn Pipeline 4 semaines pour consultants B2B solo.',
        locale: 'fr',
      }),
    );
    assert.equal(res.status, 200);
    const json = (await res.json()) as Record<string, unknown>;
    assert.equal(json.ok, true);
    assert.ok(json.output);
    assert.ok(json.metadata);
  });
});
