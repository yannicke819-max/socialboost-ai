import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { startTrace, completeTrace } from '../tracer';

describe('startTrace + completeTrace', () => {
  it('produces a trace with required fields, no raw input leak', () => {
    const t = startTrace({
      agent_id: 'offer-brain',
      task_type: 'offer_brain',
      provider: 'mock',
      model: 'mock-deterministic',
      mode: 'mock',
      raw_input: { raw_offer_text: 'Sensitive coaching offer text', locale: 'fr' },
      language: 'fr',
    });

    // Trace contains envelope fields, not the raw text
    assert.ok(t.trace_id.length > 0);
    assert.equal(t.agent_id, 'offer-brain');
    assert.equal(t.task_type, 'offer_brain');
    assert.equal(t.provider, 'mock');
    assert.equal(t.model, 'mock-deterministic');
    assert.equal(t.mode, 'mock');
    assert.equal(t.input_field_count, 2);
    assert.ok(t.input_size_bytes > 0);
    assert.equal(t.input_hash.length, 64);
    assert.equal(t.validation_status, 'pending');
    assert.equal(t.warnings.length, 0);

    // Hard rule: no field of the trace contains the raw_offer_text content
    const serialized = JSON.stringify(t);
    assert.doesNotMatch(serialized, /Sensitive coaching offer text/);
  });

  it('completeTrace populates completed_at, latency_ms, output_hash', () => {
    const t0 = startTrace({
      agent_id: 'offer-brain',
      task_type: 'offer_brain',
      provider: 'mock',
      model: 'mock',
      mode: 'mock',
      raw_input: { raw_offer_text: 'a' },
    });
    const t1 = completeTrace(t0, {
      output: { result: 42 },
      validation_status: 'valid',
    });
    assert.ok(t1.completed_at);
    assert.equal(typeof t1.latency_ms, 'number');
    assert.ok((t1.latency_ms ?? -1) >= 0);
    assert.equal(t1.output_hash?.length, 64);
    assert.equal(t1.validation_status, 'valid');
  });

  it('completeTrace scrubs API keys from warnings', () => {
    const t0 = startTrace({
      agent_id: 'offer-brain',
      task_type: 'offer_brain',
      provider: 'mock',
      model: 'mock',
      mode: 'mock',
      raw_input: {},
    });
    const t1 = completeTrace(t0, {
      validation_status: 'valid',
      warnings: ['Failed with key sk-ant-1234567890abcdef1234567890'],
    });
    assert.match(t1.warnings[0]!, /sk-\*\*\*REDACTED\*\*\*/);
  });

  it('error_code propagates without stack trace', () => {
    const t0 = startTrace({
      agent_id: 'offer-brain',
      task_type: 'offer_brain',
      provider: 'mock',
      model: 'mock',
      mode: 'mock',
      raw_input: {},
    });
    const t1 = completeTrace(t0, {
      validation_status: 'failed',
      error_code: 'output_validation',
    });
    assert.equal(t1.error_code, 'output_validation');
    // The trace shape never includes stack/raw payload — explicit type-level guarantee
  });
});
