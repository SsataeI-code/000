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
