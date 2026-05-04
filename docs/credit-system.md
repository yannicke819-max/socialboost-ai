# Credit System — pricing, allocations, premium gating

> **Status** : draft strategic, AI-000 deliverable
> **Owners** : product + engineering
> **Last updated** : 2026-05-04

This document specifies how SocialBoost charges users for AI operations, in a way that is **transparent, auditable, and provider-agnostic**. Users see credits, never raw provider costs.

---

## 1. Why credits and not direct billing

External providers (LLMs, video, image, voice) have **highly variable real cost** :

- A text generation : ~€0.002
- A campaign blueprint (10 posts × 4 platforms) : ~€0.05
- An avatar video 30s (HeyGen-class) : ~€0.50
- A generative video 5s (Runway-class) : ~€1.00

Charging users in raw cents is :

- Confusing (10 different prices in one campaign).
- Provider-locked (changing provider changes user-facing price).
- Margin-opaque (user sees our cost, kills perceived value).

A **credit** is :

- A neutral unit, abstracts over providers.
- Allows margin transparency between us and the provider while keeping clean UX.
- Enables monthly allocations + topups + plan caps.
- Survives provider switches (we re-tune the matrix internally, user-facing pricing stable).

---

## 2. Credit unit definition

**1 credit ≈ €0.025 of internal value at default margin** (informational only — we never expose this conversion rate to users).

Users only see :

- Their current credit balance.
- The credit cost of an action **before** they trigger it.
- Their monthly allocation and topup options.

---

## 3. Pricing matrix (user credits)

For each operation type, we define `user_credit_cost` such that `provider_cost × margin_factor ≈ user_credit_cost × €0.025`. Margin factor varies 2× to 4× depending on the operation's price elasticity.

| Operation | User credits | Provider cost (approx) | Margin |
|---|---|---|---|
| `text-generation` (1 post, 1 platform) | 1 | €0.002 | ≈4× |
| `style-dna-training` (initial setup) | 5 | €0.03 | ≈3× |
| `critic-qa-pass` (per asset) | 1 | €0.005 | ≈3× |
| `regeneration` (per asset, after first) | 1 | included | — |
| `carousel-outline` | 3–5 | €0.01 | ≈4× |
| `video-script` | 2–3 | €0.01 | ≈4× |
| `campaign-blueprint` (10 posts × 4 platforms) | 8–10 | €0.05 | ≈3× |
| `trend-scan` (Market Radar with web tool) | 10–15 | €0.10 | ≈3× |
| `weekly-growth-brief` | 20–30 | €0.20 | ≈3× |
| `image-generation` (1 asset, Flux-class) | 5 | €0.04 | ≈2.5× |
| `avatar-video-30s` (HeyGen-class) | 50–70 | €0.50 | ≈2.5× |
| `generative-video-5s` (Runway-class) | 100–140 | €1.00 | ≈2.5× |
| `voice-clone-tts-1min` | 15–25 | €0.15 | ≈3× |

**Range** (e.g. "3–5") means : exact value depends on input length, output length, and model tier resolved at runtime by ModelRouter. The user always sees a definite cost **before** triggering the action.

---

## 4. Plan allocations

Monthly credits granted on the 1st of each month. Unused credits **do not** roll over (encourages usage, simpler accounting).

| Plan | Monthly credits | Topups available |
|---|---|---|
| **Free** | 20 | ❌ |
| **Solo** | 150 | ✅ |
| **Pro** | 600 | ✅ |
| **Agency** | 2000 | ✅ — fair-use cap with alerts at 80% / 100% / 150% |

### Implications

- Free 20 = ~5 simple campaign blueprints, no premium ops, no avatar/gen video.
- Solo 150 = ~15 campaigns OR mix with image generation.
- Pro 600 = ~60 campaigns OR ~10 avatar videos OR mix.
- Agency 2000 = ~200 campaigns OR ~30 avatar videos. Above 2000, alerts trigger.

### No "soft unlimited"

Agency is **explicitly capped at 2000/mo**. Above the cap, throttling kicks in (slower processing, alerts), and topups are encouraged. This protects margin and avoids API cost surprises from abusive accounts.

### Plan capabilities (orthogonal to credits)

| Capability | Free | Solo | Pro | Agency |
|---|---|---|---|---|
| Number of Brand Voices | 1 | 1 | 3 | 10 |
| Number of social accounts | 1 | 2 | 5 | 20 multi-client |
| Premium video (avatar / gen) | ❌ | ❌ | ✅ (with confirmation) | ✅ |
| Weekly Growth Brief | ❌ | ❌ | ✅ | ✅ |
| Concurrent campaigns | 1 | 3 | 10 | 100 (fair-use) |
| Sieges | 1 | 1 | 1 | 3 included |
| API access | ❌ | ❌ | ❌ | ✅ |

