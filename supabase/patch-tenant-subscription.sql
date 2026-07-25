-- Assinatura por tenant (plano + período)
-- Rode no SQL Editor do Supabase

alter table public.tenants
  add column if not exists subscription_starts_at timestamptz,
  add column if not exists subscription_ends_at timestamptz,
  add column if not exists billing_interval text not null default 'monthly'
    check (billing_interval in ('monthly', 'yearly'));

-- Backfill: clientes existentes ganham 30 dias a partir da criação
update public.tenants
set
  subscription_starts_at = coalesce(subscription_starts_at, created_at),
  subscription_ends_at = coalesce(
    subscription_ends_at,
    created_at + interval '30 days'
  ),
  billing_interval = coalesce(billing_interval, 'monthly')
where subscription_starts_at is null or subscription_ends_at is null;
