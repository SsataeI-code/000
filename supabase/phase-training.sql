-- Total Form Fitness — Training module (add-on brief). Workout & exercise
-- tracking: exercise library, templates/programs, live session logging, sets,
-- and personal records. Multi-coach-safe RLS mirrors the rest of TFF
-- (is_coach_of / is_owner helpers from 0002). Clients own their client-logged
-- sessions; coaches log for their clients and own all programming. Idempotent.

-- ---- Enums -------------------------------------------------------------------
do $$ begin create type public.training_tracking_type as enum ('weight_reps','bodyweight_reps','time','distance_time','reps'); exception when duplicate_object then null; end $$;
do $$ begin create type public.session_source as enum ('coach','client'); exception when duplicate_object then null; end $$;
do $$ begin create type public.session_status as enum ('in_progress','completed','abandoned'); exception when duplicate_object then null; end $$;
do $$ begin create type public.pr_type as enum ('weight','reps','e1rm','time','distance'); exception when duplicate_object then null; end $$;

-- ---- Client profile: training fields ----------------------------------------
alter table public.client_profiles
  add column if not exists injuries text,
  add column if not exists equipment text,
  add column if not exists training_unit text not null default 'lb';
do $$ begin
  alter table public.client_profiles add constraint client_profiles_training_unit_chk check (training_unit in ('lb','kg'));
exception when duplicate_object then null; end $$;

-- ---- Exercise library (§4.1) ------------------------------------------------
create table if not exists public.exercises (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (length(btrim(name)) > 0),
  muscle_groups text[] not null default '{}',
  pattern       text,
  equipment     text,
  tracking_type public.training_tracking_type not null default 'weight_reps',
  cues          text,
  video_url     text,
  created_by    uuid references public.profiles (id) on delete set null,
  is_global     boolean not null default false,
  created_at    timestamptz not null default now()
);
-- Global library names are unique; coaches may reuse a name for a custom variant.
create unique index if not exists exercises_global_name_idx on public.exercises (lower(name)) where is_global;
create index if not exists exercises_created_by_idx on public.exercises (created_by);

alter table public.exercises enable row level security;
-- Exercise definitions carry no personal data → readable by any signed-in user.
drop policy if exists exercises_select on public.exercises;
create policy exercises_select on public.exercises for select to authenticated using (true);
-- Only staff add custom exercises, owned by them (the owner also maintains globals).
drop policy if exists exercises_insert on public.exercises;
create policy exercises_insert on public.exercises for insert to authenticated
  with check (public.is_staff() and (created_by = auth.uid()) and (is_global = false or public.is_owner()));
drop policy if exists exercises_update on public.exercises;
create policy exercises_update on public.exercises for update to authenticated
  using (created_by = auth.uid() or public.is_owner()) with check (created_by = auth.uid() or public.is_owner());
drop policy if exists exercises_delete on public.exercises;
create policy exercises_delete on public.exercises for delete to authenticated
  using (created_by = auth.uid() or public.is_owner());
grant select, insert, update, delete on public.exercises to authenticated;

