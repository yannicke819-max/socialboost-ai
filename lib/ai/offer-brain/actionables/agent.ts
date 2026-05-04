/**
 * Offer Brain — Actionables v1 agent (AI-006).
 *
 * Orchestrates a v1 request:
 *   1. Validates the v1 input shape (businessName/offer/...).
 *   2. Bridges to the existing OfferBrainInput shape and runs the legacy
 *      diagnostic via `runOfferBrain` (mock by default; real model gated by
 *      AI-001 flags, unchanged here).
 *   3. Builds the actionables block from the v1 input (deterministic mock).
 *   4. Validates both pieces against their respective schemas.
 *   5. Returns `{ diagnostic, actionables }`.
 *
 * Hard rules enforced:
 *   - The actionables block is built strictly from the v1 input (anti-invention
 *     anchor lives in `mock.ts` + `invariants.ts`).
 *   - Diagnostic is run on a TRANSLATED input — we never modify the legacy
 *     OfferBrainInputSchema. The diagnostic continues to validate against its
 *     own schema (drift safety for AI-002 evals).
 *   - `include_actionables=false` → returns `{ diagnostic }` only.
 */

import { OfferBrainAgentError } from '../errors';
import { runOfferBrain, type AgentRunOptions } from '../agent';
import {
  type OfferBrainInput,
  OfferBriefOutputSchema,
  type OfferBrief,
} from '../schema';
import {
  ActionablesV1InputSchema,
  ActionablesOutputSchema,
  type ActionablesV1Input,
  type ActionablesOutput,
} from './schema';
import { buildActionablesMock } from './mock';

export interface ActionablesAgentResult {
  diagnostic: OfferBrief;
  actionables?: ActionablesOutput;
  metadata: {
    diagnostic_source: 'mock' | 'anthropic';
    actionables_source: 'mock' | null;
    duration_ms: number;
    schema_version: string;
  };
}

/**
 * Translate v1 input → legacy OfferBrainInput.
 * The legacy diagnostic doesn't know about businessName/tone/proofPoints
 * directly — we map onto its existing fields without breaking AI-002 evals.
 */
function bridgeToLegacyInput(v1: ActionablesV1Input): OfferBrainInput {
  // The legacy `raw_offer_text` is the canonical free-form input. We compose
  // a richer text block so the existing mock heuristics still produce a
  // sensible diagnostic from a v1 request.
  const raw_offer_text = [
    `Offre : ${v1.offer}`,
    v1.targetAudience ? `Cible : ${v1.targetAudience}` : '',
    v1.proofPoints && v1.proofPoints.length > 0 ? `Preuves : ${v1.proofPoints.join(' | ')}` : '',
    `Marque : ${v1.businessName}`,
  ]
    .filter(Boolean)
    .join('\n')
    .slice(0, 20000);

  // Map v1.platforms → legacy target_platforms (only those legacy supports).
  const LEGACY_PLATFORMS = new Set(['linkedin', 'instagram', 'x', 'tiktok', 'facebook']);
  const target_platforms = (v1.platforms ?? [])
    .filter((p) => LEGACY_PLATFORMS.has(p))
    .slice(0, 5) as OfferBrainInput['target_platforms'];

  const out: OfferBrainInput = {
    raw_offer_text,
    locale: v1.language ?? 'fr',
    current_offer_name: v1.businessName,
    target_customer: v1.targetAudience,
    proof_points: v1.proofPoints,
    target_platforms: target_platforms && target_platforms.length > 0 ? target_platforms : undefined,
  };
  // Strip undefined fields so .strict() schema accepts cleanly.
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v !== undefined)) as OfferBrainInput;
}

export async function runOfferBrainV1(
  rawInput: unknown,
  opts: AgentRunOptions = {},
): Promise<ActionablesAgentResult> {
  const start = Date.now();

  // 1. Validate v1 input
  const parsed = ActionablesV1InputSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new OfferBrainAgentError({
      code: 'invalid_input',
      message: 'Invalid request body',
      recoverable: false,
      details: parsed.error.flatten(),
    });
  }
  const v1: ActionablesV1Input = parsed.data;

  // 2. Run legacy diagnostic on the bridged input
  const legacyInput = bridgeToLegacyInput(v1);
  const diag = await runOfferBrain(legacyInput, opts);
  const diagnostic = OfferBriefOutputSchema.parse(diag.output);

  const include = v1.include_actionables !== false;
  if (!include) {
    return {
      diagnostic,
      metadata: {
        diagnostic_source: diag.metadata.source,
        actionables_source: null,
        duration_ms: Date.now() - start,
        schema_version: '1.0.0',
      },
    };
  }

  // 3. Build actionables from the v1 input directly (not from the diagnostic)
  // so the proof anchor is unambiguously the user's proofPoints array.
  const draft = buildActionablesMock(v1);

  // 4. Validate
  const validated = ActionablesOutputSchema.parse(draft);

  return {
    diagnostic,
    actionables: validated,
    metadata: {
      diagnostic_source: diag.metadata.source,
      actionables_source: 'mock',
      duration_ms: Date.now() - start,
      schema_version: '1.0.0',
    },
  };
}
