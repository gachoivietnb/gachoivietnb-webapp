-- =====================================================
-- PHASE 6: PUBLIC WEBSITE
-- =====================================================

-- =====================================================
-- 1. contact_inquiries table
-- =====================================================

CREATE TABLE IF NOT EXISTS contact_inquiries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  message TEXT,
  interested_in_chicken_id UUID REFERENCES chickens(id),
  interested_in_breed_id UUID REFERENCES breeds(id),
  customer_id UUID REFERENCES customers(id),
  source TEXT DEFAULT 'website',
  status TEXT DEFAULT 'moi',
  ip_address TEXT,
  user_agent TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  responded_by UUID REFERENCES profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_contact_inquiries_status ON contact_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_created ON contact_inquiries(created_at DESC);

ALTER TABLE contact_inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can submit inquiries" ON contact_inquiries;
CREATE POLICY "Public can submit inquiries" ON contact_inquiries FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Staff view all inquiries" ON contact_inquiries;
CREATE POLICY "Staff view all inquiries" ON contact_inquiries FOR SELECT
  USING (is_authenticated_staff());

DROP POLICY IF EXISTS "Staff manage inquiries" ON contact_inquiries;
CREATE POLICY "Staff manage inquiries" ON contact_inquiries FOR ALL
  USING (is_authenticated_staff());

-- =====================================================
-- 2. public_farm_stats view
-- =====================================================

CREATE OR REPLACE VIEW public_farm_stats AS
SELECT
  (SELECT COUNT(*) FROM chickens WHERE status IN ('dang_nuoi', 'dang_cach_ly')) AS total_chickens,
  (SELECT COUNT(*) FROM breeds WHERE is_active = TRUE) AS total_breeds,
  (SELECT COUNT(DISTINCT id) FROM customers WHERE total_purchased > 0) AS total_customers,
  (SELECT COUNT(*) FROM chickens WHERE is_for_sale = TRUE AND status = 'dang_nuoi') AS chickens_for_sale,
  (SELECT COUNT(*) FROM chickens WHERE source = 'no_tai_trai'
    AND created_at >= NOW() - INTERVAL '1 year') AS chickens_born_last_year;

-- =====================================================
-- 3. public_chickens view
-- =====================================================

CREATE OR REPLACE VIEW public_chickens AS
SELECT
  c.id,
  c.chicken_code,
  c.name,
  qt.tag_number,
  b.id AS breed_id,
  b.code AS breed_code,
  b.name_vi AS breed_name,
  b.tier AS breed_tier,
  c.gender,
  c.birth_date,
  (DATE_PART('year', AGE(CURRENT_DATE, c.birth_date)) * 12
    + DATE_PART('month', AGE(CURRENT_DATE, c.birth_date)))::INT AS age_months,
  c.weight_kg,
  c.color,
  c.listed_price,
  c.description,
  c.main_photo_url,
  c.created_at,
  c.is_for_sale,
  c.status,
  c.sale_date,
  CASE
    WHEN c.parent_male_id IS NOT NULL OR c.parent_female_id IS NOT NULL THEN
      CASE
        WHEN EXISTS (
          SELECT 1 FROM chickens p1
          WHERE (p1.id = c.parent_male_id OR p1.id = c.parent_female_id)
            AND (p1.parent_male_id IS NOT NULL OR p1.parent_female_id IS NOT NULL)
        ) THEN 3
        ELSE 2
      END
    ELSE 1
  END AS pedigree_depth,
  (SELECT COUNT(*) FROM vaccinations v
    WHERE v.chicken_id = c.id AND v.status = 'da_tiem') AS vaccinations_done,
  (SELECT COUNT(*) FROM training_sessions ts
    WHERE ts.chicken_id = c.id) AS training_sessions_count,
  (SELECT ROUND(AVG(ts.score_total)::NUMERIC, 1) FROM training_sessions ts
    WHERE ts.chicken_id = c.id) AS avg_training_score
FROM chickens c
LEFT JOIN breeds b ON b.id = c.breed_id
LEFT JOIN qr_tags qt ON qt.id = c.qr_tag_id;

-- =====================================================
-- 4. search_public_chickens function
-- =====================================================

CREATE OR REPLACE FUNCTION search_public_chickens(
  p_text TEXT DEFAULT NULL,
  p_breed_codes TEXT[] DEFAULT NULL,
  p_age_min_months INT DEFAULT NULL,
  p_age_max_months INT DEFAULT NULL,
  p_price_min DECIMAL DEFAULT NULL,
  p_price_max DECIMAL DEFAULT NULL,
  p_min_training_sessions INT DEFAULT NULL,
  p_min_generations INT DEFAULT NULL,
  p_gender chicken_gender DEFAULT NULL,
  p_offset INT DEFAULT 0,
  p_limit INT DEFAULT 20
)
RETURNS SETOF public_chickens AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public_chickens pc
  WHERE pc.is_for_sale = TRUE
    AND pc.status = 'dang_nuoi'
    AND (p_text IS NULL
         OR pc.name ILIKE '%' || p_text || '%'
         OR pc.chicken_code ILIKE '%' || p_text || '%'
         OR pc.description ILIKE '%' || p_text || '%')
    AND (p_breed_codes IS NULL OR pc.breed_code = ANY(p_breed_codes))
    AND (p_age_min_months IS NULL OR pc.age_months >= p_age_min_months)
    AND (p_age_max_months IS NULL OR pc.age_months <= p_age_max_months)
    AND (p_price_min IS NULL OR pc.listed_price >= p_price_min)
    AND (p_price_max IS NULL OR pc.listed_price <= p_price_max)
    AND (p_min_training_sessions IS NULL OR pc.training_sessions_count >= p_min_training_sessions)
    AND (p_min_generations IS NULL OR pc.pedigree_depth >= p_min_generations)
    AND (p_gender IS NULL OR pc.gender = p_gender)
  ORDER BY
    CASE WHEN pc.breed_tier = 'cao_cap' THEN 1
         WHEN pc.breed_tier = 'trung_cap' THEN 2
         ELSE 3 END,
    pc.created_at DESC
  OFFSET p_offset
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. public_breed_stats view
-- =====================================================

CREATE OR REPLACE VIEW public_breed_stats AS
SELECT
  b.id,
  b.code,
  b.name_vi,
  b.origin,
  b.description,
  b.tier,
  b.default_avatar_url,
  b.display_order,
  COUNT(c.id) FILTER (WHERE c.status IN ('dang_nuoi', 'dang_cach_ly')) AS current_count,
  COUNT(c.id) FILTER (WHERE c.is_for_sale = TRUE AND c.status = 'dang_nuoi') AS for_sale_count,
  ROUND(AVG(c.listed_price) FILTER (WHERE c.is_for_sale = TRUE)::NUMERIC, 0) AS avg_listed_price
FROM breeds b
LEFT JOIN chickens c ON c.breed_id = b.id
WHERE b.is_active = TRUE
GROUP BY b.id;
