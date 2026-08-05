-- Total Form Fitness — what's been run? Paste into Supabase → SQL Editor → Run.
-- Anything marked "MISSING" needs its file run (supabase/<name>.sql).
with checks as (
  select '0008 coach dashboard (phase3_coach_prefs.sql)' as item, to_regclass('public.coach_prefs') is not null as ok
  union all select '0009 chat (phase4_messages.sql)', to_regclass('public.messages') is not null
  union all select '0010 notifications (phase4_notifications.sql)', to_regclass('public.notifications') is not null
  union all select '0011 engagement sweep (phase4_engagement.sql)', to_regclass('public.engagement_state') is not null
  union all select '0012 push (phase4_push.sql)', to_regclass('public.push_subscriptions') is not null
  union all select '0013 referrals (phase6_referrals.sql)', to_regclass('public.referrals') is not null
  union all select '0014 CMS copy (phase6_content.sql)', to_regclass('public.content_overrides') is not null
  union all select '0015 quiet hours (phase4_quiet_hours.sql)', exists(select 1 from information_schema.columns where table_schema='public' and table_name='client_profiles' and column_name='quiet_start')
  union all select '0016 client screen (phase6_client_screen.sql)', exists(select 1 from information_schema.columns where table_schema='public' and table_name='coach_prefs' and column_name='client_today')
  union all select '0017 per-client screen (phase6_client_screen_overrides.sql)', to_regclass('public.client_screen_overrides') is not null
  union all select '0018 progress photos table (phase2_body_photos.sql)', to_regclass('public.body_photos') is not null
  union all select '0018 progress photos bucket (phase2_body_photos.sql)', exists(select 1 from storage.buckets where id='body-photos')
  union all select '0019 editable images (phase6_content_images.sql)', exists(select 1 from storage.buckets where id='content-images')
  union all select '0020 wearable connections (phase7_wearables.sql)', to_regclass('public.wearable_connections') is not null
  union all select '0021 weekly reports (phase7_weekly_reports.sql)', exists(select 1 from information_schema.columns where table_schema='public' and table_name='engagement_state' and column_name='last_report_on')
  union all select '0022 wearable daily (phase7_wearable_daily.sql)', to_regclass('public.wearable_daily') is not null
  union all select '0023 strictness (phase-strictness.sql)', exists(select 1 from information_schema.columns where table_schema='public' and table_name='client_profiles' and column_name='strictness')
  union all select '0024 delete client (phase-delete-client.sql)', exists(select 1 from pg_proc where proname='delete_client')
)
select case when ok then 'done' else 'MISSING - run it' end as status, item
from checks order by ok, item;
