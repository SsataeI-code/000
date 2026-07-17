-- Total Form Fitness — one-shot database setup.
-- Paste this ENTIRE file into a Supabase SQL Editor query and click Run once.
-- Safe to run more than once: it skips anything that already exists.
-- It is the three files in supabase/ combined for convenience.

-- ========================================================================
-- 1/3 — SCHEMA
-- ========================================================================
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

-- ========================================================================
-- 2/3 — FUNCTIONS + ROW LEVEL SECURITY
-- ========================================================================
-- Total Form Fitness — Phase 0 access control.
-- Helper functions are SECURITY DEFINER so RLS policies can call them without
-- recursively triggering RLS on the same tables (a classic Postgres RLS trap).

-- ---------------------------------------------------------------------------
-- Role helpers
-- ---------------------------------------------------------------------------
create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(public.current_app_role() = 'owner', false);
$$;

-- Is the caller the active coach of p_client?
create or replace function public.is_coach_of(p_client uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.coach_clients
    where client_id = p_client
      and coach_id = auth.uid()
      and status = 'active'
  );
$$;

-- ---------------------------------------------------------------------------
-- resolve_signup — links a freshly-signed-up client to a coach (by code) or to
-- the owner for open public sign-ups, recording consent atomically (§8).
-- Idempotent: safe to call again from the email-confirmation callback.
-- ---------------------------------------------------------------------------
create or replace function public.resolve_signup(
  p_coach_code   text default null,
  p_consent      boolean default false,
  p_referral_code text default null  -- reserved for Phase 6 referrals
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid      uuid := auth.uid();
  v_coach_id uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if p_consent is not true then
    raise exception 'consent required';
  end if;

  -- Already linked? Return the existing coach (idempotent).
  select coach_id into v_coach_id
    from public.coach_clients
    where client_id = v_uid and status = 'active'
    limit 1;
  if v_coach_id is not null then
    return v_coach_id;
  end if;

  -- Resolve the target coach.
  if p_coach_code is not null and length(trim(p_coach_code)) > 0 then
    select id into v_coach_id
      from public.coaches
      where coach_code = upper(trim(p_coach_code));
    if v_coach_id is null then
      raise exception 'unknown coach code';
    end if;
  else
    -- Open public sign-up lands with the owner (§8).
    select c.id into v_coach_id
      from public.coaches c
      join public.profiles p on p.id = c.id
      where p.role = 'owner'
      order by c.created_at asc
      limit 1;
    if v_coach_id is null then
      raise exception 'no owner configured to receive open sign-ups';
    end if;
  end if;

  -- Never demote an existing owner/coach who happens to call this.
  update public.profiles
    set role = 'client'
    where id = v_uid and role not in ('owner', 'coach');

  insert into public.coach_clients (coach_id, client_id, consent_given_at)
    values (v_coach_id, v_uid, now())
    on conflict do nothing;

  return v_coach_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- handle_new_user — create the profile row the moment an auth user is created.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, display_name)
    values (new.id, nullif(new.raw_user_meta_data ->> 'display_name', ''))
    on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.coaches       enable row level security;
alter table public.coach_clients enable row level security;

-- profiles: a user sees itself; a coach sees its clients; the owner sees all.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (
    id = auth.uid()
    or public.is_owner()
    or public.is_coach_of(id)
  );

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update using (id = auth.uid() or public.is_owner())
  with check (id = auth.uid() or public.is_owner());

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
  for insert with check (id = auth.uid());

-- coaches: coach sees own row; the owner sees all; a client sees their coach.
drop policy if exists coaches_select on public.coaches;
create policy coaches_select on public.coaches
  for select using (
    id = auth.uid()
    or public.is_owner()
    or exists (
      select 1 from public.coach_clients cc
      where cc.coach_id = coaches.id
        and cc.client_id = auth.uid()
        and cc.status = 'active'
    )
  );

