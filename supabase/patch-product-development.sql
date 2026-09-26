-- Desenvolvimento de produto (admin): docs, páginas de referência, copy e publicação no domínio.
-- Rode no SQL Editor do Supabase.

CREATE TABLE IF NOT EXISTS public.product_developments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  brief text NOT NULL DEFAULT '',
  docs jsonb NOT NULL DEFAULT '[]'::jsonb,
  reference_pages jsonb NOT NULL DEFAULT '[]'::jsonb,
  plan jsonb,
  page_html text NOT NULL DEFAULT '',
  storyboard_id uuid,
  publish_hostname text,
  publish_path text NOT NULL DEFAULT '/',
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'ready', 'published')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_developments_tenant_updated_idx
  ON public.product_developments (tenant_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS product_developments_publish_idx
  ON public.product_developments (publish_hostname, status);

ALTER TABLE public.product_developments ENABLE ROW LEVEL SECURITY;
