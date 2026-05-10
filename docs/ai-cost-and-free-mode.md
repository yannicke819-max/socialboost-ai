# AI cost model + Free mode — SocialBoost AI

> **Sprint AI-016A — pure model.** No real provider. No network. No env var.
> No package. No Stripe. No Supabase. No infra change.

## Product framing

- **Free = Prompt Copilot.**
  Free users get an expert AI brief, copyable into their own assistant.
  SocialBoost does NOT launch any paid AI model in Free mode.
- **Paid = AI Campaign Engine.**
  Starter, Pro, Business and Agency plans get the full SocialBoost engine
  with included credits and a real provider call (gated by AI-016 +
  `SOCIALBOOST_AI_PROVIDER_ENABLED=true`).

> Phrase produit Free :
> *« SocialBoost prépare ton brief IA expert, sans lancer de modèle payant. »*
>
> Phrase anti-confusion Free :
> *« Aucun modèle IA n'a été lancé par SocialBoost en mode gratuit. »*
>
> Phrase CTA Free :
> *« Copier le brief IA » / « Passer en Starter pour générer automatiquement »*

## TL;DR

- Tokens are an **internal** metric. Users only ever see **SocialBoost credits**.
- Plan **Free = dry-run forever**. Even when `SOCIALBOOST_AI_PROVIDER_ENABLED=true`,
  a Free user **never** triggers a real provider call. Admin **never** carries API
  cost for a Free user.
- BYOK ("bring your own key") is recognized at the type level via `mode: 'byok'`
  but **not wired** in AI-016A. A Free user with their own key still gets a
  non-network response today (`reason: 'byok_reserved_for_future'`).
- Paid plans use `decideAiExecution` and `canRunAiAction` before any gateway call.

## Files

```
lib/offer-workspace/ai-cost-model.ts        # pricing, action budgets, quotas, routing
lib/offer-workspace/ai-entitlements.ts      # decideAiExecution — single decision point
lib/offer-workspace/free-prompt-generator.ts # Free Prompt Pack — 4 formats, no provider
docs/ai-cost-and-free-mode.md               # this file
```

## How the prompt orchestrator (AI-015) feeds Free mode

The prompt orchestrator is purely deterministic. It produces a structured
`PromptVersion` (system + user prompt + guardrails + quality checklist + expected
output) without any provider call. AI-016A turns that into a Free Prompt Pack:

- **The orchestrator builds the brief.**
  Free users see the brief, copy it, iterate on the inputs.
- **The Free Prompt Pack adapts the brief to 4 destinations.**
  - `generic_markdown` → "Compatible avec Claude, ChatGPT, Gemini ou Mistral".
  - `claude_xml` → "Optimisé pour Claude / assistants compatibles XML".
  - `chatgpt_markdown` → "Optimisé pour ChatGPT".
  - `gemini_structured` → "Optimisé pour Gemini".
- **The Pack does NOT replace a provider.**
  No model "answers" the brief — Free users have to paste it into their own tool.
- **The Pack costs zero.**
  `buildFreePromptPack` is pure. No tokens spent. No admin invoice.
- **No format requests chain-of-thought.**
  No `<thinking>` block, no "step by step" directive. Tests pin this invariant.

> The "Claude Prompt Wizard" reference shared by the product team **inspires**
> the Free Prompt Pack's section structure (rôle / contexte / tâche /
> contraintes / format attendu / garde-fous / checklist qualité). It is **not
> imported as code** — the Pack stays pure SocialBoost.

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
   freePromptPackAllowed=true          ├─ insufficient_credits
   reason='free_prompt_pack_only'      └─ allowed_included_credits
                                          mode='included_credits'
                                          providerCallAllowed=true
                                          adminCostAllowed=true
                                          freePromptPackAllowed=true (universal fallback)
