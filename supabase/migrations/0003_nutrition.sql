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
