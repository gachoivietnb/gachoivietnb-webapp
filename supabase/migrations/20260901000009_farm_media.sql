-- =====================================================
-- Thư viện trang trại — ảnh/video giới thiệu chung
-- Tách biệt với chicken_media (per-con)
-- =====================================================

CREATE TABLE IF NOT EXISTS farm_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  media_type TEXT NOT NULL CHECK (media_type IN ('anh', 'video')),
  storage_path TEXT NOT NULL,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  category TEXT NOT NULL DEFAULT 'khac'
    CHECK (category IN ('chuong_trai', 'hoat_dong', 'su_kien', 'san_pham', 'khac')),
  title TEXT,
  description TEXT,
  is_featured BOOLEAN DEFAULT FALSE,
  display_order INT DEFAULT 0,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_farm_media_category ON farm_media(category);
CREATE INDEX IF NOT EXISTS idx_farm_media_featured ON farm_media(is_featured, display_order);
CREATE INDEX IF NOT EXISTS idx_farm_media_created ON farm_media(created_at DESC);

ALTER TABLE farm_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_farm_media" ON farm_media;
CREATE POLICY "public_read_farm_media" ON farm_media FOR SELECT USING (true);

DROP POLICY IF EXISTS "staff_manage_farm_media" ON farm_media;
CREATE POLICY "staff_manage_farm_media" ON farm_media FOR ALL USING (is_authenticated_staff());

-- Storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'farm-media',
  'farm-media',
  true,
  104857600,
  ARRAY['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read farm-media" ON storage.objects;
CREATE POLICY "Public read farm-media" ON storage.objects
  FOR SELECT USING (bucket_id = 'farm-media');

DROP POLICY IF EXISTS "Authenticated upload farm-media" ON storage.objects;
CREATE POLICY "Authenticated upload farm-media" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'farm-media' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated delete farm-media" ON storage.objects;
CREATE POLICY "Authenticated delete farm-media" ON storage.objects
  FOR DELETE USING (bucket_id = 'farm-media' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated update farm-media" ON storage.objects;
CREATE POLICY "Authenticated update farm-media" ON storage.objects
  FOR UPDATE USING (bucket_id = 'farm-media' AND auth.role() = 'authenticated');
