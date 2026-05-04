/**
 * ModelRouter — minimal, static, config-driven.
 *
 * Decides:
 *   - which provider to use (mock vs real candidate)
 *   - which model identifier to pass downstream
 *   - what cost the caller should expect
 *   - whether the requested mode is allowed
 *
 * Does NOT:
 *   - call the provider
 *   - retry, escalate, or fall back to another model
 *   - make autonomous quality/cost trade-offs
 */

import { estimateCost } from '../cost/estimator';
import type { CostEstimate, TaskType } from '../cost/types';
import { getProvider } from '../providers/registry';
import { ROUTING_CONFIG } from './config';
import { evaluateGates } from './gating';
import type { ExecutionMode, RouteContext, RouteResult } from './types';

export function route(ctx: RouteContext): RouteResult {
  const taskRouting = ROUTING_CONFIG[ctx.task_type];
  const gateResult = evaluateGates(ctx.task_type, { is_eval: ctx.is_eval });

  // The caller's preferred mode. Defaults to mock.
  const wants_real = ctx.prefer_real === true;

  // If real is not allowed (or not requested), serve mock.
  if (!wants_real || !gateResult.allowed) {
    const mockProvider = getProvider('mock');
    const cost = estimateCost({
      task_type: ctx.task_type,
      provider: 'mock',
      model: ctx.model_override ?? mockProvider.default_model,
      raw_input: ctx.raw_input,
    });
    const mode: ExecutionMode = 'mock';

    if (wants_real && !gateResult.allowed) {
      // Caller asked for real but a gate is closed: surface allowed=false.
      return {
        selected_provider: 'mock',
        selected_model: mockProvider.default_model,
        execution_mode: mode,
        reason: `prefer_real_blocked:${gateResult.reason}`,
        estimated_cost: cost,
        allowed: false,
        blocked_reason: gateResult.reason,
        gate_audit: gateResult.audit,
      };
    }

    return {
      selected_provider: 'mock',
      selected_model: mockProvider.default_model,
      execution_mode: mode,
      reason: wants_real ? 'real_unavailable_fallback_mock' : 'default_mock',
      estimated_cost: cost,
      allowed: true,
      gate_audit: gateResult.audit,
    };
  }

  // Real mode is requested AND all gates are open.
  const realProvider = getProvider(taskRouting.real_provider_candidate);
  const cost = estimateCost({
    task_type: ctx.task_type,
    provider: realProvider.id,
    model: ctx.model_override ?? realProvider.default_model,
    raw_input: ctx.raw_input,
  });

  return {
    selected_provider: realProvider.id,
    selected_model: ctx.model_override ?? realProvider.default_model,
    execution_mode: 'real',
    reason: gateResult.reason,
    estimated_cost: cost,
    allowed: true,
    gate_audit: gateResult.audit,
  };
}

/** Convenience: estimate cost without routing decision. */
export function estimateForTask(taskType: TaskType, rawInput: unknown): CostEstimate {
  const provider = getProvider('mock'); // estimate against the cheapest by default
  return estimateCost({
    task_type: taskType,
    provider: provider.id,
    model: provider.default_model,
    raw_input: rawInput,
  });
}
