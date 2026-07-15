-- Total Form Fitness — Phase 0 seed / owner bootstrap.
--
-- The owner (super-admin coach) must exist so open public sign-ups have a home
-- (§8) and so RLS "owner sees all" has a subject. You create the owner in two
-- steps because auth users are minted by Supabase Auth, not by raw SQL:
--
--   1. Sign up / invite the owner's email through Supabase Auth (Dashboard →
--      Authentication → Users → Add user, or the normal /signup screen).
--   2. Run:  select public.promote_to_owner('owner@example.com');
--
-- This promotes that user to role 'owner' and gives them a coach record with a
-- generated coach_code. Idempotent — safe to run more than once.

create or replace function public.promote_to_owner(p_email text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid  uuid;
  v_code text;
begin
  select id into v_uid from auth.users where lower(email) = lower(p_email);
  if v_uid is null then
    raise exception 'no auth user with email %, sign them up first', p_email;
  end if;

  insert into public.profiles (id, role)
    values (v_uid, 'owner')
    on conflict (id) do update set role = 'owner';

  -- Generate a code from the safe alphabet if the owner has no coach row yet.
  select coach_code into v_code from public.coaches where id = v_uid;
  if v_code is null then
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    v_code := translate(v_code, 'OIL01', 'PQRST');  -- drop ambiguous glyphs
    insert into public.coaches (id, coach_code) values (v_uid, v_code);
  end if;

  return v_code;
end;
$$;

-- Provision an additional coach under the owner (multi-coach from day one).
--   select public.provision_coach('coach@example.com');
create or replace function public.provision_coach(p_email text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid  uuid;
  v_code text;
begin
  select id into v_uid from auth.users where lower(email) = lower(p_email);
  if v_uid is null then
    raise exception 'no auth user with email %, sign them up first', p_email;
  end if;

  insert into public.profiles (id, role)
    values (v_uid, 'coach')
    on conflict (id) do update set role = 'coach';

  select coach_code into v_code from public.coaches where id = v_uid;
  if v_code is null then
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    v_code := translate(v_code, 'OIL01', 'PQRST');
    insert into public.coaches (id, coach_code) values (v_uid, v_code);
  end if;

  return v_code;
end;
$$;
