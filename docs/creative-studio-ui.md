# Creative Studio UI v1 (AI-017B)

A React client component that renders the output of
`buildCreativeBriefPack` (the pure AI-017A engine) as a navigable
"Creative Studio" surface. **Prompt-only.** No real image / video
provider call. No `fetch` from this component. No env access.

## Where it lives

- `components/offer-workspace/CreativeStudio.tsx` — the component.
- `lib/offer-workspace/creative-studio-labels.ts` — FR + EN microcopy.
- Mounted in `components/offer-workspace/OfferDetailClient.tsx`,
  immediately below `<PromptInspector>`.

## What it shows

```
┌─ Creative Studio  [Prompt-only]
│  Prepare visuals and videos to test — without launching a media
│  model.
│  Aucun modèle image ou vidéo n'a été lancé.
│
│  campaignTheme · visualDirection · audienceEmotion · ctaVisual
│
│  [ Images (3) ] [ Vidéos (2) ] [ Storyboard 15s ]
│
│  ── Images tab ──────────────────────────────────────────────
│  ┌ image card ┐  ┌ image card ┐  ┌ image card ┐
│  │ title       │  │ title       │  │ title       │
│  │ format/aspect  format/aspect    format/aspect│
│  │ scene/subject  scene/subject    scene/subject│
│  │ overlay        overlay          overlay      │
│  │ ▸ prompt body  ▸ prompt body    ▸ prompt body│
│  │ avoid line     avoid line       avoid line   │
│  │ [Copier le prompt image]  …    …              │
│  └─────────────┘  └─────────────┘  └─────────────┘
│
│  ── Vidéos tab ──────────────────────────────────────────────
│  ┌ video card ┐  ┌ video card ┐
│  │ format · 15s   format · 6s   │
│  │ hook           hook          │
│  │ shots count    shots count   │
│  │ on-screen      on-screen     │
│  │ ▸ prompt body  ▸ prompt body │
│  │ avoid          avoid         │
│  │ [Copier le prompt vidéo]     │
│  └─────────────┘  └─────────────┘
│
│  ── Storyboard 15s tab ───────────────────────────────────
│  [0-3s]  visual / on-screen / narration / purpose
│  [3-8s]  …
│  [8-12s] …
│  [12-15s]…
│  [Copier le storyboard]
└──────────────────────────────────────────────────────────────
```

## Hard rules (pinned by tests)

- Renders the literal *"Aucun modèle image ou vidéo n'a été lancé."*
- Renders the *"Prompt-only"* badge.
- **Never** renders "Générer image" or "Générer vidéo".
- **Never** calls `fetch` (no network from copy actions).
- **Never** reads `process.env` at runtime.
- **Never** imports `openai-provider-adapter` or `provider-gateway`.
- **Never** imports `next/server` or `next/navigation`.
- Copy buttons use `navigator.clipboard.writeText` only.
- Empty state shown when the offer is missing the required brief
  fields (`businessName` + `offer`).

## Microcopy

FR is the primary language; EN mirrors the keys 1:1. Both shapes are
exported from `creative-studio-labels.ts` and verified non-empty by
tests.

| Key | FR |
|---|---|
| `sectionTitle` | Creative Studio |
| `sectionSubtitle` | Prépare tes visuels et vidéos à tester — sans lancer de modèle média. |
| `badgePromptOnly` | Prompt-only |
| `safetyLine` | Aucun modèle image ou vidéo n'a été lancé. |
| `imageCardCopyButton` | Copier le prompt image |
| `videoCardCopyButton` | Copier le prompt vidéo |
| `storyboardCopyButton` | Copier le storyboard |
| `emptyState` | Complète ton offre pour préparer les concepts créatifs. |

## Mobile

- 375px viewport: image grid collapses to a single column; video grid
  collapses to a single column; storyboard beats stack vertically.
- Copy buttons span the full card width on small screens
  (`w-full`).
- No horizontal scroll: long prompt bodies are wrapped via
  `whitespace-pre-wrap break-words` inside a `max-h-48 overflow-auto`
  `<pre>`.

## What this UI deliberately does *not* do

- Does **not** call any AI provider (image, video, or text).
- Does **not** mutate Supabase, Stripe, or Inngest.
- Does **not** mutate Vercel env.
- Does **not** persist anything; the pack is recomputed on demand.
- Does **not** affect Issue #25 (i18n FR/EN/IT/DE/ES) backlog.
- Does **not** resume AI-016E (smoke-test execution remains paused).

## Future work (out of scope here)

- Adding a real media provider would require a server-only adapter +
  a separate decision flag (`mediaProviderCallAllowed`) plumbed
  through `decideAiExecution`. Free must remain at zero admin cost
  there too. Not part of AI-017B.
