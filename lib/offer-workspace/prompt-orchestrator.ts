/**
 * Prompt Orchestrator (AI-015) — pure engine, no I/O.
 *
 * Purpose:
 *   SocialBoost differentiates by knowing how to build expert marketing
 *   prompts on the user's behalf. This module produces structured
 *   `PromptVersion` objects that a real provider (Anthropic / OpenAI /
 *   Mistral / etc.) could consume in a future AI-016 sprint, but no
 *   provider call happens here.
 *
 * Hard rules (non-negotiable):
 *   - Pure: no `fetch`, no `Date.now()` for output, no provider SDK.
 *   - Deterministic: same inputs → identical PromptVersion.
 *   - Public language follows `offer.brief.language` (matches AI-013
 *     hardening). The chrome-level `language` argument is a fallback only.
 *   - Forbidden phrases NEVER appear in any system/user prompt or
 *     guardrail / quality-checklist line: "viral garanti", "revenus
 *     garantis", "succès garanti", "résultat garanti" / their EN
 *     equivalents. Tests pin this invariant.
 *   - The human always reviews before publishing. Surfaces in every
 *     prompt's guardrails.
 */

import type { AdUnit, Asset, Offer } from './types';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export const PROMPT_TASKS = [
  'offer_diagnosis',
  'angle_discovery',
  'post_ideas',
  'ad_generation',
  'ad_critique',
  'ad_improvement',
  'weekly_plan',
  'user_advice',
  'external_inspiration_analysis',
] as const;
export type PromptTask = (typeof PROMPT_TASKS)[number];

// -----------------------------------------------------------------------------
// External Inspiration Intelligence (AI-015 addendum)
// -----------------------------------------------------------------------------

export const EXTERNAL_INSPIRATION_PLATFORMS = [
  'linkedin',
  'instagram',
  'tiktok',
  'facebook',
  'youtube',
  'email',
  'landing',
  'other',
] as const;
export type ExternalInspirationPlatform =
  (typeof EXTERNAL_INSPIRATION_PLATFORMS)[number];

export const EXTERNAL_INSPIRATION_SOURCE_TYPES = [
  'organic_post',
  'paid_ad',
  'video_script',
  'carousel',
  'email',
  'landing_section',
  'other',
] as const;
export type ExternalInspirationSourceType =
  (typeof EXTERNAL_INSPIRATION_SOURCE_TYPES)[number];

/**
 * One pasted external example that seems to perform well in the user's
 * market. The engine NEVER asks a provider to reproduce it — it asks for
 * abstract patterns + an original adaptation. The `doNotCopy: true` flag is
 * a deliberate type-level reminder for any future caller.
 */
export interface ExternalInspirationInput {
  sourcePlatform: ExternalInspirationPlatform;
  sourceType: ExternalInspirationSourceType;
  /** Pasted text, truncated to a safe length when surfaced in the prompt. */
  pastedText?: string;
  /** Public URL pointer; never fetched. Display-only context. */
  publicUrl?: string;
  /**
   * User-declared performance hints (NOT proof). Examples:
   *   "lots of comments", "running for 3 months", "leader endorsed it",
   *   "TikTok trend", "format recurring across 4 competitors".
   */
  observedSignals?: string[];
  userNotes?: string;
  language: 'fr' | 'en';
  /** Free text market context, e.g. "B2B SaaS France". */
  market?: string;
  /** Required hard flag — pinned at type level. */
  doNotCopy: true;
}

/**
 * Abstract pattern extracted by the model from one or more inspirations.
 * NEVER carries the verbatim source. Stored as the model's structured output
 * for downstream prompts.
 */
export interface InspirationPattern {
  patternName: string;
  platform: string;
  format: string;
  hookMechanic: string;
  emotionalTrigger: string;
  promiseType: string;
  proofType: string;
  objectionHandled: string;
  engagementMechanic: string;
  whyItMayWork: string;
  risks: string;
  howToAdaptForOffer: string;
  originalityGuidance: string;
}

export const PROMPT_CHANNELS = [
  'linkedin',
  'instagram',
  'tiktok',
  'facebook',
  'email',
  'landing',
] as const;
export type PromptChannel = (typeof PROMPT_CHANNELS)[number];

export const PROMPT_OUTPUT_FORMATS = [
  'json',
  'markdown',
  'short_copy',
  'campaign_pack',
] as const;
export type PromptOutputFormat = (typeof PROMPT_OUTPUT_FORMATS)[number];

/**
 * The orchestrator-version stamp lets a future AI-016 wire a provider
 * call only against a known-compatible prompt shape.
 */
export const ORCHESTRATOR_VERSION = '1.0.0';

