/**
 * Eval harness — deterministic runner for the Offer Brain agent.
 *
 * Reads golden cases, runs them via runOfferBrain (mock by default),
 * applies deterministic checks, and produces a structured report.
 *
 * Real model gating:
 *   - EVAL_USE_REAL_MODEL=true + ANTHROPIC_API_KEY → real call
 *   - Otherwise → mock (forceMock = true on the agent)
 *
 * No silent fallback: real-mode requested without an API key throws.
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { runOfferBrain } from '../../lib/ai/offer-brain/agent';
import { OfferBriefOutputSchema, type OfferBrief } from '../../lib/ai/offer-brain/schema';
import { isOfferBrainAgentError } from '../../lib/ai/offer-brain/errors';
import {
  GOLDEN_SCHEMA_VERSION,
  RUNNER_VERSION,
  REPORT_FORMAT_VERSION,
  type CaseResult,
  type CheckIssue,
  type CliFlags,
  type DiffResult,
  type GoldenCase,
  type OutputSummary,
  type RunMode,
  type RunReport,
  type ScoreField,
  type AggregateMetrics,
} from './types';

// -----------------------------------------------------------------------------
// Loaders
// -----------------------------------------------------------------------------

const REPO_ROOT = resolve(__dirname, '../..');
const GOLDEN_DIR = resolve(REPO_ROOT, 'evals/golden/offer-brain');
const RUNS_DIR = resolve(REPO_ROOT, 'evals/runs');
const BASELINE_PATH = resolve(REPO_ROOT, 'evals/baselines/offer-brain.baseline.json');

export function loadGoldens(dir: string = GOLDEN_DIR): GoldenCase[] {
  const files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
  return files.map((f) => {
    const raw = readFileSync(resolve(dir, f), 'utf-8');
    const parsed = JSON.parse(raw) as GoldenCase;
    return parsed;
  });
}

// -----------------------------------------------------------------------------
// Mode resolver — strict opt-in for real model
// -----------------------------------------------------------------------------

export function resolveRunMode(): { mode: RunMode; forceMock: boolean } {
  const wantsReal = process.env.EVAL_USE_REAL_MODEL === 'true';
  const hasKey =
    typeof process.env.ANTHROPIC_API_KEY === 'string' && process.env.ANTHROPIC_API_KEY.length > 0;
  if (wantsReal && hasKey) {
    // Real path requires the agent's own gate ALSO be open during this run.
    process.env.OFFER_BRAIN_USE_REAL_MODEL = 'true';
    return { mode: 'real', forceMock: false };
  }
  if (wantsReal && !hasKey) {
    throw new Error(
      'EVAL_USE_REAL_MODEL=true was set but ANTHROPIC_API_KEY is missing. Refusing to run silently in mock mode.',
    );
  }
  // Default → mock. Force agent to mock regardless of any pre-existing env.
  return { mode: 'mock', forceMock: true };
}

// -----------------------------------------------------------------------------
// Deterministic checks per case
// -----------------------------------------------------------------------------

/** Get a value at a dot path (e.g. 'identification.offer_name') from an object. */
function getPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function isNonEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length > 0;
  if (typeof value === 'number') return Number.isFinite(value);
  return true;
}

const SCORE_FIELDS: ScoreField[] = [
  'business_potential_score',
  'clarity_score',
  'differentiation_score',
  'proof_score',
  'audience_fit_score',
  'conversion_readiness_score',
  'confidence_score',
];

function buildOutputSummary(out: OfferBrief): OutputSummary {
  return {
    offer_type: out.identification.offer_type,
    best_channels: [...out.channels.best_channels],
    proof_quality: out.proofs.proof_quality,
    cta_strength: out.conversion.cta_strength,
    followup_count: out.missing.recommended_followup_questions.length,
    improvement_priority: out.learning_signals.improvement_priority,
    scores: {
      business_potential_score: out.intelligence.business_potential_score,
      clarity_score: out.intelligence.clarity_score,
      differentiation_score: out.intelligence.differentiation_score,
      proof_score: out.intelligence.proof_score,
      audience_fit_score: out.intelligence.audience_fit_score,
      conversion_readiness_score: out.intelligence.conversion_readiness_score,
      confidence_score: out.intelligence.confidence_score,
    },
    missing_data_categories: [...out.learning_signals.missing_data_categories],
    unsupported_claims_count: out.proofs.unsupported_claims.length,
    risky_claims_count: out.proofs.risky_claims_detected.length,
  };
}

