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
