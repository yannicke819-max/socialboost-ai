/**
 * POST /api/ai/run-prompt — server-only entry to the AI provider gateway
 * (AI-016).
 *
 * Body: AiProviderRunInput. Response: AiProviderRunResult.
 *
 * Behaviour:
 *   - Returns dry-run when SOCIALBOOST_AI_PROVIDER_ENABLED !== 'true' OR
 *     when no API key is configured. Never throws on missing env.
 *   - Pre-flight + post-flight via lib/offer-workspace/ai-provider-runner.
 *   - No prompt body in logs in production (only requestId).
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
