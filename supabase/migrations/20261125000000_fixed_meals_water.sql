-- Sigma: fixed meals on chosen weekdays (e.g. the same breakfast every Monday to
-- Friday) and water tracking as an opt-in setting.
-- Run once in the Supabase SQL Editor after the earlier migrations.

-- ---------------------------------------------------------------------------
-- Fixed meals. items = snapshot of the diary entries the meal was saved from:
-- [{"food_id", "recipe_id", "food_name", "food_brand", "source", "source_id",
--   "nutrients_per_100g", "amount_g"}, …]. On the chosen ISO weekdays
-- (1 = Monday … 7 = Sunday) Sigma fills the meal in by itself when it is still
-- empty that day (same mechanism as cardio and supplement routines).
-- ---------------------------------------------------------------------------
create table public.meal_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  meal public.meal_slot not null,
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 40),
  auto_days smallint[] not null default '{}' check (auto_days <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]),
  auto_from date not null default current_date,
  created_at timestamptz not null default now()
);
create index meal_templates_user_idx on public.meal_templates (user_id);

alter table public.meal_templates enable row level security;
create policy "meal_templates: own rows" on public.meal_templates for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

grant select, insert, update, delete on public.meal_templates to authenticated;
grant all on public.meal_templates to service_role;
revoke all on public.meal_templates from anon;

-- Routine runs may now also be fixed meals.
alter table public.routine_runs drop constraint if exists routine_runs_kind_check;
alter table public.routine_runs add constraint routine_runs_kind_check check (kind in ('cardio', 'supplement', 'meal'));

-- ---------------------------------------------------------------------------
-- Water tracking is off unless the user switches it on in the settings.
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists water_tracking boolean not null default false;
