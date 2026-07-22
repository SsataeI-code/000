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
