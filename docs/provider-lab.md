# Provider Lab — Model & Tool routing

> **Status** : draft strategic, AI-000 deliverable
> **Owners** : engineering
> **Last updated** : 2026-05-04

This document specifies how SocialBoost stays **provider-agnostic** for both LLMs and external tools (video, image, audio, data). No vendor name appears in application code outside the adapter layer defined here.

---

## 1. Why a Provider Lab

LLMs and creative-asset providers move fast. We refuse :

- **Vendor lock-in** : being unable to switch from one provider to another within a release cycle.
- **Hidden hardcoding** : `'claude-sonnet-4-6'` or `'heygen'` strings scattered across business logic.
- **Untested commitments** : exposing a feature on the landing or pricing before the provider passed our benchmark.

The Provider Lab is the **single point** where new providers are introduced, tested, ranked, and either promoted to production or kept on a watchlist.

---

## 2. ModelRouter — LLM routing

### Tiers

Four tiers, mapped to providers via configuration only :

| Tier | Use case |
|---|---|
| `fast` | Tagging, parsing, classification, deterministic-ish reformulation, Critic gates |
| `standard` | Strategist, Creative Director, Critic LLM-judge, Market Radar |
| `premium` | Asset Planner / final generation |
| `frontier` | Complex audits, Weekly Growth Brief deep mode, debug |

### Default tier mapping (configurable, env-driven)

```
fast      → anthropic:claude-haiku-4-5
standard  → anthropic:claude-sonnet-4-6
premium   → anthropic:claude-sonnet-4-6
frontier  → anthropic:claude-opus-4-7
```

These mappings live in `config/model-router.ts` (created in AI-003). **No vendor name appears outside this config and the adapter implementations.**

### Interface (illustrative, full types in `lib/types/provider.ts`)

```ts
interface ModelProvider {
  id: string;                 // 'anthropic' | 'openai' | 'google' | 'mistral' | 'local'
  name: string;
  models: ModelDescriptor[];
  call(req: ChatCompletionRequest, opts: CallOptions): Promise<ChatCompletionResponse>;
  estimateCost(req: ChatCompletionRequest): { tokensIn: number; estimatedTokensOut: number; usdCents: number };
  healthCheck(): Promise<{ ok: boolean; latencyMs: number }>;
}

interface ModelRouter {
  byTier(tier: ModelTier): ModelProvider;
  byTaskHint(hint: TaskHint, ctx?: RouteContext): ModelProvider;
  withFallback(primaryProviderId: string, error: AgentError): ModelProvider | null;
  setUserOverride(userId: string, tier: ModelTier, providerId: string): void;
}
```

### Fallback policy

- Primary fails with `rate_limit` or `5xx` → automatic fallback to next configured provider for the same tier.
- Primary fails with `invalid_input` or `content_policy` → no fallback, surface error to user.
- Fallback usage is logged in `provider_calls_log` with `fallback_used = true`.

### Per-user overrides

`/admin/model-router` (internal only) lets us override `tier → provider` per user for A/B tests or VIP debugging. Stored in `user_overrides` (added at AI-003).

---

## 3. ProviderRouter — Tool routing

External tools (video, image, audio, data, design) follow the same contract as LLMs but per category.

### Categories

| Category | Capabilities |
|---|---|
| `video-avatar` | text-to-avatar-video, lipsync, multi-language, voice-clone-driven |
| `video-generative` | text-to-video, image-to-video, storyboard generation |
| `image` | text-to-image, image edit, upscale, inpainting |
| `audio` | text-to-speech, speech-to-text, voice cloning |
| `composition` | template-driven video, template-driven image (programmatic) |
| `data` | trend signals, social mention, niche keyword extraction |
| `design` | template-based design (Canva-like, programmatic) |

### Interface

```ts
interface ToolAdapter<Req = unknown, Res = unknown> {
  id: string;                                // 'heygen', 'runway', 'fal-flux', 'elevenlabs'
  category: ToolCategory;
  capabilities: string[];                    // ['avatar-video-30s', 'voice-clone', 'multi-lang']
  estimateCost(req: Req): CostEstimate;
  invoke(req: Req, opts: InvokeOptions): Promise<ToolResult<Res>>;
  healthCheck(): Promise<{ ok: boolean; latencyMs: number }>;
}

interface ProviderRouter {
  byCapability(cap: string): ToolAdapter;
  byCategoryQuality(cat: ToolCategory, quality: 'fast' | 'standard' | 'premium'): ToolAdapter;
  setUserPreference(userId: string, cat: ToolCategory, providerId: string): void;
  benchmarkResults(): BenchmarkReport;
}
```

**No application code calls a provider SDK directly.** `providerRouter.byCapability('avatar-video-30s').invoke(req)` is the only allowed shape.

---

## 4. Benchmark process

Before a provider can be exposed in production (i.e. used in any user-facing pricing tier), it must pass an internal benchmark.

### Steps

1. **10 canonical inputs** per category (fixed, versioned in `evals/provider-bench/<category>/`)
2. **Quality scoring** — 2 internal reviewers, rubric similar to Critic QA, scale 0–5 per criterion
3. **Latency** : p50, p95, p99 across 50 calls
4. **Error rate** : 50 calls, rate of non-recoverable errors
5. **Cost / output** : real USD spend per representative output
6. **Quota / rate-limit ceiling** : can it scale to 1000 concurrent users on launch ?
7. **Commercial license & API stability** : official API documented, terms allow our use case (B2B SaaS, paid users)

### Outcome

