/**
 * Creative pack generator (AI-009).
 *
 * Pure deterministic. Builds a coherent set of asset drafts from an Offer:
 *   5 LinkedIn posts · 3 short emails · 5 alternative hooks ·
 *   3 CTAs · 3 video scripts · 3 image prompts · 1 carousel · 1 hero landing.
 *
 * Hard rules:
 *   - proofPoints reused VERBATIM, never paraphrased
 *   - no invented numbers (rejected by lib/ai/offer-brain/actionables/invariants.ts
 *     style invariants — same regex family)
 *   - language = offer.language (fr/en)
 *   - tone = offer.brief.tone — modulates phrasing
 *   - regenerate-variant uses a different seed → distinct content
 */

import type { Asset, AssetKind, Dimension, Offer, OfferTone } from './types';
import { KIND_TO_DIMENSIONS } from './types';

// -----------------------------------------------------------------------------
// Deterministic helpers
// -----------------------------------------------------------------------------

function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pickIndex(seed: number, modulo: number): number {
  // JS `%` keeps sign; we need a non-negative index (some hashes are negative
  // when interpreted as signed int32). Mix-then-mod keeps it bounded.
  if (modulo <= 0) return 0;
  const u = (seed >>> 0) % modulo;
  return u;
}

/** Knuth-multiplicative mix so different variantSeed always changes lower bits. */
function mixSeed(variantSeed: number, baseHash: number): number {
  return ((variantSeed * 2654435761) + baseHash) >>> 0;
}

function stripTrailing(s: string | undefined): string {
  if (!s) return '';
  return s.replace(/[\s.!?;,]+$/g, '');
}

// -----------------------------------------------------------------------------
// Public types
// -----------------------------------------------------------------------------

export type Lang = 'fr' | 'en';
export type Tone = OfferTone;

/** A draft of an Asset, ready to be passed to store.createAsset(). */
export type AssetDraft = Omit<Asset, 'id' | 'createdAt' | 'dimensions'>;

export interface PackInput {
  offer: Offer;
  /** Optional override (defaults to offer.language). */
  language?: Lang;
  /** Optional variation seed; same offer + same seed → same content. */
  variantSeed?: number;
}

export interface PackCounts {
  linkedin_posts: number;
  emails: number;
  hooks: number;
  ctas: number;
  video_scripts: number;
  image_prompts: number;
  carousel: number;
  landing_hero: number;
}

export const DEFAULT_PACK_COUNTS: PackCounts = {
  linkedin_posts: 5,
  emails: 3,
  hooks: 5,
  ctas: 3,
  video_scripts: 3,
  image_prompts: 3,
  carousel: 1,
  landing_hero: 1,
};

// -----------------------------------------------------------------------------
// Tone modifiers
// -----------------------------------------------------------------------------

const TONE_OPENER: Record<Tone, Record<Lang, string>> = {
  professional: { fr: 'Constat', en: 'The reality' },
  bold: { fr: 'On arrête de tourner autour', en: 'Cut to the truth' },
  friendly: { fr: 'Disons-le simplement', en: 'Let me put it plainly' },
  premium: { fr: 'Une exigence', en: 'A standard' },
};

const TONE_CLOSING: Record<Tone, Record<Lang, string>> = {
  professional: { fr: 'Cadre clair, étapes mesurables.', en: 'Clear frame, measurable steps.' },
  bold: { fr: 'Pas de blabla. On agit.', en: 'No fluff. We move.' },
  friendly: {
    fr: "On regarde ça ensemble, sans pression.",
    en: "We'll figure it out, no pressure.",
  },
  premium: { fr: 'Un cadre exigeant, sur mesure.', en: 'A demanding frame, tailored.' },
};

// -----------------------------------------------------------------------------
// Hook angles (5)
// -----------------------------------------------------------------------------

const HOOK_TEMPLATES_FR = [
  (audience: string, pain: string, opener: string) =>
    `${opener} : ${audience} bute encore sur ${pain.toLowerCase()}.`,
  (audience: string, _pain: string, _opener: string) =>
    `Pour ${audience} : ce que personne ne dit sur cette offre.`,
  (audience: string, _pain: string, _opener: string) =>
    `Cette offre est conçue pour ${audience} qui en ont assez d'improviser.`,
  (audience: string, _pain: string, _opener: string) =>
    `À contre-courant : et si la friction venait du brief, pas de l'audience ${audience} ?`,
  (audience: string, pain: string, _opener: string) =>
    `Avant : ${pain.toLowerCase()}. Après : un cadre clair, des étapes lisibles pour ${audience}.`,
] as const;

