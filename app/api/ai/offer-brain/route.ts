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
 * No streaming. No auth wiring (rate-limit + auth = future PR).
 */

import { NextResponse } from 'next/server';
import { runOfferBrain } from '@/lib/ai/offer-brain/agent';
import { OfferBrainAgentError } from '@/lib/ai/offer-brain/errors';
import { endpointEnabled } from '@/lib/ai/offer-brain/api-flag';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
        ok: false,
        error: {
          code: 'invalid_input',
          message: 'Request body is not valid JSON.',
        },
      },
      { status: 400 },
    );
  }

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
    // Generic catch — never expose stack trace, only the message string
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
