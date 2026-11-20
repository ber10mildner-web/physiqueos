-- PhysiqueOS – milestone 2: quick tracking, recipes, training, health data, Claude access
-- Run once in the Supabase SQL Editor after the earlier migrations.

-- ---------------------------------------------------------------------------
-- Quick tracking
-- ---------------------------------------------------------------------------
alter table public.foods add column if not exists is_favorite boolean not null default false;
alter table public.profiles add column if not exists water_target_ml integer
  check (water_target_ml between 500 and 8000);

create table public.water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_date date not null,
  amount_ml integer not null check (amount_ml between -5000 and 5000 and amount_ml <> 0),
  created_at timestamptz not null default now()
);
create index water_logs_user_date_idx on public.water_logs (user_id, entry_date);

-- ---------------------------------------------------------------------------
-- Recipes
-- A recipe is a list of ingredients (raw amounts) plus the total weight after
-- cooking. Nutrients per 100 g of the finished dish are derived in code from
-- the ingredient snapshots; a nutrient is only known if every ingredient has it.
-- ---------------------------------------------------------------------------
alter type public.food_source add value if not exists 'recipe';

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  notes text check (char_length(notes) <= 2000),
  -- weight of the finished dish; null = use the sum of the raw ingredients
  cooked_weight_g numeric(8, 1) check (cooked_weight_g > 0 and cooked_weight_g <= 50000),
  servings numeric(5, 1) check (servings > 0 and servings <= 100),
  is_favorite boolean not null default false,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index recipes_user_idx on public.recipes (user_id, archived, updated_at desc);
create trigger recipes_updated_at before update on public.recipes
  for each row execute function public.set_updated_at();

create table public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  position integer not null default 0,
  food_id uuid references public.foods (id) on delete set null,
  name text not null check (char_length(name) between 1 and 200),
  brand text,
  source public.food_source not null,
  source_id text,
  amount_g numeric(8, 1) not null check (amount_g > 0 and amount_g <= 20000),
  nutrients_per_100g jsonb not null check (jsonb_typeof(nutrients_per_100g) = 'object'),
  created_at timestamptz not null default now()
);
create index recipe_ingredients_recipe_idx on public.recipe_ingredients (recipe_id, position);

