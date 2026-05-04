import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { auditGates, evaluateGates } from '../gating';

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

describe('auditGates', () => {
  beforeEach(clearAll);
  afterEach(restoreAll);

  it('reflects environment flags exactly', () => {
    process.env.CI = 'true';
    process.env.MODEL_ROUTER_ALLOW_REAL = 'true';
    process.env.OFFER_BRAIN_USE_REAL_MODEL = 'false';
    process.env.ANTHROPIC_API_KEY = 'k';
    const a = auditGates('offer_brain', { is_eval: true });
    assert.equal(a.is_ci, true);
    assert.equal(a.router_allow_real, true);
    assert.equal(a.agent_allow_real, false);
    assert.equal(a.api_key_present, true);
    assert.equal(a.is_eval_context, true);
  });
});

describe('evaluateGates — closed gates', () => {
  beforeEach(clearAll);
  afterEach(restoreAll);

  it('blocks in CI', () => {
    setAllOpen();
    process.env.CI = 'true';
    const r = evaluateGates('offer_brain', {});
    assert.equal(r.allowed, false);
    assert.equal(r.reason, 'ci_environment');
  });

  it('blocks in GitHub Actions', () => {
    setAllOpen();
    process.env.GITHUB_ACTIONS = 'true';
    const r = evaluateGates('offer_brain', {});
    assert.equal(r.allowed, false);
    assert.equal(r.reason, 'ci_environment');
  });

  it('blocks in test environment', () => {
    setAllOpen();
    ENV.NODE_ENV = 'test';
    const r = evaluateGates('offer_brain', {});
    assert.equal(r.allowed, false);
    assert.equal(r.reason, 'test_environment');
  });

  it('blocks without MODEL_ROUTER_ALLOW_REAL', () => {
    setAllOpen();
    delete process.env.MODEL_ROUTER_ALLOW_REAL;
    const r = evaluateGates('offer_brain', {});
    assert.equal(r.allowed, false);
    assert.equal(r.reason, 'MODEL_ROUTER_ALLOW_REAL_not_set');
  });

  it('blocks without OFFER_BRAIN_USE_REAL_MODEL', () => {
    setAllOpen();
    delete process.env.OFFER_BRAIN_USE_REAL_MODEL;
    const r = evaluateGates('offer_brain', {});
    assert.equal(r.allowed, false);
    assert.equal(r.reason, 'OFFER_BRAIN_USE_REAL_MODEL_not_set');
  });

  it('blocks without ANTHROPIC_API_KEY', () => {
    setAllOpen();
    delete process.env.ANTHROPIC_API_KEY;
    const r = evaluateGates('offer_brain', {});
    assert.equal(r.allowed, false);
    assert.equal(r.reason, 'ANTHROPIC_API_KEY_missing');
  });

  it('blocks eval context without EVAL_USE_REAL_MODEL', () => {
    setAllOpen();
    const r = evaluateGates('offer_brain', { is_eval: true });
    assert.equal(r.allowed, false);
    assert.equal(r.reason, 'EVAL_USE_REAL_MODEL_not_set_for_eval_context');
  });
});

describe('evaluateGates — open gates', () => {
  beforeEach(clearAll);
  afterEach(restoreAll);

  it('allows when all gates are open (non-eval)', () => {
    setAllOpen();
    const r = evaluateGates('offer_brain', {});
    assert.equal(r.allowed, true);
    assert.equal(r.reason, 'all_gates_open');
  });

  it('allows eval context when EVAL_USE_REAL_MODEL is true', () => {
    setAllOpen();
    process.env.EVAL_USE_REAL_MODEL = 'true';
    const r = evaluateGates('offer_brain', { is_eval: true });
    assert.equal(r.allowed, true);
    assert.equal(r.reason, 'all_gates_open');
  });

  it('strict equality on flag value: only literal "true" opens the gate', () => {
    setAllOpen();
    process.env.MODEL_ROUTER_ALLOW_REAL = 'TRUE';
    const r = evaluateGates('offer_brain', {});
    assert.equal(r.allowed, false);
  });
});
