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
