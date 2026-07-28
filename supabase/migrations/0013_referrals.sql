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
