import type { ProviderId, TaskType, CostEstimate } from '../cost/types';

export interface RouteContext {
  task_type: TaskType;
  /** Eval context — eval has its own gate (EVAL_USE_REAL_MODEL). Default false. */
  is_eval?: boolean;
  /**
   * If true, caller insists on real-mode execution. If gates fail, the router
   * returns `allowed=false` with `blocked_reason`. Caller decides what to do.
   * Default false → router falls back to mock without erroring.
   */
  prefer_real?: boolean;
  /** Raw input — used only for token estimation, never logged or hashed at this layer. */
  raw_input?: unknown;
  /** Optional override of the default model (e.g. for tests). */
  model_override?: string;
}

export type ExecutionMode = 'mock' | 'real';

export interface RouteResult {
  selected_provider: ProviderId;
  selected_model: string;
  execution_mode: ExecutionMode;
  /** Human-readable reason for the routing decision. */
  reason: string;
  estimated_cost: CostEstimate;
  /** True when the requested mode is allowed. False when blocked (with blocked_reason). */
  allowed: boolean;
  /** Set when allowed=false; explains which gate is closed. */
  blocked_reason?: string;
  /** Multi-flag gate audit — for diagnostics. NEVER includes the API key value. */
  gate_audit: GateAudit;
}

export interface GateAudit {
  is_ci: boolean;
  is_test_env: boolean;
  router_allow_real: boolean;
  agent_allow_real: boolean;
  api_key_present: boolean;
  eval_allow_real: boolean;
  is_eval_context: boolean;
}
