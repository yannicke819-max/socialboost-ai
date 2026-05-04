# AI Core Architecture — SocialBoost AI

> **Status** : draft strategic, AI-000 deliverable
> **Owners** : product + engineering
> **Last updated** : 2026-05-04

This document is the **single source of truth** for the AI core of SocialBoost. Anyone proposing a change to the AI pipeline, an agent prompt, or a model choice must reference this document and propose an amendment.

---

## 0. Mission

SocialBoost AI is **not** a ChatGPT wrapper. It is an **Editorial Revenue System** that turns a user's offer into a multi-platform campaign tied to a measurable business goal, in their voice, gated by a quality critic, and instrumented for revenue attribution.

The defensibility is **not** in the LLM — LLMs are commodities. It is in the data flywheel : Style DNA per user, Performance history per user, Offer Memory per user, Critic feedback per user. These accumulate over time and produce switching cost.

---

## 1. Seven directing axioms

Any decision violating one of these is rejected.

| # | Axiom | Practical consequence |
|---|---|---|
| 1 | **Deterministic pipeline + specialized agents** | No autonomous agent soup. The orchestrator knows in advance which steps will run and in which order. |
| 2 | **Strict Zod contracts at every step** | No "trust the LLM". Every output is validated by `.parse()`. Failure → retry or block. |
| 3 | **Memory-first** | Every agent **reads** memory before generating, and **writes** its result to memory after. No blind generation. |
| 4 | **Provider-agnostic** | All model calls go through `ModelRouter`. All tool calls (video, image, audio) through `ProviderRouter`. No hardcoded vendor names outside infra layer. |
| 5 | **Pay-per-use audited** | Every billable call writes to `credit_ledger` before execution (reservation), then adjusted after (actual). |
| 6 | **Replayable & traceable** | Any step can be re-run alone with its original inputs. Previous outputs are versioned in DB. |
| 7 | **Eval-gated** | No agent ships to prod without passing the golden set. No prompt change ships without an eval-diff. |

---

## 2. Pipeline blueprint

Eight deterministic stages. Each arrow = persistence in DB + replay possible.

```
                         USER INPUT
            offer · brief · goal of the month
                              │
                              ▼
                    ┌──────────────────┐
                    │ 1. Offer Brain   │   tier: fast
                    │ parse + structure│
                    └─────────┬────────┘
                              ▼
                    ┌──────────────────┐
                    │ 2. Market Radar  │   tier: standard
                    │ angles + trends  │   OPTIONAL — non-blocking, can self-skip
                    └─────────┬────────┘
                              ▼
                    ┌──────────────────┐
                    │ 3. Channel Strat │   tier: standard
                    │ angle × platform │
                    └─────────┬────────┘
                              ▼
                    ┌──────────────────┐
                    │ 4. Creative Dir  │   tier: standard
                    │ briefs / format  │
                    └─────────┬────────┘
                              ▼
                    ┌──────────────────┐
                    │ 5. Asset Planner │   tier: premium (best gen)
                    │ + generation     │   STYLE DNA filter applied here
                    └─────────┬────────┘
                              ▼
                    ┌──────────────────┐
                    │ 6. Critic QA     │   A. deterministic gates (no LLM)
                    │ rubric + fixes   │   B. LLM-judge with structured rubric
                    └────┬──────┬──────┘
                         │ pass │ fail blocking
                         ▼      └──> back to step 5 with fix-this payload
                    ┌──────────────────┐
                    │ 7. User Feedback │   UI swipe accept/edit/reject
                    │ corrections      │   each rejection feeds Style DNA
                    └─────────┬────────┘
                              ▼
                    ┌──────────────────────────────┐
                    │ 8. Export + Revenue Signal Prep│   no real social publish in V1
                    │ tracked links + export pack   │   short-link → click ingestion ready
                    └──────────────────────────────┘

         Cross-cutting (cron, not a step):
         ┌───────────────────────┐
         │ Weekly Growth Brief   │   reads campaigns + RS + Style DNA
         │ Monday 8am            │   writes a recommended next-week angle
         └───────────────────────┘
         Surfaced as a card module inside /studio or /lab,
         NOT as a top-level /agent route until it's truly autonomous.
```

### Stage details

