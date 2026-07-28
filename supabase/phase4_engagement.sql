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
