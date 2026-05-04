-- =========================================================================
-- AI-004 — AI Persistence Schema (append-only, redacted)
--
-- Stockage des exécutions IA SANS contenu utilisateur brut.
--
-- Règles structurelles :
--   1. Append-only — pas d'UPDATE prévu. Les corrections passent par un
--      nouveau run.
--   2. Aucune colonne ne peut contenir : raw_input, raw_output, prompt,
--      completion, api_key, request_body, response_body, stack_trace.
--      Les hashes (SHA-256) sont les seuls résidus du contenu.
--   3. RLS activée sur toutes les tables. Aucune policy permissive ouverte.
--      L'accès se fait via service_role (futur, hors AI-004).
--   4. Pas de FK vers auth.users : AI-004 trace l'exécution agent, pas
--      l'utilisateur. Le rattachement utilisateur viendra dans une migration
--      ultérieure une fois l'auth + RLS user-scoped en place.
--   5. on delete restrict sur les FK enfants : protège l'intégrité audit.
--
-- Voir docs/ai/persistence.md pour la stratégie de rétention.
-- =========================================================================

-- ----- Extensions (idempotent : déjà présentes via 0001) ----------------
create extension if not exists "pgcrypto";

-- =========================================================================
-- Table 1 : ai_agent_runs
-- Registre append-only des exécutions agents. Une ligne = un AgentContract
-- complet (success, blocked ou error). Le contenu (input/output) n'est
-- JAMAIS stocké : seuls les hashes, tailles, comptes et codes le sont.
-- =========================================================================
create table public.ai_agent_runs (
  id uuid primary key default gen_random_uuid(),
  trace_id text not null unique,
  agent_id text not null,
  agent_version text not null,
  contract_version text not null,
  task_type text not null,
  execution_mode text not null check (execution_mode in ('mock', 'real')),
  provider text not null,
  model text not null,
  status text not null check (status in ('success', 'error', 'blocked')),
  started_at timestamptz not null,
  completed_at timestamptz,
  latency_ms integer,
  input_hash text not null,
  output_hash text,
  input_size_bytes integer,
  input_field_count integer,
  language text,
  validation_status text,
  error_code text,
  warning_count integer not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.ai_agent_runs is
  'AI-004 append-only ledger of agent executions. Hashes only — no raw input/output/prompt/key/stack. RLS service_role only.';
comment on column public.ai_agent_runs.input_hash is 'SHA-256 hex of canonicalized input. Never the input itself.';
comment on column public.ai_agent_runs.output_hash is 'SHA-256 hex of canonicalized output. Never the output itself.';

create index ai_agent_runs_trace_id_idx on public.ai_agent_runs (trace_id);
create index ai_agent_runs_agent_created_idx on public.ai_agent_runs (agent_id, created_at desc);
create index ai_agent_runs_task_created_idx on public.ai_agent_runs (task_type, created_at desc);
create index ai_agent_runs_status_created_idx on public.ai_agent_runs (status, created_at desc);
create index ai_agent_runs_provider_model_created_idx on public.ai_agent_runs (provider, model, created_at desc);

-- =========================================================================
-- Table 2 : ai_cost_estimates
-- Snapshot du CostEstimate calculé AVANT l'exécution. Append-only, lié 1:1
-- (logique) à un run. Aucune charge réelle ni billing à ce stade.
-- =========================================================================
create table public.ai_cost_estimates (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.ai_agent_runs(id) on delete restrict,
  provider text not null,
  model text not null,
  task_type text not null,
  estimated_input_tokens integer not null default 0,
  estimated_output_tokens integer not null default 0,
  estimated_total_tokens integer not null default 0,
  estimated_cost_credits integer not null default 0,
  estimated_cost_eur numeric(12,6),
  confidence text not null check (confidence in ('low', 'medium', 'high')),
  requires_confirmation boolean not null default false,
  premium_operation boolean not null default false,
  blocked_by_budget boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.ai_cost_estimates is
  'AI-004 cost snapshot at execution time. No real billing. RLS service_role only.';

create index ai_cost_estimates_run_idx on public.ai_cost_estimates (run_id);

-- =========================================================================
-- Table 3 : ai_eval_snapshots
-- Résumé d'une eval run. Stocke les compteurs + drift, JAMAIS les prompts,
-- inputs ou sorties brutes. metadata jsonb : agrégats non sensibles
-- uniquement (catégories, distributions). Aucun champ libre user-controlled.
-- =========================================================================
create table public.ai_eval_snapshots (
  id uuid primary key default gen_random_uuid(),
  eval_suite text not null,
  baseline_id text,
  git_sha text not null,
  pass_count integer not null,
  fail_count integer not null,
  total_count integer not null,
  pass_rate numeric(6,3) not null,
  drift_score numeric(8,4),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.ai_eval_snapshots is
  'AI-004 eval run aggregates. No prompts, no goldens, no raw outputs. metadata jsonb = aggregates only. RLS service_role only.';

create index ai_eval_snapshots_suite_created_idx on public.ai_eval_snapshots (eval_suite, created_at desc);
create index ai_eval_snapshots_git_sha_idx on public.ai_eval_snapshots (git_sha);

-- =========================================================================
-- Table 4 : ai_redaction_events
-- Audit léger des redactions effectuées par le tracer / mapper.
-- Stocke quoi a été redacted, JAMAIS la valeur redacted elle-même.
-- =========================================================================
create table public.ai_redaction_events (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.ai_agent_runs(id) on delete restrict,
  trace_id text,
  redaction_type text not null,
  field_name text,
  redaction_count integer not null default 1,
  created_at timestamptz not null default now()
);

comment on table public.ai_redaction_events is
  'AI-004 redaction audit. Stores WHAT was redacted (type + field name), never the value. RLS service_role only.';

create index ai_redaction_events_run_idx on public.ai_redaction_events (run_id);
create index ai_redaction_events_trace_idx on public.ai_redaction_events (trace_id);

-- =========================================================================
-- RLS — service_role only
-- =========================================================================
-- Strategy: enable RLS on all 4 tables and create NO permissive policies.
-- Without policies, only the Postgres BYPASSRLS role (Supabase service_role)
-- can read/write. anon and authenticated are denied by default.
--
-- Future migration will add narrow policies once a service-side ingester
-- is built (out of scope for AI-004). Until then: zero exposure surface.
-- =========================================================================
alter table public.ai_agent_runs enable row level security;
alter table public.ai_cost_estimates enable row level security;
alter table public.ai_eval_snapshots enable row level security;
alter table public.ai_redaction_events enable row level security;

comment on table public.ai_agent_runs is
  'AI-004 append-only ledger of agent executions. Hashes only. RLS enabled, NO policies — service_role only.';
comment on table public.ai_cost_estimates is
  'AI-004 cost snapshot at execution time. RLS enabled, NO policies — service_role only.';
comment on table public.ai_eval_snapshots is
  'AI-004 eval run aggregates. RLS enabled, NO policies — service_role only.';
comment on table public.ai_redaction_events is
  'AI-004 redaction audit. RLS enabled, NO policies — service_role only.';
