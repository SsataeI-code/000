-- Total Form Fitness — let a COACH (not only the owner) edit branding images
-- and copy (owner request: "make the logo editable by me when I'm logged in as
-- coach, just a simple click"). §4 already says every image/word is coach-
-- editable; this widens the write policies from owner-only to owner+coach.
-- Idempotent.

-- Caller is staff (owner or coach). SECURITY DEFINER to avoid RLS recursion,
-- mirroring is_owner().
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(public.current_app_role() in ('owner','coach'), false);
$$;
grant execute on function public.is_staff() to authenticated;

-- content-images bucket: owner+coach may write/replace/remove (was owner-only).
drop policy if exists "content_images_owner_write" on storage.objects;
drop policy if exists "content_images_staff_write" on storage.objects;
create policy "content_images_staff_write" on storage.objects
  for all to authenticated
  using (bucket_id = 'content-images' and public.is_staff())
  with check (bucket_id = 'content-images' and public.is_staff());

-- content_overrides (copy + image:<key> rows): owner+coach may write (was owner).
drop policy if exists content_insert on public.content_overrides;
create policy content_insert on public.content_overrides
  for insert with check (public.is_staff());

drop policy if exists content_update on public.content_overrides;
create policy content_update on public.content_overrides
  for update using (public.is_staff()) with check (public.is_staff());

drop policy if exists content_delete on public.content_overrides;
create policy content_delete on public.content_overrides
  for delete using (public.is_staff());
