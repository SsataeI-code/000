-- Total Form Fitness — Body progress photos (§C: "optional, opt-in progress
-- photos … private & encrypted"). A secondary Body add-on: the client uploads
-- photos to a PRIVATE bucket they own; their coach / the owner may view them
-- (consent to coach access is captured at sign-up, §8/§13). Served only via
-- short-lived signed URLs, never public. Idempotent.

create table if not exists public.body_photos (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null,
  taken_on     date not null default (now() at time zone 'utc')::date,
  note         text,
  created_at   timestamptz not null default now()
);
create index if not exists body_photos_client_idx on public.body_photos (client_id, taken_on desc);

alter table public.body_photos enable row level security;

-- The client manages their own photos; their coach + the owner may view.
drop policy if exists body_photos_select on public.body_photos;
create policy body_photos_select on public.body_photos
  for select to authenticated
  using (client_id = auth.uid() or public.is_owner() or public.is_coach_of(client_id));

drop policy if exists body_photos_insert on public.body_photos;
create policy body_photos_insert on public.body_photos
  for insert to authenticated
  with check (client_id = auth.uid());

drop policy if exists body_photos_delete on public.body_photos;
create policy body_photos_delete on public.body_photos
  for delete to authenticated
  using (client_id = auth.uid() or public.is_owner());

grant select, insert, update, delete on public.body_photos to authenticated;

-- Private bucket (signed URLs only).
insert into storage.buckets (id, name, public)
  values ('body-photos', 'body-photos', false)
  on conflict (id) do nothing;

-- A client can read/write only their own folder (path = "<uid>/<file>").
drop policy if exists "body_photos_own_write" on storage.objects;
create policy "body_photos_own_write" on storage.objects
  for all to authenticated
  using (bucket_id = 'body-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'body-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- The coach-of / owner can read a client's progress photos.
drop policy if exists "body_photos_coach_read" on storage.objects;
create policy "body_photos_coach_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'body-photos'
    and (
      public.is_owner()
      or public.is_coach_of(((storage.foldername(name))[1])::uuid)
    )
  );
