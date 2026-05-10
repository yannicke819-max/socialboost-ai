/**
 * AI Provider Runner — pure module (AI-016 + AI-016B rebase).
 *
 * Owns:
 *   - Types for the provider call surface (input / result / usage / meta).
 *   - Pre-flight checks that must pass BEFORE any network call.
 *   - Post-flight checks that must pass AFTER the model returns.
 *   - The dry-run / blocked result builders, used when the AI-016A
 *     entitlements layer (or the env flag, or a missing API key) refuses
 *     a real call.
 *
 * Does NOT own:
 *   - Reading process.env (that lives in lib/ai/provider-gateway.ts).
 *   - Calling any provider (that lives in lib/ai/provider-gateway.ts too).
 *   - The entitlements decision (that lives in
 *     lib/offer-workspace/ai-entitlements.ts).
 *   - Any side effect.
 *
 * Hard rules (AI-016B):
 *   - Pure: no `fetch`, no `process.env`, no `Date.now()` in the public
 *     output. Same input → identical output. Tests can run without env.
 *   - Forbidden phrases (AI-015) are scanned twice: once on the prompt
 *     (pre-flight), once on the model output (post-flight).
 *   - external_inspiration_analysis is hardened: every inspiration must
 *     carry doNotCopy: true; the post-flight refuses output that
 *     reproduces a long verbatim fragment (≥ 30 chars) from any
 *     inspiration's pastedText.
 *   - The runner exposes `plan` + `remainingCredits` so the gateway can
 *     consult `decideAiExecution` BEFORE any provider work. The Free hard
 *     rule (Free → never reaches a real provider) lives in the gateway
 *     and is asserted by the runner's own tests via the dry-run helpers.
 */

import {
  PROMPT_TASKS,
  containsForbiddenPhrase,
  type ExternalInspirationInput,
  type PromptTask,
  type PromptVersion,
} from '@/lib/offer-workspace/prompt-orchestrator';
import {
  AI_PROVIDER_NAMES,
  type AiProviderName,
  type SocialBoostAction,
  type SocialBoostPlan,
} from '@/lib/offer-workspace/ai-cost-model';

// Re-export for callers that previously relied on the runner module owning
// the provider-name surface. Single source of truth lives in ai-cost-model.
export { AI_PROVIDER_NAMES };
export type { AiProviderName };

export interface AiProviderRunInput {
  promptVersion: PromptVersion;
  provider?: AiProviderName;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  /** Opaque actor id; never logged in plaintext in production. */
  userId?: string;
  /** If absent, runner derives a stable id from (promptVersion.id, userId?). */
  requestId?: string;
  /** Optional offer reference for language-consistency pre-flight. */
  offer?: { brief?: { language?: 'fr' | 'en' } };
  /** Optional inspirations passed to the prompt — used for post-flight copy check. */
  inspirations?: ExternalInspirationInput[];
  /**
   * AI-016B: plan supplied by the caller (route handler, server action…).
   * Defaults to `'free'` when absent — the safest default. Free can NEVER
   * reach a real provider regardless of any other input.
   */
  plan?: SocialBoostPlan;
  /** AI-016B: credit balance for paid plans. Defaults to 0. */
  remainingCredits?: number;
  /** AI-016B: which SocialBoost action this run represents. */
  action?: SocialBoostAction;
  /** AI-016B: forward-looking, BYOK not yet wired. */
  hasUserProvidedApiKey?: boolean;
}

export interface AiProviderRunUsage {
  inputTokens?: number;
  outputTokens?: number;
  estimatedCostCents?: number;
}

export interface AiProviderRunMeta {
  requestId: string;
  promptVersionId: string;
  startedAtMock: string;
  finishedAtMock: string;
  dryRun: boolean;
  flagEnabled: boolean;
  /** AI-016B: surfaced for observability. Never affects authorization. */
  plan?: SocialBoostPlan;
  /** AI-016B: surfaced when the entitlements layer blocked the call. */
  decisionReason?: string;
}

