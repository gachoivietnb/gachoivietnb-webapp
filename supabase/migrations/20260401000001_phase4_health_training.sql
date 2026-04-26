-- =====================================================
-- PHASE 4: HEALTH & TRAINING
-- =====================================================

-- =====================================================
-- 1. AUTO-UPDATE STOCK triggers
-- =====================================================

CREATE OR REPLACE FUNCTION update_medicine_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE medicines SET current_stock = current_stock +
      CASE WHEN NEW.transaction_type = 'nhap' THEN NEW.quantity ELSE -NEW.quantity END
    WHERE id = NEW.medicine_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE medicines SET current_stock = current_stock -
      CASE WHEN OLD.transaction_type = 'nhap' THEN OLD.quantity ELSE -OLD.quantity END
    WHERE id = OLD.medicine_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_medicine_stock ON medicine_transactions;
CREATE TRIGGER trigger_update_medicine_stock
  AFTER INSERT OR DELETE ON medicine_transactions
  FOR EACH ROW EXECUTE FUNCTION update_medicine_stock();

CREATE OR REPLACE FUNCTION update_feed_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE feeds SET current_stock = current_stock +
      CASE WHEN NEW.transaction_type = 'nhap' THEN NEW.quantity ELSE -NEW.quantity END
    WHERE id = NEW.feed_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE feeds SET current_stock = current_stock -
      CASE WHEN OLD.transaction_type = 'nhap' THEN OLD.quantity ELSE -OLD.quantity END
    WHERE id = OLD.feed_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_feed_stock ON feed_transactions;
CREATE TRIGGER trigger_update_feed_stock
  AFTER INSERT OR DELETE ON feed_transactions
  FOR EACH ROW EXECUTE FUNCTION update_feed_stock();

-- =====================================================
-- 2. STOCK ALERT triggers
-- =====================================================

