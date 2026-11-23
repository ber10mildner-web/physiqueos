-- ---------------------------------------------------------------------------
-- Public launch waitlist (/warteliste): visitors without an account leave
-- their e-mail address.
--
-- Nobody can read or change the list through the API: the table has RLS on,
-- no policies and no grants for anon/authenticated. Visitors can only add an
-- address through join_waitlist(), which never reveals whether an address is
-- already on the list. Read the list in the Supabase dashboard (Table Editor)
-- or with the service role.
-- ---------------------------------------------------------------------------
create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique
    check (char_length(email) between 6 and 254 and email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  -- Where the visitor came from, e.g. "tiktok" from /warteliste?ref=tiktok.
  source text check (source is null or source ~ '^[a-z0-9_-]{1,40}$'),
  consent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.waitlist enable row level security;

revoke all on public.waitlist from anon, authenticated;
grant all on public.waitlist to service_role;

create function public.join_waitlist(p_email text, p_source text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_source text := lower(trim(coalesce(p_source, '')));
begin
  if v_source !~ '^[a-z0-9_-]{1,40}$' then
    v_source := null;
  end if;
  insert into public.waitlist (email, source)
  values (lower(trim(p_email)), v_source)
  on conflict (email) do nothing;
end;
$$;

revoke all on function public.join_waitlist(text, text) from public;
grant execute on function public.join_waitlist(text, text) to anon, authenticated, service_role;
