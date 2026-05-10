# Creative Brief Engine v1 (AI-017A)

A pure, deterministic module that turns a SocialBoost `Offer` into a
**Creative Brief Pack** — a structured set of copy-ready prompts for
image and video generation, plus a 15-second storyboard. **No real
image / video model is called by SocialBoost.** The engine emits text
the operator can paste into the model of their choice.

## What it produces

`buildCreativeBriefPack({ offer, task?, language? }) → CreativeBriefPack`

A pack contains:

- `campaignTheme` — top-level one-liner that anchors every concept.
- `visualDirection` — mood + colour direction.
- `audienceEmotion` — the single emotion the audience should feel.
- `imageConcepts` — **3** image concepts, each with its own
  composition, lighting, style, text overlay, full prompt body and
  negative prompt.
- `videoConcepts` — **2** video concepts (one 15s reel, one 6s hook).
- `storyboard` — exactly **1** storyboard, **15s** long, 4 beats.
- `onScreenTextSuggestions` — short rules for legible on-screen copy.
- `ctaVisual` — design notes for the CTA card.
- `negativePrompt` — universal avoid list applied to every concept.
- `productionNotes` — three short reminders for the producer.
- `language` — `'fr'` or `'en'`, mirrors the offer brief.
- `providerCallAllowed: false`, `adminCostAllowed: false`,
  `mediaProviderCallAllowed: false`.
- `noModelLaunchedNotice` — literal sentence:
  - FR: *"Aucun modèle image ou vidéo n'a été lancé"*
  - EN: *"No image or video model has been launched"*
- `copyReadyMarker` — literal `"Prompt prêt à copier"`, prefixed on
  every prompt body.

## Hard rules

- **Pure**: no `fetch`, no `process.env`, no `Date.now()` in output.
  Pinned by source-hygiene tests.
- **Deterministic**: same `offer.id` + `task` + `language` → byte-
  identical pack. Uses FNV-1a + Mulberry32 (same family as
  `ad-studio.ts`, `feedback-engine.ts`, `analytics-mock.ts`).
- **No real media provider**: the engine only generates prompt text.
  SocialBoost does not call DALL-E / Midjourney / Sora / etc. The
  pack's three booleans surface this contract for the UI.
- **Free-mode preserved**: `providerCallAllowed` and `adminCostAllowed`
  stay `false` regardless of plan. This pack does not consume credits
  on its own.
- **No promised media generation**: every prompt header includes
  `[Prompt prêt à copier]` to make it clear the user copies a prompt
  into a third-party tool.
- **Guardrails baked in**: no celebrity likeness, no copyrighted
  characters, no third-party brand logos, no medical / financial
  absolute claims, no deceptive before/after, no chain-of-thought
  tokens, no `<thinking>`, no "step by step".

## Platform formats

| Format | Aspect ratio | Typical use |
|---|---|---|
| `instagram_square` | 1:1 | Feed |
| `instagram_portrait` | 4:5 | Feed (denser) |
| `tiktok_reel` | 9:16 | Short video |
| `linkedin_feed` | 1.91:1 | Linkedin post |
| `story_vertical` | 9:16 | Story / Reel |

## How to use the prompts

Each prompt is **plain text**. Copy the body of `imageConcepts[i].prompt`
or `videoConcepts[i].prompt` into a text-to-image / text-to-video tool.
The tool's UI almost always has a separate "negative prompt" field —
paste `imageConcepts[i].negativePrompt` (or the global
`negativePrompt`) there.

The engine never:

- generates actual image bytes,
- uploads anything,
- spends API credits on the user's behalf.

If you later integrate a real media provider (out of scope for
AI-017A), wire it through a server-only adapter and gate it on the
same `decideAiExecution` chain the text gateway uses, with a fresh
`mediaProviderCallAllowed` decision. Free must remain at zero admin
cost there too.

## Determinism contract (for tests)

```ts
const a = buildCreativeBriefPack({ offer });
const b = buildCreativeBriefPack({ offer });
assert.deepEqual(a, b);
```

Changing the seed components changes the output:

- a different `offer.id` → different pack,
- a different `task` hint → different pack,
- a different `language` → translated copy + (sometimes) different
  picks for stylistic library variants.

`offer.brief.language` is **never mutated** by the builder.

## What this module deliberately does *not* do

- Does not call any AI provider.
- Does not call Anthropic / OpenAI / Google / Mistral / any media provider.
- Does not read `process.env` or `Date.now()`.
- Does not touch Supabase, Stripe, Inngest, or the filesystem.
- Does not mutate the input offer.
- Does not affect Issue #25 (i18n FR/EN/IT/DE/ES) backlog.
- Does not change Production env state in any way.