CREATE OR REPLACE FUNCTION check_medicine_stock_alert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.current_stock <= NEW.min_stock_alert AND NEW.current_stock > 0
     AND (OLD.current_stock IS NULL OR OLD.current_stock > NEW.min_stock_alert) THEN
    INSERT INTO alerts (alert_type, priority, title, message, related_entity_type, related_entity_id)
    VALUES (
      'kho_thuoc_thap', 'cao',
      'Tồn kho thuốc thấp: ' || NEW.name_vi,
      'Còn ' || NEW.current_stock || ' ' || NEW.unit || ' (ngưỡng ' || NEW.min_stock_alert || ')',
      'medicines', NEW.id
    );
  END IF;

  IF NEW.current_stock <= 0 AND (OLD.current_stock IS NULL OR OLD.current_stock > 0) THEN
    INSERT INTO alerts (alert_type, priority, title, message, related_entity_type, related_entity_id)
    VALUES (
      'kho_thuoc_het', 'khan_cap',
      'HẾT thuốc: ' || NEW.name_vi,
      'Cần nhập thêm ngay',
      'medicines', NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_medicine_stock_alert ON medicines;
CREATE TRIGGER trigger_check_medicine_stock_alert
  AFTER UPDATE OF current_stock ON medicines
  FOR EACH ROW EXECUTE FUNCTION check_medicine_stock_alert();

CREATE OR REPLACE FUNCTION check_feed_stock_alert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.current_stock <= NEW.min_stock_alert AND NEW.current_stock > 0
     AND (OLD.current_stock IS NULL OR OLD.current_stock > NEW.min_stock_alert) THEN
    INSERT INTO alerts (alert_type, priority, title, message, related_entity_type, related_entity_id)
    VALUES (
      'kho_thuc_an_thap', 'cao',
      'Tồn kho thức ăn thấp: ' || NEW.name_vi,
      'Còn ' || NEW.current_stock || ' ' || NEW.unit,
      'feeds', NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_feed_stock_alert ON feeds;
CREATE TRIGGER trigger_check_feed_stock_alert
  AFTER UPDATE OF current_stock ON feeds
  FOR EACH ROW EXECUTE FUNCTION check_feed_stock_alert();

-- =====================================================
-- 3. OUTBREAK DETECTION
-- =====================================================

CREATE OR REPLACE FUNCTION check_outbreak_on_death()
RETURNS TRIGGER AS $$
DECLARE
  v_area_id UUID;
  v_area_name TEXT;
  v_total_in_area INT;
  v_deaths_today INT;
  v_baseline_avg NUMERIC;
  v_threshold_pct NUMERIC := 2.0;
  v_threshold_multi NUMERIC := 3.0;
BEGIN
  IF NEW.status != 'chet' OR (OLD.status IS NOT NULL AND OLD.status = 'chet') THEN
    RETURN NEW;
  END IF;

  SELECT a.id, a.name_vi INTO v_area_id, v_area_name
  FROM cages cg
  JOIN cage_rows cr ON cr.id = cg.row_id
  JOIN areas a ON a.id = cr.area_id
  WHERE cg.id = NEW.cage_id;

  IF v_area_id IS NULL THEN RETURN NEW; END IF;

  SELECT COUNT(*) INTO v_total_in_area
  FROM chickens c
  JOIN cages cg ON cg.id = c.cage_id
  JOIN cage_rows cr ON cr.id = cg.row_id
  WHERE cr.area_id = v_area_id AND c.status IN ('dang_nuoi', 'dang_cach_ly');

  SELECT COUNT(*) INTO v_deaths_today
  FROM chickens c
  JOIN cages cg ON cg.id = c.cage_id
  JOIN cage_rows cr ON cr.id = cg.row_id
  WHERE cr.area_id = v_area_id AND c.status = 'chet' AND c.status_date = CURRENT_DATE;

  SELECT COALESCE(AVG(daily_count), 0) INTO v_baseline_avg
  FROM (
    SELECT COUNT(*) AS daily_count
    FROM chickens c
    JOIN cages cg ON cg.id = c.cage_id
    JOIN cage_rows cr ON cr.id = cg.row_id
    WHERE cr.area_id = v_area_id
      AND c.status = 'chet'
      AND c.status_date >= CURRENT_DATE - INTERVAL '30 days'
      AND c.status_date < CURRENT_DATE
    GROUP BY c.status_date
  ) sub;

  IF v_total_in_area > 0 AND (
       (v_deaths_today::NUMERIC / v_total_in_area) * 100 >= v_threshold_pct
       OR (v_baseline_avg > 0 AND v_deaths_today >= v_baseline_avg * v_threshold_multi)
     )
     AND NOT EXISTS (
       SELECT 1 FROM alerts
       WHERE alert_type = 'dich_benh'
         AND related_entity_id = v_area_id
         AND created_at::DATE = CURRENT_DATE
     )
  THEN
    INSERT INTO alerts (
      alert_type, priority, title, message,
      related_entity_type, related_entity_id
    ) VALUES (
      'dich_benh', 'khan_cap',
      '⚠️ NGHI DỊCH BỆNH tại ' || v_area_name,
      'Hôm nay có ' || v_deaths_today || ' gà chết / tổng ' || v_total_in_area
        || ' (baseline 30 ngày: ' || ROUND(v_baseline_avg, 1) || '/ngày). Cần kiểm tra ngay.',
      'areas', v_area_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_outbreak ON chickens;
CREATE TRIGGER trigger_check_outbreak
  AFTER UPDATE OF status ON chickens
  FOR EACH ROW EXECUTE FUNCTION check_outbreak_on_death();

-- =====================================================
-- 4. VACCINATIONS VIEW
-- =====================================================

CREATE OR REPLACE VIEW vaccinations_due AS
SELECT
  v.id AS vaccination_id,
  v.scheduled_date,
  v.status,
  c.id AS chicken_id,
  c.chicken_code,
  c.name AS chicken_name,
  c.main_photo_url,
  c.cage_id,
  cg.full_code AS cage_code,
  a.name_vi AS area_name,
  vc.id AS vaccine_id,
  vc.code AS vaccine_code,
  vc.name_vi AS vaccine_name,
  vc.is_required,
  (CURRENT_DATE - v.scheduled_date)::INT AS days_overdue
FROM vaccinations v
JOIN chickens c ON c.id = v.chicken_id
JOIN vaccines vc ON vc.id = v.vaccine_id
LEFT JOIN cages cg ON cg.id = c.cage_id
LEFT JOIN cage_rows cr ON cr.id = cg.row_id
LEFT JOIN areas a ON a.id = cr.area_id
WHERE v.status = 'cho_tiem'
  AND c.status IN ('dang_nuoi', 'dang_cach_ly');

-- =====================================================
-- 5. TRAINING STATS VIEW
-- =====================================================

CREATE OR REPLACE VIEW chicken_training_stats AS
SELECT
  c.id AS chicken_id,
  c.chicken_code,
  c.name,
  COUNT(ts.id) AS total_sessions,
  COUNT(*) FILTER (WHERE ts.result = 'thang') AS wins,
  COUNT(*) FILTER (WHERE ts.result = 'thua') AS losses,
  COUNT(*) FILTER (WHERE ts.result = 'hoa') AS draws,
  ROUND(AVG(ts.score_strength)::NUMERIC, 1) AS avg_strength,
  ROUND(AVG(ts.score_appearance)::NUMERIC, 1) AS avg_appearance,
  ROUND(AVG(ts.score_aggression)::NUMERIC, 1) AS avg_aggression,
  ROUND(AVG(ts.score_total)::NUMERIC, 1) AS avg_total,
  MAX(ts.session_date) AS last_session_date
FROM chickens c
LEFT JOIN training_sessions ts ON ts.chicken_id = c.id
GROUP BY c.id, c.chicken_code, c.name;

CREATE OR REPLACE VIEW top_training_performers AS
SELECT * FROM chicken_training_stats
WHERE total_sessions >= 3
ORDER BY avg_total DESC NULLS LAST
LIMIT 50;
