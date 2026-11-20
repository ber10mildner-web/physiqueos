-- Sigma: training ratings, machine display data for cardio, skin & medication log.
-- Run once in the Supabase SQL Editor after the earlier migrations.

-- ---------------------------------------------------------------------------
-- Subjective rating after a workout or cardio session (1 = very bad, 10 = top).
-- feeling = how it felt overall, energy = energy level, effort = how hard (session RPE).
-- rating_note is separate from notes, because the Garmin sync writes the activity name into notes.
-- ---------------------------------------------------------------------------
alter table public.workouts
  add column if not exists feeling smallint check (feeling between 1 and 10),
  add column if not exists energy smallint check (energy between 1 and 10),
  add column if not exists effort smallint check (effort between 1 and 10),
  add column if not exists rating_note text check (char_length(rating_note) <= 1000);

alter table public.cardio_sessions
  add column if not exists feeling smallint check (feeling between 1 and 10),
  add column if not exists energy smallint check (energy between 1 and 10),
  add column if not exists effort smallint check (effort between 1 and 10),
  add column if not exists rating_note text check (char_length(rating_note) <= 1000),
  -- Values from the machine display (e.g. Stairmaster), read from a photo or typed in.
  add column if not exists machine_minutes numeric(6, 1) check (machine_minutes > 0 and machine_minutes <= 1440),
  add column if not exists machine_level numeric(4, 1) check (machine_level >= 0 and machine_level <= 30),
  add column if not exists machine_floors integer check (machine_floors between 0 and 5000),
  add column if not exists machine_steps integer check (machine_steps between 0 and 100000),
  add column if not exists machine_kcal integer check (machine_kcal between 0 and 10000),
  -- Photo of the display in the private photo bucket: <user_id>/cardio/<uuid>.jpg
  add column if not exists machine_photo_path text check (machine_photo_path ~ '^[0-9a-f-]{36}/cardio/[0-9a-f-]{36}\.jpg$');

-- ---------------------------------------------------------------------------
-- Skin: one entry per day. score 0 = clear … 4 = severe.
-- ---------------------------------------------------------------------------
create table public.skin_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_date date not null,
  score smallint not null check (score between 0 and 4),
  areas text[] not null default '{}'
    check (areas <@ array['forehead', 'nose', 'cheeks', 'chin', 'jaw', 'neck', 'chest', 'back', 'other']::text[]),
  note text check (char_length(note) <= 1000),
  source text not null default 'manual' check (source in ('manual', 'claude')),
  updated_at timestamptz not null default now(),
  unique (user_id, entry_date)
);

-- ---------------------------------------------------------------------------
-- Medications / supplements / skin care the user takes, and when they took them.
-- ---------------------------------------------------------------------------
create table public.medications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  dose text check (char_length(dose) <= 100),
  kind text not null default 'medication' check (kind in ('medication', 'supplement', 'skincare')),
  position integer not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
create index medications_user_idx on public.medications (user_id, archived, position);

create table public.medication_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  medication_id uuid references public.medications (id) on delete set null,
  -- snapshot, so the history stays readable if the medication is renamed or removed
  name text not null check (char_length(name) between 1 and 100),
  dose text check (char_length(dose) <= 100),
  entry_date date not null,
  taken_at timestamptz not null default now(),
  source text not null default 'manual' check (source in ('manual', 'claude'))
);
create index medication_logs_user_date_idx on public.medication_logs (user_id, entry_date desc);

alter table public.skin_logs enable row level security;
alter table public.medications enable row level security;
alter table public.medication_logs enable row level security;

create policy "skin_logs: own rows" on public.skin_logs for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "medications: own rows" on public.medications for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "medication_logs: own rows" on public.medication_logs for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (medication_id is null or exists (select 1 from public.medications m where m.id = medication_id and m.user_id = (select auth.uid())))
  );

-- Privileges (newer Supabase projects do not grant these automatically)
grant select, insert, update, delete on public.skin_logs, public.medications, public.medication_logs to authenticated;
grant all on public.skin_logs, public.medications, public.medication_logs to service_role;
revoke all on public.skin_logs, public.medications, public.medication_logs from anon;

-- ---------------------------------------------------------------------------
-- Different nutrition targets on certain weekdays (e.g. cardio days Tue/Thu).
-- alt_days holds ISO weekdays (1 = Monday … 7 = Sunday).
-- ---------------------------------------------------------------------------
alter table public.nutrition_goals
  add column if not exists alt_days smallint[] not null default '{}'
    check (alt_days <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]),
  add column if not exists alt_energy_kcal integer check (alt_energy_kcal between 800 and 8000),
  add column if not exists alt_protein_g integer check (alt_protein_g between 0 and 600),
  add column if not exists alt_carbs_g integer check (alt_carbs_g between 0 and 1200),
  add column if not exists alt_fat_g integer check (alt_fat_g between 0 and 400),
  add column if not exists alt_fiber_g integer check (alt_fiber_g between 0 and 150);

alter table public.nutrition_goals drop constraint if exists nutrition_goals_alt_complete;
alter table public.nutrition_goals add constraint nutrition_goals_alt_complete check (
  cardinality(alt_days) = 0
  or (alt_energy_kcal is not null and alt_protein_g is not null and alt_carbs_g is not null and alt_fat_g is not null and alt_fiber_g is not null)
);
