import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { OfferBrainInputSchema, OfferBriefOutputSchema } from '../schema';
import { offerBrainMock } from '../mock';

describe('OfferBrainInputSchema', () => {
  it('accepts a minimal valid input (raw_offer_text only)', () => {
    const r = OfferBrainInputSchema.safeParse({
      raw_offer_text: 'A 4-week LinkedIn coaching program for solo consultants.',
    });
    assert.equal(r.success, true);
  });

  it('rejects an empty raw_offer_text', () => {
    const r = OfferBrainInputSchema.safeParse({ raw_offer_text: '' });
    assert.equal(r.success, false);
  });

  it('rejects unknown top-level fields (.strict())', () => {
    const r = OfferBrainInputSchema.safeParse({
      raw_offer_text: 'valid',
      hidden_field: 'not allowed',
    });
    assert.equal(r.success, false);
  });

  it('rejects invalid locale enum', () => {
    const r = OfferBrainInputSchema.safeParse({
      raw_offer_text: 'valid',
      locale: 'pt',
    });
    assert.equal(r.success, false);
  });

  it('accepts business optional fields', () => {
    const r = OfferBrainInputSchema.safeParse({
      raw_offer_text: 'Coaching program',
      current_offer_name: 'LinkedIn Pipeline',
      current_price: 900,
      currency: 'EUR',
      target_customer: 'Consultants solo B2B',
      proof_points: ['47 RDV en 8 semaines'],
      desired_cta: 'Calendly link',
    });
    assert.equal(r.success, true);
  });
});

describe('OfferBriefOutputSchema — structural validation', () => {
  it('mock returns a structurally valid OfferBrief', () => {
    const out = offerBrainMock({
      raw_offer_text: 'Coaching LinkedIn 900 EUR pour consultants solo',
      current_price: 900,
      currency: 'EUR',
      desired_cta: 'Calendly link',
      proof_points: ['47 RDV en 8 semaines'],
    });
    const r = OfferBriefOutputSchema.safeParse(out);
    if (!r.success) {
      console.error(r.error.flatten());
    }
    assert.equal(r.success, true);
  });

  it('rejects extra unknown fields at top level (.strict())', () => {
    const out = offerBrainMock({ raw_offer_text: 'anything' }) as unknown as Record<string, unknown>;
    const tampered = { ...out, hacked: 'extra' };
    const r = OfferBriefOutputSchema.safeParse(tampered);
    assert.equal(r.success, false);
  });
});
