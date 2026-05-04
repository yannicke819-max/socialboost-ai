import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  canonicalize,
  hashOf,
  newTraceId,
  scrubWarning,
  byteLength,
  topLevelFieldCount,
} from '../redact';

describe('canonicalize', () => {
  it('sorts object keys for stable output', () => {
    const a = { z: 1, a: 2, m: 3 };
    const b = { a: 2, m: 3, z: 1 };
    assert.equal(canonicalize(a), canonicalize(b));
  });

  it('handles primitives', () => {
    assert.equal(canonicalize('text'), '"text"');
    assert.equal(canonicalize(42), '42');
    assert.equal(canonicalize(null), 'null');
  });

  it('preserves array order', () => {
    assert.equal(canonicalize([3, 1, 2]), '[3,1,2]');
  });
});

describe('hashOf', () => {
  it('returns SHA-256 hex of canonical input (64 chars)', () => {
    const h = hashOf({ raw_offer_text: 'hello' });
    assert.equal(h.length, 64);
    assert.match(h, /^[0-9a-f]{64}$/);
  });

  it('returns identical hash for equivalent inputs (key order independent)', () => {
    const h1 = hashOf({ z: 1, a: 2 });
    const h2 = hashOf({ a: 2, z: 1 });
    assert.equal(h1, h2);
  });

  it('returns different hash for different inputs', () => {
    const h1 = hashOf({ raw_offer_text: 'A' });
    const h2 = hashOf({ raw_offer_text: 'B' });
    assert.notEqual(h1, h2);
  });
});

describe('newTraceId', () => {
  it('returns a UUID v4 string', () => {
    const id = newTraceId();
    assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });
});

describe('scrubWarning', () => {
  it('redacts sk- prefix API keys', () => {
    const out = scrubWarning('Failed with key sk-ant-abcdef0123456789012345');
    assert.match(out, /sk-\*\*\*REDACTED\*\*\*/);
    assert.doesNotMatch(out, /sk-ant-abcdef0123456789012345/);
  });

  it('redacts Bearer tokens', () => {
    const out = scrubWarning('Authorization: Bearer abc123xyz789');
    assert.match(out, /Bearer \*\*\*REDACTED\*\*\*/);
    assert.doesNotMatch(out, /abc123xyz789/);
  });

  it('leaves benign strings untouched', () => {
    const out = scrubWarning('No issues');
    assert.equal(out, 'No issues');
  });
});

describe('byteLength + topLevelFieldCount', () => {
  it('byteLength returns positive integer for non-empty input', () => {
    assert.ok(byteLength({ a: 1 }) > 0);
  });
  it('topLevelFieldCount counts only top-level keys', () => {
    assert.equal(topLevelFieldCount({ a: 1, b: 2, c: 3 }), 3);
    assert.equal(topLevelFieldCount({ a: { x: 1, y: 2 } }), 1);
    assert.equal(topLevelFieldCount([1, 2, 3]), 0);
    assert.equal(topLevelFieldCount('plain text'), 0);
  });
});
