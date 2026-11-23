-- Sigma: the user's own order of the foods inside a meal (drag with the finger).
-- Run once in the Supabase SQL Editor after the earlier migrations.

-- Position inside the meal (0, 1, 2, …). null = not sorted yet: such entries
-- come after the sorted ones, in the order they were added.
alter table public.diary_entries
  add column if not exists sort_order integer check (sort_order is null or sort_order >= 0);