/**
 * Deterministic mock timestamp. We do NOT call `new Date()` here — the
 * orchestrator must be byte-identical across calls for testability and
 * for clean storage diffs if a future caller persists a PromptVersion.
 */
const MOCK_CREATED_AT = '2026-05-04T00:00:00Z';

export interface PromptVersion {
  id: string;
  task: PromptTask;
  /** Engine version. Bumped when the prompt shape itself evolves. */
  version: string;
  language: 'fr' | 'en';
  channel?: PromptChannel;
  systemPrompt: string;
  userPrompt: string;
  expectedOutput: string;
  outputFormat: PromptOutputFormat;
  guardrails: string[];
  qualityChecklist: string[];
  createdAtMock: string;
}

export interface BuildExpertPromptInput {
  offer: Offer;
  task: PromptTask;
  channel?: PromptChannel;
  selectedAssets?: Asset[];
  adUnit?: AdUnit;
  /** Falls back to `offer.brief.language` then `'fr'`. */
  language?: 'fr' | 'en';
  /** Display tone label. Falls back to `offer.brief.tone`. */
  tone?: string;
  /** Business goal in plain words ("more leads", "better trust"...). */
  goal?: string;
  /** Optional hard constraints to inject in the user prompt. */
  constraints?: string[];
  /**
   * AI-015 addendum: external inspirations to learn from. The engine
   * surfaces them in the user prompt and forbids the model from copying
   * the source text. Used by `external_inspiration_analysis` and
   * referenced by `angle_discovery` / `ad_generation` when present.
   */
  inspirations?: ExternalInspirationInput[];
}

// -----------------------------------------------------------------------------
// Forbidden phrases (mirrored in tests)
// -----------------------------------------------------------------------------

export const FORBIDDEN_PHRASES = [
  'viral garanti',
  'résultat garanti',
  'résultats garantis',
  'revenus garantis',
  'revenu garanti',
  'succès garanti',
  'guaranteed virality',
  'guaranteed results',
  'guaranteed revenue',
  'guaranteed success',
];

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function resolveLanguage(input: BuildExpertPromptInput): 'fr' | 'en' {
  // Match AI-013 hardening: offer.brief.language is the source of truth;
  // the chrome-level `language` arg is only a fallback when the brief is
  // silent.
  const fromBrief = (input.offer.brief as { language?: unknown }).language;
  if (fromBrief === 'fr' || fromBrief === 'en') return fromBrief;
  if (input.offer.language === 'fr' || input.offer.language === 'en') return input.offer.language;
  const fromInput = input.language;
  if (fromInput === 'fr' || fromInput === 'en') return fromInput;
  return 'fr';
}

function safeString(s: string | undefined | null): string {
  if (!s) return '';
  return s.trim();
}

function joinList(items: string[], language: 'fr' | 'en'): string {
  if (items.length === 0) return language === 'en' ? '— (none provided)' : '— (aucune fournie)';
  return items.map((it) => `- ${it}`).join('\n');
}

function defaultTone(input: BuildExpertPromptInput): string {
  return safeString(input.tone) || safeString(input.offer.brief.tone) || 'professional';
}

function brandLine(offer: Offer, language: 'fr' | 'en'): string {
  const name = safeString(offer.brief.businessName) || safeString(offer.name);
  return language === 'en'
    ? `Brand: ${name || 'an offer with no business name yet'}`
    : `Marque : ${name || 'une offre sans nom commercial pour l\'instant'}`;
}

function audienceLine(offer: Offer, language: 'fr' | 'en'): string {
  const t = safeString(offer.brief.targetAudience);
  return language === 'en'
    ? `Audience: ${t || 'not specified yet — keep it concrete in the output.'}`
    : `Audience : ${t || 'non précisée — garde un ton concret en sortie.'}`;
}

function offerSummaryLine(offer: Offer, language: 'fr' | 'en'): string {
  const t = safeString(offer.brief.offer);
  return language === 'en'
    ? `Offer: ${t || 'not specified.'}`
    : `Offre : ${t || 'non précisée.'}`;
}

function proofsBlock(offer: Offer, language: 'fr' | 'en'): string {
  const proofs = offer.brief.proofPoints ?? [];
  const heading = language === 'en' ? 'Proof points (REUSE VERBATIM)' : 'Preuves (RÉUTILISE VERBATIM)';
  return `${heading}:\n${joinList(proofs, language)}`;
}

function constraintsBlock(input: BuildExpertPromptInput, language: 'fr' | 'en'): string {
  const all = input.constraints ?? [];
  const heading = language === 'en' ? 'Hard constraints' : 'Contraintes';
  return `${heading}:\n${joinList(all, language)}`;
}

