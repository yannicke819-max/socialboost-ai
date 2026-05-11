# Creative Scoring v1 (AI-017G)

Per-concept six-axis scoring surfaced directly in Creative Studio.
Scores are **deterministic local heuristics** — not a performance
prediction. The user-facing microcopy is pinned by tests:

> *Scores indicatifs, pas une prédiction de performance.*
> *Basé sur les signaux créatifs du concept, sans appel à un modèle
> IA.*

**No real provider call.** No image / video model is launched. No
`fetch`, no `process.env`, no `Date.now()`, no `Math.random()` in
the scoring engine.

## Six axes

| Axis | What it asks |
|---|---|
| `attention` | Does the concept stop the scroll quickly? |
| `clarity` | Is the message readable in 2 seconds? |
| `credibility` | Does the proof feel real, not fabricated? |
| `conversion` | Does it push toward the next action explicitly? |
| `distinctiveness` | Does it stand out from competitors? |
| `brandSafety` | Is it safe to ship without further review? |

Levels: `low` · `medium` · `high` · `very_high` · `needs_review`.
`needs_review` is reserved for `brandSafety` on the `breakthrough`
tier (and any concept that explicitly carries
`human-review-required` / `never-automatic-video` guardrails).

## Cross-platform context

Rationale and watchouts adapt to the platform:

| Context | Auto-mapped from `platformFormat` | What it emphasises |
|---|---|---|
| `meta_feed` | `instagram_square`, `instagram_portrait` | mobile-first, single focal point, CTA visible early, sound-off compatible |
| `instagram_reels` | `story_vertical` | vertical-first, hook visuel rapide, overlay lisible, rythme court |
| `tiktok` | `tiktok_reel` | hook immédiat, authenticité, creator-style, proof-in-use, hook/body/close |
| `linkedin_feed` | `linkedin_feed` | clarté professionnelle, audience explicite, preuve crédible, brand safety élevée |
| `youtube_shorts` | (manual override) | hook rapide, histoire courte, brand recall, CTA clair |
| `generic_social` | (default fallback) | bénéfice clair, visuel lisible, CTA compréhensible — **no platform-specific jargon** |

The mapping can be overridden via the `platformContext` argument.
Tests pin that `generic_social` rationales never mention TikTok /
LinkedIn / Reels / Shorts / Meta by name.

## API

```ts
buildCreativeScorecard({
  kind: 'image' | 'video' | 'storyboard',
  creativeQualityTier,             // 'safe' | 'social_proof' | 'performance' | 'breakthrough'
  title?,
  prompt,                          // required — the full concept body
  hook?,
  textOverlay?,
  avoid?,
  guardrails?,                     // typically pack.tierGuardrails
  platformFormat?,                 // auto-mapped to platformContext if context absent
  platformContext?,                // overrides the mapping
  language?,                       // 'fr' (default) | 'en'
}) → CreativeScorecard
```

```ts
interface CreativeScorecard {
  overallLabel:
    | 'safe_to_test'
    | 'strong_candidate'
    | 'needs_refinement'
    | 'review_required';
  scores: CreativeScore[];         // six axes
  topStrength: CreativeScoreAxis;
  mainWatchout: CreativeScoreAxis;
  explanation: string;             // FR/EN spec-pinned microcopy
  platformContext: CreativePlatformContext;
  isPrediction: false;             // literal
}
```

## How scoring works

Each axis starts from a **per-tier baseline** and then bumps up /
down based on substring signals in the concept blob (prompt + title
+ hook + overlay + guardrails). The bumps are short and explainable:

- `hook-first-2s`, `pattern-interrupt` → `attention` +1.
- `single-message`, `benefit-led`, `explicit-cta` → `clarity` +1.
- `no-fake-testimonial`, `proof-without-fabrication`,
  `product-in-use`, `human-first` → `credibility` +1.
- `explicit-cta`, `objection-handling`, `mobile-first` →
  `conversion` +1.
- `pattern-interrupt`, `unusual-angle`, `memorable-visual` →
  `distinctiveness` +1.
- `no-aggressive-claim`, `brand-safe-visual` → `brandSafety` +1.
- `human-review-required`, `never-automatic-video` → `brandSafety`
  becomes `needs_review`.

Per-tier baselines (matches AI-017D + AI-017F):

| Axis | safe | social_proof | performance | breakthrough |
|---|---|---|---|---|
| attention | medium | medium | high | very_high |
| clarity | very_high | high | high | medium |
| credibility | medium | very_high | medium | medium |
| conversion | medium | medium | very_high | high |
| distinctiveness | low | medium | medium | very_high |
| brandSafety | very_high | high | high | **needs_review** |

Overall label is derived from the axis distribution:

- `brandSafety = needs_review` → `review_required`.
- Otherwise, if at least one non-brandSafety axis is `very_high` and
  every axis is at least `medium` → `strong_candidate`.
- Otherwise, if every axis is at least `medium` → `safe_to_test`.
- Otherwise → `needs_refinement`.

## UI integration

`CreativeStudio.tsx` now computes one scorecard per image card, one
per video card, and one for the storyboard. Each card renders a
compact `CreativeScorePanel`:

- Six small score badges, one per axis.
- Overall pill (safe-to-test / strong-candidate / needs-refinement /
  review-required).
- Top strength + main watchout in a single line.
- Expandable "Pourquoi ce score ?" detail per axis.
- "Contexte scoring : <platform>" line.
- Pinned microcopy at the bottom.

Mobile (375px) collapses the score panel within the existing card
gutters; no horizontal scroll. The `needs_review` level uses an
amber tone (not red) to surface clearly without feeling alarming.

## What this PR does *not* do

- Does **not** call any real image / video / text provider.
- Does **not** introduce a media gateway.
- Does **not** mutate Vercel env, Supabase, Stripe, Inngest, or the
  filesystem.
- Does **not** ship `'draft' | 'standard' | 'premium'` labels — the
  generic technical labels remain forbidden in the media model.
- Does **not** add an "Optimiser avec IA" button anywhere.
- Does **not** resume AI-016E (smoke-test execution remains paused).
- Does **not** touch Issue #25 (i18n FR/EN/IT/DE/ES) backlog.

## Future work (out of scope)

- Calibrate the heuristics against real performance data when /
  if SocialBoost ingests A/B test outcomes — score hints could
  evolve from baseline+signal bumps to bayesian priors per platform.
- A future media gateway can read the same scorecard to gate auto
  publication (`overallLabel === 'review_required'` blocks
  auto-run, matches the `breakthrough` flow from AI-017C).
