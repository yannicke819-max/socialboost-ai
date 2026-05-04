import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AgentExecutionContractSchema, AGENT_CONTRACT_VERSION } from '../index';

function validEnvelope(): unknown {
  return {
    agent_id: 'offer-brain',
    agent_version: '1.0.0',
    contract_version: AGENT_CONTRACT_VERSION,
    input_schema_version: '1.0.0',
    output_schema_version: '1.0.0',
    task_type: 'offer_brain',
    input: { raw_offer_text: 'sample', locale: 'fr' },
    output: { fields: { offer_summary: 'ok' } },
    execution_mode: 'mock',
    model_request: {
      provider: 'mock',
      model: 'mock-deterministic',
      estimated_input_tokens: 0,
      estimated_output_tokens: 0,
      estimated_total_tokens: 0,
      estimated_cost_credits: 0,
      gate_allowed: true,
      gate_audit: {
        is_ci: false,
        is_test_env: false,
        router_allow_real: false,
        agent_allow_real: false,
        api_key_present: false,
        eval_allow_real: false,
        is_eval_context: false,
      },
    },
    cost_estimate: {
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
      notes: [],
    },
    trace: {
      trace_id: 'trace-1',
      agent_id: 'offer-brain',
      task_type: 'offer_brain',
      provider: 'mock',
      model: 'mock-deterministic',
      mode: 'mock',
      started_at: '2026-05-04T00:00:00.000Z',
      completed_at: '2026-05-04T00:00:01.000Z',
      latency_ms: 1000,
      input_hash: 'a'.repeat(64),
      output_hash: 'b'.repeat(64),
      input_field_count: 2,
      input_size_bytes: 42,
      language: 'fr',
      validation_status: 'valid',
      warnings: [],
    },
    warnings: [],
    errors: [],
    started_at: '2026-05-04T00:00:00.000Z',
    completed_at: '2026-05-04T00:00:01.000Z',
  };
}

describe('AgentExecutionContractSchema', () => {
  it('accepts a fully populated valid envelope', () => {
    const result = AgentExecutionContractSchema.safeParse(validEnvelope());
    assert.equal(result.success, true);
  });

  it('rejects an envelope missing agent_id', () => {
    const env = validEnvelope() as Record<string, unknown>;
    delete env.agent_id;
    const result = AgentExecutionContractSchema.safeParse(env);
    assert.equal(result.success, false);
  });

  it('rejects an envelope with unknown task_type', () => {
    const env = validEnvelope() as Record<string, unknown>;
    env.task_type = 'image_generation';
    const result = AgentExecutionContractSchema.safeParse(env);
    assert.equal(result.success, false);
  });

  it('rejects an envelope with unknown execution_mode', () => {
    const env = validEnvelope() as Record<string, unknown>;
    env.execution_mode = 'hybrid';
    const result = AgentExecutionContractSchema.safeParse(env);
    assert.equal(result.success, false);
  });

  it('rejects an envelope where model_request.model is empty string', () => {
    const env = validEnvelope() as Record<string, unknown>;
    (env.model_request as Record<string, unknown>).model = '';
    const result = AgentExecutionContractSchema.safeParse(env);
    assert.equal(result.success, false);
  });

  it('rejects extra unknown fields on the envelope (strict)', () => {
    const env = validEnvelope() as Record<string, unknown>;
    env.surprise_field = true;
    const result = AgentExecutionContractSchema.safeParse(env);
    assert.equal(result.success, false);
  });

  it('rejects negative token counts in cost_estimate', () => {
    const env = validEnvelope() as Record<string, unknown>;
    (env.cost_estimate as Record<string, unknown>).estimated_input_tokens = -1;
    const result = AgentExecutionContractSchema.safeParse(env);
    assert.equal(result.success, false);
  });

  it('accepts a structured AgentExecutionError', () => {
    const env = validEnvelope() as Record<string, unknown>;
    env.errors = [
      {
        code: 'output_validation',
        message: 'Output schema mismatch',
        recoverable: false,
      },
    ];
    const result = AgentExecutionContractSchema.safeParse(env);
    assert.equal(result.success, true);
  });

  it('rejects an error object missing required code', () => {
    const env = validEnvelope() as Record<string, unknown>;
    env.errors = [{ message: 'oops', recoverable: true }];
    const result = AgentExecutionContractSchema.safeParse(env);
    assert.equal(result.success, false);
  });

  it('accepts envelope with input/output as arbitrary unknown payloads', () => {
    const env = validEnvelope() as Record<string, unknown>;
    env.input = ['anything', { nested: true }];
    env.output = 42;
    const result = AgentExecutionContractSchema.safeParse(env);
    assert.equal(result.success, true);
  });

  it('rejects trace with input_hash too short (must be non-empty)', () => {
    const env = validEnvelope() as Record<string, unknown>;
    (env.trace as Record<string, unknown>).input_hash = '';
    const result = AgentExecutionContractSchema.safeParse(env);
    assert.equal(result.success, false);
  });
});