function channelLine(channel: PromptChannel | undefined, language: 'fr' | 'en'): string {
  if (!channel) {
    return language === 'en' ? 'Target channel: any (engine will pick).' : 'Canal cible : libre (le moteur choisit).';
  }
  return language === 'en' ? `Target channel: ${channel}` : `Canal cible : ${channel}`;
}

/** Truncate pasted external content to a safe length for prompt-budget hygiene. */
function safeTruncate(s: string, maxChars: number): string {
  const t = (s ?? '').trim();
  if (t.length <= maxChars) return t;
  return `${t.slice(0, maxChars - 1)}…`;
}

/**
 * Surface external inspirations in the user prompt with explicit "DO NOT
 * COPY" framing and observed-signals disclaimer. Pasted text is truncated.
 * If the array is empty, returns an empty string so the caller can decide
 * whether to skip the section.
 */
function inspirationsBlock(
  inspirations: ExternalInspirationInput[] | undefined,
  language: 'fr' | 'en',
): string {
  if (!inspirations || inspirations.length === 0) return '';
  const heading = language === 'en'
    ? 'External inspirations (DO NOT COPY — analyse the mechanics, then create an original adaptation)'
    : 'Inspirations externes (NE COPIE PAS — analyse les mécaniques, puis crée une adaptation originale)';
  const blocks = inspirations.map((it, i) => {
    const lines: string[] = [];
    lines.push(`#${i + 1} · ${it.sourcePlatform} · ${it.sourceType}`);
    if (it.market) {
      lines.push(language === 'en' ? `  market: ${it.market}` : `  marché : ${it.market}`);
    }
    if (it.publicUrl) {
      lines.push(language === 'en' ? `  url: ${it.publicUrl}` : `  url : ${it.publicUrl}`);
    }
    if (it.observedSignals && it.observedSignals.length > 0) {
      const sigHead = language === 'en'
        ? '  observed signals (declarative hints, NOT proof):'
        : '  signaux observés (indices déclaratifs, PAS preuve) :';
      lines.push(sigHead);
      for (const s of it.observedSignals) lines.push(`    - ${s}`);
    }
    if (it.userNotes && it.userNotes.trim().length > 0) {
      lines.push(language === 'en'
        ? `  user notes: ${safeTruncate(it.userNotes, 240)}`
        : `  notes utilisateur : ${safeTruncate(it.userNotes, 240)}`);
    }
    if (it.pastedText && it.pastedText.trim().length > 0) {
      lines.push(language === 'en' ? '  pasted text (analyse, do not reproduce):' : '  texte collé (analyse, ne reproduis pas) :');
      lines.push(`  >>> ${safeTruncate(it.pastedText, 600)}`);
    }
    return lines.join('\n');
  });
  return `${heading}\n\n${blocks.join('\n\n')}`;
}

// -----------------------------------------------------------------------------
// Localized base scaffolding
// -----------------------------------------------------------------------------

interface RolePack {
  role: string;
  goalPrefix: string;
  outputHeader: string;
}

function basePack(language: 'fr' | 'en'): RolePack {
  if (language === 'en') {
    return {
      role:
        'You are a senior B2B copywriter specialized in social, direct response and SaaS marketing. You work for SocialBoost, an editorial yield engine.',
      goalPrefix: 'Business goal',
      outputHeader: 'Expected output format',
    };
  }
  return {
    role:
      "Tu es un copywriter senior spécialisé en marketing direct, social et SaaS. Tu travailles pour SocialBoost, un moteur de rendement éditorial.",
    goalPrefix: 'Objectif business',
    outputHeader: 'Format de sortie attendu',
  };
}

function commonGuardrails(language: 'fr' | 'en'): string[] {
  if (language === 'en') {
    return [
      "No promise of an unconditional outcome. Avoid marketing superlatives like 'guaranteed', 'assured', 'certified'.",
      'Never invent a proof point. Reuse only the proofs explicitly listed in the offer brief, verbatim.',
      'Keep the tone clear. Avoid marketing jargon and buzzwords.',
      'Always assume the human reviewer will read and edit before publishing.',
      "Respect the offer's language for any public-facing copy.",
      'Do not produce hate speech, deceptive claims, or misleading urgency.',
    ];
  }
  return [
    "Aucune promesse de résultat sans condition. Évite les superlatifs marketing du type « garanti », « assuré », « certifié ».",
    "N'invente jamais une preuve. Réutilise uniquement les preuves listées explicitement dans le brief, verbatim.",
    'Garde un ton clair. Évite le jargon marketing et les mots à la mode.',
    "Suppose toujours qu'un humain relit et modifie avant publication.",
    "Respecte la langue de l'offre pour tout texte destiné au public.",
    "Ne produis aucun propos haineux, claim trompeur ou urgence factice.",
  ];
}

