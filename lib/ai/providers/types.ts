/**
 * Provider adapter contract.
 *
 * AI-003 scope: 2 providers — `mock` and `anthropic`. The interface below is
 * minimal and per-task; future providers (image, video, audio) will define
 * their own task types and registries, NOT extend this one blindly.
 */

import type { ProviderId, TaskType } from '../cost/types';

export interface TokenEstimateBreakdown {
  input: number;
  output: number;
}

export interface ProviderAdapter {
  id: ProviderId;
  /** Display name (for logs / admin). */
  name: string;
  /** Default model identifier returned to the router. */
  default_model: string;
  /** Task types this provider can serve. */
  supports: TaskType[];
  /** Estimate tokens before any execution. Pure function. */
  estimateTokens(taskType: TaskType, rawInput: unknown): TokenEstimateBreakdown;
}
