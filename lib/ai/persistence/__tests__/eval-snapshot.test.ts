import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeEvalRun } from '../mapper';
import { assertNoSensitivePersistenceFields } from '../redaction-assert';

describe('summarizeEvalRun', () => {
  it('computes pass_rate from counts', () => {
    const snap = summarizeEvalRun({
      eval_suite: 'offer-brain',
      git_sha: '0ba8a54',
      pass_count: 9,
      fail_count: 0,
      total_count: 9,
    });
    assert.equal(snap.pass_rate, 1);
    assert.equal(snap.pass_count, 9);
    assert.equal(snap.fail_count, 0);
    assert.equal(snap.total_count, 9);
  });

  it('handles partial pass with rounded pass_rate (3 decimals)', () => {
    const snap = summarizeEvalRun({
      eval_suite: 'offer-brain',
      git_sha: '0ba8a54',
      pass_count: 7,
      fail_count: 2,
      total_count: 9,
    });
    assert.equal(snap.pass_rate, 0.778);
  });

  it('throws when pass + fail does not equal total', () => {
    assert.throws(
      () =>
        summarizeEvalRun({
          eval_suite: 'offer-brain',
          git_sha: '0ba8a54',
          pass_count: 5,
          fail_count: 5,
          total_count: 9,
        }),
      /must equal total_count/,
    );
  });

  it('throws on negative counts', () => {
    assert.throws(
      () =>
        summarizeEvalRun({
          eval_suite: 'offer-brain',
          git_sha: '0ba8a54',
          pass_count: -1,
          fail_count: 0,
          total_count: -1,
        }),
      /non-negative/,
    );
  });

  it('preserves baseline_id and drift_score', () => {
    const snap = summarizeEvalRun({
      eval_suite: 'offer-brain',
      git_sha: '0ba8a54',
      pass_count: 9,
      fail_count: 0,
      total_count: 9,
      baseline_id: '2026-05-04T06:12:11Z',
      drift_score: 0.0,
    });
    assert.equal(snap.baseline_id, '2026-05-04T06:12:11Z');
    assert.equal(snap.drift_score, 0);
  });

  it('keeps metadata as plain aggregates only (no leak under redaction-assert)', () => {
    const snap = summarizeEvalRun({
      eval_suite: 'offer-brain',
      git_sha: '0ba8a54',
      pass_count: 9,
      fail_count: 0,
      total_count: 9,
      metadata: {
        improvement_priority: { low: 3, medium: 2, high: 2, critical: 2 },
        missing_data_categories: { objections: 8, cta: 6 },
      },
    });
    // Wrap in a faux bundle to reuse the asserter
    assert.doesNotThrow(() =>
      assertNoSensitivePersistenceFields({
        run: { trace_id: 't', agent_id: 'a', agent_version: '1', contract_version: '1', task_type: 'offer_brain', execution_mode: 'mock', provider: 'mock', model: 'm', status: 'success', started_at: '2026-05-04T10:00:00Z', input_hash: 'h', warning_count: 0 },
        cost: { run_trace_id: 't', provider: 'mock', model: 'm', task_type: 'offer_brain', estimated_input_tokens: 0, estimated_output_tokens: 0, estimated_total_tokens: 0, estimated_cost_credits: 0, confidence: 'high', requires_confirmation: false, premium_operation: false, blocked_by_budget: false },
        redactions: [],
        // @ts-expect-error stash snapshot for the asserter walk
        snapshot: snap,
      }),
    );
  });

  it('default metadata is empty object', () => {
    const snap = summarizeEvalRun({
      eval_suite: 'offer-brain',
      git_sha: '0ba8a54',
      pass_count: 0,
      fail_count: 0,
      total_count: 0,
    });
    assert.deepEqual(snap.metadata, {});
    assert.equal(snap.pass_rate, 0);
  });
});
