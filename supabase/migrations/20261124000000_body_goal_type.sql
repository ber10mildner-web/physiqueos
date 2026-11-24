-- Sigma: body goal beyond a goal weight (fat loss while keeping muscle, recomp,
-- muscle gain, maintain), training level and the user's own description, plus
-- waist measurements as a second progress signal next to the scale.
-- Run once in the Supabase SQL Editor after the earlier migrations. Safe to run again.

alter table public.profiles
  add column if not exists goal_type text
    check (goal_type is null or goal_type in ('fat_loss', 'recomp', 'muscle_gain', 'maintain')),
  add column if not exists training_level text
    check (training_level is null or training_level in ('beginner', 'intermediate', 'advanced')),
  add column if not exists goal_note text
    check (goal_note is null or char_length(goal_note) <= 1000);

create table if not exists public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_date date not null,
  waist_cm numeric(4, 1) not null check (waist_cm between 40 and 200),
  source text not null default 'manual' check (source in ('manual', 'claude')),
  created_at timestamptz not null default now(),
  unique (user_id, entry_date)
);

alter table public.body_measurements enable row level security;

drop policy if exists "body_measurements: own rows" on public.body_measurements;
create policy "body_measurements: own rows" on public.body_measurements for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Privileges (newer Supabase projects do not grant these automatically)
grant select, insert, update, delete on public.body_measurements to authenticated;
grant all on public.body_measurements to service_role;
revoke all on public.body_measurements from anon;
