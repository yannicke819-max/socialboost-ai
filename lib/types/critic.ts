// Critic QA — hybrid rubric (deterministic gates + LLM judge)

// Deterministic gates — run first, < 50ms, no LLM.

export type GateName =
  | 'length_within_bounds'
  | 'required_fields'
  | 'banned_words_absent'
  | 'forbidden_promises'
  | 'single_cta'
  | 'platform_constraints'
  | 'legal_safety';

export interface GateResult {
  gate: GateName;
  pass: boolean;
  failure?: { code: string; details: string };
}

// LLM Judge — structured rubric.
// Weights sum to 100. Threshold to pass: overall_score >= 75 AND blocking_issues empty.
// legal_safety has weight 0 but is binary blocking when score < 5.

export type Criterion =
  | 'hook_strength'         // 15
  | 'style_match'           // 15
  | 'business_potential'    // 14
  | 'audience_fit'          // 12
  | 'channel_fit'           // 12
  | 'cta_clarity'           // 10
  | 'originality'           // 8
  | 'no_bullshit'           // 8
  | 'offer_understanding'   // 6
  | 'legal_safety';         // blocking-only, weight 0

export const CRITIC_WEIGHTS: Record<Criterion, number> = {
  hook_strength: 15,
  style_match: 15,
  business_potential: 14,
  audience_fit: 12,
  channel_fit: 12,
  cta_clarity: 10,
  originality: 8,
  no_bullshit: 8,
  offer_understanding: 6,
  legal_safety: 0, // blocking-only
};

export const PASS_THRESHOLD = 75;

export type Score = 0 | 1 | 2 | 3 | 4 | 5;

export interface CriterionScore {
  criterion: Criterion;
  score: Score;
  reason: string;
  examples?: string[];
}

export type FixTarget = 'hook' | 'body' | 'cta' | 'hashtags' | 'visual';

export type FixPriority = 'must' | 'should' | 'nice-to-have';

export interface SuggestedFix {
  target: FixTarget;
  instruction: string;
  priority: FixPriority;
}

export interface CriticReport {
  id: string;
  asset_id: string;
  overall_score: number;             // 0-100
  passed: boolean;                   // overall_score >= PASS_THRESHOLD AND blocking_issues empty
  per_criterion: CriterionScore[];
  blocking_issues: string[];
  suggested_fixes: SuggestedFix[];
  judge_model: string;
  rubric_version: string;
  gates_results: GateResult[];
  created_at: string;
}
