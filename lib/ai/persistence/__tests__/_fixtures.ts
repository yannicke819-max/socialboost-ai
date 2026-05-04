import type { AgentExecutionContract } from '../../agent-contract/types';
import type { GateAudit } from '../../model-router/types';

export const OPEN_GATE_AUDIT: GateAudit = {
  is_ci: false,
  is_test_env: false,
  router_allow_real: true,
  agent_allow_real: true,
  api_key_present: true,
  eval_allow_real: false,
  is_eval_context: false,
};

export const CLOSED_GATE_AUDIT: GateAudit = {
  is_ci: true,
  is_test_env: false,
  router_allow_real: false,
  agent_allow_real: false,
  api_key_present: false,
  eval_allow_real: false,
  is_eval_context: false,
};

export function successContract(overrides: Partial<AgentExecutionContract> = {}): AgentExecutionContract {
  return {
    agent_id: 'offer-brain',
    agent_version: '1.0.0',
    contract_version: '0.1.0',
    input_schema_version: '1.0.0',
    output_schema_version: '1.0.0',
    task_type: 'offer_brain',
    input: { raw_offer_text: 'should-not-leak', locale: 'fr' },
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
      gate_audit: OPEN_GATE_AUDIT,
    },
    cost_estimate: {
      provider: 'mock',
      model: 'mock-deterministic',
      task_type: 'offer_brain',
      estimated_input_tokens: 0,
      estimated_output_tokens: 0,
      estimated_total_tokens: 0,
      estimated_cost_credits: 0,
      estimated_cost_eur: 0,
      confidence: 'high',
      requires_confirmation: false,
      premium_operation: false,
      blocked_by_budget: false,
      notes: [],
    },
    trace: {
      trace_id: 'trace-fixture-success',
      agent_id: 'offer-brain',
      task_type: 'offer_brain',
      provider: 'mock',
      model: 'mock-deterministic',
      mode: 'mock',
      started_at: '2026-05-04T10:00:00.000Z',
      completed_at: '2026-05-04T10:00:00.500Z',
      latency_ms: 500,
      input_hash: 'a'.repeat(64),
      output_hash: 'b'.repeat(64),
      input_field_count: 2,
      input_size_bytes: 64,
      language: 'fr',
      validation_status: 'valid',
      warnings: [],
    },
    warnings: [],
    errors: [],
    started_at: '2026-05-04T10:00:00.000Z',
    completed_at: '2026-05-04T10:00:00.500Z',
    ...overrides,
  };
}

export function blockedContract(): AgentExecutionContract {
  const c = successContract({
    output: undefined,
    model_request: {
      provider: 'mock',
      model: 'mock-deterministic',
      estimated_input_tokens: 0,
      estimated_output_tokens: 0,
      estimated_total_tokens: 0,
      estimated_cost_credits: 0,
      gate_allowed: false,
      blocked_reason: 'ci_environment',
      gate_audit: CLOSED_GATE_AUDIT,
    },
    warnings: ['prefer_real_blocked:ci_environment — falling back to mock'],
  });
  c.trace.trace_id = 'trace-fixture-blocked';
  return c;
}

export function errorContract(): AgentExecutionContract {
  const c = successContract({
    output: undefined,
    errors: [
      {
        code: 'output_validation',
        message: 'Output schema mismatch',
        recoverable: false,
      },
    ],
  });
  c.trace.trace_id = 'trace-fixture-error';
  c.trace.validation_status = 'failed';
  c.trace.error_code = 'output_validation';
  return c;
}
