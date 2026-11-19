-- PhysiqueOS – initial schema (milestone 1)
--
-- Principles
-- * Every user-owned row carries user_id and is protected by Row Level Security.
--   The app is single-user today but must be safe for many users later.
-- * Nutrient values are stored per 100 g in a jsonb map (see src/lib/nutrition/nutrients.ts
--   for the list of keys and units). A missing key means "unknown", never zero.
-- * Diary entries keep a snapshot of the nutrient values that were used, so
--   editing or re-importing a food never rewrites history.
-- * Externally sourced data keeps its source and identifier.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.sex as enum ('male', 'female');
create type public.activity_level as enum ('sedentary', 'light', 'moderate', 'active', 'very_active');
create type public.nutrition_phase as enum ('cut', 'maintenance', 'lean_bulk', 'custom');
create type public.meal_slot as enum ('breakfast', 'lunch', 'dinner', 'snack');
create type public.food_source as enum ('openfoodfacts', 'usda', 'custom');
create type public.photo_pose as enum ('front', 'side', 'back', 'other');

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  locale text not null default 'de' check (locale in ('de', 'en')),
  sex public.sex,
  birth_date date,
  height_cm numeric(5, 1) check (height_cm between 100 and 250),
  activity_level public.activity_level,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Nutrition goals (history of phases; the current goal is the latest valid_from <= today)
-- ---------------------------------------------------------------------------
create table public.nutrition_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  valid_from date not null,
  phase public.nutrition_phase not null,
  energy_kcal integer not null check (energy_kcal between 800 and 8000),
  protein_g integer not null check (protein_g between 0 and 600),
  carbs_g integer not null check (carbs_g between 0 and 1200),
  fat_g integer not null check (fat_g between 0 and 400),
  fiber_g integer not null check (fiber_g between 0 and 150),
  created_at timestamptz not null default now(),
  unique (user_id, valid_from)
);

-- ---------------------------------------------------------------------------
-- Foods (per-user library: imported external products and custom foods)
-- ---------------------------------------------------------------------------
create table public.foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source public.food_source not null,
  -- external identifier: barcode for Open Food Facts, fdcId for USDA, null for custom
  source_id text,
  source_url text,
  name text not null check (char_length(name) between 1 and 200),
  brand text,
  barcode text check (barcode ~ '^[0-9]{6,14}$'),
  serving_size_g numeric(7, 2) check (serving_size_g > 0),
  image_url text,
  -- nutrient values per 100 g, keys from src/lib/nutrition/nutrients.ts
  nutrients jsonb not null default '{}'::jsonb check (jsonb_typeof(nutrients) = 'object'),
  fetched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint foods_external_has_id check (source = 'custom' or source_id is not null),
  -- one library entry per external product; NULL source_ids (custom foods) never conflict
  constraint foods_user_source_id_key unique (user_id, source, source_id)
);
create index foods_user_barcode_idx on public.foods (user_id, barcode) where barcode is not null;

-- ---------------------------------------------------------------------------
-- Diary entries
-- ---------------------------------------------------------------------------
create table public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_date date not null,
  meal public.meal_slot not null,
  food_id uuid references public.foods (id) on delete set null,
  -- snapshot at the time of logging
  food_name text not null,
  food_brand text,
  source public.food_source not null,
  source_id text,
  nutrients_per_100g jsonb not null check (jsonb_typeof(nutrients_per_100g) = 'object'),
  amount_g numeric(7, 1) not null check (amount_g > 0 and amount_g <= 5000),
  created_at timestamptz not null default now()
);

create index diary_entries_user_date_idx on public.diary_entries (user_id, entry_date);
create index diary_entries_food_idx on public.diary_entries (food_id);

-- ---------------------------------------------------------------------------
-- Body weight
-- ---------------------------------------------------------------------------
create table public.weight_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_date date not null,
  weight_kg numeric(5, 2) not null check (weight_kg between 20 and 400),
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  unique (user_id, entry_date)
);

-- ---------------------------------------------------------------------------
-- Progress photos (files live in the private storage bucket "progress-photos")
-- ---------------------------------------------------------------------------
create table public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  taken_on date not null,
  pose public.photo_pose not null default 'front',
  storage_path text not null unique,
  width integer,
  height integer,
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  -- the object must sit in the owner's folder: <user_id>/<file>
  constraint progress_photos_path_owner check (split_part(storage_path, '/', 1) = user_id::text)
);

create index progress_photos_user_date_idx on public.progress_photos (user_id, taken_on desc);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger foods_updated_at before update on public.foods
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Create a profile row for every new auth user
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, locale)
  values (
    new.id,
    case when new.raw_user_meta_data ->> 'locale' in ('de', 'en')
      then new.raw_user_meta_data ->> 'locale' else 'de' end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security: every user sees and changes only their own rows
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.nutrition_goals enable row level security;
alter table public.foods enable row level security;
alter table public.diary_entries enable row level security;
alter table public.weight_entries enable row level security;
alter table public.progress_photos enable row level security;

create policy "profiles: own row" on public.profiles
  for all to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "nutrition_goals: own rows" on public.nutrition_goals
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "foods: own rows" on public.foods
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "diary_entries: own rows" on public.diary_entries
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (food_id is null or exists (
      select 1 from public.foods f where f.id = food_id and f.user_id = (select auth.uid())
    ))
  );

create policy "weight_entries: own rows" on public.weight_entries
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "progress_photos: own rows" on public.progress_photos
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
