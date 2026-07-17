-- Total Form Fitness — Phase 0 access control.
-- Helper functions are SECURITY DEFINER so RLS policies can call them without
-- recursively triggering RLS on the same tables (a classic Postgres RLS trap).

-- ---------------------------------------------------------------------------
-- Role helpers
-- ---------------------------------------------------------------------------
create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(public.current_app_role() = 'owner', false);
$$;

-- Is the caller the active coach of p_client?
create or replace function public.is_coach_of(p_client uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.coach_clients
    where client_id = p_client
      and coach_id = auth.uid()
      and status = 'active'
  );
$$;

-- ---------------------------------------------------------------------------
-- resolve_signup — links a freshly-signed-up client to a coach (by code) or to
-- the owner for open public sign-ups, recording consent atomically (§8).
-- Idempotent: safe to call again from the email-confirmation callback.
-- ---------------------------------------------------------------------------
create or replace function public.resolve_signup(
  p_coach_code   text default null,
  p_consent      boolean default false,
  p_referral_code text default null  -- reserved for Phase 6 referrals
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid      uuid := auth.uid();
  v_coach_id uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if p_consent is not true then
    raise exception 'consent required';
  end if;

  -- Already linked? Return the existing coach (idempotent).
  select coach_id into v_coach_id
    from public.coach_clients
    where client_id = v_uid and status = 'active'
    limit 1;
  if v_coach_id is not null then
    return v_coach_id;
  end if;

  -- Resolve the target coach.
  if p_coach_code is not null and length(trim(p_coach_code)) > 0 then
    select id into v_coach_id
      from public.coaches
      where coach_code = upper(trim(p_coach_code));
    if v_coach_id is null then
      raise exception 'unknown coach code';
    end if;
  else
    -- Open public sign-up lands with the owner (§8).
    select c.id into v_coach_id
      from public.coaches c
      join public.profiles p on p.id = c.id
      where p.role = 'owner'
      order by c.created_at asc
      limit 1;
    if v_coach_id is null then
      raise exception 'no owner configured to receive open sign-ups';
    end if;
  end if;

  -- Never demote an existing owner/coach who happens to call this.
  update public.profiles
    set role = 'client'
    where id = v_uid and role not in ('owner', 'coach');

  insert into public.coach_clients (coach_id, client_id, consent_given_at)
    values (v_coach_id, v_uid, now())
    on conflict do nothing;

  return v_coach_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- handle_new_user — create the profile row the moment an auth user is created.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, display_name)
    values (new.id, nullif(new.raw_user_meta_data ->> 'display_name', ''))
    on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.coaches       enable row level security;
alter table public.coach_clients enable row level security;

-- profiles: a user sees itself; a coach sees its clients; the owner sees all.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (
    id = auth.uid()
    or public.is_owner()
    or public.is_coach_of(id)
  );

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update using (id = auth.uid() or public.is_owner())
  with check (id = auth.uid() or public.is_owner());

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
  for insert with check (id = auth.uid());

-- coaches: coach sees own row; the owner sees all; a client sees their coach.
drop policy if exists coaches_select on public.coaches;
create policy coaches_select on public.coaches
  for select using (
    id = auth.uid()
    or public.is_owner()
    or exists (
      select 1 from public.coach_clients cc
      where cc.coach_id = coaches.id
        and cc.client_id = auth.uid()
        and cc.status = 'active'
    )
  );

drop policy if exists coaches_insert on public.coaches;
create policy coaches_insert on public.coaches
  for insert with check (public.is_owner());

drop policy if exists coaches_update on public.coaches;
create policy coaches_update on public.coaches
  for update using (id = auth.uid() or public.is_owner())
  with check (id = auth.uid() or public.is_owner());

-- coach_clients: client sees its links; coach sees its roster; owner sees all.
drop policy if exists coach_clients_select on public.coach_clients;
create policy coach_clients_select on public.coach_clients
  for select using (
    client_id = auth.uid()
    or coach_id = auth.uid()
    or public.is_owner()
  );

drop policy if exists coach_clients_insert on public.coach_clients;
create policy coach_clients_insert on public.coach_clients
  for insert with check (coach_id = auth.uid() or public.is_owner());

drop policy if exists coach_clients_update on public.coach_clients;
create policy coach_clients_update on public.coach_clients
  for update using (coach_id = auth.uid() or public.is_owner())
  with check (coach_id = auth.uid() or public.is_owner());

drop policy if exists coach_clients_delete on public.coach_clients;
create policy coach_clients_delete on public.coach_clients
  for delete using (public.is_owner());

-- ---------------------------------------------------------------------------
-- Grants (RLS still governs row visibility; grants govern table access at all).
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete
  on public.profiles, public.coaches, public.coach_clients
  to authenticated;
grant execute on function public.resolve_signup(text, boolean, text) to authenticated;
grant execute on function public.current_app_role() to authenticated;
grant execute on function public.is_owner() to authenticated;
grant execute on function public.is_coach_of(uuid) to authenticated;
