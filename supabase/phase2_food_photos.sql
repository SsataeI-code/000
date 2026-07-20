-- Total Form Fitness — food photo (bonus). Paste into Supabase SQL Editor and Run once (safe to re-run).

-- Total Form Fitness — food photo (bonus). Optional picture attached to a food
-- log, stored in a PRIVATE Storage bucket the client owns. Idempotent.

alter table public.food_logs add column if not exists photo_path text;

-- Private bucket (served via short-lived signed URLs, never public).
insert into storage.buckets (id, name, public)
  values ('food-photos', 'food-photos', false)
  on conflict (id) do nothing;

-- A client can read/write only their own folder (path = "<uid>/<file>").
-- The coach-of / owner can read a client's photos (dashboards, Phase 3).
drop policy if exists "food_photos_own_write" on storage.objects;
create policy "food_photos_own_write" on storage.objects
  for all to authenticated
  using (bucket_id = 'food-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'food-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "food_photos_coach_read" on storage.objects;
create policy "food_photos_coach_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'food-photos'
    and (
      public.is_owner()
      or public.is_coach_of(((storage.foldername(name))[1])::uuid)
    )
  );
