-- ============================================================
-- STAFF AVATARS storage bucket
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'staff-avatars',
  'staff-avatars',
  true,
  2 * 1024 * 1024, -- 2MB
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "staff_avatars_authenticated_upload" ON storage.objects;
CREATE POLICY "staff_avatars_authenticated_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'staff-avatars');

DROP POLICY IF EXISTS "staff_avatars_public_read" ON storage.objects;
CREATE POLICY "staff_avatars_public_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'staff-avatars');

DROP POLICY IF EXISTS "staff_avatars_authenticated_delete" ON storage.objects;
CREATE POLICY "staff_avatars_authenticated_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'staff-avatars');
