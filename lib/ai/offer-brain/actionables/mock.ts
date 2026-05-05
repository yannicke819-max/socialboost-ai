/**
 * Offer Brain — Actionables v1 mock (AI-006).
 *
 * Production-grade deterministic generator.
 *
 * Properties:
 *   - Same input → same output (no randomness, no Date.now in content).
 *   - Tone-aware: professional / bold / friendly / premium each shape phrasing.
 *   - Language-aware: FR (default) / EN.
 *   - Platforms drive the social_posts list strictly.
 *   - proofPoints are echoed verbatim. Never invented.
 *   - When proofPoints empty: proof_points = [], explicit warning, score ≤ 60.
 */

import type { ActionablesOutput, ActionablesV1Input } from './schema';
import { ACTIONABLES_SCHEMA_VERSION } from './schema';
import { checkAntiInvention } from './invariants';

type Lang = 'fr' | 'en';
type Tone = 'professional' | 'bold' | 'friendly' | 'premium';

const POST_CAP: Record<string, number> = {
  linkedin: 3000,
  instagram: 2200,
  facebook: 2000,
  email: 1200,
  landing_page: 5000,
};

function pickLang(input: ActionablesV1Input): Lang {
  return input.language === 'en' ? 'en' : 'fr';
}

function pickTone(input: ActionablesV1Input): Tone {
  return (input.tone ?? 'professional') as Tone;
}

function clamp(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, Math.max(0, max - 1)).replace(/[\s,;:.\-—]+$/g, '') + '…';
}

/**
 * Strip trailing sentence punctuation so a string can be injected mid-sentence
 * without producing double-period artifacts like "différenciante.. Suite".
 * Preserves the value when it's already clean.
 */
function stripTrailing(s: string | undefined): string {
  if (!s) return '';
  return s.replace(/[\s.!?;,]+$/g, '');
}

/**
 * French elision: returns "qu'" if the next word starts with a vowel/h-mute,
 * else "que ". Used to avoid "Ce que Atelier" → "Ce qu'Atelier".
 * Conservative — defaults to "que " when undecidable.
 */
function frQu(word: string): string {
  if (!word) return 'que ';
  // Strip diacritics for the leading-letter check (À, É, Î, etc.)
  const first = word
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()[0];
  if (!first) return 'que ';
  // h-mute vs h-aspiré is dictionary-driven; not handled here. Vowels only.
  if (/[aeiouy]/.test(first)) return "qu'";
  return 'que ';
}

/**
 * French preposition "de" with elision when followed by vowel/h-mute.
 * "de Atelier" → "d'Atelier".
 */
function frDe(word: string): string {
  if (!word) return 'de ';
  const first = word
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()[0];
  if (!first) return 'de ';
  if (/[aeiouy]/.test(first)) return "d'";
  return 'de ';
}

