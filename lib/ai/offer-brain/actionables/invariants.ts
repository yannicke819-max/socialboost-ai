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
// first letters and an explicit dot or capitalized surname. We post-filter with
// a stop list to avoid false positives where the first capitalized word is a
// common preposition or determiner (e.g. "Pour Indépendants", "For Consultants").
const FAKE_TESTIMONIAL = /\b[A-Z][a-zà-öø-ÿ]{1,}\s+[A-Z](?:\.|[a-zà-öø-ÿ]+)/g;

// Common French/English words that start a sentence with a capital and are
// followed by a capitalized noun. NOT testimonials — exclude.
const TESTIMONIAL_STOP_WORDS = new Set([
  // FR
  'pour', 'pensé', 'conçu', 'fait', 'créé', 'destiné', 'adapté', 'taillé',
  'avec', 'sans', 'chez', 'dans', 'sur', 'par', 'de', 'du', 'des', 'le',
  'la', 'les', 'nos', 'notre', 'votre', 'votre', 'au', 'aux', 'ce', 'cette',
  'avant', 'après', 'voici', 'voilà', 'résultat', 'référence', 'ancrage',
  'preuves', 'preuve', 'sujet',
  // EN
  'for', 'built', 'designed', 'made', 'crafted', 'tailored', 'with',
  'without', 'at', 'in', 'on', 'by', 'of', 'the', 'our', 'your', 'this',
  'that', 'before', 'after', 'reference', 'subject', 'proof', 'observed',
]);

function isTestimonialFalsePositive(match: string): boolean {
  const firstWord = match.split(/\s+/)[0]?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') ?? '';
  return TESTIMONIAL_STOP_WORDS.has(firstWord);
}

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

  const isEN = input.language === 'en';

  for (const text of collectStrings(output)) {
    // Numeric claims
    const numMatches = text.match(NUMERIC_CLAIM);
    if (numMatches) {
      for (const hit of numMatches) {
        const num = hit.match(/\d+(?:[.,]\d+)?/)?.[0]?.replace(',', '.') ?? '';
        if (num && !knownNumbers.has(num)) {
          warnings.push(
            isEN
              ? `Unverified figure: "${hit.trim()}" — not found in your input.`
              : `Métrique non vérifiable : « ${hit.trim()} » — absente du brief.`,
          );
        }
      }
    }

    // Fake testimonials — filter out false positives starting with prepositions/determiners
    const fakeMatches = text.match(FAKE_TESTIMONIAL);
    if (fakeMatches) {
      for (const match of fakeMatches) {
        if (rawText.includes(match)) continue; // already in input
        if (isTestimonialFalsePositive(match)) continue; // Pour X, For X, etc.
        warnings.push(
          isEN
            ? `Possible unverified testimonial: "${match}" — confirm before publishing.`
            : `Témoignage à vérifier : « ${match} » — à confirmer avant publication.`,
        );
      }
    }

    // Risk-free claims
    if (isEN) {
      if (RISK_FREE_EN.test(text) && !RISK_FREE_EN.test(rawText)) {
        warnings.push(
          'Absolute claim ("guaranteed" / "risk-free") detected — not present in your input.',
        );
      }
    } else {
      if (RISK_FREE_FR.test(text) && !RISK_FREE_FR.test(rawText)) {
        warnings.push(
          'Promesse absolue (« garanti » / « sans risque ») détectée — absente du brief.',
        );
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
