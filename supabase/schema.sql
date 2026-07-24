-- Traffic Shield Panel — schema Supabase
-- Rode no SQL Editor do projeto dedicado ao painel

create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.app_config (key, value) values
  ('traffic_shield', '{"enabled":true,"mode":"protect","blockBots":true,"blockScrapers":true,"blockHeadless":true,"blockEmptyUa":true,"allowSearchEngines":true,"protectCampaigns":true,"hidePricingFromBots":true,"blockThreshold":75,"suspiciousThreshold":45,"safePagePath":"/","allowedCountries":[],"blockedCountries":[],"ipWhitelist":[],"ipBlacklist":[],"mlSensitivity":0.7}')
on conflict (key) do nothing;

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

create table if not exists public.traffic_domains (
  id uuid primary key default gen_random_uuid(),
  hostname text not null unique,
  label text,
  is_primary boolean not null default false,
  status text not null default 'pending'
    check (status in ('pending', 'valid', 'invalid')),
  last_checked_at timestamptz,
  validation_message text,
  created_at timestamptz not null default now()
);

create table if not exists public.traffic_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  domain_id uuid references public.traffic_domains(id) on delete set null,
  traffic_source text not null default 'meta',
  allowed_countries text[] not null default '{}',
  allowed_devices text[] not null default '{}',
  safe_page_url text not null,
  offer_page_url text not null,
  delivery_method text not null default 'redirect'
    check (delivery_method in ('redirect', 'pre_page', 'mirror', 'unpack')),
  offer_delivery_method text not null default 'redirect'
    check (offer_delivery_method in ('redirect', 'mirror', 'unpack')),
  unique_token_enabled boolean not null default true,
  unique_token text not null,
  custom_path_enabled boolean not null default false,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'paused')),
  clicks_offer integer not null default 0,
  clicks_safe integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists traffic_campaigns_slug_idx on public.traffic_campaigns(slug);

create table if not exists public.traffic_campaign_clicks (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.traffic_campaigns(id) on delete cascade,
  destination text not null check (destination in ('offer', 'safe')),
  country text,
  device text,
  traffic_source text,
  ip_hash text not null,
  reasons text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists traffic_campaign_clicks_campaign_idx on public.traffic_campaign_clicks(campaign_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'customer')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.app_config enable row level security;
alter table public.traffic_logs enable row level security;
alter table public.traffic_domains enable row level security;
alter table public.traffic_campaigns enable row level security;
alter table public.traffic_campaign_clicks enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);
