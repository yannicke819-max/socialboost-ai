# Creative Quality Selector UI v1 (AI-017E)

A client component that lets the user pick a **creative intent** —
`safe` / `social_proof` / `performance` / `breakthrough` — before
reading the Creative Studio pack. The selector is a navigation
surface only: selecting a tier never calls a media provider, never
spends a credit, never triggers a fetch.

> Sprint label note: the brief was issued as "AI-017D Creative
> Quality Selector UI" but the previous sprint
> ([Creative Quality Ladder + Score Hints](./creative-quality-ladder.md))
> was already merged under the AI-017D label, so this one ships as
> **AI-017E** to keep the commit history unambiguous.

## Where it lives

- `components/offer-workspace/CreativeQualitySelector.tsx` — the
  selector component (also exports `buildCreativeDirectionPrefix`).
- `components/offer-workspace/CreativeStudio.tsx` — owns the `tier`
  state, mounts the selector, and prepends the directional prefix
  to every copied prompt.
- `lib/offer-workspace/creative-studio-labels.ts` — FR + EN
  microcopy: titles, taglines, "use when" lists, axis + level
  labels, breakthrough warning, copy-prefix label.

## What the user sees

```
Choisis ton intention créative
Safe, Social Proof, Performance ou Breakthrough — selon ce que tu veux tester.
Ce choix guide les prompts. Aucun modèle image ou vidéo n'est lancé.

┌─ Safe ─────────┐ ┌─ Social Proof ─┐ ┌─ Performance ─┐ ┌─ Breakthrough ┐
│ tagline        │ │ tagline        │ │ tagline       │ │ tagline       │
│ Quand l'utiliser │ Quand l'utiliser │ Quand l'utiliser  Quand l'utiliser
│ Règles         │ │ Règles         │ │ Règles        │ │ Règles        │
│ Signaux 6 axes │ │ Signaux 6 axes │ │ Signaux 6 axes │ Signaux 6 axes │
│                │ │                │ │               │ │ ⚠️ review     │
└────────────────┘ └────────────────┘ └───────────────┘ └───────────────┘

Direction créative sélectionnée: Performance — Hook fort, objection, CTA

(... existing Creative Studio panels ...)
```

## Behaviour

- **Default selection**: `performance`.
- **Selection updates**: drives the visible "Direction créative
  sélectionnée" annotation and the prefix that
  `handleCopy` prepends to every copied prompt.
- **Breakthrough warning**: a non-blocking banner appears below the
  grid when `selected === 'breakthrough'` ("À valider humainement
  avant toute future génération média.").
- **Keyboard / a11y**: each card is a `role="radio"` button inside a
  `role="radiogroup"`, with `aria-pressed` and `aria-checked`
  reflecting the selected state. `focus-visible` ring matches the
  rest of the workspace.
- **Mobile (375px)**: 4-card grid collapses to 2 columns at `sm`,
  4 columns at `lg`. Use-when + rules + signals all stack inside
  each card.

## Copy prefix

`buildCreativeDirectionPrefix(tier, language)` returns a string of
the shape:

```
Direction créative : <Tier label> — <tagline>
```

Examples:

- `safe` (FR) → *"Direction créative : Safe — message clair · Clair, propre, brand-safe"*
- `performance` (FR) → *"Direction créative : Performance — conçu pour conversion · Hook fort, objection, CTA"*

`CreativeStudio.handleCopy` then composes:

```
${prefix}\n\n${promptBody}
```

The prefix is plain text — no hidden metadata, no score-hint object,
no internal id. Pure string composition.

## Hard rules pinned by tests

| Rule | Pinned by |
|---|---|
| Default tier is `'performance'` | source scan on `useState<CreativeQualityTier>('performance')` |
| All four tiers rendered | `CREATIVE_QUALITY_TIERS.map` source-scan |
| `aria-pressed` + `aria-checked` + `role="radio"` / `role="radiogroup"` | source scan |
| Breakthrough warning gated by `selected === 'breakthrough'` | source scan |
| Copy prefix is built from `buildCreativeDirectionPrefix(tier, language)` | source scan + pure unit test on the helper |
| FR + EN have non-empty selector microcopy | per-key label test |
| No `'draft'`, `'standard'`, `'premium'` literals | source scan |
| No "Générer image" / "Générer vidéo" runtime tokens | source scan |
| No `fetch(`, no `process.env` runtime in selector or studio | source scan |
| No import of `openai-provider-adapter` or `provider-gateway` | source scan |
| Studio still renders 3 image cards, 2 video cards, storyboard | source scan |
| Mobile-friendly responsive grid (`sm:grid-cols-2 lg:grid-cols-4`) | source scan |

## Out of scope (deliberately deferred)

- The Creative Brief Engine remains tier-agnostic for AI-017E.
  Concepts are annotated with the selected tier (via the prefix +
  the visible direction label) but are not yet structurally
  re-derived per tier. A follow-up sprint can make
  `buildCreativeBriefPack` accept a `tier` argument and emit
  tier-specific concepts.
- No real image / video provider call. SocialBoost stays prompt-only
  on the media side. Free remains at zero admin cost.
- AI-016E (smoke-test execution) remains paused.
- Issue #25 (i18n FR/EN/IT/DE/ES) backlog is untouched.
