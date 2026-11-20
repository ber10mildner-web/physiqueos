-- Garmin Connect (unofficial) connection.
-- The DI OAuth2 tokens are stored AES-256-GCM encrypted (key only in the server
-- environment, GARMIN_TOKEN_KEY). The browser may read the status columns but
-- never the encrypted tokens; all writes happen server-side with the secret key.

create table public.garmin_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  enc_tokens text not null,
  display_name text,
  time_zone text not null default 'Europe/Berlin',
  status text not null default 'ok' check (status in ('ok', 'error')),
  last_error text,
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.garmin_connections enable row level security;

create policy "garmin: read own" on public.garmin_connections
  for select to authenticated using (user_id = (select auth.uid()));
create policy "garmin: delete own" on public.garmin_connections
  for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.garmin_connections from anon, authenticated;
grant select (user_id, display_name, status, last_error, last_sync_at, created_at) on public.garmin_connections to authenticated;
grant delete on public.garmin_connections to authenticated;
grant all on public.garmin_connections to service_role;
