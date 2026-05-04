/**
 * Run all agent eval suites in sequence.
 * AI-002: only Offer Brain is wired. Future agents register here.
 *
 * Usage: npm run eval:all
 *
 * CI policy: warning-only. The script exits 0 even if a suite reports failures,
 * unless --fail-on-regression is passed and diff shows regression.
 */

import { runOfferBrainEval, parseFlags } from './runner';

const SUITES: Array<{
  name: string;
  run: (flags: ReturnType<typeof parseFlags>) => Promise<{ exitCode: number }>;
}> = [{ name: 'offer-brain', run: runOfferBrainEval }];

async function main(): Promise<void> {
  const flags = parseFlags(process.argv);
  let worstExit = 0;
  for (const suite of SUITES) {
    console.log(`\n=== Suite: ${suite.name} ===`);
    const { exitCode } = await suite.run(flags);
    if (exitCode > worstExit) worstExit = exitCode;
  }
  process.exit(worstExit);
}

main().catch((err) => {
  console.error('FATAL eval:all script error:');
  console.error(err);
  process.exit(1);
});
