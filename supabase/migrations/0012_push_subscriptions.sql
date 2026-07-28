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
