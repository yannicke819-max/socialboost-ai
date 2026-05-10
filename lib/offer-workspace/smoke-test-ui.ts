/**
 * Smoke-test UI state — pure helper used by `PromptInspector` (AI-016D).
 *
 * Maps the (plan, providerEnabled) tuple to one of three UI states so the
 * client can render the right microcopy WITHOUT ever consulting the API
 * key, which is server-only.
 *
 * Note: `providerEnabled` is the non-secret boolean form of
 * `process.env.SOCIALBOOST_AI_PROVIDER_ENABLED`. The boolean is safe to
 * expose to the client. The actual API key is **never** sent to the
 * client.
 *
 * The Free hard rule still lives server-side: the gateway's
 * `decideAiExecution` returns `providerCallAllowed: false` for Free under
 * any combination, so even if a client managed to flip its UI state, the
 * server would still refuse a Free call.
 */

import type { SocialBoostPlan } from './ai-cost-model';

export const SMOKE_TEST_UI_STATES = ['free', 'paid_disabled', 'paid_enabled'] as const;
export type SmokeTestUiState = (typeof SMOKE_TEST_UI_STATES)[number];

export interface SmokeTestUiInput {
  plan: SocialBoostPlan;
  providerEnabled: boolean;
}

/**
 * Resolve the UI state from the (plan, providerEnabled) tuple.
 *
 * - Free → always `'free'`. The `providerEnabled` flag has no effect.
 * - Paid + flag OFF → `'paid_disabled'`.
 * - Paid + flag ON → `'paid_enabled'`.
 *
 * Pure: no I/O, no env access. Same input → same output.
 */
export function resolveSmokeTestUiState(input: SmokeTestUiInput): SmokeTestUiState {
  if (input.plan === 'free') return 'free';
  if (!input.providerEnabled) return 'paid_disabled';
  return 'paid_enabled';
}
