-- ============================================================
-- DIARY ENHANCEMENTS — Storage bucket + Comments table
-- ============================================================
-- 1. Storage bucket "diary-media" cho upload ảnh nhật ký
-- 2. Bảng diary_comments — comment thread trong entry
-- ============================================================

-- ====== 1. STORAGE BUCKET ======
-- Tạo bucket nếu chưa có (private, có thể tạo signed URL khi cần)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'diary-media',
  'diary-media',
  true,                                                  -- public read để dễ render <img>
  5 * 1024 * 1024,                                       -- 5 MB / file
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies
DROP POLICY IF EXISTS "diary_media_authenticated_upload" ON storage.objects;
CREATE POLICY "diary_media_authenticated_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'diary-media');

DROP POLICY IF EXISTS "diary_media_public_read" ON storage.objects;
CREATE POLICY "diary_media_public_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'diary-media');

DROP POLICY IF EXISTS "diary_media_authenticated_delete" ON storage.objects;
CREATE POLICY "diary_media_authenticated_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'diary-media');

-- ====== 2. COMMENTS TABLE ======
CREATE TABLE IF NOT EXISTS public.diary_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  entry_id UUID NOT NULL REFERENCES public.diary_entries(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  content TEXT NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 2000),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_diary_comments_entry
  ON public.diary_comments(entry_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_diary_comments_farm
  ON public.diary_comments(farm_id, created_at DESC);

DROP TRIGGER IF EXISTS tr_diary_comments_updated_at ON public.diary_comments;
CREATE TRIGGER tr_diary_comments_updated_at
  BEFORE UPDATE ON public.diary_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.diary_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS diary_comments_tenant_all ON public.diary_comments;
CREATE POLICY diary_comments_tenant_all ON public.diary_comments
  FOR ALL TO authenticated
  USING (farm_id = public.current_farm_id())
  WITH CHECK (farm_id = public.current_farm_id());

CREATE OR REPLACE FUNCTION public.fill_farm_id_diary_comments()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.farm_id IS NULL THEN
    NEW.farm_id := public.current_farm_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_fill_farm_id_diary_comments ON public.diary_comments;
CREATE TRIGGER tr_fill_farm_id_diary_comments
  BEFORE INSERT ON public.diary_comments
  FOR EACH ROW EXECUTE FUNCTION public.fill_farm_id_diary_comments();

-- View: diary_entries_with_counts — join comment_count để render badge
DROP VIEW IF EXISTS public.diary_entries_with_counts CASCADE;
CREATE VIEW public.diary_entries_with_counts AS
SELECT
  e.*,
  COALESCE(c.cnt, 0)::int AS comment_count
FROM public.diary_entries e
LEFT JOIN (
  SELECT entry_id, COUNT(*)::int AS cnt
  FROM public.diary_comments
  GROUP BY entry_id
) c ON c.entry_id = e.id;

COMMENT ON TABLE public.diary_comments IS
  'Comment thread cho diary entry — đơn giản 1 cấp, không nested.';
