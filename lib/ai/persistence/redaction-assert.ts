/**
 * AI-004 — Defensive assertion that a persistence bundle is leak-free.
 *
 * Walks the bundle (a plain JS object tree) and throws on any forbidden key
 * name, or any string value that matches a known leak pattern (API keys,
 * Bearer tokens, JS stack traces).
 *
 * Used by tests as a structural firewall, and intended to be called by the
 * future ingester immediately before any DB write.
 *
 * Intentionally does NOT call any logger / network / disk.
 */

import type { AiPersistenceBundle } from './types';

const FORBIDDEN_KEYS = new Set([
  'raw_input',
  'raw_output',
  'prompt',
  'completion',
  'api_key',
  'apiKey',
  'request_body',
  'response_body',
  'stack',
  'stack_trace',
  'stacktrace',
]);

const SK_PATTERN = /sk-[A-Za-z0-9_-]{16,}/;
const BEARER_PATTERN = /Bearer\s+[A-Za-z0-9._\-]{16,}/i;
// JS stack trace markers: "    at functionName (file.ts:12:34)"
const STACK_PATTERN = /(^|\n)\s+at\s+[^\s]+\s+\([^\)]+:\d+:\d+\)/;

const SCRUBBED_PLACEHOLDER = /\*\*\*REDACTED\*\*\*/;

export class PersistenceLeakError extends Error {
  constructor(public readonly path: string, public readonly reason: string) {
    super(`PersistenceLeakError @ ${path}: ${reason}`);
    this.name = 'PersistenceLeakError';
  }
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function checkValue(value: unknown, path: string): void {
  if (typeof value === 'string') {
    // Allow strings that have already been scrubbed (***REDACTED***).
    if (SCRUBBED_PLACEHOLDER.test(value)) return;
    if (SK_PATTERN.test(value)) {
      throw new PersistenceLeakError(path, 'value matches API key pattern (sk-*)');
    }
    if (BEARER_PATTERN.test(value)) {
      throw new PersistenceLeakError(path, 'value matches Bearer token pattern');
    }
    if (STACK_PATTERN.test(value)) {
      throw new PersistenceLeakError(path, 'value matches JS stack trace pattern');
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => checkValue(v, `${path}[${i}]`));
    return;
  }
  if (isPlainObject(value)) {
    for (const [k, v] of Object.entries(value)) {
      const childPath = path ? `${path}.${k}` : k;
      if (FORBIDDEN_KEYS.has(k)) {
        throw new PersistenceLeakError(childPath, `forbidden key name "${k}"`);
      }
      checkValue(v, childPath);
    }
  }
  // primitives (number, boolean, null, undefined) — nothing to check
}

/**
 * Asserts the bundle has no forbidden keys and no leaky string values.
 * Throws PersistenceLeakError on first offense (deterministic order).
 */
export function assertNoSensitivePersistenceFields(bundle: AiPersistenceBundle): void {
  checkValue(bundle as unknown, '');
}
