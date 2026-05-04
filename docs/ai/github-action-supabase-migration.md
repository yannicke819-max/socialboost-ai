# GitHub Action — Supabase AI migration apply

Operational guide for `.github/workflows/supabase-ai-migration.yml`.

This workflow is the **only** sanctioned way to apply AI-* Supabase migrations to staging or production. Local `supabase db push` is forbidden by the AI-005A runbook.

## Trigger

Manual only:

```
GitHub UI → Actions → "Supabase AI migration (manual apply)" → Run workflow
```

The workflow has **no** `push:`, `pull_request:`, or `schedule:` trigger. CI never runs an apply on its own.

## Inputs

| Input | Required | Default | Effect |
|---|---|---|---|
| `target_environment` | yes | `production` | Selects the GitHub environment for secret scoping (`staging` or `production`). If the environment has required reviewers, the apply job pauses until they approve. |
| `confirm_apply` | yes | `false` | Must be the literal string `true` to authorize the apply job. Anything else stops at dry-run. |
| `expected_migration` | yes | `20260504100000_ai_persistence_schema.sql` | The single migration filename expected to be pending. The dry-run parser fails if it sees additional migrations. |

## Required GitHub Secrets

Configure these per environment (`staging` and `production`) under
**Settings → Environments → \<env\> → Secrets**:

| Secret | Purpose |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | `sbp_…` personal access token. Used by the CLI for `supabase link`. |
| `SUPABASE_PROJECT_REF` | Project ref (the slug before `.supabase.co`). |
| `SUPABASE_DB_PASSWORD` | Postgres password for the linked project (used for `db push` and `db remote query`). |

The workflow never logs these values. They are passed via `env:` blocks scoped to individual steps.

## Jobs

### 1. `validate`
Quick context check on the runner:
- Migration file is present at the expected path
- `docs/ai/supabase-migration-runbook.md` is present
- If `confirm_apply=true` AND the workflow was dispatched from a non-default branch → fails. Apply is allowed only from `main`.

### 2. `dry_run` (always runs)
- Sets up the Supabase CLI
- `supabase link --project-ref … --password …`
- `supabase migration list` — shows local vs remote diff (uploaded as artifact)
- `supabase db push --dry-run` — read-only, prints pending migrations
- Parser asserts the dry-run output mentions only the expected migration filename. Fails with `::error::` annotation if any other migration is in the plan.

Outputs the artifact `dry-run-<target>` (kept 7 days).

### 3. `apply` (gated)
Runs only when **both**:
- `inputs.confirm_apply == 'true'`
- `dry_run` job succeeded with `pending_only_expected == 'true'`

If either condition fails, the apply job is skipped automatically.

When it runs:
- Re-links Supabase
- `supabase db push` — applies the migration
- Runs 7 read-only SQL checks via `supabase db remote query`:
  1. tables present (`ai_agent_runs`, `ai_cost_estimates`, `ai_eval_snapshots`, `ai_redaction_events`)
  2. RLS state (`rowsecurity = true`)
  3. policies (must be empty)
  4. indexes
  5. FK delete rules (RESTRICT)
  6. forbidden columns scan (must be empty)
  7. `supabase_migrations.schema_migrations` history (must contain `20260504100000`)

Outputs the artifact `apply-<target>` (kept 30 days).

## Standing rules

- **Apply allowed only from `main`.** Workflow refuses `confirm_apply=true` if dispatched from any other branch.
- **No PR or push triggers the apply.** `workflow_dispatch` only.
- **Concurrency**: one run at a time per environment (`concurrency.group`).
- **No secret echoes.** The runner uses `env:` injection, never command-line interpolation that would land in logs. Set `set -euo pipefail` everywhere.
- **No code is committed by the workflow.** `permissions: contents: read`. The runner cannot push.
- **No `supabase migration repair`, no `db reset`, no raw `psql`.** All SQL routes through the CLI.
- **No CI auto-apply.** A human must dispatch the workflow with `confirm_apply=true`. Recommend pairing with required reviewers on the `production` GitHub environment.

## Recommended GitHub environment configuration

For `production`:
- Required reviewers: at least one repo owner
- Wait timer: 0 (apply is fast; reviewers gate it)
- Deployment branches: only `main`

For `staging`:
- Optional reviewers
- Deployment branches: `main` plus feature branches you want to test against staging

## Operating procedure (humans)

1. Make sure the migration file you want to apply is on `main` (it should already be — AI-004 was merged in PR #16).
2. Open Actions → "Supabase AI migration (manual apply)" → Run workflow.
3. Pick `target_environment = staging` first. Leave `confirm_apply = false`. Hit "Run".
4. The dry-run job runs. Wait for it to finish green. Open the artifact `dry-run-staging` to see the planned migration.
5. If the artifact shows only `20260504100000_ai_persistence_schema.sql`, dispatch again with `confirm_apply = true`.
6. Apply runs against staging. Confirm post-apply checks are green.
7. Repeat steps 3–6 with `target_environment = production`. The production environment will pause for required reviewer approval if configured.
8. After production apply: re-run the AI-005A SQL checks manually if you want a third independent verification, or run them through Supabase SQL editor.

## Failure modes & responses

| Failure | Cause | Action |
|---|---|---|
| `validate` fails on missing migration | wrong branch dispatched | dispatch from `main` |
| `validate` fails on confirm_apply ref guard | dispatched from feature branch with confirm_apply=true | switch to `main` |
| `dry_run` fails with "mentions migrations beyond the expected" | unexpected migration in the plan | STOP, investigate, do NOT apply |
| `dry_run` fails on connection timeout | secrets misconfigured / project paused | verify secrets in env settings |
| `apply` skipped despite `confirm_apply=true` | dry-run did not pass the parser check | re-read dry-run artifact, fix root cause |
| `apply` fails midway | DB error during push | check Supabase logs; the CLI does not auto-rollback — investigate before retry |

## Out of scope

- The workflow does not seed data, run `supabase db reset`, or invoke `migration repair`.
- It does not modify the application runtime (no env var added, no code change).
- It does not enable any AI endpoint. `/api/ai/offer-brain` remains 404 without `OFFER_BRAIN_API_ENABLED`.