export interface AiProviderRunResult {
  ok: boolean;
  provider: AiProviderName;
  model: string;
  task: PromptTask;
  outputText?: string;
  outputJson?: unknown;
  validationErrors?: string[];
  blockedReason?: string;
  usage?: AiProviderRunUsage;
  meta: AiProviderRunMeta;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

/** Hard upper bound on combined system+user prompt size (chars). */
export const MAX_PROMPT_CHARS = 32_000;

/** Hard upper bound on a single pasted inspiration text (chars). */
export const MAX_PASTED_TEXT_CHARS = 600;

/**
 * Length of the verbatim window we refuse to see in the model output.
 * 30 chars is enough to detect a copied sentence opener while leaving
 * room for legitimate quotation of brand names or short proofs.
 */
export const SOURCE_COPY_WINDOW_CHARS = 30;

const MOCK_STARTED_AT = '2026-05-04T00:00:00.000Z';
const MOCK_FINISHED_AT = '2026-05-04T00:00:00.500Z';

// -----------------------------------------------------------------------------
// Pre-flight
// -----------------------------------------------------------------------------

export type AiCheck =
  | { ok: true }
  | { ok: false; blockedReason: string; details?: string };

/**
 * Pre-flight gate. Runs before any provider call AND before the AI-016A
 * entitlements decision. Pure — no env access. Returns the first failure
 * encountered; callers should not bypass.
 */
export function preflightCheck(input: AiProviderRunInput): AiCheck {
  const { promptVersion, inspirations, offer } = input;

  if (!promptVersion || typeof promptVersion !== 'object') {
    return { ok: false, blockedReason: 'missing_prompt_version' };
  }
  if (!(PROMPT_TASKS as readonly string[]).includes(promptVersion.task)) {
    return { ok: false, blockedReason: 'unknown_task', details: promptVersion.task };
  }
  if (!promptVersion.expectedOutput || promptVersion.expectedOutput.trim().length === 0) {
    return { ok: false, blockedReason: 'missing_expected_output' };
  }
  if (!Array.isArray(promptVersion.guardrails) || promptVersion.guardrails.length === 0) {
    return { ok: false, blockedReason: 'missing_guardrails' };
  }

  const combined = `${promptVersion.systemPrompt}\n${promptVersion.userPrompt}`;
  if (combined.length > MAX_PROMPT_CHARS) {
    return {
      ok: false,
      blockedReason: 'prompt_too_long',
      details: `${combined.length}>${MAX_PROMPT_CHARS}`,
    };
  }

  const forbidden = containsForbiddenPhrase(combined);
  if (forbidden) {
    return { ok: false, blockedReason: 'forbidden_phrase_in_prompt', details: forbidden };
  }

  // Language consistency between the prompt and the offer brief, when offer is provided.
  const briefLang = offer?.brief?.language;
  if ((briefLang === 'fr' || briefLang === 'en') && promptVersion.language !== briefLang) {
    return {
      ok: false,
      blockedReason: 'language_mismatch_with_offer',
      details: `prompt=${promptVersion.language} brief=${briefLang}`,
    };
  }

  // External inspirations hardening.
  if (inspirations && inspirations.length > 0) {
    for (let i = 0; i < inspirations.length; i++) {
      const it = inspirations[i]!;
      if (it.doNotCopy !== true) {
        return {
          ok: false,
          blockedReason: 'inspiration_missing_do_not_copy',
          details: `inspiration[${i}]`,
        };
      }
      if (typeof it.pastedText === 'string' && it.pastedText.length > MAX_PASTED_TEXT_CHARS) {
        return {
          ok: false,
          blockedReason: 'inspiration_pasted_text_too_long',
          details: `inspiration[${i}] ${it.pastedText.length}>${MAX_PASTED_TEXT_CHARS}`,
        };
      }
    }
    const lower = promptVersion.userPrompt.toLowerCase();
    if (!/(do not copy|ne copie pas)/.test(lower)) {
      return {
        ok: false,
        blockedReason: 'inspiration_block_missing_do_not_copy_marker',
      };
    }
  }

  return { ok: true };
}

// -----------------------------------------------------------------------------
// Post-flight
// -----------------------------------------------------------------------------

export interface PostflightInput {
  promptVersion: PromptVersion;
  outputText: string;
  inspirations?: ExternalInspirationInput[];
}

export interface PostflightCheckResult {
  blockedReason?: string;
  validationErrors?: string[];
  outputJson?: unknown;
}

/**
 * Post-flight: scan the model output. Returns either a structured failure
 * or `{}`. Pure — no env access, no I/O.
 */
export function postflightCheck(input: PostflightInput): PostflightCheckResult {
  const { promptVersion, outputText, inspirations } = input;
  const text = outputText ?? '';

  // Forbidden phrases scan on the model output.
  const forbidden = containsForbiddenPhrase(text);
  if (forbidden) {
    return { blockedReason: 'forbidden_phrase_in_output' };
  }

  // External inspirations: refuse output that reproduces a long verbatim
  // fragment from any pastedText (≥ SOURCE_COPY_WINDOW_CHARS).
  if (inspirations && inspirations.length > 0) {
    const lowerOut = text.toLowerCase();
    for (const it of inspirations) {
      const src = (it.pastedText ?? '').toLowerCase().trim();
      if (src.length < SOURCE_COPY_WINDOW_CHARS) continue;
      for (let i = 0; i + SOURCE_COPY_WINDOW_CHARS <= src.length; i++) {
        const window = src.slice(i, i + SOURCE_COPY_WINDOW_CHARS);
        if (lowerOut.includes(window)) {
          return { blockedReason: 'suspected_source_copying' };
        }
      }
    }
  }

  // JSON parse attempt when the format demands it.
  if (promptVersion.outputFormat === 'json') {
    const trimmed = text.trim();
    if (trimmed.length === 0) {
      return { validationErrors: ['empty_output'] };
    }
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      return { outputJson: parsed };
    } catch (err) {
      return {
        validationErrors: [
          'invalid_json',
          err instanceof Error ? err.message : 'parse_error',
        ],
      };
    }
  }

