/**
 * POST /api/ai/offer-brain
 *
 * Offer Brain agent endpoint. Accepts an OfferBrainInput JSON body, returns
 * a strictly-validated OfferBrief.
 *
 * - No streaming.
 * - No auth wiring (out of scope per AI-001 brief).
 * - Mock by default; real Claude only when OFFER_BRAIN_USE_REAL_MODEL=true.
 */

import { NextResponse } from 'next/server';
import { runOfferBrain } from '@/lib/ai/offer-brain/agent';
import { OfferBrainAgentError } from '@/lib/ai/offer-brain/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<Response> {
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
