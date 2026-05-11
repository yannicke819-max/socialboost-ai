/**
 * Creative Brief Engine v1 — pure module (AI-017A).
 *
 * Transforms an Offer (and an optional pre-built PromptVersion) into a
 * `CreativeBriefPack`: a structured, copy-ready set of image prompts,
 * video prompts, and a 15s storyboard, plus the production guardrails.
 *
 * Hard rules:
 *   - Pure: no `fetch`, no `process.env`, no `Date.now()` in output.
 *     Same input → byte-identical output. Tests can run without env.
 *   - No real image / video provider call. The engine emits PROMPTS
 *     ready for a human to copy into a media model of their choice. The
 *     pack carries `mediaProviderCallAllowed: false` and the literal
 *     notice "Aucun modèle image ou vidéo n'a été lancé".
 *   - Free hard rule preserved: `providerCallAllowed` and
 *     `adminCostAllowed` are both `false` on every pack, regardless of
 *     plan.
 *   - Deterministic seeding via FNV-1a + Mulberry32 (same family used
 *     by ad-studio, feedback-engine, analytics-mock).
 *
 * Guardrails baked into the prompts:
 *   - No celebrity likeness, copyrighted characters, third-party brand
 *     logos, medical / financial claims, before-after gimmicks,
 *     deceptive transformations, or chain-of-thought tokens.
 *   - The on-screen text must be original; the engine refuses to copy
 *     verbatim from any external inspiration the prompt orchestrator
 *     may have surfaced upstream.
 */

import type { Offer } from './types';
import {
  CREATIVE_RULES_BY_TIER,
  type CreativeQualityTier,
} from './creative-quality-tiers';

// -----------------------------------------------------------------------------
// Public types
// -----------------------------------------------------------------------------

export const CREATIVE_PLATFORM_FORMATS = [
  'instagram_square', // 1:1
  'instagram_portrait', // 4:5
  'tiktok_reel', // 9:16
  'linkedin_feed', // 1.91:1
  'story_vertical', // 9:16
] as const;
export type CreativePlatformFormat = (typeof CREATIVE_PLATFORM_FORMATS)[number];

/** Aspect ratio table for renderers / docs. Pure data. */
export const PLATFORM_FORMAT_ASPECT_RATIO: Record<CreativePlatformFormat, string> = {
  instagram_square: '1:1',
  instagram_portrait: '4:5',
  tiktok_reel: '9:16',
  linkedin_feed: '1.91:1',
  story_vertical: '9:16',
};

export interface CreativeImagePrompt {
  id: string;
  title: string;
  platformFormat: CreativePlatformFormat;
  scene: string;
  subject: string;
  composition: string;
  lighting: string;
  style: string;
  textOverlay: string;
  prompt: string;
  negativePrompt: string;
}

export const CREATIVE_VIDEO_DURATIONS = [6, 15, 30] as const;
export type CreativeVideoDuration = (typeof CREATIVE_VIDEO_DURATIONS)[number];

export interface CreativeVideoShot {
  index: number;
  description: string;
  durationSec: number;
}

export interface CreativeVideoPrompt {
  id: string;
  title: string;
  platformFormat: CreativePlatformFormat;
  durationSec: CreativeVideoDuration;
  hook: string;
  shots: CreativeVideoShot[];
  onScreenText: string[];
  voiceoverSuggestion: string;
  transitionStyle: string;
  prompt: string;
  avoid: string[];
}

export interface CreativeStoryboardBeat {
  secondRange: string;
  visual: string;
  onScreenText: string;
  narration: string;
  purpose: string;
}

export interface CreativeStoryboard {
  durationSec: 15;
  beats: CreativeStoryboardBeat[];
}

export interface CreativeBriefPack {
  /** Top-of-funnel one-liner that anchors every concept. */
  campaignTheme: string;
  /** Visual mood + colour direction. */
  visualDirection: string;
  /** Single emotion the audience should feel. */
  audienceEmotion: string;
  imageConcepts: CreativeImagePrompt[];
  videoConcepts: CreativeVideoPrompt[];
  storyboard: CreativeStoryboard;
  onScreenTextSuggestions: string[];
  ctaVisual: string;
  /** Global negative-prompt / avoid list applied to every concept. */
  negativePrompt: string;
  productionNotes: string[];
  /** Locale of the human-facing copy in the pack ('fr' | 'en'). */
  language: 'fr' | 'en';
  /** AI-016A invariants surfaced for transparency. */
  providerCallAllowed: false;
  adminCostAllowed: false;
  mediaProviderCallAllowed: false;
  /** Literal notice required by spec. Pinned by tests. */
  noModelLaunchedNotice: string;
  /** Literal marker on every prompt body. Pinned by tests. */
  copyReadyMarker: string;
  /** AI-017F: tier the engine produced this pack for. */
  creativeQualityTier: CreativeQualityTier;
  /** AI-017F: short tone description embedded in every prompt body. */
  tierTone: string;
  /** AI-017F: kebab-cased guardrails embedded in every prompt body. */
  tierGuardrails: readonly string[];
}

export interface BuildCreativeBriefInput {
  offer: Offer;
  /**
   * Optional task hint — when the pack is produced alongside a specific
   * prompt-orchestrator task (e.g. `ad_generation`). Defaults to
   * `'campaign_pack'` for top-level use.
   */
  task?: string;
  /**
   * Optional override for the language. Defaults to `offer.brief.language`.
   * The engine never mutates the offer.
   */
  language?: 'fr' | 'en';
  /**
   * AI-017F: pick a creative-strategy tier. Concepts, hooks, shots,
   * storyboard beats, tone, and embedded guardrails all change with
   * this value. Defaults to `'performance'` — the most common
   * direct-response intent.
   */
  creativeQualityTier?: CreativeQualityTier;
}

