/**
 * AI-004 — Persistence row types.
 *
 * Insert-shape TypeScript mirrors of the SQL tables defined in
 * `supabase/migrations/20260504100000_ai_persistence_schema.sql`.
 *
 * HARD RULES (enforced by tests in __tests__/redaction-assert.test.ts):
 *   - No raw_input, raw_output, prompt, completion, api_key,
 *     request_body, response_body, stack_trace fields anywhere.
 *   - Hashes only (SHA-256 hex strings).
 *   - metadata jsonb (eval snapshots) carries aggregates only — never
 *     a goldens body, never a model output.
 *
 * These types describe DATA SHAPES. They are NOT a Supabase client and
 * the persistence layer does NO I/O at AI-004.
 */

/** A run record — append-only ledger row. */
export interface AiAgentRunInsert {
  trace_id: string;
  agent_id: string;
  agent_version: string;
  contract_version: string;
  task_type: string;
  execution_mode: 'mock' | 'real';
  provider: string;
  model: string;
  status: 'success' | 'error' | 'blocked';
  started_at: string; // ISO 8601
  completed_at?: string;
  latency_ms?: number;
  /** SHA-256 hex of canonicalized input. NEVER the input itself. */
  input_hash: string;
  /** SHA-256 hex of canonicalized output. NEVER the output itself. */
  output_hash?: string;
  input_size_bytes?: number;
  input_field_count?: number;
  language?: string;
  validation_status?: string;
  error_code?: string;
  warning_count: number;
}

export interface AiCostEstimateInsert {
  /**
   * Logical reference to the parent run via trace_id (since the run's uuid
   * is generated server-side at insert time). The DB FK is on the uuid;
   * the ingester resolves trace_id → uuid before insert.
   */
  run_trace_id: string;
  provider: string;
  model: string;
  task_type: string;
  estimated_input_tokens: number;
  estimated_output_tokens: number;
  estimated_total_tokens: number;
  estimated_cost_credits: number;
  estimated_cost_eur?: number;
  confidence: 'low' | 'medium' | 'high';
  requires_confirmation: boolean;
  premium_operation: boolean;
  blocked_by_budget: boolean;
}

export interface AiRedactionEventInsert {
  /** Same logical reference as AiCostEstimateInsert. */
  run_trace_id?: string;
  trace_id?: string;
  redaction_type: string;
  field_name?: string;
  redaction_count: number;
}

export interface AiEvalSnapshotInsert {
  eval_suite: string;
  baseline_id?: string;
  git_sha: string;
  pass_count: number;
  fail_count: number;
  total_count: number;
  pass_rate: number;
  drift_score?: number;
  /** Aggregates only. NEVER raw goldens, prompts, model outputs. */
  metadata: Record<string, unknown>;
}

/**
 * Bundle produced by `mapAgentContractToPersistenceBundle`.
 * The future ingester would: insert run → grab uuid → insert children.
 * AI-004 does not insert anything.
 */
export interface AiPersistenceBundle {
  run: AiAgentRunInsert;
  cost: AiCostEstimateInsert;
  redactions: AiRedactionEventInsert[];
}

/** Input shape for `summarizeEvalRun` — no raw goldens, just counts. */
export interface EvalSummaryInput {
  eval_suite: string;
  git_sha: string;
  pass_count: number;
  fail_count: number;
  total_count: number;
  baseline_id?: string;
  drift_score?: number;
  /** Aggregate counters only — categories, distributions. */
  metadata?: Record<string, unknown>;
}
