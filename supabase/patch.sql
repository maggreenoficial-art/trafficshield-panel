-- Patch rápido: rode SOMENTE este arquivo se o schema completo já falhou antes.
-- Corrige analytics_events + adiciona traffic_shield

-- 1. Colunas faltantes em analytics_events
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

alter table public.analytics_events add column if not exists type text;
alter table public.analytics_events add column if not exists session_id text;
alter table public.analytics_events add column if not exists path text;
alter table public.analytics_events add column if not exists product_id text;
alter table public.analytics_events add column if not exists product_name text;
alter table public.analytics_events add column if not exists variant_id text;
alter table public.analytics_events add column if not exists value numeric(10,2);
alter table public.analytics_events add column if not exists order_id text;
alter table public.analytics_events add column if not exists source text default 'browser';
alter table public.analytics_events add column if not exists event_id text;

update public.analytics_events set type = 'page_view' where type is null;
update public.analytics_events set source = 'browser' where source is null;

create index if not exists analytics_events_type_idx on public.analytics_events(type);
create index if not exists analytics_events_created_at_idx on public.analytics_events(created_at desc);

-- 2. Traffic Shield
create table if not exists public.traffic_logs (
  id uuid primary key default gen_random_uuid(),
  ip_hash text not null,
  user_agent text,
  path text not null,
  action text not null check (action in ('allow', 'suspicious', 'block', 'safe_page')),
  score integer not null default 0,
  reasons text[] not null default '{}',
  category text not null default 'human',
  country text,
  created_at timestamptz not null default now()
);

create index if not exists traffic_logs_created_at_idx on public.traffic_logs(created_at desc);
create index if not exists traffic_logs_action_idx on public.traffic_logs(action);
create index if not exists traffic_logs_category_idx on public.traffic_logs(category);

alter table public.traffic_logs enable row level security;

insert into public.app_config (key, value) values
  ('traffic_shield', '{"enabled":true,"mode":"protect","blockBots":true,"blockScrapers":true,"blockHeadless":true,"blockEmptyUa":true,"allowSearchEngines":true,"protectCampaigns":true,"hidePricingFromBots":true,"blockThreshold":75,"suspiciousThreshold":45,"safePagePath":"/bem-estar","allowedCountries":[],"blockedCountries":[],"ipWhitelist":[],"ipBlacklist":[],"mlSensitivity":0.7}')
on conflict (key) do nothing;
