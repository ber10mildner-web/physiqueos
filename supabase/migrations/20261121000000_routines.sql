-- Sigma: workout times and per-exercise feeling, repeatable cardio (templates that
-- can log themselves on chosen weekdays), supplements with nutrients.
-- Run once in the Supabase SQL Editor after the earlier migrations.

-- ---------------------------------------------------------------------------
-- How an exercise felt in a workout (1 = very bad … 10 = top) plus a note.
-- ---------------------------------------------------------------------------
create table public.workout_exercise_notes (
  workout_id uuid not null references public.workouts (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  feeling smallint check (feeling between 1 and 10),
  note text check (char_length(note) <= 500),
  updated_at timestamptz not null default now(),
  primary key (workout_id, exercise_id)
);
create index workout_exercise_notes_user_idx on public.workout_exercise_notes (user_id);

-- ---------------------------------------------------------------------------
-- Treadmill details (incline in %, speed in km/h) for cardio sessions.
-- ---------------------------------------------------------------------------
alter table public.cardio_sessions
  add column if not exists incline_pct numeric(4, 1) check (incline_pct between 0 and 40),
  add column if not exists speed_kmh numeric(4, 1) check (speed_kmh > 0 and speed_kmh <= 40);

-- ---------------------------------------------------------------------------
-- Repeatable cardio ("routine"): e.g. incline walk 30 min, 6 %, 5 km/h.
-- auto_days holds ISO weekdays (1 = Monday … 7 = Sunday) on which Sigma logs it
-- by itself; auto_from is the first day it may be logged automatically.
-- ---------------------------------------------------------------------------
create table public.cardio_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  activity text not null check (activity in ('run', 'bike', 'walk', 'row', 'swim', 'elliptical', 'stairs', 'hike', 'other')),
  duration_min numeric(6, 1) not null check (duration_min > 0 and duration_min <= 1440),
  distance_km numeric(7, 2) check (distance_km >= 0 and distance_km <= 1000),
  avg_hr integer check (avg_hr between 30 and 250),
  kcal integer check (kcal between 0 and 10000),
  incline_pct numeric(4, 1) check (incline_pct between 0 and 40),
  speed_kmh numeric(4, 1) check (speed_kmh > 0 and speed_kmh <= 40),
  effort smallint check (effort between 1 and 10),
  auto_days smallint[] not null default '{}' check (auto_days <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]),
  auto_from date not null default current_date,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
create index cardio_templates_user_idx on public.cardio_templates (user_id, archived);

alter table public.cardio_sessions
  add column if not exists template_id uuid references public.cardio_templates (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Supplements with nutrients: values for ONE dose (keys as in foods.nutrients),
-- dose_g = weight of one dose (e.g. 1 capsule = 1 g). Taking it adds a diary entry.
-- ---------------------------------------------------------------------------
alter table public.medications
  add column if not exists nutrients jsonb check (nutrients is null or jsonb_typeof(nutrients) = 'object'),
  add column if not exists dose_g numeric(7, 2) check (dose_g > 0 and dose_g <= 1000),
  add column if not exists auto_days smallint[] not null default '{}' check (auto_days <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]),
  add column if not exists auto_from date not null default current_date;

alter table public.diary_entries
  add column if not exists medication_log_id uuid references public.medication_logs (id) on delete cascade;
create index if not exists diary_entries_medication_log_idx on public.diary_entries (medication_log_id) where medication_log_id is not null;

-- ---------------------------------------------------------------------------
-- Which automatic entries were already made (so a deleted one is not re-added).
-- ---------------------------------------------------------------------------
create table public.routine_runs (
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('cardio', 'supplement')),
  ref_id uuid not null,
  run_date date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, kind, ref_id, run_date)
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.workout_exercise_notes enable row level security;
alter table public.cardio_templates enable row level security;
alter table public.routine_runs enable row level security;

create policy "workout_exercise_notes: own rows" on public.workout_exercise_notes for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = (select auth.uid()))
    and exists (select 1 from public.exercises e where e.id = exercise_id and (e.user_id is null or e.user_id = (select auth.uid())))
  );

create policy "cardio_templates: own rows" on public.cardio_templates for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "routine_runs: own rows" on public.routine_runs for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- A cardio session may only point to the user's own template.
create policy "cardio_sessions: own template" on public.cardio_sessions as restrictive for all to authenticated
  using (true)
  with check (template_id is null or exists (select 1 from public.cardio_templates t where t.id = template_id and t.user_id = (select auth.uid())));

-- A diary entry may only point to the user's own supplement intake.
create policy "diary_entries: own medication log" on public.diary_entries as restrictive for all to authenticated
  using (true)
  with check (medication_log_id is null or exists (select 1 from public.medication_logs l where l.id = medication_log_id and l.user_id = (select auth.uid())));

-- Privileges (newer Supabase projects do not grant these automatically)
grant select, insert, update, delete on public.workout_exercise_notes, public.cardio_templates, public.routine_runs to authenticated;
grant all on public.workout_exercise_notes, public.cardio_templates, public.routine_runs to service_role;
revoke all on public.workout_exercise_notes, public.cardio_templates, public.routine_runs from anon;
