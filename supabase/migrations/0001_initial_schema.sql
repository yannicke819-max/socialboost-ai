-- =========================================================================
-- SocialBoost AI — Schema initial (MVP)
--
-- Toutes les tables ont RLS activée. Les utilisateurs ne peuvent voir que
-- leurs propres données. Les colonnes de tokens OAuth sont conçues pour
-- être chiffrées au repos (à connecter à Supabase Vault ou pgcrypto).
-- =========================================================================

-- ----- Extensions -------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ----- Enums ------------------------------------------------------------
create type public.social_platform as enum (
  'instagram', 'linkedin', 'x', 'tiktok', 'facebook', 'youtube'
);

create type public.post_status as enum (
  'idea', 'draft', 'scheduled', 'publishing', 'published', 'failed', 'archived'
);

create type public.subscription_plan as enum (
  'free', 'creator', 'pro', 'agency'
);

-- ----- Profile (extends auth.users) -------------------------------------
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  niche text,
  niche_keywords text[] default '{}',
  tone jsonb default '{}'::jsonb,
  primary_objective text check (primary_objective in ('notoriete','engagement','trafic','ventes')),
  forbidden_keywords text[] default '{}',
  languages text[] default array['fr'],
  plan public.subscription_plan not null default 'free',
  stripe_customer_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----- Social accounts --------------------------------------------------
create table public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  platform public.social_platform not null,
  external_id text not null,
  handle text,
  access_token_enc text not null,
  refresh_token_enc text,
  token_expires_at timestamptz,
  scopes text[] default '{}',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, platform, external_id)
);

create index social_accounts_user_idx on public.social_accounts(user_id);

-- ----- Posts ------------------------------------------------------------
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  social_account_id uuid references public.social_accounts on delete set null,
  status public.post_status not null default 'idea',
  body text,
  hashtags text[] default '{}',
  media_urls text[] default '{}',
  hook_type text,
  bucket text,
  scheduled_for timestamptz,
  published_at timestamptz,
  external_post_id text,
  ai_generated boolean not null default false,
  source_prompt_version text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index posts_user_status_idx on public.posts(user_id, status);
create index posts_scheduled_idx on public.posts(scheduled_for) where status = 'scheduled';

-- ----- Analytics snapshots ----------------------------------------------
create table public.analytics_snapshots (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts on delete cascade,
  captured_at timestamptz not null default now(),
  impressions integer,
  reach integer,
  likes integer,
  comments integer,
  shares integer,
  saves integer,
  clicks integer,
  raw jsonb
);

create index analytics_post_idx on public.analytics_snapshots(post_id, captured_at desc);

-- ----- AI suggestions ---------------------------------------------------
create table public.ai_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  kind text not null check (kind in ('idea','reco','refresh','digest')),
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending','accepted','dismissed')),
  created_at timestamptz not null default now()
);

create index ai_suggestions_user_idx on public.ai_suggestions(user_id, status, created_at desc);

-- ----- Subscriptions (Stripe mirror) ------------------------------------
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users on delete cascade,
  stripe_subscription_id text unique,
  plan public.subscription_plan not null,
  status text not null,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  trial_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----- Updated_at triggers ----------------------------------------------
create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger social_accounts_updated_at before update on public.social_accounts
  for each row execute function public.set_updated_at();
create trigger posts_updated_at before update on public.posts
  for each row execute function public.set_updated_at();
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- ----- Auto-create profile on signup ------------------------------------
create or replace function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----- Row Level Security -----------------------------------------------
alter table public.profiles enable row level security;
alter table public.social_accounts enable row level security;
alter table public.posts enable row level security;
alter table public.analytics_snapshots enable row level security;
alter table public.ai_suggestions enable row level security;
alter table public.subscriptions enable row level security;

create policy "profiles self access" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "social_accounts self access" on public.social_accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "posts self access" on public.posts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "analytics self access" on public.analytics_snapshots
  for all using (
    exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid())
  );

create policy "ai_suggestions self access" on public.ai_suggestions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "subscriptions self read" on public.subscriptions
  for select using (auth.uid() = user_id);
-- Les écritures sur `subscriptions` se font uniquement via service_role (webhooks Stripe).
