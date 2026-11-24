-- ---------------------------------------------------------------------------
-- 1. Nutrition-label photo: a new kind of paid AI call in ai_usage.
-- 2. Shared cache for Open Food Facts (src/lib/food-sources/off-cache.ts), so
--    "Open Food Facts ist gerade nicht erreichbar" rarely shows up: earlier
--    hits are served from here when OFF is slow or down.
--
-- off_cache holds only public product data (no user data). App users get no
-- access at all; only the server (service_role, admin client) reads/writes it.
-- ---------------------------------------------------------------------------
alter table public.ai_usage drop constraint if exists ai_usage_feature_check;
alter table public.ai_usage add constraint ai_usage_feature_check
  check (feature in ('meal_photo', 'cardio_display', 'food_label'));

create table if not exists public.off_cache (
  key text primary key check (char_length(key) <= 400),
  kind text not null check (kind in ('product', 'search')),
  name text check (char_length(name) <= 300),
  data jsonb not null,
  fetched_at timestamptz not null default now()
);

create index if not exists off_cache_products_recent on public.off_cache (fetched_at desc) where kind = 'product';

alter table public.off_cache enable row level security;
revoke all on public.off_cache from anon, authenticated;
grant all on public.off_cache to service_role;
