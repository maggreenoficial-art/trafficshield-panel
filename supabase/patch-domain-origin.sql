-- Patch: URL de origem do site (proxy reverso — site continua no ar)
alter table public.traffic_domains
  add column if not exists origin_url text;

comment on column public.traffic_domains.origin_url is
  'Backend onde o site real está hospedado (ex: destino Vercel/IP). O norat faz proxy de todo tráfego que não for /c/*.';