function commonQuality(language: 'fr' | 'en'): string[] {
  if (language === 'en') {
    return [
      'The output answers the task in the requested format only — no preamble.',
      'Audience is reflected in the wording (not just named).',
      'At least one proof point is reused verbatim when proofs are provided.',
      'A single, clear next action is suggested where applicable.',
      'No claim depends on a metric not present in the brief.',
    ];
  }
  return [
    'La sortie répond à la tâche dans le format demandé uniquement — pas de préambule.',
    'L\'audience transparaît dans le ton (pas seulement nommée).',
    'Au moins une preuve est réutilisée verbatim quand des preuves sont fournies.',
    'Une seule prochaine action claire est suggérée quand applicable.',
    'Aucune affirmation ne dépend d\'une métrique absente du brief.',
  ];
}

// -----------------------------------------------------------------------------
// Per-task prompts
// -----------------------------------------------------------------------------

interface TaskPack {
  systemMission: string;
  userTask: string;
  expectedOutput: string;
  outputFormat: PromptOutputFormat;
  extraGuardrails?: string[];
  extraQuality?: string[];
}

function offerDiagnosisPack(language: 'fr' | 'en'): TaskPack {
  if (language === 'en') {
    return {
      systemMission:
        "Mission: clarify the offer, the promise, the audience, and the most likely silent objection — without inventing facts.",
      userTask:
        'Diagnose the offer. List strengths, weaknesses, missing information that would unlock conversion, and propose a sharper positioning sentence.',
      expectedOutput:
        'JSON object: { "strengths": string[], "weaknesses": string[], "missingInfo": string[], "suggestedPositioning": string }',
      outputFormat: 'json',
      extraGuardrails: ['Do not output recommendations that depend on metrics absent from the brief.'],
      extraQuality: ['suggestedPositioning is one sentence, ≤ 25 words, no superlatives.'],
    };
  }
  return {
    systemMission:
      "Mission : clarifier l'offre, la promesse, l'audience et l'objection silencieuse la plus probable — sans inventer.",
    userTask:
      "Fais le diagnostic de l'offre. Liste les forces, les faiblesses, les informations manquantes qui débloqueraient la conversion, puis propose une phrase de positionnement plus nette.",
    expectedOutput:
      'Objet JSON : { "strengths": string[], "weaknesses": string[], "missingInfo": string[], "suggestedPositioning": string }',
    outputFormat: 'json',
    extraGuardrails: ["Ne produis aucune recommandation qui dépend d'une métrique absente du brief."],
    extraQuality: ['suggestedPositioning fait une phrase, ≤ 25 mots, aucun superlatif.'],
  };
}

function angleDiscoveryPack(language: 'fr' | 'en'): TaskPack {
  if (language === 'en') {
    return {
      systemMission:
        'Mission: surface the most promising social angles to test, with their emotional trigger and risk.',
      userTask:
        'Generate 5 to 8 social angles to test. Each angle: short name, emotional trigger, why it can work for this offer, risk if pushed too hard, and 1-3 suggested channels.',
      expectedOutput:
        'JSON array of 5 to 8 items: { "angleName": string, "emotionalTrigger": string, "whyItCanWork": string, "risk": string, "suggestedChannels": string[] }',
      outputFormat: 'json',
      extraQuality: [
        'Exactly 5 to 8 angles — no more, no less.',
        'No two angles share the same emotional trigger.',
      ],
    };
  }
  return {
    systemMission:
      'Mission : faire émerger les angles sociaux les plus prometteurs à tester, avec leur déclencheur émotionnel et leur risque.',
    userTask:
      "Génère 5 à 8 angles sociaux à tester. Chaque angle : nom court, déclencheur émotionnel, pourquoi ça peut marcher pour cette offre, risque si on pousse trop, et 1 à 3 canaux suggérés.",
    expectedOutput:
      'Tableau JSON de 5 à 8 éléments : { "angleName": string, "emotionalTrigger": string, "whyItCanWork": string, "risk": string, "suggestedChannels": string[] }',
    outputFormat: 'json',
    extraQuality: [
      'Exactement 5 à 8 angles — ni plus ni moins.',
      'Aucun angle ne partage le même déclencheur émotionnel.',
    ],
  };
}

