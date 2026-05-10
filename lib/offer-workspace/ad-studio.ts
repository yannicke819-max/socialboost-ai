/**
 * Final Ad Studio engine (AI-013).
 *
 * Pure deterministic builder. Given (offer, assets), produces a gallery of
 * finalized ad units (>=10 templates, >=3 recommended, >=1 vertical video,
 * >=1 LinkedIn B2B, >=1 conversion CTA). Reuses pack-generator structure
 * (deterministic Mulberry32) and feedback-engine.computeAudienceFit.
 *
 * Mock V1 invariants:
 *   - Same (offerId, templateId) → identical output. Different offer → different.
 *   - Source assets are NEVER mutated.
 *   - Public copy NEVER contains the word "mock" / "MOCK" — that label lives
 *     in the surrounding UI only.
 *   - Public copy is normalized to one language: the engine reads
 *     `offer.brief.language` as the source of truth (the chrome `language`
 *     prop is a fallback only). Free-text fields the user might have written
 *     in another language (`offer.brief.offer`, `offer.brief.targetAudience`)
 *     are NEVER concatenated into a public sentence — they would leak the
 *     other language. `offer.brief.businessName` (proper noun) and
 *     `proofPoints[i]` (intentional verbatim) remain reusable.
 *   - No model call, no network, no real publishing.
 *   - No rendered media: scenes/slides/email subjects are display-only strings.
 */

import type {
  AdDiffusionSelection,
  AdFormat,
  AdReadyChecklist,
  AdStatus,
  AdType,
  AdUnit,
  Asset,
  CarouselSlide,
  Offer,
  VideoScene,
} from './types';
import { computeAudienceFit } from './feedback-engine';

// -----------------------------------------------------------------------------
// PRNG / hashing (same family as the other generators).
// -----------------------------------------------------------------------------

