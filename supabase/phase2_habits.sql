-- Total Form Fitness — Phase 2 habits engine. Paste into Supabase SQL Editor and Run once (safe to re-run).

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