const HOOK_TEMPLATES_EN = [
  (audience: string, pain: string, opener: string) =>
    `${opener}: ${audience} keeps hitting ${pain.toLowerCase()}.`,
  (audience: string) => `For ${audience}: what nobody says about this offer.`,
  (audience: string) =>
    `This offer is built for ${audience} who are tired of improvising.`,
  (audience: string) =>
    `Counter-intuitive: maybe the friction comes from the brief, not from ${audience}.`,
  (audience: string, pain: string) =>
    `Before: ${pain.toLowerCase()}. After: a clear frame, readable steps for ${audience}.`,
] as const;

const HOOK_TYPES: Asset['kind'][] = ['hook', 'hook', 'hook', 'hook', 'hook'];

function buildHookVariant(
  i: number,
  audience: string,
  pain: string,
  lang: Lang,
  tone: Tone,
): { title: string; body: string; tags: string[] } {
  const opener = TONE_OPENER[tone][lang];
  const text =
    lang === 'fr'
      ? (HOOK_TEMPLATES_FR[i % HOOK_TEMPLATES_FR.length] as (a: string, p: string, o: string) => string)(audience, pain, opener)
      : (HOOK_TEMPLATES_EN[i % HOOK_TEMPLATES_EN.length] as (a: string, p: string, o?: string) => string)(audience, pain, opener);
  const types = ['pain', 'curiosity', 'identity', 'contrarian', 'before_after'];
  const subtype = types[i % types.length]!;
  return {
    title: lang === 'fr' ? `Hook ${i + 1} · ${subtype}` : `Hook ${i + 1} · ${subtype}`,
    body: text,
    tags: [`angle:${subtype}`],
  };
}

// -----------------------------------------------------------------------------
// LinkedIn posts (5 angles)
// -----------------------------------------------------------------------------

interface LiContext {
  business: string;
  offer: string;
  audience: string;
  proof: string | undefined;
  closing: string;
  ctaLabel: string;
}

const LI_ANGLES = [
  'status_quo',
  'transformation',
  'objection_breaker',
  'proof_anchored',
  'why_now',
] as const;

function buildLinkedInVariant(
  i: number,
  ctx: LiContext,
  lang: Lang,
): { title: string; body: string; tags: string[] } {
  const angle = LI_ANGLES[i % LI_ANGLES.length]!;
  const { business, offer, audience, proof, closing, ctaLabel } = ctx;

  const lines: string[] =
    lang === 'fr'
      ? linesFr(angle, ctx)
      : linesEn(angle, ctx);

  const body = lines.filter(Boolean).join('\n');
  const tags: string[] = [`angle:${angle}`, 'channel:linkedin'];
  if (proof) tags.push('proof:reused');
  return {
    title: lang === 'fr' ? `LinkedIn · ${angle}` : `LinkedIn · ${angle}`,
    body,
    tags,
  };
}

function linesFr(angle: string, c: LiContext): string[] {
  switch (angle) {
    case 'status_quo':
      return [
        `Continuer comme avant signifie : ${c.audience} reste flou sur ce que tu vends.`,
        '',
        `Ce que ${c.business} change : ${stripTrailing(c.offer)}.`,
        '',
        c.closing,
        '',
        `→ ${c.ctaLabel}.`,
      ];
    case 'transformation':
      return [
        `Avant → Après pour ${c.audience}.`,
        '',
        `Avant : message dispersé, prospects qui hésitent.`,
        `Après : ${stripTrailing(c.offer)}.`,
        c.proof ? `\nRéférence : ${c.proof}.` : '',
        '',
        `→ ${c.ctaLabel}.`,
      ];
    case 'objection_breaker':
      return [
        `« C'est trop cher / pas le bon moment. »`,
        '',
        c.proof
          ? `Réponse honnête : ${c.proof}. Sinon, l'écart se creuse silencieusement.`
          : `Réponse honnête : compare le coût d'inaction (mois après mois) au coût d'une décision claire.`,
        '',
        c.closing,
        '',
        `→ ${c.ctaLabel}.`,
      ];
    case 'proof_anchored':
      return [
        c.proof
          ? `Ce qui est mesuré chez ${c.business} : ${c.proof}.`
          : `Ce qui sera mesuré chez ${c.business} : preuves à ajouter avant publication.`,
        '',
        `Pour ${c.audience}.`,
        `${stripTrailing(c.offer)}.`,
        '',
        `→ ${c.ctaLabel}.`,
      ];
    case 'why_now':
      return [
        `Pourquoi maintenant pour ${c.audience} ?`,
        '',
        `${stripTrailing(c.offer)}. La fenêtre est étroite : positions floues = clients perdus.`,
        '',
        c.closing,
        '',
        `→ ${c.ctaLabel}.`,
      ];
    default:
      return [c.offer];
  }
}

