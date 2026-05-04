import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MOCK_PROVIDER, ANTHROPIC_PROVIDER, getProvider, listProviders } from '../index';

describe('Mock provider', () => {
  it('has stable identity', () => {
    assert.equal(MOCK_PROVIDER.id, 'mock');
    assert.ok(MOCK_PROVIDER.default_model.length > 0);
    assert.deepEqual(MOCK_PROVIDER.supports, ['offer_brain']);
  });
  it('estimateTokens returns zeros', () => {
    const t = MOCK_PROVIDER.estimateTokens('offer_brain', { raw_offer_text: 'x'.repeat(500) });
    assert.deepEqual(t, { input: 0, output: 0 });
  });
});

describe('Anthropic provider', () => {
  it('has stable identity', () => {
    assert.equal(ANTHROPIC_PROVIDER.id, 'anthropic');
    assert.ok(ANTHROPIC_PROVIDER.default_model.length > 0);
    assert.deepEqual(ANTHROPIC_PROVIDER.supports, ['offer_brain']);
  });
  it('estimateTokens returns positive input + fixed output for offer_brain', () => {
    const t = ANTHROPIC_PROVIDER.estimateTokens('offer_brain', {
      raw_offer_text: 'A coaching offer for solo consultants',
    });
    assert.ok(t.input > 0);
    assert.ok(t.output > 0);
  });
  it('estimateTokens returns 0/0 for unknown task', () => {
    // @ts-expect-error - testing the runtime guard
    const t = ANTHROPIC_PROVIDER.estimateTokens('unknown_task', { raw_offer_text: 'x' });
    assert.deepEqual(t, { input: 0, output: 0 });
  });
});

describe('Registry', () => {
  it('returns providers by id', () => {
    assert.equal(getProvider('mock').id, 'mock');
    assert.equal(getProvider('anthropic').id, 'anthropic');
  });
  it('throws on unknown id', () => {
    assert.throws(() => getProvider('unknown' as 'mock'), /Unknown provider/);
  });
  it('listProviders returns both', () => {
    const all = listProviders();
    assert.equal(all.length, 2);
    assert.ok(all.find((p) => p.id === 'mock'));
    assert.ok(all.find((p) => p.id === 'anthropic'));
  });
});
