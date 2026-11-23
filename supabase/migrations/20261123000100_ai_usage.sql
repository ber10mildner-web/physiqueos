-- ---------------------------------------------------------------------------
-- In-app AI (photo meal logging, cardio display reading): one row per paid
-- Claude API call, so the cost per user is visible and can be capped
-- (monthly budget + daily photo limit, see src/lib/ai/usage.ts).
--
-- Users may read and add their own rows but never change or delete them,
-- so nobody can lower their own usage to get around the cap.
-- ---------------------------------------------------------------------------
create table public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  feature text not null check (feature in ('meal_photo', 'cardio_display')),
  model text not null check (char_length(model) <= 100),
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  cost_eur numeric(10, 5) not null default 0 check (cost_eur >= 0),
  created_at timestamptz not null default now()
);

create index ai_usage_user_created on public.ai_usage (user_id, created_at desc);

alter table public.ai_usage enable row level security;

create policy "ai_usage: read own" on public.ai_usage for select to authenticated
  using (user_id = (select auth.uid()));
create policy "ai_usage: add own" on public.ai_usage for insert to authenticated
  with check (user_id = (select auth.uid()));

grant select, insert on public.ai_usage to authenticated;
revoke update, delete, truncate on public.ai_usage from authenticated;
grant all on public.ai_usage to service_role;
revoke all on public.ai_usage from anon;
