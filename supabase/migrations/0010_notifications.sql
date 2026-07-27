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