drop policy if exists coaches_insert on public.coaches;
create policy coaches_insert on public.coaches
  for insert with check (public.is_owner());

drop policy if exists coaches_update on public.coaches;
create policy coaches_update on public.coaches
  for update using (id = auth.uid() or public.is_owner())
  with check (id = auth.uid() or public.is_owner());

-- coach_clients: client sees its links; coach sees its roster; owner sees all.
drop policy if exists coach_clients_select on public.coach_clients;
create policy coach_clients_select on public.coach_clients
  for select using (
    client_id = auth.uid()
    or coach_id = auth.uid()
    or public.is_owner()
  );

drop policy if exists coach_clients_insert on public.coach_clients;
create policy coach_clients_insert on public.coach_clients
  for insert with check (coach_id = auth.uid() or public.is_owner());

drop policy if exists coach_clients_update on public.coach_clients;
create policy coach_clients_update on public.coach_clients
  for update using (coach_id = auth.uid() or public.is_owner())
  with check (coach_id = auth.uid() or public.is_owner());

drop policy if exists coach_clients_delete on public.coach_clients;
create policy coach_clients_delete on public.coach_clients
  for delete using (public.is_owner());

-- ---------------------------------------------------------------------------
-- Grants (RLS still governs row visibility; grants govern table access at all).
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete
  on public.profiles, public.coaches, public.coach_clients
  to authenticated;
grant execute on function public.resolve_signup(text, boolean, text) to authenticated;
grant execute on function public.current_app_role() to authenticated;
grant execute on function public.is_owner() to authenticated;
grant execute on function public.is_coach_of(uuid) to authenticated;

-- ========================================================================
-- 3/3 — OWNER / COACH BOOTSTRAP HELPERS
-- ========================================================================
-- Total Form Fitness — Phase 0 seed / owner bootstrap.
--
-- The owner (super-admin coach) must exist so open public sign-ups have a home
-- (§8) and so RLS "owner sees all" has a subject. You create the owner in two
-- steps because auth users are minted by Supabase Auth, not by raw SQL:
--
--   1. Sign up / invite the owner's email through Supabase Auth (Dashboard →
--      Authentication → Users → Add user, or the normal /signup screen).
--   2. Run:  select public.promote_to_owner('owner@example.com');
--
-- This promotes that user to role 'owner' and gives them a coach record with a
-- generated coach_code. Idempotent — safe to run more than once.

create or replace function public.promote_to_owner(p_email text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid  uuid;
  v_code text;
begin
  select id into v_uid from auth.users where lower(email) = lower(p_email);
  if v_uid is null then
    raise exception 'no auth user with email %, sign them up first', p_email;
  end if;

  insert into public.profiles (id, role)
    values (v_uid, 'owner')
    on conflict (id) do update set role = 'owner';

  -- Generate a code from the safe alphabet if the owner has no coach row yet.
  select coach_code into v_code from public.coaches where id = v_uid;
  if v_code is null then
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    v_code := translate(v_code, 'OIL01', 'PQRST');  -- drop ambiguous glyphs
    insert into public.coaches (id, coach_code) values (v_uid, v_code);
  end if;

  return v_code;
end;
$$;

-- Provision an additional coach under the owner (multi-coach from day one).
--   select public.provision_coach('coach@example.com');
create or replace function public.provision_coach(p_email text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid  uuid;
  v_code text;
begin
  select id into v_uid from auth.users where lower(email) = lower(p_email);
  if v_uid is null then
    raise exception 'no auth user with email %, sign them up first', p_email;
  end if;

  insert into public.profiles (id, role)
    values (v_uid, 'coach')
    on conflict (id) do update set role = 'coach';

  select coach_code into v_code from public.coaches where id = v_uid;
  if v_code is null then
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    v_code := translate(v_code, 'OIL01', 'PQRST');
    insert into public.coaches (id, coach_code) values (v_uid, v_code);
  end if;

  return v_code;
end;
$$;