```

## Hard rules pinned by tests

1. `decideAiExecution({ plan: 'free' })` → `mode = 'dry_run'`,
   `providerCallAllowed = false`, `adminCostAllowed = false`,
   `freePromptPackAllowed = true`, `reason = 'free_prompt_pack_only'`.
2. The above holds **even with** `hasUserProvidedApiKey: true` (mode flips to
   `'byok'`, reason `'byok_reserved_for_future'`, but `providerCallAllowed`
   stays `false` — BYOK is not wired in AI-016A).
3. The above holds **even with** `providerFlagEnabled: true`. The entitlements
   layer is BEFORE the env flag in the call chain.
4. Free users **do not consume credits** — `remainingAfter` is `undefined`
   on a Free dry-run.
5. `selectRecommendedModel({ plan: 'free', ... })` returns `mock:dry-run`
   for every action × every quality mode.
6. Opus is **never selected automatically** by `selectRecommendedModel` for
   any plan / qualityMode (`automaticSelectionAllowed: false`).
7. Premium models are only routed to when `plan ∈ {pro, business, agency}`
   AND `qualityMode === 'premium'` AND the action is high-stakes.
8. `external_inspiration_analysis` defaults to economy even on premium-capable
   plans — pattern extraction does not benefit from Sonnet.
9. Insufficient credits on a paid plan blocks the run when `hardCapEnabled`
   (every plan in AI-016A).
10. `buildFreePromptPack` always returns `providerCallAllowed: false` and
    `adminCostAllowed: false`, regardless of format.
11. Every Free Prompt Pack format includes the "Aucun modèle IA n'a été lancé"
    notice and the "prêt à coller" notice.
12. No Free Prompt Pack format requests chain-of-thought (no `<thinking>`,
    no "step by step").

## Plan quotas (AI-016A baseline)

| Plan | Monthly credits | Max / action | Premium | Expert | Hard cap | Overage | Free Prompt Pack |
|---|---|---|---|---|---|---|---|
| free | 0 | 0 | ❌ | ❌ | ✅ | ❌ | ✅ |
| starter | 1 000 | 100 | ❌ | ❌ | ✅ | ❌ | ✅ |
| pro | 4 000 | 300 | ✅ (limited) | ❌ | ✅ | ❌ | ✅ |
| business | 10 000 | 600 | ✅ | ❌ | ✅ | ✅ | ✅ |
| agency | 25 000 | 1 000 | ✅ | ❌ | ✅ | ✅ | ✅ |

Numbers are **provisional** and will be revisited when AI-016 (real provider) +
billing land. The Free Prompt Pack is available on every plan as a universal
fallback (e.g. when a paid plan exhausts its monthly credits).

## Credit conversion

```
estimatedCredits = max(actionMinimum, ceil(estimatedUsd × 1000))
```

- 1 USD of provider spend ≈ 1 000 SocialBoost credits.
- Each action has a minimum credit floor so trivial calls never appear free
  to the user.
- A `safetyMultiplier` (default 3) covers retries / JSON repairs / prompt
  growth / guardrail overhead.
- `mock:dry-run` always estimates **0 USD**; the credit number stays at the
  action's minimum floor for UX consistency (so the Free user can see
  "what it would cost on a paid plan").
- `riskLevel` is computed from the credit estimate (low < 25, medium < 150,
  high otherwise) so users reason in product units.

## What this PR does NOT do

- Does not add a real provider call for any plan, including paid ones — that
  remains gated by AI-016 (`SOCIALBOOST_AI_PROVIDER_ENABLED` + API key).
- Does not enforce billing — there is no Stripe / Supabase wiring here.
- Does not persist credit balances — the `remainingCredits` parameter is
  injected by the caller. Persistence is an AI-016B follow-up.
- Does not implement BYOK end-to-end. The mode is reserved; the call path
  stays a non-network response for Free even with a user key.

## Future hookups (AI-016B+)

- Persist a per-offer / per-workspace `credits_balance` field (additive on
  the v1 envelope).
- Add a server-only billing module that reads Stripe subscription state and
  returns the resolved `SocialBoostPlan` for the current user.
- Wire BYOK: when a Free user provides their own API key, `decideAiExecution`
  may then transition `byok` → `providerCallAllowed: true`,
  `adminCostAllowed: false`. The gateway calls the user's API on the user's
  dime.
- Add monthly credit reset (Inngest cron).
- Add a "Free Prompt Pack export" surface that lets paying users download
  multi-format packs in bulk (campaign-level rather than action-level).
