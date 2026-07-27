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
