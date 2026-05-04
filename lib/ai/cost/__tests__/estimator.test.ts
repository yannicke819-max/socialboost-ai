import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { estimateCost, approximateTokensFromText } from '../estimator';

describe('approximateTokensFromText', () => {
  it('returns 0 for empty string', () => {
    assert.equal(approximateTokensFromText(''), 0);
  });
  it('returns ceil(length / 4) for non-empty', () => {
    assert.equal(approximateTokensFromText('abcd'), 1);
    assert.equal(approximateTokensFromText('abcde'), 2);
    assert.equal(approximateTokensFromText('a'.repeat(40)), 10);
  });
});

describe('estimateCost — mock provider', () => {
  it('returns zero-cost', () => {
    const c = estimateCost({
      task_type: 'offer_brain',
      provider: 'mock',
      model: 'mock-deterministic',
      raw_input: { raw_offer_text: 'long input ' + 'x'.repeat(500) },
    });
    assert.equal(c.estimated_input_tokens, 0);
    assert.equal(c.estimated_output_tokens, 0);
    assert.equal(c.estimated_total_tokens, 0);
    assert.equal(c.estimated_cost_credits, 0);
    assert.equal(c.requires_confirmation, false);
    assert.equal(c.premium_operation, false);
    assert.equal(c.blocked_by_budget, false);
    assert.equal(c.confidence, 'high');
  });
});

describe('estimateCost — anthropic provider', () => {
  it('estimates input tokens from raw text length', () => {
    const text = 'A coaching offer for solo consultants in B2B'; // 44 chars → 11 tokens
    const c = estimateCost({
      task_type: 'offer_brain',
      provider: 'anthropic',
      model: 'claude-test',
      raw_input: { raw_offer_text: text },
    });
    // Input is JSON.stringify of the object → wraps with key+quotes, more tokens than just text
    assert.ok(c.estimated_input_tokens > 0);
    assert.ok(c.estimated_output_tokens > 0);
    assert.equal(c.estimated_total_tokens, c.estimated_input_tokens + c.estimated_output_tokens);
  });

  it('estimated_cost_credits >= 1 for non-empty input', () => {
    const c = estimateCost({
      task_type: 'offer_brain',
      provider: 'anthropic',
      model: 'claude-test',
      raw_input: { raw_offer_text: 'x'.repeat(200) },
    });
    assert.ok(c.estimated_cost_credits >= 1);
  });

  it('requires_confirmation=true when credits > 50', () => {
    // Force expected_output_tokens large enough to push credits above threshold
    const c = estimateCost({
      task_type: 'offer_brain',
      provider: 'anthropic',
      model: 'claude-test',
      raw_input: { raw_offer_text: 'x'.repeat(200000) },
      expected_output_tokens: 200000,
    });
    assert.equal(c.requires_confirmation, true);
    assert.ok(c.estimated_cost_credits > 50);
  });

  it('requires_confirmation=false for typical Offer Brain text', () => {
    const c = estimateCost({
      task_type: 'offer_brain',
      provider: 'anthropic',
      model: 'claude-test',
      raw_input: { raw_offer_text: 'A coaching offer with a Calendly link.' },
    });
    assert.equal(c.requires_confirmation, false);
    assert.equal(c.premium_operation, false);
  });
});
