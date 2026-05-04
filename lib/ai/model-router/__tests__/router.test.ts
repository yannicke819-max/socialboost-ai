import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { route, estimateForTask } from '../router';

const ALL_FLAGS = [
  'CI',
  'GITHUB_ACTIONS',
  'NODE_ENV',
  'MODEL_ROUTER_ALLOW_REAL',
  'OFFER_BRAIN_USE_REAL_MODEL',
  'EVAL_USE_REAL_MODEL',
  'ANTHROPIC_API_KEY',
];

const PRESERVED: Record<string, string | undefined> = {};

function clearAll(): void {
  for (const k of ALL_FLAGS) {
    if (!(k in PRESERVED)) PRESERVED[k] = process.env[k];
    delete process.env[k];
  }
}
function restoreAll(): void {
  for (const k of ALL_FLAGS) {
    const v = PRESERVED[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

const ENV = process.env as Record<string, string | undefined>;

function setAllOpen(): void {
  delete ENV.CI;
  delete ENV.GITHUB_ACTIONS;
  delete ENV.NODE_ENV;
  ENV.MODEL_ROUTER_ALLOW_REAL = 'true';
  ENV.OFFER_BRAIN_USE_REAL_MODEL = 'true';
  ENV.ANTHROPIC_API_KEY = 'sk-ant-test-key-123456789012345';
}

describe('route — default mock behavior', () => {
  beforeEach(clearAll);
  afterEach(restoreAll);

  it('returns mock when prefer_real is not set', () => {
    setAllOpen();
    const r = route({ task_type: 'offer_brain', raw_input: { raw_offer_text: 'hi' } });
    assert.equal(r.selected_provider, 'mock');
    assert.equal(r.execution_mode, 'mock');
    assert.equal(r.allowed, true);
    assert.equal(r.reason, 'default_mock');
    assert.equal(r.estimated_cost.estimated_cost_credits, 0);
  });

  it('returns mock when prefer_real is false', () => {
    setAllOpen();
    const r = route({
      task_type: 'offer_brain',
      prefer_real: false,
      raw_input: { raw_offer_text: 'hi' },
    });
    assert.equal(r.selected_provider, 'mock');
    assert.equal(r.execution_mode, 'mock');
    assert.equal(r.allowed, true);
  });
});

describe('route — prefer_real blocked', () => {
  beforeEach(clearAll);
  afterEach(restoreAll);

  it('blocks real in CI with allowed=false and clear blocked_reason', () => {
    setAllOpen();
    process.env.CI = 'true';
    const r = route({ task_type: 'offer_brain', prefer_real: true, raw_input: { x: 'y' } });
    assert.equal(r.allowed, false);
    assert.equal(r.blocked_reason, 'ci_environment');
    assert.equal(r.execution_mode, 'mock');
    assert.equal(r.selected_provider, 'mock');
    assert.match(r.reason, /^prefer_real_blocked:ci_environment$/);
    assert.equal(r.gate_audit.is_ci, true);
  });

  it('blocks real without MODEL_ROUTER_ALLOW_REAL', () => {
    setAllOpen();
    delete process.env.MODEL_ROUTER_ALLOW_REAL;
    const r = route({ task_type: 'offer_brain', prefer_real: true, raw_input: {} });
    assert.equal(r.allowed, false);
    assert.equal(r.blocked_reason, 'MODEL_ROUTER_ALLOW_REAL_not_set');
    assert.equal(r.selected_provider, 'mock');
  });

  it('blocks real without OFFER_BRAIN_USE_REAL_MODEL', () => {
    setAllOpen();
    delete process.env.OFFER_BRAIN_USE_REAL_MODEL;
    const r = route({ task_type: 'offer_brain', prefer_real: true, raw_input: {} });
    assert.equal(r.allowed, false);
    assert.equal(r.blocked_reason, 'OFFER_BRAIN_USE_REAL_MODEL_not_set');
  });

  it('blocks real without ANTHROPIC_API_KEY', () => {
    setAllOpen();
    delete process.env.ANTHROPIC_API_KEY;
    const r = route({ task_type: 'offer_brain', prefer_real: true, raw_input: {} });
    assert.equal(r.allowed, false);
    assert.equal(r.blocked_reason, 'ANTHROPIC_API_KEY_missing');
  });

  it('blocks real in test environment', () => {
    setAllOpen();
    ENV.NODE_ENV = 'test';
    const r = route({ task_type: 'offer_brain', prefer_real: true, raw_input: {} });
    assert.equal(r.allowed, false);
    assert.equal(r.blocked_reason, 'test_environment');
  });

  it('blocks eval real context without EVAL_USE_REAL_MODEL', () => {
    setAllOpen();
    const r = route({
      task_type: 'offer_brain',
      prefer_real: true,
      is_eval: true,
      raw_input: {},
    });
    assert.equal(r.allowed, false);
    assert.equal(r.blocked_reason, 'EVAL_USE_REAL_MODEL_not_set_for_eval_context');
  });
});

describe('route — prefer_real allowed', () => {
  beforeEach(clearAll);
  afterEach(restoreAll);

  it('selects anthropic provider for offer_brain when all gates open', () => {
    setAllOpen();
    const r = route({
      task_type: 'offer_brain',
      prefer_real: true,
      raw_input: { raw_offer_text: 'Coaching offer for senior engineers, 12 weeks.' },
    });
    assert.equal(r.allowed, true);
    assert.equal(r.selected_provider, 'anthropic');
    assert.equal(r.execution_mode, 'real');
    assert.equal(r.reason, 'all_gates_open');
    assert.ok(r.selected_model.length > 0);
    // Cost estimate should reflect anthropic pricing (non-zero credits possible).
    assert.equal(r.estimated_cost.provider, 'anthropic');
    assert.ok(r.estimated_cost.estimated_total_tokens > 0);
  });

  it('honours model_override when real path taken', () => {
    setAllOpen();
    const r = route({
      task_type: 'offer_brain',
      prefer_real: true,
      raw_input: { raw_offer_text: 'short' },
      model_override: 'claude-haiku-test-model',
    });
    assert.equal(r.allowed, true);
    assert.equal(r.selected_model, 'claude-haiku-test-model');
  });

  it('allows eval context with EVAL_USE_REAL_MODEL=true', () => {
    setAllOpen();
    process.env.EVAL_USE_REAL_MODEL = 'true';
    const r = route({
      task_type: 'offer_brain',
      prefer_real: true,
      is_eval: true,
      raw_input: { raw_offer_text: 'eval payload' },
    });
    assert.equal(r.allowed, true);
    assert.equal(r.selected_provider, 'anthropic');
  });
});

describe('route — gate_audit shape', () => {
  beforeEach(clearAll);
  afterEach(restoreAll);

  it('includes a complete gate_audit on every result', () => {
    const r = route({ task_type: 'offer_brain', raw_input: {} });
    const a = r.gate_audit;
    assert.equal(typeof a.is_ci, 'boolean');
    assert.equal(typeof a.is_test_env, 'boolean');
    assert.equal(typeof a.router_allow_real, 'boolean');
    assert.equal(typeof a.agent_allow_real, 'boolean');
    assert.equal(typeof a.api_key_present, 'boolean');
    assert.equal(typeof a.eval_allow_real, 'boolean');
    assert.equal(typeof a.is_eval_context, 'boolean');
  });

  it('never leaks the API key value into gate_audit', () => {
    setAllOpen();
    process.env.ANTHROPIC_API_KEY = 'sk-ant-SUPER-SECRET-VALUE';
    const r = route({ task_type: 'offer_brain', prefer_real: true, raw_input: {} });
    const serialized = JSON.stringify(r.gate_audit);
    assert.doesNotMatch(serialized, /SUPER-SECRET-VALUE/);
    assert.equal(r.gate_audit.api_key_present, true);
  });
});

describe('estimateForTask', () => {
  it('returns a mock-priced cost estimate', () => {
    const est = estimateForTask('offer_brain', { raw_offer_text: 'hello world' });
    assert.equal(est.provider, 'mock');
    assert.equal(est.estimated_cost_credits, 0);
  });
});
