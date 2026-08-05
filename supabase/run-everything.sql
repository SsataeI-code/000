-- Total Form Fitness — run-everything: all feature setup in one file.
-- Paste the WHOLE thing into Supabase → SQL Editor → Run. Every part is
-- idempotent, so it's safe even if some were already applied.

-- ==================== phase3_coach_prefs.sql ====================
-- Total Form Fitness — Phase 3: coach dashboard preferences (§9 "the dashboard
-- is open-ended and editable — the coach arranges, adds, and edits the tiles").
-- One row per coach holds their dashboard tile layout as JSON. Idempotent, same
-- conventions as earlier migrations. Multi-coach-safe: keyed per coach, RLS
-- scopes each coach to their own row (owner sees all).

create table if not exists public.coach_prefs (
  coach_id   uuid primary key references public.profiles (id) on delete cascade,
  dashboard  jsonb not null default '[]'::jsonb,   -- ordered [{id, visible}]
  updated_at timestamptz not null default now()
);

drop trigger if exists coach_prefs_touch on public.coach_prefs;
create trigger coach_prefs_touch before update on public.coach_prefs
  for each row execute function public.touch_updated_at();

alter table public.coach_prefs enable row level security;

-- Each coach reads/writes only their own prefs; the owner may see all.
drop policy if exists coach_prefs_rw on public.coach_prefs;
create policy coach_prefs_rw on public.coach_prefs
  for all using (coach_id = auth.uid() or public.is_owner())
  with check (coach_id = auth.uid() or public.is_owner());

grant select, insert, update, delete on public.coach_prefs to authenticated;

-- ==================== phase4_messages.sql ====================
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

-- ==================== phase4_notifications.sql ====================
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

-- ==================== phase4_engagement.sql ====================
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

-- ==================== phase4_push.sql ====================
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

-- ==================== phase4_quiet_hours.sql ====================
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

-- ==================== phase6_referrals.sql ====================
-- Total Form Fitness — Phase 6 (Growth): referrals (§8).
-- A client shares a personal link; a new sign-up on that link is tracked, and
-- the referral surfaces to the coach, who PROCESSES the reward (10% is only a
-- default — the coach controls or waives any discount). Self-referral is
-- prevented. Money lives outside the app, so the "reward" here is a status the
-- coach tracks, not an in-app charge.
--
-- Idempotent: safe to re-run.

-- ---------------------------------------------------------------------------
-- Referral code on every profile (shareable, unambiguous, uppercase).
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists referral_code text;

create unique index if not exists profiles_referral_code_key
  on public.profiles (referral_code)
  where referral_code is not null;

-- Generate a fresh, collision-checked referral code. Same safe alphabet as
-- coach codes (no 0/O/1/I/L); 7 chars to distinguish from 6-char coach codes.
create or replace function public.gen_referral_code()
returns text
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code text;
  i int;
begin
  loop
    code := '';
    for i in 1..7 loop
      code := code || substr(alphabet, floor(random() * length(alphabet))::int + 1, 1);
    end loop;
    exit when not exists (select 1 from public.profiles where referral_code = code);
  end loop;
  return code;
end;
$$;

-- Backfill existing profiles (one code each; loop so each gets a unique value).
do $$
declare r record;
begin
  for r in select id from public.profiles where referral_code is null loop
    update public.profiles set referral_code = public.gen_referral_code() where id = r.id;
  end loop;
end $$;

-- Return the caller's code, minting one on first use.
create or replace function public.ensure_referral_code()
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v text;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select referral_code into v from public.profiles where id = auth.uid();
  if v is null then
    v := public.gen_referral_code();
    update public.profiles set referral_code = v where id = auth.uid();
  end if;
  return v;
end;
$$;

-- ---------------------------------------------------------------------------
-- referrals — one row per referred sign-up. status is the coach's workflow.
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.referral_status as enum ('joined', 'rewarded', 'declined');
exception when duplicate_object then null;
end $$;

create table if not exists public.referrals (
  id           uuid primary key default gen_random_uuid(),
  referrer_id  uuid not null references public.profiles (id) on delete cascade,
  referred_id  uuid not null unique references public.profiles (id) on delete cascade,
  coach_id     uuid not null references public.coaches (id) on delete cascade,
  status       public.referral_status not null default 'joined',
  reward_note  text,
  created_at   timestamptz not null default now(),
  processed_at timestamptz,
  constraint referrals_no_self check (referrer_id <> referred_id)
);

create index if not exists referrals_referrer_idx on public.referrals (referrer_id);
create index if not exists referrals_coach_idx on public.referrals (coach_id);

comment on table public.referrals is 'Referred sign-ups (§8). Coach processes the reward; 10% is a default, not automatic.';

-- ---------------------------------------------------------------------------
-- Coach processes a referral (reward or waive). SECURITY DEFINER so only the
-- status/note can change, and only by the owning coach or the owner.
-- ---------------------------------------------------------------------------
create or replace function public.process_referral(
  p_id     uuid,
  p_status public.referral_status,
  p_note   text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_coach uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if p_status not in ('rewarded', 'declined') then raise exception 'invalid status'; end if;
  select coach_id into v_coach from public.referrals where id = p_id;
  if v_coach is null then raise exception 'referral not found'; end if;
  if not (v_coach = auth.uid() or public.is_owner()) then raise exception 'not authorized'; end if;
  update public.referrals
    set status = p_status, reward_note = nullif(trim(coalesce(p_note, '')), ''), processed_at = now()
    where id = p_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- resolve_signup — now records the referral (never self), setting referred_by
-- and creating the referrals row atomically with the coach link. Still
-- idempotent (returns early if the client is already linked).
-- ---------------------------------------------------------------------------
create or replace function public.resolve_signup(
  p_coach_code    text default null,
  p_consent       boolean default false,
  p_referral_code text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid      uuid := auth.uid();
  v_coach_id uuid;
  v_referrer uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_consent is not true then raise exception 'consent required'; end if;

  -- Already linked? Return the existing coach (idempotent).
  select coach_id into v_coach_id
    from public.coach_clients
    where client_id = v_uid and status = 'active'
    limit 1;
  if v_coach_id is not null then
    return v_coach_id;
  end if;

  -- Resolve the target coach (by code, else the owner for open sign-ups).
  if p_coach_code is not null and length(trim(p_coach_code)) > 0 then
    select id into v_coach_id from public.coaches where coach_code = upper(trim(p_coach_code));
    if v_coach_id is null then raise exception 'unknown coach code'; end if;
  else
    select c.id into v_coach_id
      from public.coaches c
      join public.profiles p on p.id = c.id
      where p.role = 'owner'
      order by c.created_at asc
      limit 1;
    if v_coach_id is null then raise exception 'no owner configured to receive open sign-ups'; end if;
  end if;

  -- Resolve the referrer (optional; never yourself).
  if p_referral_code is not null and length(trim(p_referral_code)) > 0 then
    select id into v_referrer from public.profiles where referral_code = upper(trim(p_referral_code));
    if v_referrer = v_uid then v_referrer := null; end if;
  end if;

  -- Never demote an existing owner/coach who happens to call this.
  update public.profiles set role = 'client' where id = v_uid and role not in ('owner', 'coach');

  insert into public.coach_clients (coach_id, client_id, consent_given_at, referred_by)
    values (v_coach_id, v_uid, now(), v_referrer)
    on conflict do nothing;

  if v_referrer is not null then
    insert into public.referrals (referrer_id, referred_id, coach_id, status)
      values (v_referrer, v_uid, v_coach_id, 'joined')
      on conflict (referred_id) do nothing;
  end if;

  return v_coach_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- handle_new_user — mint a referral code the moment the profile is created.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, display_name, referral_code)
    values (
      new.id,
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      public.gen_referral_code()
    )
    on conflict (id) do nothing;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS + grants
-- ---------------------------------------------------------------------------
alter table public.referrals enable row level security;

-- A referrer sees their own referrals; the coach sees referrals to their
-- roster; the owner sees all. Inserts happen only via resolve_signup
-- (SECURITY DEFINER), so there is deliberately no insert policy.
drop policy if exists referrals_select on public.referrals;
create policy referrals_select on public.referrals
  for select using (
    referrer_id = auth.uid()
    or coach_id = auth.uid()
    or public.is_owner()
  );

grant select on public.referrals to authenticated;
grant execute on function public.ensure_referral_code() to authenticated;
grant execute on function public.process_referral(uuid, public.referral_status, text) to authenticated;

-- ==================== phase6_content.sql ====================
-- Total Form Fitness — Phase 6 (Growth): full CMS content overrides (§4, §16).
-- Every user-facing string ships with a house-style default in code; this table
-- lets the owner override any of them without a code change. Overrides are
-- global app copy (not secret), so anyone — including signed-out visitors on the
-- login/signup screens — may READ them; only the owner may WRITE.
--
-- Multi-coach note: v1 is a single global copy set edited by the owner. The
-- resolver reads this table wholesale; per-coach copy can layer on later without
-- reshaping call sites (they already pass an overrides map).
--
-- Idempotent: safe to re-run.

create table if not exists public.content_overrides (
  key        text primary key,
  value      text not null,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

comment on table public.content_overrides is 'CMS copy overrides (§4). Owner-editable; house-style defaults live in code.';

drop trigger if exists content_overrides_touch on public.content_overrides;
create trigger content_overrides_touch
  before update on public.content_overrides
  for each row execute function public.touch_updated_at();

alter table public.content_overrides enable row level security;

-- Read: everyone (incl. anon) — it's app copy shown on public screens.
drop policy if exists content_select on public.content_overrides;
create policy content_select on public.content_overrides
  for select using (true);

-- Write: owner only.
drop policy if exists content_insert on public.content_overrides;
create policy content_insert on public.content_overrides
  for insert with check (public.is_owner());

drop policy if exists content_update on public.content_overrides;
create policy content_update on public.content_overrides
  for update using (public.is_owner()) with check (public.is_owner());

drop policy if exists content_delete on public.content_overrides;
create policy content_delete on public.content_overrides
  for delete using (public.is_owner());

grant select on public.content_overrides to anon, authenticated;
grant insert, update, delete on public.content_overrides to authenticated;

-- ==================== phase6_content_images.sql ====================
-- Total Form Fitness — CMS editable images (§4 "every word and every image in
-- the app is editable by the coach"). Companion to the copy CMS (0014): the
-- owner uploads branding images (e.g. the logo) to a PUBLIC bucket, and the
-- public URL is stored as a content_overrides row keyed "image:<name>". No new
-- table — image overrides ride the existing content_overrides key/value store.
-- Idempotent.

-- Public bucket: these are app-wide branding assets shown to everyone, incl.
-- signed-out visitors on /login, so they're served by public URL (not signed).
insert into storage.buckets (id, name, public)
  values ('content-images', 'content-images', true)
  on conflict (id) do update set public = true;

-- Everyone may read (public branding); only the owner may write/replace/remove.
drop policy if exists "content_images_read" on storage.objects;
create policy "content_images_read" on storage.objects
  for select
  using (bucket_id = 'content-images');

drop policy if exists "content_images_owner_write" on storage.objects;
create policy "content_images_owner_write" on storage.objects
  for all to authenticated
  using (bucket_id = 'content-images' and public.is_owner())
  with check (bucket_id = 'content-images' and public.is_owner());

-- ==================== phase6_client_screen.sql ====================
-- Total Form Fitness — coach-configurable client "Today" screen (§4 "coach-
-- editable everything"; §9 configurable, applied to the client side). The coach
-- arranges/shows/hides the sections their clients see on Today. Stored per coach
-- on coach_prefs alongside the dashboard layout.
--
-- A client must be able to READ their own coach's client-screen layout, but not
-- the rest of that coach's prefs — so it's exposed through a SECURITY DEFINER
-- function that resolves the caller's coach and returns just the layout.
--
-- Idempotent: safe to re-run.

alter table public.coach_prefs add column if not exists client_today jsonb not null default '[]'::jsonb;

comment on column public.coach_prefs.client_today is 'Ordered [{id,visible}] sections for the client Today screen (§4).';

-- Return the caller's coach's client-screen layout (their active coach, else the
-- owner). Only the layout is exposed — never the full prefs row.
create or replace function public.client_screen_layout()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_coach uuid;
  v_layout jsonb;
begin
  if auth.uid() is null then return '[]'::jsonb; end if;

  select coach_id into v_coach
    from public.coach_clients
    where client_id = auth.uid() and status = 'active'
    limit 1;

  if v_coach is null then
    select id into v_coach from public.profiles where role = 'owner' order by created_at asc limit 1;
  end if;
  if v_coach is null then return '[]'::jsonb; end if;

  select client_today into v_layout from public.coach_prefs where coach_id = v_coach;
  return coalesce(v_layout, '[]'::jsonb);
end;
$$;

grant execute on function public.client_screen_layout() to authenticated;

-- ==================== phase6_client_screen_overrides.sql ====================
-- Total Form Fitness — per-client "Today" screen overrides (§4 coach-editable
-- everything, at the individual-client grain). The coach can tailor one client's
-- Today screen differently from the roster-wide default (coach_prefs.client_today
-- from migration 0016). A client with no override falls back to that default.
--
-- Idempotent: safe to re-run.

create table if not exists public.client_screen_overrides (
  client_id  uuid primary key references public.profiles (id) on delete cascade,
  layout     jsonb not null default '[]'::jsonb,   -- ordered [{id, visible}]
  updated_at timestamptz not null default now()
);

drop trigger if exists client_screen_overrides_touch on public.client_screen_overrides;
create trigger client_screen_overrides_touch before update on public.client_screen_overrides
  for each row execute function public.touch_updated_at();

alter table public.client_screen_overrides enable row level security;

-- The client's owning coach (active link) or the owner manages the override.
-- (The client themselves reads it only through client_screen_layout() below.)
drop policy if exists client_screen_overrides_rw on public.client_screen_overrides;
create policy client_screen_overrides_rw on public.client_screen_overrides
  for all using (
    public.is_owner()
    or exists (
      select 1 from public.coach_clients cc
      where cc.client_id = client_screen_overrides.client_id
        and cc.coach_id = auth.uid()
        and cc.status = 'active'
    )
  )
  with check (
    public.is_owner()
    or exists (
      select 1 from public.coach_clients cc
      where cc.client_id = client_screen_overrides.client_id
        and cc.coach_id = auth.uid()
        and cc.status = 'active'
    )
  );

grant select, insert, update, delete on public.client_screen_overrides to authenticated;

-- Re-define the client-facing resolver to prefer a per-client override, then fall
-- back to the coach's roster-wide default, then to an empty layout. SECURITY
-- DEFINER so a client reads only their own resolved layout, nothing else.
create or replace function public.client_screen_layout()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_coach uuid;
  v_layout jsonb;
begin
  if auth.uid() is null then return '[]'::jsonb; end if;

  -- Per-client override wins when it holds a non-empty layout.
  select layout into v_layout from public.client_screen_overrides where client_id = auth.uid();
  if v_layout is not null and jsonb_typeof(v_layout) = 'array' and jsonb_array_length(v_layout) > 0 then
    return v_layout;
  end if;

  -- Otherwise the coach's roster-wide default (their active coach, else the owner).
  select coach_id into v_coach
    from public.coach_clients
    where client_id = auth.uid() and status = 'active'
    limit 1;
  if v_coach is null then
    select id into v_coach from public.profiles where role = 'owner' order by created_at asc limit 1;
  end if;
  if v_coach is null then return '[]'::jsonb; end if;

  select client_today into v_layout from public.coach_prefs where coach_id = v_coach;
  return coalesce(v_layout, '[]'::jsonb);
end;
$$;

grant execute on function public.client_screen_layout() to authenticated;

-- ==================== phase2_body_photos.sql ====================
-- Total Form Fitness — Body progress photos (§C: "optional, opt-in progress
-- photos … private & encrypted"). A secondary Body add-on: the client uploads
-- photos to a PRIVATE bucket they own; their coach / the owner may view them
-- (consent to coach access is captured at sign-up, §8/§13). Served only via
-- short-lived signed URLs, never public. Idempotent.

create table if not exists public.body_photos (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null,
  taken_on     date not null default (now() at time zone 'utc')::date,
  note         text,
  created_at   timestamptz not null default now()
);
create index if not exists body_photos_client_idx on public.body_photos (client_id, taken_on desc);

alter table public.body_photos enable row level security;

-- The client manages their own photos; their coach + the owner may view.
drop policy if exists body_photos_select on public.body_photos;
create policy body_photos_select on public.body_photos
  for select to authenticated
  using (client_id = auth.uid() or public.is_owner() or public.is_coach_of(client_id));

drop policy if exists body_photos_insert on public.body_photos;
create policy body_photos_insert on public.body_photos
  for insert to authenticated
  with check (client_id = auth.uid());

drop policy if exists body_photos_delete on public.body_photos;
create policy body_photos_delete on public.body_photos
  for delete to authenticated
  using (client_id = auth.uid() or public.is_owner());

grant select, insert, update, delete on public.body_photos to authenticated;

-- Private bucket (signed URLs only).
insert into storage.buckets (id, name, public)
  values ('body-photos', 'body-photos', false)
  on conflict (id) do nothing;

-- A client can read/write only their own folder (path = "<uid>/<file>").
drop policy if exists "body_photos_own_write" on storage.objects;
create policy "body_photos_own_write" on storage.objects
  for all to authenticated
  using (bucket_id = 'body-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'body-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- The coach-of / owner can read a client's progress photos.
drop policy if exists "body_photos_coach_read" on storage.objects;
create policy "body_photos_coach_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'body-photos'
    and (
      public.is_owner()
      or public.is_coach_of(((storage.foldername(name))[1])::uuid)
    )
  );

-- ==================== phase7_weekly_reports.sql ====================
-- Total Form Fitness — weekly report scheduling (§12 "Weekly (default), in-app +
-- a notification"). One dedup column on engagement_state so the daily sweep
-- fires each client's weekly recap notification at most once per week. Idempotent.

alter table public.engagement_state add column if not exists last_report_on date;

-- ==================== phase7_wearables.sql ====================
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

-- ==================== phase7_wearable_daily.sql ====================
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

-- ==================== phase-strictness.sql ====================
-- Total Form Fitness — per-client nutrition strictness (§B "per-client strictness
-- setting, coach-controlled"): precise macros / protein+calories / flexible
-- ranges / habits-only. Stored on the client profile so it survives target
-- recalcs; the coach writes it (client_profiles_write already permits is_coach_of).
-- Idempotent.
alter table public.client_profiles add column if not exists strictness text not null default 'precise';

-- ==================== phase-delete-client.sql ====================
-- Total Form Fitness — delete a client without needing the service-role key.
-- A SECURITY DEFINER function (runs with elevated rights) deletes the client's
-- auth user, which cascades to their profile and all their data. Authorized:
-- only the client's own coach or the owner may call it. Idempotent.

create or replace function public.delete_client(p_client uuid)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if p_client is null then
    raise exception 'delete_client: missing client id';
  end if;
  if not (public.is_owner() or public.is_coach_of(p_client)) then
    raise exception 'delete_client: not authorized';
  end if;
  -- Cascades: auth.users -> public.profiles -> all of the client's rows.
  delete from auth.users where id = p_client;
end;
$$;

revoke all on function public.delete_client(uuid) from public, anon;
grant execute on function public.delete_client(uuid) to authenticated;

-- Tell Supabase's API to pick up the new function right away.
notify pgrst, 'reload schema';

