/**
 * Tests for the API route — focuses on the OFFER_BRAIN_API_ENABLED security gate.
 *
 * Imports the POST handler directly from the route file and invokes it with
 * a fabricated Request, no HTTP server needed.
 */
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { POST } from '../../../../app/api/ai/offer-brain/route';
import { endpointEnabled } from '../api-flag';

function clearEnv(): void {
  delete process.env.OFFER_BRAIN_API_ENABLED;
  delete process.env.OFFER_BRAIN_USE_REAL_MODEL;
  delete process.env.ANTHROPIC_API_KEY;
}

function mkReq(body: unknown): Request {
  return new Request('http://localhost/api/ai/offer-brain', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('endpointEnabled — strict opt-in', () => {
  beforeEach(clearEnv);
  afterEach(clearEnv);

  it('returns false when env is absent', () => {
    assert.equal(endpointEnabled(), false);
  });

  it('returns true only on literal "true"', () => {
    process.env.OFFER_BRAIN_API_ENABLED = 'true';
    assert.equal(endpointEnabled(), true);
  });

  it('returns false on "false"', () => {
    process.env.OFFER_BRAIN_API_ENABLED = 'false';
    assert.equal(endpointEnabled(), false);
  });

  it('returns false on "TRUE" (case-sensitive — opt-in must be explicit)', () => {
    process.env.OFFER_BRAIN_API_ENABLED = 'TRUE';
    assert.equal(endpointEnabled(), false);
  });

  it('returns false on "1"', () => {
    process.env.OFFER_BRAIN_API_ENABLED = '1';
    assert.equal(endpointEnabled(), false);
  });

  it('returns false on empty string', () => {
    process.env.OFFER_BRAIN_API_ENABLED = '';
    assert.equal(endpointEnabled(), false);
  });
});

describe('POST /api/ai/offer-brain — security gate', () => {
  beforeEach(clearEnv);
  afterEach(clearEnv);

  it('returns 404 when flag is absent (default)', async () => {
    const res = await POST(mkReq({ raw_offer_text: 'A coaching offer' }));
    assert.equal(res.status, 404);
  });

  it('returns 404 when flag is "false"', async () => {
    process.env.OFFER_BRAIN_API_ENABLED = 'false';
    const res = await POST(mkReq({ raw_offer_text: 'A coaching offer' }));
    assert.equal(res.status, 404);
  });

  it('returns 404 when flag is "1"', async () => {
    process.env.OFFER_BRAIN_API_ENABLED = '1';
    const res = await POST(mkReq({ raw_offer_text: 'A coaching offer' }));
    assert.equal(res.status, 404);
  });

  it('disabled response body is "Not Found" (no leak of internal state)', async () => {
    const res = await POST(mkReq({ raw_offer_text: 'A coaching offer' }));
    const text = await res.text();
    assert.equal(text, 'Not Found');
  });

  it('disabled does NOT execute the agent (no body parsing required)', async () => {
    // Pass deliberately invalid JSON body — should still return 404, not 400
    const req = new Request('http://localhost/api/ai/offer-brain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json {{{',
    });
    const res = await POST(req);
    assert.equal(res.status, 404);
  });
});

describe('POST /api/ai/offer-brain — enabled behavior', () => {
  beforeEach(() => {
    clearEnv();
    process.env.OFFER_BRAIN_API_ENABLED = 'true';
  });
  afterEach(clearEnv);

  it('returns 200 with valid input when enabled (mock by default)', async () => {
    const res = await POST(mkReq({ raw_offer_text: 'A coaching offer for solo consultants' }));
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.ok, true);
    assert.equal(json.metadata.source, 'mock');
    assert.ok(json.output.identification);
    assert.ok(json.output.intelligence);
  });

  it('returns 400 with structured error on invalid input', async () => {
    const res = await POST(mkReq({ raw_offer_text: '' }));
    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.ok, false);
    assert.equal(json.error.code, 'invalid_input');
  });

  it('returns 400 on malformed JSON body', async () => {
    const req = new Request('http://localhost/api/ai/offer-brain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json {{{',
    });
    const res = await POST(req);
    assert.equal(res.status, 400);
  });

  it('does NOT expose stack traces on errors', async () => {
    const res = await POST(mkReq({ raw_offer_text: '' }));
    const json = await res.json();
    // The error payload contains code + message + (optional) details — never a stack
    assert.equal(typeof json.error.code, 'string');
    assert.equal(typeof json.error.message, 'string');
    assert.equal('stack' in json.error, false);
  });
});
