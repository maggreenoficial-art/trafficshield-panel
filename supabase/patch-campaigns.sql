-- Patch: campanhas de proteção de tráfego
-- Rode este arquivo se já executou o schema anterior

create table if not exists public.traffic_domains (
  id uuid primary key default gen_random_uuid(),
  hostname text not null unique,
  label text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.traffic_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  domain_id uuid references public.traffic_domains(id) on delete set null,
  traffic_source text not null default 'meta',
  allowed_countries text[] not null default '{BR}',
  allowed_devices text[] not null default '{mobile,desktop,tablet}',
  safe_page_url text not null,
  offer_page_url text not null,
  delivery_method text not null default 'redirect'
    check (delivery_method in ('redirect', 'pre_page', 'mirror', 'unpack')),
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
create index if not exists traffic_campaigns_status_idx on public.traffic_campaigns(status);

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
create index if not exists traffic_campaign_clicks_created_at_idx on public.traffic_campaign_clicks(created_at desc);

alter table public.traffic_domains enable row level security;
alter table public.traffic_campaigns enable row level security;
alter table public.traffic_campaign_clicks enable row level security;
