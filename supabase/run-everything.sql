-- Total Form Fitness — RUN EVERYTHING (complete DB setup, all phases).
-- Paste this ENTIRE file into Supabase → SQL Editor → Run. Every statement
-- is idempotent, so it is safe even if parts were already applied.
-- Generated from supabase/migrations/0001–0026.


-- ==================== 0001_schema.sql ====================
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


-- ==================== 0002_functions_rls.sql ====================
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


-- ==================== 0003_nutrition.sql ====================
-- Total Form Fitness — Phase 1 schema: the core client loop.
-- Client intake + PN targets, a shared Open Food Facts product cache, and food
-- logs. Idempotent (safe to re-run), same as the Phase 0 migrations.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin create type public.sex as enum ('male','female'); exception when duplicate_object then null; end $$;
do $$ begin create type public.activity_level as enum ('sedentary','light','moderate','very','athlete'); exception when duplicate_object then null; end $$;
do $$ begin create type public.goal as enum ('lose','maintain','recomp','gain','habits_only'); exception when duplicate_object then null; end $$;
do $$ begin create type public.diet_preference as enum ('balanced','low_carb','low_fat'); exception when duplicate_object then null; end $$;
do $$ begin create type public.food_log_source as enum ('scan','search','manual'); exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- client_profiles — first-run intake (§8) that drives the targets calculator.
-- ---------------------------------------------------------------------------
create table if not exists public.client_profiles (
  id              uuid primary key references public.profiles (id) on delete cascade,
  sex             public.sex,
  age             int check (age between 13 and 100),
  height_cm       numeric check (height_cm between 90 and 250),
  weight_kg       numeric check (weight_kg between 25 and 400),
  activity        public.activity_level,
  goal            public.goal not null default 'maintain',
  diet_preference public.diet_preference not null default 'balanced',
  onboarded_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

drop trigger if exists client_profiles_touch on public.client_profiles;
create trigger client_profiles_touch before update on public.client_profiles
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- nutrition_targets — computed daily targets. Keep history (recalc every
-- 4–6 weeks, §5B); the latest row by computed_at is the active one.
-- ---------------------------------------------------------------------------
create table if not exists public.nutrition_targets (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.profiles (id) on delete cascade,
  calories    int not null check (calories > 0),
  protein_g   int not null check (protein_g >= 0),
  carbs_g     int not null check (carbs_g >= 0),
  fat_g       int not null check (fat_g >= 0),
  method      text not null default 'pn',
  computed_at timestamptz not null default now()
);
create index if not exists nutrition_targets_client_idx
  on public.nutrition_targets (client_id, computed_at desc);

-- ---------------------------------------------------------------------------
-- food_products — shared Open Food Facts cache. Global (not per-user): every
-- scan/confirm improves the shared data for everyone (§6).
-- ---------------------------------------------------------------------------
create table if not exists public.food_products (
  barcode       text primary key,
  name          text,
  brand         text,
  image_url     text,
  serving_size_g numeric,
  nutriments    jsonb not null default '{}'::jsonb,  -- per-100g
  updated_by    uuid references public.profiles (id) on delete set null,
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- food_logs — one row per logged item. Macros are stored on the row so a log is
-- immutable even if the shared product later changes (reliability, §2).
-- ---------------------------------------------------------------------------
create table if not exists public.food_logs (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references public.profiles (id) on delete cascade,
  log_date   date not null default (now() at time zone 'utc')::date,
  logged_at  timestamptz not null default now(),
  barcode    text,
  name       text not null,
  brand      text,
  grams      numeric,
  calories   int not null default 0 check (calories >= 0),
  protein_g  numeric not null default 0 check (protein_g >= 0),
  carbs_g    numeric not null default 0 check (carbs_g >= 0),
  fat_g      numeric not null default 0 check (fat_g >= 0),
  nutriments jsonb,
  source     public.food_log_source not null default 'manual',
  created_at timestamptz not null default now()
);
create index if not exists food_logs_client_date_idx
  on public.food_logs (client_id, log_date);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.client_profiles   enable row level security;
alter table public.nutrition_targets enable row level security;
alter table public.food_products     enable row level security;
alter table public.food_logs         enable row level security;

-- client_profiles: self + coach-of + owner may read; self + coach + owner write.
drop policy if exists client_profiles_select on public.client_profiles;
create policy client_profiles_select on public.client_profiles
  for select using (id = auth.uid() or public.is_owner() or public.is_coach_of(id));
drop policy if exists client_profiles_write on public.client_profiles;
create policy client_profiles_write on public.client_profiles
  for all using (id = auth.uid() or public.is_owner() or public.is_coach_of(id))
  with check (id = auth.uid() or public.is_owner() or public.is_coach_of(id));

-- nutrition_targets: same visibility. Coaches can set/adjust targets (§5B).
drop policy if exists nutrition_targets_select on public.nutrition_targets;
create policy nutrition_targets_select on public.nutrition_targets
  for select using (client_id = auth.uid() or public.is_owner() or public.is_coach_of(client_id));
drop policy if exists nutrition_targets_write on public.nutrition_targets;
create policy nutrition_targets_write on public.nutrition_targets
  for all using (client_id = auth.uid() or public.is_owner() or public.is_coach_of(client_id))
  with check (client_id = auth.uid() or public.is_owner() or public.is_coach_of(client_id));

-- food_products: shared read for all signed-in users; any signed-in user may
-- contribute/upsert (that's how the crowdsourced cache improves, §6).
drop policy if exists food_products_select on public.food_products;
create policy food_products_select on public.food_products
  for select using (auth.uid() is not null);
drop policy if exists food_products_write on public.food_products;
create policy food_products_write on public.food_products
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

-- food_logs: a client owns its logs; coach-of and owner may read (dashboards).
drop policy if exists food_logs_select on public.food_logs;
create policy food_logs_select on public.food_logs
  for select using (client_id = auth.uid() or public.is_owner() or public.is_coach_of(client_id));
drop policy if exists food_logs_write on public.food_logs;
create policy food_logs_write on public.food_logs
  for all using (client_id = auth.uid()) with check (client_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
grant select, insert, update, delete
  on public.client_profiles, public.nutrition_targets, public.food_products, public.food_logs
  to authenticated;


-- ==================== 0004_meals.sql ====================
-- Total Form Fitness — Phase 1.1: user-created saved meals.
-- A client (or their coach) can build a meal from ingredients, save it as a
-- reusable template, and log the whole thing in one tap. Idempotent.

create table if not exists public.meals (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references public.profiles (id) on delete cascade,
  name       text not null,
  -- Array of { name, grams, nutrimentsPer100g } — everything needed to log it.
  items      jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists meals_owner_idx on public.meals (owner_id);

drop trigger if exists meals_touch on public.meals;
create trigger meals_touch before update on public.meals
  for each row execute function public.touch_updated_at();

alter table public.meals enable row level security;

-- A client owns its meals; the coach-of and owner can see them (Phase 3).
drop policy if exists meals_select on public.meals;
create policy meals_select on public.meals
  for select using (owner_id = auth.uid() or public.is_owner() or public.is_coach_of(owner_id));
drop policy if exists meals_write on public.meals;
create policy meals_write on public.meals
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

grant select, insert, update, delete on public.meals to authenticated;


-- ==================== 0005_habits.sql ====================
-- Total Form Fitness — Phase 2: habits engine (§5A). The star of the app.
-- Idempotent, same conventions as earlier migrations.

do $$ begin create type public.habit_category as enum ('nutrition','movement','sleep','mindfulness','hydration','recovery'); exception when duplicate_object then null; end $$;
do $$ begin create type public.habit_type as enum ('checkbox','counter','duration','quantity'); exception when duplicate_object then null; end $$;
do $$ begin create type public.habit_cadence as enum ('daily','weekly_count','specific_days'); exception when duplicate_object then null; end $$;

create table if not exists public.habits (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.profiles (id) on delete cascade,
  name          text not null,
  category      public.habit_category not null default 'movement',
  type          public.habit_type not null default 'checkbox',
  target        numeric,                 -- for counter/duration/quantity
  unit          text,                    -- e.g. "min", "steps", "glasses"
  cadence       public.habit_cadence not null default 'daily',
  times_per_week int check (times_per_week between 1 and 7),
  days_of_week  int[],                   -- 0=Sun .. 6=Sat, for specific_days
  reminder_time time,
  why           text,                    -- shown at check-in
  anchor        text,                    -- habit stacking: "after morning coffee"
  position      int not null default 0,
  active        boolean not null default true,
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists habits_client_idx on public.habits (client_id) where active;

drop trigger if exists habits_touch on public.habits;
create trigger habits_touch before update on public.habits
  for each row execute function public.touch_updated_at();

create table if not exists public.habit_logs (
  id         uuid primary key default gen_random_uuid(),
  habit_id   uuid not null references public.habits (id) on delete cascade,
  client_id  uuid not null references public.profiles (id) on delete cascade,
  log_date   date not null,
  value      numeric not null default 1,
  completed  boolean not null default true,
  created_at timestamptz not null default now(),
  unique (habit_id, log_date)
);
create index if not exists habit_logs_client_date_idx on public.habit_logs (client_id, log_date);
create index if not exists habit_logs_habit_idx on public.habit_logs (habit_id, log_date);

-- RLS
alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;

-- habits: client sees own; coach-of/owner see them. Coach can also create/veto
-- (assign or remove) a client's habits (§5A adaptive engine); client manages own.
drop policy if exists habits_select on public.habits;
create policy habits_select on public.habits
  for select using (client_id = auth.uid() or public.is_owner() or public.is_coach_of(client_id));
drop policy if exists habits_write on public.habits;
create policy habits_write on public.habits
  for all using (client_id = auth.uid() or public.is_owner() or public.is_coach_of(client_id))
  with check (client_id = auth.uid() or public.is_owner() or public.is_coach_of(client_id));

-- habit_logs: the client checks off their own; coach-of/owner can read.
drop policy if exists habit_logs_select on public.habit_logs;
create policy habit_logs_select on public.habit_logs
  for select using (client_id = auth.uid() or public.is_owner() or public.is_coach_of(client_id));
drop policy if exists habit_logs_write on public.habit_logs;
create policy habit_logs_write on public.habit_logs
  for all using (client_id = auth.uid()) with check (client_id = auth.uid());

grant select, insert, update, delete on public.habits, public.habit_logs to authenticated;


-- ==================== 0006_hydration_body.sql ====================
-- Total Form Fitness — Phase 2: hydration (§5 dedicated) + body (§5C).
-- Idempotent.

-- --- Hydration: a first-class daily water tracker ---
alter table public.client_profiles
  add column if not exists water_goal_ml int not null default 2500;

create table if not exists public.water_logs (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references public.profiles (id) on delete cascade,
  log_date   date not null default (now() at time zone 'utc')::date,
  ml         int not null,               -- increments (can be negative to undo)
  created_at timestamptz not null default now()
);
create index if not exists water_logs_client_date_idx on public.water_logs (client_id, log_date);

-- --- Body: weight, body-fat %, optional measurements (§5C) ---
create table if not exists public.body_measurements (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.profiles (id) on delete cascade,
  log_date     date not null,
  weight_kg    numeric check (weight_kg is null or weight_kg between 20 and 500),
  body_fat_pct numeric check (body_fat_pct is null or body_fat_pct between 2 and 75),
  waist_cm     numeric,
  hips_cm      numeric,
  notes        text,
  created_at   timestamptz not null default now(),
  unique (client_id, log_date)
);
create index if not exists body_client_date_idx on public.body_measurements (client_id, log_date);

-- RLS
alter table public.water_logs enable row level security;
alter table public.body_measurements enable row level security;

drop policy if exists water_logs_select on public.water_logs;
create policy water_logs_select on public.water_logs
  for select using (client_id = auth.uid() or public.is_owner() or public.is_coach_of(client_id));
drop policy if exists water_logs_write on public.water_logs;
create policy water_logs_write on public.water_logs
  for all using (client_id = auth.uid()) with check (client_id = auth.uid());

drop policy if exists body_select on public.body_measurements;
create policy body_select on public.body_measurements
  for select using (client_id = auth.uid() or public.is_owner() or public.is_coach_of(client_id));
drop policy if exists body_write on public.body_measurements;
create policy body_write on public.body_measurements
  for all using (client_id = auth.uid()) with check (client_id = auth.uid());

grant select, insert, update, delete on public.water_logs, public.body_measurements to authenticated;


-- ==================== 0007_food_photos.sql ====================
-- Total Form Fitness — food photo (bonus). Optional picture attached to a food
-- log, stored in a PRIVATE Storage bucket the client owns. Idempotent.

alter table public.food_logs add column if not exists photo_path text;

-- Private bucket (served via short-lived signed URLs, never public).
insert into storage.buckets (id, name, public)
  values ('food-photos', 'food-photos', false)
  on conflict (id) do nothing;

-- A client can read/write only their own folder (path = "<uid>/<file>").
-- The coach-of / owner can read a client's photos (dashboards, Phase 3).
drop policy if exists "food_photos_own_write" on storage.objects;
create policy "food_photos_own_write" on storage.objects
  for all to authenticated
  using (bucket_id = 'food-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'food-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "food_photos_coach_read" on storage.objects;
create policy "food_photos_coach_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'food-photos'
    and (
      public.is_owner()
      or public.is_coach_of(((storage.foldername(name))[1])::uuid)
    )
  );


-- ==================== 0008_coach_prefs.sql ====================
-- Total Form Fitness — Phase 3: coach dashboard preferences (§9 "the dashboard
-- is open-ended and editable — the coach arranges, adds, and edits the tiles").
-- One row per coach holds their dashboard tile layout as JSON. Idempotent, same
-- conventions as earlier migrations. Multi-coach-safe: keyed per coach, RLS
-- scopes each coach to their own row (owner sees all).

create table if not exists public.coach_prefs (
  coach_id   uuid primary key references public.profiles (id) on delete cascade,
  dashboard  jsonb not null default '[]'::jsonb,   -- ordered [{id, visible}]
  updated_at timestamptz not null default now()
);

drop trigger if exists coach_prefs_touch on public.coach_prefs;
create trigger coach_prefs_touch before update on public.coach_prefs
  for each row execute function public.touch_updated_at();

alter table public.coach_prefs enable row level security;

-- Each coach reads/writes only their own prefs; the owner may see all.
drop policy if exists coach_prefs_rw on public.coach_prefs;
create policy coach_prefs_rw on public.coach_prefs
  for all using (coach_id = auth.uid() or public.is_owner())
  with check (coach_id = auth.uid() or public.is_owner());

grant select, insert, update, delete on public.coach_prefs to authenticated;


-- ==================== 0009_messages.sql ====================
-- Total Form Fitness — Phase 4: coach ↔ client messaging (§10). One thread per
-- (coach, client) pair; each row is one message. Multi-coach-safe (keyed by both
-- ids), RLS scopes a thread to its two participants (owner sees all). Idempotent.
-- `kind` distinguishes a real person's message from an app auto-nudge (§10
-- transparency) so the UI can label them differently.

do $$ begin create type public.message_kind as enum ('coach','client','nudge'); exception when duplicate_object then null; end $$;

create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  coach_id   uuid not null references public.profiles (id) on delete cascade,
  client_id  uuid not null references public.profiles (id) on delete cascade,
  sender_id  uuid not null references public.profiles (id) on delete cascade,
  kind       public.message_kind not null default 'coach',
  body       text not null check (length(btrim(body)) > 0),
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists messages_thread_idx on public.messages (coach_id, client_id, created_at);
create index if not exists messages_client_idx on public.messages (client_id, created_at);

alter table public.messages enable row level security;

-- A thread's two participants read it; the owner reads all.
drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages
  for select using (client_id = auth.uid() or coach_id = auth.uid() or public.is_owner());

-- A participant may post, and only as themselves (sender_id = auth.uid()).
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages
  for insert with check (
    sender_id = auth.uid()
    and (client_id = auth.uid() or coach_id = auth.uid() or public.is_owner())
  );

-- Participants may update (e.g. mark read); scoped to their own thread.
drop policy if exists messages_update on public.messages;
create policy messages_update on public.messages
  for update using (client_id = auth.uid() or coach_id = auth.uid() or public.is_owner())
  with check (client_id = auth.uid() or coach_id = auth.uid() or public.is_owner());

grant select, insert, update on public.messages to authenticated;

-- Live updates for the chat (§10 realtime). Add to the realtime publication once.
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null; when undefined_object then null; end $$;


-- ==================== 0010_notifications.sql ====================
-- Total Form Fitness — Phase 4: in-app notifications (§10 "in-app notifications
-- are the default"). One row per notification for a recipient. Idempotent.
-- Feeds the bell/inbox on both sides and, later, PWA push + the 3-day email.
-- RLS: a user sees only their own; a coach/owner may create one FOR their client
-- (e.g. an auto-nudge), but no one can read another user's inbox.

do $$ begin create type public.notification_kind as enum ('nudge','message','system','report'); exception when duplicate_object then null; end $$;

create table if not exists public.notifications (
  id           uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  kind         public.notification_kind not null default 'system',
  title        text not null check (length(btrim(title)) > 0),
  body         text,
  link         text, -- in-app route to open
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists notifications_recipient_idx on public.notifications (recipient_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications (recipient_id) where read_at is null;

alter table public.notifications enable row level security;

-- Read only your own inbox (owner may see all).
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
  for select using (recipient_id = auth.uid() or public.is_owner());

-- Create one for yourself, for a client you coach, or (owner) for anyone.
drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert on public.notifications
  for insert with check (
    recipient_id = auth.uid() or public.is_coach_of(recipient_id) or public.is_owner()
  );

-- Only the recipient (or owner) marks their notifications read.
drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications
  for update using (recipient_id = auth.uid() or public.is_owner())
  with check (recipient_id = auth.uid() or public.is_owner());

grant select, insert, update on public.notifications to authenticated;

do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null; when undefined_object then null; end $$;


-- ==================== 0011_engagement.sql ====================
-- Total Form Fitness — Phase 4: engagement sweep state (§9 auto-nudge, §10
-- re-engagement email). One row per client tracks what the daily sweep has
-- already fired for the current quiet spell, so nothing double-sends. Written
-- only by the server-side cron (service role, which bypasses RLS); RLS here just
-- lets the owner peek. Idempotent.

create table if not exists public.engagement_state (
  client_id         uuid primary key references public.profiles (id) on delete cascade,
  last_activity_on  date,
  coach_alerted     boolean not null default false,
  emailed_threshold int not null default 0,
  last_nudge_on     date,
  updated_at        timestamptz not null default now()
);

drop trigger if exists engagement_state_touch on public.engagement_state;
create trigger engagement_state_touch before update on public.engagement_state
  for each row execute function public.touch_updated_at();

alter table public.engagement_state enable row level security;

-- Owner may inspect; clients/coaches never read it. The cron writes via service role.
drop policy if exists engagement_state_owner on public.engagement_state;
create policy engagement_state_owner on public.engagement_state
  for select using (public.is_owner());

grant select on public.engagement_state to authenticated;


-- ==================== 0012_push_subscriptions.sql ====================
-- Total Form Fitness — Phase 4: Web Push subscriptions (§10 "PWA push"). One row
-- per device a user has opted into push on. The server (service role) reads these
-- to send pushes; users manage their own. Idempotent.

create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- A user manages only their own subscriptions (owner may see all). Sending is
-- done server-side under the service role, which bypasses RLS.
drop policy if exists push_subscriptions_rw on public.push_subscriptions;
create policy push_subscriptions_rw on public.push_subscriptions
  for all using (user_id = auth.uid() or public.is_owner())
  with check (user_id = auth.uid() or public.is_owner());

grant select, insert, update, delete on public.push_subscriptions to authenticated;


-- ==================== 0013_referrals.sql ====================
-- Total Form Fitness — Phase 6 (Growth): referrals (§8).
-- A client shares a personal link; a new sign-up on that link is tracked, and
-- the referral surfaces to the coach, who PROCESSES the reward (10% is only a
-- default — the coach controls or waives any discount). Self-referral is
-- prevented. Money lives outside the app, so the "reward" here is a status the
-- coach tracks, not an in-app charge.
--
-- Idempotent: safe to re-run.

-- ---------------------------------------------------------------------------
-- Referral code on every profile (shareable, unambiguous, uppercase).
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists referral_code text;

create unique index if not exists profiles_referral_code_key
  on public.profiles (referral_code)
  where referral_code is not null;

-- Generate a fresh, collision-checked referral code. Same safe alphabet as
-- coach codes (no 0/O/1/I/L); 7 chars to distinguish from 6-char coach codes.
create or replace function public.gen_referral_code()
returns text
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code text;
  i int;
begin
  loop
    code := '';
    for i in 1..7 loop
      code := code || substr(alphabet, floor(random() * length(alphabet))::int + 1, 1);
    end loop;
    exit when not exists (select 1 from public.profiles where referral_code = code);
  end loop;
  return code;
end;
$$;

-- Backfill existing profiles (one code each; loop so each gets a unique value).
do $$
declare r record;
begin
  for r in select id from public.profiles where referral_code is null loop
    update public.profiles set referral_code = public.gen_referral_code() where id = r.id;
  end loop;
end $$;

-- Return the caller's code, minting one on first use.
create or replace function public.ensure_referral_code()
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v text;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select referral_code into v from public.profiles where id = auth.uid();
  if v is null then
    v := public.gen_referral_code();
    update public.profiles set referral_code = v where id = auth.uid();
  end if;
  return v;
end;
$$;

-- ---------------------------------------------------------------------------
-- referrals — one row per referred sign-up. status is the coach's workflow.
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.referral_status as enum ('joined', 'rewarded', 'declined');
exception when duplicate_object then null;
end $$;

create table if not exists public.referrals (
  id           uuid primary key default gen_random_uuid(),
  referrer_id  uuid not null references public.profiles (id) on delete cascade,
  referred_id  uuid not null unique references public.profiles (id) on delete cascade,
  coach_id     uuid not null references public.coaches (id) on delete cascade,
  status       public.referral_status not null default 'joined',
  reward_note  text,
  created_at   timestamptz not null default now(),
  processed_at timestamptz,
  constraint referrals_no_self check (referrer_id <> referred_id)
);

create index if not exists referrals_referrer_idx on public.referrals (referrer_id);
create index if not exists referrals_coach_idx on public.referrals (coach_id);

comment on table public.referrals is 'Referred sign-ups (§8). Coach processes the reward; 10% is a default, not automatic.';

-- ---------------------------------------------------------------------------
-- Coach processes a referral (reward or waive). SECURITY DEFINER so only the
-- status/note can change, and only by the owning coach or the owner.
-- ---------------------------------------------------------------------------
create or replace function public.process_referral(
  p_id     uuid,
  p_status public.referral_status,
  p_note   text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_coach uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if p_status not in ('rewarded', 'declined') then raise exception 'invalid status'; end if;
  select coach_id into v_coach from public.referrals where id = p_id;
  if v_coach is null then raise exception 'referral not found'; end if;
  if not (v_coach = auth.uid() or public.is_owner()) then raise exception 'not authorized'; end if;
  update public.referrals
    set status = p_status, reward_note = nullif(trim(coalesce(p_note, '')), ''), processed_at = now()
    where id = p_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- resolve_signup — now records the referral (never self), setting referred_by
-- and creating the referrals row atomically with the coach link. Still
-- idempotent (returns early if the client is already linked).
-- ---------------------------------------------------------------------------
create or replace function public.resolve_signup(
  p_coach_code    text default null,
  p_consent       boolean default false,
  p_referral_code text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid      uuid := auth.uid();
  v_coach_id uuid;
  v_referrer uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_consent is not true then raise exception 'consent required'; end if;

  -- Already linked? Return the existing coach (idempotent).
  select coach_id into v_coach_id
    from public.coach_clients
    where client_id = v_uid and status = 'active'
    limit 1;
  if v_coach_id is not null then
    return v_coach_id;
  end if;

  -- Resolve the target coach (by code, else the owner for open sign-ups).
  if p_coach_code is not null and length(trim(p_coach_code)) > 0 then
    select id into v_coach_id from public.coaches where coach_code = upper(trim(p_coach_code));
    if v_coach_id is null then raise exception 'unknown coach code'; end if;
  else
    select c.id into v_coach_id
      from public.coaches c
      join public.profiles p on p.id = c.id
      where p.role = 'owner'
      order by c.created_at asc
      limit 1;
    if v_coach_id is null then raise exception 'no owner configured to receive open sign-ups'; end if;
  end if;

  -- Resolve the referrer (optional; never yourself).
  if p_referral_code is not null and length(trim(p_referral_code)) > 0 then
    select id into v_referrer from public.profiles where referral_code = upper(trim(p_referral_code));
    if v_referrer = v_uid then v_referrer := null; end if;
  end if;

  -- Never demote an existing owner/coach who happens to call this.
  update public.profiles set role = 'client' where id = v_uid and role not in ('owner', 'coach');

  insert into public.coach_clients (coach_id, client_id, consent_given_at, referred_by)
    values (v_coach_id, v_uid, now(), v_referrer)
    on conflict do nothing;

  if v_referrer is not null then
    insert into public.referrals (referrer_id, referred_id, coach_id, status)
      values (v_referrer, v_uid, v_coach_id, 'joined')
      on conflict (referred_id) do nothing;
  end if;

  return v_coach_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- handle_new_user — mint a referral code the moment the profile is created.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, display_name, referral_code)
    values (
      new.id,
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      public.gen_referral_code()
    )
    on conflict (id) do nothing;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS + grants
-- ---------------------------------------------------------------------------
alter table public.referrals enable row level security;

-- A referrer sees their own referrals; the coach sees referrals to their
-- roster; the owner sees all. Inserts happen only via resolve_signup
-- (SECURITY DEFINER), so there is deliberately no insert policy.
drop policy if exists referrals_select on public.referrals;
create policy referrals_select on public.referrals
  for select using (
    referrer_id = auth.uid()
    or coach_id = auth.uid()
    or public.is_owner()
  );

grant select on public.referrals to authenticated;
grant execute on function public.ensure_referral_code() to authenticated;
grant execute on function public.process_referral(uuid, public.referral_status, text) to authenticated;


-- ==================== 0014_content.sql ====================
-- Total Form Fitness — Phase 6 (Growth): full CMS content overrides (§4, §16).
-- Every user-facing string ships with a house-style default in code; this table
-- lets the owner override any of them without a code change. Overrides are
-- global app copy (not secret), so anyone — including signed-out visitors on the
-- login/signup screens — may READ them; only the owner may WRITE.
--
-- Multi-coach note: v1 is a single global copy set edited by the owner. The
-- resolver reads this table wholesale; per-coach copy can layer on later without
-- reshaping call sites (they already pass an overrides map).
--
-- Idempotent: safe to re-run.

create table if not exists public.content_overrides (
  key        text primary key,
  value      text not null,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

comment on table public.content_overrides is 'CMS copy overrides (§4). Owner-editable; house-style defaults live in code.';

drop trigger if exists content_overrides_touch on public.content_overrides;
create trigger content_overrides_touch
  before update on public.content_overrides
  for each row execute function public.touch_updated_at();

alter table public.content_overrides enable row level security;

-- Read: everyone (incl. anon) — it's app copy shown on public screens.
drop policy if exists content_select on public.content_overrides;
create policy content_select on public.content_overrides
  for select using (true);

-- Write: owner only.
drop policy if exists content_insert on public.content_overrides;
create policy content_insert on public.content_overrides
  for insert with check (public.is_owner());

drop policy if exists content_update on public.content_overrides;
create policy content_update on public.content_overrides
  for update using (public.is_owner()) with check (public.is_owner());

drop policy if exists content_delete on public.content_overrides;
create policy content_delete on public.content_overrides
  for delete using (public.is_owner());

grant select on public.content_overrides to anon, authenticated;
grant insert, update, delete on public.content_overrides to authenticated;


-- ==================== 0015_quiet_hours.sql ====================
-- Total Form Fitness — quiet hours (§10 "Client can set quiet hours").
-- Stored on the client's profile as minutes-of-day plus their IANA timezone (so
-- the server can tell whether it's currently quiet for them). Null start/end
-- means "no quiet hours". Suppresses the push buzz only — the in-app
-- notification is still recorded so nothing is lost.
--
-- Idempotent: safe to re-run.

alter table public.client_profiles add column if not exists quiet_start smallint
  check (quiet_start is null or quiet_start between 0 and 1439);
alter table public.client_profiles add column if not exists quiet_end smallint
  check (quiet_end is null or quiet_end between 0 and 1439);
alter table public.client_profiles add column if not exists timezone text;

comment on column public.client_profiles.quiet_start is 'Quiet-hours start, minutes past local midnight (§10). Null = off.';
comment on column public.client_profiles.quiet_end is 'Quiet-hours end, minutes past local midnight (§10). Null = off.';
comment on column public.client_profiles.timezone is 'IANA timezone for evaluating quiet hours server-side.';


-- ==================== 0016_client_screen.sql ====================
-- Total Form Fitness — coach-configurable client "Today" screen (§4 "coach-
-- editable everything"; §9 configurable, applied to the client side). The coach
-- arranges/shows/hides the sections their clients see on Today. Stored per coach
-- on coach_prefs alongside the dashboard layout.
--
-- A client must be able to READ their own coach's client-screen layout, but not
-- the rest of that coach's prefs — so it's exposed through a SECURITY DEFINER
-- function that resolves the caller's coach and returns just the layout.
--
-- Idempotent: safe to re-run.

alter table public.coach_prefs add column if not exists client_today jsonb not null default '[]'::jsonb;

comment on column public.coach_prefs.client_today is 'Ordered [{id,visible}] sections for the client Today screen (§4).';

-- Return the caller's coach's client-screen layout (their active coach, else the
-- owner). Only the layout is exposed — never the full prefs row.
create or replace function public.client_screen_layout()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_coach uuid;
  v_layout jsonb;
begin
  if auth.uid() is null then return '[]'::jsonb; end if;

  select coach_id into v_coach
    from public.coach_clients
    where client_id = auth.uid() and status = 'active'
    limit 1;

  if v_coach is null then
    select id into v_coach from public.profiles where role = 'owner' order by created_at asc limit 1;
  end if;
  if v_coach is null then return '[]'::jsonb; end if;

  select client_today into v_layout from public.coach_prefs where coach_id = v_coach;
  return coalesce(v_layout, '[]'::jsonb);
end;
$$;

grant execute on function public.client_screen_layout() to authenticated;


-- ==================== 0017_client_screen_overrides.sql ====================
-- Total Form Fitness — per-client "Today" screen overrides (§4 coach-editable
-- everything, at the individual-client grain). The coach can tailor one client's
-- Today screen differently from the roster-wide default (coach_prefs.client_today
-- from migration 0016). A client with no override falls back to that default.
--
-- Idempotent: safe to re-run.

create table if not exists public.client_screen_overrides (
  client_id  uuid primary key references public.profiles (id) on delete cascade,
  layout     jsonb not null default '[]'::jsonb,   -- ordered [{id, visible}]
  updated_at timestamptz not null default now()
);

drop trigger if exists client_screen_overrides_touch on public.client_screen_overrides;
create trigger client_screen_overrides_touch before update on public.client_screen_overrides
  for each row execute function public.touch_updated_at();

alter table public.client_screen_overrides enable row level security;

-- The client's owning coach (active link) or the owner manages the override.
-- (The client themselves reads it only through client_screen_layout() below.)
drop policy if exists client_screen_overrides_rw on public.client_screen_overrides;
create policy client_screen_overrides_rw on public.client_screen_overrides
  for all using (
    public.is_owner()
    or exists (
      select 1 from public.coach_clients cc
      where cc.client_id = client_screen_overrides.client_id
        and cc.coach_id = auth.uid()
        and cc.status = 'active'
    )
  )
  with check (
    public.is_owner()
    or exists (
      select 1 from public.coach_clients cc
      where cc.client_id = client_screen_overrides.client_id
        and cc.coach_id = auth.uid()
        and cc.status = 'active'
    )
  );

grant select, insert, update, delete on public.client_screen_overrides to authenticated;

-- Re-define the client-facing resolver to prefer a per-client override, then fall
-- back to the coach's roster-wide default, then to an empty layout. SECURITY
-- DEFINER so a client reads only their own resolved layout, nothing else.
create or replace function public.client_screen_layout()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_coach uuid;
  v_layout jsonb;
begin
  if auth.uid() is null then return '[]'::jsonb; end if;

  -- Per-client override wins when it holds a non-empty layout.
  select layout into v_layout from public.client_screen_overrides where client_id = auth.uid();
  if v_layout is not null and jsonb_typeof(v_layout) = 'array' and jsonb_array_length(v_layout) > 0 then
    return v_layout;
  end if;

  -- Otherwise the coach's roster-wide default (their active coach, else the owner).
  select coach_id into v_coach
    from public.coach_clients
    where client_id = auth.uid() and status = 'active'
    limit 1;
  if v_coach is null then
    select id into v_coach from public.profiles where role = 'owner' order by created_at asc limit 1;
  end if;
  if v_coach is null then return '[]'::jsonb; end if;

  select client_today into v_layout from public.coach_prefs where coach_id = v_coach;
  return coalesce(v_layout, '[]'::jsonb);
end;
$$;

grant execute on function public.client_screen_layout() to authenticated;


-- ==================== 0018_body_photos.sql ====================
-- Total Form Fitness — Body progress photos (§C: "optional, opt-in progress
-- photos … private & encrypted"). A secondary Body add-on: the client uploads
-- photos to a PRIVATE bucket they own; their coach / the owner may view them
-- (consent to coach access is captured at sign-up, §8/§13). Served only via
-- short-lived signed URLs, never public. Idempotent.

create table if not exists public.body_photos (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null,
  taken_on     date not null default (now() at time zone 'utc')::date,
  note         text,
  created_at   timestamptz not null default now()
);
create index if not exists body_photos_client_idx on public.body_photos (client_id, taken_on desc);

alter table public.body_photos enable row level security;

-- The client manages their own photos; their coach + the owner may view.
drop policy if exists body_photos_select on public.body_photos;
create policy body_photos_select on public.body_photos
  for select to authenticated
  using (client_id = auth.uid() or public.is_owner() or public.is_coach_of(client_id));

drop policy if exists body_photos_insert on public.body_photos;
create policy body_photos_insert on public.body_photos
  for insert to authenticated
  with check (client_id = auth.uid());

drop policy if exists body_photos_delete on public.body_photos;
create policy body_photos_delete on public.body_photos
  for delete to authenticated
  using (client_id = auth.uid() or public.is_owner());

grant select, insert, update, delete on public.body_photos to authenticated;

-- Private bucket (signed URLs only).
insert into storage.buckets (id, name, public)
  values ('body-photos', 'body-photos', false)
  on conflict (id) do nothing;

-- A client can read/write only their own folder (path = "<uid>/<file>").
drop policy if exists "body_photos_own_write" on storage.objects;
create policy "body_photos_own_write" on storage.objects
  for all to authenticated
  using (bucket_id = 'body-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'body-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- The coach-of / owner can read a client's progress photos.
drop policy if exists "body_photos_coach_read" on storage.objects;
create policy "body_photos_coach_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'body-photos'
    and (
      public.is_owner()
      or public.is_coach_of(((storage.foldername(name))[1])::uuid)
    )
  );


-- ==================== 0019_content_images.sql ====================
-- Total Form Fitness — CMS editable images (§4 "every word and every image in
-- the app is editable by the coach"). Companion to the copy CMS (0014): the
-- owner uploads branding images (e.g. the logo) to a PUBLIC bucket, and the
-- public URL is stored as a content_overrides row keyed "image:<name>". No new
-- table — image overrides ride the existing content_overrides key/value store.
-- Idempotent.

-- Public bucket: these are app-wide branding assets shown to everyone, incl.
-- signed-out visitors on /login, so they're served by public URL (not signed).
insert into storage.buckets (id, name, public)
  values ('content-images', 'content-images', true)
  on conflict (id) do update set public = true;

-- Everyone may read (public branding); only the owner may write/replace/remove.
drop policy if exists "content_images_read" on storage.objects;
create policy "content_images_read" on storage.objects
  for select
  using (bucket_id = 'content-images');

drop policy if exists "content_images_owner_write" on storage.objects;
create policy "content_images_owner_write" on storage.objects
  for all to authenticated
  using (bucket_id = 'content-images' and public.is_owner())
  with check (bucket_id = 'content-images' and public.is_owner());


-- ==================== 0020_wearables.sql ====================
-- Total Form Fitness — wearable connections (§7 "auto-sync via cloud APIs only:
-- Oura, Fitbit, Garmin, Whoop — OAuth 'Connect your tracker'"). One row per
-- (client, provider) holds the OAuth tokens used to pull steps/sleep. Tokens are
-- SECRETS: only the owning client may touch this row (the sync runs under the
-- service role, which bypasses RLS) — coaches/owner never read a client's
-- tokens. Idempotent.

do $$ begin
  create type public.wearable_provider as enum ('oura', 'fitbit', 'garmin', 'whoop');
exception when duplicate_object then null; end $$;

create table if not exists public.wearable_connections (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid not null references public.profiles (id) on delete cascade,
  provider         public.wearable_provider not null,
  status           text not null default 'connected',  -- connected | revoked
  access_token     text,
  refresh_token    text,
  scope            text,
  external_user_id text,
  expires_at       timestamptz,
  last_synced_at   timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (client_id, provider)
);
create index if not exists wearable_conn_client_idx on public.wearable_connections (client_id);

drop trigger if exists wearable_conn_touch on public.wearable_connections;
create trigger wearable_conn_touch before update on public.wearable_connections
  for each row execute function public.touch_updated_at();

alter table public.wearable_connections enable row level security;

-- Client-only: the owner of the row reads/writes it; nobody else (tokens are
-- secrets). The background sync uses the service role, which bypasses RLS.
drop policy if exists wearable_conn_rw on public.wearable_connections;
create policy wearable_conn_rw on public.wearable_connections
  for all to authenticated
  using (client_id = auth.uid())
  with check (client_id = auth.uid());

grant select, insert, update, delete on public.wearable_connections to authenticated;


-- ==================== 0021_weekly_reports.sql ====================
-- Total Form Fitness — weekly report scheduling (§12 "Weekly (default), in-app +
-- a notification"). One dedup column on engagement_state so the daily sweep
-- fires each client's weekly recap notification at most once per week. Idempotent.

alter table public.engagement_state add column if not exists last_report_on date;


-- ==================== 0022_wearable_daily.sql ====================
-- Total Form Fitness — synced wearable daily metrics (§7 "pull steps/sleep/HR").
-- The background sync writes one row per (client, provider, day). Unlike the
-- tokens table (client-only), these metrics are health data the coach steers, so
-- the client's coach + owner may read them (consent captured at sign-up). The
-- sync itself writes under the service role (bypasses RLS). Idempotent.

create table if not exists public.wearable_daily (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.profiles (id) on delete cascade,
  provider      public.wearable_provider not null,
  day           date not null,
  steps         integer,
  sleep_minutes integer,
  resting_hr    integer,
  updated_at    timestamptz not null default now(),
  unique (client_id, provider, day)
);
create index if not exists wearable_daily_client_day_idx on public.wearable_daily (client_id, day desc);

drop trigger if exists wearable_daily_touch on public.wearable_daily;
create trigger wearable_daily_touch before update on public.wearable_daily
  for each row execute function public.touch_updated_at();

alter table public.wearable_daily enable row level security;

-- The client manages their own metrics; their coach + the owner may read them.
drop policy if exists wearable_daily_select on public.wearable_daily;
create policy wearable_daily_select on public.wearable_daily
  for select to authenticated
  using (client_id = auth.uid() or public.is_owner() or public.is_coach_of(client_id));

drop policy if exists wearable_daily_write on public.wearable_daily;
create policy wearable_daily_write on public.wearable_daily
  for all to authenticated
  using (client_id = auth.uid())
  with check (client_id = auth.uid());

grant select, insert, update, delete on public.wearable_daily to authenticated;


-- ==================== 0023_client_strictness.sql ====================
-- Total Form Fitness — per-client nutrition strictness (§B "per-client strictness
-- setting, coach-controlled"): precise macros / protein+calories / flexible
-- ranges / habits-only. Stored on the client profile so it survives target
-- recalcs; the coach writes it (client_profiles_write already permits is_coach_of).
-- Idempotent.
alter table public.client_profiles add column if not exists strictness text not null default 'precise';


-- ==================== 0024_delete_client_rpc.sql ====================
-- Total Form Fitness — delete a client without needing the service-role key.
-- A SECURITY DEFINER function (runs with elevated rights) deletes the client's
-- auth user, which cascades to their profile and all their data. Authorized:
-- only the client's own coach or the owner may call it. Idempotent.

create or replace function public.delete_client(p_client uuid)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if p_client is null then
    raise exception 'delete_client: missing client id';
  end if;
  if not (public.is_owner() or public.is_coach_of(p_client)) then
    raise exception 'delete_client: not authorized';
  end if;
  -- Cascades: auth.users -> public.profiles -> all of the client's rows.
  delete from auth.users where id = p_client;
end;
$$;

revoke all on function public.delete_client(uuid) from public, anon;
grant execute on function public.delete_client(uuid) to authenticated;

-- Tell Supabase's API to pick up the new function right away.
notify pgrst, 'reload schema';


-- ==================== 0025_diet_prefs.sql ====================
-- Total Form Fitness — dietary pattern + food preferences (client-customizable;
-- filters food recommendations). diet_pattern is the eating style (vegan,
-- vegetarian, pescatarian, mediterranean, carnivore, or anything); food_avoid is
-- a free-text list of ingredients to keep out of suggestions. Coach or client can
-- set them (client_profiles_write already permits both). Idempotent.
alter table public.client_profiles add column if not exists diet_pattern text not null default 'anything';
alter table public.client_profiles add column if not exists food_avoid text not null default '';


-- ==================== 0026_lifts.sql ====================
-- Total Form Fitness — Lift progress log (owner decision, 2026: track strength
-- progress). A simple, spreadsheet-style record: one row per logged set —
-- exercise, weight, reps, sets, unit, date, optional note. RLS mirrors body
-- data: the client owns their log; their coach + the owner may read it (consent
-- captured at sign-up, §8/§13). Idempotent.

create table if not exists public.lift_logs (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references public.profiles (id) on delete cascade,
  log_date   date not null default (now() at time zone 'utc')::date,
  exercise   text not null check (length(btrim(exercise)) > 0),
  weight     numeric not null default 0 check (weight >= 0 and weight <= 5000),
  unit       text not null default 'lb' check (unit in ('lb','kg')),
  reps       integer not null default 1 check (reps >= 0 and reps <= 1000),
  sets       integer not null default 1 check (sets >= 1 and sets <= 100),
  note       text,
  created_at timestamptz not null default now()
);
create index if not exists lift_logs_client_idx on public.lift_logs (client_id, log_date desc);
create index if not exists lift_logs_exercise_idx on public.lift_logs (client_id, exercise, log_date desc);

alter table public.lift_logs enable row level security;

-- The client manages their own lifts; their coach + the owner may view.
drop policy if exists lift_logs_select on public.lift_logs;
create policy lift_logs_select on public.lift_logs
  for select to authenticated
  using (client_id = auth.uid() or public.is_owner() or public.is_coach_of(client_id));

drop policy if exists lift_logs_insert on public.lift_logs;
create policy lift_logs_insert on public.lift_logs
  for insert to authenticated
  with check (client_id = auth.uid());

drop policy if exists lift_logs_update on public.lift_logs;
create policy lift_logs_update on public.lift_logs
  for update to authenticated
  using (client_id = auth.uid())
  with check (client_id = auth.uid());

drop policy if exists lift_logs_delete on public.lift_logs;
create policy lift_logs_delete on public.lift_logs
  for delete to authenticated
  using (client_id = auth.uid() or public.is_owner());

grant select, insert, update, delete on public.lift_logs to authenticated;


notify pgrst, 'reload schema';