function linesEn(angle: string, c: LiContext): string[] {
  switch (angle) {
    case 'status_quo':
      return [
        `Doing nothing means: ${c.audience} stays unclear on what you sell.`,
        '',
        `What ${c.business} changes: ${stripTrailing(c.offer)}.`,
        '',
        c.closing,
        '',
        `→ ${c.ctaLabel}.`,
      ];
    case 'transformation':
      return [
        `Before → After for ${c.audience}.`,
        '',
        `Before: scattered message, hesitant prospects.`,
        `After: ${stripTrailing(c.offer)}.`,
        c.proof ? `\nReference: ${c.proof}.` : '',
        '',
        `→ ${c.ctaLabel}.`,
      ];
    case 'objection_breaker':
      return [
        `"Too expensive / wrong timing."`,
        '',
        c.proof
          ? `Honest reply: ${c.proof}. Otherwise the gap widens silently.`
          : `Honest reply: compare the cost of inaction (month after month) to one clear decision.`,
        '',
        c.closing,
        '',
        `→ ${c.ctaLabel}.`,
      ];
    case 'proof_anchored':
      return [
        c.proof
          ? `What's measured at ${c.business}: ${c.proof}.`
          : `What will be measured at ${c.business}: proofs to add before publishing.`,
        '',
        `For ${c.audience}.`,
        `${stripTrailing(c.offer)}.`,
        '',
        `→ ${c.ctaLabel}.`,
      ];
    case 'why_now':
      return [
        `Why now for ${c.audience}?`,
        '',
        `${stripTrailing(c.offer)}. The window is narrow: fuzzy positioning = lost customers.`,
        '',
        c.closing,
        '',
        `→ ${c.ctaLabel}.`,
      ];
    default:
      return [c.offer];
  }
}

// -----------------------------------------------------------------------------
// Emails (3)
// -----------------------------------------------------------------------------

const EMAIL_TYPES = ['cold', 'warm_proof', 'follow_up'] as const;

function buildEmailVariant(
  i: number,
  ctx: LiContext,
  lang: Lang,
): { title: string; body: string; tags: string[] } {
  const t = EMAIL_TYPES[i % EMAIL_TYPES.length]!;
  const lines: string[] = lang === 'fr' ? emailFr(t, ctx) : emailEn(t, ctx);
  return {
    title: lang === 'fr' ? `Email · ${t}` : `Email · ${t}`,
    body: lines.filter(Boolean).join('\n'),
    tags: [`angle:${t}`, 'channel:email'],
  };
}

function emailFr(t: string, c: LiContext): string[] {
  if (t === 'cold') {
    return [
      `Sujet : Pour ${c.audience}, une décision claire en 4 semaines`,
      '',
      'Bonjour,',
      '',
      `${stripTrailing(c.offer)}.`,
      '',
      c.closing,
      '',
      `${c.ctaLabel} → réponse à ce mail suffit.`,
    ];
  }
  if (t === 'warm_proof') {
    return [
      `Sujet : ${c.proof ? c.proof : 'La méthode pas à pas'}`,
      '',
      'Bonjour,',
      '',
      c.proof
        ? `Référence concrète : ${c.proof}.`
        : `Aucune métrique vérifiable n'est encore publiée — preuves en cours de constitution.`,
      '',
      `Pour ${c.audience}, ${stripTrailing(c.offer)}.`,
      '',
      `${c.ctaLabel}.`,
    ];
  }
  return [
    `Sujet : Suite — pour ${c.audience}`,
    '',
    'Bonjour,',
    '',
    `Court rappel : ${stripTrailing(c.offer)}.`,
    '',
    c.closing,
    '',
    `${c.ctaLabel} — un simple « oui » suffit pour bloquer le créneau.`,
  ];
}

