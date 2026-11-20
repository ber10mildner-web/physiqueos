-- Explicit API privileges. Older Supabase projects grant these automatically on
-- new tables in "public"; newer projects may not. Row Level Security still
-- restricts every row to its owner. The anon role gets no table access at all.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
revoke all on all tables in schema public from anon;
