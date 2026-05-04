/**
 * Model router config — static, code-driven.
 *
 * AI-003: only `offer_brain` is wired. Future task types add a row here.
 * No autonomous decisions. No cost-based dynamic routing. No fallback to a
 * different (more expensive) model on retry. Everything is explicit.
 */

import type { ProviderId, TaskType } from '../cost/types';

export interface TaskRouting {
  /** Default provider when real-mode is blocked or not requested. */
  default_provider: ProviderId; // always 'mock' in AI-003
  /** Provider to use when real-mode is allowed. */
  real_provider_candidate: ProviderId;
  /** Per-agent flag name to flip real mode on. Distinct per agent. */
  agent_real_env_flag: string;
}

export const ROUTING_CONFIG: Record<TaskType, TaskRouting> = {
  offer_brain: {
    default_provider: 'mock',
    real_provider_candidate: 'anthropic',
    agent_real_env_flag: 'OFFER_BRAIN_USE_REAL_MODEL',
  },
};

export const ROUTER_GLOBAL_FLAG = 'MODEL_ROUTER_ALLOW_REAL';
export const EVAL_REAL_FLAG = 'EVAL_USE_REAL_MODEL';
