-- Flow plug-and-play: bloco pai (ex.: imagem) → bloco filho (ex.: vídeo)
ALTER TABLE public.storyboard_blocks
  ADD COLUMN IF NOT EXISTS source_block_id uuid
    REFERENCES public.storyboard_blocks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS storyboard_blocks_source_idx
  ON public.storyboard_blocks (source_block_id)
  WHERE source_block_id IS NOT NULL;

-- créditos cobrados pela Kie podem ser decimais
ALTER TABLE public.storyboard_blocks
  ALTER COLUMN credits_charged TYPE double precision
  USING credits_charged::double precision;
