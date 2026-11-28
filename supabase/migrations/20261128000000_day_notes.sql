-- Sigma: day notes, a small journal per day (e.g. "arm cramp, took potassium").
-- One entry per user and day: free text plus tags, so reviews can link days
-- with weight, training and nutrition. Tags live in src/lib/data/types.ts (DAY_TAGS).
-- Run once in the Supabase SQL Editor after the earlier migrations.

create table if not exists public.day_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_date date not null,
  note text check (char_length(note) <= 2000),
  tags text[] not null default '{}'
    check (tags <@ array['sick', 'pain', 'poor_sleep', 'stress', 'travel', 'alcohol', 'eating_out']::text[]),
  source text not null default 'manual' check (source in ('manual', 'claude')),
  updated_at timestamptz not null default now(),
  unique (user_id, entry_date)
);

alter table public.day_notes enable row level security;

drop policy if exists "day_notes: own rows" on public.day_notes;
create policy "day_notes: own rows" on public.day_notes for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Privileges (newer Supabase projects do not grant these automatically)
grant select, insert, update, delete on public.day_notes to authenticated;
grant all on public.day_notes to service_role;
revoke all on public.day_notes from anon;