function emailEn(t: string, c: LiContext): string[] {
  if (t === 'cold') {
    return [
      `Subject: For ${c.audience}, a clear decision in 4 weeks`,
      '',
      'Hi,',
      '',
      `${stripTrailing(c.offer)}.`,
      '',
      c.closing,
      '',
      `${c.ctaLabel} → just reply to this email.`,
    ];
  }
  if (t === 'warm_proof') {
    return [
      `Subject: ${c.proof ? c.proof : 'The step-by-step method'}`,
      '',
      'Hi,',
      '',
      c.proof
        ? `Concrete reference: ${c.proof}.`
        : `No verifiable metric published yet — proof being collected.`,
      '',
      `For ${c.audience}, ${stripTrailing(c.offer)}.`,
      '',
      `${c.ctaLabel}.`,
    ];
  }
  return [
    `Subject: Follow-up — for ${c.audience}`,
    '',
    'Hi,',
    '',
    `Short recap: ${stripTrailing(c.offer)}.`,
    '',
    c.closing,
    '',
    `${c.ctaLabel} — a simple "yes" is enough to lock the slot.`,
  ];
}

// -----------------------------------------------------------------------------
// CTAs (3)
// -----------------------------------------------------------------------------

const CTA_INTENTS = ['awareness', 'consideration', 'decision'] as const;

function buildCtaVariant(
  i: number,
  ctx: LiContext,
  lang: Lang,
  tone: Tone,
): { title: string; body: string; tags: string[] } {
  const intent = CTA_INTENTS[i % CTA_INTENTS.length]!;
  const labels: Record<Tone, Record<typeof intent, { fr: string; en: string }>> = {
    professional: {
      awareness: { fr: 'Recevoir le récap en 2 minutes', en: 'Get the 2-minute recap' },
      consideration: { fr: 'Voir comment ça marche', en: 'See how it works' },
      decision: { fr: 'Réserver un créneau de cadrage', en: 'Book a scoping call' },
    },
    bold: {
      awareness: { fr: 'Lire le résumé tout de suite', en: 'Read the recap now' },
      consideration: { fr: 'Voir la démo concrète', en: 'Watch the live demo' },
      decision: { fr: 'Bloquer un créneau maintenant', en: 'Lock a slot now' },
    },
    friendly: {
      awareness: { fr: 'Recevoir le récap simplement', en: 'Get the recap (no fuss)' },
      consideration: { fr: "Découvrir comment c'est organisé", en: "See how it's organized" },
      decision: { fr: 'Échanger 20 minutes', en: 'Chat for 20 minutes' },
    },
    premium: {
      awareness: { fr: 'Demander la note de synthèse', en: 'Request the executive summary' },
      consideration: { fr: 'Découvrir le cadre', en: 'Explore the frame' },
      decision: { fr: 'Programmer un entretien de cadrage', en: 'Schedule a scoping interview' },
    },
  };
  const label = labels[tone][intent][lang];
  return {
    title: lang === 'fr' ? `CTA · ${intent}` : `CTA · ${intent}`,
    body: `${label} — intent: ${intent}`,
    tags: [`cta:${intent}`],
  };
}

// -----------------------------------------------------------------------------
// Video scripts (3)
// -----------------------------------------------------------------------------

const VIDEO_DURATIONS = ['15s', '30s', '60s'] as const;

function buildVideoVariant(
  i: number,
  ctx: LiContext,
  lang: Lang,
): { title: string; body: string; tags: string[] } {
  const d = VIDEO_DURATIONS[i % VIDEO_DURATIONS.length]!;
  const body = lang === 'fr' ? videoFr(d, ctx) : videoEn(d, ctx);
  return {
    title: lang === 'fr' ? `Vidéo ${d}` : `Video ${d}`,
    body,
    tags: [`format:${d}`, 'channel:tiktok'],
  };
}

