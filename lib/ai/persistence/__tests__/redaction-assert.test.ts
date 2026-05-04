import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertNoSensitivePersistenceFields,
  PersistenceLeakError,
} from '../redaction-assert';
import type { AiPersistenceBundle } from '../types';

function safeBundle(): AiPersistenceBundle {
  return {
    run: {
      trace_id: 'trace-x',
      agent_id: 'offer-brain',
      agent_version: '1.0.0',
      contract_version: '0.1.0',
      task_type: 'offer_brain',
      execution_mode: 'mock',
      provider: 'mock',
      model: 'mock-deterministic',
      status: 'success',
      started_at: '2026-05-04T10:00:00.000Z',
      completed_at: '2026-05-04T10:00:00.500Z',
      latency_ms: 500,
      input_hash: 'a'.repeat(64),
      output_hash: 'b'.repeat(64),
      input_size_bytes: 64,
      input_field_count: 2,
      language: 'fr',
      validation_status: 'valid',
      warning_count: 0,
    },
    cost: {
      run_trace_id: 'trace-x',
      provider: 'mock',
      model: 'mock-deterministic',
      task_type: 'offer_brain',
      estimated_input_tokens: 0,
      estimated_output_tokens: 0,
      estimated_total_tokens: 0,
      estimated_cost_credits: 0,
      confidence: 'high',
      requires_confirmation: false,
      premium_operation: false,
      blocked_by_budget: false,
    },
    redactions: [],
  };
}

describe('assertNoSensitivePersistenceFields — passes on safe bundle', () => {
  it('does not throw on a clean bundle', () => {
    assert.doesNotThrow(() => assertNoSensitivePersistenceFields(safeBundle()));
  });

  it('does not throw on hashes (64-char hex)', () => {
    const b = safeBundle();
    b.run.input_hash = 'f'.repeat(64);
    b.run.output_hash = '0'.repeat(64);
    assert.doesNotThrow(() => assertNoSensitivePersistenceFields(b));
  });

  it('does not throw on a string already scrubbed to ***REDACTED***', () => {
    const b = safeBundle();
    // Simulate a metadata-like extra prop (cast to bypass strict typing)
    (b.redactions as unknown as Array<Record<string, unknown>>).push({
      run_trace_id: 'trace-x',
      redaction_type: 'api_key',
      field_name: 'warnings',
      redaction_count: 1,
      sample_marker: 'sk-***REDACTED***',
    });
    assert.doesNotThrow(() => assertNoSensitivePersistenceFields(b));
  });
});

describe('assertNoSensitivePersistenceFields — fails on forbidden keys', () => {
  it('throws if raw_input key appears anywhere', () => {
    const b = safeBundle();
    (b.run as unknown as Record<string, unknown>).raw_input = 'oops';
    assert.throws(
      () => assertNoSensitivePersistenceFields(b),
      (e: unknown) =>
        e instanceof PersistenceLeakError && /raw_input/.test((e as Error).message),
    );
  });

  it('throws if raw_output key appears anywhere', () => {
    const b = safeBundle();
    (b.cost as unknown as Record<string, unknown>).raw_output = 'oops';
    assert.throws(
      () => assertNoSensitivePersistenceFields(b),
      (e: unknown) =>
        e instanceof PersistenceLeakError && /raw_output/.test((e as Error).message),
    );
  });

  it('throws if prompt key appears anywhere', () => {
    const b = safeBundle();
    (b.run as unknown as Record<string, unknown>).prompt = 'You are an agent...';
    assert.throws(() => assertNoSensitivePersistenceFields(b), PersistenceLeakError);
  });

  it('throws if api_key key appears anywhere', () => {
    const b = safeBundle();
    (b.run as unknown as Record<string, unknown>).api_key = 'whatever';
    assert.throws(() => assertNoSensitivePersistenceFields(b), PersistenceLeakError);
  });

  it('throws if request_body / response_body / stack_trace keys appear', () => {
    for (const key of ['request_body', 'response_body', 'stack_trace', 'completion']) {
      const b = safeBundle();
      (b.run as unknown as Record<string, unknown>)[key] = 'x';
      assert.throws(() => assertNoSensitivePersistenceFields(b), PersistenceLeakError);
    }
  });
});

describe('assertNoSensitivePersistenceFields — fails on leaky values', () => {
  it('throws if a value contains sk-... pattern (unscrubbed)', () => {
    const b = safeBundle();
    (b.run as unknown as Record<string, unknown>).note = 'leaked sk-ant-1234567890abcdef';
    assert.throws(() => assertNoSensitivePersistenceFields(b), PersistenceLeakError);
  });

  it('throws if a value contains Bearer ... pattern (unscrubbed)', () => {
    const b = safeBundle();
    (b.run as unknown as Record<string, unknown>).note = 'header was Bearer abcdef1234567890';
    assert.throws(() => assertNoSensitivePersistenceFields(b), PersistenceLeakError);
  });

  it('throws if a value looks like a JS stack trace', () => {
    const b = safeBundle();
    (b.run as unknown as Record<string, unknown>).note =
      'Error: oops\n    at runOfferBrain (/app/lib/ai/offer-brain/agent.ts:42:13)';
    assert.throws(() => assertNoSensitivePersistenceFields(b), PersistenceLeakError);
  });

  it('walks arrays and nested objects', () => {
    const b = safeBundle();
    (b.run as unknown as Record<string, unknown>).deep = {
      nested: { array: ['ok', 'sk-ant-1234567890abcdef'] },
    };
    assert.throws(() => assertNoSensitivePersistenceFields(b), PersistenceLeakError);
  });
});