// -----------------------------------------------------------------------------
// Constants — the literal markers the tests pin.
// -----------------------------------------------------------------------------

export const COPY_READY_MARKER = 'Prompt prêt à copier';
export const NO_MODEL_LAUNCHED_NOTICE_FR =
  "Aucun modèle image ou vidéo n'a été lancé";
export const NO_MODEL_LAUNCHED_NOTICE_EN =
  "No image or video model has been launched";

const STORYBOARD_DURATION_SEC = 15 as const;

// -----------------------------------------------------------------------------
// PRNG — same family as the other deterministic generators in this codebase.
// -----------------------------------------------------------------------------

function hash32(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function next(): number {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(arr: readonly T[], rand: () => number): T {
  if (arr.length === 0) throw new Error('creative_brief_pick_empty');
  const idx = Math.floor(rand() * arr.length) % arr.length;
  return arr[idx]!;
}

// -----------------------------------------------------------------------------
// Style libraries — bilingual, indexed by language.
// -----------------------------------------------------------------------------

interface StyleLib {
  visualDirections: readonly string[];
  audienceEmotions: readonly string[];
  imageStyles: readonly string[];
  imageLightings: readonly string[];
  imageCompositions: readonly string[];
  imageScenes: readonly string[];
  imageSubjects: readonly string[];
  videoHooks: readonly string[];
  videoVoiceovers: readonly string[];
  videoTransitions: readonly string[];
  ctaVisuals: readonly string[];
  productionNotes: readonly string[];
  onScreenSuggestions: readonly string[];
}

const LIB_FR: StyleLib = {
  visualDirections: [
    "Palette terrazzo crème + accent cobalt, textures naturelles",
    "Studio minimaliste, ombres douces, papier mat",
    "Reportage sincère, lumière fenêtre, grain léger",
    "Editorial moderne, typographie soignée, contraste maîtrisé",
    "Documentaire authentique, prise sur le vif, pas de retouche lourde",
  ],
  audienceEmotions: [
    "soulagement",
    "confiance tranquille",
    "élan d'action",
    "curiosité concrète",
    "fierté professionnelle",
  ],
  imageStyles: [
    "photographie éditoriale, plan moyen",
    "illustration vectorielle, formes simples",
    "rendu 3D doux, matériaux mats",
    "photographie produit, fond neutre",
    "scène de bureau, focus narratif",
  ],
  imageLightings: [
    "lumière naturelle douce de fin de matinée",
    "trois points légers, ombre portée nette mais courte",
    "lumière fenêtre latérale, contre-jour discret",
    "éclairage diffus, hautes lumières contrôlées",
    "soleil rasant, halo chaud minimal",
  ],
  imageCompositions: [
    "composition triadique, sujet décentré à droite",
    "règle des tiers, ligne d'horizon basse",
    "plan rapproché frontal, regard caméra",
    "vue plongeante sur table de travail",
    "plan large, sujet contextualisé dans son environnement",
  ],
  imageScenes: [
    "atelier de travail réel, outils visibles mais ordonnés",
    "espace lumineux, coin café, ordinateur fermé",
    "tableau blanc avec deux post-it, café tiède",
    "écran de laptop éteint, carnet ouvert, stylo posé",
    "porte d'entrée ouverte sur un studio modeste",
  ],
  imageSubjects: [
    "personne au travail, expression concentrée mais détendue",
    "duo client + accompagnant, posture ouverte",
    "objets symboliques de la transformation : carnet, montre, livre",
    "main qui pose un dernier élément avec soin",
    "personne souriante à mi-distance, regard vers l'objectif",
  ],
  videoHooks: [
    "Trois secondes pour montrer un avant frustrant",
    "Une question directe à l'audience, jamais agressive",
    "Un geste qui résout instantanément un blocage typique",
    "Une statistique vraie, sourcée par {{businessName}}",
    "Un témoignage très court, un seul verbe",
  ],
  videoVoiceovers: [
    "ton calme, rythme posé, pas de musique forte",
    "narration sincère, voix de quelqu'un qui a été à la place du public",
    "voix off basse, presque conversation",
    "court silence avant la phrase clé pour appuyer",
    "phrasé court, une idée par souffle",
  ],
  videoTransitions: [
    "coupe franche entre les plans, pas de zoom dramatique",
    "fondu enchaîné court, 6 frames maximum",
    "match cut sur un objet du quotidien",
    "transition par texte plein écran",
    "transition latérale subtile, sans effet 3D",
  ],
  ctaVisuals: [
    "Bouton typographique noir sur fond crème, label clair",
    "Carte CTA en bas du cadre, ombre discrète",
    "Badge circulaire avec verbe d'action court",
    "Texte en bas, soulignement plein, pas de flèche",
    "Cadre fin autour du CTA, micro-animation 2 frames",
  ],
  productionNotes: [
    "Vérifier les droits sur tout visage humain représenté.",
    "Ne pas représenter un client réel sans consentement écrit.",
    "Toujours inclure une variante sans texte pour les retargeting platforms.",
    "Tester chaque concept en silencieux : il doit fonctionner muet.",
    "Garder une marge de sécurité de 10% sur le cadre pour les recoupes plateformes.",
  ],
  onScreenSuggestions: [
    "Une promesse, pas une métaphore.",
    "Verbe + objet + délai concret.",
    "Pas plus de 6 mots par card.",
    "Police sans serif, contraste AA minimum.",
    "Eviter chiffres en pourcentage non sourcés.",
  ],
};

const LIB_EN: StyleLib = {
  visualDirections: [
    "Terrazzo cream palette + cobalt accent, natural textures",
    "Minimalist studio, soft shadows, matte paper",
    "Honest reportage, window light, slight grain",
    "Modern editorial, careful typography, controlled contrast",
    "Authentic documentary, candid framing, no heavy retouching",
  ],
  audienceEmotions: [
    "relief",
    "calm confidence",
    "momentum",
    "concrete curiosity",
    "quiet pride",
  ],
  imageStyles: [
    "editorial photography, medium shot",
    "vector illustration, simple shapes",
    "soft 3D render, matte materials",
    "product photography, neutral background",
    "office scene, narrative focus",
  ],
  imageLightings: [
    "soft late-morning natural light",
    "three-point lighting, short crisp shadow",
    "side window light, gentle backlight",
    "diffuse light, controlled highlights",
    "low sun, minimal warm halo",
  ],
  imageCompositions: [
    "triadic composition, subject offset to the right",
    "rule of thirds, low horizon line",
    "frontal close-up, eye contact",
    "top-down view of a working desk",
    "wide shot, subject set in their environment",
  ],
  imageScenes: [
    "real working studio, tools visible but tidy",
    "bright space, coffee corner, closed laptop",
    "whiteboard with two sticky notes, lukewarm coffee",
    "laptop powered off, open notebook, pen at rest",
    "open doorway revealing a modest studio",
  ],
  imageSubjects: [
    "person at work, focused yet relaxed",
    "client + advisor duo, open posture",
    "symbolic objects of the transformation: notebook, watch, book",
    "hand placing a final element with care",
    "smiling person mid-distance, looking into the lens",
  ],
  videoHooks: [
    "Three seconds to show a frustrating before",
    "A direct, never aggressive question to the audience",
    "A single gesture that resolves a typical blocker",
    "A true statistic, sourced by {{businessName}}",
    "A very short testimonial, one verb only",
  ],
  videoVoiceovers: [
    "calm tone, even pace, no loud music",
    "honest narration, voice of someone who has been in the audience's seat",
    "low voiceover, almost conversational",
    "short silence before the key line for emphasis",
    "short phrasing, one idea per breath",
  ],
  videoTransitions: [
    "hard cut between shots, no dramatic zoom",
    "short cross-fade, 6 frames maximum",
    "match cut on an everyday object",
    "full-screen text transition",
    "subtle lateral transition, no 3D effect",
  ],
  ctaVisuals: [
    "Typographic black button on cream background, clear label",
    "CTA card at the bottom, subtle shadow",
    "Round badge with a short action verb",
    "Bottom text, full underline, no arrow",
    "Thin frame around CTA, 2-frame micro-animation",
  ],
  productionNotes: [
    "Clear rights for any human face shown.",
    "Never depict a real client without written consent.",
    "Always include a no-text variant for retargeting platforms.",
    "Test every concept on mute — it must work silent.",
    "Keep a 10% safe margin on the frame for platform crops.",
  ],
  onScreenSuggestions: [
    "A promise, not a metaphor.",
    "Verb + object + concrete deadline.",
    "No more than 6 words per card.",
    "Sans-serif font, AA minimum contrast.",
    "Avoid percentages without a source.",
  ],
};

// -----------------------------------------------------------------------------
// Negative prompt + avoid list — universal, baked into every concept.
// -----------------------------------------------------------------------------

const NEGATIVE_PROMPT_FR = [
  'pas de ressemblance avec une célébrité réelle',
  'pas de personnage protégé par copyright',
  'pas de logo de marque tierce',
  'pas de claim médical ou financier absolu',
  'pas de before/after trompeur',
  "pas de promesse de résultats garantis",
  'pas de texte illisible ou artefact OCR',
  "pas d'iconographie haineuse",
].join('; ');

const NEGATIVE_PROMPT_EN = [
  'no real-celebrity likeness',
  'no copyrighted character',
  'no third-party brand logo',
  'no absolute medical or financial claim',
  'no deceptive before/after',
  'no guaranteed-results promise',
  'no unreadable text or OCR artifact',
  'no hateful iconography',
].join('; ');

const VIDEO_AVOID_FR = [
  'pas de chain-of-thought',
  'pas de prétention médicale',
  'pas de sound-on obligatoire',
  'pas de mention concurrente non sollicitée',
  'pas de copie verbatim de la pastedText des inspirations',
];

const VIDEO_AVOID_EN = [
  'no chain-of-thought',
  'no medical claim',
  'no sound-on requirement',
  'no unsolicited competitor mention',
  'no verbatim copy from inspiration pastedText',
];

// -----------------------------------------------------------------------------
// AI-017F — Per-tier templates. Each tier rewrites titles, overlays,
// hooks, shot lists, storyboard beats, and the tone embedded in every
// prompt body. Pure data; no I/O. Bilingual FR/EN.
// -----------------------------------------------------------------------------

interface TierTemplate {
  imageTitles: readonly [string, string, string];
  imageOverlays: readonly [string, string, string];
  videoTitles: readonly [string, string];
  videoHooks: readonly [string, string];
  /** On-screen text per video concept (3 cards each). */
  videoOnScreenText: readonly [readonly string[], readonly string[]];
  /** Beats explicitly designed for this tier's storyboard. */
  storyboardBeats: readonly CreativeStoryboardBeat[];
  toneDescription: string;
}

function tierTemplate(
  language: 'fr' | 'en',
  tier: CreativeQualityTier,
  businessName: string,
): TierTemplate {
  const isEn = language === 'en';
  const overlayMaker = (suffix: string) => `${businessName} — ${suffix}`;

  if (tier === 'safe') {
    return isEn
      ? {
          imageTitles: ['Clear benefit', 'One step, one result', 'Simple tools'],
          imageOverlays: [
            overlayMaker('start here'),
            overlayMaker('one clear step'),
            overlayMaker('built around you'),
          ],
          videoTitles: ['Reassuring reel 15s', 'Benefit story 6s'],
          videoHooks: [
            'A calm question to the audience, no pressure',
            'A short shot of the benefit in plain context',
          ],
          videoOnScreenText: [
            [
              `One step. One result.`,
              `${businessName} — clear plan.`,
              `Quietly, in your own time.`,
            ],
            [
              `${businessName} — start here.`,
              `Take one step today.`,
              `That is enough.`,
            ],
          ],
          storyboardBeats: [
            {
              secondRange: '0-3s',
              visual: 'Clear setup of a simple problem. Window light, no clutter.',
              onScreenText: 'A clear problem.',
              narration: 'Many start with this exact blocker.',
              purpose: 'Establish the problem calmly.',
            },
            {
              secondRange: '3-7s',
              visual: 'Quiet shot of the solution in use. No drama.',
              onScreenText: 'A quiet solution.',
              narration: `${businessName} works one step at a time.`,
              purpose: 'Introduce the solution without hype.',
            },
            {
              secondRange: '7-11s',
              visual: 'Practical benefit shot — notebook + clear move.',
              onScreenText: 'A simple benefit.',
              narration: 'You see the next move. You stop guessing.',
              purpose: 'Anchor the practical benefit.',
            },
            {
              secondRange: '11-15s',
              visual: 'Static, brand-safe CTA card. No animation.',
              onScreenText: `${businessName} — when you are ready.`,
              narration: 'When you are ready.',
              purpose: 'Gentle CTA, no pressure.',
            },
          ],
          toneDescription: 'clear, reassuring, practical',
        }
      : {
          imageTitles: ['Bénéfice clair', 'Une étape, un résultat', 'Outils simples'],
          imageOverlays: [
            overlayMaker('commence ici'),
            overlayMaker('une seule étape'),
            overlayMaker('pensé pour toi'),
          ],
          videoTitles: ['Reel rassurant 15s', 'Story-bénéfice 6s'],
          videoHooks: [
            "Une question calme à l'audience, sans pression",
            'Un plan court du bénéfice en contexte simple',
          ],
          videoOnScreenText: [
            [
              `Une étape. Un résultat.`,
              `${businessName} — un plan clair.`,
              `À ton rythme.`,
            ],
            [
              `${businessName} — commence ici.`,
              `Une étape aujourd'hui.`,
              `Ça suffit.`,
            ],
          ],
          storyboardBeats: [
            {
              secondRange: '0-3s',
              visual: "Mise en place claire d'un problème simple. Lumière fenêtre, peu d'éléments.",
              onScreenText: 'Un blocage clair.',
              narration: 'Beaucoup commencent par ce blocage exact.',
              purpose: 'Etablir calmement le problème.',
            },
            {
              secondRange: '3-7s',
              visual: 'Plan calme de la solution en usage. Aucun drame.',
              onScreenText: 'Une solution calme.',
              narration: `${businessName} avance une étape à la fois.`,
              purpose: 'Présenter la solution sans hype.',
            },
            {
              secondRange: '7-11s',
              visual: 'Plan bénéfice pratique — carnet + geste clair.',
              onScreenText: 'Un bénéfice simple.',
              narration: 'Tu vois la prochaine étape. Tu cesses de deviner.',
              purpose: 'Ancrer le bénéfice pratique.',
            },
            {
              secondRange: '11-15s',
              visual: 'Carte CTA fixe, brand-safe. Aucune animation.',
              onScreenText: `${businessName} — quand tu es prêt·e.`,
              narration: 'Quand tu es prêt·e.',
              purpose: 'CTA doux, sans pression.',
            },
          ],
          toneDescription: 'clair, rassurant, pratique',
        };
  }

  if (tier === 'social_proof') {
    return isEn
      ? {
          imageTitles: ['A real client', 'Everyday usage', 'Testimonial in context'],
          imageOverlays: [
            overlayMaker('used by people like you'),
            overlayMaker('real, daily use'),
            overlayMaker('observed, not invented'),
          ],
          videoTitles: ['UGC testimonial reel 15s', 'Creator snippet 6s'],
          videoHooks: [
            'A short authentic line: "Why I actually use it"',
            'A real situation, no actor, no script',
          ],
          videoOnScreenText: [
            [
              `Real client, real situation.`,
              `${businessName} — used in context.`,
              `Plausible result, no fabrication.`,
            ],
            [
              `Why I use ${businessName}.`,
              `One real reason.`,
              `Not a scripted ad.`,
            ],
          ],
          storyboardBeats: [
            {
              secondRange: '0-3s',
              visual: 'Wide shot of a relatable target persona, no acting.',
              onScreenText: 'Like you.',
              narration: 'Someone like you, in their own space.',
              purpose: 'Identify the target persona.',
            },
            {
              secondRange: '3-8s',
              visual: 'Real situation — kitchen / desk / studio. Authentic objects.',
              onScreenText: 'Real situation.',
              narration: 'Here is the situation they were in.',
              purpose: 'Anchor in the real, not staged.',
            },
            {
              secondRange: '8-12s',
              visual: 'Hands actually using the product / following the method.',
              onScreenText: 'Real usage.',
              narration: 'This is how they used it.',
              purpose: 'Demonstrate authentic usage.',
            },
            {
              secondRange: '12-15s',
              visual: 'Plausible result + soft CTA card.',
              onScreenText: `Plausible result · ${businessName}.`,
              narration: 'A plausible result. No exaggeration.',
              purpose: 'Witness without fabrication.',
            },
          ],
          toneDescription: 'human, credible, observational',
        }
      : {
          imageTitles: ['Un client réel', 'Usage du quotidien', 'Témoignage en contexte'],
          imageOverlays: [
            overlayMaker('utilisé par des gens comme toi'),
            overlayMaker('usage réel, quotidien'),
            overlayMaker('observé, pas inventé'),
          ],
          videoTitles: ['Témoignage UGC 15s', 'Snippet créateur 6s'],
          videoHooks: [
            'Une phrase authentique courte : « Pourquoi je l\'utilise »',
            'Une situation réelle, sans acteur, sans script',
          ],
          videoOnScreenText: [
            [
              `Un client réel, une situation réelle.`,
              `${businessName} — utilisé en contexte.`,
              `Résultat plausible, sans fabrication.`,
            ],
            [
              `Pourquoi j'utilise ${businessName}.`,
              `Une raison réelle.`,
              `Pas une pub scriptée.`,
            ],
          ],
          storyboardBeats: [
            {
              secondRange: '0-3s',
              visual: 'Plan large d\'une cible relatable, sans acting.',
              onScreenText: 'Comme toi.',
              narration: 'Quelqu\'un comme toi, dans son propre espace.',
              purpose: 'Identifier la persona cible.',
            },
            {
              secondRange: '3-8s',
              visual: 'Situation réelle — cuisine / bureau / atelier. Objets authentiques.',
              onScreenText: 'Situation réelle.',
              narration: 'Voici la situation dans laquelle elle se trouvait.',
              purpose: 'Ancrer dans le réel, pas le mis en scène.',
            },
            {
              secondRange: '8-12s',
              visual: 'Mains qui utilisent réellement le produit / suivent la méthode.',
              onScreenText: 'Usage réel.',
              narration: 'Voici comment elle l\'a utilisé.',
              purpose: 'Démontrer l\'usage authentique.',
            },
            {
              secondRange: '12-15s',
              visual: 'Résultat plausible + carte CTA douce.',
              onScreenText: `Résultat plausible · ${businessName}.`,
              narration: 'Un résultat plausible. Sans exagération.',
              purpose: 'Témoigner sans fabriquer.',
            },
          ],
          toneDescription: 'humain, crédible, observationnel',
        };
  }

  if (tier === 'breakthrough') {
    return isEn
      ? {
          imageTitles: ['Pattern interrupt', 'Unexpected contrast', 'Memorable visual'],
          imageOverlays: [
            overlayMaker('what if we flipped it?'),
            overlayMaker('not what you expected'),
            overlayMaker('worth remembering'),
          ],
          videoTitles: ['Pattern-interrupt reel 15s', 'Surprise hook 6s'],
          videoHooks: [
            'An unexpected opening shot, 1 second of silent contrast',
            'A startling but brand-safe opening that reverses an expectation',
          ],
          videoOnScreenText: [
            [
              `Wait — really?`,
              `${businessName} — flips the angle.`,
              `Reviewed by a human.`,
            ],
            [
              `Not what you expected.`,
              `${businessName} — bold, then grounded.`,
              `Human review required.`,
            ],
          ],
          storyboardBeats: [
            {
              secondRange: '0-2s',
              visual: 'Pattern interrupt — unexpected framing, silent contrast.',
              onScreenText: 'Wait — really?',
              narration: 'Most ads start the same way. Not this one.',
              purpose: 'Stop the scroll within 2s.',
            },
            {
              secondRange: '2-6s',
              visual: 'Reveal that flips the expectation. Bold composition.',
              onScreenText: 'We flipped the angle.',
              narration: `${businessName} starts where everyone else stops.`,
              purpose: 'Reveal the unexpected angle.',
            },
            {
              secondRange: '6-11s',
              visual: 'Emotional contrast moment — single human gesture, clean light.',
              onScreenText: 'Memorable, not loud.',
              narration: 'It is bolder than it sounds. And calmer than it looks.',
              purpose: 'Anchor memory through emotional contrast.',
            },
            {
              secondRange: '11-15s',
              visual: 'Grounded, calm CTA card. Brand-safe, no flashing.',
              onScreenText: `${businessName} — review before launch.`,
              narration: 'Worth reviewing carefully before you ship it.',
              purpose: 'Land bold work on a calm CTA.',
            },
          ],
          toneDescription: 'bold, distinctive, review-required',
        }
      : {
          imageTitles: ['Pattern interrupt', 'Contraste inattendu', 'Mémoire visuelle'],
          imageOverlays: [
            overlayMaker('et si on inversait ?'),
            overlayMaker('pas ce que tu attendais'),
            overlayMaker('à retenir'),
          ],
          videoTitles: ['Reel pattern-interrupt 15s', 'Hook surprise 6s'],
          videoHooks: [
            "Un plan d'ouverture inattendu, 1 seconde de contraste silencieux",
            "Une ouverture surprenante mais brand-safe qui inverse l'attente",
          ],
          videoOnScreenText: [
            [
              `Attends — sérieux ?`,
              `${businessName} — inverse l'angle.`,
              `Validé humainement.`,
            ],
            [
              `Pas ce que tu attendais.`,
              `${businessName} — audacieux, puis posé.`,
              `Review humaine requise.`,
            ],
          ],
          storyboardBeats: [
            {
              secondRange: '0-2s',
              visual: 'Pattern interrupt — cadrage inattendu, contraste silencieux.',
              onScreenText: 'Attends — sérieux ?',
              narration: 'La plupart des pubs commencent pareil. Pas celle-ci.',
              purpose: 'Stopper le scroll en 2s.',
            },
            {
              secondRange: '2-6s',
              visual: 'Reveal qui inverse l\'attente. Composition affirmée.',
              onScreenText: 'On a inversé l\'angle.',
              narration: `${businessName} commence là où les autres s\'arrêtent.`,
              purpose: 'Révéler l\'angle inattendu.',
            },
            {
              secondRange: '6-11s',
              visual: 'Moment de contraste émotionnel — un geste humain unique, lumière nette.',
              onScreenText: 'Mémorable, pas bruyant.',
              narration: 'C\'est plus audacieux qu\'il n\'y paraît. Et plus calme qu\'il n\'en a l\'air.',
              purpose: 'Ancrer la mémoire par contraste émotionnel.',
            },
            {
              secondRange: '11-15s',
              visual: 'Carte CTA posée, brand-safe, sans flash.',
              onScreenText: `${businessName} — à valider avant lancement.`,
              narration: 'À valider attentivement avant de le pousser.',
              purpose: 'Atterrir le bold sur un CTA calme.',
            },
          ],
          toneDescription: 'audacieux, distinctif, review obligatoire',
        };
  }

  // performance (default)
  return isEn
    ? {
        imageTitles: ['Hook + benefit', 'Objection handled', 'CTA mobile-first'],
        imageOverlays: [
          overlayMaker('clear in 2 seconds'),
          overlayMaker('handles your objection'),
          overlayMaker('book a slot today'),
        ],
        videoTitles: ['Conversion reel 15s', 'Objection hook 6s'],
        videoHooks: [
          'A 2-second visual hook on a real frustration',
          'A direct line that names the objection in the first second',
        ],
        videoOnScreenText: [
          [
            `Stop. Are you doing this?`,
            `Here is the real cost.`,
            `${businessName} — book a slot.`,
          ],
          [
            `Stop. Tried alone?`,
            `One real fix.`,
            `${businessName} — book today.`,
          ],
        ],
        storyboardBeats: [
          {
            secondRange: '0-2s',
            visual: 'Strong visual hook on a real frustration. Mobile-first 9:16.',
            onScreenText: 'Stop. Tried alone?',
            narration: 'You tried alone. You hit a wall.',
            purpose: 'Hook in under 2 seconds.',
          },
          {
            secondRange: '2-6s',
            visual: 'Pain / objection shot. Show the cost of doing nothing.',
            onScreenText: 'The real cost is time.',
            narration: 'Every week without a clear plan costs more than the plan itself.',
            purpose: 'Address the main objection.',
          },
          {
            secondRange: '6-11s',
            visual: 'Solution + proof. Show the product / method visible early.',
            onScreenText: 'A clear plan in one week.',
            narration: `${businessName} works one-on-one to set the next 5 actions.`,
            purpose: 'Solution + concrete proof.',
          },
          {
            secondRange: '11-15s',
            visual: 'CTA card, brand-safe, mobile-first. Clear action verb.',
            onScreenText: `${businessName} — book a slot.`,
            narration: 'Book a slot today.',
            purpose: 'Explicit close.',
          },
        ],
        toneDescription: 'direct-response, concise, conversion-focused',
      }
    : {
        imageTitles: ['Hook + bénéfice', 'Objection traitée', 'CTA mobile-first'],
        imageOverlays: [
          overlayMaker('clair en 2 secondes'),
          overlayMaker('traite ton objection'),
          overlayMaker('réserve un créneau'),
        ],
        videoTitles: ['Reel conversion 15s', 'Hook objection 6s'],
        videoHooks: [
          'Un hook visuel de 2 secondes sur une frustration réelle',
          "Une phrase directe qui nomme l'objection dans la première seconde",
        ],
        videoOnScreenText: [
          [
            `Stop. Tu fais ça ?`,
            `Voici le vrai coût.`,
            `${businessName} — réserve un créneau.`,
          ],
          [
            `Stop. Essayé seul·e ?`,
            `Un vrai correctif.`,
            `${businessName} — réserve aujourd'hui.`,
          ],
        ],
        storyboardBeats: [
          {
            secondRange: '0-2s',
            visual: 'Hook visuel fort sur une frustration réelle. Mobile-first 9:16.',
            onScreenText: 'Stop. Essayé seul·e ?',
            narration: 'Tu as essayé seul·e. Tu as plafonné.',
            purpose: 'Hook en moins de 2 secondes.',
          },
          {
            secondRange: '2-6s',
            visual: "Plan douleur / objection. Montrer le coût de ne rien faire.",
            onScreenText: 'Le vrai coût, c\'est le temps.',
            narration: "Chaque semaine sans plan clair coûte plus cher que le plan lui-même.",
            purpose: "Adresser l'objection principale.",
          },
          {
            secondRange: '6-11s',
            visual: 'Solution + preuve. Produit / méthode visible rapidement.',
            onScreenText: 'Un plan clair en une semaine.',
            narration: `${businessName} travaille en 1-1 pour fixer les 5 prochaines actions.`,
            purpose: 'Solution + preuve concrète.',
          },
          {
            secondRange: '11-15s',
            visual: 'Carte CTA, brand-safe, mobile-first. Verbe d\'action clair.',
            onScreenText: `${businessName} — réserve un créneau.`,
            narration: 'Réserve un créneau aujourd\'hui.',
            purpose: 'Clôture explicite.',
          },
        ],
        toneDescription: 'direct-response, concise, orientation conversion',
      };
}

// -----------------------------------------------------------------------------
// Builder
// -----------------------------------------------------------------------------

export function buildCreativeBriefPack(input: BuildCreativeBriefInput): CreativeBriefPack {
  if (!input || !input.offer || !input.offer.brief) {
    throw new Error('creative_brief_missing_offer');
  }
  const language: 'fr' | 'en' = input.language ?? input.offer.brief.language;
  const lib = language === 'en' ? LIB_EN : LIB_FR;
  const isEn = language === 'en';
  const tier: CreativeQualityTier = input.creativeQualityTier ?? 'performance';

  const task = input.task ?? 'campaign_pack';
  // AI-017F: tier participates in the seed so concepts vary per tier
  // for the same (offer, task, language).
  const seed = hash32(`${input.offer.id}|${task}|${language}|tier:${tier}|creative-v1`);
  const rand = mulberry32(seed);

  const businessName = input.offer.brief.businessName;
  const offerLine = input.offer.brief.offer;

  const visualDirection = pick(lib.visualDirections, rand);
  const audienceEmotion = pick(lib.audienceEmotions, rand);
  const ctaVisual = pick(lib.ctaVisuals, rand);
  const campaignTheme = isEn
    ? `Show ${businessName}'s honest path: from a frustrating before to a calm after.`
    : `Montrer le chemin honnête de ${businessName} : d'un avant frustrant à un après apaisé.`;

  const tpl = tierTemplate(language, tier, businessName);
  const tierGuardrails = CREATIVE_RULES_BY_TIER[tier];

  const imageConcepts = buildThreeImageConcepts({
    rand,
    lib,
    language,
    businessName,
    offerLine,
    visualDirection,
    tier,
    tpl,
    tierGuardrails,
  });
  const videoConcepts = buildTwoVideoConcepts({
    rand,
    lib,
    language,
    businessName,
    offerLine,
    visualDirection,
    tier,
    tpl,
    tierGuardrails,
  });
  const storyboard: CreativeStoryboard = {
    durationSec: STORYBOARD_DURATION_SEC,
    beats: tpl.storyboardBeats.slice(0, 4),
  };

  const negativePrompt = isEn ? NEGATIVE_PROMPT_EN : NEGATIVE_PROMPT_FR;
  const productionNotes = lib.productionNotes.slice(0, 3);
  const onScreenTextSuggestions = lib.onScreenSuggestions.slice(0, 4);
  const noModelLaunchedNotice = isEn
    ? NO_MODEL_LAUNCHED_NOTICE_EN
    : NO_MODEL_LAUNCHED_NOTICE_FR;

  return {
    campaignTheme,
    visualDirection,
    audienceEmotion,
    imageConcepts,
    videoConcepts,
    storyboard,
    onScreenTextSuggestions,
    ctaVisual,
    negativePrompt,
    productionNotes,
    language,
    providerCallAllowed: false,
    adminCostAllowed: false,
    mediaProviderCallAllowed: false,
    noModelLaunchedNotice,
    copyReadyMarker: COPY_READY_MARKER,
    creativeQualityTier: tier,
    tierTone: tpl.toneDescription,
    tierGuardrails,
  };
}

// -----------------------------------------------------------------------------
// Image / video / storyboard builders
// -----------------------------------------------------------------------------

function buildThreeImageConcepts(args: {
  rand: () => number;
  lib: StyleLib;
  language: 'fr' | 'en';
  businessName: string;
  offerLine: string;
  visualDirection: string;
  tier: CreativeQualityTier;
  tpl: TierTemplate;
  tierGuardrails: readonly string[];
}): CreativeImagePrompt[] {
  const formats: CreativePlatformFormat[] = [
    'instagram_square',
    'instagram_portrait',
    'linkedin_feed',
  ];
  const titles = args.tpl.imageTitles;
  const overlays = args.tpl.imageOverlays;

  return formats.map((fmt, i) => {
    const scene = pick(args.lib.imageScenes, args.rand);
    const subject = pick(args.lib.imageSubjects, args.rand);
    const composition = pick(args.lib.imageCompositions, args.rand);
    const lighting = pick(args.lib.imageLightings, args.rand);
    const style = pick(args.lib.imageStyles, args.rand);
    const textOverlay = overlays[i]!;
    const aspect = PLATFORM_FORMAT_ASPECT_RATIO[fmt];
    const prompt = [
      `[${COPY_READY_MARKER}]`,
      args.language === 'en'
        ? `Image — ${titles[i]} for ${args.businessName} (${fmt}, ${aspect}).`
        : `Image — ${titles[i]} pour ${args.businessName} (${fmt}, ${aspect}).`,
      args.language === 'en'
        ? `Creative direction: ${args.tier} — ${args.tpl.toneDescription}.`
        : `Direction créative : ${args.tier} — ${args.tpl.toneDescription}.`,
      args.language === 'en'
        ? `Guardrails: ${args.tierGuardrails.join('; ')}.`
        : `Garde-fous : ${args.tierGuardrails.join('; ')}.`,
      args.language === 'en' ? `Scene: ${scene}.` : `Scène : ${scene}.`,
      args.language === 'en' ? `Subject: ${subject}.` : `Sujet : ${subject}.`,
      args.language === 'en'
        ? `Composition: ${composition}.`
        : `Composition : ${composition}.`,
      args.language === 'en' ? `Lighting: ${lighting}.` : `Lumière : ${lighting}.`,
      args.language === 'en' ? `Style: ${style}.` : `Style : ${style}.`,
      args.language === 'en'
        ? `Direction: ${args.visualDirection}.`
        : `Direction : ${args.visualDirection}.`,
      args.language === 'en'
        ? `Text overlay: "${textOverlay}".`
        : `Texte incrusté : « ${textOverlay} ».`,
      args.language === 'en'
        ? `Offer: ${args.offerLine}`
        : `Offre : ${args.offerLine}`,
    ].join('\n');
    return {
      id: `img_${i + 1}`,
      title: titles[i]!,
      platformFormat: fmt,
      scene,
      subject,
      composition,
      lighting,
      style,
      textOverlay,
      prompt,
      negativePrompt:
        args.language === 'en' ? NEGATIVE_PROMPT_EN : NEGATIVE_PROMPT_FR,
    };
  });
}

function buildTwoVideoConcepts(args: {
  rand: () => number;
  lib: StyleLib;
  language: 'fr' | 'en';
  businessName: string;
  offerLine: string;
  visualDirection: string;
  tier: CreativeQualityTier;
  tpl: TierTemplate;
  tierGuardrails: readonly string[];
}): CreativeVideoPrompt[] {
  const formats: CreativePlatformFormat[] = ['tiktok_reel', 'story_vertical'];
  const durations: CreativeVideoDuration[] = [15, 6];
  const titles = args.tpl.videoTitles;

  return formats.map((fmt, i) => {
    const durationSec = durations[i]!;
    const hook = args.tpl.videoHooks[i]!.replace(
      '{{businessName}}',
      args.businessName,
    );
    const transition = pick(args.lib.videoTransitions, args.rand);
    const voiceover = pick(args.lib.videoVoiceovers, args.rand);
    const shots = buildShotList(durationSec, args.language);
    const onScreenText = args.tpl.videoOnScreenText[i] ?? [];
    const prompt = [
      `[${COPY_READY_MARKER}]`,
      args.language === 'en'
        ? `Video — ${titles[i]} (${fmt}, ${PLATFORM_FORMAT_ASPECT_RATIO[fmt]}, ${durationSec}s).`
        : `Vidéo — ${titles[i]} (${fmt}, ${PLATFORM_FORMAT_ASPECT_RATIO[fmt]}, ${durationSec}s).`,
      args.language === 'en'
        ? `Creative direction: ${args.tier} — ${args.tpl.toneDescription}.`
        : `Direction créative : ${args.tier} — ${args.tpl.toneDescription}.`,
      args.language === 'en'
        ? `Guardrails: ${args.tierGuardrails.join('; ')}.`
        : `Garde-fous : ${args.tierGuardrails.join('; ')}.`,
      args.language === 'en' ? `Hook (0-3s): ${hook}.` : `Hook (0-3s) : ${hook}.`,
      args.language === 'en'
        ? `Transitions: ${transition}.`
        : `Transitions : ${transition}.`,
      args.language === 'en'
        ? `Voiceover: ${voiceover}.`
        : `Voix off : ${voiceover}.`,
      args.language === 'en'
        ? `Direction: ${args.visualDirection}.`
        : `Direction : ${args.visualDirection}.`,
      args.language === 'en'
        ? `Offer: ${args.offerLine}`
        : `Offre : ${args.offerLine}`,
      args.language === 'en' ? 'Shots:' : 'Plans :',
      ...shots.map((s) => `  ${s.index}. ${s.description} (${s.durationSec}s)`),
    ].join('\n');
    return {
      id: `vid_${i + 1}`,
      title: titles[i]!,
      platformFormat: fmt,
      durationSec,
      hook,
      shots,
      onScreenText: [...onScreenText],
      voiceoverSuggestion: voiceover,
      transitionStyle: transition,
      prompt,
      avoid: args.language === 'en' ? VIDEO_AVOID_EN : VIDEO_AVOID_FR,
    };
  });
}

function buildShotList(
  totalSec: CreativeVideoDuration,
  language: 'fr' | 'en',
): CreativeVideoShot[] {
  if (totalSec === 6) {
    return [
      {
        index: 1,
        description:
          language === 'en'
            ? 'Frustration close-up, 2s'
            : 'Gros plan frustration, 2s',
        durationSec: 2,
      },
      {
        index: 2,
        description:
          language === 'en'
            ? 'Quiet relief shot, 2s'
            : 'Plan soulagement calme, 2s',
        durationSec: 2,
      },
      {
        index: 3,
        description: language === 'en' ? 'CTA card, 2s' : 'Carte CTA, 2s',
        durationSec: 2,
      },
    ];
  }
  if (totalSec === 30) {
    return [
      {
        index: 1,
        description:
          language === 'en' ? 'Honest before, 6s' : 'Avant honnête, 6s',
        durationSec: 6,
      },
      {
        index: 2,
        description:
          language === 'en'
            ? 'One concrete step, 8s'
            : 'Une étape concrète, 8s',
        durationSec: 8,
      },
      {
        index: 3,
        description:
          language === 'en' ? 'Real testimonial, 10s' : 'Témoignage réel, 10s',
        durationSec: 10,
      },
      {
        index: 4,
        description: language === 'en' ? 'CTA card, 6s' : 'Carte CTA, 6s',
        durationSec: 6,
      },
    ];
  }
  return [
    {
      index: 1,
      description:
        language === 'en' ? 'Hook on a real frustration, 3s' : 'Hook sur frustration réelle, 3s',
      durationSec: 3,
    },
    {
      index: 2,
      description:
        language === 'en' ? 'One concrete step, 5s' : 'Une étape concrète, 5s',
      durationSec: 5,
    },
    {
      index: 3,
      description:
        language === 'en' ? 'Quiet after-state, 4s' : 'Etat après apaisé, 4s',
      durationSec: 4,
    },
    {
      index: 4,
      description: language === 'en' ? 'CTA card, 3s' : 'Carte CTA, 3s',
      durationSec: 3,
    },
  ];
}

