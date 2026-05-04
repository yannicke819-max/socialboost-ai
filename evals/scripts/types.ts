/**
 * Eval harness — types.
 *
 * Pure type definitions for the deterministic eval engine.
 * No runtime code. Imported by runner.ts and entry scripts.
 */

import type { OfferBrainInput } from '../../lib/ai/offer-brain/schema';
import type { OfferBrief } from '../../lib/ai/offer-brain/schema';

// Schema version for the eval golden format itself (not the agent schema)
export const GOLDEN_SCHEMA_VERSION = '0.1.0';
export const RUNNER_VERSION = '0.1.0';
export const REPORT_FORMAT_VERSION = '0.1.0';

// -----------------------------------------------------------------------------
// Golden case
// -----------------------------------------------------------------------------

export type Locale = 'fr' | 'en' | 'es' | 'it' | 'de';
export type RiskLevel = 'low' | 'medium' | 'high';

/**
 * Score expectations — applied per-criterion, deterministic checks.
 * Numeric comparisons against the agent output's intelligence.* fields.
 */
export type ScoreField =
  | 'business_potential_score'
  | 'clarity_score'
  | 'differentiation_score'
  | 'proof_score'
  | 'audience_fit_score'
  | 'conversion_readiness_score'
  | 'confidence_score';

export interface GoldenExpectations {
  /** Expected min for each score (0-100). Failure if output score < min. */
  expected_min_scores?: Partial<Record<ScoreField, number>>;
  /** Expected max for each score (0-100). Failure if output score > max. */
  expected_max_scores?: Partial<Record<ScoreField, number>>;
  /**
   * Dot-paths into the OfferBrief that must be non-empty / present.
   * Example: 'identification.offer_name', 'audience.target_audience'.
   */
  required_fields?: string[];
  /**
   * Regex or exact substring patterns that must NOT appear anywhere in the
   * serialized output. Used to forbid invented ROI / guarantees.
   */
  forbidden_patterns?: string[];
  /** Categories that should appear in learning_signals.missing_data_categories. */
  expected_missing_information?: Array<
    'proof' | 'audience' | 'cta' | 'pricing' | 'objections' | 'positioning' | 'channel' | 'goal' | 'other'
  >;
  /** Hints for channels.best_channels — at least one must overlap. */
  expected_channel_hints?: Array<'linkedin' | 'instagram' | 'x' | 'tiktok' | 'facebook'>;
  /** Hints for desired_cta consistency check. If set, conversion.cta should contain this. */
  expected_cta_substring?: string;
  /** Forbidden offer types (e.g. should NOT classify as 'product' for a coaching). */
  forbidden_offer_types?: string[];
  /** Required offer_type. If set, identification.offer_type must equal this. */
  required_offer_type?: string;
}

export interface GoldenCase {
  id: string;
  title: string;
  language?: Locale;
  fixture_ref?: string;
  /** Risk profile of the case (low = simple, high = stress test). */
  risk_level: RiskLevel;
  /** Tags for filtering / categorization. */
  tags: string[];
  /** Free-form notes about what this case stresses. */
  notes?: string;
  /** Input payload for the agent (matches OfferBrainInputSchema). */
  input: OfferBrainInput;
  /** Deterministic expectations used by the runner. */
  expectations: GoldenExpectations;
  /** Legacy field from AI-001 — kept as documentation, not enforced. */
  must_pass?: string[];
  /** Legacy field from AI-001 — kept for reference. */
  rationale?: string;
  agent_min_version?: string;
  agent?: string;
}

// -----------------------------------------------------------------------------
// Check result (per-case)
// -----------------------------------------------------------------------------

export type CheckSeverity = 'failure' | 'warning' | 'info';

export interface CheckIssue {
  rule: string;
  severity: CheckSeverity;
  message: string;
  expected?: unknown;
  actual?: unknown;
}

export interface OutputSummary {
  offer_type: string;
  best_channels: string[];
  proof_quality: string;
  cta_strength: string;
  followup_count: number;
  improvement_priority: string;
  scores: Record<ScoreField, number>;
  missing_data_categories: string[];
  unsupported_claims_count: number;
  risky_claims_count: number;
}

export interface CaseResult {
  id: string;
  title: string;
  language?: Locale;
  risk_level: RiskLevel;
  pass: boolean;
  source: 'mock' | 'anthropic';
  duration_ms: number;
  agent_metadata?: {
    diagnostic_version: string;
    retries: number;
    model?: string;
  };
  output_summary?: OutputSummary;
  issues: CheckIssue[];
  /** Captured for learning loop / future memory writes (no DB write). */
  learning_signals?: OfferBrief['learning_signals'];
  unsupported_claims?: string[];
  risky_claims?: string[];
  /** Set if agent failed catastrophically (Zod fail, error). */
  fatal_error?: { code: string; message: string };
}

// -----------------------------------------------------------------------------
// Run / baseline / diff
// -----------------------------------------------------------------------------

export type RunMode = 'mock' | 'real';

export interface AggregateMetrics {
  total_cases: number;
  pass_count: number;
  fail_count: number;
  pass_rate: number; // 0-1
  total_failures: number;
  total_warnings: number;
  avg_duration_ms: number;
  failure_reasons_top: Array<{ rule: string; count: number }>;
  unsupported_claims_total: number;
  risky_claims_total: number;
  cases_with_critical_priority: number;
  improvement_priority_distribution: Record<'low' | 'medium' | 'high' | 'critical', number>;
  missing_data_categories_distribution: Record<string, number>;
}

export interface RunReport {
  agent: 'offer-brain';
  schema_version: string;
  prompt_version: string;
  runner_version: string;
  generated_at: string; // ISO timestamp
  mode: RunMode;
  total_cases: number;
  pass_count: number;
  fail_count: number;
  pass_rate: number;
  per_case_results: CaseResult[];
  aggregate_metrics: AggregateMetrics;
  known_limitations: string[];
}

export interface DiffResult {
  baseline_generated_at: string;
  current_generated_at: string;
  pass_rate_delta: number; // current - baseline
  newly_failing_case_ids: string[];
  newly_passing_case_ids: string[];
  changed_score_summary: Array<{
    case_id: string;
    field: ScoreField;
    before: number;
    after: number;
    delta: number;
  }>;
  new_warnings: Array<{ case_id: string; rule: string; message: string }>;
  improvement_priority_drift: Record<'low' | 'medium' | 'high' | 'critical', number>;
}

export interface CliFlags {
  baseline: boolean; // --baseline → write the baseline file
  diff: boolean; // --diff → compute diff vs baseline file
  silent: boolean; // --silent → suppress per-case console output
  failOnRegression: boolean; // --fail-on-regression → exit 1 if pass_rate dropped
}