export function applyChecks(out: OfferBrief, golden: GoldenCase): CheckIssue[] {
  const issues: CheckIssue[] = [];

  // 1. Schema invariants the runner can enforce on top of Zod superRefine
  if (out.missing.recommended_followup_questions.length > 3) {
    issues.push({
      rule: 'max_3_followup_questions',
      severity: 'failure',
      message: `recommended_followup_questions length = ${out.missing.recommended_followup_questions.length}, must be ≤ 3`,
      actual: out.missing.recommended_followup_questions.length,
      expected: 3,
    });
  }

  for (const sf of SCORE_FIELDS) {
    const v = out.intelligence[sf];
    if (v < 0 || v > 100 || !Number.isInteger(v)) {
      issues.push({
        rule: 'score_range',
        severity: 'failure',
        message: `${sf} = ${v}, must be integer 0-100`,
        actual: v,
      });
    }
  }

  // Cap rules from the brief — duplicate of schema superRefine, useful when
  // the runner is given an output that bypassed the schema (defensive).
  const noProofs = out.proofs.proof_points.length === 0;
  if (noProofs && out.intelligence.proof_score > 40) {
    issues.push({
      rule: 'cap_proof_score_when_no_proofs',
      severity: 'failure',
      message: `proof_score = ${out.intelligence.proof_score} but proof_points is empty (must be ≤ 40)`,
      actual: out.intelligence.proof_score,
      expected: '≤ 40',
    });
  }
  if (noProofs && out.intelligence.confidence_score > 70) {
    issues.push({
      rule: 'cap_confidence_when_no_proofs',
      severity: 'failure',
      message: `confidence_score = ${out.intelligence.confidence_score} but proof_points is empty (must be ≤ 70)`,
      actual: out.intelligence.confidence_score,
      expected: '≤ 70',
    });
  }
  const weakCTA = out.conversion.cta_strength === 'absent' || out.conversion.cta_strength === 'weak';
  if (weakCTA && out.intelligence.conversion_readiness_score > 70) {
    issues.push({
      rule: 'cap_conversion_when_cta_weak',
      severity: 'failure',
      message: `conversion_readiness_score = ${out.intelligence.conversion_readiness_score} but cta_strength = ${out.conversion.cta_strength} (must be ≤ 70)`,
      actual: out.intelligence.conversion_readiness_score,
      expected: '≤ 70',
    });
  }

  // 2. Versioning fields
  for (const versionField of ['diagnostic_version', 'prompt_version', 'schema_version'] as const) {
    if (!isNonEmpty(out[versionField])) {
      issues.push({
        rule: 'version_field_present',
        severity: 'failure',
        message: `${versionField} is empty`,
      });
    }
  }

  // 3. Learning signals + future_memory_writes presence
  if (!out.learning_signals) {
    issues.push({
      rule: 'learning_signals_present',
      severity: 'failure',
      message: 'learning_signals block is missing',
    });
  }
  if (!out.future_memory_writes) {
    issues.push({
      rule: 'future_memory_writes_present',
      severity: 'failure',
      message: 'future_memory_writes block is missing',
    });
  }

  // 4. Required fields per golden expectations
  const requiredFields = golden.expectations.required_fields ?? [];
  for (const path of requiredFields) {
    if (!isNonEmpty(getPath(out, path))) {
      issues.push({
        rule: 'required_field',
        severity: 'failure',
        message: `Required field "${path}" is empty or missing`,
        expected: path,
      });
    }
  }

  // 5. Score min/max expectations
  const minExp = golden.expectations.expected_min_scores ?? {};
  for (const [field, min] of Object.entries(minExp) as Array<[ScoreField, number]>) {
    const actual = out.intelligence[field];
    if (actual < min) {
      issues.push({
        rule: 'expected_min_score',
        severity: 'failure',
        message: `${field} = ${actual} < expected min ${min}`,
        expected: `≥ ${min}`,
        actual,
      });
    }
  }
  const maxExp = golden.expectations.expected_max_scores ?? {};
  for (const [field, max] of Object.entries(maxExp) as Array<[ScoreField, number]>) {
    const actual = out.intelligence[field];
    if (actual > max) {
      issues.push({
        rule: 'expected_max_score',
        severity: 'failure',
        message: `${field} = ${actual} > expected max ${max}`,
        expected: `≤ ${max}`,
        actual,
      });
    }
  }

  // 6. Forbidden patterns in serialized output
  const forbidden = golden.expectations.forbidden_patterns ?? [];
  if (forbidden.length > 0) {
    const serialized = JSON.stringify(out);
    for (const pat of forbidden) {
      let matched = false;
      try {
        const re = new RegExp(pat, 'i');
        matched = re.test(serialized);
      } catch {
        // Treat as literal substring if regex compile fails
        matched = serialized.toLowerCase().includes(pat.toLowerCase());
      }
      if (matched) {
        issues.push({
          rule: 'forbidden_pattern',
          severity: 'failure',
          message: `Forbidden pattern matched in output: "${pat}"`,
          expected: 'absent',
        });
      }
    }
  }

  // 7. Expected missing_information overlap
  const expMissing = golden.expectations.expected_missing_information ?? [];
  if (expMissing.length > 0) {
    const got = new Set(out.learning_signals.missing_data_categories);
    const missingFromOutput = expMissing.filter((cat) => !got.has(cat));
    if (missingFromOutput.length > 0) {
      issues.push({
        rule: 'expected_missing_information',
        severity: 'failure',
        message: `Expected missing_data_categories not flagged: ${missingFromOutput.join(', ')}`,
        expected: expMissing,
        actual: [...got],
      });
    }
  }

  // 8. Expected channel hints (overlap)
  const expChan = golden.expectations.expected_channel_hints ?? [];
  if (expChan.length > 0) {
    const got = new Set(out.channels.best_channels);
    const overlap = expChan.some((c) => got.has(c));
    if (!overlap) {
      issues.push({
        rule: 'expected_channel_hints',
        severity: 'failure',
        message: `best_channels [${[...got].join(',')}] does not overlap with expected hints [${expChan.join(',')}]`,
        expected: expChan,
        actual: [...got],
      });
    }
  }

  // 9. CTA substring consistency
  if (golden.expectations.expected_cta_substring) {
    const sub = golden.expectations.expected_cta_substring.toLowerCase();
    if (!out.conversion.cta.toLowerCase().includes(sub)) {
      issues.push({
        rule: 'cta_substring',
        severity: 'failure',
        message: `conversion.cta "${out.conversion.cta}" does not contain expected substring "${sub}"`,
        expected: sub,
        actual: out.conversion.cta,
      });
    }
  }

  // 10. Required offer_type
  if (golden.expectations.required_offer_type) {
    if (out.identification.offer_type !== golden.expectations.required_offer_type) {
      issues.push({
        rule: 'required_offer_type',
        severity: 'failure',
        message: `offer_type = "${out.identification.offer_type}", expected "${golden.expectations.required_offer_type}"`,
        expected: golden.expectations.required_offer_type,
        actual: out.identification.offer_type,
      });
    }
  }

  // 11. Forbidden offer_types
  for (const forbiddenType of golden.expectations.forbidden_offer_types ?? []) {
    if (out.identification.offer_type === forbiddenType) {
      issues.push({
        rule: 'forbidden_offer_type',
        severity: 'failure',
        message: `offer_type = "${out.identification.offer_type}" is in forbidden list`,
        expected: `≠ ${forbiddenType}`,
        actual: out.identification.offer_type,
      });
    }
  }

  return issues;
}

