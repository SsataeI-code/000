-- Total Form Fitness — saved meals update. Paste into Supabase SQL Editor and Run once (safe to re-run).

-- Total Form Fitness — Phase 1.1: user-created saved meals.
-- A client (or their coach) can build a meal from ingredients, save it as a
-- reusable template, and log the whole thing in one tap. Idempotent.

create table if not exists public.meals (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references public.profiles (id) on delete cascade,
  name       text not null,
  -- Array of { name, grams, nutrimentsPer100g } — everything needed to log it.
  items      jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists meals_owner_idx on public.meals (owner_id);

drop trigger if exists meals_touch on public.meals;
create trigger meals_touch before update on public.meals
  for each row execute function public.touch_updated_at();

alter table public.meals enable row level security;

-- A client owns its meals; the coach-of and owner can see them (Phase 3).
drop policy if exists meals_select on public.meals;
create policy meals_select on public.meals
  for select using (owner_id = auth.uid() or public.is_owner() or public.is_coach_of(owner_id));
drop policy if exists meals_write on public.meals;
create policy meals_write on public.meals
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

grant select, insert, update, delete on public.meals to authenticated;
