-- Patch: colunas de validação em traffic_domains
alter table public.traffic_domains add column if not exists status text not null default 'pending';
alter table public.traffic_domains add column if not exists last_checked_at timestamptz;
alter table public.traffic_domains add column if not exists validation_message text;

update public.traffic_domains set status = 'valid' where status is null or status = 'pending';
