/**
 * POST /api/ai/offer-brain
 *
 * Offer Brain agent endpoint.
 *
 * Security gating (AI-001):
 *   - Endpoint disabled by default. Set OFFER_BRAIN_API_ENABLED='true' to enable.
 *   - When disabled: returns 404 with no agent execution, no error details leaked.
 *   - Enable explicitly per environment (dev/preview/prod) — never enabled by default.
 *
 * Real model gating (separate flag):
 *   - Mock by default. Set OFFER_BRAIN_USE_REAL_MODEL='true' AND ANTHROPIC_API_KEY to call Claude.
 *
 * Input format (AI-006 v1):
 *   - { businessName, offer, targetAudience?, tone?, language?, platforms?,
 *       proofPoints?, include_actionables? }
 *   - Returns { diagnostic, actionables } when include_actionables !== false.
 *
 * Legacy input format (AI-001):
 *   - { raw_offer_text, ... }
 *   - Still accepted for backward compat. Returns the AI-001 shape
 *     ({ ok, output, metadata }).
 *
 * The dispatcher distinguishes formats by the presence of `businessName` +
 * `offer`.
 *
 * No streaming. No auth wiring (rate-limit + auth = future PR).
 */

import { NextResponse } from 'next/server';
import { runOfferBrain } from '@/lib/ai/offer-brain/agent';
import { OfferBrainAgentError } from '@/lib/ai/offer-brain/errors';
import { endpointEnabled } from '@/lib/ai/offer-brain/api-flag';
import { runOfferBrainV1 } from '@/lib/ai/offer-brain/actionables/agent';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Route to the v1 path if the body looks like a v1 attempt (any v1-only key
// present, OR camelCase keys present), regardless of whether validation
// will pass. This is needed so missing-businessName / missing-offer requests
// get the structured v1 INVALID_INPUT response instead of falling through
// to the legacy path.
function isV1Input(body: unknown): boolean {
  if (typeof body !== 'object' || body === null) return false;
  const o = body as Record<string, unknown>;
  // If legacy `raw_offer_text` is present, prefer the legacy path.
  if (typeof o.raw_offer_text === 'string') return false;
  for (const k of [
    'businessName',
    'offer',
    'targetAudience',
    'proofPoints',
    'include_actionables',
    'tone',
    'language',
    'platforms',
  ]) {
    if (k in o) return true;
  }
  return false;
}

/**
 * Map a Zod-style flatten() to the v1 structured 400 shape:
 *   { error: { code, message, fields: [{ path, message }] } }
 */
function v1ValidationErrorBody(details: unknown): {
  error: { code: string; message: string; fields: Array<{ path: string; message: string }> };
} {
  const fields: Array<{ path: string; message: string }> = [];
  if (details && typeof details === 'object') {
    const flat = details as { fieldErrors?: Record<string, string[]>; formErrors?: string[] };
    if (flat.fieldErrors) {
      for (const [path, messages] of Object.entries(flat.fieldErrors)) {
        if (Array.isArray(messages)) {
          for (const m of messages) {
            fields.push({ path, message: m });
          }
        }
      }
    }
    if (flat.formErrors && Array.isArray(flat.formErrors)) {
      for (const m of flat.formErrors) {
        fields.push({ path: '_root', message: m });
      }
    }
  }
  if (fields.length === 0) {
    fields.push({ path: '_root', message: 'Invalid request body' });
  }
  return {
    error: {
      code: 'INVALID_INPUT',
      message: 'Invalid request body',
      fields,
    },
  };
}

export async function POST(req: Request): Promise<Response> {
  if (!endpointEnabled()) {
    // Pretend the route doesn't exist when disabled. No 403, no agent execution,
    // no body parsing, no leakage of internal state. The 404 is identical to
    // Next.js's own 404 for non-existent routes.
    return new Response('Not Found', { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        error: {
          code: 'INVALID_INPUT',
          message: 'Request body is not valid JSON',
          fields: [{ path: '_root', message: 'Body could not be parsed as JSON' }],
        },
      },
      { status: 400 },
    );
  }

  // ---------------------------------------------------------------------------
  // v1 path: { businessName, offer, ... }
  // ---------------------------------------------------------------------------
  if (isV1Input(body)) {
    try {
      const result = await runOfferBrainV1(body);
      return NextResponse.json(
        result.actionables
          ? {
              diagnostic: result.diagnostic,
              actionables: result.actionables,
              metadata: result.metadata,
            }
          : {
              diagnostic: result.diagnostic,
              metadata: result.metadata,
            },
        { status: 200 },
      );
    } catch (err) {
      if (err instanceof OfferBrainAgentError) {
        const json = err.toJSON();
        if (json.code === 'invalid_input') {
          return NextResponse.json(v1ValidationErrorBody(json.details), { status: 400 });
        }
        return NextResponse.json(
          {
            error: {
              code: json.code.toUpperCase(),
              message: json.message,
              fields: [],
            },
          },
          { status: statusForCode(json.code) },
        );
      }
      return NextResponse.json(
        {
          error: {
            code: 'INTERNAL_ERROR',
            message: err instanceof Error ? err.message : 'Unknown internal error',
            fields: [],
          },
        },
        { status: 500 },
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Legacy path (AI-001): { raw_offer_text, ... }
  // ---------------------------------------------------------------------------
  try {
    const result = await runOfferBrain(body);
    return NextResponse.json(
      {
        ok: true,
        output: result.output,
        metadata: result.metadata,
      },
      { status: 200 },
    );
  } catch (err) {
    if (err instanceof OfferBrainAgentError) {
      const json = err.toJSON();
      const status = statusForCode(json.code);
      return NextResponse.json({ ok: false, error: json }, { status });
    }
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'model_error',
          message: err instanceof Error ? err.message : 'Unknown internal error',
          recoverable: false,
        },
      },
      { status: 500 },
    );
  }
}

function statusForCode(code: string): number {
  switch (code) {
    case 'invalid_input':
      return 400;
    case 'output_validation':
      return 502;
    case 'rate_limit':
      return 429;
    case 'misconfigured':
      return 503;
    case 'aborted':
      return 499;
    case 'content_policy':
      return 400;
    case 'budget_exceeded':
      return 402;
    case 'mock_failure':
      return 500;
    default:
      return 500;
  }
}
