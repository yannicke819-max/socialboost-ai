/**
 * Tracer — builds an ExecutionTrace.
 *
 * Lifecycle:
 *   const t = startTrace({...});
 *   // ... agent runs ...
 *   completeTrace(t, { output, validation_status });
 */

import type { ProviderId, TaskType, CostEstimate } from '../cost/types';
import type { ExecutionTrace, TokenEstimate, TraceMode, ValidationStatus } from './types';
import { byteLength, hashOf, newTraceId, scrubWarning, topLevelFieldCount } from './redact';

interface StartTraceInput {
  agent_id: string;
  task_type: TaskType;
  provider: ProviderId;
  model: string;
  mode: TraceMode;
  raw_input: unknown;
  language?: string;
  token_estimate?: TokenEstimate;
  cost_estimate?: CostEstimate;
}

export function startTrace(input: StartTraceInput): ExecutionTrace {
  return {
    trace_id: newTraceId(),
    agent_id: input.agent_id,
    task_type: input.task_type,
    provider: input.provider,
    model: input.model,
    mode: input.mode,
    started_at: new Date().toISOString(),
    input_hash: hashOf(input.raw_input),
    input_field_count: topLevelFieldCount(input.raw_input),
    input_size_bytes: byteLength(input.raw_input),
    language: input.language,
    token_estimate: input.token_estimate,
    cost_estimate: input.cost_estimate,
    validation_status: 'pending',
    warnings: [],
  };
}

interface CompleteTraceInput {
  output?: unknown;
  validation_status: ValidationStatus;
  error_code?: string;
  warnings?: string[];
  token_estimate?: TokenEstimate;
  cost_estimate?: CostEstimate;
}

export function completeTrace(trace: ExecutionTrace, input: CompleteTraceInput): ExecutionTrace {
  const completed_at = new Date().toISOString();
  const latency_ms = Date.parse(completed_at) - Date.parse(trace.started_at);

  return {
    ...trace,
    completed_at,
    latency_ms,
    output_hash: input.output !== undefined ? hashOf(input.output) : undefined,
    validation_status: input.validation_status,
    error_code: input.error_code,
    warnings: [...(trace.warnings ?? []), ...(input.warnings ?? []).map(scrubWarning)],
    token_estimate: input.token_estimate ?? trace.token_estimate,
    cost_estimate: input.cost_estimate ?? trace.cost_estimate,
  };
}
