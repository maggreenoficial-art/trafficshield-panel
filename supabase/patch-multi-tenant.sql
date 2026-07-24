-- Multi-tenancy: cada assinatura/cliente tem dados isolados
-- Rode no SQL Editor do Supabase (projeto norat)

-- 1) Organizações (workspaces)
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  plan text not null default 'starter'
    check (plan in ('starter', 'pro', 'enterprise')),
  domain_slot_limit int not null default 3,
  status text not null default 'active'
    check (status in ('active', 'suspended', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tenants_slug_idx on public.tenants(slug);

-- 2) Membros por organização
create table if not exists public.tenant_members (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner'
    check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

create index if not exists tenant_members_user_idx on public.tenant_members(user_id);

-- 3) Colunas tenant_id nas tabelas de dados
alter table public.traffic_domains
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;

alter table public.traffic_campaigns
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;

alter table public.traffic_campaign_clicks
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;

alter table public.traffic_logs
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;

alter table public.app_config
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;

-- 4) Tenant padrão + backfill dos dados existentes
insert into public.tenants (id, name, slug, plan, domain_slot_limit)
values (
  '00000000-0000-0000-0000-000000000001',
  'Conta principal',
  'principal',
  'enterprise',
  10
)
on conflict (slug) do nothing;

update public.traffic_domains
set tenant_id = '00000000-0000-0000-0000-000000000001'
where tenant_id is null;

update public.traffic_campaigns
set tenant_id = '00000000-0000-0000-0000-000000000001'
where tenant_id is null;

update public.traffic_campaign_clicks c
set tenant_id = camp.tenant_id
from public.traffic_campaigns camp
where c.campaign_id = camp.id and c.tenant_id is null;

update public.traffic_logs
set tenant_id = '00000000-0000-0000-0000-000000000001'
where tenant_id is null;

-- app_config: atribui tenant a TODAS as linhas (não só traffic_shield)
update public.app_config
set tenant_id = '00000000-0000-0000-0000-000000000001'
where tenant_id is null;

-- Remove qualquer linha órfã que não pôde receber tenant
delete from public.app_config where tenant_id is null;

-- Vincula admins existentes ao tenant principal
insert into public.tenant_members (tenant_id, user_id, role)
select
  '00000000-0000-0000-0000-000000000001',
  p.id,
  'owner'
from public.profiles p
where p.role = 'admin'
on conflict (tenant_id, user_id) do nothing;

-- 5) Unicidade por tenant (hostname e slug globais continuam únicos no DNS)
create unique index if not exists traffic_domains_tenant_hostname_idx
  on public.traffic_domains(tenant_id, hostname);

create unique index if not exists traffic_campaigns_tenant_slug_idx
  on public.traffic_campaigns(tenant_id, slug);

-- 5b) PK composta em app_config (só após zerar nulls em tenant_id)
do $$
begin
  if exists (
    select 1
    from public.app_config
    where tenant_id is null
  ) then
    raise exception 'app_config ainda tem tenant_id NULL. Rode supabase/patch-multi-tenant-fix.sql';
  end if;

  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.app_config'::regclass
      and contype = 'p'
      and conname = 'app_config_pkey'
  ) then
    alter table public.app_config drop constraint app_config_pkey;
  end if;
end $$;

drop index if exists app_config_tenant_key_idx;

alter table public.app_config
  drop constraint if exists app_config_pkey;

alter table public.app_config
  add constraint app_config_pkey primary key (tenant_id, key);

-- 6) NOT NULL após backfill (rode só quando não houver nulls)
-- alter table public.traffic_domains alter column tenant_id set not null;
-- alter table public.traffic_campaigns alter column tenant_id set not null;

-- 7) RLS
alter table public.tenants enable row level security;
alter table public.tenant_members enable row level security;

create or replace function public.user_tenant_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select tenant_id from public.tenant_members where user_id = auth.uid();
$$;

drop policy if exists "tenants_select_member" on public.tenants;
create policy "tenants_select_member" on public.tenants
  for select using (id in (select public.user_tenant_ids()));

drop policy if exists "tenant_members_select_own" on public.tenant_members;
create policy "tenant_members_select_own" on public.tenant_members
  for select using (user_id = auth.uid());

drop policy if exists "traffic_domains_tenant" on public.traffic_domains;
create policy "traffic_domains_tenant" on public.traffic_domains
  for all using (tenant_id in (select public.user_tenant_ids()));

drop policy if exists "traffic_campaigns_tenant" on public.traffic_campaigns;
create policy "traffic_campaigns_tenant" on public.traffic_campaigns
  for all using (tenant_id in (select public.user_tenant_ids()));

drop policy if exists "traffic_campaign_clicks_tenant" on public.traffic_campaign_clicks;
create policy "traffic_campaign_clicks_tenant" on public.traffic_campaign_clicks
  for all using (tenant_id in (select public.user_tenant_ids()));

drop policy if exists "traffic_logs_tenant" on public.traffic_logs;
create policy "traffic_logs_tenant" on public.traffic_logs
  for all using (tenant_id in (select public.user_tenant_ids()));

drop policy if exists "app_config_tenant" on public.app_config;
create policy "app_config_tenant" on public.app_config
  for all using (tenant_id in (select public.user_tenant_ids()));

-- 8) Config padrão por tenant (novos clientes)
insert into public.app_config (key, value, tenant_id)
select
  'traffic_shield',
  '{"enabled":true,"mode":"protect","blockBots":true,"blockScrapers":true,"blockHeadless":true,"blockEmptyUa":true,"allowSearchEngines":true,"protectCampaigns":true,"hidePricingFromBots":true,"blockThreshold":75,"suspiciousThreshold":45,"safePagePath":"/","allowedCountries":[],"blockedCountries":[],"ipWhitelist":[],"ipBlacklist":[],"mlSensitivity":0.7}'::jsonb,
  t.id
from public.tenants t
where not exists (
  select 1 from public.app_config c
  where c.tenant_id = t.id and c.key = 'traffic_shield'
);