function dedupTrim(items: (string | undefined)[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const it of items) {
    if (!it) continue;
    const t = it.trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

// -----------------------------------------------------------------------------
// Tone modifiers
// -----------------------------------------------------------------------------

const TONE_OPENING: Record<Tone, Record<Lang, string>> = {
  professional: {
    fr: 'Constat',
    en: 'The reality',
  },
  bold: {
    fr: 'On arrête de tourner autour',
    en: 'Cut to the truth',
  },
  friendly: {
    fr: 'Disons-le simplement',
    en: 'Let me put it plainly',
  },
  premium: {
    fr: 'Une exigence',
    en: 'A standard',
  },
};

const TONE_VOICE: Record<Tone, Record<Lang, { joiner: string; closing: string }>> = {
  professional: {
    fr: { joiner: '. ', closing: 'Cadre clair, étapes mesurables.' },
    en: { joiner: '. ', closing: 'Clear frame, measurable steps.' },
  },
  bold: {
    fr: { joiner: '. ', closing: "Pas de blabla. On agit." },
    en: { joiner: '. ', closing: 'No fluff. We move.' },
  },
  friendly: {
    fr: { joiner: '. ', closing: 'On regarde ça ensemble, sans pression.' },
    en: { joiner: '. ', closing: "We'll figure it out, no pressure." },
  },
  premium: {
    fr: { joiner: '. ', closing: 'Un cadre exigeant, sur mesure.' },
    en: { joiner: '. ', closing: 'A demanding frame, tailored.' },
  },
};

// -----------------------------------------------------------------------------
// Pain inference
// -----------------------------------------------------------------------------

function inferPainPoints(input: ActionablesV1Input, lang: Lang): string[] {
  const text = `${input.offer} ${input.targetAudience ?? ''}`.toLowerCase();
  const fr: string[] = [];
  const en: string[] = [];

  if (/clari|clarif|positionn|différenci|formuler|clear|positioning|differen/i.test(text)) {
    fr.push("Difficulté à formuler une offre claire et différenciante.");
    en.push("Hard to articulate a clear, differentiated offer.");
  }
  if (/temps|charge|seul|solo|busy|overwhelm|bandwidth/i.test(text)) {
    fr.push("Manque de temps pour structurer le marketing en parallèle de la livraison.");
    en.push("No time to structure marketing alongside delivery.");
  }
  if (/conver|vente|sale|conversion|prospect|client|lead/i.test(text)) {
    fr.push("Trafic ou intérêt qui ne se convertit pas en demandes qualifiées.");
    en.push("Traffic or interest that doesn't convert into qualified inquiries.");
  }
  if (/preuve|crédibili|témoin|proof|credib|trust|testimon/i.test(text)) {
    fr.push("Pas assez de preuves visibles pour rassurer les prospects.");
    en.push("Not enough visible proof to reassure prospects.");
  }
  if (/prix|tarif|positionnement|premium|valeur|pric|value/i.test(text)) {
    fr.push("Hésitation sur le bon niveau de prix par rapport à la valeur perçue.");
    en.push("Uncertainty about pricing vs perceived value.");
  }

  // Always have at least 3 pain points — generic fallbacks if needed
  const fallbacksFr = [
    "Difficulté à expliquer simplement la transformation promise.",
    "Effort dispersé sur plusieurs canaux sans vue d'ensemble.",
    "Cycle de vente long avec beaucoup de friction au début.",
  ];
  const fallbacksEn = [
    "Hard to explain the promised transformation simply.",
    "Effort scattered across channels without an overview.",
    "Long sales cycle with heavy friction up front.",
  ];

  const out = lang === 'fr' ? fr : en;
  const fallbacks = lang === 'fr' ? fallbacksFr : fallbacksEn;
  for (const f of fallbacks) {
    if (out.length >= 4) break;
    if (!out.includes(f)) out.push(f);
  }
  return dedupTrim(out).slice(0, 5);
}

// -----------------------------------------------------------------------------
// Offer summary, target audience, value proposition
// -----------------------------------------------------------------------------

function summarizeOffer(input: ActionablesV1Input, lang: Lang): string {
  const offer = input.offer.trim();
  // Take the first sentence-like fragment for stability.
  const firstSentence = offer.split(/(?<=[.!?])\s+/)[0] ?? offer;
  const head = clamp(firstSentence, 240);
  const ctxFr = `${input.businessName} propose : ${head}`;
  const ctxEn = `${input.businessName} offers: ${head}`;
  return clamp(lang === 'fr' ? ctxFr : ctxEn, 500);
}

function audienceLine(input: ActionablesV1Input, lang: Lang): string {
  if (input.targetAudience && input.targetAudience.trim()) return clamp(input.targetAudience.trim(), 500);
  return lang === 'fr'
    ? 'Audience à préciser — segment non spécifié dans l\'input.'
    : 'Audience to clarify — segment not specified in input.';
}

function valueProposition(input: ActionablesV1Input, lang: Lang): string {
  const audience = audienceLine(input, lang);
  const head = clamp(input.offer.split(/(?<=[.!?])\s+/)[0] ?? input.offer, 200);
  return clamp(
    lang === 'fr'
      ? `${input.businessName} aide ${audience.toLowerCase().startsWith('audience') ? 'son audience' : audience.toLowerCase()} à passer à un cadre où : ${head}`
      : `${input.businessName} helps ${audience.toLowerCase().startsWith('audience') ? 'its audience' : audience.toLowerCase()} reach a state where: ${head}`,
    500,
  );
}

// -----------------------------------------------------------------------------
// Hooks
// -----------------------------------------------------------------------------

function buildHooks(
  input: ActionablesV1Input,
  pain: string[],
  lang: Lang,
  tone: Tone,
): ActionablesOutput['hooks'] {
  const audience = stripTrailing(input.targetAudience) || (lang === 'fr' ? 'votre audience' : 'your audience');
  const offer = input.offer.split(/(?<=[.!?])\s+/)[0] ?? input.offer;
  const offerShort = clamp(stripTrailing(offer), 120);
  const business = input.businessName;
  const opening = TONE_OPENING[tone][lang];

  const painPoint = stripTrailing(pain[0]) || (lang === 'fr' ? 'le frein actuel' : 'the current blocker');

  if (lang === 'fr') {
    return [
      { type: 'pain', text: clamp(`${opening} : ${audience} bute encore sur ${painPoint.toLowerCase()}`, 240) },
      { type: 'curiosity', text: clamp(`${business} : ce que personne ne dit sur cette offre`, 240) },
      { type: 'identity', text: clamp(`Cette offre est pensée pour ${audience}`, 240) },
      { type: 'contrarian', text: clamp(`À contre-courant : ${offerShort}`, 240) },
      { type: 'before_after', text: clamp(`Avant : ${painPoint.toLowerCase()}. Après : un cadre clair, des étapes lisibles.`, 240) },
    ];
  }
  return [
    { type: 'pain', text: clamp(`${opening}: ${audience} keeps hitting ${painPoint.toLowerCase()}`, 240) },
    { type: 'curiosity', text: clamp(`${business}: what nobody says about this offer`, 240) },
    { type: 'identity', text: clamp(`This offer is built for ${audience}`, 240) },
    { type: 'contrarian', text: clamp(`Counter-intuitive: ${offerShort}`, 240) },
    { type: 'before_after', text: clamp(`Before: ${painPoint.toLowerCase()}. After: a clear frame, readable steps.`, 240) },
  ];
}

// -----------------------------------------------------------------------------
// Offer angles
// -----------------------------------------------------------------------------

function buildAngles(
  input: ActionablesV1Input,
  pain: string[],
  lang: Lang,
  tone: Tone,
): ActionablesOutput['offer_angles'] {
  const audience = stripTrailing(input.targetAudience) || (lang === 'fr' ? "l'audience cible" : 'the target audience');
  const painLeader = stripTrailing(pain[0]) || (lang === 'fr' ? 'le frein actuel' : 'the current blocker');
  const tv = TONE_VOICE[tone][lang];

  if (lang === 'fr') {
    return [
      {
        name: 'Clarté avant scale',
        angle: `Avant de pousser plus de trafic, on rend l'offre lisible en 30 secondes. ${tv.closing}`,
        best_for: `${audience} qui sentent que leur message ne convertit pas.`,
      },
      {
        name: 'Réduction de friction',
        angle: `On enlève les obstacles qui ralentissent la décision : preuve, prix, prochaine étape.${tv.joiner}${tv.closing}`,
        best_for: `${audience} avec du trafic mais peu de demandes qualifiées.`,
      },
      {
        name: 'Statu quo coûteux',
        angle: `Continuer à improviser signifie : ${painLeader.toLowerCase()}. Le coût caché s'accumule.`,
        best_for: `${audience} qui ont déjà testé sans cadre.`,
      },
    ];
  }
  return [
    {
      name: 'Clarity before scale',
      angle: `Before pushing more traffic, make the offer readable in 30 seconds. ${tv.closing}`,
      best_for: `${audience} who feel their message doesn't convert.`,
    },
    {
      name: 'Friction reduction',
      angle: `Remove obstacles that slow the decision: proof, pricing, next step.${tv.joiner}${tv.closing}`,
      best_for: `${audience} with traffic but few qualified inquiries.`,
    },
    {
      name: 'Costly status quo',
      angle: `Improvising further means: ${painLeader.toLowerCase()}. The hidden cost compounds.`,
      best_for: `${audience} who already tried without a frame.`,
    },
  ];
}

// -----------------------------------------------------------------------------
// Objections
// -----------------------------------------------------------------------------

function buildObjections(
  input: ActionablesV1Input,
  lang: Lang,
  tone: Tone,
): ActionablesOutput['objections'] {
  const proof = stripTrailing(input.proofPoints?.[0]);
  const closing = TONE_VOICE[tone][lang].closing;

  if (lang === 'fr') {
    const items = [
      {
        objection: "C'est trop cher pour ce que j'en attends.",
        response: proof
          ? `Le coût se justifie par : ${proof}. Sinon, l'écart se creuse silencieusement.`
          : `Comparez le coût d'inaction (mois après mois) au coût d'une décision claire. ${closing}`,
      },
      {
        objection: "Je n'ai pas le temps de m'en occuper.",
        response: `Le format est conçu pour entrer dans une semaine de travail réelle, pas un trimestre théorique. ${closing}`,
      },
      {
        objection: "Comment je sais que ça va marcher pour moi ?",
        response: proof
          ? `Référence concrète : ${proof}. Vous repartez même sans engagement long.`
          : `Vous testez sur un périmètre court avant d'engager le reste. Pas d'effet tunnel.`,
      },
      {
        objection: "On a déjà essayé une solution proche, sans résultat.",
        response: `La différence n'est pas l'outil, c'est la séquence : ce qu'on attaque d'abord, ce qu'on diffère. ${closing}`,
      },
    ];
    return items;
  }
  return [
    {
      objection: 'Too expensive for what I expect.',
      response: proof
        ? `Cost is justified by: ${proof}. Otherwise the gap widens silently.`
        : `Compare the cost of inaction (month after month) to one clear decision. ${closing}`,
    },
    {
      objection: "I don't have time to handle this.",
      response: `The format is built to fit a real work week, not a theoretical quarter. ${closing}`,
    },
    {
      objection: 'How do I know it will work for me?',
      response: proof
        ? `Concrete reference: ${proof}. You walk away even without a long commitment.`
        : `You test a narrow scope before committing further. No tunnel effect.`,
    },
    {
      objection: "We tried something similar — didn't work.",
      response: `The difference isn't the tool — it's the sequence: what we tackle first, what we defer. ${closing}`,
    },
  ];
}

// -----------------------------------------------------------------------------
// CTAs
// -----------------------------------------------------------------------------

function buildCtas(input: ActionablesV1Input, lang: Lang, tone: Tone): ActionablesOutput['ctas'] {
  if (lang === 'fr') {
    const labels: Record<Tone, [string, string, string]> = {
      professional: ['Recevoir le récap en 2 minutes', 'Voir comment ça marche', 'Réserver un créneau de cadrage'],
      bold: ['Lire le résumé tout de suite', 'Voir la démo concrète', 'Bloquer un créneau maintenant'],
      friendly: ['Recevoir le récap simplement', "Découvrir comment c'est organisé", 'Échanger 20 minutes'],
      premium: ['Demander la note de synthèse', 'Découvrir le cadre', 'Programmer un entretien de cadrage'],
    };
    const [a, b, c] = labels[tone];
    return [
      { label: a, intent: 'awareness' },
      { label: b, intent: 'consideration' },
      { label: c, intent: 'decision' },
    ];
  }
  const labels: Record<Tone, [string, string, string]> = {
    professional: ['Get the 2-minute recap', 'See how it works', 'Book a scoping call'],
    bold: ['Read the recap now', 'Watch the live demo', 'Lock a slot now'],
    friendly: ['Get the recap (no fuss)', "See how it's organized", 'Chat for 20 minutes'],
    premium: ['Request the executive summary', 'Explore the frame', 'Schedule a scoping interview'],
  };
  const [a, b, c] = labels[tone];
  return [
    { label: a, intent: 'awareness' },
    { label: b, intent: 'consideration' },
    { label: c, intent: 'decision' },
  ];
}

// -----------------------------------------------------------------------------
// Social posts
// -----------------------------------------------------------------------------

const ALL_PLATFORMS: ActionablesV1Input['platforms'] = [
  'linkedin',
  'instagram',
  'facebook',
  'email',
  'landing_page',
];

function buildSocialPosts(
  input: ActionablesV1Input,
  hooks: ActionablesOutput['hooks'],
  ctas: ActionablesOutput['ctas'],
  lang: Lang,
  tone: Tone,
): ActionablesOutput['social_posts'] {
  // The endpoint accepts platforms = ['linkedin','instagram','facebook','email','landing_page'].
  // landing_page is NOT a social_post target (it has its own landing_page_sections).
  const requested = (input.platforms && input.platforms.length > 0) ? input.platforms : ['linkedin', 'email'] as const;
  const targets = requested.filter((p) => p !== 'landing_page');
  if (targets.length === 0) return [];

  const business = input.businessName;
  const audience = stripTrailing(input.targetAudience) || (lang === 'fr' ? 'votre audience' : 'your audience');
  const offerShort = clamp(stripTrailing(input.offer.split(/(?<=[.!?])\s+/)[0] ?? input.offer), 200);
  const ctaLow = ctas.find((c) => c.intent === 'awareness')!;
  const ctaHigh = ctas.find((c) => c.intent === 'decision')!;
  const closing = TONE_VOICE[tone][lang].closing;

  const seen = new Set<string>();
  const out: ActionablesOutput['social_posts'] = [];

  for (const platform of targets) {
    if (seen.has(platform)) continue;
    seen.add(platform);
    const cap = POST_CAP[platform] ?? 1000;

    let body: string;
    let cta = ctaLow.label;

    if (platform === 'linkedin') {
      cta = ctaHigh.label;
      body = lang === 'fr'
        ? [
            hooks[0]!.text,
            '',
            `Pour ${audience}.`,
            `Ce ${frQu(business)}${business} propose :`,
            `${offerShort}`,
            '',
            closing,
            '',
            `→ ${cta}.`,
          ].join('\n')
        : [
            hooks[0]!.text,
            '',
            `For ${audience}.`,
            `What ${business} offers:`,
            `${offerShort}`,
            '',
            closing,
            '',
            `→ ${cta}.`,
          ].join('\n');
    } else if (platform === 'email') {
      cta = ctaHigh.label;
      body = lang === 'fr'
        ? [
            `Sujet : ${hooks[1]!.text}`,
            '',
            `Bonjour,`,
            '',
            `${stripTrailing(hooks[0]!.text)}.`,
            '',
            `Ce ${frQu(business)}${business} propose : ${stripTrailing(offerShort)}.`,
            '',
            `${closing}`,
            '',
            `${cta} → réponse à ce mail suffit.`,
          ].join('\n')
        : [
            `Subject: ${hooks[1]!.text}`,
            '',
            `Hi,`,
            '',
            `${stripTrailing(hooks[0]!.text)}.`,
            '',
            `What ${business} offers: ${stripTrailing(offerShort)}.`,
            '',
            `${closing}`,
            '',
            `${cta} → just reply to this email.`,
          ].join('\n');
    } else if (platform === 'instagram') {
      body = lang === 'fr'
        ? [
            hooks[3]!.text,
            '',
            `${business} — ${offerShort}`,
            '',
            ctaLow.label,
          ].join('\n')
        : [
            hooks[3]!.text,
            '',
            `${business} — ${offerShort}`,
            '',
            ctaLow.label,
          ].join('\n');
    } else {
      // facebook
      body = lang === 'fr'
        ? [
            hooks[4]!.text,
            '',
            `${business} : ${offerShort}`,
            '',
            ctaLow.label,
          ].join('\n')
        : [
            hooks[4]!.text,
            '',
            `${business}: ${offerShort}`,
            '',
            ctaLow.label,
          ].join('\n');
    }

    out.push({
      platform,
      post: clamp(body, cap),
      cta: clamp(cta, 120),
    });
  }
  return out;
}

// -----------------------------------------------------------------------------
// Landing page sections (5, fixed kinds)
// -----------------------------------------------------------------------------

function buildLandingSections(
  input: ActionablesV1Input,
  pain: string[],
  ctas: ActionablesOutput['ctas'],
  lang: Lang,
  tone: Tone,
): ActionablesOutput['landing_page_sections'] {
  const business = input.businessName;
  const offerShort = clamp(stripTrailing(input.offer.split(/(?<=[.!?])\s+/)[0] ?? input.offer), 240);
  const audience = stripTrailing(input.targetAudience) || (lang === 'fr' ? 'votre audience' : 'your audience');
  const painLeader = stripTrailing(pain[0]) || (lang === 'fr' ? 'le frein actuel' : 'the current blocker');
  const proof = stripTrailing(input.proofPoints?.[0]);
  const ctaHigh = ctas.find((c) => c.intent === 'decision')!;
  const closing = TONE_VOICE[tone][lang].closing;

  if (lang === 'fr') {
    return [
      {
        section: 'hero',
        headline: clamp(`${business} — ${offerShort}`, 200),
        body: clamp(`Pensé pour ${audience}. ${closing}`, 800),
      },
      {
        section: 'problem',
        headline: clamp(`Le coût silencieux : ${painLeader}`, 200),
        body: clamp(`Sans cadre clair, le statu quo coûte plus que la décision elle-même.`, 800),
      },
      {
        section: 'solution',
        headline: clamp(`Ce ${frQu(business)}${business} change concrètement`, 200),
        body: clamp(`${offerShort} ${closing}`, 800),
      },
      {
        section: 'proof',
        headline: 'Ce qui est mesuré',
        body: clamp(
          proof
            ? `Référence : ${proof}.`
            : `Aucune métrique vérifiable n'a été fournie pour le moment. Les preuves seront ajoutées avant publication.`,
          800,
        ),
      },
      {
        section: 'cta',
        headline: clamp(ctaHigh.label, 200),
        body: clamp(`Prochaine étape claire, sans engagement long.`, 800),
      },
    ];
  }
  return [
    {
      section: 'hero',
      headline: clamp(`${business} — ${offerShort}`, 200),
      body: clamp(`Built for ${audience}. ${closing}`, 800),
    },
    {
      section: 'problem',
      headline: clamp(`The silent cost: ${painLeader}`, 200),
      body: clamp(`Without a clear frame, the status quo costs more than the decision itself.`, 800),
    },
    {
      section: 'solution',
      headline: clamp(`What ${business} actually changes`, 200),
      body: clamp(`${offerShort} ${closing}`, 800),
    },
    {
      section: 'proof',
      headline: 'What we measure',
      body: clamp(
        proof
          ? `Reference: ${proof}.`
          : `No verifiable metric provided yet. Proof will be added before publishing.`,
        800,
      ),
    },
    {
      section: 'cta',
      headline: clamp(ctaHigh.label, 200),
      body: clamp(`Clear next step, no long commitment.`, 800),
    },
  ];
}

// -----------------------------------------------------------------------------
// Confidence + warnings
// -----------------------------------------------------------------------------

function computeConfidence(
  input: ActionablesV1Input,
  pain: string[],
): { score: number; rationale: string; warnings: string[] } {
  const warnings: string[] = [];
  let score = 80;

  const hasProof = (input.proofPoints?.length ?? 0) > 0;
  if (!hasProof) {
    score = Math.min(score, 60);
    warnings.push(
      input.language === 'en'
        ? 'No proofPoints provided — confidence capped at 60. Add proofs before publishing.'
        : 'Aucun proofPoints fourni — confiance plafonnée à 60. Ajoutez des preuves avant publication.',
    );
  }

  const hasAudience = (input.targetAudience?.trim().length ?? 0) >= 10;
  if (!hasAudience) {
    score -= 10;
    warnings.push(
      input.language === 'en'
        ? 'targetAudience not specified or too short — segment under-defined.'
        : 'targetAudience non précisée ou trop courte — segment peu défini.',
    );
  }

  const hasPlatforms = (input.platforms?.length ?? 0) > 0;
  if (!hasPlatforms) {
    warnings.push(
      input.language === 'en'
        ? 'No platforms specified — using default (linkedin + email).'
        : 'Aucune plateforme spécifiée — défauts utilisés (linkedin + email).',
    );
  }

  if (input.offer.length < 60) {
    score -= 10;
    warnings.push(
      input.language === 'en'
        ? 'offer is short — diagnostic may be shallow.'
        : "offer est court — le diagnostic peut être superficiel.",
    );
  }

  // Mock cap regardless: never claim over 80 from a mock.
  score = Math.max(0, Math.min(80, score));

  const rationale = input.language === 'en'
    ? `Mock generation (deterministic). ${hasProof ? 'Proof anchors present.' : 'No proofs.'} ${hasAudience ? 'Audience defined.' : 'Audience under-defined.'}`
    : `Génération mock (déterministe). ${hasProof ? 'Ancrages preuves présents.' : 'Aucune preuve.'} ${hasAudience ? 'Audience définie.' : 'Audience peu définie.'}`;

  return { score, rationale: clamp(rationale, 400), warnings };
}

// -----------------------------------------------------------------------------
// Top-level mock builder
// -----------------------------------------------------------------------------

export function buildActionablesMock(input: ActionablesV1Input): ActionablesOutput {
  const lang = pickLang(input);
  const tone = pickTone(input);

  const pain_points = inferPainPoints(input, lang);
  const offer_summary = summarizeOffer(input, lang);
  const target_audience = audienceLine(input, lang);
  const value_proposition = valueProposition(input, lang);
  const proof_points = (input.proofPoints ?? []).map((p) => p.trim()).filter(Boolean);

  const hooks = buildHooks(input, pain_points, lang, tone);
  const offer_angles = buildAngles(input, pain_points, lang, tone);
  const objections = buildObjections(input, lang, tone);
  const ctas = buildCtas(input, lang, tone);
  const social_posts = buildSocialPosts(input, hooks, ctas, lang, tone);
  const landing_page_sections = buildLandingSections(input, pain_points, ctas, lang, tone);

  const conf = computeConfidence(input, pain_points);

  const draft: ActionablesOutput = {
    schema_version: ACTIONABLES_SCHEMA_VERSION,
    offer_summary,
    target_audience,
    pain_points,
    value_proposition,
    proof_points,
    objections,
    offer_angles,
    hooks,
    ctas,
    social_posts,
    landing_page_sections,
    confidence_score: conf.score,
    confidence_rationale: conf.rationale,
    warnings: conf.warnings,
  };

  // Anti-invention defensive scan
  const inv = checkAntiInvention(draft, input);
  if (inv.length > 0) {
    draft.warnings = [...draft.warnings, ...inv].slice(0, 20);
  }
  return draft;
}
