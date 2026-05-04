/**
 * AI-004 — Pure mapper from AgentExecutionContract to persistence rows.
 *
 * NO I/O. NO Supabase client. NO fetch. NO env. NO DB write.
 * NO console logger. Deterministic. Idempotent on equal input.
 *
 * The mapper produces plain data shapes — what a future ingester would
 * persist — and never touches the network or the filesystem.
 */

import type { AgentExecutionContract } from '../agent-contract/types';
import type {
  AiAgentRunInsert,
  AiCostEstimateInsert,
  AiPersistenceBundle,
  AiRedactionEventInsert,
  AiEvalSnapshotInsert,
  EvalSummaryInput,
} from './types';

function deriveStatus(
  contract: AgentExecutionContract,
): 'success' | 'error' | 'blocked' {
  if (contract.errors.length > 0) return 'error';
  if (!contract.model_request.gate_allowed) return 'blocked';
  if (contract.output === undefined) return 'error';
  return 'success';
}

export function mapAgentContractToPersistenceBundle(
  contract: AgentExecutionContract,
): AiPersistenceBundle {
  const trace = contract.trace;
  const cost = contract.cost_estimate;

  const run: AiAgentRunInsert = {
    trace_id: trace.trace_id,
    agent_id: contract.agent_id,
    agent_version: contract.agent_version,
    contract_version: contract.contract_version,
    task_type: contract.task_type,
    execution_mode: contract.execution_mode,
    provider: contract.model_request.provider,
    model: contract.model_request.model,
    status: deriveStatus(contract),
    started_at: contract.started_at,
    completed_at: contract.completed_at,
    latency_ms: trace.latency_ms,
    input_hash: trace.input_hash,
    output_hash: trace.output_hash,
    input_size_bytes: trace.input_size_bytes,
    input_field_count: trace.input_field_count,
    language: trace.language,
    validation_status: trace.validation_status,
    error_code: trace.error_code ?? contract.errors[0]?.code,
    warning_count: contract.warnings.length + (trace.warnings?.length ?? 0),
  };

  const costRow: AiCostEstimateInsert = {
    run_trace_id: trace.trace_id,
    provider: cost.provider,
    model: cost.model,
    task_type: cost.task_type,
    estimated_input_tokens: cost.estimated_input_tokens,
    estimated_output_tokens: cost.estimated_output_tokens,
    estimated_total_tokens: cost.estimated_total_tokens,
    estimated_cost_credits: cost.estimated_cost_credits,
    estimated_cost_eur: cost.estimated_cost_eur,
    confidence: cost.confidence,
    requires_confirmation: cost.requires_confirmation,
    premium_operation: cost.premium_operation,
    blocked_by_budget: cost.blocked_by_budget,
  };

  // Redaction events: aggregate counts of warnings that match known redaction
  // markers (the tracer scrubs sk-* and Bearer tokens — those scrubs leave
  // ***REDACTED*** in the warning string).
  const redactions: AiRedactionEventInsert[] = [];
  const allWarnings = [...(trace.warnings ?? []), ...(contract.warnings ?? [])];
  const skScrubbed = allWarnings.filter((w) => /sk-\*\*\*REDACTED\*\*\*/.test(w)).length;
  const bearerScrubbed = allWarnings.filter((w) => /Bearer \*\*\*REDACTED\*\*\*/.test(w)).length;
  if (skScrubbed > 0) {
    redactions.push({
      run_trace_id: trace.trace_id,
      trace_id: trace.trace_id,
      redaction_type: 'api_key',
      field_name: 'warnings',
      redaction_count: skScrubbed,
    });
  }
  if (bearerScrubbed > 0) {
    redactions.push({
      run_trace_id: trace.trace_id,
      trace_id: trace.trace_id,
      redaction_type: 'bearer_token',
      field_name: 'warnings',
      redaction_count: bearerScrubbed,
    });
  }

  return { run, cost: costRow, redactions };
}

/**
 * Build an eval snapshot insert from a summary input.
 * Validates that pass + fail = total and that pass_rate is consistent with
 * counts (computed if not provided, asserted if provided).
 */
export function summarizeEvalRun(input: EvalSummaryInput): AiEvalSnapshotInsert {
  if (input.pass_count < 0 || input.fail_count < 0 || input.total_count < 0) {
    throw new Error('eval summary: counts must be non-negative');
  }
  if (input.pass_count + input.fail_count !== input.total_count) {
    throw new Error(
      `eval summary: pass_count + fail_count (${input.pass_count + input.fail_count}) must equal total_count (${input.total_count})`,
    );
  }
  const pass_rate =
    input.total_count === 0 ? 0 : Number((input.pass_count / input.total_count).toFixed(3));

  return {
    eval_suite: input.eval_suite,
    baseline_id: input.baseline_id,
    git_sha: input.git_sha,
    pass_count: input.pass_count,
    fail_count: input.fail_count,
    total_count: input.total_count,
    pass_rate,
    drift_score: input.drift_score,
    metadata: input.metadata ?? {},
  };
}