function postIdeasPack(language: 'fr' | 'en'): TaskPack {
  if (language === 'en') {
    return {
      systemMission: 'Mission: generate post ideas adapted to the target channel.',
      userTask:
        'Generate 6 post ideas. For each: a hook (≤ 90 chars), a body (≤ 600 chars), a single human-sounding CTA, and channelFit (1-100).',
      expectedOutput:
        'JSON array of 6 items: { "hook": string, "body": string, "cta": string, "channelFit": number }',
      outputFormat: 'json',
      extraQuality: ['Each hook is concrete; no "Did you know?" openers.'],
    };
  }
  return {
    systemMission: "Mission : générer des idées de posts adaptées au canal cible.",
    userTask:
      "Génère 6 idées de posts. Pour chacune : un hook (≤ 90 car), un corps (≤ 600 car), un CTA humain unique, et un score channelFit (1-100).",
    expectedOutput:
      'Tableau JSON de 6 éléments : { "hook": string, "body": string, "cta": string, "channelFit": number }',
    outputFormat: 'json',
    extraQuality: ['Chaque hook est concret ; aucun ouvert « Saviez-vous que ? »'],
  };
}

function adGenerationPack(language: 'fr' | 'en'): TaskPack {
  if (language === 'en') {
    return {
      systemMission:
        'Mission: generate ads ready for human review. The ad must reflect the audience, reuse a proof verbatim, address one objection, and fit the channel.',
      userTask:
        'Generate 3 ad variants. Each variant: headline, body, CTA, proofUsage (which proof was reused, verbatim), objectionHandled.',
      expectedOutput:
        'JSON array of exactly 3 items: { "headline": string, "body": string, "cta": string, "proofUsage": string, "objectionHandled": string }',
      outputFormat: 'json',
      extraQuality: [
        'Audience appears in the wording, not only as a label.',
        'proofUsage echoes a proofPoint verbatim if any was provided.',
        'objectionHandled is one sentence pointing at a real friction.',
      ],
    };
  }
  return {
    systemMission:
      "Mission : générer des annonces prêtes à relire. L'annonce doit refléter l'audience, réutiliser une preuve verbatim, traiter une objection et coller au canal.",
    userTask:
      "Génère 3 variantes d'annonce. Chaque variante : headline, body, CTA, proofUsage (quelle preuve a été réutilisée, verbatim), objectionHandled.",
    expectedOutput:
      'Tableau JSON de 3 éléments exactement : { "headline": string, "body": string, "cta": string, "proofUsage": string, "objectionHandled": string }',
    outputFormat: 'json',
    extraQuality: [
      "L'audience apparaît dans le ton, pas seulement comme étiquette.",
      "proofUsage reprend une preuve verbatim si fournie.",
      "objectionHandled est une phrase pointant une vraie friction.",
    ],
  };
}

function adCritiquePack(language: 'fr' | 'en'): TaskPack {
  if (language === 'en') {
    return {
      systemMission:
        'Mission: critique the supplied ad along clarity, attention, credibility, action, and jargon risk. Output is structured scoring + concrete recommendations.',
      userTask:
        'Score the ad 0-100 across the 4 axes (clarity, attention, credibility, action), grade jargonRisk low/medium/high, and propose 3 concrete recommendations with a single edited line each.',
      expectedOutput:
        'JSON object: { "scores": { "clarity": number, "attention": number, "credibility": number, "action": number }, "jargonRisk": "low"|"medium"|"high", "recommendations": [{ "title": string, "before": string, "after": string }] }',
      outputFormat: 'json',
      extraQuality: ['Each recommendation has a concrete before/after pair.'],
    };
  }
  return {
    systemMission:
      "Mission : critiquer l'annonce fournie selon clarté, attention, crédibilité, action et risque jargon. Sortie structurée + recommandations concrètes.",
    userTask:
      "Note l'annonce de 0 à 100 sur les 4 axes (clarity, attention, credibility, action), évalue jargonRisk en low/medium/high, et propose 3 recommandations concrètes avec un avant/après par item.",
    expectedOutput:
      'Objet JSON : { "scores": { "clarity": number, "attention": number, "credibility": number, "action": number }, "jargonRisk": "low"|"medium"|"high", "recommendations": [{ "title": string, "before": string, "after": string }] }',
    outputFormat: 'json',
    extraQuality: ['Chaque recommandation porte un avant/après concret.'],
  };
}

function adImprovementPack(language: 'fr' | 'en'): TaskPack {
  if (language === 'en') {
    return {
      systemMission:
        'Mission: produce an improved version of the supplied ad and explain what changed and why.',
      userTask:
        'Rewrite the ad. Output the improved headline, body, CTA, and a short explanation listing the 3-5 changes you made and why.',
      expectedOutput:
        'JSON object: { "improved": { "headline": string, "body": string, "cta": string }, "changeLog": [{ "change": string, "why": string }] }',
      outputFormat: 'json',
    };
  }
  return {
    systemMission: "Mission : produire une version améliorée de l'annonce et expliquer ce qui a changé et pourquoi.",
    userTask:
      "Réécris l'annonce. Sortie : headline / body / CTA améliorés + une courte explication listant les 3 à 5 changements et leur raison.",
    expectedOutput:
      'Objet JSON : { "improved": { "headline": string, "body": string, "cta": string }, "changeLog": [{ "change": string, "why": string }] }',
    outputFormat: 'json',
  };
}