function videoFr(d: string, c: LiContext): string {
  if (d === '15s') {
    return [
      `[0-2s · Hook] ${c.audience}, tu bloques sur la clarté de ton offre ?`,
      `[3-10s · Promesse] ${stripTrailing(c.offer)}.`,
      `[11-15s · CTA] ${c.ctaLabel}.`,
    ].join('\n');
  }
  if (d === '30s') {
    return [
      `[0-3s · Hook] ${c.audience}, voici ce qu'on a observé.`,
      `[4-15s · Problème] Sans cadre, le statu quo coûte plus que la décision elle-même.`,
      `[16-25s · Solution] ${stripTrailing(c.offer)}.`,
      c.proof ? `[26-28s · Preuve] ${c.proof}.` : `[26-28s · Preuve] (à ajouter avant publication)`,
      `[29-30s · CTA] ${c.ctaLabel}.`,
    ].join('\n');
  }
  // 60s
  return [
    `[0-5s · Hook] ${c.audience}, parlons clairement.`,
    `[6-20s · Contexte] La plupart des offres ne convertissent pas par manque de clarté, pas par manque de trafic.`,
    `[21-40s · Cadre] ${stripTrailing(c.offer)}.`,
    c.proof ? `[41-50s · Preuve] ${c.proof}.` : `[41-50s · Preuve] (à compléter avec une preuve vérifiable)`,
    `[51-60s · CTA] ${c.ctaLabel}.`,
  ].join('\n');
}

function videoEn(d: string, c: LiContext): string {
  if (d === '15s') {
    return [
      `[0-2s · Hook] ${c.audience}, stuck on clarifying your offer?`,
      `[3-10s · Promise] ${stripTrailing(c.offer)}.`,
      `[11-15s · CTA] ${c.ctaLabel}.`,
    ].join('\n');
  }
  if (d === '30s') {
    return [
      `[0-3s · Hook] ${c.audience}, here's what we observe.`,
      `[4-15s · Problem] Without a frame, the status quo costs more than the decision itself.`,
      `[16-25s · Solution] ${stripTrailing(c.offer)}.`,
      c.proof ? `[26-28s · Proof] ${c.proof}.` : `[26-28s · Proof] (add before publishing)`,
      `[29-30s · CTA] ${c.ctaLabel}.`,
    ].join('\n');
  }
  return [
    `[0-5s · Hook] ${c.audience}, let's be clear.`,
    `[6-20s · Context] Most offers don't convert because of clarity, not traffic.`,
    `[21-40s · Frame] ${stripTrailing(c.offer)}.`,
    c.proof ? `[41-50s · Proof] ${c.proof}.` : `[41-50s · Proof] (fill with verifiable proof)`,
    `[51-60s · CTA] ${c.ctaLabel}.`,
  ].join('\n');
}

// -----------------------------------------------------------------------------
// Image prompts (3)
// -----------------------------------------------------------------------------

const IMAGE_CONCEPTS = ['hero_workspace', 'audience_moment', 'before_after'] as const;

function buildImagePromptVariant(
  i: number,
  ctx: LiContext,
  lang: Lang,
): { title: string; body: string; tags: string[] } {
  const concept = IMAGE_CONCEPTS[i % IMAGE_CONCEPTS.length]!;
  const body = lang === 'fr' ? imageFr(concept, ctx) : imageEn(concept, ctx);
  return {
    title: lang === 'fr' ? `Prompt image · ${concept}` : `Image prompt · ${concept}`,
    body,
    tags: [`concept:${concept}`],
  };
}

function imageFr(c: string, ctx: LiContext): string {
  if (c === 'hero_workspace') {
    return `Photographie premium dark editorial. Plan de travail propre avec carnet, stylo, écran flou. Lumière douce. Ambiance "${ctx.business}", focus sur la clarté plutôt que sur les outils. Cadrage horizontal. Aucun texte dans l'image.`;
  }
  if (c === 'audience_moment') {
    return `Portrait éditorial subtil de "${ctx.audience}" en plein moment de décision. Regard concentré, pas de mise en scène. Couleurs sombres avec accent ambré. Pas de logo, pas de texte. Cadrage 3:2.`;
  }
  return `Diptyque "Avant / Après" minimaliste. À gauche : tableau confus, post-its dispersés. À droite : un seul plan d'action lisible. Pas de visages. Aucun texte intégré. Style premium dark editorial pour ${ctx.business}.`;
}