// -----------------------------------------------------------------------------
// Run
// -----------------------------------------------------------------------------

export async function runCase(golden: GoldenCase, forceMock: boolean): Promise<CaseResult> {
  const start = Date.now();
  try {
    const r = await runOfferBrain(golden.input, { forceMock });

    // Defensive re-validation against the schema (mock does it too, but we
    // want the runner to be self-contained when reading from external sources).
    const parsed = OfferBriefOutputSchema.safeParse(r.output);
    const issues: CheckIssue[] = [];
    if (!parsed.success) {
      issues.push({
        rule: 'output_schema_valid',
        severity: 'failure',
        message: `Output failed Zod schema validation: ${JSON.stringify(parsed.error.flatten())}`,
      });
      return {
        id: golden.id,
        title: golden.title,
        language: golden.language,
        risk_level: golden.risk_level,
        pass: false,
        source: r.metadata.source,
        duration_ms: Date.now() - start,
        agent_metadata: {
          diagnostic_version: r.metadata.diagnostic_version,
          retries: r.metadata.retries,
          model: r.metadata.model,
        },
        issues,
      };
    }

    const out = parsed.data;
    const checkIssues = applyChecks(out, golden);
    issues.push(...checkIssues);

    const failures = issues.filter((i) => i.severity === 'failure');

    return {
      id: golden.id,
      title: golden.title,
      language: golden.language,
      risk_level: golden.risk_level,
      pass: failures.length === 0,
      source: r.metadata.source,
      duration_ms: Date.now() - start,
      agent_metadata: {
        diagnostic_version: r.metadata.diagnostic_version,
        retries: r.metadata.retries,
        model: r.metadata.model,
      },
      output_summary: buildOutputSummary(out),
      issues,
      learning_signals: out.learning_signals,
      unsupported_claims: out.proofs.unsupported_claims,
      risky_claims: out.proofs.risky_claims_detected,
    };
  } catch (err) {
    const durationMs = Date.now() - start;
    if (isOfferBrainAgentError(err)) {
      return {
        id: golden.id,
        title: golden.title,
        language: golden.language,
        risk_level: golden.risk_level,
        pass: false,
        source: 'mock',
        duration_ms: durationMs,
        issues: [],
        fatal_error: { code: err.code, message: err.message },
      };
    }
    return {
      id: golden.id,
      title: golden.title,
      language: golden.language,
      risk_level: golden.risk_level,
      pass: false,
      source: 'mock',
      duration_ms: durationMs,
      issues: [],
      fatal_error: {
        code: 'unexpected_error',
        message: err instanceof Error ? err.message : String(err),
      },
    };
  }
}

