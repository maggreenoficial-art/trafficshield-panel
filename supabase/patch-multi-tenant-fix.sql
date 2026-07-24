-- Correção: rode ESTE arquivo se o patch-multi-tenant.sql falhou em app_config
-- Erro típico: column "tenant_id" of relation "app_config" contains null values

-- 1) Garante tenant principal
insert into public.tenants (id, name, slug, plan, domain_slot_limit)
values (
  '00000000-0000-0000-0000-000000000001',
  'Conta principal',
  'principal',
  'enterprise',
  10
)
on conflict (slug) do nothing;

-- 2) Coluna tenant_id (se ainda não existir)
alter table public.app_config
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;

-- 3) Atribui tenant a todas as linhas sem tenant
update public.app_config
set tenant_id = '00000000-0000-0000-0000-000000000001'
where tenant_id is null;

-- 4) Remove órfãos (se houver)
delete from public.app_config where tenant_id is null;

-- 5) Remove duplicatas (tenant_id + key) mantendo uma linha
delete from public.app_config a
using public.app_config b
where a.tenant_id = b.tenant_id
  and a.key = b.key
  and a.ctid < b.ctid;

-- 6) Troca PK antiga (só key) pela composta (tenant_id, key)
alter table public.app_config drop constraint if exists app_config_pkey;
drop index if exists app_config_tenant_key_idx;

alter table public.app_config
  add constraint app_config_pkey primary key (tenant_id, key);

-- 7) Config padrão para tenants sem traffic_shield
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

-- 8) Vincula admins ao tenant principal (se ainda não)
insert into public.tenant_members (tenant_id, user_id, role)
select
  '00000000-0000-0000-0000-000000000001',
  p.id,
  'owner'
from public.profiles p
where p.role = 'admin'
on conflict (tenant_id, user_id) do nothing;

select 'app_config OK' as status, count(*) as linhas from public.app_config;
