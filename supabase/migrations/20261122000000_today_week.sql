-- Sigma: training days for plans (start page "today / tomorrow") and Garmin
-- calories for the daily total burn.
-- Run once in the Supabase SQL Editor after the earlier migrations.

-- ISO weekdays (1 = Monday … 7 = Sunday) on which a training plan is usually done.
alter table public.workout_plans
  add column if not exists schedule_days smallint[] not null default '{}'
    check (schedule_days <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]);

-- Garmin: active calories and resting energy (BMR) per day.
alter table public.daily_health
  add column if not exists active_kcal integer check (active_kcal between 0 and 20000),
  add column if not exists bmr_kcal integer check (bmr_kcal between 500 and 6000);
