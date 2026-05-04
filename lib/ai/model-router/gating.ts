/**
 * Multi-flag gating for real-model calls.
 *
 * Real call is allowed ONLY when all gates are open:
 *   1. Not in CI (CI=true / GITHUB_ACTIONS=true)
 *   2. Not in test mode (NODE_ENV=test) — defensive, prevents test runs from hitting real API
 *   3. MODEL_ROUTER_ALLOW_REAL = 'true' (global router gate)
 *   4. <task agent flag> = 'true' (per-agent gate, e.g. OFFER_BRAIN_USE_REAL_MODEL)
 *   5. ANTHROPIC_API_KEY is set and non-empty
 *   6. If eval context: EVAL_USE_REAL_MODEL = 'true'
 *
 * Strict equality on 'true' — opt-in must be explicit and unambiguous.
 * Any deviation → mock fallback (when prefer_real=false) or `allowed=false` (when prefer_real=true).
 */

import type { TaskType } from '../cost/types';
import type { GateAudit } from './types';
import { EVAL_REAL_FLAG, ROUTER_GLOBAL_FLAG, ROUTING_CONFIG } from './config';

export function auditGates(taskType: TaskType, ctx: { is_eval?: boolean }): GateAudit {
  const taskRouting = ROUTING_CONFIG[taskType];
  return {
    is_ci: process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true',
    is_test_env: process.env.NODE_ENV === 'test',
    router_allow_real: process.env[ROUTER_GLOBAL_FLAG] === 'true',
    agent_allow_real: process.env[taskRouting.agent_real_env_flag] === 'true',
    api_key_present:
      typeof process.env.ANTHROPIC_API_KEY === 'string' && process.env.ANTHROPIC_API_KEY.length > 0,
    eval_allow_real: process.env[EVAL_REAL_FLAG] === 'true',
    is_eval_context: ctx.is_eval === true,
  };
}

/**
 * Evaluates the gates and returns `{ allowed, reason }`.
 * `allowed=true` → real call permitted. `allowed=false` → reason is the first
 * closed gate encountered (deterministic order for predictable logs).
 */
export function evaluateGates(
  taskType: TaskType,
  ctx: { is_eval?: boolean },
): { allowed: boolean; reason: string; audit: GateAudit } {
  const audit = auditGates(taskType, ctx);

  if (audit.is_ci) return { allowed: false, reason: 'ci_environment', audit };
  if (audit.is_test_env) return { allowed: false, reason: 'test_environment', audit };
  if (!audit.router_allow_real)
    return { allowed: false, reason: `${ROUTER_GLOBAL_FLAG}_not_set`, audit };
  if (!audit.agent_allow_real)
    return {
      allowed: false,
      reason: `${ROUTING_CONFIG[taskType].agent_real_env_flag}_not_set`,
      audit,
    };
  if (!audit.api_key_present)
    return { allowed: false, reason: 'ANTHROPIC_API_KEY_missing', audit };
  if (audit.is_eval_context && !audit.eval_allow_real)
    return { allowed: false, reason: `${EVAL_REAL_FLAG}_not_set_for_eval_context`, audit };

  return { allowed: true, reason: 'all_gates_open', audit };
}