---

## 5. Topups (one-time purchases)

Stripe one-time payments. Available to Solo / Pro / Agency, not Free.

| Topup | Price | Effective rate |
|---|---|---|
| 100 credits | **9 €** | 9 c€/credit |
| 500 credits | **39 €** | 7.8 c€/credit |
| 2000 credits | **129 €** | 6.45 c€/credit |

Topup credits :
- Stack on top of the monthly allocation.
- Do not expire as long as the subscription is active.
- Are consumed **after** the monthly grant (LIFO from the user's perspective : monthly gets used first; topups are a buffer).

---

## 6. Premium operations — explicit confirmation

Any operation with `user_credit_cost > 50` requires **explicit user confirmation** via a modal before execution.

Examples :
- `avatar-video-30s` (50–70 credits) → confirmation required.
- `generative-video-5s` (100–140 credits) → confirmation required.
- `voice-clone-tts-1min` if combined with multiple variants exceeding 50 credits → confirmation required.

The confirmation modal shows :
- Exact credit cost (computed at runtime by `ModelRouter.estimateCost` + adapter).
- Current balance.
- Balance after.
- A clear "Confirm" / "Cancel" action.

**No surprise billing. Ever.**

---

## 7. CreditLedger lifecycle

Each billable operation goes through three lifecycle stages :

```
1. preCheck  → "do you have enough ? do you need confirmation ?"
2. reserve   → hold the credits before the API call (txn_type = 'reserve')
3. finalize  → adjust to actual cost after the call (txn_type = 'finalize')
   OR
   refund    → if the call failed (txn_type = 'refund')
```

### Why reserve + finalize

- **Reserve** prevents users from spawning many parallel calls that collectively exceed their balance. The reservation locks the credits for ~5 minutes (or until finalize).
- **Finalize** handles the case where actual cost differs from estimate (longer output than expected → adjust upward up to a cap; shorter → adjust downward).
- **Refund** ensures that failed calls don't cost the user.

### Implementation

`credit_ledger` table (added at AI-006) records every transaction :

```
id
user_id
txn_type        // 'reserve' | 'finalize' | 'refund' | 'topup' | 'monthly_grant'
amount_credits  // signed (+ for grant/topup, − for usage)
provider_cost_cents  // for audit/margin analysis
balance_after
related_step_id
related_asset_id
metadata        // jsonb, can hold provider, model, tokens
created_at
```

A user's current balance is computed as `SUM(amount_credits)` over their entries. Indexed on `(user_id, created_at DESC)` for fast lookup.

### Atomicity

Reservation and finalize must be in the same database transaction context as the agent call boundary. Implementation will use Supabase transactions or PostgreSQL row-level locks. Detail spec at AI-006.

---

## 8. Hard caps and abuse prevention

| Mechanism | Trigger |
|---|---|
| Daily cap | 5× the average daily consumption of the plan, soft alert |
| Hourly burst cap | 50% of monthly allocation in 1 hour, throttle + alert |
| Concurrency limit | Per-plan (Free 1, Solo 3, Pro 10, Agency 100 fair-use) |
| Premium ops limit | Confirmation required > 50 credits, hard cap on consecutive premium ops |
| Suspicious patterns | Multiple plan downgrades + heavy usage, manual review |

These mechanisms protect both the user (from accidental cost) and us (from API cost surprises).

---

## 9. User-facing UI

The Credit System surfaces in 3 places :

- **Topbar** : current balance pill, click → `/billing/credits` (added at AI-006)
- **Confirmation modals** : on premium ops, before any reservation
- **Monthly summary email** : balance reset, topup recommendations if usage > 80%

Never surface :
- Raw provider cost in cents.
- Margin factor.
- Internal model tier names.

---

## 10. Anti-patterns — never do this

| ❌ Forbidden | ✅ Do this instead |
|---|---|
| Charge user the raw provider cost | CreditLedger with margin |
| Skip preCheck and let the user run out mid-call | Always preCheck → reserve |
| Surface provider name or model name in UI | Show category (e.g. "avatar video") |
| Allow premium ops without confirmation modal | Mandatory modal > 50 credits |
| Soft-unlimited Agency plan | Cap at 2000/mo + topups |
| Roll over unused monthly credits | Reset on the 1st, encourages usage |
| Mix topup credits and monthly grant in user UI | Show both separately, clear which expires |
| Refund only on user complaint | Auto-refund on every failed call |
| Track "internal cost" in user-facing analytics | Internal cost is an admin metric, never user-facing |

---

## 11. References

- [ai-core.md](./ai-core.md) — Pipeline & where credits are charged
- [provider-lab.md](./provider-lab.md) — Provider cost feeds the matrix
- `lib/types/credit.ts` — Type contracts (this PR ships them)
- AI-006 — CreditLedger v1 implementation
