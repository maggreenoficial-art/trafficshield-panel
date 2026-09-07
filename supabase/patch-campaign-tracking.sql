-- Tracking: params no clique + conversões de venda (purchase / order_bump)
-- Rode no SQL Editor do Supabase

alter table public.traffic_campaign_clicks
  add column if not exists query_params jsonb not null default '{}'::jsonb,
  add column if not exists click_id text,
  add column if not exists visitor_key text;

create index if not exists traffic_campaign_clicks_click_id_idx
  on public.traffic_campaign_clicks (click_id)
  where click_id is not null;

create index if not exists traffic_campaign_clicks_visitor_key_idx
  on public.traffic_campaign_clicks (visitor_key)
  where visitor_key is not null;

create table if not exists public.traffic_campaign_conversions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  campaign_id uuid not null references public.traffic_campaigns(id) on delete cascade,
  click_row_id uuid references public.traffic_campaign_clicks(id) on delete set null,
  event text not null check (event in ('purchase', 'order_bump')),
  value numeric(12, 2) not null default 0,
  currency text not null default 'BRL',
  order_id text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists traffic_campaign_conversions_campaign_idx
  on public.traffic_campaign_conversions (campaign_id);

create index if not exists traffic_campaign_conversions_created_at_idx
  on public.traffic_campaign_conversions (created_at desc);

create unique index if not exists traffic_campaign_conversions_idempotent_idx
  on public.traffic_campaign_conversions (campaign_id, order_id, event)
  where order_id is not null;

alter table public.traffic_campaign_conversions enable row level security;

drop policy if exists "traffic_campaign_conversions_tenant" on public.traffic_campaign_conversions;
create policy "traffic_campaign_conversions_tenant" on public.traffic_campaign_conversions
  for all using (tenant_id in (select public.user_tenant_ids()));

comment on table public.traffic_campaign_conversions is
  'Conversões de venda via postback (purchase / order_bump).';

comment on column public.traffic_campaign_clicks.query_params is
  'Parâmetros de ads capturados no clique (fbclid, utm_*, etc.).';
