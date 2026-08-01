-- Total Form Fitness — wearable connections (§7 "auto-sync via cloud APIs only:
-- Oura, Fitbit, Garmin, Whoop — OAuth 'Connect your tracker'"). One row per
-- (client, provider) holds the OAuth tokens used to pull steps/sleep. Tokens are
-- SECRETS: only the owning client may touch this row (the sync runs under the
-- service role, which bypasses RLS) — coaches/owner never read a client's
-- tokens. Idempotent.

do $$ begin
  create type public.wearable_provider as enum ('oura', 'fitbit', 'garmin', 'whoop');
exception when duplicate_object then null; end $$;

create table if not exists public.wearable_connections (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid not null references public.profiles (id) on delete cascade,
  provider         public.wearable_provider not null,
  status           text not null default 'connected',  -- connected | revoked
  access_token     text,
  refresh_token    text,
  scope            text,
  external_user_id text,
  expires_at       timestamptz,
  last_synced_at   timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (client_id, provider)
);
create index if not exists wearable_conn_client_idx on public.wearable_connections (client_id);

drop trigger if exists wearable_conn_touch on public.wearable_connections;
create trigger wearable_conn_touch before update on public.wearable_connections
  for each row execute function public.touch_updated_at();

alter table public.wearable_connections enable row level security;

-- Client-only: the owner of the row reads/writes it; nobody else (tokens are
-- secrets). The background sync uses the service role, which bypasses RLS.
drop policy if exists wearable_conn_rw on public.wearable_connections;
create policy wearable_conn_rw on public.wearable_connections
  for all to authenticated
  using (client_id = auth.uid())
  with check (client_id = auth.uid());

grant select, insert, update, delete on public.wearable_connections to authenticated;