| # | Stage | Input | Output | Tier | Notes |
|---|---|---|---|---|---|
| 1 | **Offer Brain** | raw offer text + metadata | structured `OfferBrief` | fast | Cheap parsing, no creativity |
| 2 | **Market Radar** | OfferBrief + niche | `MarketAngles[]` (3–5) | standard | OPTIONAL. No external API at MVP. Can self-skip. |
| 3 | **Channel Strategist** | OfferBrief + Angles + connected channels | `ChannelStrategy` per platform | standard | Decides which angle ships on which platform |
| 4 | **Creative Director** | ChannelStrategy + Style DNA + Goal | `CreativeBrief[]` per platform | standard | Format, hook angle, length, tone, visual direction |
| 5 | **Asset Planner / Generator** | CreativeBrief + Style DNA | `Asset[]` (text + visual brief) | premium | Style DNA filter applied hardest here |
| 6 | **Critic QA** | Asset + Style DNA + rubric | `CriticReport` | hybrid (rules + standard) | A. deterministic gates, B. LLM judge |
| 7 | **User Feedback** | Asset + CriticReport | user decision | n/a | UI loop, no LLM. Rejections feed Style DNA. |
| 8 | **Export + Revenue Signal Prep** | accepted Asset[] | export pack + tracked links | n/a | No real social publish — that's a future PR. Short-link CTA tracking starts here. |

### Decision points

- After Stage 6, if `overall_score < 75` OR `blocking_issues.length > 0` → loop to Stage 5 with `fix-instruction` (max 2 retries, then escalate to user).
- Stage 7 is **never automated** in MVP. Always human validation before Stage 8.
- Stage 8 is atomic per asset. If short-link generation fails, asset stays in `approved` state with a retry option — no silent failure.

---

## 3. Agent contract

Every agent in the pipeline implements a single interface. Form (TypeScript pseudocode — full types in `lib/types/agent.ts`) :

```ts
interface Agent<I, O> {
  readonly name: string;                 // 'offer-brain', 'critic-qa', etc.
  readonly version: string;              // semver, bumped on prompt changes
  readonly inputSchema: ZodSchema<I>;    // validated before call
  readonly outputSchema: ZodSchema<O>;   // validated after call
  readonly modelTier: ModelTier;
  readonly tools?: ToolAdapter[];
  readonly estimatedCostUnits: number;   // for credit pre-check
  readonly evalGoldenSet: string;        // path to /evals/golden/<agent>/

  run(input: I, ctx: AgentContext): Promise<AgentResult<O>>;
}

interface AgentContext {
  userId: string;
  campaignId: string;
  stepId: string;
  modelRouter: ModelRouter;
  memory: MemoryLayer;
  ledger: CreditLedger;
  trace: TraceLogger;
  abortSignal?: AbortSignal;
}

type AgentResult<T> =
  | { ok: true; output: T; metadata: AgentMetadata }
  | { ok: false; error: AgentError };
```

**Why this shape** :
- Agent swap is trivial (same contract, different name).
- Replay is trivial (read `campaign_steps.input`, re-run).
- Eval is trivial (golden set lives next to agent, CI blocks ship on regression).

---

## 4. Style DNA — purpose & shape

Style DNA is the **per-user fingerprint** that makes generation feel native to the user's voice. It is **the moat**.

### What it captures

- **Structured profile** (JSONB) : tone, expertise level, rhythm, vocabulary (signature/banned words/idioms), preferred hooks, narrative structures, channel-specific preferences.
- **Approved/rejected examples** : up to N examples per category, with `embedding` (pgvector) for similarity search. **Rejected examples are stored individually with structured `rejection_reason`** — no aggregate `rejected_embedding` at MVP (deferred until 2-3 months of real data).
- **Voice embedding** : aggregate of approved examples. Used by Critic for `style_match` scoring.

### Learning loop

Each user correction at Stage 7 generates a `style_dna_examples` row with `status = 'rejected'`. The voice embedding is recomputed periodically (Inngest cron). The `training_corrections_count` grows — exposed in the user UI as a signal of how personalized their DNA has become.

Full type : `lib/types/style-dna.ts`.

---

## 5. Critic QA — hybrid rubric

### A. Deterministic gates (run first, < 50ms, no LLM)

If any gate fails → block, return to Generator with structured fix payload.

| Gate | Checks |
|---|---|
| `length_within_bounds` | Body length within platform window (X ≤ 280, IG ≤ 2200, LinkedIn ≤ 3000, etc.) |
| `required_fields` | hook, body, cta non-empty; hashtags formatted per platform |
| `banned_words_absent` | StyleDNA.banned_words ∪ global LLM-cliché list ("dans un monde où", "game-changer", "let's gooo", "unlock the power", "synergize") |
| `forbidden_promises` | Regex : guaranteed % growth, ROI claims without source, medical/financial/legal claims |
| `single_cta` | Count of action verbs in imperative at end of body |
| `platform_constraints` | X char count, IG hashtag positioning, TikTok hook timing implied length, LinkedIn line breaks |
| `legal_safety` | No PII detected (regex emails/phones), no defamation flagged |

### B. LLM Judge (after gates pass)

Structured rubric, 10 criteria scored 0–5. **Weighted sum = 100. Threshold to pass : ≥75.**

