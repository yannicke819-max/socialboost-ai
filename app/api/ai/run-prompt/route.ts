/**
 * POST /api/ai/run-prompt — server-only entry to the AI provider gateway
 * (AI-016 + AI-016B rebase).
 *
 * Body: AiProviderRunInput (incl. plan + remainingCredits + action).
 * Response: AiProviderRunResult.
 *
 * Behaviour:
 *   - Calls `runAiProvider` which:
 *       1. Runs preflight (pure).
 *       2. Calls AI-016A `decideAiExecution` BEFORE the env flag.
 *       3. Only after the entitlements layer allows it AND the env flag is
 *          'true' AND a key is configured does the gateway hit the network.
 *   - Returns dry-run when SOCIALBOOST_AI_PROVIDER_ENABLED !== 'true' OR
 *     when the entitlements layer refuses (Free always refuses).
 *   - Never throws on missing env. Tests run without env.
 *   - No prompt body in logs in production (only requestId).
 *
 * Free hard rule:
 *   When the body's `plan` is `'free'` (or absent — defaults to `'free'`),
 *   the gateway returns a dry-run without ever calling fetch, regardless of
 *   any other parameter.
 */

import { NextResponse } from 'next/server';
import { runAiProvider } from '@/lib/ai/provider-gateway';
import type { AiProviderRunInput } from '@/lib/offer-workspace/ai-provider-runner';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, blockedReason: 'invalid_body' }, { status: 400 });
  }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ ok: false, blockedReason: 'invalid_body' }, { status: 400 });
  }
  const input = body as AiProviderRunInput;
  if (!input.promptVersion || typeof input.promptVersion !== 'object') {
    return NextResponse.json({ ok: false, blockedReason: 'missing_prompt_version' }, { status: 400 });
  }
  const result = await runAiProvider(input);
  return NextResponse.json(result, { status: 200 });
}
