-- =====================================================
-- PHASE 3: PEDIGREE & BREEDING
-- =====================================================

-- =====================================================
-- 1. PEDIGREE: recursive CTE
-- =====================================================

CREATE OR REPLACE FUNCTION get_pedigree(
  p_chicken_id UUID,
  p_depth INT DEFAULT 3
)
RETURNS TABLE (
  generation INT,
  tree_position TEXT,
  chicken_id UUID,
  chicken_code TEXT,
  name TEXT,
  breed_name TEXT,
  gender chicken_gender,
  birth_date DATE,
  main_photo_url TEXT,
  status chicken_status,
  qr_tag_number TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE pedigree_tree AS (
    SELECT
      0 AS gen,
      'self'::TEXT AS pos,
      c.id,
      c.parent_male_id,
      c.parent_female_id
    FROM chickens c
    WHERE c.id = p_chicken_id

    UNION ALL

    SELECT
      pt.gen + 1,
      CASE
        WHEN pt.pos = 'self' THEN
          CASE WHEN c.id = pt.parent_male_id THEN 'father' ELSE 'mother' END
        ELSE
          pt.pos || (CASE WHEN c.id = pt.parent_male_id THEN 'f' ELSE 'm' END)
      END,
      c.id,
      c.parent_male_id,
      c.parent_female_id
    FROM pedigree_tree pt
    JOIN chickens c ON c.id = pt.parent_male_id OR c.id = pt.parent_female_id
    WHERE pt.gen < p_depth
  )
  SELECT
    pt.gen,
    pt.pos,
    c.id,
    c.chicken_code,
    c.name,
    b.name_vi,
    c.gender,
    c.birth_date,
    c.main_photo_url,
    c.status,
    qt.tag_number
  FROM pedigree_tree pt
  JOIN chickens c ON c.id = pt.id
  LEFT JOIN breeds b ON b.id = c.breed_id
  LEFT JOIN qr_tags qt ON qt.id = c.qr_tag_id
  ORDER BY pt.gen, pt.pos;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. CHECK CIRCULAR PARENT
-- =====================================================

CREATE OR REPLACE FUNCTION is_ancestor(
  p_chicken_id UUID,
  p_potential_ancestor UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_found BOOLEAN := FALSE;
BEGIN
  IF p_chicken_id = p_potential_ancestor THEN
    RETURN TRUE;
  END IF;

  WITH RECURSIVE ancestors AS (
    SELECT id, parent_male_id, parent_female_id
    FROM chickens WHERE id = p_chicken_id

    UNION ALL

    SELECT c.id, c.parent_male_id, c.parent_female_id
    FROM chickens c
    JOIN ancestors a ON c.id = a.parent_male_id OR c.id = a.parent_female_id
  )
  SELECT EXISTS (
    SELECT 1 FROM ancestors WHERE id = p_potential_ancestor
  ) INTO v_found;

  RETURN v_found;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION validate_chicken_parents()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_male_id = NEW.id OR NEW.parent_female_id = NEW.id THEN
    RAISE EXCEPTION 'Gà không thể tự làm bố/mẹ của chính nó';
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.parent_male_id IS NOT NULL THEN
    IF is_ancestor(NEW.parent_male_id, NEW.id) THEN
      RAISE EXCEPTION 'Bố không hợp lệ - tạo loop trong gia phả';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.parent_female_id IS NOT NULL THEN
    IF is_ancestor(NEW.parent_female_id, NEW.id) THEN
      RAISE EXCEPTION 'Mẹ không hợp lệ - tạo loop trong gia phả';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_chicken_parents ON chickens;
CREATE TRIGGER trigger_validate_chicken_parents
  BEFORE INSERT OR UPDATE OF parent_male_id, parent_female_id ON chickens
  FOR EACH ROW EXECUTE FUNCTION validate_chicken_parents();

-- =====================================================
-- 3. BREEDING STATS VIEWS
-- =====================================================

CREATE OR REPLACE VIEW breeding_female_stats AS
SELECT
  c.id AS female_id,
  c.chicken_code,
  c.name,
  b.name_vi AS breed_name,
  COUNT(bl.id) AS total_litters,
  COALESCE(SUM(bl.eggs_total), 0) AS total_eggs,
  COALESCE(SUM(bl.eggs_fertile), 0) AS total_fertile,
  COALESCE(SUM(bl.hatched_count), 0) AS total_hatched,
  CASE WHEN SUM(bl.eggs_total) > 0
    THEN ROUND((SUM(bl.eggs_fertile)::NUMERIC / SUM(bl.eggs_total)) * 100, 1)
    ELSE 0
  END AS fertile_rate,
  CASE WHEN SUM(bl.eggs_fertile) > 0
    THEN ROUND((SUM(bl.hatched_count)::NUMERIC / SUM(bl.eggs_fertile)) * 100, 1)
    ELSE 0
  END AS hatch_rate,
  COALESCE((
    SELECT ROUND(
      (SUM(cg.alive_count)::NUMERIC / NULLIF(SUM(cg.hatched_count), 0)) * 100, 1
    )
    FROM chick_groups cg
    JOIN breeding_litters bl2 ON bl2.id = cg.litter_id
    WHERE bl2.female_id = c.id
  ), 0) AS survival_rate
FROM chickens c
LEFT JOIN breeds b ON b.id = c.breed_id
LEFT JOIN breeding_litters bl ON bl.female_id = c.id
WHERE c.gender = 'mai'
GROUP BY c.id, c.chicken_code, c.name, b.name_vi;

CREATE OR REPLACE VIEW breeding_male_stats AS
WITH litters_per_male AS (
  SELECT
    male_id::UUID,
    bl.id AS litter_id,
    bl.eggs_total,
    bl.eggs_fertile,
    bl.hatched_count,
    array_length(bl.male_ids, 1) AS male_count_in_litter
  FROM breeding_litters bl,
       LATERAL unnest(bl.male_ids) AS male_id
  WHERE bl.status IN ('da_no', 'that_bai')
)
SELECT
  c.id AS male_id,
  c.chicken_code,
  c.name,
  b.name_vi AS breed_name,
  COUNT(lpm.litter_id) AS total_litters,
  COUNT(*) FILTER (WHERE lpm.male_count_in_litter = 1) AS solo_litters,
  COALESCE(SUM(lpm.eggs_total) FILTER (WHERE lpm.male_count_in_litter = 1), 0) AS solo_eggs,
  COALESCE(SUM(lpm.eggs_fertile) FILTER (WHERE lpm.male_count_in_litter = 1), 0) AS solo_fertile,
  CASE WHEN SUM(lpm.eggs_total) FILTER (WHERE lpm.male_count_in_litter = 1) > 0
    THEN ROUND((SUM(lpm.eggs_fertile) FILTER (WHERE lpm.male_count_in_litter = 1)::NUMERIC
         / SUM(lpm.eggs_total) FILTER (WHERE lpm.male_count_in_litter = 1)) * 100, 1)
    ELSE 0
  END AS fertile_rate_accurate,
  CASE WHEN SUM(lpm.eggs_total) > 0
    THEN ROUND((SUM(lpm.eggs_fertile)::NUMERIC / SUM(lpm.eggs_total)) * 100, 1)
    ELSE 0
  END AS fertile_rate_estimated
FROM chickens c
LEFT JOIN breeds b ON b.id = c.breed_id
LEFT JOIN litters_per_male lpm ON lpm.male_id = c.id
WHERE c.gender = 'trong'
GROUP BY c.id, c.chicken_code, c.name, b.name_vi;

-- =====================================================
-- 4. BREEDING WORKFLOW FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION set_expected_hatch_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expected_hatch_date IS NULL AND NEW.paired_date IS NOT NULL THEN
    NEW.expected_hatch_date := NEW.paired_date + INTERVAL '21 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_expected_hatch_date ON breeding_litters;
CREATE TRIGGER trigger_set_expected_hatch_date
  BEFORE INSERT ON breeding_litters
  FOR EACH ROW EXECUTE FUNCTION set_expected_hatch_date();

CREATE OR REPLACE FUNCTION generate_litter_code()
RETURNS TRIGGER AS $$
DECLARE
  v_year TEXT;
  v_seq INT;
BEGIN
  IF NEW.litter_code IS NOT NULL AND NEW.litter_code != '' THEN
    RETURN NEW;
  END IF;
  v_year := TO_CHAR(COALESCE(NEW.paired_date, CURRENT_DATE), 'YYYY');
  SELECT COUNT(*) + 1 INTO v_seq
  FROM breeding_litters
  WHERE TO_CHAR(paired_date, 'YYYY') = v_year;
  NEW.litter_code := 'L-' || v_year || '-' || LPAD(v_seq::TEXT, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_litter_code ON breeding_litters;
CREATE TRIGGER trigger_generate_litter_code
  BEFORE INSERT ON breeding_litters
  FOR EACH ROW EXECUTE FUNCTION generate_litter_code();

CREATE OR REPLACE FUNCTION auto_create_chick_group()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'da_no' AND (OLD.status IS NULL OR OLD.status != 'da_no') AND NEW.hatched_count > 0 THEN
    INSERT INTO chick_groups (litter_id, hatched_count, alive_count, cage_id)
    VALUES (NEW.id, NEW.hatched_count, NEW.hatched_count, NEW.cage_id)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_create_chick_group ON breeding_litters;
CREATE TRIGGER trigger_auto_create_chick_group
  AFTER UPDATE OF status ON breeding_litters
  FOR EACH ROW EXECUTE FUNCTION auto_create_chick_group();

CREATE OR REPLACE FUNCTION graduate_chicks(
  p_litter_id UUID,
  p_chicks JSONB
) RETURNS SETOF chickens AS $$
DECLARE
  v_litter breeding_litters%ROWTYPE;
  v_chick JSONB;
  v_new_chicken chickens%ROWTYPE;
  v_user_id UUID := auth.uid();
BEGIN
  SELECT * INTO v_litter FROM breeding_litters WHERE id = p_litter_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lứa không tồn tại'; END IF;
  IF v_litter.status != 'da_no' THEN RAISE EXCEPTION 'Lứa chưa nở'; END IF;

  FOR v_chick IN SELECT * FROM jsonb_array_elements(p_chicks)
  LOOP
    INSERT INTO chickens (
      name, breed_id, qr_tag_id, cage_id, gender,
      birth_date, source, parent_male_id, parent_female_id,
      breeding_litter_id, created_by
    ) VALUES (
      NULLIF(v_chick->>'name', ''),
      (v_chick->>'breed_id')::UUID,
      NULLIF(v_chick->>'qr_tag_id', '')::UUID,
      COALESCE(NULLIF(v_chick->>'cage_id', '')::UUID, v_litter.cage_id),
      COALESCE(v_chick->>'gender', 'chua_xac_dinh')::chicken_gender,
      v_litter.hatched_date,
      'no_tai_trai'::chicken_source,
      NULLIF(v_chick->>'parent_male_id', '')::UUID,
      v_litter.female_id,
      p_litter_id,
      v_user_id
    ) RETURNING * INTO v_new_chicken;

    RETURN NEXT v_new_chicken;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. AVAILABLE BREEDERS VIEWS
-- =====================================================

CREATE OR REPLACE VIEW available_females AS
SELECT
  c.id, c.chicken_code, c.name, c.birth_date,
  (DATE_PART('year', AGE(CURRENT_DATE, c.birth_date)) * 12
    + DATE_PART('month', AGE(CURRENT_DATE, c.birth_date)))::INT AS age_months,
  b.name_vi AS breed_name
FROM chickens c
LEFT JOIN breeds b ON b.id = c.breed_id
WHERE c.gender = 'mai'
  AND c.status = 'dang_nuoi'
  AND NOT EXISTS (
    SELECT 1 FROM breeding_litters bl
    WHERE bl.female_id = c.id AND bl.status = 'dang_ap'
  );

CREATE OR REPLACE VIEW available_males AS
SELECT
  c.id, c.chicken_code, c.name, c.birth_date,
  (DATE_PART('year', AGE(CURRENT_DATE, c.birth_date)) * 12
    + DATE_PART('month', AGE(CURRENT_DATE, c.birth_date)))::INT AS age_months,
  b.name_vi AS breed_name
FROM chickens c
LEFT JOIN breeds b ON b.id = c.breed_id
WHERE c.gender = 'trong'
  AND c.status = 'dang_nuoi';
