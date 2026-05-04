# Supabase migration runbook — AI-004 schema

Operational playbook for applying `supabase/migrations/20260504100000_ai_persistence_schema.sql` to a Supabase database.

**Status: rehearsal validated locally on Postgres 16. Production not yet applied.**

## Hard rule — prod gate

> The prod migration MUST NOT be applied automatically. No CI step runs `supabase db push`. Apply requires explicit human approval per the standing AI sprint policy.
>
> No write-side feature (ingester, INSERT, endpoint reading these tables) should be merged before this migration is confirmed present in the target environment.

## Environment matrix

| Env | When to apply | Who | How |
|---|---|---|---|
| local dev | optional, for dev work | dev | `psql` against ad-hoc Postgres (see "Local rehearsal") |
| Supabase staging | first | reviewer | `supabase db push` after `--dry-run` review |
| Supabase prod | last, only after staging green | reviewer + repo owner | `supabase db push` after explicit OK |

## Prerequisites

Before applying anywhere:

1. The repo is at a known SHA. Check `git rev-parse HEAD`.
2. The migration file exists: `supabase/migrations/20260504100000_ai_persistence_schema.sql`.
3. Static tests pass: `npm run test` (covers AI-004 + AI-005A scans).
4. (Recommended) Local rehearsal completed — see next section.
5. (Supabase only) Supabase CLI installed: `supabase --version` ≥ 1.x.
6. (Supabase only) Project linked: `supabase link --project-ref <ref>` (interactive, never check the ref into git).

## Local rehearsal (no Supabase required)

If you want a fully offline validation before touching any cloud DB, you can replay the migration on a vanilla Postgres 16:

```bash
# 1. Spin up Postgres (any of these works)
service postgresql start                       # apt-installed pg
docker run -d --rm --name sb_rehearsal \
  -e POSTGRES_PASSWORD=changeme \
  -e POSTGRES_DB=rehearsal \
  -p 55432:5432 postgres:16-alpine            # Docker
# OR an existing local pg cluster

# 2. Create a throwaway DB and apply ONLY the AI-004 migration
psql -h localhost -U postgres -c "drop database if exists ai_rehearsal;"
psql -h localhost -U postgres -c "create database ai_rehearsal;"
psql -h localhost -U postgres -d ai_rehearsal -v ON_ERROR_STOP=1 \
  -f supabase/migrations/20260504100000_ai_persistence_schema.sql

# 3. Introspect (see "Post-apply verification" below)

# 4. Cleanup
psql -h localhost -U postgres -c "drop database ai_rehearsal;"
```

Note: the migration declares `create extension if not exists "pgcrypto"` — vanilla Postgres needs the `postgresql-contrib` package for `gen_random_uuid()`.

## Dry-run on a linked Supabase project

When the CLI is installed and the project is linked:

```bash
supabase migration list           # see local vs remote diff
supabase db push --dry-run        # show what would be applied — DOES NOT WRITE
```

`--dry-run` is read-only. It is the only `supabase db push` invocation safe to run before explicit approval. Never paste connection strings, service role keys, or any secret into shared logs.

## Apply to staging (after dry-run review)

```bash
# Check the dry-run output one more time, then:
supabase db push                  # applies pending migrations to the linked project
```

Right after apply, run the post-apply verification block below from `psql` connected to staging.

## Apply to production (gated)

**Only after**: staging green, post-apply checks green, and explicit human OK on the AI sprint.

1. Confirm the linked project is the production ref. `supabase projects list` and check.
2. Take a logical checkpoint:
   - Note the current Postgres `pg_current_wal_lsn()` (Supabase Pro+ has PITR; Free uses daily backup snapshots).
   - Optional: `supabase db dump --data-only --schema public > /tmp/prod-snapshot-$(date +%Y%m%d-%H%M%S).sql` for a quick safety net (export goes to your laptop, never the repo).
3. Run `supabase db push` (no `--dry-run` this time).
4. Run the post-apply verification block.
5. Update this runbook's "Status" header with the apply date + Supabase project ref last-4.

## Post-apply verification (run as service_role / superuser)

Paste these queries into the Supabase SQL editor or `psql`:

```sql
-- 1. Tables exist
select schemaname, tablename
from pg_tables
where schemaname = 'public' and tablename like 'ai_%'
order by tablename;
-- expect 4: ai_agent_runs, ai_cost_estimates, ai_eval_snapshots, ai_redaction_events

-- 2. RLS enabled on all four
select tablename, rowsecurity
from pg_tables
where schemaname = 'public' and tablename like 'ai_%';
-- expect rowsecurity = true everywhere

-- 3. NO permissive policies (must return 0 rows)
select schemaname, tablename, policyname
from pg_policies
where schemaname = 'public' and tablename like 'ai_%';

-- 4. Indexes (10 expected, plus pkey + trace_id unique)
select indexname
from pg_indexes
where schemaname = 'public' and tablename like 'ai_%'
order by indexname;

-- 5. FK on delete restrict
select tc.table_name, kcu.column_name, rc.delete_rule
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu on kcu.constraint_name = tc.constraint_name
join information_schema.referential_constraints rc on rc.constraint_name = tc.constraint_name
where tc.constraint_type = 'FOREIGN KEY' and tc.table_schema = 'public' and tc.table_name like 'ai_%';
-- expect delete_rule = RESTRICT for both ai_cost_estimates.run_id and ai_redaction_events.run_id

-- 6. CHECK constraints (status / execution_mode / confidence)
select cc.table_name, c.check_clause
from information_schema.check_constraints c
join information_schema.constraint_column_usage cc on cc.constraint_name = c.constraint_name
where cc.table_schema = 'public' and cc.table_name like 'ai_%' and c.check_clause not like '% IS NOT NULL';

-- 7. Forbidden columns scan — must return ZERO rows
select table_name, column_name
from information_schema.columns
where table_schema = 'public' and table_name like 'ai_%'
  and column_name in (
    'raw_input', 'raw_output', 'prompt', 'completion',
    'api_key', 'request_body', 'response_body', 'stack_trace'
  );

-- 8. Service-role-only comments present
select c.relname, obj_description(c.oid, 'pg_class')
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname like 'ai_%' and c.relkind = 'r';
-- expect each comment to mention "service_role only"

-- 9. Migration history
select version, name from supabase_migrations.schema_migrations
order by version desc limit 5;
-- expect 20260504100000 in the list
```

## Smoke test under RLS (sanity)

In a fresh psql session, simulating the anon role:

```sql
create role smoke_anon nologin;
grant select, insert on public.ai_agent_runs to smoke_anon;

set role smoke_anon;
select count(*) from public.ai_agent_runs;
-- expect 0 (RLS hides everything for anon — no policy)

insert into public.ai_agent_runs (
  trace_id, agent_id, agent_version, contract_version, task_type,
  execution_mode, provider, model, status, started_at, input_hash
) values ('smoke', 'a', '1', '1', 'offer_brain', 'mock', 'mock', 'm', 'success', now(), 'h');
-- expect ERROR: new row violates row-level security policy

reset role;
drop role smoke_anon;
```

If insert succeeds under anon → STOP, the migration was tampered with. Roll back.

## Rollback strategy

The migration is purely additive — there is no risk of corrupting existing data because **no existing table is modified**, no rows are touched, no columns are dropped.

If you must roll back the schema (cosmetic only — until a writer exists, the tables are empty):

```sql
-- Copy-paste exactly. Run as service_role / superuser.
drop table if exists public.ai_redaction_events;
drop table if exists public.ai_cost_estimates;
drop table if exists public.ai_eval_snapshots;
drop table if exists public.ai_agent_runs;

delete from supabase_migrations.schema_migrations where version = '20260504100000';
```

This is safe because:
- No app code reads or writes these tables (AI-004 ships pure types + a non-I/O mapper).
- No FK from `auth.users` or other prod tables references them.
- The default Supabase backups still hold the pre-apply state.

If a writer ever lands and starts INSERTing, this rollback becomes destructive — at that point, define rollback per-feature.

## Pre-apply checklist

- [ ] `git rev-parse HEAD` matches a known good commit on `main`.
- [ ] `npm run test` is green locally.
- [ ] AI-004 + AI-005A static SQL scan tests pass.
- [ ] Local rehearsal report has been reviewed.
- [ ] Target environment confirmed (NOT prod by mistake).
- [ ] `supabase db push --dry-run` output reviewed and shows ONLY the AI-004 migration as pending.
- [ ] Recent backup / PITR window confirmed.
- [ ] (Prod only) Explicit OK from repo owner is in chat or PR review.

## Post-apply checklist

- [ ] Section "Post-apply verification" returned the expected results.
- [ ] RLS smoke test denied anon read/insert.
- [ ] No errors in Supabase logs.
- [ ] No regression in app behavior (the app does not read these tables; this is a sanity check).
- [ ] `/api/ai/offer-brain` still returns 404 without `OFFER_BRAIN_API_ENABLED`.
- [ ] Update this runbook with the apply timestamp + project ref last-4.

## Forbidden during AI-005A

This sprint is rehearsal-only. The following commands MUST NOT be invoked:

- `supabase db push` (without `--dry-run`)
- `supabase db push --db-url <prod>`
- `supabase migration repair`
- `supabase db reset --linked`
- `psql` against a production URL
- Any command using `SERVICE_ROLE_KEY`
- Any command writing to a remote DB

Allowed: local rehearsal (`psql` against a local DB you own), `supabase migration list`, `supabase status`, `supabase db push --dry-run`, this repo's `npm run` scripts.
