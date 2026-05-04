import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runOfferBrainViaContract } from '../contract-adapter';

const SENSITIVE = 'CONFIDENTIAL_OFFER_TEXT_alpha_beta_gamma_42';

describe('runOfferBrainViaContract — invalid_input redaction', () => {
  it('emits a stable invalid_input error code', async () => {
    const contract = await runOfferBrainViaContract({
      raw_offer_text: 12345, // wrong type
      locale: 'klingon', // not in enum
    });
    assert.equal(contract.errors.length >= 1, true);
    assert.equal(contract.errors[0]?.code, 'invalid_input');
    assert.equal(contract.errors[0]?.recoverable, false);
  });

  it('error.details is structural-only (no raw messages, no input values)', async () => {
    const contract = await runOfferBrainViaContract({
      raw_offer_text: SENSITIVE, // valid string but we'll fail on something else
      locale: 'klingon',
      currency: 'PESETA', // invalid
    });
    const err = contract.errors[0];
    assert.ok(err, 'expected at least one error');
    const details = err.details ?? {};

    // Required structural keys
    assert.equal(typeof details.field_count, 'number');
    assert.equal(typeof details.form_error_count, 'number');
    assert.equal(typeof details.field_error_counts, 'object');
    assert.ok(Array.isArray(details.issue_codes));

    // No 'issues', 'fieldErrors', 'formErrors' raw payload keys leaked
    assert.equal('issues' in details, false);
    assert.equal('fieldErrors' in details, false);
    assert.equal('formErrors' in details, false);

    // Field error counts are integers, keyed by schema field names only
    for (const [k, v] of Object.entries(
      details.field_error_counts as Record<string, unknown>,
    )) {
      assert.equal(typeof v, 'number');
      assert.equal(Number.isInteger(v as number), true);
      // Keys are schema fields, not user-supplied content (no whitespace shapes)
      assert.equal(/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(k), true);
    }

    // Issue codes come from Zod's closed enum (snake_case, e.g. 'invalid_type')
    for (const code of details.issue_codes as string[]) {
      assert.equal(typeof code, 'string');
      assert.equal(/^[a-z][a-z_]*$/.test(code), true);
    }
  });

  it('serialized error does not contain the sensitive input value', async () => {
    const contract = await runOfferBrainViaContract({
      raw_offer_text: SENSITIVE,
      locale: 'klingon',
    });
    const serialized = JSON.stringify(contract.errors);
    assert.doesNotMatch(serialized, new RegExp(SENSITIVE));
  });

  it('serialized error does not contain raw Zod messages', async () => {
    const contract = await runOfferBrainViaContract({
      locale: 'klingon', // missing required raw_offer_text + invalid enum
    });
    const serialized = JSON.stringify(contract.errors);
    // Common Zod message fragments that would indicate raw messages leaked through
    assert.doesNotMatch(serialized, /Required/);
    assert.doesNotMatch(serialized, /Invalid enum value/);
    assert.doesNotMatch(serialized, /Expected .* received/);
  });

  it('field_error_counts keys reflect known schema fields', async () => {
    const contract = await runOfferBrainViaContract({
      raw_offer_text: SENSITIVE,
      locale: 'klingon',
      currency: 'PESETA',
    });
    const details = contract.errors[0]?.details as Record<string, unknown>;
    const counts = details.field_error_counts as Record<string, number>;
    // We expect at least one of the invalid field names; we don't assert exact set
    // (Zod's flatten groups top-level errors). Sensitivity is in values, not keys.
    const keys = Object.keys(counts);
    assert.ok(keys.length >= 1);
  });
});
