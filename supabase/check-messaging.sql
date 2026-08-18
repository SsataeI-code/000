-- Total Form Fitness — messaging health check.
-- Paste this whole thing into Supabase → SQL Editor → Run. It only READS; it
-- changes nothing. Read the single result row left-to-right:
--
--   messages_table_exists      → false? run supabase/phase4_messages.sql
--   notifications_table_exists → false? run supabase/phase4_notifications.sql
--   messages_realtime_on       → false? messages still save & show on refresh,
--                                 but live updates need it (see the note below)
--   saved_messages             → how many messages are actually stored right now

select
  to_regclass('public.messages')      is not null as messages_table_exists,
  to_regclass('public.notifications') is not null as notifications_table_exists,
  exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) as messages_realtime_on,
  coalesce(
    (select count(*) from public.messages where to_regclass('public.messages') is not null),
    0
  ) as saved_messages;

-- If messages_realtime_on came back false and you want live updates (new
-- messages appearing without a refresh), run this one line once:
--
--   alter publication supabase_realtime add table public.messages;
--
-- It's safe to run even if it's already added (it'll just error "already a
-- member", which you can ignore).
