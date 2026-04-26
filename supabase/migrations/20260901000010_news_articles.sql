-- =====================================================
-- NEWS / BLOG module — SEO articles
-- =====================================================

CREATE TABLE IF NOT EXISTS news_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT,
  body_markdown TEXT NOT NULL DEFAULT '',
  cover_image_url TEXT,
  tags TEXT[] DEFAULT '{}',
  category TEXT NOT NULL DEFAULT 'tin-tuc'
    CHECK (category IN ('tin-tuc', 'kinh-nghiem', 'su-kien', 'giong-ga', 'cham-soc')),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  source_url TEXT,
  source_name TEXT,
  author_id UUID REFERENCES profiles(id),
  ai_generated BOOLEAN DEFAULT FALSE,
  seo_title TEXT,
  seo_description TEXT,
  view_count INT DEFAULT 0,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_news_status ON news_articles(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_slug ON news_articles(slug);
CREATE INDEX IF NOT EXISTS idx_news_category ON news_articles(category);
CREATE INDEX IF NOT EXISTS idx_news_tags ON news_articles USING GIN(tags);

ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;

-- Public chỉ đọc bài published
DROP POLICY IF EXISTS "public_read_published_news" ON news_articles;
CREATE POLICY "public_read_published_news" ON news_articles
  FOR SELECT USING (status = 'published');

-- Staff đọc tất cả (kể cả draft)
DROP POLICY IF EXISTS "staff_read_all_news" ON news_articles;
CREATE POLICY "staff_read_all_news" ON news_articles
  FOR SELECT USING (is_authenticated_staff());

-- Chỉ chủ trại write/delete
DROP POLICY IF EXISTS "chu_trai_manage_news" ON news_articles;
CREATE POLICY "chu_trai_manage_news" ON news_articles
  FOR ALL USING (is_chu_trai());

-- Auto update timestamp
DROP TRIGGER IF EXISTS news_articles_updated_at ON news_articles;
CREATE TRIGGER news_articles_updated_at
  BEFORE UPDATE ON news_articles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Auto-set published_at when status → published
CREATE OR REPLACE FUNCTION news_set_published_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status != 'published') THEN
    NEW.published_at := COALESCE(NEW.published_at, NOW());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_news_published_at ON news_articles;
CREATE TRIGGER trigger_news_published_at
  BEFORE INSERT OR UPDATE ON news_articles
  FOR EACH ROW
  EXECUTE FUNCTION news_set_published_at();

-- Increment view function (public có thể gọi để tăng view)
CREATE OR REPLACE FUNCTION news_increment_view(p_slug TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE news_articles SET view_count = view_count + 1
  WHERE slug = p_slug AND status = 'published';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
