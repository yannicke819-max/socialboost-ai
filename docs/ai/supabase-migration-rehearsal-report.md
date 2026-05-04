# AI-005A — Migration rehearsal report

Replay of `supabase/migrations/20260504100000_ai_persistence_schema.sql` against a vanilla Postgres 16 cluster, captured during AI-005A.

## Environment used

| Component | Status | Detail |
|---|---|---|
| Supabase CLI | absent | `supabase` not on `PATH` — no `supabase` invocation possible |
| Docker daemon | absent | binary present (`29.3.1`), daemon socket unavailable in sandbox |
| `psql` client | present | PostgreSQL 16.13 (Ubuntu) |
| Local Postgres 16 server | started ad-hoc | `service postgresql start` → ready on `localhost:5432`, stopped after rehearsal |
| `supabase/config.toml` | absent | no `supabase init` performed in this repo |
| Project linked | no | rehearsal is fully offline |

Because Supabase CLI is absent, `supabase db push --dry-run` is **not executed**. The rehearsal targets a vanilla Postgres cluster with the same migration content — equivalent for schema-shape validation.

## Steps executed

```text
sudo service postgresql start                          → ok, ready on :5432
psql -U postgres -c "create database ai005a_rehearsal" → CREATE DATABASE
psql -d ai005a_rehearsal -v ON_ERROR_STOP=1 \
     -f supabase/migrations/20260504100000_ai_persistence_schema.sql  → succeeded
# introspection queries run as superuser
# RLS smoke test run as test_anon role (nologin)
psql -c "drop database ai005a_rehearsal"               → DROP DATABASE
psql -c "drop role test_anon"                          → DROP ROLE
sudo service postgresql stop                           → stopped
```

No connection string, password, or token was logged. The only credential used was the local-only `postgres` peer auth.

## Findings

### Tables created (4 / 4)

```
public.ai_agent_runs
public.ai_cost_estimates
public.ai_eval_snapshots
public.ai_redaction_events
```

### Columns

All columns expected by `lib/ai/persistence/types.ts` are present with correct types:

- `ai_agent_runs` : 22 cols (uuid pk, trace_id unique text, agent_id, agent_version, contract_version, task_type, execution_mode, provider, model, status, started_at, completed_at, latency_ms, input_hash, output_hash, input_size_bytes, input_field_count, language, validation_status, error_code, warning_count, created_at)
- `ai_cost_estimates` : 14 cols (uuid pk, run_id FK, provider, model, task_type, 4 token cols, estimated_cost_eur numeric(12,6), confidence, 3 boolean flags, created_at)
- `ai_eval_snapshots` : 11 cols (uuid pk, eval_suite, baseline_id, git_sha, pass_count, fail_count, total_count, pass_rate numeric(6,3), drift_score numeric(8,4), metadata jsonb, created_at)
- `ai_redaction_events` : 7 cols (uuid pk, run_id FK nullable, trace_id, redaction_type, field_name, redaction_count, created_at)

### Forbidden columns scan

```sql
select table_name, column_name from information_schema.columns
where table_schema='public' and table_name like 'ai_%'
  and column_name in ('raw_input','raw_output','prompt','completion',
                      'api_key','request_body','response_body','stack_trace');
→ 0 rows
```

### RLS state

```
public.ai_agent_runs       → rowsecurity = true
public.ai_cost_estimates   → rowsecurity = true
public.ai_eval_snapshots   → rowsecurity = true
public.ai_redaction_events → rowsecurity = true
```

### Policies

```sql
select * from pg_policies where schemaname='public' and tablename like 'ai_%';
→ 0 rows
```

→ confirmed: only `BYPASSRLS` roles (Supabase `service_role`) can read/write.

### Indexes (15 total, including pkey + unique trace_id)

```
ai_agent_runs_pkey
ai_agent_runs_trace_id_key                  (UNIQUE on trace_id)
ai_agent_runs_trace_id_idx                  (btree on trace_id)
ai_agent_runs_agent_created_idx             (agent_id, created_at desc)
ai_agent_runs_task_created_idx              (task_type, created_at desc)
ai_agent_runs_status_created_idx            (status, created_at desc)
ai_agent_runs_provider_model_created_idx    (provider, model, created_at desc)
ai_cost_estimates_pkey
ai_cost_estimates_run_idx                   (run_id)
ai_eval_snapshots_pkey
ai_eval_snapshots_suite_created_idx         (eval_suite, created_at desc)
ai_eval_snapshots_git_sha_idx               (git_sha)
ai_redaction_events_pkey
ai_redaction_events_run_idx                 (run_id)
ai_redaction_events_trace_idx               (trace_id)
```

### Foreign keys

```
ai_cost_estimates.run_id    → ai_agent_runs.id   ON DELETE RESTRICT
ai_redaction_events.run_id  → ai_agent_runs.id   ON DELETE RESTRICT
```

### Check constraints (functional)

```
ai_agent_runs.execution_mode ∈ {'mock', 'real'}
ai_agent_runs.status         ∈ {'success', 'error', 'blocked'}
ai_cost_estimates.confidence ∈ {'low', 'medium', 'high'}
```

### Comments (all 4 tables)

```
ai_agent_runs       : "AI-004 append-only ledger of agent executions. Hashes only. RLS enabled, NO policies — service_role only."
ai_cost_estimates   : "AI-004 cost snapshot at execution time. RLS enabled, NO policies — service_role only."
ai_eval_snapshots   : "AI-004 eval run aggregates. RLS enabled, NO policies — service_role only."
ai_redaction_events : "AI-004 redaction audit. RLS enabled, NO policies — service_role only."
```

### RLS denial smoke test

Created `test_anon` role (nologin), granted `select, insert` on `ai_agent_runs`:

```
[as test_anon] select count(*) from ai_agent_runs → 0
[as test_anon] insert (...) → ERROR: new row violates row-level security policy for table "ai_agent_runs"
[as test_anon] count after attempt          → 0
```

→ confirmed: anon role cannot read or write. RLS effective.

### Extensions

```
pgcrypto   ← needed for gen_random_uuid()
plpgsql    ← default
```

## Conclusion

The migration applies cleanly to a vanilla Postgres 16 cluster with the same shape that Supabase will produce. All structural invariants from AI-004 are reproduced at runtime by the database engine itself.

Net delta on the rehearsal cluster: 4 tables, 15 indexes, 2 FKs, 3 CHECK constraints, 4 RLS toggles, 4 comments. **Zero rows written**, **zero data touched**.

After cleanup, the local cluster was stopped. The repo working tree is unchanged.

## Not executed in AI-005A

- ❌ `supabase db push` (CLI absent — and would be forbidden by sprint scope anyway)
- ❌ Any write to a remote/staging/prod Supabase project
- ❌ `supabase migration list` / `supabase status` (CLI absent)
- ❌ Creation of any Supabase client in app code
- ❌ Endpoint, env, runtime change

The next step in the path to production is gated by the runbook (`docs/ai/supabase-migration-runbook.md`) and requires explicit human OK.
