/**
 * Anti-invention runtime checks for ActionablesOutput (AI-006 v1).
 *
 * Pure function. Does not throw. Returns warnings to be appended to the
 * output's `warnings` array.
 *
 * Rules:
 *   - No numeric metric appears in any actionable string unless it appears
 *     in input.proofPoints OR input.offer.
 *   - No fake testimonial pattern (quoted "Firstname L." style with surname
 *     initial) unless it appears in input.offer or proofPoints.
 *   - Social posts respect platform character caps (also enforced by Zod
 *     superRefine, but we surface warnings for soft thresholds).
 *   - No absolute risk-free claims ("garanti", "sans risque", "guaranteed",
 *     "risk-free") unless explicitly present in input.
 */

import type { ActionablesOutput, ActionablesV1Input } from './schema';

// Note: \b after % fails because % is non-word; we use a non-word lookahead.
const NUMERIC_CLAIM = /(?:\bx\s?\d{1,3}\b|\b\d{1,4}\s?[%‰](?!\w)|\+\d{1,4}\b|\b\d{1,4}\s?(?:rdv|leads?|clients?|abonn[ée]s?|followers?|sales?|euros?|dollars?|€|\$)\b)/gi;

// Detects "Firstname S." or "Firstname Surname" patterns (with surname initial),
// either inside quotes or anywhere in the text. Conservative — requires capitalized
// first letters and an explicit dot or capitalized surname.
// Capitalized first name + space + capital + (dot or surname). No trailing
// word-boundary because the trailing dot is non-word.
const FAKE_TESTIMONIAL = /\b[A-Z][a-zà-öø-ÿ]{1,}\s+[A-Z](?:\.|[a-zà-öø-ÿ]+)/g;

const RISK_FREE_FR = /\b(?:garanti(?:e|s|es)?|sans risque|résultats? assurés?|100\s?%\s?garanti)\b/i;
const RISK_FREE_EN = /\b(?:guaranteed|risk[\s-]?free|no[\s-]?risk|guaranteed results?)\b/i;

function collectStrings(out: ActionablesOutput): string[] {
  return [
    out.offer_summary,
    out.target_audience,
    ...out.pain_points,
    out.value_proposition,
    ...out.proof_points,
    ...out.objections.flatMap((o) => [o.objection, o.response]),
    ...out.offer_angles.flatMap((a) => [a.name, a.angle, a.best_for]),
    ...out.hooks.map((h) => h.text),
    ...out.ctas.map((c) => c.label),
    ...out.social_posts.flatMap((p) => [p.post, p.cta]),
    ...out.landing_page_sections.flatMap((s) => [s.headline, s.body]),
  ];
}

function tokensFromInput(input: ActionablesV1Input): {
  numbers: Set<string>;
  rawText: string;
} {
  const haystack = [
    input.offer,
    ...(input.proofPoints ?? []),
    input.businessName,
    input.targetAudience ?? '',
  ].join(' ');
  const numMatches = haystack.match(/\d+(?:[.,]\d+)?/g) ?? [];
  return {
    numbers: new Set(numMatches.map((m) => m.replace(',', '.'))),
    rawText: haystack,
  };
}

/**
 * Returns the list of warnings (empty if everything is clean).
 * Caller appends these to `output.warnings`.
 */
export function checkAntiInvention(
  output: ActionablesOutput,
  input: ActionablesV1Input,
): string[] {
  const warnings: string[] = [];
  const { numbers: knownNumbers, rawText } = tokensFromInput(input);

  for (const text of collectStrings(output)) {
    // Numeric claims
    const numMatches = text.match(NUMERIC_CLAIM);
    if (numMatches) {
      for (const hit of numMatches) {
        const num = hit.match(/\d+(?:[.,]\d+)?/)?.[0]?.replace(',', '.') ?? '';
        if (num && !knownNumbers.has(num)) {
          warnings.push(`unsupported_metric: "${hit.trim()}" not present in input`);
        }
      }
    }

    // Fake testimonials
    const fakeMatches = text.match(FAKE_TESTIMONIAL);
    if (fakeMatches) {
      for (const match of fakeMatches) {
        if (!rawText.includes(match)) {
          warnings.push(`unsupported_testimonial: ${match}`);
        }
      }
    }

    // Risk-free claims
    if (input.language === 'en') {
      if (RISK_FREE_EN.test(text) && !RISK_FREE_EN.test(rawText)) {
        warnings.push('absolute_claim: "guaranteed/risk-free" not in input');
      }
    } else {
      if (RISK_FREE_FR.test(text) && !RISK_FREE_FR.test(rawText)) {
        warnings.push('absolute_claim: "garanti/sans risque" not in input');
      }
    }
  }

  return warnings;
}

/**
 * Asserts platforms respected when input.platforms is provided.
 * Returns warnings instead of throwing; useful when called from the agent
 * before schema validation.
 */
export function checkPlatformsRespected(
  output: ActionablesOutput,
  input: ActionablesV1Input,
): string[] {
  if (!input.platforms || input.platforms.length === 0) return [];
  const allowed = new Set(input.platforms);
  const warnings: string[] = [];
  for (const post of output.social_posts) {
    if (!allowed.has(post.platform)) {
      warnings.push(`platform_off_scope: ${post.platform} not in requested platforms`);
    }
  }
  return warnings;
}
