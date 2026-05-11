# Tier-aware Creative Concepts (AI-017F)

`buildCreativeBriefPack` now accepts a `creativeQualityTier` input.
Selecting a tier (`safe` / `social_proof` / `performance` /
`breakthrough`) changes the actual concepts, hooks, on-screen text,
shot lists, storyboard beats, tone embedded in every prompt body,
and the kebab-cased guardrails attached to each prompt.

**SocialBoost still does not call any real image or video provider.**
The engine emits prompt text only. The Free hard rule is unchanged:
`providerCallAllowed`, `adminCostAllowed`, and
`mediaProviderCallAllowed` all stay `false` on every pack regardless
of tier.

## API

```ts
buildCreativeBriefPack({
  offer,                        // required
  task?: string,                // optional, default 'campaign_pack'
  language?: 'fr' | 'en',       // optional, defaults to offer.brief.language
  creativeQualityTier?:         // optional, defaults to 'performance'
    'safe' | 'social_proof' | 'performance' | 'breakthrough',
}) → CreativeBriefPack
```

The returned pack carries three new fields:

```ts
creativeQualityTier: CreativeQualityTier;
tierTone: string;             // e.g. "direct-response, concise, conversion-focused"
tierGuardrails: readonly string[]; // e.g. ['hook-first-2s', 'objection-handling', ...]
```

## Why the tier changes the engine

SocialBoost differentiates by **creative strategy**, not by generic
technical quality. The four tiers each map to a proven social-ad
pattern with its own structure and risk profile (see
[Creative Quality Ladder](./creative-quality-ladder.md) for the full
matrix). Letting the user pick a tier upstream drives concrete
changes downstream:

| Surface | Changes per tier |
|---|---|
| Image concept titles | per-tier (e.g. *Hook + bénéfice* for performance, *Pattern interrupt* for breakthrough) |
| Image text overlays | per-tier (e.g. *clair en 2 secondes* for performance, *à retenir* for breakthrough) |
| Video concept titles | per-tier (e.g. *Témoignage UGC 15s* for social_proof) |
| Video hooks | per-tier (e.g. *Une situation réelle, sans acteur, sans script* for social_proof) |
| Video on-screen text | per-tier |
| Storyboard beats | full 4-beat template per tier (timings + intent change) |
| Tone description in prompt body | per-tier (e.g. *humain, crédible, observationnel* for social_proof) |
| Embedded guardrails in prompt body | `CREATIVE_RULES_BY_TIER[tier]` joined as a *Garde-fous* line |

The engine seeds determinism on `(offer.id, task, language, tier)`,
so the same combination always yields a byte-identical pack and
different combinations yield genuinely different output.

## Per-tier substance highlights

### `safe` — clear, reassuring, practical
- Storyboard: *clear problem (0-3s) → quiet solution (3-7s) →
  practical benefit (7-11s) → gentle CTA (11-15s)*.
- Embedded guardrails: `single-message`, `benefit-led`,
  `no-aggressive-claim`, `brand-safe-visual`.

### `social_proof` — human, credible, observational
- Storyboard: *target persona (0-3s) → real situation (3-8s) →
  authentic usage (8-12s) → plausible result + soft CTA (12-15s)*.
- Embedded guardrails: `human-first`, `product-in-use`,
  `proof-without-fabrication`, `no-fake-testimonial`,
  `ugc-compatible`.

### `performance` — direct-response, concise, conversion-focused
- Storyboard: *2s hook (0-2s) → pain / objection (2-6s) → solution
  + proof (6-11s) → explicit CTA (11-15s)*.
- Embedded guardrails: `hook-first-2s`, `objection-handling`,
  `explicit-cta`, `mobile-first`, `product-visible-early`.

### `breakthrough` — bold, distinctive, review-required
- Storyboard: *pattern interrupt (0-2s) → reveal (2-6s) → emotional
  contrast (6-11s) → grounded calm CTA (11-15s)*.
- Embedded guardrails: `pattern-interrupt`, `emotional-contrast`,
  `unusual-angle`, `memorable-visual`, `human-review-required`,
  `never-automatic-video`.

## UI integration (Creative Studio)

`CreativeStudio.tsx` now passes the selected tier to the engine via
`useMemo([offer, task, language, tier])`. Selecting a different tier
in the Creative Quality Selector re-derives the pack on the next
render — the 3 image cards, 2 video cards, and storyboard panel all
change. No fetch, no network, no API call. The directional prefix
applied by `handleCopy` (added in AI-017E) is unchanged.

## What this PR does *not* do

- Does **not** add any real image / video provider call.
- Does **not** introduce a media gateway. The
  `mediaProviderCallAllowed: false` invariant on every pack remains
  the spec for any future media gateway to honour.
- Does **not** mutate Vercel env, Supabase, Stripe, Inngest, or the
  filesystem.
- Does **not** ship `'draft' | 'standard' | 'premium'` labels — those
  generic terms remain forbidden in the media model.
- Does **not** affect Issue #25 (i18n FR/EN/IT/DE/ES) backlog.
- Does **not** resume AI-016E (smoke-test execution remains paused).

## Future work (out of scope here)

- A future media gateway must consult `decideMediaExecution` on every
  call AND respect the per-tier guardrails embedded in the prompt
  body. Breakthrough video must remain `manual_review_required` for
  every plan.
- A future engine version could vary scenes / subjects / lighting
  libraries per tier (today, those are still drawn from the shared
  language library and only differ via the seed).
