-- Total Form Fitness — Phase 0 schema.
-- Multi-coach-ready role model (CLAUDE.md §1, §16). No single-coach assumption:
-- many coaches can live under one owner, each owning their own clients.
--
-- Written to be safely re-runnable (idempotent): running it again skips what
-- already exists instead of erroring, so a half-finished run is easy to fix.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.app_role as enum ('owner', 'coach', 'client');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.coach_client_status as enum ('active', 'archived');
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- profiles — one row per auth user, carries the role.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  role         public.app_role not null default 'client',
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.profiles is 'Per-user profile and role. Role drives all access (owner/coach/client).';

-- ---------------------------------------------------------------------------
-- coaches — coach-specific record. A coach IS a profile with role coach/owner.
-- coach_code is the shareable, human-typable sign-up code (§8).
-- ---------------------------------------------------------------------------
create table if not exists public.coaches (
  id         uuid primary key references public.profiles (id) on delete cascade,
  coach_code text not null unique,
  bio        text,
  created_at timestamptz not null default now()
);

comment on table public.coaches is 'Coach record + shareable coach_code. Owner is also a coach.';

-- ---------------------------------------------------------------------------
-- coach_clients — the coach↔client link. One active coach per client today,
-- but the schema already supports reassignment and many coaches per owner.
-- ---------------------------------------------------------------------------
create table if not exists public.coach_clients (
  id               uuid primary key default gen_random_uuid(),
  coach_id         uuid not null references public.coaches (id) on delete cascade,
  client_id        uuid not null references public.profiles (id) on delete cascade,
  status           public.coach_client_status not null default 'active',
  consent_given_at timestamptz not null default now(),  -- consent captured at sign-up (§8, §13)
  referred_by      uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  constraint coach_clients_no_self check (coach_id <> client_id)
);

-- A client can have at most one ACTIVE coach; history/archived rows are allowed.
create unique index if not exists coach_clients_one_active_coach
  on public.coach_clients (client_id)
  where status = 'active';

create index if not exists coach_clients_coach_idx on public.coach_clients (coach_id);
create index if not exists coach_clients_client_idx on public.coach_clients (client_id);

comment on table public.coach_clients is 'Coach owns client. consent_given_at records §8/§13 consent.';

-- ---------------------------------------------------------------------------
-- updated_at housekeeping
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();