alter table public.diary_entries
  add column if not exists recipe_id uuid references public.recipes (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Training
-- Built-in exercises have user_id = null and are readable by everyone.
-- ---------------------------------------------------------------------------
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  name_de text not null,
  name_en text not null,
  muscle_group text not null check (muscle_group in
    ('chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'glutes', 'hamstrings', 'calves', 'core', 'full_body', 'cardio')),
  equipment text not null default 'barbell' check (equipment in
    ('barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'kettlebell', 'other')),
  created_at timestamptz not null default now()
);
create index exercises_user_idx on public.exercises (user_id);

create table public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  notes text check (char_length(notes) <= 2000),
  position integer not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.plan_exercises (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.workout_plans (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  position integer not null default 0,
  target_sets integer not null default 3 check (target_sets between 1 and 20),
  rep_min integer not null default 8 check (rep_min between 1 and 100),
  rep_max integer not null default 12 check (rep_max between 1 and 100),
  check (rep_min <= rep_max)
);
create index plan_exercises_plan_idx on public.plan_exercises (plan_id, position);

create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id uuid references public.workout_plans (id) on delete set null,
  name text not null check (char_length(name) between 1 and 100),
  workout_date date not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  notes text check (char_length(notes) <= 2000)
);
create index workouts_user_date_idx on public.workouts (user_id, workout_date desc);

create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  position integer not null default 0,
  reps integer not null check (reps between 0 and 200),
  weight_kg numeric(6, 2) not null default 0 check (weight_kg between 0 and 1000),
  rpe numeric(3, 1) check (rpe between 1 and 10),
  is_warmup boolean not null default false,
  created_at timestamptz not null default now()
);
create index workout_sets_workout_idx on public.workout_sets (workout_id, position);
create index workout_sets_user_exercise_idx on public.workout_sets (user_id, exercise_id, created_at desc);

create table public.cardio_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_date date not null,
  activity text not null check (activity in ('run', 'bike', 'walk', 'row', 'swim', 'elliptical', 'stairs', 'hike', 'other')),
  duration_min numeric(6, 1) not null check (duration_min > 0 and duration_min <= 1440),
  distance_km numeric(7, 2) check (distance_km >= 0 and distance_km <= 1000),
  avg_hr integer check (avg_hr between 30 and 250),
  kcal integer check (kcal between 0 and 10000),
  notes text check (char_length(notes) <= 1000),
  source text not null default 'manual' check (source in ('manual', 'garmin', 'strava', 'claude')),
  source_id text,
  created_at timestamptz not null default now(),
  unique (user_id, source, source_id)
);
create index cardio_user_date_idx on public.cardio_sessions (user_id, session_date desc);

-- ---------------------------------------------------------------------------
-- Daily health data (Garmin or manual): sleep, HRV, resting heart rate …
-- ---------------------------------------------------------------------------
create table public.daily_health (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_date date not null,
  sleep_score integer check (sleep_score between 0 and 100),
  sleep_minutes integer check (sleep_minutes between 0 and 1440),
  resting_hr integer check (resting_hr between 20 and 200),
  hrv_ms integer check (hrv_ms between 0 and 300),
  body_battery integer check (body_battery between 0 and 100),
  steps integer check (steps between 0 and 200000),
  stress integer check (stress between 0 and 100),
  source text not null default 'manual' check (source in ('manual', 'garmin', 'claude')),
  updated_at timestamptz not null default now(),
  unique (user_id, entry_date)
);

-- ---------------------------------------------------------------------------
-- Personal access tokens for the Claude (MCP) connection. Only a SHA-256 hash
-- of the token is stored; the token itself is shown to the user once.
-- ---------------------------------------------------------------------------
create table public.api_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  token_prefix text not null,
  can_write boolean not null default true,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.water_logs enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.exercises enable row level security;
alter table public.workout_plans enable row level security;
alter table public.plan_exercises enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_sets enable row level security;
alter table public.cardio_sessions enable row level security;
alter table public.daily_health enable row level security;
alter table public.api_tokens enable row level security;

create policy "water_logs: own rows" on public.water_logs for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "recipes: own rows" on public.recipes for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "recipe_ingredients: own rows" on public.recipe_ingredients for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = (select auth.uid()))
    and (food_id is null or exists (select 1 from public.foods f where f.id = food_id and f.user_id = (select auth.uid())))
  );

create policy "exercises: read built-in and own" on public.exercises for select to authenticated
  using (user_id is null or user_id = (select auth.uid()));
create policy "exercises: insert own" on public.exercises for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "exercises: update own" on public.exercises for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "exercises: delete own" on public.exercises for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "workout_plans: own rows" on public.workout_plans for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "plan_exercises: own rows" on public.plan_exercises for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.workout_plans p where p.id = plan_id and p.user_id = (select auth.uid()))
    and exists (select 1 from public.exercises e where e.id = exercise_id and (e.user_id is null or e.user_id = (select auth.uid())))
  );

create policy "workouts: own rows" on public.workouts for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (plan_id is null or exists (select 1 from public.workout_plans p where p.id = plan_id and p.user_id = (select auth.uid())))
  );

create policy "workout_sets: own rows" on public.workout_sets for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = (select auth.uid()))
    and exists (select 1 from public.exercises e where e.id = exercise_id and (e.user_id is null or e.user_id = (select auth.uid())))
  );

create policy "cardio_sessions: own rows" on public.cardio_sessions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "daily_health: own rows" on public.daily_health for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Tokens: users may list and revoke their tokens; creation goes through the app.
create policy "api_tokens: own rows" on public.api_tokens for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Privileges (newer Supabase projects do not grant these automatically)
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke all on all tables in schema public from anon;

