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
