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
