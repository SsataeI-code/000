-- Total Form Fitness — quiet hours (§10 "Client can set quiet hours").
-- Stored on the client's profile as minutes-of-day plus their IANA timezone (so
-- the server can tell whether it's currently quiet for them). Null start/end
-- means "no quiet hours". Suppresses the push buzz only — the in-app
-- notification is still recorded so nothing is lost.
--
-- Idempotent: safe to re-run.

alter table public.client_profiles add column if not exists quiet_start smallint
  check (quiet_start is null or quiet_start between 0 and 1439);
alter table public.client_profiles add column if not exists quiet_end smallint
  check (quiet_end is null or quiet_end between 0 and 1439);
alter table public.client_profiles add column if not exists timezone text;

comment on column public.client_profiles.quiet_start is 'Quiet-hours start, minutes past local midnight (§10). Null = off.';
comment on column public.client_profiles.quiet_end is 'Quiet-hours end, minutes past local midnight (§10). Null = off.';
comment on column public.client_profiles.timezone is 'IANA timezone for evaluating quiet hours server-side.';
