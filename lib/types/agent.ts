import type { ModelTier } from './domain';

// Agent contract — every pipeline stage implements this shape.
// Implementations (Offer Brain, Market Radar, etc.) ship in AI-001+, gated by Zod schemas.

export interface AgentMetadata {
  model: string;                     // e.g. 'anthropic:claude-sonnet-4-6'
  prompt_version: string;
  tokens_in: number;
  tokens_out: number;
  cached_tokens: number;
  duration_ms: number;
  credits_consumed: number;
  retries: number;
  fallback_used?: boolean;
}

export type AgentErrorCode =
  | 'invalid_input'
  | 'model_error'
  | 'output_validation'
  | 'tool_error'
  | 'budget_exceeded'
  | 'aborted'
  | 'rate_limit'
  | 'content_policy';

export interface AgentError {
  code: AgentErrorCode;
  message: string;
  recoverable: boolean;
  upstream?: { provider: string; status?: number; raw?: string };
}

export type AgentResult<T> =
  | { ok: true; output: T; metadata: AgentMetadata }
  | { ok: false; error: AgentError };

// AgentContext — injected at pipeline orchestration time.
// Forward declarations so we don't create a circular dep with provider.ts.

export interface AgentContext {
  user_id: string;
  campaign_id: string;
  step_id: string;
  // Concrete implementations (ModelRouter, MemoryLayer, CreditLedger, TraceLogger)
  // are wired in AI-003. At AI-000 we only declare the shape.
  abort_signal?: AbortSignal;
}

// Agent shape (descriptive, will be backed by Zod schemas in AI-001).

export interface AgentDescriptor {
  name: string;                      // 'offer-brain', 'market-radar', ...
  version: string;                   // semver
  model_tier: ModelTier;
  estimated_cost_units: number;      // pre-check hint
  eval_golden_set_path: string;      // 'evals/golden/<agent>/'
}

// Pipeline stage names — fixed set.

export type PipelineStageName =
  | 'offer-brain'
  | 'market-radar'
  | 'channel-strategist'
  | 'creative-director'
  | 'asset-planner'
  | 'critic-qa'
  | 'user-feedback'
  | 'export-revenue-prep';