function mulberry32(seed: number) {
  let s = seed >>> 0;
  return function next(): number {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash32(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

function pickIndex(seed: number, modulo: number): number {
  if (modulo <= 0) return 0;
  return (seed >>> 0) % modulo;
}

function shorten(text: string, max: number): string {
  const trimmed = (text ?? '').trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, Math.max(0, max - 1))}…`;
}

// -----------------------------------------------------------------------------
// Template registry. Each template emits a finalized AdUnit shape.
// Adding a template here is the only place to extend the gallery.
// -----------------------------------------------------------------------------

interface TemplateContext {
  offer: Offer;
  assetPool: Asset[];
  rand: () => number;
  language: 'fr' | 'en';
}

interface AdTemplate {
  id: string;
  type: AdType;
  format: AdFormat;
  channel: string;
  recommended: boolean;
  build: (ctx: TemplateContext) => Omit<AdUnit, 'id' | 'offerId' | 'templateId' | 'status' | 'ready_score' | 'audience_fit' | 'checklist' | 'derivedAt'>;
}

// -----------------------------------------------------------------------------
// Helpers shared by templates.
// -----------------------------------------------------------------------------

/**
 * Safe audience label. Does NOT read `offer.brief.targetAudience` (which is
 * end-user free text, often written in a different language than the brief).
 * Returns a localized generic placeholder.
 */
function audienceLabel(_offer: Offer, isEn: boolean): string {
  return isEn ? 'your audience' : 'ton audience';
}

function firstProof(offer: Offer): string | undefined {
  const p = offer.brief.proofPoints?.[0]?.trim();
  return p && p.length > 0 ? p : undefined;
}

/**
 * Localized fallback for a generic benefit line. Used when the offer has no
 * proofPoint to surface. Never reads `offer.brief.offer` (would leak the
 * other language into the shell sentence).
 */
function genericBenefit(isEn: boolean): string {
  return isEn
    ? 'A measurable change in the first week.'
    : 'Un changement mesurable dès la première semaine.';
}

function pickAsset(pool: Asset[], kind: Asset['kind']): Asset | undefined {
  return (
    pool.find((a) => a.kind === kind && a.status === 'approved') ??
    pool.find((a) => a.kind === kind)
  );
}

function pickHookAsset(pool: Asset[]): Asset | undefined {
  const hook = pickAsset(pool, 'hook');
  if (hook) return hook;
  return pool.find((a) => a.status === 'approved') ?? pool[0];
}

function videoScenes(args: {
  hook: string;
  problem: string;
  proofOrBenefit: string;
  cta: string;
}): VideoScene[] {
  return [
    {
      startSec: 0,
      endSec: 3,
      visual: 'Plan rapproché, mouvement naturel.',
      voice: args.hook,
      onScreen: shorten(args.hook, 60),
      intent: 'Capter en moins de 3 secondes.',
    },
    {
      startSec: 3,
      endSec: 8,
      visual: "Visualisation du problème quotidien de l'audience.",
      voice: args.problem,
      onScreen: shorten(args.problem, 80),
      intent: 'Faire reconnaître le frein.',
    },
    {
      startSec: 8,
      endSec: 15,
      visual: 'Démo / preuve / transformation visible à l\'écran.',
      voice: args.proofOrBenefit,
      onScreen: shorten(args.proofOrBenefit, 80),
      intent: 'Prouver la promesse.',
    },
    {
      startSec: 15,
      endSec: 20,
      visual: 'Bouton clair, contraste fort.',
      voice: args.cta,
      onScreen: shorten(args.cta, 40),
      intent: 'Inviter à une action unique.',
    },
  ];
}

// -----------------------------------------------------------------------------
// Templates. 10 entries — every AdType + the spec-required formats.
// -----------------------------------------------------------------------------

const TEMPLATES: AdTemplate[] = [
  // 1) Product promo video — vertical 9:16 — TikTok / Reels.
  {
    id: 'product_promo_vertical',
    type: 'product_promo_video',
    format: '9:16',
    channel: 'tiktok',
    recommended: true,
    build: ({ offer, assetPool, language }) => {
      const isEn = language === 'en';
      const audience = audienceLabel(offer, isEn);
      const proof = firstProof(offer);
      const hookAsset = pickHookAsset(assetPool);
      // Only reuse a hook asset if the offer language matches — otherwise the
      // generic localized opener wins.
      const hookAssetMatches = hookAsset?.body && offer.language === language;
      const hook = hookAssetMatches
        ? shorten(hookAsset!.body.split('\n')[0] ?? '', 70)
        : isEn
          ? `Stop scrolling, ${audience}.`
          : `Stoppe le scroll, ${audience}.`;
      const problem = isEn
        ? `If you sound like everyone else, you fade. Here is what changed for ${audience}.`
        : `Si tu sonnes comme tout le monde, tu disparais. Voici ce qui change pour ${audience}.`;
      const proofOrBenefit = proof ?? genericBenefit(isEn);
      const cta = isEn ? 'Tap the link below.' : 'Clique le lien en bas.';
      const hookFinal = shorten(hook, 90);
      const copy = `${hookFinal}\n\n${problem}\n\n${proofOrBenefit}\n\n${cta}`;
      return {
        type: 'product_promo_video',
        format: '9:16',
        channel: 'tiktok',
        name: isEn ? 'Product promo · vertical 20s' : 'Promo produit · vertical 20s',
        objective: isEn ? 'Capture attention and drive a click in 20 seconds.' : 'Capter et générer un clic en 20 secondes.',
        hook: hookFinal,
        copy,
        cta,
        scenes: videoScenes({ hook: hookFinal, problem, proofOrBenefit, cta }),
        sourceAssetId: hookAssetMatches ? hookAsset!.id : undefined,
        tags: ['format:9:16', 'channel:tiktok', 'pillar:education'],
      };
    },
  },

  // 2) SaaS demo video — landscape 16:9 — YouTube / landing.
  {
    id: 'saas_demo_landscape',
    type: 'saas_demo_video',
    format: '16:9',
    channel: 'youtube',
    recommended: false,
    build: ({ offer, language }) => {
      const isEn = language === 'en';
      const audience = audienceLabel(offer, isEn);
      const proof = firstProof(offer);
      // businessName is a proper noun → safe to reuse verbatim in any shell.
      const hook = isEn
        ? `${audience}: see ${offer.brief.businessName} in 30 seconds.`
        : `${audience} : voir ${offer.brief.businessName} en 30 secondes.`;
      const problem = isEn
        ? `Your tool works, but the demo lasts 12 minutes. Here is the 30-second version.`
        : `L'outil fonctionne, mais la démo dure 12 minutes. Voici la version 30 secondes.`;
      const proofOrBenefit = proof ?? (isEn
        ? `Three core actions on screen, no jargon.`
        : `Trois actions clés à l\'écran, sans jargon.`);
      const cta = isEn ? 'Book a 15-minute walkthrough.' : 'Réserve une démo de 15 minutes.';
      const copy = `${hook}\n\n${problem}\n\n${proofOrBenefit}\n\n${cta}`;
      return {
        type: 'saas_demo_video',
        format: '16:9',
        channel: 'youtube',
        name: isEn ? 'SaaS demo · landscape 30s' : 'Démo SaaS · paysage 30s',
        objective: isEn ? 'Replace a 12-min demo with a 30s one.' : 'Remplacer une démo 12 minutes par une 30 secondes.',
        hook: shorten(hook, 90),
        copy,
        cta,
        scenes: videoScenes({ hook, problem, proofOrBenefit, cta }),
        tags: ['format:16:9', 'channel:youtube', 'pillar:education'],
      };
    },
  },

  // 3) UGC testimonial style — vertical 9:16 — Instagram / TikTok.
  {
    id: 'ugc_testimonial_vertical',
    type: 'ugc_testimonial',
    format: '9:16',
    channel: 'instagram',
    recommended: true,
    build: ({ offer, language }) => {
      const isEn = language === 'en';
      const proof = firstProof(offer);
      const hook = isEn
        ? `I almost gave up on ${offer.brief.businessName}. Then this happened.`
        : `J\'ai failli abandonner ${offer.brief.businessName}. Puis voilà ce qui est arrivé.`;
      const problem = isEn
        ? `I tried three other ways before. Nothing held up under real workload.`
        : `J\'avais essayé trois autres méthodes avant. Aucune ne tenait sous la vraie charge de travail.`;
      const proofOrBenefit = proof
        ? proof
        : isEn
          ? `Honest take: it worked the same week.`
          : `Honnêtement : ça a marché dès la même semaine.`;
      const cta = isEn ? 'Try it for one week.' : 'Essaye-le pendant une semaine.';
      const copy = `${hook}\n\n${problem}\n\n${proofOrBenefit}\n\n${cta}`;
      return {
        type: 'ugc_testimonial',
        format: '9:16',
        channel: 'instagram',
        name: isEn ? 'UGC testimonial · vertical' : 'UGC témoignage · vertical',
        objective: isEn ? 'Build trust through a peer voice.' : 'Construire la confiance par une voix pair-à-pair.',
        hook: shorten(hook, 90),
        copy,
        cta,
        scenes: videoScenes({ hook, problem, proofOrBenefit, cta }),
        tags: ['format:9:16', 'channel:instagram', 'pillar:proof'],
      };
    },
  },

  // 4) Before / After transformation — 1:1 square.
  {
    id: 'before_after_square',
    type: 'before_after',
    format: '1:1',
    channel: 'instagram',
    recommended: true,
    build: ({ offer, language }) => {
      const isEn = language === 'en';
      const proof = firstProof(offer);
      const hook = isEn
        ? `Before: noisy. After: a clear next step.`
        : `Avant : bruyant. Après : une étape claire.`;
      const problem = isEn
        ? `Most write five offers and pick none.`
        : `Beaucoup écrivent cinq offres et n\'en choisissent aucune.`;
      const proofOrBenefit = proof ?? genericBenefit(isEn);
      const cta = isEn ? 'See the side-by-side.' : 'Voir le avant / après.';
      const copy = `${hook}\n\n${problem}\n\n${proofOrBenefit}\n\n${cta}`;
      return {
        type: 'before_after',
        format: '1:1',
        channel: 'instagram',
        name: isEn ? 'Before / after · square' : 'Avant / après · carré',
        objective: isEn ? 'Make the transformation visible at a glance.' : "Rendre la transformation lisible d'un coup d'œil.",
        hook: shorten(hook, 80),
        copy,
        cta,
        tags: ['format:1:1', 'channel:instagram', 'pillar:proof'],
      };
    },
  },

  // 5) Launch announcement — LinkedIn post.
  {
    id: 'launch_linkedin',
    type: 'launch_announcement',
    format: 'linkedin',
    channel: 'linkedin',
    recommended: false,
    build: ({ offer, language }) => {
      const isEn = language === 'en';
      const audience = audienceLabel(offer, isEn);
      const proof = firstProof(offer);
      // businessName is a proper noun. We never inline brief.offer here:
      // it is end-user free text and may be in another language.
      const hook = isEn
        ? `Today, ${offer.brief.businessName} ships a new version.`
        : `Aujourd\'hui, ${offer.brief.businessName} lance une nouvelle version.`;
      const body = isEn
        ? `Built for ${audience}.\n\nWhat is new:\n• Clear scope\n• Honest metric\n• Single next step\n\n${proof ?? genericBenefit(true)}`
        : `Pensée pour ${audience}.\n\nCe qui change :\n• Cadre clair\n• Métrique honnête\n• Une seule étape suivante\n\n${proof ?? genericBenefit(false)}`;
      const cta = isEn ? 'Book a 20-min scoping call.' : 'Réserver un appel de cadrage de 20 min.';
      const copy = `${hook}\n\n${body}\n\n${cta}`;
      return {
        type: 'launch_announcement',
        format: 'linkedin',
        channel: 'linkedin',
        name: isEn ? 'Launch · LinkedIn' : 'Lancement · LinkedIn',
        objective: isEn ? 'Announce credibly to the existing network.' : 'Annoncer avec crédibilité au réseau existant.',
        hook: shorten(hook, 110),
        copy,
        cta,
        tags: ['format:linkedin', 'channel:linkedin', 'pillar:education'],
      };
    },
  },

  // 6) Objection breaker — 1:1 — Meta / Instagram.
  {
    id: 'objection_breaker_square',
    type: 'objection_breaker',
    format: '1:1',
    channel: 'meta',
    recommended: false,
    build: ({ offer, language, assetPool }) => {
      const isEn = language === 'en';
      const objAsset = pickAsset(assetPool, 'objection');
      // Only lift verbatim user-written objections when the offer language
      // matches the public output language — otherwise fall back to a fully
      // localized line.
      const langMatches = offer.language === language;
      const objText = langMatches
        ? objAsset?.body?.split('\n').filter(Boolean)[0]?.replace(/^[«"']|[»"']$/g, '')
        : undefined;
      const hook = isEn
        ? `"Too expensive" — really?`
        : `« Trop cher » — vraiment ?`;
      const problem = objText && objText.length > 0
        ? objText
        : isEn
          ? `The cost is the surface. The cost of staying stuck is the iceberg.`
          : `Le prix, c\'est la surface. Le coût de rester bloqué, c\'est l\'iceberg.`;
      const proofOrBenefit = firstProof(offer) ?? (isEn
        ? 'Three weeks saved on average — this is the math.'
        : 'Trois semaines gagnées en moyenne — c\'est ça, le calcul.');
      const cta = isEn ? 'See the math.' : 'Voir le calcul.';
      const copy = `${hook}\n\n${problem}\n\n${proofOrBenefit}\n\n${cta}`;
      return {
        type: 'objection_breaker',
        format: '1:1',
        channel: 'meta',
        name: isEn ? 'Objection breaker · square' : 'Lève-objection · carré',
        objective: isEn ? 'Address the most common doubt head-on.' : 'Adresser le doute le plus fréquent de front.',
        hook: shorten(hook, 80),
        copy,
        cta,
        sourceAssetId: langMatches ? objAsset?.id : undefined,
        tags: ['format:1:1', 'channel:meta', 'pillar:objection'],
      };
    },
  },

  // 7) LinkedIn carousel — 5 slides.
  {
    id: 'linkedin_carousel_5',
    type: 'linkedin_carousel',
    format: 'carousel',
    channel: 'linkedin',
    recommended: true,
    build: ({ offer, language }) => {
      const isEn = language === 'en';
      const audience = audienceLabel(offer, isEn);
      const proof = firstProof(offer);
      const slides: CarouselSlide[] = [
        {
          index: 1,
          headline: isEn
            ? `${offer.brief.businessName}: 5 things ${audience} miss`
            : `${offer.brief.businessName} : 5 choses que ${audience} rate`,
          body: isEn ? 'Swipe → ' : 'Glisse → ',
        },
        {
          index: 2,
          headline: isEn ? '1 — The offer is unclear' : '1 — L\'offre n\'est pas claire',
          body: isEn ? 'Five sentences, none of them yours.' : 'Cinq phrases, aucune n\'est vraiment la tienne.',
        },
        {
          index: 3,
          headline: isEn ? '2 — The proof is hidden' : '2 — La preuve est cachée',
          body: proof ?? (isEn ? 'No verifiable result on the landing.' : 'Aucun résultat vérifiable sur la landing.'),
        },
        {
          index: 4,
          headline: isEn ? '3 — The CTA forks' : '3 — Le CTA se divise',
          body: isEn ? 'Three buttons = no decision.' : 'Trois boutons = aucune décision.',
        },
        {
          index: 5,
          headline: isEn ? 'Want the audit?' : 'Tu veux l\'audit ?',
          body: isEn ? 'Comment "audit" — I send the checklist.' : 'Commente « audit » — je t\'envoie la checklist.',
        },
      ];
      const hook = slides[0]!.headline;
      const cta = slides[4]!.headline;
      const copy = slides
        .map((s) => `Slide ${s.index} — ${s.headline}\n${s.body}`)
        .join('\n\n');
      return {
        type: 'linkedin_carousel',
        format: 'carousel',
        channel: 'linkedin',
        name: isEn ? 'LinkedIn carousel · 5 slides' : 'Carousel LinkedIn · 5 slides',
        objective: isEn ? 'Educate B2B network and capture replies.' : 'Éduquer le réseau B2B et capter les réponses.',
        hook: shorten(hook, 110),
        copy,
        cta,
        slides,
        tags: ['format:carousel', 'channel:linkedin', 'pillar:education'],
      };
    },
  },

  // 8) Static Meta ad — 1:1.
  {
    id: 'static_meta_square',
    type: 'static_meta',
    format: '1:1',
    channel: 'meta',
    recommended: false,
    build: ({ offer, language }) => {
      const isEn = language === 'en';
      const audience = audienceLabel(offer, isEn);
      const proof = firstProof(offer);
      const hook = isEn
        ? `For ${audience}: the offer that finally fits.`
        : `Pour ${audience} : l\'offre qui colle enfin.`;
      const proofLine = proof ?? (isEn ? 'Tested with real customers.' : 'Testé sur de vrais clients.');
      const cta = isEn ? 'Read the page.' : 'Lire la page.';
      const copy = `${hook}\n\n${proofLine}\n\n${cta}`;
      return {
        type: 'static_meta',
        format: '1:1',
        channel: 'meta',
        name: isEn ? 'Static ad · square' : 'Annonce statique · carré',
        objective: isEn ? 'A simple, scannable promise + proof.' : 'Une promesse + une preuve, lisibles d\'un coup.',
        hook: shorten(hook, 80),
        copy,
        cta,
        tags: ['format:1:1', 'channel:meta', 'pillar:education'],
      };
    },
  },

  // 9) TikTok / Reels short script — vertical 9:16 — required hook in 0-3s.
  {
    id: 'tiktok_reels_short',
    type: 'tiktok_reels_short',
    format: '9:16',
    channel: 'tiktok',
    recommended: false,
    build: ({ offer, language, assetPool }) => {
      const isEn = language === 'en';
      const audience = audienceLabel(offer, isEn);
      const hookAsset = pickHookAsset(assetPool);
      const hookAssetMatches = hookAsset?.body && offer.language === language;
      const hook = hookAssetMatches
        ? shorten(hookAsset!.body.split('\n')[0] ?? '', 70)
        : isEn
          ? `${audience}, this is the part nobody tells you.`
          : `${audience}, voilà ce que personne ne te dit.`;
      const problem = isEn
        ? `Most playbooks were not written for ${audience}.`
        : `Les méthodes ne sont pas pensées pour ${audience}.`;
      const proofOrBenefit = firstProof(offer) ?? genericBenefit(isEn);
      const cta = isEn ? 'Save this for later.' : 'Enregistre-le, tu en auras besoin.';
      const copy = `${hook}\n\n${problem}\n\n${proofOrBenefit}\n\n${cta}`;
      return {
        type: 'tiktok_reels_short',
        format: '9:16',
        channel: 'tiktok',
        name: isEn ? 'TikTok / Reels · short script' : 'TikTok / Reels · script court',
        objective: isEn ? 'Native short, zero corporate tone.' : 'Court natif, zéro ton corporate.',
        hook: shorten(hook, 80),
        copy,
        cta,
        scenes: videoScenes({ hook, problem, proofOrBenefit, cta }),
        sourceAssetId: hookAssetMatches ? hookAsset!.id : undefined,
        tags: ['format:9:16', 'channel:tiktok', 'pillar:education'],
      };
    },
  },

  // 10) YouTube short ad — vertical 9:16 — but distinct template.
  {
    id: 'youtube_short_ad',
    type: 'youtube_short_ad',
    format: '9:16',
    channel: 'youtube',
    recommended: false,
    build: ({ offer, language }) => {
      const isEn = language === 'en';
      const audience = audienceLabel(offer, isEn);
      const proof = firstProof(offer);
      const hook = isEn
        ? `Skip-able in 5 seconds. Here is the only thing that matters.`
        : `Skippable en 5 secondes. Voilà ce qui compte.`;
      const problem = isEn
        ? `If you are part of ${audience}, you have heard everything. Try this once.`
        : `Si tu fais partie de ${audience}, tu as tout entendu. Essaye une fois.`;
      const proofOrBenefit = proof ?? genericBenefit(isEn);
      const cta = isEn ? 'Visit the link.' : 'Va voir le lien.';
      const copy = `${hook}\n\n${problem}\n\n${proofOrBenefit}\n\n${cta}`;
      return {
        type: 'youtube_short_ad',
        format: '9:16',
        channel: 'youtube',
        name: isEn ? 'YouTube Short · ad' : 'YouTube Short · pub',
        objective: isEn ? 'Survive the 5-second skip.' : 'Survivre au skip à 5 secondes.',
        hook: shorten(hook, 80),
        copy,
        cta,
        scenes: videoScenes({ hook, problem, proofOrBenefit, cta }),
        tags: ['format:9:16', 'channel:youtube', 'pillar:education'],
      };
    },
  },

  // 11) Email promo — required for spec coverage of the 'email' format.
  {
    id: 'email_promo',
    type: 'launch_announcement',
    format: 'email',
    channel: 'email',
    recommended: false,
    build: ({ offer, language }) => {
      const isEn = language === 'en';
      const audience = audienceLabel(offer, isEn);
      const proof = firstProof(offer);
      const subject = isEn
        ? `${offer.brief.businessName}: a 20-minute path for ${audience}`
        : `${offer.brief.businessName} : un raccourci de 20 minutes pour ${audience}`;
      const preheader = isEn
        ? 'No upsell. One concrete next step.'
        : 'Pas de relance commerciale. Une seule étape concrète.';
      const hook = subject;
      const body = isEn
        ? `Hi,\n\nIf you read everything about ${offer.brief.businessName} and still wonder what to do first, here is a clean version.\n\n${proof ?? genericBenefit(true)}\n\nBook a 20-minute slot below.\n\n— ${offer.brief.businessName}`
        : `Bonjour,\n\nSi tu as tout lu sur ${offer.brief.businessName} et que tu ne sais pas par où commencer, voici une version propre.\n\n${proof ?? genericBenefit(false)}\n\nRéserve un créneau de 20 minutes ci-dessous.\n\n— ${offer.brief.businessName}`;
      const cta = isEn ? 'Book a 20-minute slot.' : 'Réserver un créneau de 20 minutes.';
      const copy = `${subject}\n\n${preheader}\n\n${body}\n\n${cta}`;
      return {
        type: 'launch_announcement',
        format: 'email',
        channel: 'email',
        name: isEn ? 'Email promo · launch' : 'Email promo · lancement',
        objective: isEn ? 'Convert warm list to a scoping call.' : 'Convertir la liste tiède en appel de cadrage.',
        hook: shorten(hook, 90),
        copy,
        cta,
        emailSubject: subject,
        emailPreheader: preheader,
        tags: ['format:email', 'channel:email', 'pillar:conversion'],
      };
    },
  },
];

// -----------------------------------------------------------------------------
// Public engine API.
// -----------------------------------------------------------------------------

export interface BuildAdGalleryInput {
  offer: Offer;
  assets: Asset[];
  /**
   * Chrome UI fallback. The engine prefers `offer.brief.language` when set;
   * this prop is only consumed if the brief language is missing/invalid.
   */
  language?: 'fr' | 'en';
  /** Defaults to "now" but accepts a fixed value for tests. */
  derivedAt?: string;
}

/**
 * Resolve the public output language for an offer. Source of truth is
 * `offer.brief.language`; `fallback` is consulted only if the brief is silent.
 */
function resolveOutputLanguage(offer: Offer, fallback: 'fr' | 'en' = 'fr'): 'fr' | 'en' {
  const fromBrief = (offer.brief as { language?: unknown }).language;
  if (fromBrief === 'fr' || fromBrief === 'en') return fromBrief;
  if (offer.language === 'fr' || offer.language === 'en') return offer.language;
  return fallback;
}

/**
 * Build the ad gallery from offer + assets. Returns a list of finalized
 * AdUnits with stable ids `${offerId}:${templateId}`. Determinism:
 * same (offerId, templateId) → identical output.
 *
 * The output language is read from `offer.brief.language`. The chrome
 * `language` prop is only a fallback when the brief is silent.
 */
export function buildAdGallery(input: BuildAdGalleryInput): AdUnit[] {
  const { offer, assets, derivedAt } = input;
  const language = resolveOutputLanguage(offer, input.language ?? 'fr');
  const stamp = derivedAt ?? new Date().toISOString();
  const out: AdUnit[] = [];
  for (const tpl of TEMPLATES) {
    const seed = hash32(`${offer.id}|${tpl.id}|${language}`);
    const rand = mulberry32(seed);
    const built = tpl.build({ offer, assetPool: assets, rand, language });
    const id = `${offer.id}:${tpl.id}`;
    const checklist = computeChecklist({
      offer,
      hook: built.hook,
      copy: built.copy,
      cta: built.cta,
      format: tpl.format,
      channel: tpl.channel,
      hasScenes: !!(built.scenes && built.scenes.length > 0),
      language,
    });
    const audience_fit = computeAdAudienceFit(offer, built.copy, tpl.channel);
    const ready_score = computeReadyScore(checklist, audience_fit);
    out.push({
      id,
      offerId: offer.id,
      templateId: tpl.id,
      type: built.type,
      format: built.format,
      channel: built.channel,
      name: built.name,
      objective: built.objective,
      hook: built.hook,
      copy: built.copy,
      cta: built.cta,
      scenes: built.scenes,
      slides: built.slides,
      emailSubject: built.emailSubject,
      emailPreheader: built.emailPreheader,
      sourceAssetId: built.sourceAssetId,
      status: 'draft',
      ready_score,
      audience_fit,
      checklist,
      tags: built.tags,
      derivedAt: stamp,
    });
  }
  return out;
}

/** Return the recommended subset (≥3 ads) for "Mode Simple". */
export function recommendedAds(units: AdUnit[]): AdUnit[] {
  const recIds = new Set(TEMPLATES.filter((t) => t.recommended).map((t) => t.id));
  const recommended = units.filter((u) => recIds.has(u.templateId));
  if (recommended.length >= 3) return recommended;
  // Fallback: top-N by ready_score so we always offer ≥3.
  return [...units].sort((a, b) => b.ready_score - a.ready_score).slice(0, 3);
}

/**
 * Pure: compute the 8-item readiness checklist from the public copy.
 * No state, no randomness.
 *
 * The `language` argument is the public output language (resolved upstream
 * from `offer.brief.language`). `language_consistency` is checked against it.
 */
export function computeChecklist(input: {
  offer: Offer;
  hook: string;
  copy: string;
  cta: string;
  format: AdFormat;
  channel: string;
  hasScenes: boolean;
  language?: 'fr' | 'en';
}): AdReadyChecklist {
  const { offer, hook, copy, cta, format, channel, hasScenes, language } = input;
  const lower = `${hook}\n${copy}\n${cta}`.toLowerCase();
  const proofs = (offer.brief.proofPoints ?? []).map((p) => p.toLowerCase());
  const promiseWords = (offer.brief.offer ?? '')
    .toLowerCase()
    .split(/[^a-zA-Zàâäéèêëïîôöùûüç]+/i)
    .filter((w) => w.length >= 4);
  const ctaWords = cta.split(/\s+/).filter(Boolean).length;
  const hookLength = hook.length;
  // 1) Hook in first 3 seconds (vertical/short formats use scenes; otherwise a tight hook ≤90 char counts).
  const hookIn3s = hasScenes ? hookLength > 0 && hookLength <= 90 : hookLength > 0 && hookLength <= 110;
  // 2) Legible without sound: video templates always emit on-screen text via scenes.
  // For non-video formats, "legible without sound" simplifies to "copy is text".
  const legibleWithoutSound = hasScenes ? true : copy.trim().length > 0;
  // 3) Single clear CTA: cta is non-empty AND ≤9 words AND no "or" disjunction inside.
  const singleCta = ctaWords > 0 && ctaWords <= 9 && !/\bor\b|\bou\b/i.test(cta);
  // 4) Explicit benefit: copy must echo at least one promise word from the brief.
  // When the brief language differs from the public language, the promise words
  // are written in the wrong language — skip this check rather than fail it.
  const briefLang =
    (offer.brief as { language?: unknown }).language === 'en' ? 'en' : 'fr';
  const briefMatchesPublic = !language || briefLang === language;
  const explicitBenefit = briefMatchesPublic
    ? promiseWords.some((w) => lower.includes(w)) ||
      /\b(method|result|change|gain|measur|improve|méthode|résultat|change|gagné|mesur)/i.test(lower)
    : /\b(method|result|change|gain|measur|improve|méthode|résultat|gagné|mesur)/i.test(lower);
  // 5) Proof or credibility: copy contains a verbatim proof OR a credibility cue.
  const hasProof =
    proofs.length > 0
      ? proofs.some((p) => p && lower.includes(p))
      : /témoignage|preuve|résultat|case study|outcome|tested|testé/.test(lower);
  // 6) Format fits channel.
  const fits = formatFitsChannel(format, channel);
  // 7) No "mock" leak in public copy.
  const noMock = !/mock\b/i.test(`${hook}\n${copy}\n${cta}`);
  // 8) Language consistency between the public output language and the copy.
  const consistent = checkLanguageConsistency(`${hook}\n${copy}\n${cta}`, language ?? briefLang);
  return {
    hook_in_first_3s: hookIn3s,
    legible_without_sound: legibleWithoutSound,
    single_clear_cta: singleCta,
    explicit_benefit: explicitBenefit,
    proof_or_credibility: hasProof,
    format_fits_channel: fits,
    no_mock_leak_in_public_copy: noMock,
    language_consistency: consistent,
  };
}

/**
 * Detect a cross-language leak in the public copy. Heuristic: count signal
 * words distinctive of FR vs EN. A single signal from the wrong language is
 * tolerated (proper nouns, brand names slip in); two or more or a strong
 * clause-opener like "today" / "aujourd'hui" in the wrong shell triggers a
 * fail.
 */
export function checkLanguageConsistency(text: string, language: 'fr' | 'en'): boolean {
  const lower = text.toLowerCase();
  // Words that almost only appear in one language. We avoid ambiguous tokens
  // like "for" (English "for" vs French "for-" prefix).
  const FR_SIGNALS =
    /\b(aujourd'hui|voici|réserver?|réserve|cliquer?|cadrage|créneau|enregistre|skippable|raccourci|pensée|choses|preuve|preuves|annonce|brouillon|prête|sélectionnée|pour |tu |ton |ta |tes |essaye|commente|nouvelle version|crédibilité|étape|carré|paysage|vidéo|témoignage|résultat|résultats|méthode|gagnées?|sans son|sans jargon)\b/g;
  const EN_SIGNALS =
    /\b(today|here is|here are|book a |tap the |tap |try this|try it|stop scrolling|skip-able|skip able|skip the|your audience|your icp|the offer|the cta|swipe|comment "audit"|on screen|side-by-side|next step|read everything|wonder what|see the|visit the|short version|honest metric|clear scope)\b/g;
  const fr = (lower.match(FR_SIGNALS) ?? []).length;
  const en = (lower.match(EN_SIGNALS) ?? []).length;
  // Strict: a single distinctive signal from the wrong language is a leak.
  // The signal lists above are deliberately narrow (multi-word patterns and
  // unambiguous function words) so single hits are not false positives.
  if (language === 'fr' && en >= 1) return false;
  if (language === 'en' && fr >= 1) return false;
  return true;
}

function formatFitsChannel(format: AdFormat, channel: string): boolean {
  const c = channel.toLowerCase();
  if (format === 'linkedin' || format === 'carousel') return c === 'linkedin';
  if (format === 'email') return c === 'email';
  if (format === '9:16') return ['tiktok', 'instagram', 'youtube', 'reels'].includes(c);
  if (format === '1:1') return ['instagram', 'meta', 'facebook'].includes(c);
  if (format === '16:9') return ['youtube', 'landing', 'web'].includes(c);
  return true;
}

/**
 * Ready score blends the checklist (70%) with audience fit (30%).
 *
 * AI-013 hardening: a failing `language_consistency` check is a blocker for
 * "ready to ship" and the score is hard-capped at 50 — visually demoting the
 * ad below the "Mark ready" threshold even if every other check passes.
 */
export function computeReadyScore(
  checklist: AdReadyChecklist,
  audience_fit: number,
): number {
  const items = Object.values(checklist) as boolean[];
  const passed = items.filter(Boolean).length;
  const checklistPct = (passed / items.length) * 100;
  const blended = Math.round(checklistPct * 0.7 + audience_fit * 0.3);
  if (!checklist.language_consistency) return clamp(Math.min(50, blended));
  return clamp(blended);
}

function computeAdAudienceFit(offer: Offer, copy: string, channel: string): number {
  // Reuse the AI-011 heuristic by feeding it a synthetic slot/asset shape.
  return computeAudienceFit({
    offer,
    plan: {
      id: 'virtual',
      offerId: offer.id,
      weekStart: '0000-00-00',
      goal: 'visibility',
      slots: [],
      createdAt: '',
      updatedAt: '',
    },
    slot: {
      id: 'virtual',
      dayIndex: 0,
      suggestedTime: '00:00',
      channel,
      pillar: 'education',
      objective: '',
      hook: '',
      status: 'draft',
    },
    asset: {
      id: 'virtual',
      offerId: offer.id,
      kind: 'social_post',
      body: copy,
      dimensions: ['asset', 'channel'],
      status: 'approved',
      source: 'mock',
      createdAt: '',
    },
  });
}

// -----------------------------------------------------------------------------
// Persisted reconcile: keep user statuses across re-derivation.
// -----------------------------------------------------------------------------

export function reconcileAdUnits(derived: AdUnit[], stored: AdUnit[]): AdUnit[] {
  const previous = new Map(stored.map((u) => [u.id, u] as const));
  return derived.map((u) => {
    const prev = previous.get(u.id);
    return prev
      ? { ...u, status: prev.status }
      : u;
  });
}

// -----------------------------------------------------------------------------
// Text exports: clean copy + diffusion brief.
// -----------------------------------------------------------------------------

export function adToCleanText(ad: AdUnit, language: 'fr' | 'en' = 'fr'): string {
  const isEn = language === 'en';
  const lines: string[] = [];
  if (ad.format === 'email') {
    lines.push(`${isEn ? 'Subject' : 'Objet'}: ${ad.emailSubject ?? ad.hook}`);
    if (ad.emailPreheader) lines.push(`${isEn ? 'Preheader' : 'Préheader'}: ${ad.emailPreheader}`);
    lines.push('');
    lines.push(ad.copy);
  } else if (ad.format === 'carousel' && ad.slides) {
    for (const s of ad.slides) {
      lines.push(`${isEn ? 'Slide' : 'Slide'} ${s.index} — ${s.headline}`);
      lines.push(s.body);
      lines.push('');
    }
  } else if (ad.scenes && ad.scenes.length > 0) {
    lines.push(ad.copy);
  } else {
    lines.push(ad.copy);
  }
  return lines.join('\n').trim();
}

export function adToDiffusionBrief(ad: AdUnit, language: 'fr' | 'en' = 'fr'): string {
  const isEn = language === 'en';
  const lines: string[] = [];
  lines.push(isEn ? `# Diffusion brief — ${ad.name}` : `# Brief diffusion — ${ad.name}`);
  lines.push(`${isEn ? 'Format' : 'Format'}: ${ad.format}`);
  lines.push(`${isEn ? 'Channel' : 'Canal'}: ${ad.channel}`);
  lines.push(`${isEn ? 'Objective' : 'Objectif'}: ${ad.objective}`);
  lines.push(`${isEn ? 'Hook' : 'Hook'}: ${ad.hook}`);
  lines.push(`${isEn ? 'CTA' : 'CTA'}: ${ad.cta}`);
  lines.push(`${isEn ? 'Ready score' : 'Score prêt à diffuser'}: ${ad.ready_score}/100`);
  lines.push('');
  lines.push(adToCleanText(ad, language));
  return lines.join('\n');
}

// -----------------------------------------------------------------------------
// Diffusion selection helper (pure id format).
// -----------------------------------------------------------------------------

export function diffusionSelectionId(offerId: string, adId: string): string {
  return `${offerId}:${adId}`;
}

// Re-export the registry length for test sanity.
export const AD_TEMPLATES_COUNT = TEMPLATES.length;
