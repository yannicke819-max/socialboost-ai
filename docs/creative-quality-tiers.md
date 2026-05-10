# Creative Quality Tiers v1 (AI-017C)

SocialBoost differentiates creative output by **social-ad strategy**,
not by generic technical labels like *draft / standard / premium*. The
four tiers below each correspond to a proven creative pattern in
social advertising, and each pulls a different blend of brand-safety
risk, attention capture, conversion intent, and human-review
requirements.

## The four tiers

### `safe` — clarity-first
- **For**: cautious brands, first-time audiences, regulated verticals.
- **Criteria**: clear message in ≤8 words, readable in ≤2s, no
  absolute claims, no guaranteed-results promise, recognisable visual.
- **Brand safety risk**: 1 / 4 (lowest).
- **Image cost**: 5 credits. **Video cost**: 6 credits / second.
- **Human review**: not required.

### `social_proof` — real human, real usage
- **For**: UGC, creator-led, client testimonials.
- **Criteria**: human at the centre, authentic testimonial only,
  **never** a fake testimonial, before/after only when measurable and
  not deceptive, written consent for any human face shown.
- **Brand safety risk**: 2 / 4.
- **Image cost**: 10 credits. **Video cost**: 10 credits / second.
- **Human review**: not required.

### `performance` — designed for conversion
- **For**: paid acquisition campaigns, retargeting, performance
  marketing.
- **Criteria**: 2-second hook, immediate benefit, one explicit
  objection handled, clear CTA (verb + object + concrete deadline),
  legible on-screen text (AA contrast minimum), mobile-first framing
  (9:16 or 4:5).
- **Brand safety risk**: 2 / 4.
- **Image cost**: 15 credits. **Video cost**: 15 credits / second.
- **Human review**: not required.

### `breakthrough` — pattern interrupt
- **For**: brand campaigns, distinctiveness work, scroll-stopping
  hero creatives.
- **Criteria**: pattern interrupt (visual or narrative), unexpected
  angle distinct from competitors, strong emotion (within
  guardrails), bold visual contrast, **mandatory human review before
  any future real provider call**.
- **Brand safety risk**: 4 / 4 (highest).
- **Image cost**: 35 credits. **Video cost**: 40 credits / second.
- **Human review**: **always required**, every plan, every flag.

## Plan ladder

| Plan | Image tiers | Video tiers | Max video s | Breakthrough video |
|---|---|---|---|---|
| Free | (none — `prompt_only`) | (none) | 0 | (none) |
| Starter | safe / social_proof / performance | (none) | 0 | (none) |
| Pro | safe / social_proof / performance | safe / social_proof | 15 | (none) |
| Business | all four | safe / social_proof / performance | 30 | (none) |
| Agency | all four | safe / social_proof / performance | 30 | manual review only |

Notes:
- Free is **always** `prompt_only`, regardless of any future media
  provider flag or user-provided key. Same Free-hard-rule pattern as
  the text side: enforced structurally by the entitlements layer.
- `breakthrough` video is **never automatic** for any plan. The only
  path is `manual_review_required` on Agency. Every other plan stops
  at `prompt_only`.
- Pro's video cap is 15s. Business / Agency cap is 30s.

## Decision shape

`decideMediaExecution({ plan, kind, tier, videoDurationSec?, remainingMediaCredits?, mediaProviderFlagEnabled? })`
returns a `MediaProviderDecision`:

| Field | Meaning |
|---|---|
| `mode` | `prompt_only` / `included_credits` / `manual_review_required` |
| `reason` | one of: `free_prompt_only`, `video_not_in_plan`, `tier_not_in_plan`, `video_duration_above_plan_cap`, `breakthrough_video_manual_review`, `breakthrough_image_manual_review`, `insufficient_credits`, `allowed_included_credits` |
| `mediaProviderCallAllowed` | `true` ONLY when a future media gateway is allowed to make a network call |
| `adminCostAllowed` | `true` ONLY when admin can bear the API cost (paid + allowed mode) |
| `humanReviewRequired` | `true` for `breakthrough` (always) and any other manual-review path |
| `estimate` | `MediaEstimate` with credits + tier hints (attention / conversion / brand safety) |
| `suggestedUpgradePlan` | next plan that would resolve the refusal, when applicable |

## What this module does *not* do

- Does **not** call any image / video provider. AI-017C is the
  scaffold; a future media gateway will consult `decideMediaExecution`
  before any fetch, the same way the text gateway consults
  `decideAiExecution`.
- Does **not** enable BYOK on the media side.
- Does **not** mutate Vercel env, Supabase, Stripe, Inngest, or the
  filesystem.
- Does **not** ship `'draft' | 'standard' | 'premium'` labels — those
  generic terms are explicitly forbidden in the media model and pinned
  by tests. The text-side `AiQualityTier` (`economy / standard /
  premium / expert`) in `ai-cost-model.ts` is a separate surface and
  is unaffected.
- Does **not** affect Issue #25 (i18n FR/EN/IT/DE/ES) backlog.
- Does **not** resume AI-016E (smoke-test execution remains paused).
