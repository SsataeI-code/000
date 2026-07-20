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