// -----------------------------------------------------------------------------
// Aggregate
// -----------------------------------------------------------------------------

function computeAggregate(results: CaseResult[]): AggregateMetrics {
  const total = results.length;
  const pass = results.filter((r) => r.pass).length;
  const fail = total - pass;
  const totalFailures = results.reduce(
    (acc, r) => acc + r.issues.filter((i) => i.severity === 'failure').length,
    0,
  );
  const totalWarnings = results.reduce(
    (acc, r) => acc + r.issues.filter((i) => i.severity === 'warning').length,
    0,
  );
  const avgDuration = total > 0 ? results.reduce((acc, r) => acc + r.duration_ms, 0) / total : 0;

  const ruleCounts: Record<string, number> = {};
  for (const r of results) {
    for (const i of r.issues.filter((x) => x.severity === 'failure')) {
      ruleCounts[i.rule] = (ruleCounts[i.rule] ?? 0) + 1;
    }
    if (r.fatal_error) {
      ruleCounts[`fatal:${r.fatal_error.code}`] =
        (ruleCounts[`fatal:${r.fatal_error.code}`] ?? 0) + 1;
    }
  }
  const failureReasonsTop = Object.entries(ruleCounts)
    .map(([rule, count]) => ({ rule, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const priorityDist = { low: 0, medium: 0, high: 0, critical: 0 };
  const missingDist: Record<string, number> = {};
  let unsupportedTotal = 0;
  let riskyTotal = 0;
  let criticalCount = 0;

  for (const r of results) {
    if (r.learning_signals) {
      priorityDist[r.learning_signals.improvement_priority] += 1;
      if (r.learning_signals.improvement_priority === 'critical') criticalCount += 1;
      for (const cat of r.learning_signals.missing_data_categories) {
        missingDist[cat] = (missingDist[cat] ?? 0) + 1;
      }
    }
    unsupportedTotal += r.unsupported_claims?.length ?? 0;
    riskyTotal += r.risky_claims?.length ?? 0;
  }

  return {
    total_cases: total,
    pass_count: pass,
    fail_count: fail,
    pass_rate: total > 0 ? pass / total : 0,
    total_failures: totalFailures,
    total_warnings: totalWarnings,
    avg_duration_ms: Math.round(avgDuration),
    failure_reasons_top: failureReasonsTop,
    unsupported_claims_total: unsupportedTotal,
    risky_claims_total: riskyTotal,
    cases_with_critical_priority: criticalCount,
    improvement_priority_distribution: priorityDist,
    missing_data_categories_distribution: missingDist,
  };
}

// -----------------------------------------------------------------------------
// Console report
// -----------------------------------------------------------------------------

function fmt(num: number): string {
  return Number.isInteger(num) ? String(num) : num.toFixed(2);
}

export function printReport(report: RunReport, opts: { silent?: boolean } = {}): void {
  if (opts.silent) return;
  const head = `\n# Offer Brain eval — runner v${report.runner_version} · mode ${report.mode} · ${report.generated_at}`;
  console.log(head);
  console.log(
    `  total ${report.total_cases} · pass ${report.pass_count} · fail ${report.fail_count} · pass_rate ${fmt(report.pass_rate * 100)}%`,
  );
  console.log('');

  for (const r of report.per_case_results) {
    const flag = r.pass ? '✓' : '✗';
    const time = `${r.duration_ms}ms`;
    console.log(`${flag} ${r.id} [${r.source}, ${time}] — ${r.title}`);
    if (r.fatal_error) {
      console.log(`    fatal: ${r.fatal_error.code} — ${r.fatal_error.message}`);
      continue;
    }
    if (r.output_summary) {
      const s = r.output_summary;
      console.log(
        `    offer=${s.offer_type} · channels=[${s.best_channels.join(',')}] · cta=${s.cta_strength} · proof=${s.proof_quality} · followups=${s.followup_count} · prio=${s.improvement_priority}`,
      );
      const sc = s.scores;
      console.log(
        `    scores: bp=${sc.business_potential_score} cl=${sc.clarity_score} di=${sc.differentiation_score} pr=${sc.proof_score} af=${sc.audience_fit_score} cv=${sc.conversion_readiness_score} co=${sc.confidence_score}`,
      );
    }
    for (const i of r.issues) {
      const tag = i.severity === 'failure' ? '✗' : i.severity === 'warning' ? '!' : '·';
      console.log(`    ${tag} [${i.rule}] ${i.message}`);
    }
  }

  console.log('\n## Aggregate');
  const a = report.aggregate_metrics;
  console.log(
    `  failures total: ${a.total_failures} · warnings: ${a.total_warnings} · avg duration: ${a.avg_duration_ms}ms`,
  );
  console.log(
    `  improvement priority: low=${a.improvement_priority_distribution.low} med=${a.improvement_priority_distribution.medium} high=${a.improvement_priority_distribution.high} crit=${a.improvement_priority_distribution.critical}`,
  );
  console.log(`  missing_data_categories: ${JSON.stringify(a.missing_data_categories_distribution)}`);
  console.log(
    `  unsupported_claims=${a.unsupported_claims_total} · risky_claims=${a.risky_claims_total}`,
  );
  if (a.failure_reasons_top.length > 0) {
    console.log('  top failure reasons:');
    for (const r of a.failure_reasons_top) {
      console.log(`    · ${r.rule} (${r.count})`);
    }
  }
}

// -----------------------------------------------------------------------------
// Diff vs baseline
// -----------------------------------------------------------------------------

export function computeDiff(baseline: RunReport, current: RunReport): DiffResult {
  const baseById = new Map(baseline.per_case_results.map((c) => [c.id, c]));
  const curById = new Map(current.per_case_results.map((c) => [c.id, c]));

  const newlyFailing: string[] = [];
  const newlyPassing: string[] = [];
  const changedScores: DiffResult['changed_score_summary'] = [];
  const newWarnings: DiffResult['new_warnings'] = [];

  for (const cur of current.per_case_results) {
    const base = baseById.get(cur.id);
    if (!base) {
      // New case introduced — track as newly passing/failing depending on result
      if (cur.pass) newlyPassing.push(cur.id);
      else newlyFailing.push(cur.id);
      continue;
    }
    if (base.pass && !cur.pass) newlyFailing.push(cur.id);
    if (!base.pass && cur.pass) newlyPassing.push(cur.id);

    if (base.output_summary && cur.output_summary) {
      for (const sf of SCORE_FIELDS) {
        const before = base.output_summary.scores[sf];
        const after = cur.output_summary.scores[sf];
        if (before !== after) {
          changedScores.push({
            case_id: cur.id,
            field: sf,
            before,
            after,
            delta: after - before,
          });
        }
      }
    }

    const baseRules = new Set(base.issues.filter((i) => i.severity === 'warning').map((i) => i.rule));
    for (const i of cur.issues.filter((x) => x.severity === 'warning')) {
      if (!baseRules.has(i.rule)) {
        newWarnings.push({ case_id: cur.id, rule: i.rule, message: i.message });
      }
    }
  }

  // Cases removed from current run vs baseline
  for (const baseCase of baseline.per_case_results) {
    if (!curById.has(baseCase.id)) {
      // Treat as no-op for delta — listed as info via console
    }
  }

  return {
    baseline_generated_at: baseline.generated_at,
    current_generated_at: current.generated_at,
    pass_rate_delta: current.pass_rate - baseline.pass_rate,
    newly_failing_case_ids: newlyFailing,
    newly_passing_case_ids: newlyPassing,
    changed_score_summary: changedScores,
    new_warnings: newWarnings,
    improvement_priority_drift: {
      low:
        current.aggregate_metrics.improvement_priority_distribution.low -
        baseline.aggregate_metrics.improvement_priority_distribution.low,
      medium:
        current.aggregate_metrics.improvement_priority_distribution.medium -
        baseline.aggregate_metrics.improvement_priority_distribution.medium,
      high:
        current.aggregate_metrics.improvement_priority_distribution.high -
        baseline.aggregate_metrics.improvement_priority_distribution.high,
      critical:
        current.aggregate_metrics.improvement_priority_distribution.critical -
        baseline.aggregate_metrics.improvement_priority_distribution.critical,
    },
  };
}

export function printDiff(diff: DiffResult): void {
  console.log('\n## Diff vs baseline');
  console.log(`  baseline: ${diff.baseline_generated_at}`);
  console.log(`  current : ${diff.current_generated_at}`);
  console.log(`  pass_rate delta: ${(diff.pass_rate_delta * 100).toFixed(2)}pt`);
  if (diff.newly_failing_case_ids.length > 0) {
    console.log(`  newly failing (${diff.newly_failing_case_ids.length}):`);
    for (const id of diff.newly_failing_case_ids) console.log(`    ✗ ${id}`);
  }
  if (diff.newly_passing_case_ids.length > 0) {
    console.log(`  newly passing (${diff.newly_passing_case_ids.length}):`);
    for (const id of diff.newly_passing_case_ids) console.log(`    ✓ ${id}`);
  }
  if (diff.changed_score_summary.length > 0) {
    console.log(`  score changes (${diff.changed_score_summary.length}):`);
    for (const c of diff.changed_score_summary) {
      console.log(`    · ${c.case_id} :: ${c.field} ${c.before} → ${c.after} (${c.delta >= 0 ? '+' : ''}${c.delta})`);
    }
  }
  if (diff.new_warnings.length > 0) {
    console.log(`  new warnings (${diff.new_warnings.length}):`);
    for (const w of diff.new_warnings) console.log(`    ! ${w.case_id} :: [${w.rule}] ${w.message}`);
  }
  const dr = diff.improvement_priority_drift;
  console.log(
    `  improvement priority drift: low=${dr.low >= 0 ? '+' : ''}${dr.low} med=${dr.medium >= 0 ? '+' : ''}${dr.medium} high=${dr.high >= 0 ? '+' : ''}${dr.high} crit=${dr.critical >= 0 ? '+' : ''}${dr.critical}`,
  );
}

// -----------------------------------------------------------------------------
// Persist
// -----------------------------------------------------------------------------

function ensureDir(path: string): void {
  const d = dirname(path);
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

export function writeRunFile(report: RunReport): string {
  const path = resolve(RUNS_DIR, `offer-brain-${timestamp()}.json`);
  ensureDir(path);
  writeFileSync(path, JSON.stringify(report, null, 2));
  return path;
}

export function writeBaselineFile(report: RunReport): string {
  if (report.mode !== 'mock') {
    throw new Error('Refusing to write baseline from non-mock run. Baselines must be deterministic.');
  }
  ensureDir(BASELINE_PATH);
  writeFileSync(BASELINE_PATH, JSON.stringify(report, null, 2));
  return BASELINE_PATH;
}

export function readBaselineFile(): RunReport | null {
  if (!existsSync(BASELINE_PATH)) return null;
  try {
    return JSON.parse(readFileSync(BASELINE_PATH, 'utf-8')) as RunReport;
  } catch {
    return null;
  }
}

// -----------------------------------------------------------------------------
// CLI flag parser
// -----------------------------------------------------------------------------

export function parseFlags(argv: string[]): CliFlags {
  return {
    baseline: argv.includes('--baseline'),
    diff: argv.includes('--diff'),
    silent: argv.includes('--silent'),
    failOnRegression: argv.includes('--fail-on-regression'),
  };
}

// -----------------------------------------------------------------------------
// Main entry — used by per-agent scripts
// -----------------------------------------------------------------------------

import { DIAGNOSTIC_VERSION, PROMPT_VERSION, SCHEMA_VERSION } from '../../lib/ai/offer-brain/schema';

export const KNOWN_LIMITATIONS = [
  'Mock-mode only in CI — real model run requires EVAL_USE_REAL_MODEL=true and a key.',
  'No semantic / embedding-based checks (deterministic only).',
  'No LLM-judge.',
  'No persistence beyond evals/runs/ JSON files (locally) and evals/baselines/ JSON (committed).',
  'Forbidden patterns are regex/substring only — false positives/negatives possible on rare phrasings.',
  'Score caps duplicate the agent schema superRefine rules — defensive, may disagree if mock drift.',
  `Baseline is mock-only (CI policy). Real-mode runs are local + manual.`,
  `Golden schema version: ${GOLDEN_SCHEMA_VERSION}.`,
];

export async function runOfferBrainEval(flags: CliFlags = parseFlags(process.argv)): Promise<{
  report: RunReport;
  diff?: DiffResult;
  exitCode: number;
}> {
  const { mode, forceMock } = resolveRunMode();
  const goldens = loadGoldens();

  const results: CaseResult[] = [];
  for (const g of goldens) {
    const r = await runCase(g, forceMock);
    results.push(r);
  }

  const aggregate = computeAggregate(results);
  const report: RunReport = {
    agent: 'offer-brain',
    schema_version: SCHEMA_VERSION,
    prompt_version: PROMPT_VERSION,
    runner_version: RUNNER_VERSION,
    generated_at: new Date().toISOString(),
    mode,
    total_cases: aggregate.total_cases,
    pass_count: aggregate.pass_count,
    fail_count: aggregate.fail_count,
    pass_rate: aggregate.pass_rate,
    per_case_results: results,
    aggregate_metrics: aggregate,
    known_limitations: [...KNOWN_LIMITATIONS, `Diagnostic version: ${DIAGNOSTIC_VERSION}.`, `Report format: ${REPORT_FORMAT_VERSION}.`],
  };

  printReport(report, { silent: flags.silent });

  let diff: DiffResult | undefined;
  if (flags.diff) {
    const baseline = readBaselineFile();
    if (!baseline) {
      console.log('\n## Diff vs baseline\n  ! no baseline file at evals/baselines/offer-brain.baseline.json — skipping diff.');
    } else {
      diff = computeDiff(baseline, report);
      if (!flags.silent) printDiff(diff);
    }
  }

  if (flags.baseline) {
    const path = writeBaselineFile(report);
    if (!flags.silent) console.log(`\n  baseline written: ${path}`);
  } else {
    const path = writeRunFile(report);
    if (!flags.silent) console.log(`\n  run written: ${path}`);
  }

  // Exit code policy:
  //   - JSON parse / fatal script error → bubble up via thrown error (exit 1)
  //   - Per-case failures → exit 0 by default (warning-only mode)
  //   - --fail-on-regression + diff regression → exit 1
  let exitCode = 0;
  if (flags.failOnRegression && diff) {
    if (diff.newly_failing_case_ids.length > 0 || diff.pass_rate_delta < 0) {
      exitCode = 1;
    }
  }
  return { report, diff, exitCode };
}
