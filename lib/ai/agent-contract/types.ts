/**
 * AgentExecutionContract — runtime envelope for any agent execution.
 *
 * AI-003 scope: defines the contract shape and a runner for Offer Brain via
 * adapter. Future agents register their own adapters with the same envelope.
 *
 * The contract carries:
 *   - identity (agent_id, agent_version, contract_version, schema versions)
 *   - the input/output payloads
 *   - the routing decision (provider, model, mode)
 *   - the cost estimate
 *   - the trace (redacted — see lib/ai/tracing/)
 *   - structured warnings + errors (no stack traces)
 *   - timing
 */

import type { TaskType } from '../cost/types';
import type { CostEstimate } from '../cost/types';
import type { ExecutionMode, GateAudit } from '../model-router/types';
import type { ExecutionTrace } from '../tracing/types';

export interface AgentExecutionError {
  code: string;
  message: string;
  recoverable: boolean;
  /** Optional structured details — NEVER a JS stack trace, NEVER the raw input. */
  details?: Record<string, unknown>;
}

export interface AgentModelRequest {
  provider: 'mock' | 'anthropic';
  model: string;
  estimated_input_tokens: number;
  estimated_output_tokens: number;
  estimated_total_tokens: number;
  estimated_cost_credits: number;
  /** True when MODEL_ROUTER_ALLOW_REAL gating allowed the real call. */
  gate_allowed: boolean;
  blocked_reason?: string;
  gate_audit: GateAudit;
}

export const AGENT_CONTRACT_VERSION = '0.1.0';

export interface AgentExecutionContract<I = unknown, O = unknown> {
  agent_id: string;                 // 'offer-brain'
  agent_version: string;            // semver, lib/ai/offer-brain/schema.ts SCHEMA_VERSION
  contract_version: string;         // AGENT_CONTRACT_VERSION
  input_schema_version: string;     // agent's input schema version
  output_schema_version: string;    // agent's output schema version
  task_type: TaskType;

  input: I;
  output?: O;

  execution_mode: ExecutionMode;    // mock | real
  model_request: AgentModelRequest;
  cost_estimate: CostEstimate;
  trace: ExecutionTrace;

  warnings: string[];
  errors: AgentExecutionError[];

  started_at: string;
  completed_at?: string;
}
