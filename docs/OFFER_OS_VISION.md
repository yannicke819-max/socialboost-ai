# Offer OS — Vision (AI-008c)

> One-page summary of where the SocialBoost AI workspace is heading and what's
> mock today.

## Production canonique

L'URL **canonique** du projet `socialboost-ai` côté Vercel est :

```
https://socialboost-blue.vercel.app
```

**Ne plus utiliser** `https://socialboost.vercel.app` — c'est un autre projet
Vercel sans rapport, qui partage seulement le slug. (Diagnostic AI-008a, 2026-05-05.)

## What it is

The SocialBoost AI workspace is an **Offer OS** — a system that turns a raw
business offer into a distribution-ready package, then helps the operator
ship it, measure it (mock), and improve it.

It is **offer-centric**, not channel-centric. The unit of analysis is the
offer (a promise + a proof + an audience). Channels (LinkedIn, email,
landing page) are derivatives.

## Why offer-centric

A channel-centric tool ("LinkedIn scheduler", "email automation") optimises a
local metric (open rate, CTR) but ignores whether the offer behind the post
even works. An Offer OS asks the right question first: **does this offer
clarify a transformation that someone is willing to pay for?** Then, only
once that clarity exists, ships the assets across channels.

## Lifecycle (the 6-step flow)

1. **Generate** — AI-007 / AI-006: Offer Brain takes a raw description and
   returns hooks, angles, objections, CTAs, social posts and a landing-page
   outline. FR / EN. No invented metric — every figure is anchored on the
   user's `proofPoints`.
2. **Save** — AI-008a: one click in `/ai/offer-brain` saves the brief +
   actionables snapshot to the workspace. Assets (hook, angle, objection,
   CTA, social_post, landing_section, …) are derived next to the offer.
3. **Approve** — AI-008b: each asset can be flagged `draft → review_mock →
   approved → archived`. Approval freezes the base of future variants.
4. **Schedule** — AI-008b: Calendar tab shows a week view per offer. Slots
   carry `planned / sent_mock / cancelled`. **No real publishing** today.
5. **Analyse** — AI-008b: Analytics tab shows deterministic mock KPIs
   (impressions, clicks, replies, conversions, CTR, conv. rate) with
   sparklines and breakdowns by channel / asset / dimension. Seeded by
   `hash(offer.id)` so the same offer always shows the same numbers
   for demo purposes.
6. **Improve** — AI-008b: Recommendations tab applies 8 deterministic
   rules over the offer's state and surfaces the next best lever:
   "Add a proof", "Try email", "Diversify channels", etc. Each rec
   carries a CTA that deep-links into the right tab.

## 8 dimensions of performance

The workspace measures and rolls up across **eight orthogonal dimensions**:

```
offer · promise · proof · angle · objection · cta · asset · channel
```

Every asset declares which dimensions it touches (via `KIND_TO_DIMENSIONS`).
Future analytics will be able to answer: "Which proof drives the most
conversion?", "Which angle works on LinkedIn but not email?".

## What's mock today

| Layer | Status | Why |
|---|---|---|
| Offer Brain generation | ✅ real (mock-deterministic + Anthropic gated) | AI-006 |
| Workspace persistence | 🟡 localStorage | AI-008a — Supabase migration ready (AI-004) but **not applied** |
| Asset derivation | ✅ real (deterministic from actionables) | AI-008a |
| Calendar slots | 🟡 mock — `sent_mock`/`scheduled_mock` never trigger a real POST | AI-008b |
| Analytics | 🟡 mock — deterministic numbers, no real connector | AI-008b |
| Recommendations | 🟡 mock — pure rules engine, no model call | AI-008b |
| UTM tags | 🟡 generated, not yet attached to real links | AI-008b |
| Approval workflow | 🟡 single-user local — no roles, no review process | AI-008b |
| Sharing across browsers / devices | ❌ not yet | requires Supabase write path |

## What will be real later

Roadmap commits captured in conversation, **none started**:

- **AI-009** — Asset Generator: image prompts, video scripts, thumbnails
- **AI-010** — Content Calendar: real scheduling on top of AI-008b mock
- **AI-011** — Publishing connectors: LinkedIn / Meta / email actual POSTs
- **AI-012** — Analytics: real connectors for impressions / clicks / etc.
- **AI-013** — AI Optimization Loop: real-model recommendations, A/B testing

Each step will require:
- a dedicated PR
- explicit user opt-in flag (à la `OFFER_BRAIN_API_ENABLED`)
- a runbook update (this file + `docs/ai/`)

## Rules for changes

- ❌ Do **not** wire real connectors without the dedicated PR
- ❌ Do **not** apply the Supabase migration without explicit human OK
   (see `docs/ai/supabase-migration-runbook.md`)
- ❌ Do **not** activate `OFFER_BRAIN_API_ENABLED` in Production by default
- ✅ Local-first stays the default — every new feature starts mock
- ✅ All "mock" surfaces must carry a visible `MOCK V1` (or similar) badge
   in the UI

## Local data model — quick reference

Stored in `localStorage` under the key `socialboost.offer_workspace`:

```ts
{
  version: 1,
  offers: Offer[],                  // brief + lastActionables snapshot
  assets: Asset[],                  // 13 kinds, 4 statuses, dimensions
  calendar_slots: CalendarSlot[],   // 3 statuses (planned/sent_mock/cancelled)
  recommendations: Recommendation[], // stable id, status persisted
}
```

No secrets, no tokens, no PII beyond what the user types into the brief.
Export/import via JSON (header buttons on `/ai/offers`).

## Operating procedure

1. Visit `https://socialboost-blue.vercel.app/ai/offers`
2. If empty, click **« Charger des exemples »** to see a demo workspace, or
   **« Créer depuis Offer Brain »** to start fresh.
3. Read the **« Comment ça marche »** banner once.
4. The **« Prochaine meilleure action »** card always tells you the single
   highest-leverage move.
5. Each offer detail tab carries its own MOCK V1 explanation.

When unsure about what is real vs simulated: hover any badge — the title
attribute explains.
