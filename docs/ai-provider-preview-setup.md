# AI Provider Preview Setup (AI-016C)

This document is **preview/dev-only**. Production uses dry-run / Free Prompt
Pack and never touches a real provider. Do **not** copy this configuration
into Vercel Production environment variables.

## What AI-016C adds

A single real provider adapter — `lib/ai/openai-provider-adapter.ts` —
wired through `lib/ai/provider-gateway.ts`. Targets the OpenAI Responses
API (`POST /v1/responses`) with the cheapest current model:
**`gpt-4.1-mini`**.

### Order of operations enforced by the gateway

```
1. preflight (pure)               // forbidden phrases, oversize, language
2. estimate credits (pure)
3. decideAiExecution (pure)       // AI-016A — runs BEFORE the env flag
4. if !providerCallAllowed → blocked / dry-run; STOP here
5. read SOCIALBOOST_AI_PROVIDER_ENABLED
6. flag OFF                       → blocked `provider_disabled`
7. read SOCIALBOOST_OPENAI_API_KEY
8. key absent                     → blocked `provider_missing_key`
9. createOpenAiProviderAdapter + runOpenAiPrompt
10. postflight (pure)             // re-scan for forbidden phrases / copying
11. return normalized AiProviderRunResult
```

### Free hard rule, structurally enforced

`decideAiExecution({ plan: 'free', ... })` returns
`providerCallAllowed: false` no matter what:
- the env flag value,
- the API key state,
- the user-provided BYOK flag,
- the requested model.

Step 4 returns a dry-run for Free users, so steps 5-9 are never executed.
Free → 0 fetch, 0 admin cost. Pinned by 16 combinations in the gateway
test file.

## Environment variables — preview/dev only

Add these to `.env.local` (never to Vercel Production env):

```dotenv
# 1) Master switch. Must be exactly the string 'true' to allow real calls.
SOCIALBOOST_AI_PROVIDER_ENABLED=true

# 2) Provider name. AI-016C only wires 'openai'.
SOCIALBOOST_AI_PROVIDER=openai

# 3) Default model. gpt-4.1-mini is the recommended preview model.
SOCIALBOOST_AI_DEFAULT_MODEL=gpt-4.1-mini

# 4) The OpenAI API key. NEVER prefix with NEXT_PUBLIC_.
SOCIALBOOST_OPENAI_API_KEY=sk-...
```

**Reminders:**
- Never put the key in a `NEXT_PUBLIC_*` variable — it would ship to the
  browser bundle.
- Never paste the key into a client component, a Storybook story, or a
  console snippet.
- Set a hard monthly cap on the OpenAI dashboard (recommended: **$5**) for
  any preview project.

## Vercel Preview deployments

For a Preview-only environment on Vercel:
1. Open *Project → Settings → Environment Variables*.
2. Add the four variables above with **scope: Preview** only. Do **not**
   tick the *Production* checkbox.
3. Trigger a redeploy of the preview branch so the new env is picked up.

If you forget step 3, the gateway will return `provider_disabled` (flag
unread) or `provider_missing_key` (key unread) — both are safe.

## How to test it

### As a Free user (sanity)
1. Sign in / select a Free plan.
2. Open *Voir le brief IA* → *Tester le brief IA*.
3. The button must be **disabled** with the tooltip
   *"Le test provider IA est réservé aux plans payants."*
4. Open Network tab — confirm **no** `POST /api/ai/run-prompt`.

### As a Starter (or higher) user
1. Switch the local plan to `starter` (mock plan switcher in dev).
2. Open *Voir le brief IA* → *Tester le brief IA*.
3. The result panel renders the model output text under
   *Output (draft, please review)*.
4. Network tab shows exactly one `POST /api/ai/run-prompt` and its
   response body conforms to `AiProviderRunResult`.
5. The OpenAI Usage dashboard shows one `gpt-4.1-mini` request a few
   seconds later.

### Failure modes worth checking
| Scenario | Expected `blockedReason` |
|---|---|
| Flag unset / not `'true'` | `provider_disabled` |
| Key unset | `provider_missing_key` |
| Wrong key | `provider_auth_error` |
| Quota exhausted on OpenAI | `provider_rate_limited` |
| OpenAI 5xx / outage | `provider_unavailable` |
| Adapter timeout (>30s) | `provider_timeout` |
| Response with no text | `provider_empty_output` |
| Forbidden phrase in prompt | `forbidden_phrase_in_prompt` |
| Forbidden phrase in output | `forbidden_phrase_in_output` |
| Verbatim copy from inspirations | `suspected_source_copying` |

## Disabling instantly

Any one of the following flips the gateway back to a safe state without a
redeploy:
- Unset `SOCIALBOOST_AI_PROVIDER_ENABLED` (or set it to anything other
  than `'true'`) → all paid runs return `provider_disabled`.
- Unset `SOCIALBOOST_OPENAI_API_KEY` → all paid runs return
  `provider_missing_key`.
- Rotate / revoke the key on the OpenAI dashboard → next run returns
  `provider_auth_error` and the gateway logs `provider_auth_error_401`.

Free users are unaffected by all of the above — they are already in
dry-run before step 5.

## What AI-016C does **not** do

- Does **not** wire Anthropic / Sonnet (intentional; out of scope).
- Does **not** enable BYOK (still reserved at the type level).
- Does **not** add Stripe billing, Supabase tables, or migrations.
- Does **not** publish posts or ads automatically.
- Does **not** change Production Vercel env vars.
- Does **not** touch `package.json` or `pnpm-lock.yaml`.

## Recommended budget for tests

Keep the OpenAI org cap at **$5/month** for any preview environment. A
single AI-016C *Tester le brief IA* call on `gpt-4.1-mini` typically costs
well under one cent. If a runaway test loop ever appears, the cap will
clip it long before any meaningful spend.

## Logging policy

The gateway emits at most one `console.warn` line per failed provider
call, with the shape:

```
[ai-gateway] req_<promptVersionId>[_<userId>] provider=openai error=<code>[_<httpStatus>]
```

It never logs:
- the system prompt or user prompt body,
- the API key,
- the full provider response,
- raw token strings.

Successful calls emit zero log lines.
