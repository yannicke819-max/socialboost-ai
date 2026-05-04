import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { runOfferBrain } from '../agent';
import { OfferBrainAgentError } from '../errors';

// Helper — used in every describe block to guarantee a clean env for each test.
function clearEnv(): void {
  delete process.env.OFFER_BRAIN_USE_REAL_MODEL;
  delete process.env.ANTHROPIC_API_KEY;
}

describe('runOfferBrain — mock default', () => {
  beforeEach(clearEnv);
  afterEach(clearEnv);

  it('returns mock by default (no env)', async () => {
    const r = await runOfferBrain({ raw_offer_text: 'A simple coaching offer' });
    assert.equal(r.metadata.source, 'mock');
  });

  it('returns mock when flag is true but key is missing', async () => {
    process.env.OFFER_BRAIN_USE_REAL_MODEL = 'true';
    const r = await runOfferBrain({ raw_offer_text: 'A simple coaching offer' });
    assert.equal(r.metadata.source, 'mock');
  });

  it('returns mock when flag is missing but key is set', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-test';
    const r = await runOfferBrain({ raw_offer_text: 'A simple coaching offer' });
    assert.equal(r.metadata.source, 'mock');
  });

  it('returns mock when flag is "false" and key is set', async () => {
    process.env.OFFER_BRAIN_USE_REAL_MODEL = 'false';
    process.env.ANTHROPIC_API_KEY = 'sk-test';
    const r = await runOfferBrain({ raw_offer_text: 'A simple coaching offer' });
    assert.equal(r.metadata.source, 'mock');
  });

  it('forceMock option overrides env', async () => {
    process.env.OFFER_BRAIN_USE_REAL_MODEL = 'true';
    process.env.ANTHROPIC_API_KEY = 'sk-test';
    const r = await runOfferBrain({ raw_offer_text: 'Force mock test' }, { forceMock: true });
    assert.equal(r.metadata.source, 'mock');
  });
});

describe('runOfferBrain — input validation', () => {
  beforeEach(clearEnv);
  afterEach(clearEnv);

  it('rejects empty raw_offer_text with structured error', async () => {
    await assert.rejects(
      () => runOfferBrain({ raw_offer_text: '' }),
      (err: unknown) => err instanceof OfferBrainAgentError,
    );
  });

  it('rejects entirely missing input', async () => {
    await assert.rejects(
      () => runOfferBrain({}),
      (err: unknown) => err instanceof OfferBrainAgentError,
    );
  });

  it('rejects unknown extra fields', async () => {
    await assert.rejects(
      () => runOfferBrain({ raw_offer_text: 'ok', not_in_schema: 'extra' }),
      (err: unknown) => err instanceof OfferBrainAgentError,
    );
  });

  it('error code is invalid_input on schema fail', async () => {
    try {
      await runOfferBrain({ raw_offer_text: '' });
      assert.fail('Should have thrown');
    } catch (err) {
      assert.ok(err instanceof OfferBrainAgentError);
      assert.equal(err.code, 'invalid_input');
    }
  });
});

describe('runOfferBrain — business invariants (caps)', () => {
  beforeEach(clearEnv);
  afterEach(clearEnv);

  it('confidence_score ≤ 70 when no proof_points provided', async () => {
    const r = await runOfferBrain({ raw_offer_text: 'Coaching offer with no proof yet' });
    assert.equal(r.output.proofs.proof_points.length, 0);
    assert.ok(r.output.intelligence.confidence_score <= 70);
  });

  it('proof_score ≤ 40 when proof_points empty', async () => {
    const r = await runOfferBrain({ raw_offer_text: 'Vague service idea' });
    assert.equal(r.output.proofs.proof_points.length, 0);
    assert.ok(r.output.intelligence.proof_score <= 40);
  });

  it('conversion_readiness_score ≤ 70 when CTA absent', async () => {
    const r = await runOfferBrain({ raw_offer_text: 'Some offer with no CTA defined' });
    assert.equal(r.output.conversion.cta_strength, 'absent');
    assert.ok(r.output.intelligence.conversion_readiness_score <= 70);
  });

  it('confidence/proof scores can exceed caps when proofs are provided', async () => {
    const r = await runOfferBrain({
      raw_offer_text: 'Coaching with case studies',
      proof_points: ['47 RDV en 8 semaines', '+24% taux signature'],
      desired_cta: 'Calendly link',
    });
    assert.ok(r.output.proofs.proof_points.length > 0);
    assert.ok(r.output.intelligence.confidence_score > 70);
    assert.ok(r.output.intelligence.proof_score > 40);
  });
});

describe('runOfferBrain — follow-up questions max 3', () => {
  beforeEach(clearEnv);
  afterEach(clearEnv);

  it('produces at most 3 follow-up questions even with many missing fields', async () => {
    const r = await runOfferBrain({ raw_offer_text: 'Vague' });
    assert.ok(r.output.missing.recommended_followup_questions.length <= 3);
  });
});

describe('runOfferBrain — anti-invention safeguards', () => {
  beforeEach(clearEnv);
  afterEach(clearEnv);

  it('proof_points stays empty if input had none — no invented proofs', async () => {
    const r = await runOfferBrain({
      raw_offer_text: 'Coaching for consultants — no specifics about results',
    });
    assert.deepEqual(r.output.proofs.proof_points, []);
    assert.equal(r.output.proofs.proof_quality, 'missing');
  });

  it('proof_points contains user-provided values verbatim, not invented metrics', async () => {
    const r = await runOfferBrain({
      raw_offer_text: 'Coaching offer',
      proof_points: ['12 alumni since 2024'],
    });
    assert.ok(r.output.proofs.proof_points.includes('12 alumni since 2024'));
    assert.equal(r.output.proofs.proof_points.length, 1);
  });
});
