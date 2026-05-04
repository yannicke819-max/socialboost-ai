import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mapAgentContractToPersistenceBundle } from '../mapper';
import { successContract, blockedContract, errorContract } from './_fixtures';

describe('mapAgentContractToPersistenceBundle — success', () => {
  it('produces an ai_agent_runs row with status=success', () => {
    const bundle = mapAgentContractToPersistenceBundle(successContract());
    assert.equal(bundle.run.status, 'success');
    assert.equal(bundle.run.trace_id, 'trace-fixture-success');
    assert.equal(bundle.run.execution_mode, 'mock');
    assert.equal(bundle.run.provider, 'mock');
  });

  it('produces an ai_cost_estimates row linked by run_trace_id', () => {
    const bundle = mapAgentContractToPersistenceBundle(successContract());
    assert.equal(bundle.cost.run_trace_id, bundle.run.trace_id);
    assert.equal(bundle.cost.provider, 'mock');
    assert.equal(bundle.cost.confidence, 'high');
    assert.equal(bundle.cost.estimated_total_tokens, 0);
  });

  it('preserves trace_id, input_hash, output_hash', () => {
    const bundle = mapAgentContractToPersistenceBundle(successContract());
    assert.equal(bundle.run.input_hash.length, 64);
    assert.equal(bundle.run.output_hash?.length, 64);
    assert.equal(bundle.run.trace_id, 'trace-fixture-success');
  });

  it('does not contain raw input or raw output', () => {
    const c = successContract();
    const bundle = mapAgentContractToPersistenceBundle(c);
    const serialized = JSON.stringify(bundle);
    assert.doesNotMatch(serialized, /should-not-leak/);
    assert.doesNotMatch(serialized, /offer_summary/);
  });
});

describe('mapAgentContractToPersistenceBundle — blocked', () => {
  it('produces status=blocked when gate_allowed=false', () => {
    const bundle = mapAgentContractToPersistenceBundle(blockedContract());
    assert.equal(bundle.run.status, 'blocked');
  });

  it('does not include any stack trace in the run row', () => {
    const bundle = mapAgentContractToPersistenceBundle(blockedContract());
    const serialized = JSON.stringify(bundle.run);
    assert.doesNotMatch(serialized, /\s+at\s+\S+\s+\(/);
  });
});

describe('mapAgentContractToPersistenceBundle — error', () => {
  it('produces status=error and includes error_code', () => {
    const bundle = mapAgentContractToPersistenceBundle(errorContract());
    assert.equal(bundle.run.status, 'error');
    assert.equal(bundle.run.error_code, 'output_validation');
    assert.equal(bundle.run.validation_status, 'failed');
  });

  it('does not include any stack trace anywhere in the bundle', () => {
    const bundle = mapAgentContractToPersistenceBundle(errorContract());
    const serialized = JSON.stringify(bundle);
    assert.doesNotMatch(serialized, /\s+at\s+\S+\s+\(.*:\d+:\d+\)/);
  });
});

describe('mapAgentContractToPersistenceBundle — redaction events', () => {
  it('emits an api_key redaction event when warnings carry sk-***REDACTED***', () => {
    const c = successContract();
    c.trace.warnings = ['Failed with sk-***REDACTED***'];
    const bundle = mapAgentContractToPersistenceBundle(c);
    const apiKeyEvent = bundle.redactions.find((r) => r.redaction_type === 'api_key');
    assert.ok(apiKeyEvent);
    assert.equal(apiKeyEvent.redaction_count, 1);
  });

  it('emits a bearer_token redaction event when warnings carry Bearer ***REDACTED***', () => {
    const c = successContract();
    c.trace.warnings = ['header was Bearer ***REDACTED***'];
    const bundle = mapAgentContractToPersistenceBundle(c);
    const bearerEvent = bundle.redactions.find((r) => r.redaction_type === 'bearer_token');
    assert.ok(bearerEvent);
    assert.equal(bearerEvent.redaction_count, 1);
  });

  it('produces no redaction events when no scrub markers present', () => {
    const c = successContract();
    c.trace.warnings = ['benign warning'];
    const bundle = mapAgentContractToPersistenceBundle(c);
    assert.equal(bundle.redactions.length, 0);
  });
});
