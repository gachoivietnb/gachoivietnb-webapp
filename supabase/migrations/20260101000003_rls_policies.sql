-- =====================================================
-- GÀ CHỌI VIỆT NB - ROW LEVEL SECURITY
-- Part 3/4: enable RLS + policies cho 3 role
-- =====================================================

-- Enable RLS trên TẤT CẢ bảng
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE breeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE cage_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE cages ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE chickens ENABLE ROW LEVEL SECURITY;
ALTER TABLE chicken_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE breeding_litters ENABLE ROW LEVEL SECURITY;
ALTER TABLE chick_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE vaccines ENABLE ROW LEVEL SECURITY;
ALTER TABLE vaccinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicine_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE diseases ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION auth_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_chu_trai()
RETURNS BOOLEAN AS $$
  SELECT auth_role() = 'chu_trai';
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_authenticated_staff()
RETURNS BOOLEAN AS $$
  SELECT auth_role() IN ('chu_trai', 'nhan_vien');
$$ LANGUAGE SQL SECURITY DEFINER;

-- =====================================================
-- POLICIES
-- =====================================================

-- PROFILES
CREATE POLICY "Users view own profile" ON profiles FOR SELECT
  USING (auth.uid() = id OR is_chu_trai());
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE
  USING (auth.uid() = id);
CREATE POLICY "Chu trai manages all profiles" ON profiles FOR ALL
  USING (is_chu_trai());

-- BREEDS
CREATE POLICY "Anyone view active breeds" ON breeds FOR SELECT
  USING (is_active = TRUE OR is_authenticated_staff());
CREATE POLICY "Chu trai manages breeds" ON breeds FOR ALL
  USING (is_chu_trai());

-- AREAS, CAGE_ROWS, CAGES
CREATE POLICY "Staff view areas" ON areas FOR SELECT USING (is_authenticated_staff());
CREATE POLICY "Chu trai manages areas" ON areas FOR ALL USING (is_chu_trai());

CREATE POLICY "Staff view rows" ON cage_rows FOR SELECT USING (is_authenticated_staff());
CREATE POLICY "Chu trai manages rows" ON cage_rows FOR ALL USING (is_chu_trai());

CREATE POLICY "Staff view cages" ON cages FOR SELECT USING (is_authenticated_staff());
CREATE POLICY "Chu trai manages cages" ON cages FOR ALL USING (is_chu_trai());

-- QR_TAGS
CREATE POLICY "Staff view qr tags" ON qr_tags FOR SELECT USING (is_authenticated_staff());
CREATE POLICY "Staff update qr tags" ON qr_tags FOR UPDATE USING (is_authenticated_staff());
CREATE POLICY "Chu trai manages qr tags" ON qr_tags FOR ALL USING (is_chu_trai());
CREATE POLICY "Public lookup qr tags" ON qr_tags FOR SELECT USING (TRUE);

-- CHICKENS
CREATE POLICY "Public view chickens for sale" ON chickens FOR SELECT
  USING (is_for_sale = TRUE AND status = 'dang_nuoi');
CREATE POLICY "Staff view all chickens" ON chickens FOR SELECT
  USING (is_authenticated_staff());
CREATE POLICY "Staff manages chickens" ON chickens FOR ALL
  USING (is_authenticated_staff());

-- CHICKEN_MEDIA
CREATE POLICY "Public view media of for-sale chickens" ON chicken_media FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chickens
      WHERE chickens.id = chicken_media.chicken_id
      AND chickens.is_for_sale = TRUE
    )
  );
CREATE POLICY "Staff manages chicken media" ON chicken_media FOR ALL
  USING (is_authenticated_staff());

-- VACCINES
CREATE POLICY "Anyone view vaccines" ON vaccines FOR SELECT USING (TRUE);
CREATE POLICY "Chu trai manages vaccines" ON vaccines FOR ALL USING (is_chu_trai());

-- Staff-only tables
CREATE POLICY "Staff full access vaccinations" ON vaccinations FOR ALL USING (is_authenticated_staff());
CREATE POLICY "Staff full access medicines" ON medicines FOR ALL USING (is_authenticated_staff());
CREATE POLICY "Staff full access medicine_transactions" ON medicine_transactions FOR ALL USING (is_authenticated_staff());
CREATE POLICY "Staff full access feeds" ON feeds FOR ALL USING (is_authenticated_staff());
CREATE POLICY "Staff full access feed_transactions" ON feed_transactions FOR ALL USING (is_authenticated_staff());
CREATE POLICY "Staff full access diseases" ON diseases FOR ALL USING (is_authenticated_staff());
CREATE POLICY "Staff full access training_sessions" ON training_sessions FOR ALL USING (is_authenticated_staff());
CREATE POLICY "Staff full access breeding_litters" ON breeding_litters FOR ALL USING (is_authenticated_staff());
CREATE POLICY "Staff full access chick_groups" ON chick_groups FOR ALL USING (is_authenticated_staff());
CREATE POLICY "Staff full access suppliers" ON suppliers FOR ALL USING (is_authenticated_staff());
CREATE POLICY "Staff full access purchases" ON purchases FOR ALL USING (is_authenticated_staff());
CREATE POLICY "Staff full access purchase_items" ON purchase_items FOR ALL USING (is_authenticated_staff());
CREATE POLICY "Staff full access sales_orders" ON sales_orders FOR ALL USING (is_authenticated_staff());
CREATE POLICY "Staff full access sales_items" ON sales_items FOR ALL USING (is_authenticated_staff());
CREATE POLICY "Staff full access alerts" ON alerts FOR ALL USING (is_authenticated_staff());

-- CUSTOMERS — public có thể INSERT (form liên hệ)
CREATE POLICY "Staff full access customers" ON customers FOR ALL USING (is_authenticated_staff());
CREATE POLICY "Public insert customers" ON customers FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Staff full access customer_alerts" ON customer_alerts FOR ALL USING (is_authenticated_staff());

-- EXPENSES — chỉ chu_trai
CREATE POLICY "Anyone view expense_categories" ON expense_categories FOR SELECT USING (TRUE);
CREATE POLICY "Chu trai manages expense_categories" ON expense_categories FOR ALL USING (is_chu_trai());
CREATE POLICY "Chu trai manages expenses" ON expenses FOR ALL USING (is_chu_trai());

-- STAFF HR
CREATE POLICY "Chu trai manages attendance" ON staff_attendance FOR ALL USING (is_chu_trai());
CREATE POLICY "Staff view own attendance" ON staff_attendance FOR SELECT USING (staff_id = auth.uid());
CREATE POLICY "Chu trai manages assignments" ON staff_assignments FOR ALL USING (is_chu_trai());
CREATE POLICY "Staff view own assignments" ON staff_assignments FOR SELECT USING (staff_id = auth.uid());

-- ACTIVITY_LOGS
CREATE POLICY "Chu trai view activity logs" ON activity_logs FOR SELECT USING (is_chu_trai());
CREATE POLICY "System inserts activity logs" ON activity_logs FOR INSERT WITH CHECK (TRUE);

-- SYSTEM_SETTINGS
CREATE POLICY "Anyone read farm_info" ON system_settings FOR SELECT
  USING (key = 'farm_info' OR is_authenticated_staff());
CREATE POLICY "Chu trai manages settings" ON system_settings FOR ALL USING (is_chu_trai());
