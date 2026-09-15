-- Análise de campanha (3 CSVs do Gerenciador + campeões por tema)
-- Rode no SQL Editor do Supabase.

CREATE TABLE IF NOT EXISTS public.campaign_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT 'Análise de campanha',
  campaign_file_name text,
  adset_file_name text,
  ad_file_name text,
  campaign_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  adset_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  ad_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS campaign_analyses_tenant_created_idx
  ON public.campaign_analyses (tenant_id, created_at DESC);

ALTER TABLE public.campaign_analyses ENABLE ROW LEVEL SECURITY;
