-- Sigma: meals before and after training, and meals each user can choose,
-- rename and order (e.g. "Snacks" → "Supplemente").
-- Run once in the Supabase SQL Editor after the earlier migrations.

alter type public.meal_slot add value if not exists 'pre_workout';
alter type public.meal_slot add value if not exists 'post_workout';

-- The user's meals in order: [{"key": "breakfast", "name": null}, {"key": "snack", "name": "Supplemente"}, …]
-- null = Sigma's default (breakfast, lunch, dinner, snacks).
alter table public.profiles
  add column if not exists meal_slots jsonb check (meal_slots is null or jsonb_typeof(meal_slots) = 'array');