function imageEn(c: string, ctx: LiContext): string {
  if (c === 'hero_workspace') {
    return `Premium dark editorial photograph. Clean desk with notebook, pen, blurred screen. Soft light. "${ctx.business}" mood, focus on clarity over tools. Landscape framing. No text in image.`;
  }
  if (c === 'audience_moment') {
    return `Subtle editorial portrait of "${ctx.audience}" mid-decision. Focused gaze, no staging. Dark palette with amber accent. No logo, no text. 3:2 framing.`;
  }
  return `Minimalist "Before / After" diptych. Left: cluttered board, scattered post-its. Right: a single readable action plan. No faces. No embedded text. Premium dark editorial style for ${ctx.business}.`;
}

// -----------------------------------------------------------------------------
// Carousel structure (1) — Instagram 5 slides
// -----------------------------------------------------------------------------

function buildCarousel(
  ctx: LiContext,
  lang: Lang,
): { title: string; body: string; tags: string[] } {
  const slides =
    lang === 'fr'
      ? [
          `Slide 1 — Hook : "${TONE_OPENER.professional.fr} : ${ctx.audience} bute sur la clarté."`,
          `Slide 2 — Problème : "Trafic OK, conversions floues. Pourquoi ?"`,
          `Slide 3 — Insight : "${stripTrailing(ctx.offer)}."`,
          `Slide 4 — Preuve : ${ctx.proof ? `"${ctx.proof}."` : `"Preuves en cours — ajouter avant publication."`}`,
          `Slide 5 — CTA : "${ctx.ctaLabel}"`,
        ]
      : [
          `Slide 1 — Hook: "${TONE_OPENER.professional.en}: ${ctx.audience} stuck on clarity."`,
          `Slide 2 — Problem: "Traffic OK, conversions fuzzy. Why?"`,
          `Slide 3 — Insight: "${stripTrailing(ctx.offer)}."`,
          `Slide 4 — Proof: ${ctx.proof ? `"${ctx.proof}."` : `"Proofs in progress — add before publishing."`}`,
          `Slide 5 — CTA: "${ctx.ctaLabel}"`,
        ];
  return {
    title: lang === 'fr' ? 'Carousel · Instagram (5 slides)' : 'Carousel · Instagram (5 slides)',
    body: slides.join('\n'),
    tags: ['format:carousel', 'channel:instagram'],
  };
}

// -----------------------------------------------------------------------------
// Landing hero alternative (1)
// -----------------------------------------------------------------------------

function buildLandingHero(
  ctx: LiContext,
  lang: Lang,
): { title: string; body: string; tags: string[] } {
  const body =
    lang === 'fr'
      ? [
          `# ${ctx.business} — ${stripTrailing(ctx.offer)}`,
          ``,
          `Pour ${ctx.audience}.`,
          ``,
          ctx.proof ? `> ${ctx.proof}` : `> Preuves en cours de constitution.`,
          ``,
          `**${ctx.ctaLabel}**`,
        ].join('\n')
      : [
          `# ${ctx.business} — ${stripTrailing(ctx.offer)}`,
          ``,
          `For ${ctx.audience}.`,
          ``,
          ctx.proof ? `> ${ctx.proof}` : `> Proof being collected.`,
          ``,
          `**${ctx.ctaLabel}**`,
        ].join('\n');
  return {
    title: lang === 'fr' ? 'Landing · Hero alternatif' : 'Landing · Alternate hero',
    body,
    tags: ['section:hero', 'channel:landing_page'],
  };
}

// -----------------------------------------------------------------------------
// Top-level builders
// -----------------------------------------------------------------------------

function deriveCtx(offer: Offer, lang: Lang): LiContext {
  const tone = (offer.brief.tone ?? 'professional') as Tone;
  const audience =
    stripTrailing(offer.brief.targetAudience) ||
    (lang === 'fr' ? 'votre audience' : 'your audience');
  const ctaPro: Record<Lang, string> = {
    fr: 'Réserver un créneau de cadrage',
    en: 'Book a scoping call',
  };
  return {
    business: offer.brief.businessName,
    offer: offer.brief.offer,
    audience,
    proof: stripTrailing(offer.brief.proofPoints?.[0]),
    closing: TONE_CLOSING[tone][lang],
    ctaLabel: ctaPro[lang],
  };
}