function weeklyPlanPack(language: 'fr' | 'en'): TaskPack {
  if (language === 'en') {
    return {
      systemMission: 'Mission: organize a 7-day publishing schedule from the offer state.',
      userTask:
        'Plan the week. For each day (Mon..Sun): goal of the day, channel, content idea, and the editorial reason behind that pick.',
      expectedOutput:
        'JSON array of 7 items: { "day": "Mon"|"Tue"|"Wed"|"Thu"|"Fri"|"Sat"|"Sun", "goal": string, "channel": string, "content": string, "reason": string }',
      outputFormat: 'json',
      extraQuality: ['Mix is balanced — no day is identical to the previous one.'],
    };
  }
  return {
    systemMission: 'Mission : organiser une semaine de publication à partir de l\'état de l\'offre.',
    userTask:
      'Planifie la semaine. Pour chaque jour (Lun..Dim) : objectif du jour, canal, idée de contenu, et la raison éditoriale du choix.',
    expectedOutput:
      'Tableau JSON de 7 éléments : { "day": "Lun"|"Mar"|"Mer"|"Jeu"|"Ven"|"Sam"|"Dim", "goal": string, "channel": string, "content": string, "reason": string }',
    outputFormat: 'json',
    extraQuality: ['Le mix est équilibré — aucun jour identique au précédent.'],
  };
}

function externalInspirationAnalysisPack(language: 'fr' | 'en'): TaskPack {
  if (language === 'en') {
    return {
      systemMission:
        'Mission: analyse the supplied external examples and extract abstract marketing patterns. NEVER copy the source text. Produce reusable structures, not reproductions.',
      userTask:
        'For each inspiration, extract a reusable pattern: name, platform, format, hook mechanic, emotional trigger, promise type, proof type, objection handled, engagement mechanic, why it may work, risks, how to adapt for the user offer, and originality guidance for the next adaptation.',
      expectedOutput:
        'JSON array of patterns: { "patternName": string, "platform": string, "format": string, "hookMechanic": string, "emotionalTrigger": string, "promiseType": string, "proofType": string, "objectionHandled": string, "engagementMechanic": string, "whyItMayWork": string, "risks": string, "howToAdaptForOffer": string, "originalityGuidance": string }',
      outputFormat: 'json',
      extraGuardrails: [
        'Never copy the original text.',
        'Never reproduce the source structure sentence by sentence.',
        'Never invent metrics. If performance signals are declarative hints, mark them as hints, not proof.',
        'Always create an original adaptation. The output is patterns + guidance, not a clone.',
        "Always respect the offer's language for any sample wording you produce.",
        "Flag risks: cliché, excessive promise, aggressive tone, imitation too close to source.",
      ],
      extraQuality: [
        'patternName is short and abstract — never the source headline.',
        'howToAdaptForOffer is concrete and tied to the offer brief, not the source.',
        'originalityGuidance lists 2-3 reformulation moves to avoid imitation.',
      ],
    };
  }
  return {
    systemMission:
      "Mission : analyse les exemples externes fournis et extrais des patterns marketing abstraits. NE COPIE JAMAIS le texte source. Produis des structures réutilisables, pas des reproductions.",
    userTask:
      "Pour chaque inspiration, extrais un pattern réutilisable : nom, plateforme, format, mécanique de hook, déclencheur émotionnel, type de promesse, type de preuve, objection traitée, mécanique d'engagement, pourquoi ça peut marcher, risques, comment l'adapter à l'offre utilisateur, et conseils d'originalité pour la prochaine adaptation.",
    expectedOutput:
      'Tableau JSON de patterns : { "patternName": string, "platform": string, "format": string, "hookMechanic": string, "emotionalTrigger": string, "promiseType": string, "proofType": string, "objectionHandled": string, "engagementMechanic": string, "whyItMayWork": string, "risks": string, "howToAdaptForOffer": string, "originalityGuidance": string }',
    outputFormat: 'json',
    extraGuardrails: [
      'Ne copie pas le texte original.',
      'Ne reproduis pas la structure phrase par phrase.',
      "N'invente pas de métriques. Si les signaux de performance sont déclaratifs, indique que ce sont des indices, pas des preuves.",
      'Crée toujours une adaptation originale. La sortie : patterns + conseils, pas un clone.',
      "Respecte la langue de l'offre pour tout exemple de formulation que tu produis.",
      "Signale les risques : cliché, promesse excessive, ton agressif, imitation trop proche.",
    ],
    extraQuality: [
      'patternName est court et abstrait — jamais le titre source.',
      "howToAdaptForOffer est concret et rattaché au brief de l'offre, pas à la source.",
      "originalityGuidance liste 2-3 mouvements de reformulation pour éviter l'imitation.",
    ],
  };
}

