-- Bucket público para referências / assets de storyboard (URLs acessíveis pela Kie AI)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'storyboard-assets',
  'storyboard-assets',
  true,
  104857600,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'video/mp4', 'video/quicktime', 'video/webm']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Leitura pública do bucket
DROP POLICY IF EXISTS "storyboard_assets_public_read" ON storage.objects;
CREATE POLICY "storyboard_assets_public_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'storyboard-assets');

-- Escrita só via service role (API admin); sem policy de INSERT para anon/authenticated
