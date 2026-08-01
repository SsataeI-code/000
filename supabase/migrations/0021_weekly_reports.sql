-- Total Form Fitness — weekly report scheduling (§12 "Weekly (default), in-app +
-- a notification"). One dedup column on engagement_state so the daily sweep
-- fires each client's weekly recap notification at most once per week. Idempotent.

alter table public.engagement_state add column if not exists last_report_on date;