| Criterion | Weight | What it measures |
|---|---|---|
| `hook_strength` | 15 | Does the first line earn the rest? |
| `style_match` | 15 | Does it sound like the user? (weighted with embedding cosine) |
| `business_potential` | 14 | Does it move toward the goal of the month? |
| `audience_fit` | 12 | Does it speak to the target ICP? |
| `channel_fit` | 12 | Native to the platform's format & rhythm? |
| `cta_clarity` | 10 | One clear next action? |
| `originality` | 8 | Distinct from generic AI output? |
| `no_bullshit` | 8 | Free of vague claims, weasel words? |
| `offer_understanding` | 6 | Reflects the offer's core promise? |
| `legal_safety` | blocking-only | Binary. If < 5 → blocking, regardless of overall score. |

**Why these weights** : SocialBoost generates campaigns that **sell**, not just stylish posts. `business_potential` + `cta_clarity` + `audience_fit` + `offer_understanding` collectively = 42 points. Defensibility (`hook_strength` + `style_match`) = 30 points. `no_bullshit` lower in weight but its worst manifestations are caught by deterministic gates upstream.

Full type : `lib/types/critic.ts`.

---

## 6. Memory Layer — minimal MVP scope

At AI-004 (Supabase schema minimal), only these tables ship :

```
offers
campaigns
campaign_steps
assets
critic_reports
```

All with RLS. Larger schema (publications, social_accounts, revenue_signals, credit_ledger, etc.) added incrementally in subsequent PRs. See [credit-system.md](./credit-system.md) and the AI-005..AI-011 sequence.

---

## 7. Anti-patterns — never do this

| ❌ Forbidden | ✅ Do this instead |
|---|---|
| Single LLM call doing the whole pipeline | 8-stage typed pipeline |
| LLM "decides" platform / format / order | Channel Strategist explicit decisions, structured |
| Hardcoded `claude-sonnet-4-6` outside ModelRouter config | Always `modelRouter.byTier('standard')` |
| Charge user raw provider cost | CreditLedger with margin transparency |
| Store OAuth tokens unencrypted | pgcrypto / Supabase Vault, no exception |
| Auto-publish without user explicit confirmation | Stage 7 mandatory in MVP |
| Promise video/avatar on landing before provider benchmarked | "bientôt" with Clock icon, as currently |
| Claim "your style was learned" without showing `training_corrections_count` | Metric exposed in `/settings/style-dna` |
| Cache LLM outputs cross-user | Prompt-level cache OK, never cross-user content cache |
| Train a global model on user content | Privacy policy forbids it. Style DNA stays per-user. |
| Wrap ChatGPT without adding moat | Style DNA + Critic + Memory + Revenue Signal + Credit System = the stack that escapes commodity |
| Fail silently on provider error | TraceLogger always logs, AgentError propagated, credits refunded |
| Keep an agent in prod without golden set passing | CI blocks on regression > 5pt |

---

## 8. Roadmap PR sequence

Validated with user, progressive, granular. No DB-first monolith.

| PR | Title | Scope |
|---|---|---|
| AI-000 | Architecture docs + types + fixtures | Pure docs + non-runtime types + fixtures + golden stubs |
| AI-001 | Offer Brain POC mocked | One agent only, Zod parse, mock ModelRouter, no DB |
| AI-002 | Eval Harness minimal | Golden dataset versioned, scoring, eval-diff, CI non-blocking initially |
| AI-003 | AgentContract + ModelRouter real | Contract live, TraceLogger minimal, fallback provider, no ProviderRouter video yet |
| AI-004 | Supabase schema minimal | offers, campaigns, campaign_steps, assets, critic_reports + RLS |
| AI-005 | Style DNA v1 | Brand Voice Setup wizard + DNA training |
| AI-006 | CreditLedger v1 | Reserve/finalize/refund lifecycle, allocations, topups |
| AI-007 | Provider Lab mocked | Tool adapter scaffolding, no real video/image yet |
| AI-008 | Pipeline core | Offer Brain → Market Radar → Strategist → Director → Planner |
| AI-009 | Critic QA | Deterministic gates + LLM judge |
| AI-010 | Export + Revenue Signal Prep | Short-link service, click ingestion, no social publish |
| AI-011 | First external provider beta | One provider only (image OR video), gated, benchmarked |

Each PR after AI-000 requires explicit user GO. Auth/billing/DB/security/integrations gates remain in force.

---

## 9. References

- [provider-lab.md](./provider-lab.md) — ModelRouter + ProviderRouter, emerging video watchlist
- [credit-system.md](./credit-system.md) — Pricing, allocations, premium gating
- `lib/types/` — Type contracts (this PR ships them)
- `evals/fixtures/` — Canonical input cases (this PR ships 15+)
- `evals/golden/` — Per-agent golden cases (this PR ships stubs)
