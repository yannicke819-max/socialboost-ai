/**
 * Offer Brain — eval entry point.
 *
 * Usage:
 *   npm run eval:offer-brain
 *   npm run eval:offer-brain -- --baseline       # write the baseline file (mock only)
 *   npm run eval:offer-brain -- --diff           # compute diff vs baseline
 *   npm run eval:offer-brain -- --diff --fail-on-regression
 *
 * Real model run (manual, local):
 *   EVAL_USE_REAL_MODEL=true ANTHROPIC_API_KEY=sk-... npm run eval:offer-brain
 *
 * CI policy:
 *   - CI never sets EVAL_USE_REAL_MODEL → mock only.
 *   - CI must NOT pass --fail-on-regression in this PR (warning-only mode).
 */

import { runOfferBrainEval, parseFlags } from './runner';

async function main(): Promise<void> {
  const flags = parseFlags(process.argv);
  const { exitCode } = await runOfferBrainEval(flags);
  process.exit(exitCode);
}

main().catch((err) => {
  console.error('FATAL eval script error:');
  console.error(err);
  // Script-level failure (loader, parser, IO) → real exit 1, regardless of mode.
  process.exit(1);
});
