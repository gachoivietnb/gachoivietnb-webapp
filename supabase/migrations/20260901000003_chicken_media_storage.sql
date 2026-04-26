-- =====================================================
-- Supabase Storage bucket cho ảnh/video gà
-- =====================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chicken-media',
  'chicken-media',
  true,
  104857600, -- 100 MB
  ARRAY['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop + recreate policies
DROP POLICY IF EXISTS "Public read chicken-media" ON storage.objects;
CREATE POLICY "Public read chicken-media" ON storage.objects
  FOR SELECT USING (bucket_id = 'chicken-media');

DROP POLICY IF EXISTS "Authenticated upload chicken-media" ON storage.objects;
CREATE POLICY "Authenticated upload chicken-media" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'chicken-media' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated update chicken-media" ON storage.objects;
CREATE POLICY "Authenticated update chicken-media" ON storage.objects
  FOR UPDATE USING (bucket_id = 'chicken-media' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated delete chicken-media" ON storage.objects;
CREATE POLICY "Authenticated delete chicken-media" ON storage.objects
  FOR DELETE USING (bucket_id = 'chicken-media' AND auth.role() = 'authenticated');

-- Cho phép drive_file_id NULL (vì giờ dùng Storage path, không phải Drive)
ALTER TABLE chicken_media ALTER COLUMN drive_file_id DROP NOT NULL;
