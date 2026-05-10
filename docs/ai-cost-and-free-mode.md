# AI cost model + Free mode — SocialBoost AI

> **Sprint AI-016A — pure model.** No real provider. No network. No env var.
> No package. No Stripe. No Supabase. No infra change.

## TL;DR

- Tokens are an **internal** metric. Users only ever see **SocialBoost credits**.
- Plan **Free = dry-run forever**. Even when `SOCIALBOOST_AI_PROVIDER_ENABLED=true`,
  a Free user **never** triggers a real provider call. Admin **never** carries API
  cost for a Free user.
- BYOK ("bring your own key") is recognized at the type level but **not wired**
  in AI-016A. A Free user with their own key still falls back to dry-run today.
- Paid plans use the `decideAiExecution` decision and `canRunAiAction` quota
  check before any gateway call.

## Files

```
lib/offer-workspace/ai-cost-model.ts     # pricing, action budgets, quotas, routing
lib/offer-workspace/ai-entitlements.ts   # decideAiExecution — single decision point
docs/ai-cost-and-free-mode.md            # this file
```

## How the prompt orchestrator (AI-015) feeds Free mode

The prompt orchestrator is purely deterministic. It produces a structured
`PromptVersion` (system + user prompt + guardrails + quality checklist + expected
output) without any provider call. This is exactly what Free needs:

- **The orchestrator builds the brief.**
  Free users see the brief, can copy it, can iterate on the inputs.
- **The orchestrator does NOT replace a provider.**
  No model "answers" the brief — Free users have to copy it into their own tool
  if they want a generation today.
- **The orchestrator can produce briefs without IA cost.**
  `buildExpertPrompt` is a pure function. No tokens spent. No admin invoice.
- **Free = expert copyable prompt, not server generation.**
  This is the product framing for the Free tier.

## Decision flow

```
                            ┌────────────────────────────────────────┐
                            │  Caller (UI, API route, scheduler...)  │
                            └────────────────────┬───────────────────┘
                                                 │
                                                 ▼
                              decideAiExecution(input) ─── pure
                                                 │
        ┌────────────────────────────────────────┼─────────────────────────────────────────┐
        ▼                                        ▼                                         ▼
   plan='free'                         plan='starter'..'agency'                 unknown_model / etc
   mode=dry_run                        canRunAiAction()                         allowed=false
   providerCallAllowed=false           ├─ over_action_cap                       providerCallAllowed=false
   adminCostAllowed=false              ├─ premium_not_allowed                   adminCostAllowed=false
   reason='free_plan_dry_run_only'     ├─ insufficient_credits
                                       └─ allowed_included_credits
                                          mode='included_credits'
                                          providerCallAllowed=true
                                          adminCostAllowed=true
```

## Hard rules pinned by tests

1. `decideAiExecution({ plan: 'free' })` → `mode = 'dry_run'`,
   `providerCallAllowed = false`, `adminCostAllowed = false`.
2. The above holds **even with** `hasUserProvidedApiKey: true` (BYOK not yet
   supported).
3. The above holds **regardless of** `SOCIALBOOST_AI_PROVIDER_ENABLED`. The
   entitlements layer is BEFORE the env flag in the call chain. The gateway,
   when reached by a paid plan, then consults the env flag for its OWN
   reasons.
4. Free users **do not consume credits** — `remainingCredits` is unchanged
   on a Free dry-run.
5. Opus is **never selected automatically** by `selectRecommendedModel` for
   any plan / qualityMode.
6. Premium models are only routed to when `plan ∈ {pro, business, agency}`.
7. Insufficient credits on a paid plan blocks the run when `hardCapEnabled`
   (free / starter / pro) — never silently overage.

## Plan quotas (AI-016A baseline)

| Plan | Monthly credits | Max credits / action | Premium allowed | Hard cap |
|---|---|---|---|---|
| free | 100 | 25 | ❌ | ✅ |
| starter | 1 000 | 100 | ❌ | ✅ |
| pro | 4 000 | 300 | ✅ (limited) | ✅ |
| business | 10 000 | 600 | ✅ | — |
| agency | 25 000 | 1 000 | ✅ | — |

Numbers are **provisional** and will be revisited when AI-016 (real provider) +
billing land.

## Credit conversion

```
estimatedCredits = max(actionMinimum, ceil(estimatedUsd × 1000))
```

- 1 USD of provider spend ≈ 1 000 SocialBoost credits.
- Each action has a minimum credit floor so trivial calls never appear free
  to the user.
- A `safetyMultiplier` (default 3) covers retries / JSON repairs / prompt
  growth / guardrail overhead.

## What this PR does NOT do

- Does not add a real provider call for any plan, including paid ones — that
  remains gated by AI-016 (`SOCIALBOOST_AI_PROVIDER_ENABLED` + API key).
- Does not enforce billing — there is no Stripe / Supabase wiring here.
- Does not persist credit balances — the `remainingCredits` parameter is
  injected by the caller. Persistence is an AI-016B follow-up.
- Does not implement BYOK end-to-end. The shape is reserved; the call path
  stays dry-run for Free even with a user key.

## Future hookups (AI-016B+)

- Persist a per-offer / per-workspace `credits_balance` field (additive on
  the v1 envelope).
- Add a server-only billing module that reads Stripe subscription state and
  returns the resolved `SocialBoostPlan` for the current user.
- Wire BYOK: when a Free user provides their own API key, `decideAiExecution`
  may return `mode='byok'`, `providerCallAllowed=true`, `adminCostAllowed=false`.
- Add monthly credit reset (Inngest cron).
