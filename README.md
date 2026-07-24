# norat

Painel SaaS anti-ratos — proteção de campanhas contra clonadores, bots e revisores.

**Início** + **Proteção** (domínios, campanhas, estatísticas).

Hospede em um domínio separado (ex: `painel.seudominio.com.br`) para oferecer aos clientes sem expor o site principal.

## Rotas

| Rota | Descrição |
|------|-----------|
| `/` | Início — visão geral e métricas 24h |
| `/trafego` | Proteção norat completa |
| `/login` | Login admin (Supabase Auth) |

## Setup

```bash
npm install
cp .env.example .env.local
# Preencha Supabase + variáveis norat
npm run dev
```

### Supabase

1. Crie um **projeto Supabase novo** (separado da loja)
2. Rode `supabase/schema.sql` no SQL Editor
3. Rode os patches em `supabase/patch-*.sql` se necessário
4. Crie usuário admin e promova: `supabase/setup-admin.sql`

### Deploy (Vercel)

- Conecte este repositório
- Configure as env vars do `.env.example`
- Domínio próprio para o painel

## Integração no site do cliente

O middleware norat (`src/lib/traffic-shield/`) deve ser instalado no **site que recebe o tráfego** (loja/landing do cliente), apontando para o mesmo Supabase ou API compartilhada.

Este repositório contém o **painel de gerenciamento**.

## Stack

- Next.js 16 · React 19 · TypeScript · Tailwind 4
- Supabase Auth + Postgres
- Recharts
