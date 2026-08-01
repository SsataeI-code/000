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