function userAdvicePack(language: 'fr' | 'en'): TaskPack {
  if (language === 'en') {
    return {
      systemMission: 'Mission: explain in plain words the next best action for the user.',
      userTask:
        'Pick the single most useful next step the user should take, write a short advice (≤ 60 words), name the recommended action, and explain why.',
      expectedOutput:
        'JSON object: { "advice": string, "recommendedAction": string, "why": string }',
      outputFormat: 'json',
      extraQuality: ['advice ≤ 60 words, no jargon.'],
    };
  }
  return {
    systemMission: "Mission : expliquer simplement la prochaine meilleure action pour l'utilisateur.",
    userTask:
      "Choisis la seule prochaine étape la plus utile, rédige un conseil court (≤ 60 mots), nomme l'action recommandée et explique pourquoi.",
    expectedOutput:
      'Objet JSON : { "advice": string, "recommendedAction": string, "why": string }',
    outputFormat: 'json',
    extraQuality: ['conseil ≤ 60 mots, sans jargon.'],
  };
}

const TASK_PACKS: Record<PromptTask, (l: 'fr' | 'en') => TaskPack> = {
  offer_diagnosis: offerDiagnosisPack,
  angle_discovery: angleDiscoveryPack,
  post_ideas: postIdeasPack,
  ad_generation: adGenerationPack,
  ad_critique: adCritiquePack,
  ad_improvement: adImprovementPack,
  weekly_plan: weeklyPlanPack,
  user_advice: userAdvicePack,
  external_inspiration_analysis: externalInspirationAnalysisPack,
};

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

export function buildExpertPrompt(input: BuildExpertPromptInput): PromptVersion {
  const language = resolveLanguage(input);
  const base = basePack(language);
  const pack = TASK_PACKS[input.task](language);
  const tone = defaultTone(input);
  const goal = safeString(input.goal) || (language === 'en'
    ? 'Move the offer one concrete step forward.'
    : "Faire avancer l'offre d'une étape concrète.");

  const guardrails = [...commonGuardrails(language), ...(pack.extraGuardrails ?? [])];
  const qualityChecklist = [...commonQuality(language), ...(pack.extraQuality ?? [])];

  // System prompt: role, mission, guardrails, expected output.
  const systemSections = [
    base.role,
    pack.systemMission,
    language === 'en' ? 'Guardrails:' : 'Garde-fous :',
    joinList(guardrails, language),
    `${base.outputHeader}: ${pack.outputFormat}`,
  ];
  const systemPrompt = systemSections.join('\n\n');

  // User prompt: full context the model needs.
  const userSections: string[] = [
    `${base.goalPrefix}: ${goal}`,
    brandLine(input.offer, language),
    offerSummaryLine(input.offer, language),
    audienceLine(input.offer, language),
    proofsBlock(input.offer, language),
    channelLine(input.channel, language),
    language === 'en' ? `Style: ${tone}` : `Style : ${tone}`,
  ];
  if (input.adUnit) {
    userSections.push(formatAdUnitBlock(input.adUnit, language));
  }
  if (input.selectedAssets && input.selectedAssets.length > 0) {
    userSections.push(formatAssetsBlock(input.selectedAssets, language));
  }
  const inspirationsRendered = inspirationsBlock(input.inspirations, language);
  if (inspirationsRendered.length > 0) {
    userSections.push(inspirationsRendered);
  }
  userSections.push(constraintsBlock(input, language));

  // AI-015 addendum: dynamically extend the user task when external
  // inspirations are present, for angle_discovery and ad_generation. The
  // model is told to compare/adapt without copying.
  let userTask = pack.userTask;
  if (
    inspirationsRendered.length > 0 &&
    (input.task === 'angle_discovery' || input.task === 'ad_generation')
  ) {
    const note = language === 'en'
      ? input.task === 'angle_discovery'
        ? ' Compare the user offer to the external inspirations provided and propose original angles adapted to the offer. Do not copy the source text.'
        : ' Use the extracted patterns from the external inspirations as strategic inspiration only — generate an original copy. Do not copy the source text.'
      : input.task === 'angle_discovery'
        ? " Compare l'offre utilisateur aux inspirations externes fournies et propose des angles originaux adaptés à l'offre. Ne copie pas le texte source."
        : " Utilise les patterns extraits des inspirations externes comme inspiration stratégique uniquement — génère une copie originale. Ne copie pas le texte source.";
    userTask = `${pack.userTask}${note}`;
  }

  userSections.push(language === 'en' ? `Task: ${userTask}` : `Tâche : ${userTask}`);
  userSections.push(language === 'en'
    ? `Expected output: ${pack.expectedOutput}`
    : `Sortie attendue : ${pack.expectedOutput}`);

  const userPrompt = userSections.join('\n\n');
  const id = `${input.task}-v${ORCHESTRATOR_VERSION}-${language}${input.channel ? `-${input.channel}` : ''}-${input.offer.id}`;
  return {
    id,
    task: input.task,
    version: ORCHESTRATOR_VERSION,
    language,
    channel: input.channel,
    systemPrompt,
    userPrompt,
    expectedOutput: pack.expectedOutput,
    outputFormat: pack.outputFormat,
    guardrails,
    qualityChecklist,
    createdAtMock: MOCK_CREATED_AT,
  };
}

