/**
 * Tracing module — ExecutionTrace.
 *
 * Hard rule: NEVER store user content (raw_offer_text, prompt, API key, full
 * provider response). Only hashes, lengths, counts, language tags, scores
 * aggregates, warning messages.
 *
 * Trace is what gets logged or persisted for diagnostics — it's intentionally
 * insufficient to reproduce the user's data.
 */

import type { CostEstimate, ProviderId, TaskType } from '../cost/types';

export type TraceMode = 'mock' | 'real';
export type ValidationStatus = 'pending' | 'valid' | 'invalid' | 'failed';

export interface TokenEstimate {
  input: number;
  output: number;
}

export interface ExecutionTrace {
  trace_id: string;
  agent_id: string;
  task_type: TaskType;
  provider: ProviderId;
  model: string;
  mode: TraceMode;
  started_at: string;
  completed_at?: string;
  latency_ms?: number;
  /** SHA-256 hex of the canonicalized input. Stable across runs of identical input. */
  input_hash: string;
  /** SHA-256 hex of the canonicalized output. Optional (set when output is produced). */
  output_hash?: string;
  /** Number of top-level fields in the input. */
  input_field_count: number;
  /** Byte length of the canonicalized input. */
  input_size_bytes: number;
  /** Detected/declared input language (when applicable). */
  language?: string;
  token_estimate?: TokenEstimate;
  cost_estimate?: CostEstimate;
  validation_status: ValidationStatus;
  /** Error code when failed/invalid. NEVER a stack trace. */
  error_code?: string;
  warnings: string[];
}
