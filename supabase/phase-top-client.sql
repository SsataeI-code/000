-- Total Form Fitness — "#1 client" flag (owner: the top client by game level
-- should get that recognition as part of their level). The level is derived in
-- TypeScript from a client's own logs, so ranking the roster can't be done in
-- SQL without duplicating that logic; instead the daily engagement sweep (which
-- already runs under the service role and can read every client) computes each
-- client's level, picks the #1 per coach, and stamps this flag. A client reads
-- their own flag under the existing client_profiles RLS, so their level HUD can
-- show the crown; their coach/owner can read it too. Idempotent.

alter table public.client_profiles
  add column if not exists is_top_client boolean not null default false;

comment on column public.client_profiles.is_top_client is
  'Set by the daily sweep: this client is currently #1 by game level for their coach.';
