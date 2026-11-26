-- Sigma: flexible rhythms for medications / supplements, and widget addresses.
-- Besides fixed weekdays (auto_days): every N days (e.g. every 2nd day) and an
-- optional on/off cycle (e.g. 21 days on, 7 days off), both counted from
-- schedule_start. Logic: src/lib/medication-schedule.ts.
-- Run once in the Supabase SQL Editor after the earlier migrations.

alter table public.medications
  add column if not exists every_days smallint check (every_days between 2 and 60),
  add column if not exists cycle_on_days smallint check (cycle_on_days between 1 and 365),
  add column if not exists cycle_off_days smallint check (cycle_off_days between 1 and 365),
  add column if not exists schedule_start date;

alter table public.medications
  drop constraint if exists medications_cycle_both,
  add constraint medications_cycle_both check ((cycle_on_days is null) = (cycle_off_days is null));

-- ---------------------------------------------------------------------------
-- Widget addresses: a personal token that only opens /api/widget/<token>
-- (today's remaining calories and macros), never the Claude connector.
-- ---------------------------------------------------------------------------
alter table public.api_tokens
  add column if not exists scope text not null default 'mcp' check (scope in ('mcp', 'widget'));
