-- Total Form Fitness — per-client nutrition strictness (§B "per-client strictness
-- setting, coach-controlled"): precise macros / protein+calories / flexible
-- ranges / habits-only. Stored on the client profile so it survives target
-- recalcs; the coach writes it (client_profiles_write already permits is_coach_of).
-- Idempotent.
alter table public.client_profiles add column if not exists strictness text not null default 'precise';