function asDraft(input: {
  offerId: string;
  kind: AssetKind;
  title: string;
  body: string;
  tags: string[];
  channel?: string;
}): AssetDraft {
  return {
    offerId: input.offerId,
    kind: input.kind,
    title: input.title,
    body: input.body,
    status: 'draft',
    source: 'mock',
    channel: input.channel,
    tags: input.tags,
  };
}

/**
 * Build the full creative pack from an offer.
 * Same offer + same variantSeed → identical output.
 */
export function buildCreativePack(input: PackInput): AssetDraft[] {
  const offer = input.offer;
  const lang: Lang = input.language ?? offer.language;
  const tone: Tone = (offer.brief.tone ?? 'professional') as Tone;
  const seed = mixSeed(input.variantSeed ?? 0, hash32(offer.id));
  const ctx = deriveCtx(offer, lang);
  const out: AssetDraft[] = [];

  // 5 hooks
  for (let i = 0; i < DEFAULT_PACK_COUNTS.hooks; i++) {
    const v = buildHookVariant(pickIndex(seed + i, 5), ctx.audience, ctx.proof || (lang === 'fr' ? 'le frein actuel' : 'the current blocker'), lang, tone);
    out.push(asDraft({ offerId: offer.id, kind: 'hook', ...v }));
  }
  // 5 LinkedIn posts
  for (let i = 0; i < DEFAULT_PACK_COUNTS.linkedin_posts; i++) {
    const v = buildLinkedInVariant(pickIndex(seed + 100 + i, 5), ctx, lang);
    out.push(asDraft({ offerId: offer.id, kind: 'social_post', channel: 'linkedin', ...v }));
  }
  // 3 emails
  for (let i = 0; i < DEFAULT_PACK_COUNTS.emails; i++) {
    const v = buildEmailVariant(pickIndex(seed + 200 + i, 3), ctx, lang);
    out.push(asDraft({ offerId: offer.id, kind: 'email', channel: 'email', ...v }));
  }
  // 3 CTAs
  for (let i = 0; i < DEFAULT_PACK_COUNTS.ctas; i++) {
    const v = buildCtaVariant(pickIndex(seed + 300 + i, 3), ctx, lang, tone);
    out.push(asDraft({ offerId: offer.id, kind: 'cta', ...v }));
  }
  // 3 video scripts
  for (let i = 0; i < DEFAULT_PACK_COUNTS.video_scripts; i++) {
    const v = buildVideoVariant(pickIndex(seed + 400 + i, 3), ctx, lang);
    out.push(asDraft({ offerId: offer.id, kind: 'video_script', channel: 'tiktok', ...v }));
  }
  // 3 image prompts
  for (let i = 0; i < DEFAULT_PACK_COUNTS.image_prompts; i++) {
    const v = buildImagePromptVariant(pickIndex(seed + 500 + i, 3), ctx, lang);
    out.push(asDraft({ offerId: offer.id, kind: 'image_prompt', ...v }));
  }
  // 1 carousel
  {
    const v = buildCarousel(ctx, lang);
    out.push(asDraft({ offerId: offer.id, kind: 'social_post', channel: 'instagram', ...v }));
  }
  // 1 landing hero alternative
  {
    const v = buildLandingHero(ctx, lang);
    out.push(asDraft({ offerId: offer.id, kind: 'landing_section', channel: 'landing_page', ...v }));
  }

  return out;
}

/**
 * Builds ONE variant of a single asset kind. Used by the "regenerate variant"
 * action — caller inserts the result as a NEW asset, never overwrites.
 */
