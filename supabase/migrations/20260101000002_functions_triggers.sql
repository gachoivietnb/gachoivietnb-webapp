-- =====================================================
-- GÀ CHỌI VIỆT NB - FUNCTIONS & TRIGGERS
-- Part 2/4: auto-generate codes, auto-schedules, views
-- =====================================================

-- =====================================================
-- Auto-create profile khi user signup
-- =====================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'nhan_vien'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- Auto-update updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_breeds_updated_at BEFORE UPDATE ON breeds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_chickens_updated_at BEFORE UPDATE ON chickens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_sales_orders_updated_at BEFORE UPDATE ON sales_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- Auto generate chicken_code: GA-{BREED}-{YY}-{SEQ4}
-- =====================================================

CREATE OR REPLACE FUNCTION generate_chicken_code()
RETURNS TRIGGER AS $$
DECLARE
  v_breed_code TEXT;
  v_year TEXT;
  v_seq INT;
  v_new_code TEXT;
BEGIN
  IF NEW.chicken_code IS NOT NULL AND NEW.chicken_code != '' THEN
    RETURN NEW;
  END IF;

  SELECT code INTO v_breed_code FROM breeds WHERE id = NEW.breed_id;
  v_year := TO_CHAR(COALESCE(NEW.birth_date, CURRENT_DATE), 'YY');

  SELECT COUNT(*) + 1 INTO v_seq
  FROM chickens
  WHERE breed_id = NEW.breed_id
    AND TO_CHAR(COALESCE(birth_date, created_at::DATE), 'YY') = v_year;

  v_new_code := 'GA-' || v_breed_code || '-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');
  NEW.chicken_code := v_new_code;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_chicken_code
  BEFORE INSERT ON chickens
  FOR EACH ROW EXECUTE FUNCTION generate_chicken_code();

-- =====================================================
-- Auto generate cage.full_code: {AREA}-{ROW}-{CAGE}
-- =====================================================

CREATE OR REPLACE FUNCTION generate_cage_full_code()
RETURNS TRIGGER AS $$
DECLARE
  v_area_code TEXT;
  v_row_code TEXT;
BEGIN
  SELECT a.code, r.code INTO v_area_code, v_row_code
  FROM cage_rows r
  JOIN areas a ON a.id = r.area_id
  WHERE r.id = NEW.row_id;

  NEW.full_code := v_area_code || '-' || v_row_code || '-' || NEW.code;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_cage_full_code
  BEFORE INSERT OR UPDATE OF row_id, code ON cages
  FOR EACH ROW EXECUTE FUNCTION generate_cage_full_code();

-- =====================================================
-- Auto sync qr_tag status khi gắn vào gà
-- =====================================================

CREATE OR REPLACE FUNCTION sync_qr_tag_status()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.qr_tag_id IS DISTINCT FROM NEW.qr_tag_id) THEN
    IF TG_OP = 'UPDATE' AND OLD.qr_tag_id IS NOT NULL THEN
      UPDATE qr_tags
      SET status = 'chua_su_dung', chicken_id = NULL, assigned_at = NULL
      WHERE id = OLD.qr_tag_id;
    END IF;
    IF NEW.qr_tag_id IS NOT NULL THEN
      UPDATE qr_tags
      SET status = 'dang_su_dung', chicken_id = NEW.id, assigned_at = NOW()
      WHERE id = NEW.qr_tag_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_qr_tag
  AFTER INSERT OR UPDATE OF qr_tag_id ON chickens
  FOR EACH ROW EXECUTE FUNCTION sync_qr_tag_status();

-- =====================================================
-- Auto tạo lịch tiêm phòng khi tạo hồ sơ gà mới
-- =====================================================

CREATE OR REPLACE FUNCTION create_vaccination_schedule()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.birth_date IS NOT NULL THEN
    INSERT INTO vaccinations (chicken_id, vaccine_id, scheduled_date)
    SELECT NEW.id, v.id, NEW.birth_date + (v.default_age_days || ' days')::INTERVAL
    FROM vaccines v
    WHERE v.is_active = TRUE
    ON CONFLICT (chicken_id, vaccine_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_vaccination_schedule
  AFTER INSERT ON chickens
  FOR EACH ROW EXECUTE FUNCTION create_vaccination_schedule();

-- =====================================================
-- VIEW: chicken_cost_basis (placeholder — Phần 5 sẽ nâng cấp)
-- =====================================================

CREATE OR REPLACE VIEW chicken_cost_basis AS
SELECT
  c.id,
  c.chicken_code,
  c.cost_purchase,
  COALESCE(c.cost_purchase, 0) AS purchase_cost,
  CASE
    WHEN c.birth_date IS NOT NULL THEN
      EXTRACT(MONTH FROM AGE(COALESCE(c.status_date, CURRENT_DATE), c.birth_date))
    ELSE 0
  END AS months_raised,
  COALESCE(c.cost_purchase, 0) AS total_cost
FROM chickens c;

-- =====================================================
-- VIEW: chickens_for_sale_public
-- =====================================================

CREATE OR REPLACE VIEW chickens_for_sale_public AS
SELECT
  c.id,
  c.chicken_code,
  c.name,
  qt.tag_number,
  b.code AS breed_code,
  b.name_vi AS breed_name,
  c.gender,
  c.birth_date,
  EXTRACT(MONTH FROM AGE(CURRENT_DATE, c.birth_date)) AS age_months,
  c.weight_kg,
  c.color,
  c.listed_price,
  c.description,
  c.main_photo_url,
  c.created_at
FROM chickens c
JOIN breeds b ON b.id = c.breed_id
LEFT JOIN qr_tags qt ON qt.id = c.qr_tag_id
WHERE c.is_for_sale = TRUE
  AND c.status = 'dang_nuoi';