-- ---- Templates (§4.2) -------------------------------------------------------
create table if not exists public.workout_templates (
  id         uuid primary key default gen_random_uuid(),
  coach_id   uuid not null references public.profiles (id) on delete cascade,
  name       text not null check (length(btrim(name)) > 0),
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists workout_templates_touch on public.workout_templates;
create trigger workout_templates_touch before update on public.workout_templates for each row execute function public.touch_updated_at();
alter table public.workout_templates enable row level security;
drop policy if exists workout_templates_all on public.workout_templates;
create policy workout_templates_all on public.workout_templates for all to authenticated
  using (coach_id = auth.uid() or public.is_owner()) with check (coach_id = auth.uid() or public.is_owner());
grant select, insert, update, delete on public.workout_templates to authenticated;

create table if not exists public.template_exercises (
  id             uuid primary key default gen_random_uuid(),
  template_id    uuid not null references public.workout_templates (id) on delete cascade,
  exercise_id    uuid not null references public.exercises (id) on delete restrict,
  order_no       integer not null default 0,
  superset_group text,
  target_sets    integer,
  target_reps    text,
  target_load    text,
  rest_sec       integer,
  notes          text
);
create index if not exists template_exercises_tpl_idx on public.template_exercises (template_id, order_no);
alter table public.template_exercises enable row level security;
drop policy if exists template_exercises_all on public.template_exercises;
create policy template_exercises_all on public.template_exercises for all to authenticated
  using (exists (select 1 from public.workout_templates t where t.id = template_id and (t.coach_id = auth.uid() or public.is_owner())))
  with check (exists (select 1 from public.workout_templates t where t.id = template_id and (t.coach_id = auth.uid() or public.is_owner())));
grant select, insert, update, delete on public.template_exercises to authenticated;

-- ---- Programs (§4.2) --------------------------------------------------------
create table if not exists public.programs (
  id         uuid primary key default gen_random_uuid(),
  coach_id   uuid not null references public.profiles (id) on delete cascade,
  name       text not null check (length(btrim(name)) > 0),
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists programs_touch on public.programs;
create trigger programs_touch before update on public.programs for each row execute function public.touch_updated_at();
alter table public.programs enable row level security;
drop policy if exists programs_all on public.programs;
create policy programs_all on public.programs for all to authenticated
  using (coach_id = auth.uid() or public.is_owner()) with check (coach_id = auth.uid() or public.is_owner());
grant select, insert, update, delete on public.programs to authenticated;

create table if not exists public.program_weeks (
  id         uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs (id) on delete cascade,
  week_no    integer not null default 1
);
create index if not exists program_weeks_idx on public.program_weeks (program_id, week_no);
alter table public.program_weeks enable row level security;
drop policy if exists program_weeks_all on public.program_weeks;
create policy program_weeks_all on public.program_weeks for all to authenticated
  using (exists (select 1 from public.programs p where p.id = program_id and (p.coach_id = auth.uid() or public.is_owner())))
  with check (exists (select 1 from public.programs p where p.id = program_id and (p.coach_id = auth.uid() or public.is_owner())));
grant select, insert, update, delete on public.program_weeks to authenticated;

create table if not exists public.program_days (
  id              uuid primary key default gen_random_uuid(),
  program_week_id uuid not null references public.program_weeks (id) on delete cascade,
  day_no          integer not null default 1,
  template_id     uuid references public.workout_templates (id) on delete set null,
  title           text
);
create index if not exists program_days_idx on public.program_days (program_week_id, day_no);
alter table public.program_days enable row level security;
drop policy if exists program_days_all on public.program_days;
create policy program_days_all on public.program_days for all to authenticated
  using (exists (select 1 from public.program_weeks w join public.programs p on p.id = w.program_id where w.id = program_week_id and (p.coach_id = auth.uid() or public.is_owner())))
  with check (exists (select 1 from public.program_weeks w join public.programs p on p.id = w.program_id where w.id = program_week_id and (p.coach_id = auth.uid() or public.is_owner())));
grant select, insert, update, delete on public.program_days to authenticated;

-- ---- Client program assignment ----------------------------------------------
create table if not exists public.client_programs (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references public.profiles (id) on delete cascade,
  program_id uuid not null references public.programs (id) on delete cascade,
  start_date date not null default (now() at time zone 'utc')::date,
  overrides  jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists client_programs_idx on public.client_programs (client_id);
alter table public.client_programs enable row level security;
-- Coach/owner manage; the client may read their own assignment (not edit it, §3).
drop policy if exists client_programs_select on public.client_programs;
create policy client_programs_select on public.client_programs for select to authenticated
  using (client_id = auth.uid() or public.is_coach_of(client_id) or public.is_owner());
drop policy if exists client_programs_write on public.client_programs;
create policy client_programs_write on public.client_programs for all to authenticated
  using (public.is_coach_of(client_id) or public.is_owner()) with check (public.is_coach_of(client_id) or public.is_owner());
grant select, insert, update, delete on public.client_programs to authenticated;

-- ---- Sessions (§4.3) --------------------------------------------------------
create table if not exists public.workout_sessions (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.profiles (id) on delete cascade,
  coach_id     uuid references public.profiles (id) on delete set null,
  log_date     date not null default (now() at time zone 'utc')::date,
  source       public.session_source not null default 'coach',
  status       public.session_status not null default 'in_progress',
  notes        text,
  client_note  text,
  duration_sec integer,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists workout_sessions_client_idx on public.workout_sessions (client_id, log_date desc);
drop trigger if exists workout_sessions_touch on public.workout_sessions;
create trigger workout_sessions_touch before update on public.workout_sessions for each row execute function public.touch_updated_at();
alter table public.workout_sessions enable row level security;
drop policy if exists workout_sessions_select on public.workout_sessions;
create policy workout_sessions_select on public.workout_sessions for select to authenticated
  using (client_id = auth.uid() or public.is_coach_of(client_id) or public.is_owner());
-- Clients create their OWN client-logged sessions; coaches create for their clients.
drop policy if exists workout_sessions_insert on public.workout_sessions;
create policy workout_sessions_insert on public.workout_sessions for insert to authenticated
  with check ((client_id = auth.uid() and source = 'client') or public.is_coach_of(client_id) or public.is_owner());
drop policy if exists workout_sessions_update on public.workout_sessions;
create policy workout_sessions_update on public.workout_sessions for update to authenticated
  using ((client_id = auth.uid() and source = 'client') or public.is_coach_of(client_id) or public.is_owner())
  with check ((client_id = auth.uid() and source = 'client') or public.is_coach_of(client_id) or public.is_owner());
drop policy if exists workout_sessions_delete on public.workout_sessions;
create policy workout_sessions_delete on public.workout_sessions for delete to authenticated
  using ((client_id = auth.uid() and source = 'client') or public.is_coach_of(client_id) or public.is_owner());
grant select, insert, update, delete on public.workout_sessions to authenticated;

create table if not exists public.session_sets (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  set_no     integer not null default 1,
  weight     numeric,
  reps       integer,
  time_sec   integer,
  distance   numeric,
  rpe        numeric,
  completed  boolean not null default true,
  is_pr      boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists session_sets_idx on public.session_sets (session_id, set_no);
create index if not exists session_sets_exercise_idx on public.session_sets (exercise_id);
alter table public.session_sets enable row level security;
-- Reuse the parent session's access rules.
drop policy if exists session_sets_select on public.session_sets;
create policy session_sets_select on public.session_sets for select to authenticated
  using (exists (select 1 from public.workout_sessions s where s.id = session_id and (s.client_id = auth.uid() or public.is_coach_of(s.client_id) or public.is_owner())));
drop policy if exists session_sets_write on public.session_sets;
create policy session_sets_write on public.session_sets for all to authenticated
  using (exists (select 1 from public.workout_sessions s where s.id = session_id and ((s.client_id = auth.uid() and s.source = 'client') or public.is_coach_of(s.client_id) or public.is_owner())))
  with check (exists (select 1 from public.workout_sessions s where s.id = session_id and ((s.client_id = auth.uid() and s.source = 'client') or public.is_coach_of(s.client_id) or public.is_owner())));
grant select, insert, update, delete on public.session_sets to authenticated;

-- ---- Personal records (§4.4) ------------------------------------------------
create table if not exists public.personal_records (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.profiles (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  type        public.pr_type not null,
  value       numeric not null,
  unit        text,
  set_id      uuid references public.session_sets (id) on delete set null,
  achieved_at timestamptz not null default now()
);
create index if not exists personal_records_idx on public.personal_records (client_id, exercise_id, type);
alter table public.personal_records enable row level security;
drop policy if exists personal_records_select on public.personal_records;
create policy personal_records_select on public.personal_records for select to authenticated
  using (client_id = auth.uid() or public.is_coach_of(client_id) or public.is_owner());
drop policy if exists personal_records_write on public.personal_records;
create policy personal_records_write on public.personal_records for all to authenticated
  using (client_id = auth.uid() or public.is_coach_of(client_id) or public.is_owner())
  with check (client_id = auth.uid() or public.is_coach_of(client_id) or public.is_owner());
grant select, insert, update, delete on public.personal_records to authenticated;


-- ---- Seed exercise library (global, ~150) — idempotent ----------------------
-- 148 seed exercises (global library)
insert into public.exercises (name, muscle_groups, pattern, equipment, tracking_type, is_global) values
  ('Barbell Bench Press', array['chest','triceps','front_delts']::text[], 'horizontal_push', 'barbell', 'weight_reps', true),
  ('Incline Barbell Bench Press', array['chest','front_delts','triceps']::text[], 'horizontal_push', 'barbell', 'weight_reps', true),
  ('Decline Barbell Bench Press', array['chest','triceps']::text[], 'horizontal_push', 'barbell', 'weight_reps', true),
  ('Dumbbell Bench Press', array['chest','triceps','front_delts']::text[], 'horizontal_push', 'dumbbell', 'weight_reps', true),
  ('Incline Dumbbell Bench Press', array['chest','front_delts','triceps']::text[], 'horizontal_push', 'dumbbell', 'weight_reps', true),
  ('Dumbbell Fly', array['chest']::text[], 'horizontal_push', 'dumbbell', 'weight_reps', true),
  ('Incline Dumbbell Fly', array['chest']::text[], 'horizontal_push', 'dumbbell', 'weight_reps', true),
  ('Cable Crossover', array['chest']::text[], 'horizontal_push', 'cable', 'weight_reps', true),
  ('Pec Deck Machine', array['chest']::text[], 'horizontal_push', 'machine', 'weight_reps', true),
  ('Machine Chest Press', array['chest','triceps']::text[], 'horizontal_push', 'machine', 'weight_reps', true),
  ('Push-Up', array['chest','triceps','core']::text[], 'horizontal_push', 'bodyweight', 'bodyweight_reps', true),
  ('Incline Push-Up', array['chest','triceps']::text[], 'horizontal_push', 'bodyweight', 'bodyweight_reps', true),
  ('Decline Push-Up', array['chest','front_delts']::text[], 'horizontal_push', 'bodyweight', 'bodyweight_reps', true),
  ('Dip', array['chest','triceps']::text[], 'vertical_push', 'dip_bars', 'bodyweight_reps', true),
  ('Smith Machine Bench Press', array['chest','triceps']::text[], 'horizontal_push', 'smith', 'weight_reps', true),
  ('Svend Press', array['chest']::text[], 'horizontal_push', 'plate', 'weight_reps', true),
  ('Deadlift', array['back','hamstrings','glutes']::text[], 'hinge', 'barbell', 'weight_reps', true),
  ('Pull-Up', array['lats','upper_back','biceps']::text[], 'vertical_pull', 'pullup_bar', 'bodyweight_reps', true),
  ('Chin-Up', array['lats','biceps']::text[], 'vertical_pull', 'pullup_bar', 'bodyweight_reps', true),
  ('Lat Pulldown', array['lats','biceps']::text[], 'vertical_pull', 'cable', 'weight_reps', true),
  ('Close-Grip Lat Pulldown', array['lats','biceps']::text[], 'vertical_pull', 'cable', 'weight_reps', true),
  ('Barbell Row', array['back','lats','rear_delts']::text[], 'horizontal_pull', 'barbell', 'weight_reps', true),
  ('Pendlay Row', array['back','lats']::text[], 'horizontal_pull', 'barbell', 'weight_reps', true),
  ('Dumbbell Row', array['lats','upper_back','biceps']::text[], 'horizontal_pull', 'dumbbell', 'weight_reps', true),
  ('Seated Cable Row', array['back','lats','rear_delts']::text[], 'horizontal_pull', 'cable', 'weight_reps', true),
  ('T-Bar Row', array['back','lats']::text[], 'horizontal_pull', 'barbell', 'weight_reps', true),
  ('Chest-Supported Row', array['upper_back','lats']::text[], 'horizontal_pull', 'machine', 'weight_reps', true),
  ('Machine Row', array['back','lats']::text[], 'horizontal_pull', 'machine', 'weight_reps', true),
  ('Straight-Arm Pulldown', array['lats']::text[], 'vertical_pull', 'cable', 'weight_reps', true),
  ('Inverted Row', array['back','lats','biceps']::text[], 'horizontal_pull', 'bodyweight', 'bodyweight_reps', true),
  ('Rack Pull', array['back','glutes','hamstrings']::text[], 'hinge', 'barbell', 'weight_reps', true),
  ('Barbell Shrug', array['traps']::text[], 'isolation', 'barbell', 'weight_reps', true),
  ('Dumbbell Shrug', array['traps']::text[], 'isolation', 'dumbbell', 'weight_reps', true),
  ('Face Pull', array['rear_delts','upper_back']::text[], 'horizontal_pull', 'cable', 'weight_reps', true),
  ('Overhead Press', array['shoulders','triceps']::text[], 'vertical_push', 'barbell', 'weight_reps', true),
  ('Seated Dumbbell Shoulder Press', array['shoulders','triceps']::text[], 'vertical_push', 'dumbbell', 'weight_reps', true),
  ('Arnold Press', array['shoulders','triceps']::text[], 'vertical_push', 'dumbbell', 'weight_reps', true),
  ('Push Press', array['shoulders','triceps']::text[], 'vertical_push', 'barbell', 'weight_reps', true),
  ('Machine Shoulder Press', array['shoulders','triceps']::text[], 'vertical_push', 'machine', 'weight_reps', true),
  ('Dumbbell Lateral Raise', array['side_delts']::text[], 'isolation', 'dumbbell', 'weight_reps', true),
  ('Cable Lateral Raise', array['side_delts']::text[], 'isolation', 'cable', 'weight_reps', true),
  ('Dumbbell Front Raise', array['front_delts']::text[], 'isolation', 'dumbbell', 'weight_reps', true),
  ('Reverse Pec Deck', array['rear_delts']::text[], 'isolation', 'machine', 'weight_reps', true),
  ('Bent-Over Reverse Fly', array['rear_delts']::text[], 'isolation', 'dumbbell', 'weight_reps', true),
  ('Upright Row', array['side_delts','traps']::text[], 'vertical_pull', 'barbell', 'weight_reps', true),
  ('Landmine Press', array['shoulders','chest']::text[], 'vertical_push', 'barbell', 'weight_reps', true),
  ('Barbell Curl', array['biceps']::text[], 'isolation', 'barbell', 'weight_reps', true),
  ('EZ-Bar Curl', array['biceps']::text[], 'isolation', 'ez_bar', 'weight_reps', true),
  ('Dumbbell Curl', array['biceps']::text[], 'isolation', 'dumbbell', 'weight_reps', true),
  ('Hammer Curl', array['biceps','forearms']::text[], 'isolation', 'dumbbell', 'weight_reps', true),
  ('Incline Dumbbell Curl', array['biceps']::text[], 'isolation', 'dumbbell', 'weight_reps', true),
  ('Preacher Curl', array['biceps']::text[], 'isolation', 'ez_bar', 'weight_reps', true),
  ('Cable Curl', array['biceps']::text[], 'isolation', 'cable', 'weight_reps', true),
  ('Concentration Curl', array['biceps']::text[], 'isolation', 'dumbbell', 'weight_reps', true),
  ('Spider Curl', array['biceps']::text[], 'isolation', 'dumbbell', 'weight_reps', true),
  ('Close-Grip Bench Press', array['triceps','chest']::text[], 'horizontal_push', 'barbell', 'weight_reps', true),
  ('Triceps Pushdown', array['triceps']::text[], 'isolation', 'cable', 'weight_reps', true),
  ('Rope Pushdown', array['triceps']::text[], 'isolation', 'cable', 'weight_reps', true),
  ('Overhead Cable Extension', array['triceps']::text[], 'isolation', 'cable', 'weight_reps', true),
  ('Skull Crusher', array['triceps']::text[], 'isolation', 'ez_bar', 'weight_reps', true),
  ('Dumbbell Overhead Extension', array['triceps']::text[], 'isolation', 'dumbbell', 'weight_reps', true),
  ('Bench Dip', array['triceps']::text[], 'isolation', 'bodyweight', 'bodyweight_reps', true),
  ('Diamond Push-Up', array['triceps','chest']::text[], 'horizontal_push', 'bodyweight', 'bodyweight_reps', true),
  ('Kickback', array['triceps']::text[], 'isolation', 'dumbbell', 'weight_reps', true),
  ('Back Squat', array['quads','glutes']::text[], 'squat', 'barbell', 'weight_reps', true),
  ('Front Squat', array['quads','core']::text[], 'squat', 'barbell', 'weight_reps', true),
  ('High-Bar Squat', array['quads','glutes']::text[], 'squat', 'barbell', 'weight_reps', true),
  ('Box Squat', array['quads','glutes']::text[], 'squat', 'barbell', 'weight_reps', true),
  ('Goblet Squat', array['quads','glutes']::text[], 'squat', 'dumbbell', 'weight_reps', true),
  ('Hack Squat', array['quads']::text[], 'squat', 'machine', 'weight_reps', true),
  ('Leg Press', array['quads','glutes']::text[], 'squat', 'machine', 'weight_reps', true),
  ('Leg Extension', array['quads']::text[], 'isolation', 'machine', 'weight_reps', true),
  ('Bulgarian Split Squat', array['quads','glutes']::text[], 'lunge', 'dumbbell', 'weight_reps', true),
  ('Walking Lunge', array['quads','glutes']::text[], 'lunge', 'dumbbell', 'weight_reps', true),
  ('Reverse Lunge', array['quads','glutes']::text[], 'lunge', 'dumbbell', 'weight_reps', true),
  ('Step-Up', array['quads','glutes']::text[], 'lunge', 'dumbbell', 'weight_reps', true),
  ('Smith Machine Squat', array['quads','glutes']::text[], 'squat', 'smith', 'weight_reps', true),
  ('Pistol Squat', array['quads','glutes']::text[], 'squat', 'bodyweight', 'bodyweight_reps', true),
  ('Wall Sit', array['quads']::text[], 'squat', 'bodyweight', 'time', true),
  ('Romanian Deadlift', array['hamstrings','glutes']::text[], 'hinge', 'barbell', 'weight_reps', true),
  ('Stiff-Leg Deadlift', array['hamstrings','glutes']::text[], 'hinge', 'barbell', 'weight_reps', true),
  ('Dumbbell Romanian Deadlift', array['hamstrings','glutes']::text[], 'hinge', 'dumbbell', 'weight_reps', true),
  ('Trap Bar Deadlift', array['glutes','hamstrings','quads']::text[], 'hinge', 'trap_bar', 'weight_reps', true),
  ('Sumo Deadlift', array['glutes','hamstrings','adductors']::text[], 'hinge', 'barbell', 'weight_reps', true),
  ('Hip Thrust', array['glutes','hamstrings']::text[], 'hinge', 'barbell', 'weight_reps', true),
  ('Glute Bridge', array['glutes']::text[], 'hinge', 'bodyweight', 'bodyweight_reps', true),
  ('Lying Leg Curl', array['hamstrings']::text[], 'isolation', 'machine', 'weight_reps', true),
  ('Seated Leg Curl', array['hamstrings']::text[], 'isolation', 'machine', 'weight_reps', true),
  ('Nordic Hamstring Curl', array['hamstrings']::text[], 'isolation', 'bodyweight', 'bodyweight_reps', true),
  ('Good Morning', array['hamstrings','back']::text[], 'hinge', 'barbell', 'weight_reps', true),
  ('Cable Pull-Through', array['glutes','hamstrings']::text[], 'hinge', 'cable', 'weight_reps', true),
  ('Kettlebell Swing', array['glutes','hamstrings']::text[], 'hinge', 'kettlebell', 'weight_reps', true),
  ('Back Extension', array['glutes','hamstrings','back']::text[], 'hinge', 'bodyweight', 'bodyweight_reps', true),
  ('Cable Kickback', array['glutes']::text[], 'isolation', 'cable', 'weight_reps', true),
  ('Hip Abduction Machine', array['abductors','glutes']::text[], 'isolation', 'machine', 'weight_reps', true),
  ('Hip Adduction Machine', array['adductors']::text[], 'isolation', 'machine', 'weight_reps', true),
  ('Standing Calf Raise', array['calves']::text[], 'isolation', 'machine', 'weight_reps', true),
  ('Seated Calf Raise', array['calves']::text[], 'isolation', 'machine', 'weight_reps', true),
  ('Dumbbell Calf Raise', array['calves']::text[], 'isolation', 'dumbbell', 'weight_reps', true),
  ('Leg Press Calf Raise', array['calves']::text[], 'isolation', 'machine', 'weight_reps', true),
  ('Plank', array['core','abs']::text[], 'core', 'bodyweight', 'time', true),
  ('Side Plank', array['obliques','core']::text[], 'core', 'bodyweight', 'time', true),
  ('Hanging Leg Raise', array['abs','hip_flexors']::text[], 'core', 'pullup_bar', 'bodyweight_reps', true),
  ('Hanging Knee Raise', array['abs']::text[], 'core', 'pullup_bar', 'bodyweight_reps', true),
  ('Cable Crunch', array['abs']::text[], 'core', 'cable', 'weight_reps', true),
  ('Crunch', array['abs']::text[], 'core', 'bodyweight', 'reps', true),
  ('Sit-Up', array['abs','hip_flexors']::text[], 'core', 'bodyweight', 'reps', true),
  ('Russian Twist', array['obliques']::text[], 'rotation', 'bodyweight', 'reps', true),
  ('Bicycle Crunch', array['abs','obliques']::text[], 'core', 'bodyweight', 'reps', true),
  ('Ab Wheel Rollout', array['abs','core']::text[], 'core', 'bodyweight', 'reps', true),
  ('Dead Bug', array['core','abs']::text[], 'core', 'bodyweight', 'reps', true),
  ('Mountain Climber', array['core','hip_flexors']::text[], 'core', 'bodyweight', 'time', true),
  ('Hollow Body Hold', array['abs','core']::text[], 'core', 'bodyweight', 'time', true),
  ('Pallof Press', array['core','obliques']::text[], 'rotation', 'cable', 'weight_reps', true),
  ('Captain''s Chair Leg Raise', array['abs']::text[], 'core', 'machine', 'bodyweight_reps', true),
  ('Power Clean', array['full_body','traps','glutes']::text[], 'olympic', 'barbell', 'weight_reps', true),
  ('Hang Clean', array['full_body','traps']::text[], 'olympic', 'barbell', 'weight_reps', true),
  ('Clean and Jerk', array['full_body']::text[], 'olympic', 'barbell', 'weight_reps', true),
  ('Snatch', array['full_body']::text[], 'olympic', 'barbell', 'weight_reps', true),
  ('Clean Pull', array['back','traps','glutes']::text[], 'olympic', 'barbell', 'weight_reps', true),
  ('Thruster', array['quads','shoulders']::text[], 'squat', 'barbell', 'weight_reps', true),
  ('Dumbbell Thruster', array['quads','shoulders']::text[], 'squat', 'dumbbell', 'weight_reps', true),
  ('Medicine Ball Slam', array['full_body','core']::text[], 'conditioning', 'medicine_ball', 'reps', true),
  ('Box Jump', array['quads','glutes']::text[], 'conditioning', 'box', 'reps', true),
  ('Burpee', array['full_body']::text[], 'conditioning', 'bodyweight', 'reps', true),
  ('Kettlebell Clean', array['full_body','glutes']::text[], 'olympic', 'kettlebell', 'weight_reps', true),
  ('Kettlebell Snatch', array['full_body','shoulders']::text[], 'olympic', 'kettlebell', 'weight_reps', true),
  ('Turkish Get-Up', array['full_body','core']::text[], 'conditioning', 'kettlebell', 'weight_reps', true),
  ('Farmer''s Carry', array['traps','forearms','core']::text[], 'carry', 'dumbbell', 'time', true),
  ('Suitcase Carry', array['obliques','forearms','core']::text[], 'carry', 'dumbbell', 'time', true),
  ('Sled Push', array['quads','glutes','full_body']::text[], 'conditioning', 'sled', 'distance_time', true),
  ('Sled Pull', array['back','hamstrings']::text[], 'conditioning', 'sled', 'distance_time', true),
  ('Battle Ropes', array['shoulders','core']::text[], 'conditioning', 'band', 'time', true),
  ('Jump Rope', array['calves','full_body']::text[], 'conditioning', 'jump_rope', 'time', true),
  ('Rowing Machine', array['full_body','back']::text[], 'conditioning', 'rower', 'distance_time', true),
  ('Assault Bike', array['full_body']::text[], 'conditioning', 'bike', 'distance_time', true),
  ('Treadmill Run', array['full_body']::text[], 'gait', 'treadmill', 'distance_time', true),
  ('Outdoor Run', array['full_body']::text[], 'gait', 'bodyweight', 'distance_time', true),
  ('Stationary Bike', array['quads','full_body']::text[], 'conditioning', 'bike', 'distance_time', true),
  ('Incline Treadmill Walk', array['glutes','calves']::text[], 'gait', 'treadmill', 'distance_time', true),
  ('Stair Climber', array['glutes','quads']::text[], 'conditioning', 'machine', 'distance_time', true),
  ('Elliptical', array['full_body']::text[], 'conditioning', 'machine', 'distance_time', true),
  ('Jumping Jacks', array['full_body']::text[], 'conditioning', 'bodyweight', 'reps', true),
  ('High Knees', array['hip_flexors','calves']::text[], 'conditioning', 'bodyweight', 'time', true),
  ('Wrist Curl', array['forearms']::text[], 'isolation', 'barbell', 'weight_reps', true),
  ('Reverse Wrist Curl', array['forearms']::text[], 'isolation', 'barbell', 'weight_reps', true),
  ('Reverse Curl', array['forearms','biceps']::text[], 'isolation', 'ez_bar', 'weight_reps', true),
  ('Dead Hang', array['forearms','lats']::text[], 'core', 'pullup_bar', 'time', true)
on conflict (lower(name)) where is_global do nothing;