export function buildSingleVariant(
  offer: Offer,
  kind: AssetKind,
  variantSeed: number,
  language?: Lang,
): AssetDraft {
  const lang: Lang = language ?? offer.language;
  const tone: Tone = (offer.brief.tone ?? 'professional') as Tone;
  const seed = mixSeed(variantSeed, hash32(offer.id));
  const ctx = deriveCtx(offer, lang);

  switch (kind) {
    case 'hook': {
      const v = buildHookVariant(pickIndex(seed, 5), ctx.audience, ctx.proof || (lang === 'fr' ? 'le frein actuel' : 'the current blocker'), lang, tone);
      return asDraft({ offerId: offer.id, kind, ...v });
    }
    case 'social_post': {
      const v = buildLinkedInVariant(pickIndex(seed, 5), ctx, lang);
      return asDraft({ offerId: offer.id, kind, channel: 'linkedin', ...v });
    }
    case 'email': {
      const v = buildEmailVariant(pickIndex(seed, 3), ctx, lang);
      return asDraft({ offerId: offer.id, kind, channel: 'email', ...v });
    }
    case 'cta': {
      const v = buildCtaVariant(pickIndex(seed, 3), ctx, lang, tone);
      return asDraft({ offerId: offer.id, kind, ...v });
    }
    case 'video_script': {
      const v = buildVideoVariant(pickIndex(seed, 3), ctx, lang);
      return asDraft({ offerId: offer.id, kind, channel: 'tiktok', ...v });
    }
    case 'image_prompt': {
      const v = buildImagePromptVariant(pickIndex(seed, 3), ctx, lang);
      return asDraft({ offerId: offer.id, kind, ...v });
    }
    case 'landing_section': {
      const v = buildLandingHero(ctx, lang);
      return asDraft({ offerId: offer.id, kind, channel: 'landing_page', ...v });
    }
    default: {
      // For other kinds (image_asset, video_storyboard, thumbnail, etc.) — fallback
      return asDraft({
        offerId: offer.id,
        kind,
        title: lang === 'fr' ? 'Variante (mock)' : 'Variant (mock)',
        body: lang === 'fr' ? '(à enrichir)' : '(to enrich)',
        tags: [],
      });
    }
  }
}

// -----------------------------------------------------------------------------
// Coverage helper (used by PackCoverage UI component)
// -----------------------------------------------------------------------------

export interface PackCoverage {
  linkedin_posts: number;
  emails: number;
  hooks: number;
  ctas: number;
  video_scripts: number;
  image_prompts: number;
  carousels: number;
  landing_heroes: number;
  total: number;
  approved: number;
  /** "Next recommended action" label, derived from the coverage. */
  nextAction: { fr: string; en: string };
}

export function computePackCoverage(assets: Asset[]): PackCoverage {
  const linkedinPosts = assets.filter((a) => a.kind === 'social_post' && a.channel === 'linkedin').length;
  const emails = assets.filter((a) => a.kind === 'email').length;
  const hooks = assets.filter((a) => a.kind === 'hook').length;
  const ctas = assets.filter((a) => a.kind === 'cta').length;
  const videoScripts = assets.filter((a) => a.kind === 'video_script').length;
  const imagePrompts = assets.filter((a) => a.kind === 'image_prompt').length;
  const carousels = assets.filter(
    (a) => a.kind === 'social_post' && a.channel === 'instagram' && (a.tags ?? []).includes('format:carousel'),
  ).length;
  const heroes = assets.filter(
    (a) => a.kind === 'landing_section' && (a.tags ?? []).includes('section:hero'),
  ).length;
  const approved = assets.filter((a) => a.status === 'approved').length;

  let nextAction: { fr: string; en: string } = {
    fr: 'Approuver 3 assets pour figer la base',
    en: 'Approve 3 assets to freeze the base',
  };
  if (assets.length === 0) {
    nextAction = {
      fr: 'Créer un pack créatif pour démarrer',
      en: 'Create a creative pack to start',
    };
  } else if (approved >= 3) {
    nextAction = {
      fr: 'Planifier 3 créneaux mock cette semaine',
      en: 'Schedule 3 mock slots this week',
    };
  }

  return {
    linkedin_posts: linkedinPosts,
    emails,
    hooks,
    ctas,
    video_scripts: videoScripts,
    image_prompts: imagePrompts,
    carousels,
    landing_heroes: heroes,
    total: assets.length,
    approved,
    nextAction,
  };
}

// Re-export for tests
export { stripTrailing as _stripTrailing };
export const _ASSET_DIMENSIONS_BY_KIND: Record<AssetKind, Dimension[]> = KIND_TO_DIMENSIONS;
