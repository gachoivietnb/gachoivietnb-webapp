-- =====================================================
-- PHASE 2 ADDITIONS — Hồ sơ gà + QR + Chuồng trại
-- Chỉ thêm, không sửa cũ
-- =====================================================

-- =====================================================
-- VIEW: chickens_with_details (join sẵn để query nhanh)
-- =====================================================

DROP VIEW IF EXISTS chickens_with_details CASCADE;
CREATE VIEW chickens_with_details AS
SELECT
  c.*,
  b.code AS breed_code,
  b.name_vi AS breed_name,
  b.tier AS breed_tier,
  qt.tag_number,
  cg.full_code AS cage_full_code,
  cg.id AS cage_id_full,
  a.id AS area_id,
  a.code AS area_code,
  a.type AS area_type,
  (DATE_PART('year', AGE(CURRENT_DATE, c.birth_date)) * 12
    + DATE_PART('month', AGE(CURRENT_DATE, c.birth_date)))::INT AS age_months,
  (CURRENT_DATE - c.birth_date)::INT AS age_days,
  pm.chicken_code AS parent_male_code,
  pm.name AS parent_male_name,
  pf.chicken_code AS parent_female_code,
  pf.name AS parent_female_name
FROM chickens c
LEFT JOIN breeds b ON b.id = c.breed_id
LEFT JOIN qr_tags qt ON qt.id = c.qr_tag_id
LEFT JOIN cages cg ON cg.id = c.cage_id
LEFT JOIN cage_rows cr ON cr.id = cg.row_id
LEFT JOIN areas a ON a.id = cr.area_id
LEFT JOIN chickens pm ON pm.id = c.parent_male_id
LEFT JOIN chickens pf ON pf.id = c.parent_female_id;

-- =====================================================
-- FUNCTION: find_available_cage — tự xếp chuồng
-- =====================================================

CREATE OR REPLACE FUNCTION find_available_cage(
  p_area_type area_type DEFAULT 'cach_ly'
) RETURNS UUID AS $$
DECLARE
  v_cage_id UUID;
BEGIN
  SELECT cg.id INTO v_cage_id
  FROM cages cg
  JOIN cage_rows cr ON cr.id = cg.row_id
  JOIN areas a ON a.id = cr.area_id
  WHERE a.type = p_area_type
    AND a.is_active = TRUE
    AND cr.is_active = TRUE
    AND cg.status = 'trong'
  ORDER BY cg.full_code
  LIMIT 1;

  RETURN v_cage_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: bulk_create_cages
-- =====================================================

CREATE OR REPLACE FUNCTION bulk_create_cages(
  p_row_id UUID,
  p_start_num INT,
  p_count INT,
  p_capacity INT DEFAULT 1
) RETURNS INT AS $$
DECLARE
  v_inserted INT := 0;
  v_i INT;
  v_code TEXT;
  v_area_code TEXT;
  v_row_code TEXT;
BEGIN
  SELECT a.code, cr.code INTO v_area_code, v_row_code
  FROM cage_rows cr JOIN areas a ON a.id = cr.area_id
  WHERE cr.id = p_row_id;

  IF v_area_code IS NULL THEN
    RAISE EXCEPTION 'Dãy không tồn tại hoặc thiếu khu';
  END IF;

  FOR v_i IN p_start_num..(p_start_num + p_count - 1) LOOP
    v_code := LPAD(v_i::TEXT, 3, '0');
    BEGIN
      INSERT INTO cages (row_id, code, capacity, qr_door_code)
      VALUES (p_row_id, v_code, p_capacity,
              'CHUONG-' || v_area_code || '-' || v_row_code || '-' || v_code);
      v_inserted := v_inserted + 1;
    EXCEPTION WHEN unique_violation THEN
      NULL;
    END;
  END LOOP;
  RETURN v_inserted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: get_next_available_qr_tag
-- =====================================================

CREATE OR REPLACE FUNCTION get_next_available_qr_tag()
RETURNS qr_tags AS $$
DECLARE
  v_tag qr_tags;
BEGIN
  SELECT * INTO v_tag
  FROM qr_tags
  WHERE status = 'chua_su_dung'
  ORDER BY tag_number
  LIMIT 1;
  RETURN v_tag;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: get_cage_history (placeholder — Phần 8 sẽ hoàn thiện)
-- =====================================================

CREATE OR REPLACE FUNCTION get_cage_history(p_cage_id UUID)
RETURNS TABLE (
  chicken_id UUID,
  chicken_code TEXT,
  chicken_name TEXT,
  moved_in TIMESTAMPTZ,
  moved_out TIMESTAMPTZ,
  status chicken_status
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.chicken_code,
    c.name,
    c.created_at AS moved_in,
    NULL::TIMESTAMPTZ AS moved_out,
    c.status
  FROM chickens c
  WHERE c.cage_id = p_cage_id
  ORDER BY c.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- INDEXES bổ sung
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_chickens_search ON chickens
  USING GIN (to_tsvector('simple', COALESCE(chicken_code, '') || ' ' || COALESCE(name, '')));

CREATE INDEX IF NOT EXISTS idx_qr_tags_number ON qr_tags(tag_number);