  return {};
}

// -----------------------------------------------------------------------------
// Result builders
// -----------------------------------------------------------------------------

export function buildRequestId(input: AiProviderRunInput): string {
  if (typeof input.requestId === 'string' && input.requestId.length > 0) {
    return input.requestId;
  }
  const userTag = input.userId ? `_${input.userId}` : '';
  return `req_${input.promptVersion.id}${userTag}`;
}

export interface BuildResultOptions {
  /** True only when the env flag was actually set to 'true'. */
  flagEnabled?: boolean;
  startedAt?: string;
  finishedAt?: string;
  blockedReason?: string;
  decisionReason?: string;
  validationErrors?: string[];
  outputText?: string;
  outputJson?: unknown;
  provider?: AiProviderName;
  model?: string;
  usage?: AiProviderRunUsage;
}

export function buildDryRunResult(
  input: AiProviderRunInput,
  options: BuildResultOptions = {},
): AiProviderRunResult {
  const language = input.promptVersion.language;
  const explainText = options.outputText ?? (language === 'en'
    ? 'AI provider is disabled. The brief is ready, but no real call was made.'
    : "Provider IA désactivé. Le brief est prêt, mais aucun appel réel n'a été effectué.");
  return {
    ok: !options.blockedReason,
    provider: options.provider ?? 'mock',
    model: options.model ?? 'dry-run',
    task: input.promptVersion.task,
    outputText: explainText,
    outputJson: options.outputJson,
    validationErrors: options.validationErrors,
    blockedReason: options.blockedReason,
    usage: options.usage,
    meta: {
      requestId: buildRequestId(input),
      promptVersionId: input.promptVersion.id,
      startedAtMock: options.startedAt ?? MOCK_STARTED_AT,
      finishedAtMock: options.finishedAt ?? MOCK_FINISHED_AT,
      dryRun: true,
      flagEnabled: options.flagEnabled ?? false,
      plan: input.plan,
      decisionReason: options.decisionReason,
    },
  };
}

/**
 * Build a "blocked at pre-flight or entitlements" result without any provider
 * call. Pure helper used by the gateway when preflight or
 * `decideAiExecution` fails.
 */
export function buildBlockedResult(
  input: AiProviderRunInput,
  blockedReason: string,
  flagEnabled: boolean,
  decisionReason?: string,
): AiProviderRunResult {
  return {
    ok: false,
    provider: 'mock',
    model: blockedReason === 'forbidden_phrase_in_prompt' || blockedReason === 'language_mismatch_with_offer' ? 'preflight-blocked' : 'entitlements-blocked',
    task: input.promptVersion.task,
    blockedReason,
    meta: {
      requestId: buildRequestId(input),
      promptVersionId: input.promptVersion.id,
      startedAtMock: MOCK_STARTED_AT,
      finishedAtMock: MOCK_STARTED_AT,
      dryRun: true,
      flagEnabled,
      plan: input.plan,
      decisionReason,
    },
  };
}
