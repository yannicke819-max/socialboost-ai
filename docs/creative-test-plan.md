# Creative Test Plan v1 (AI-017H)

A deterministic ranked plan of **up to 3 priority tests**, derived
from the creative pack (AI-017F) + the scorecards (AI-017G) + the
selected tier (AI-017C) + the platform context (AI-017G). Designed
to move the user from *"I have concepts"* to *"I know what to
test"*, without ever publishing anything automatically.

> **No publishing. No prediction. No provider call.** The plan is
> pure local data:
>
> - `isPublishingPlan: false`
> - `isPrediction: false`

## Spec-pinned microcopy

```
Plan indicatif : teste une variable à la fois.
SocialBoost ne publie rien automatiquement.
Les scores ne prédisent pas les résultats ; ils aident à choisir
quoi tester.
```

## API

```ts
buildCreativeTestPlan({
  pack,                                  // from buildCreativeBriefPack
  imageScorecards,                       // from buildCreativeScorecard
  videoScorecards,
  storyboardScorecard,
  selectedTier,                          // 'safe' | 'social_proof' | 'performance' | 'breakthrough'
  platformContext?,                      // default: first scorecard's context, else 'generic_social'
  language?,                             // 'fr' | 'en'
}) → CreativeTestPlan
```

```ts
interface CreativeTestPlan {
  recommendedOrder: CreativeTestItem[]; // ≤ 3 ranked tests
  platformContext: CreativePlatformContext;
  selectedTier: CreativeQualityTier;
  testBudgetNote: string;
  durationNote: string;
  safetyNote: string;
  oneVariableAtATime: string;
  noAutomaticPublishing: string;
  scoresDoNotPredict: string;
  isPublishingPlan: false;
  isPrediction: false;
}
```

```ts
interface CreativeTestItem {
  id: string;
  conceptKind: 'image' | 'video' | 'storyboard';
  conceptId: string;
  title: string;
  hypothesis: string;
  variableToTest: CreativeTestVariable;  // single variable — never a list
  primaryMetric: CreativeTestMetric;
  secondaryMetric?: CreativeTestMetric;
  whyThisTest: string;
  expectedSignal: string;
  watchout: string;
  recommendedDuration: string;
  reviewRequired: boolean;
  copyPromptSummary: string;             // safe to copy, no hidden metadata
}
```

## One variable at a time

Every test pins exactly one `CreativeTestVariable`:

- `hook` — opening 2 seconds, attention earner
- `visual_angle` — pattern interrupt, framing
- `proof_mechanism` — testimonial / usage / before-after
- `cta` — verb + object + deadline
- `format` — square vs portrait vs reel etc.
- `audience_pain` — which pain we name
- `offer_framing` — how we describe the value

Per-tier preferences:

| Tier | Variable to test |
|---|---|
| `safe` | `offer_framing` (image) / `cta` (video) |
| `social_proof` | `proof_mechanism` |
| `performance` | `cta` (image) / `hook` (video) |
| `breakthrough` | `visual_angle` |

## Platform-specific metrics

The plan picks the right primary + secondary metric for the
selected platform context:

| Context | Image primary | Video / storyboard primary |
|---|---|---|
| `linkedin_feed` | `qualified_clicks` | `qualified_clicks` (sec: `leads` / `demo_requests`) |
| `tiktok` | `ctr` | `thumbstop_rate` (sec: `hold_rate`) |
| `instagram_reels` | `saves` | `hold_rate` (sec: `thumbstop_rate`) |
| `youtube_shorts` | `ctr` | `hold_rate` (sec: `ctr`) |
| `meta_feed` | `ctr` | `thumbstop_rate` (sec: `ctr`) |
| `generic_social` | `ctr` | `thumbstop_rate` (sec: `ctr`) |

The full metric enum is documented in `CREATIVE_TEST_METRICS`:
`thumbstop_rate · hold_rate · ctr · saves · comments ·
qualified_clicks · demo_requests · leads · cpc · cpa_proxy`.

## Ranking

1. Collect all candidates (image / video / storyboard) with their
   AI-017G scorecards.
2. Sort by overall priority:
   `strong_candidate > safe_to_test > needs_refinement > review_required`.
3. Tie-break deterministically on `${kind}|${conceptId}` — never on
   timestamps or randomness.
4. Take the top 3, but cap **at most 1 breakthrough concept** in the
   top 3 (a candidate is "breakthrough" if `overallLabel ===
   'review_required'` or `mainWatchout === 'brandSafety'` or the
   pack-level tier is `breakthrough`).
5. Top up to 3 with remaining candidates if the cap consumed slots.

`reviewRequired` is `true` for every item where:

- the pack-level tier is `breakthrough`, OR
- the concept's overall label is `review_required`, OR
- the concept's `mainWatchout` is `brandSafety`.

## Duration notes

Per-tier indicative durations (rotation hints, not hard rules):

| Tier | Duration |
|---|---|
| `safe` | 5–7 days (baseline) |
| `social_proof` | 5–7 days |
| `performance` | 3–5 days (rotate fast) |
| `breakthrough` | 3–4 days (after human review) |

## UI integration (Creative Studio)

`CreativeStudio.tsx` computes one plan per render via `useMemo`:

```
pack + imageScorecards + videoScorecards + storyboardScorecard + tier + language
  → buildCreativeTestPlan(...)
  → <CreativeTestPlanSection plan={testPlan} language={language} />
```

The section renders:

- a title + subtitle + the three required microcopy strings,
- up to 3 ranked test cards with hypothesis / variable / metric /
  duration / expandable "Pourquoi ce test ?" detail,
- a `reviewRequired` amber badge on relevant cards,
- a single *"Copier le plan de test"* button that copies a plain-
  text summary via `navigator.clipboard.writeText` — no fetch.

Mobile (375px) collapses the cards inside the existing card gutters.
No horizontal scroll.

## What this does *not* do

- Does **not** publish anything. No campaign launch, no Stripe
  call, no Supabase write.
- Does **not** call any AI / image / video provider.
- Does **not** read `process.env` or use `Date.now()` /
  `Math.random()`.
- Does **not** add "Publier" / "Lancer campagne" / "Optimiser
  avec IA" / "Générer image" / "Générer vidéo" buttons (pinned by
  tests).
- Does **not** promise *winners* or *guaranteed results*.
- Does **not** affect Issue #25 (i18n FR/EN/IT/DE/ES) backlog.
- Does **not** resume AI-016E (smoke-test execution remains paused).

## Future work (out of scope)

- Export the plan as a CSV / campaign checklist so it can be loaded
  into Ads Manager / Reels / TikTok ad UI manually.
- Calibrate the metric preferences against real performance data
  once SocialBoost ingests A/B test outcomes.
