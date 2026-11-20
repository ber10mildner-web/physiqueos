-- The server-side (secret key) client is used by the Claude connection and the
-- Garmin sync. Newer Supabase projects do not grant table privileges to
-- service_role automatically either, so grant them explicitly.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
