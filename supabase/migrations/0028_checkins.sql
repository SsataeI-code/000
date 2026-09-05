-- Total Form Fitness — Weekly check-in (§ accountability ritual). One structured
-- check-in per client per week: morning weight, an energy rating, one win, and
-- one thing to work on. The coach reads them to steer. Weight also flows into
-- body_measurements (the trend's single source). Idempotent.

create table if not exists public.check_ins (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.profiles (id) on delete cascade,
  week_start  date not null,                 -- Monday of the client's local week
  weight_kg   numeric,
  energy      int check (energy between 1 and 5),
  win         text,
  focus       text,                          -- one thing to work on
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (client_id, week_start)             -- one check-in per week (upsert)
);
create index if not exists check_ins_client_idx on public.check_ins (client_id, week_start desc);

drop trigger if exists check_ins_touch on public.check_ins;
create trigger check_ins_touch before update on public.check_ins
  for each row execute function public.touch_updated_at();

alter table public.check_ins enable row level security;

drop policy if exists check_ins_select on public.check_ins;
create policy check_ins_select on public.check_ins
  for select to authenticated
  using (client_id = auth.uid() or public.is_owner() or public.is_coach_of(client_id));

drop policy if exists check_ins_write on public.check_ins;
create policy check_ins_write on public.check_ins
  for all to authenticated
  using (client_id = auth.uid())
  with check (client_id = auth.uid());

grant select, insert, update, delete on public.check_ins to authenticated;
