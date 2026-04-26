-- =====================================================
-- PHASE 7: AI + CRM + AUTOMATION
-- =====================================================

-- =====================================================
-- 1. AI GENERATIONS log table
-- =====================================================

CREATE TABLE IF NOT EXISTS ai_generations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  generation_type TEXT NOT NULL,
  related_entity_type TEXT,
  related_entity_id UUID,
  model_used TEXT,
  input_tokens INT,
  output_tokens INT,
  prompt_summary TEXT,
  output_text TEXT,
  generated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_generations_entity ON ai_generations(related_entity_type, related_entity_id);
CREATE INDEX IF NOT EXISTS idx_ai_generations_date ON ai_generations(created_at DESC);

ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff view ai logs" ON ai_generations;
CREATE POLICY "Staff view ai logs" ON ai_generations FOR SELECT USING (is_authenticated_staff());
DROP POLICY IF EXISTS "Staff insert ai logs" ON ai_generations;
CREATE POLICY "Staff insert ai logs" ON ai_generations FOR INSERT WITH CHECK (is_authenticated_staff());

-- =====================================================
-- 2. CUSTOMER REVIEWS
-- =====================================================

CREATE TABLE IF NOT EXISTS customer_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  sales_order_id UUID REFERENCES sales_orders(id) ON DELETE SET NULL,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  is_public BOOLEAN DEFAULT TRUE,
  review_token TEXT UNIQUE,
  token_expires_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_customer ON customer_reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_token ON customer_reviews(review_token);

ALTER TABLE customer_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public view public reviews" ON customer_reviews;
CREATE POLICY "Public view public reviews" ON customer_reviews FOR SELECT
  USING (is_public = TRUE AND reviewed_at IS NOT NULL);
DROP POLICY IF EXISTS "Public submit review with token" ON customer_reviews;
CREATE POLICY "Public submit review with token" ON customer_reviews FOR UPDATE
  USING (review_token IS NOT NULL AND token_expires_at > NOW());
DROP POLICY IF EXISTS "Staff manage reviews" ON customer_reviews;
CREATE POLICY "Staff manage reviews" ON customer_reviews FOR ALL USING (is_authenticated_staff());

-- =====================================================
-- 3. AUTO VIP CLASSIFICATION trigger
-- =====================================================

CREATE OR REPLACE FUNCTION auto_classify_vip()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.total_spent >= 50000000 OR NEW.total_purchased >= 5 THEN
    IF NEW.tier = 'thuong' THEN
      NEW.tier := 'vip';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_classify_vip ON customers;
CREATE TRIGGER trigger_auto_classify_vip
  BEFORE UPDATE OF total_spent, total_purchased ON customers
  FOR EACH ROW EXECUTE FUNCTION auto_classify_vip();

-- =====================================================
-- 4. MATCHING CUSTOMERS function
-- =====================================================

CREATE OR REPLACE FUNCTION find_matching_customers_for_chicken(p_chicken_id UUID)
RETURNS TABLE (
  customer_id UUID,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  alert_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.name, c.phone, c.email, ca.id
  FROM customer_alerts ca
  JOIN customers c ON c.id = ca.customer_id
  JOIN chickens ch ON ch.id = p_chicken_id
  WHERE ca.is_active = TRUE
    AND ch.is_for_sale = TRUE
    AND ch.status = 'dang_nuoi'
    AND (ca.breed_filter IS NULL OR ca.breed_filter = ch.breed_id)
    AND (ca.age_min_months IS NULL OR
         (DATE_PART('year', AGE(CURRENT_DATE, ch.birth_date)) * 12
           + DATE_PART('month', AGE(CURRENT_DATE, ch.birth_date))) >= ca.age_min_months)
    AND (ca.age_max_months IS NULL OR
         (DATE_PART('year', AGE(CURRENT_DATE, ch.birth_date)) * 12
           + DATE_PART('month', AGE(CURRENT_DATE, ch.birth_date))) <= ca.age_max_months)
    AND (ca.price_max IS NULL OR ch.listed_price <= ca.price_max);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. ALTER alerts for push tracking
-- =====================================================

ALTER TABLE alerts ADD COLUMN IF NOT EXISTS push_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_alerts_unpushed
  ON alerts(created_at) WHERE push_sent_at IS NULL;

-- =====================================================
-- 6. ACTIVITY LOGS view detailed
-- =====================================================

CREATE OR REPLACE VIEW activity_logs_detailed AS
SELECT
  al.id,
  al.action,
  al.entity_type,
  al.entity_id,
  al.before_data,
  al.after_data,
  al.ip_address,
  al.created_at,
  p.full_name AS user_name,
  p.role AS user_role
FROM activity_logs al
LEFT JOIN profiles p ON p.id = al.user_id
ORDER BY al.created_at DESC;

-- =====================================================
-- 7. SEED system_settings rows cho integrations
-- =====================================================

INSERT INTO system_settings (key, value, description) VALUES
  ('gemini_api_key', '{"value": "", "updated_by_user": null}', 'Google Gemini API key (tự lấy tại aistudio.google.com/app/apikey)'),
  ('gemini_model', '{"value": "gemini-2.0-flash-exp"}', 'Tên model Gemini mặc định'),
  ('ai_enabled', '{"value": false}', 'Bật/tắt tính năng AI (cần có gemini_api_key)')
ON CONFLICT (key) DO NOTHING;
