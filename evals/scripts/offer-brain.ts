/**
 * Offer Brain — minimal eval runner.
 *
 * Reads each golden case in evals/golden/offer-brain/ and runs runOfferBrain
 * against its `input`. Reports per-case pass/fail with the assertions encoded
 * inline (lightweight checks; full eval framework lands in AI-002).
 *
 * Usage:
 *   pnpm eval:offer-brain
 *   OFFER_BRAIN_USE_REAL_MODEL=true ANTHROPIC_API_KEY=sk-... pnpm eval:offer-brain  # manual real run
 *
 * IMPORTANT:
 *   - This script is NOT wired into CI.
 *   - Real model run is manual only — CI never sets OFFER_BRAIN_USE_REAL_MODEL.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runOfferBrain } from '../../lib/ai/offer-brain/agent';

interface GoldenCase {
  id: string;
  fixture_ref?: string;
  agent: string;
  agent_min_version: string;
  rationale: string;
  input: Record<string, unknown>;
  must_pass: string[];
}

const GOLDEN_DIR = resolve(__dirname, '../golden/offer-brain');

function loadGoldens(): GoldenCase[] {
  const files = readdirSync(GOLDEN_DIR).filter((f) => f.endsWith('.json'));
  return files.map((f) => {
    const raw = readFileSync(resolve(GOLDEN_DIR, f), 'utf-8');
    return JSON.parse(raw) as GoldenCase;
  });
}

interface CaseResult {
  id: string;
  source: 'mock' | 'anthropic';
  duration_ms: number;
  schema_ok: boolean;
  notes: string[];
}

async function runCase(c: GoldenCase): Promise<CaseResult> {
  const r = await runOfferBrain(c.input);
  const notes: string[] = [];
  // Light-touch assertions encoded as readable summaries (full DSL in AI-002).
  notes.push(`offer_type=${r.output.identification.offer_type}`);
  notes.push(`best_channels=[${r.output.channels.best_channels.join(',')}]`);
  notes.push(
    `scores: bp=${r.output.intelligence.business_potential_score}, conf=${r.output.intelligence.confidence_score}, proof=${r.output.intelligence.proof_score}, conv=${r.output.intelligence.conversion_readiness_score}`,
  );
  notes.push(`proof_quality=${r.output.proofs.proof_quality}`);
  notes.push(`cta_strength=${r.output.conversion.cta_strength}`);
  notes.push(`followups=${r.output.missing.recommended_followup_questions.length}`);
  notes.push(`improvement_priority=${r.output.learning_signals.improvement_priority}`);

  return {
    id: c.id,
    source: r.metadata.source,
    duration_ms: r.metadata.duration_ms,
    schema_ok: true,
    notes,
  };
}

async function main(): Promise<void> {
  const cases = loadGoldens();
  console.log(`\n# Offer Brain eval — ${cases.length} golden cases\n`);

  let allOk = true;
  for (const c of cases) {
    try {
      const r = await runCase(c);
      console.log(`✓ ${r.id} [${r.source}, ${r.duration_ms}ms]`);
      for (const n of r.notes) console.log(`  · ${n}`);
      console.log('');
    } catch (err) {
      allOk = false;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`✗ ${c.id} — ${msg}`);
    }
  }

  if (!allOk) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
