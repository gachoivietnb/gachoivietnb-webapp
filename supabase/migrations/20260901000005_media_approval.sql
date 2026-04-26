-- =====================================================
-- AI Marketing: approval flag cho chicken_media
-- =====================================================

ALTER TABLE chicken_media ADD COLUMN IF NOT EXISTS approved_for_render BOOLEAN DEFAULT FALSE;
ALTER TABLE chicken_media ADD COLUMN IF NOT EXISTS social_caption TEXT;
ALTER TABLE chicken_media ADD COLUMN IF NOT EXISTS render_status TEXT DEFAULT 'pending';
-- render_status: 'pending' | 'rendering' | 'published' | 'error'
ALTER TABLE chicken_media ADD COLUMN IF NOT EXISTS published_urls JSONB DEFAULT '{}'::jsonb;
-- { "facebook": "https://...", "zalo": "https://...", "tiktok": "..." }
ALTER TABLE chicken_media ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE chicken_media ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id);

CREATE INDEX IF NOT EXISTS idx_chicken_media_approved
  ON chicken_media(approved_for_render, render_status)
  WHERE approved_for_render = TRUE;

-- View: gà + thống kê media (để filter "chưa có media")
CREATE OR REPLACE VIEW chickens_media_summary AS
SELECT
  c.id,
  c.chicken_code,
  c.name,
  c.breed_id,
  b.code AS breed_code,
  b.name_vi AS breed_name,
  c.gender,
  c.status,
  c.is_for_sale,
  c.listed_price,
  c.main_photo_url,
  c.age_months,
  COUNT(m.id) AS media_count,
  COUNT(m.id) FILTER (WHERE m.media_type = 'anh') AS photo_count,
  COUNT(m.id) FILTER (WHERE m.media_type = 'video') AS video_count,
  COUNT(m.id) FILTER (WHERE m.approved_for_render = true) AS approved_count,
  COUNT(m.id) FILTER (WHERE m.render_status = 'published') AS published_count,
  MAX(m.created_at) AS last_uploaded_at
FROM chickens_with_details c
LEFT JOIN breeds b ON b.id = c.breed_id
LEFT JOIN chicken_media m ON m.chicken_id = c.id
GROUP BY
  c.id, c.chicken_code, c.name, c.breed_id, b.code, b.name_vi,
  c.gender, c.status, c.is_for_sale, c.listed_price, c.main_photo_url, c.age_months;