-- ---------------------------------------------------------------------------
-- Built-in exercise library
-- ---------------------------------------------------------------------------
insert into public.exercises (user_id, name_de, name_en, muscle_group, equipment) values
  (null, 'Bankdrücken', 'Bench press', 'chest', 'barbell'),
  (null, 'Schrägbankdrücken', 'Incline bench press', 'chest', 'barbell'),
  (null, 'Kurzhantel-Bankdrücken', 'Dumbbell bench press', 'chest', 'dumbbell'),
  (null, 'Schrägbank Kurzhantel', 'Incline dumbbell press', 'chest', 'dumbbell'),
  (null, 'Butterfly (Maschine)', 'Pec deck', 'chest', 'machine'),
  (null, 'Kabelzug-Flys', 'Cable fly', 'chest', 'cable'),
  (null, 'Dips', 'Dips', 'chest', 'bodyweight'),
  (null, 'Liegestütze', 'Push-ups', 'chest', 'bodyweight'),
  (null, 'Klimmzüge', 'Pull-ups', 'back', 'bodyweight'),
  (null, 'Latzug', 'Lat pulldown', 'back', 'cable'),
  (null, 'Langhantelrudern', 'Barbell row', 'back', 'barbell'),
  (null, 'Kurzhantelrudern', 'Dumbbell row', 'back', 'dumbbell'),
  (null, 'Rudern am Kabel', 'Seated cable row', 'back', 'cable'),
  (null, 'Kreuzheben', 'Deadlift', 'back', 'barbell'),
  (null, 'Rudermaschine (Brustgestützt)', 'Chest-supported row', 'back', 'machine'),
  (null, 'Schulterdrücken (Langhantel)', 'Overhead press', 'shoulders', 'barbell'),
  (null, 'Schulterdrücken (Kurzhantel)', 'Dumbbell shoulder press', 'shoulders', 'dumbbell'),
  (null, 'Seitheben', 'Lateral raise', 'shoulders', 'dumbbell'),
  (null, 'Seitheben am Kabel', 'Cable lateral raise', 'shoulders', 'cable'),
  (null, 'Face Pulls', 'Face pull', 'shoulders', 'cable'),
  (null, 'Reverse Flys', 'Reverse fly', 'shoulders', 'machine'),
  (null, 'Langhantel-Curls', 'Barbell curl', 'biceps', 'barbell'),
  (null, 'Kurzhantel-Curls', 'Dumbbell curl', 'biceps', 'dumbbell'),
  (null, 'Hammer-Curls', 'Hammer curl', 'biceps', 'dumbbell'),
  (null, 'Kabel-Curls', 'Cable curl', 'biceps', 'cable'),
  (null, 'Trizepsdrücken am Kabel', 'Triceps pushdown', 'triceps', 'cable'),
  (null, 'Überkopf-Trizepsstrecken', 'Overhead triceps extension', 'triceps', 'cable'),
  (null, 'French Press (SZ)', 'Skull crusher', 'triceps', 'barbell'),
  (null, 'Enges Bankdrücken', 'Close-grip bench press', 'triceps', 'barbell'),
  (null, 'Kniebeugen', 'Squat', 'legs', 'barbell'),
  (null, 'Frontkniebeugen', 'Front squat', 'legs', 'barbell'),
  (null, 'Beinpresse', 'Leg press', 'legs', 'machine'),
  (null, 'Hackenschmidt', 'Hack squat', 'legs', 'machine'),
  (null, 'Bulgarian Split Squats', 'Bulgarian split squat', 'legs', 'dumbbell'),
  (null, 'Ausfallschritte', 'Lunges', 'legs', 'dumbbell'),
  (null, 'Beinstrecker', 'Leg extension', 'legs', 'machine'),
  (null, 'Rumänisches Kreuzheben', 'Romanian deadlift', 'hamstrings', 'barbell'),
  (null, 'Beinbeuger liegend', 'Lying leg curl', 'hamstrings', 'machine'),
  (null, 'Beinbeuger sitzend', 'Seated leg curl', 'hamstrings', 'machine'),
  (null, 'Hip Thrusts', 'Hip thrust', 'glutes', 'barbell'),
  (null, 'Abduktoren-Maschine', 'Hip abduction', 'glutes', 'machine'),
  (null, 'Wadenheben stehend', 'Standing calf raise', 'calves', 'machine'),
  (null, 'Wadenheben sitzend', 'Seated calf raise', 'calves', 'machine'),
  (null, 'Plank', 'Plank', 'core', 'bodyweight'),
  (null, 'Beinheben hängend', 'Hanging leg raise', 'core', 'bodyweight'),
  (null, 'Kabel-Crunches', 'Cable crunch', 'core', 'cable'),
  (null, 'Ab Wheel', 'Ab wheel rollout', 'core', 'other');
