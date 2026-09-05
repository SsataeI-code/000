-- Total Form Fitness — Client journal / food diary. A place for a client to
-- snap a photo of what they eat and write a note or reflection. Entries are the
-- client's; their coach + the owner can read them (consent captured at sign-up).
-- Photos live in a PRIVATE bucket, served only via short-lived signed URLs.
-- Idempotent.

create table if not exists public.journal_entries (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.profiles (id) on delete cascade,
  entry_date   date not null default (now() at time zone 'utc')::date,
  body         text,
  mood         int check (mood between 1 and 5),
  storage_path text,
  created_at   timestamptz not null default now(),
  -- an entry must have at least a note or a photo
  constraint journal_not_empty check (btrim(coalesce(body, '')) <> '' or storage_path is not null)
);
create index if not exists journal_entries_client_idx on public.journal_entries (client_id, entry_date desc, created_at desc);

alter table public.journal_entries enable row level security;

drop policy if exists journal_entries_select on public.journal_entries;
create policy journal_entries_select on public.journal_entries
  for select to authenticated
  using (client_id = auth.uid() or public.is_owner() or public.is_coach_of(client_id));

drop policy if exists journal_entries_insert on public.journal_entries;
create policy journal_entries_insert on public.journal_entries
  for insert to authenticated
  with check (client_id = auth.uid());

drop policy if exists journal_entries_update on public.journal_entries;
create policy journal_entries_update on public.journal_entries
  for update to authenticated
  using (client_id = auth.uid())
  with check (client_id = auth.uid());

drop policy if exists journal_entries_delete on public.journal_entries;
create policy journal_entries_delete on public.journal_entries
  for delete to authenticated
  using (client_id = auth.uid() or public.is_owner());

grant select, insert, update, delete on public.journal_entries to authenticated;

-- Private bucket for journal/food photos (signed URLs only).
insert into storage.buckets (id, name, public)
  values ('journal-photos', 'journal-photos', false)
  on conflict (id) do nothing;

drop policy if exists "journal_photos_own_write" on storage.objects;
create policy "journal_photos_own_write" on storage.objects
  for all to authenticated
  using (bucket_id = 'journal-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'journal-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "journal_photos_coach_read" on storage.objects;
create policy "journal_photos_coach_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'journal-photos'
    and (
      public.is_owner()
      or public.is_coach_of(((storage.foldername(name))[1])::uuid)
    )
  );
