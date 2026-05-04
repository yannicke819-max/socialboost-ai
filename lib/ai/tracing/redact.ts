/**
 * Redaction + canonical hashing.
 *
 * Stable input → stable hash. Used for diagnostics without exposing the raw
 * payload. SHA-256 hex (not crypto-secure for content protection — it's an
 * identifier; the safety property here is "no original data is logged").
 */

import { createHash, randomUUID } from 'node:crypto';

/** Canonicalize a value for stable hashing: sort object keys recursively. */
export function canonicalize(value: unknown): string {
  return JSON.stringify(value, replacerSorted);
}

function replacerSorted(_key: string, value: unknown): unknown {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = (value as Record<string, unknown>)[k];
        return acc;
      }, {});
  }
  return value;
}

export function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function hashOf(value: unknown): string {
  return sha256Hex(canonicalize(value));
}

export function newTraceId(): string {
  return randomUUID();
}

/**
 * Defensive scrubber for warning strings: strips obvious secrets if any leak
 * upstream into a warning. Conservative; mostly a backstop, not a primary line.
 */
export function scrubWarning(message: string): string {
  return message
    // sk-ant-... / sk-... API key shapes
    .replace(/sk-[a-zA-Z0-9_-]{20,}/g, 'sk-***REDACTED***')
    .replace(/Bearer\s+[a-zA-Z0-9._\-]{10,}/gi, 'Bearer ***REDACTED***');
}

/** Compute byte size of canonicalized input. */
export function byteLength(value: unknown): number {
  return Buffer.byteLength(canonicalize(value), 'utf8');
}

/** Count top-level fields if value is an object; else 0. */
export function topLevelFieldCount(value: unknown): number {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return Object.keys(value as Record<string, unknown>).length;
  }
  return 0;
}
