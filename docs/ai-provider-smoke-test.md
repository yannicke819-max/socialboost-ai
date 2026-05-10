# AI Provider Smoke Test (AI-016D)

This procedure runs a single real OpenAI call against the existing
gateway, **on Vercel Preview only**, to verify the full chain end-to-end:
preflight → entitlements → flag → key → adapter → postflight.

> **Production stays OFF.** Do not enable the env vars below in
> Production. The Free hard rule (`providerCallAllowed=false`) is
> enforced server-side by `decideAiExecution` regardless of env state.

## Prerequisites

- A Vercel Preview deployment of the relevant PR.
- An OpenAI account with a hard monthly cap of **$5** (recommended for
  any preview environment).
- The smoke-test page mounted: `/(app)/ai/offers/[id]` — this is the
  page that hosts `PromptInspector`.

## 1. Add the Preview env vars

In Vercel → *Project → Settings → Environment Variables*. **Tick only
the *Preview* checkbox**. Never tick *Production*.

| Variable | Value | Sensitive |
|---|---|---|
| `SOCIALBOOST_AI_PROVIDER_ENABLED` | `true` | no |
| `SOCIALBOOST_AI_PROVIDER` | `openai` | no |
| `SOCIALBOOST_AI_DEFAULT_MODEL` | `gpt-4.1-mini` | no |
| `SOCIALBOOST_OPENAI_API_KEY` | `sk-...` | **yes — mark as Sensitive** |

The "Sensitive" toggle prevents the value from being shown back in the
Vercel UI after save. It does not change runtime behavior; it only
guards against shoulder-surfing.

After saving, click *Redeploy* on the latest Preview commit so the new
env is picked up. Without a redeploy the gateway will return
`provider_disabled` (flag unread) or `provider_missing_key` (key
unread) — both safe states.

## 2. Run the smoke test

### 2a. Free path (sanity)
1. Open the Preview URL with a Free user (default).
2. In the inspector, the banner reads:
   > *"Mode gratuit : copie le brief IA, aucun modèle lancé."*
3. The "Tester le brief IA" button is disabled.
4. Open DevTools → Network → confirm **no** `POST /api/ai/run-prompt`
   ever fires. The Free hard rule is structural: even a clicked button
   short-circuits client-side, and the gateway refuses anyway.

### 2b. Paid path (real OpenAI call)
1. In the same inspector, expand the "Plan simulé (Preview)" picker —
   visible only on Preview/dev builds.
2. Click `starter`. The CTA flips to **"Générer un test IA"**.
3. Click it. One `POST /api/ai/run-prompt` fires.
4. The result panel shows:
   - Provider: `openai`
   - Model: `gpt-4.1-mini`
   - Estimated credits: e.g. `5`
   - Status: `OK`
   - Decision: `allowed_included_credits`
   - The model output as plain text under *Output (draft, please review)*.
5. The OpenAI Usage dashboard surfaces one `gpt-4.1-mini` request a few
   seconds later.

### 2c. Negative paths to spot-check
| Setup | Expected |
|---|---|
| Flag unset | Status `Bloqué`, blockedReason `provider_disabled` |
| Key unset | Status `Bloqué`, blockedReason `provider_missing_key` |
| Wrong key | Status `Bloqué`, blockedReason `provider_auth_error` |
| Free + plan switcher set to free | Banner = "Mode gratuit", button disabled |

## 3. Verify the key never reaches the client

1. View page source on the Preview URL.
2. `Ctrl+F` for `sk-` → no match.
3. `Ctrl+F` for `OPENAI_API_KEY` → no match.
4. In DevTools Network, inspect the request body for
   `POST /api/ai/run-prompt`. The payload contains `promptVersion`,
   `inspirations`, `offer`, `plan`, `remainingCredits`, `action`. No
   `apiKey`, no `OPENAI_API_KEY`, no `Authorization` header from the
   client.
5. The `Authorization: Bearer ...` header only exists on the server →
   OpenAI hop, never on the browser → server hop.

## 4. Verify logs

Server-side logs surface at most one line per failed run:

```
[ai-gateway] req_<promptVersionId>[_<userId>] provider=openai error=<code>[_<httpStatus>]
```

Logs never contain:
- the system or user prompt body,
- the API key,
- the full provider response,
- raw token strings.

Successful runs emit zero log lines.

## 5. Instant rollback

Any one of these reverts the Preview to a safe state without a
redeploy:

- Remove `SOCIALBOOST_AI_PROVIDER_ENABLED` (or set to anything other
  than `'true'`) → all paid runs return `provider_disabled`.
- Remove `SOCIALBOOST_OPENAI_API_KEY` → all paid runs return
  `provider_missing_key`.
- Rotate / revoke the key on OpenAI → next run returns
  `provider_auth_error`.
- Free users are unaffected by all of the above.

## 6. Budget guidance

A single `gpt-4.1-mini` call with a short prompt costs well under one
US cent. **One or two calls is enough to confirm the chain.** Do not
loop the smoke test. The OpenAI org cap of $5/month is the safety net
if anything ever runs away.

## 7. Things this procedure does not do

- Does **not** run on Production.
- Does **not** enable BYOK.
- Does **not** wire Anthropic / Sonnet (out of scope).
- Does **not** publish anything (no Stripe, no Supabase mutation).
- Does **not** modify Production env vars.
- Does **not** touch `package.json` / `pnpm-lock.yaml`.
- Does **not** affect Issue #25 (i18n FR/EN/IT/DE/ES) backlog.