/**
 * Convenience wrapper: build the dedicated External Inspiration Analysis
 * prompt from a list of inspirations. Equivalent to calling
 * `buildExpertPrompt({ task: 'external_inspiration_analysis', inspirations })`
 * but reads better at call sites.
 */
export interface BuildExternalInspirationPromptInput {
  offer: Offer;
  inspirations: ExternalInspirationInput[];
  language?: 'fr' | 'en';
  goal?: string;
  constraints?: string[];
}

export function buildExternalInspirationPrompt(
  input: BuildExternalInspirationPromptInput,
): PromptVersion {
  return buildExpertPrompt({
    offer: input.offer,
    task: 'external_inspiration_analysis',
    inspirations: input.inspirations,
    language: input.language,
    goal: input.goal,
    constraints: input.constraints,
  });
}

function formatAdUnitBlock(adUnit: AdUnit, language: 'fr' | 'en'): string {
  const heading = language === 'en' ? 'Ad to work on' : 'Annonce à traiter';
  return [
    `${heading}:`,
    `- name: ${adUnit.name}`,
    `- type: ${adUnit.type}`,
    `- format: ${adUnit.format}`,
    `- channel: ${adUnit.channel}`,
    `- hook: ${adUnit.hook}`,
    `- copy: ${adUnit.copy}`,
    `- cta: ${adUnit.cta}`,
  ].join('\n');
}

function formatAssetsBlock(assets: Asset[], language: 'fr' | 'en'): string {
  const heading = language === 'en' ? 'Selected ideas (raw material)' : 'Idées sélectionnées (matière première)';
  const lines = assets.slice(0, 6).map((a) => `- [${a.kind}] ${(a.title ?? '').slice(0, 60)}: ${a.body.split('\n')[0]?.slice(0, 140) ?? ''}`);
  return `${heading}:\n${lines.join('\n')}`;
}

// -----------------------------------------------------------------------------
// Clipboard export — pure text for "Copier le brief IA".
// -----------------------------------------------------------------------------

export function promptToClipboardText(prompt: PromptVersion, language: 'fr' | 'en' = 'fr'): string {
  const isEn = language === 'en';
  const lines: string[] = [];
  lines.push(isEn ? `# AI brief — ${prompt.task}` : `# Brief IA — ${prompt.task}`);
  lines.push(`task: ${prompt.task}`);
  lines.push(`version: ${prompt.version}`);
  lines.push(`language: ${prompt.language}`);
  if (prompt.channel) lines.push(`channel: ${prompt.channel}`);
  lines.push('');
  lines.push(isEn ? '## System prompt' : '## Prompt système');
  lines.push(prompt.systemPrompt);
  lines.push('');
  lines.push(isEn ? '## User prompt' : '## Prompt utilisateur');
  lines.push(prompt.userPrompt);
  lines.push('');
  lines.push(isEn ? '## Expected output' : '## Sortie attendue');
  lines.push(prompt.expectedOutput);
  lines.push('');
  lines.push(isEn ? '## Guardrails' : '## Garde-fous');
  for (const g of prompt.guardrails) lines.push(`- ${g}`);
  lines.push('');
  lines.push(isEn ? '## Quality checklist' : '## Critères qualité');
  for (const q of prompt.qualityChecklist) lines.push(`- ${q}`);
  return lines.join('\n');
}

// -----------------------------------------------------------------------------
// Forbidden-phrase scanner — utility for tests + future provider gateway.
// -----------------------------------------------------------------------------

export function containsForbiddenPhrase(text: string): string | undefined {
  const lower = text.toLowerCase();
  for (const p of FORBIDDEN_PHRASES) {
    if (lower.includes(p.toLowerCase())) return p;
  }
  return undefined;
}