- All checks pass → adapter promoted to production, eligible for ProviderRouter exposure.
- Any check fails → stays on **watchlist** (see §6), not exposed in pricing or UI.

Benchmark results are stored in `provider_benchmarks` (table added at AI-007) and surfaced in `/admin/provider-lab` dashboard.

---

## 5. Production-promoted providers (none yet)

At AI-000 / V1 launch, **no external creative provider is wired in production**. The only provider in production is :

| Category | Provider | Status |
|---|---|---|
| LLM (fast/standard/premium/frontier) | Anthropic | Production — already used by `/api/ai/generate` |

All other categories are in watchlist or not yet evaluated.

---

## 6. Emerging video models — watchlist

These models are evaluated, monitored, or scheduled for benchmark. **None is currently wired**, **none is part of pricing commitments**, **none is mentioned in user-facing landing or pricing as "available"**.

| Model | Use case | Benchmark signal | API availability | Commercial license | Estimated cost | Production readiness | Risks | SocialBoost status |
|---|---|---|---|---|---|---|---|---|
| **HappyHorse 1.0** | text-to-video, image-to-video, storyboard | Very strong on early Artificial Analysis benchmarks (notable competitor to closed-source frontier video models) | Not yet officially confirmed for hosted/commercial use | Unknown / under investigation | Unknown — pending official pricing | Not production-ready | API absence, license unclear, hosting/weights distribution unverified, no SLA | **Watchlist / benchmark-only — not branched, not promised, not priced. Will only move to benchmark candidate once official API, commercial terms and stable hosted access are verified.** |
| **Seedance** | text-to-video | Reported strong storyboard coherence (early signals) | Limited / preview | Under investigation | Unknown | Not production-ready | API maturity, scaling | Watchlist |
| **Veo (Google DeepMind)** | text-to-video, image-to-video | Strong on quality benchmarks; limited public access at time of writing | Restricted (Vertex AI / partner programs) | Commercial via Google Cloud | Premium tier (high) | Conditionally production-ready (depending on access tier) | Quota, geographic availability, EU compliance, cost | Benchmark candidate when Vertex/partner access granted |
| **Kling** | text-to-video, image-to-video | Strong on motion realism, especially human/animal | Public API via partner platforms | Commercial via partner | Premium tier (high) | Conditionally production-ready | Geographic availability (China-origin), data residency, EU GDPR alignment | Benchmark candidate, GDPR/data-residency review needed before EU exposure |
| **Runway (Gen-3)** | text-to-video, image-to-video, video edit | Strong, mature, established quality | Public API, well-documented | Commercial OK | High (~€1+/5s output) | Production-ready | Cost, rate limits at scale | **Top benchmark candidate for AI-011** |
| **Luma (Dream Machine)** | text-to-video, image-to-video | Strong, especially on aesthetic shots | Public API | Commercial OK | Medium-high | Production-ready | Quota, rate limits | Benchmark candidate |
| **Pika** | text-to-video, image-to-video, video edit | Solid, creator-focused features | Public API | Commercial OK | Medium | Production-ready | Quality variance vs Runway | Benchmark candidate |

### Watchlist policy

- A model on watchlist may be **read about, tracked, mentioned in internal docs**.
- A model on watchlist is **never** branched in code, **never** referenced in user-facing copy as available, **never** part of credit pricing matrix.
- A model is moved from watchlist to **benchmark candidate** only when : official commercial API exists, license terms verified, stable hosted access available.
- A model is moved from benchmark candidate to **production-promoted** only after passing the §4 benchmark process.

### Specific note on HappyHorse 1.0

Boostsocial is monitoring HappyHorse 1.0 due to its strong early signals on Artificial Analysis. As of this document : **not eligible for benchmark candidate status** until official API, commercial license, and stable hosted access are verified. No code, no commitment, no pricing impact.

---

## 7. Other category candidates (image, audio, composition)

Tracked but not in scope of this document's deep table. Scheduled for separate watchlist entries when relevant :

- **Image** : Fal-Flux, Stability SDXL, Midjourney via Replicate
- **Audio (TTS)** : ElevenLabs, OpenAI TTS, Anthropic-native (via Claude streaming when applicable)
- **Composition** : Creatomate (template video), Bannerbear (template image)
- **Data** : Data365, Brand24 / Mention, niche-specific trend APIs
- **Design** : Canva API

Each gets its own watchlist row when we approach the corresponding PR.

---

## 8. Anti-patterns — never do this

| ❌ Forbidden | ✅ Do this instead |
|---|---|
| Import a provider SDK directly in business logic | Wrap it in a `ToolAdapter` in `lib/providers/<id>/`, expose via `ProviderRouter` |
| Hardcode `'anthropic'` or `'heygen'` in agent code | `modelRouter.byTier('standard')` / `providerRouter.byCapability('avatar-video-30s')` |
| Promise a video feature on landing without benchmark passed | "Bientôt" badge with Clock icon |
| Add a provider to credit pricing matrix without benchmark | Pricing matrix only references categories with at least one production-promoted provider |
| Skip healthCheck before exposing to user | Health check runs on every cold start + circuit breaker on repeated failures |
| Build vendor-specific UI affordances | UI references categories (`avatar video`, `generative video`), not vendor names |

---

## 9. References

- [ai-core.md](./ai-core.md) — Pipeline & axioms
- [credit-system.md](./credit-system.md) — Pricing matrix, premium gating
- `lib/types/provider.ts` — Type contracts (this PR ships them)
- `evals/provider-bench/` — Canonical inputs per category (added when first benchmark runs in AI-007/011)
