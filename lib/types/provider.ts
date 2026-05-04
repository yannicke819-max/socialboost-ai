import type { ModelTier, PlanId } from './domain';
import type { AgentError } from './agent';
import type { CostEstimate } from './credit';

// ModelRouter — LLM routing layer. Provider-agnostic by contract.

export interface ModelDescriptor {
  id: string;                 // 'claude-sonnet-4-6', 'gpt-4o', etc.
  context_window: number;
  supports_streaming: boolean;
  supports_tools: boolean;
  supports_prompt_cache: boolean;
}

export interface ChatCompletionRequest {
  system?: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  max_tokens?: number;
  temperature?: number;
  tools?: ToolDescriptor[];
}

export interface ChatCompletionResponse {
  content: string;
  finish_reason: 'stop' | 'length' | 'tool_use' | 'content_policy';
  tokens_in: number;
  tokens_out: number;
  cached_tokens: number;
}

export interface CallOptions {
  user_id?: string;
  agent_name?: string;
  abort_signal?: AbortSignal;
}

export interface ModelProvider {
  id: string;                 // 'anthropic' | 'openai' | 'google' | 'mistral' | 'local'
  name: string;
  models: ModelDescriptor[];
  call(req: ChatCompletionRequest, opts?: CallOptions): Promise<ChatCompletionResponse>;
  estimateCost(req: ChatCompletionRequest): {
    tokens_in: number;
    estimated_tokens_out: number;
    usd_cents: number;
  };
  healthCheck(): Promise<{ ok: boolean; latency_ms: number }>;
}

export type TaskHint =
  | 'parse'
  | 'classify'
  | 'generate-creative'
  | 'judge'
  | 'audit-deep';

export interface RouteContext {
  user_plan?: PlanId;
  language_hint?: string;
}

export interface ModelRouter {
  byTier(tier: ModelTier): ModelProvider;
  byTaskHint(hint: TaskHint, ctx?: RouteContext): ModelProvider;
  withFallback(primary_provider_id: string, error: AgentError): ModelProvider | null;
  setUserOverride(user_id: string, tier: ModelTier, provider_id: string): void;
}

// ProviderRouter — external tool routing (video, image, audio, data, design).

export type ToolCategory =
  | 'video-avatar'
  | 'video-generative'
  | 'image'
  | 'audio'
  | 'composition'
  | 'data'
  | 'design';

export interface ToolDescriptor {
  name: string;
  description: string;
  parameters_schema: unknown; // JSON-schema-ish, opaque at this layer
}

export interface InvokeOptions {
  user_id?: string;
  campaign_id?: string;
  abort_signal?: AbortSignal;
  timeout_ms?: number;
}

export interface ToolResult<R = unknown> {
  ok: boolean;
  result?: R;
  error?: { code: string; message: string };
  duration_ms: number;
  cost_estimate?: CostEstimate;
}

export interface ToolAdapter<Req = unknown, Res = unknown> {
  id: string;                 // 'heygen', 'runway', 'fal-flux', 'elevenlabs'
  category: ToolCategory;
  capabilities: string[];     // ['avatar-video-30s', 'voice-clone', 'multi-lang']
  estimateCost(req: Req): CostEstimate;
  invoke(req: Req, opts?: InvokeOptions): Promise<ToolResult<Res>>;
  healthCheck(): Promise<{ ok: boolean; latency_ms: number }>;
}

export type Quality = 'fast' | 'standard' | 'premium';

export interface BenchmarkReport {
  generated_at: string;
  results: BenchmarkRow[];
}

export interface BenchmarkRow {
  provider_id: string;
  category: ToolCategory;
  capability: string;
  quality_score: number;        // 0-5 averaged across reviewers
  latency_p50_ms: number;
  latency_p95_ms: number;
  latency_p99_ms: number;
  error_rate: number;           // 0-1
  cost_per_output_cents: number;
  passes_threshold: boolean;
}

export interface ProviderRouter {
  byCapability(cap: string): ToolAdapter;
  byCategoryQuality(cat: ToolCategory, quality: Quality): ToolAdapter;
  setUserPreference(user_id: string, cat: ToolCategory, provider_id: string): void;
  benchmarkResults(): BenchmarkReport;
}

// Watchlist entry — for emerging models we track but do not wire.

export type ProductionReadiness = 'production-ready' | 'conditionally-ready' | 'not-production-ready';
export type BoostStatus = 'production-promoted' | 'benchmark-candidate' | 'watchlist' | 'rejected';

export interface ProviderWatchlistEntry {
  id: string;
  category: ToolCategory;
  use_case: string;
  benchmark_signal: string;
  api_availability: string;
  commercial_license: string;
  estimated_cost: string;
  production_readiness: ProductionReadiness;
  risks: string[];
  socialboost_status: BoostStatus;
  notes?: string;
}
