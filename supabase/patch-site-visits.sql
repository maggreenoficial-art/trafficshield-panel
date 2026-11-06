-- Visitas da página pública do norat. Uma linha por visitante por dia.
-- Escrita só pelo servidor (service role). Sem policy para o navegador.

create table if not exists public.site_visits (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  visitor_key text not null,
  visited_on date not null,
  created_at timestamptz not null default now(),
  unique (visitor_key, visited_on)
);

create index if not exists site_visits_created_at_idx
  on public.site_visits (created_at desc);

alter table public.site_visits enable row level security;

revoke all on table public.site_visits from anon, authenticated;
