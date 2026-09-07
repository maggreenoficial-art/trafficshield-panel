-- Storyboards + créditos + criativos (Kie AI)
-- Rode no SQL Editor do Supabase após o schema base / multi-tenant.

CREATE TABLE IF NOT EXISTS public.tenant_credits (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  delta integer NOT NULL,
  reason text NOT NULL,
  ref_type text,
  ref_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS credit_ledger_tenant_created_idx
  ON public.credit_ledger (tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.storyboards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT 'Organize suas ideias e comece uma nova produção',
  cover_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS storyboards_tenant_updated_idx
  ON public.storyboards (tenant_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.storyboard_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  storyboard_id uuid NOT NULL REFERENCES public.storyboards(id) ON DELETE CASCADE,
  model_key text NOT NULL,
  prompt text NOT NULL DEFAULT '',
  aspect_ratio text NOT NULL DEFAULT 'auto',
  resolution text NOT NULL DEFAULT '1K',
  reference_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  position_x double precision NOT NULL DEFAULT 120,
  position_y double precision NOT NULL DEFAULT 120,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'queued', 'generating', 'success', 'fail')),
  result_url text,
  result_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  kie_task_id text,
  kie_model text,
  credits_charged integer NOT NULL DEFAULT 0,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS storyboard_blocks_board_idx
  ON public.storyboard_blocks (storyboard_id, created_at ASC);

CREATE INDEX IF NOT EXISTS storyboard_blocks_kie_task_idx
  ON public.storyboard_blocks (kie_task_id)
  WHERE kie_task_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.creative_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS creative_folders_tenant_idx
  ON public.creative_folders (tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.creatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  folder_id uuid REFERENCES public.creative_folders(id) ON DELETE SET NULL,
  storyboard_id uuid REFERENCES public.storyboards(id) ON DELETE SET NULL,
  block_id uuid REFERENCES public.storyboard_blocks(id) ON DELETE SET NULL,
  media_type text NOT NULL CHECK (media_type IN ('image', 'video')),
  url text NOT NULL,
  thumbnail_url text,
  prompt text,
  model_key text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS creatives_tenant_created_idx
  ON public.creatives (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS creatives_folder_idx
  ON public.creatives (folder_id, created_at DESC);

ALTER TABLE public.tenant_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storyboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storyboard_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creative_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creatives ENABLE ROW LEVEL SECURITY;
