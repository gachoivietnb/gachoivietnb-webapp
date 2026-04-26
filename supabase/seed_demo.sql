-- =====================================================
-- DEMO DATA — Gà Chọi Việt NB
-- Chạy trên Postgres local sau migrations
-- =====================================================

-- Clean demo-generated rows (keep schema + breeds + qr_tags + areas/cages already seeded)
DELETE FROM activity_logs;
DELETE FROM alerts;
DELETE FROM news_articles;
DELETE FROM customer_reviews;
DELETE FROM ai_generations;
DELETE FROM sales_items;
DELETE FROM sales_orders;
DELETE FROM purchase_items;
DELETE FROM purchases;
DELETE FROM expenses;
DELETE FROM training_sessions;
DELETE FROM vaccinations;
DELETE FROM medicine_transactions;
DELETE FROM feed_transactions;
DELETE FROM chick_groups;
DELETE FROM breeding_litters;
DELETE FROM chickens;
DELETE FROM customers;
DELETE FROM feeds;
DELETE FROM medicines;
DELETE FROM staff_attendance;
DELETE FROM staff_assignments;

-- Update farm info
INSERT INTO system_settings (key, value)
VALUES ('farm_info', jsonb_build_object(
  'name', 'Gà Chọi Việt Ninh Bình',
  'short_name', 'Gà Chọi Việt NB',
  'address', 'Hoa Lư, Ninh Bình',
  'phone', '0912.345.678',
  'zalo', '0912345678',
  'facebook', 'https://fb.com/gachoivietnb',
  'email_business', 'info@gachoivietnb.com'
))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- ==========================================
-- CUSTOMERS (8, 2 VIP)
-- ==========================================
INSERT INTO customers (id, name, phone, zalo, email, address, tier, notes, total_purchased, total_spent, last_purchase_date)
SELECT
  uuid_generate_v4(),
  n, p, z, e, addr, tier::customer_tier, note, tp, ts, lpd::DATE
FROM (VALUES
  ('Trần Văn Hùng',   '0912345678', '0912345678', 'hung.tv@email.com', 'Hoa Lư, Ninh Bình',   'vip',    'Khách VIP từ 2024', 8, 67200000, (CURRENT_DATE - 3)::TEXT),
  ('Nguyễn Văn Đức',  '0987654321', '0987654321', NULL,                 'Nam Định',            'vip',    'Chơi Asil cao cấp', 5, 50000000, (CURRENT_DATE - 38)::TEXT),
  ('Lê Minh Tuấn',    '0909123456', '0909123456', 'tuan.lm@email.com',  'Hà Nội',              'thuong', 'Thường mua Peru', 3, 18500000, (CURRENT_DATE - 18)::TEXT),
  ('Phạm Thị Hoa',    '0932111222', '0932111222', NULL,                 'Hải Phòng',           'thuong', 'Mới, chuyển khoản đúng hạn', 1, 4800000, (CURRENT_DATE - 1)::TEXT),
  ('Hoàng Văn Khải',  '0978555666', '0978555666', NULL,                 'Thanh Hóa',           'thuong', 'Chuyên gà Nòi', 2, 8000000, (CURRENT_DATE - 60)::TEXT),
  ('Đỗ Anh Dũng',     '0911777888', '0911777888', 'dung.da@email.com',  'Quảng Ninh',          'thuong', NULL, 0, 0, NULL),
  ('Vũ Mạnh Cường',   '0924333444', '0924333444', NULL,                 'Bắc Giang',           'thuong', 'Giao hàng cẩn thận', 1, 6000000, (CURRENT_DATE - 90)::TEXT),
  ('Tạ Minh Quân',    '0968222111', '0968222111', NULL,                 'Ninh Bình',           'thuong', 'Khách quen đến trại xem', 0, 0, NULL)
) AS t(n, p, z, e, addr, tier, note, tp, ts, lpd);

-- ==========================================
-- CHICKENS: 50 con
-- ==========================================
DO $$
DECLARE
  v_area_a UUID; v_area_b UUID; v_area_c UUID; v_area_d UUID; v_area_e UUID;
  v_cage_a UUID; v_cage_b UUID; v_cage_c UUID; v_cage_d UUID; v_cage_e UUID;
  v_asil UUID; v_mlai UUID; v_peru UUID; v_noi UUID; v_tre UUID; v_tanc UUID; v_laif1 UUID;
  v_father1 UUID; v_father2 UUID; v_father3 UUID;
  v_mother1 UUID; v_mother2 UUID; v_mother3 UUID;
  i INT;
BEGIN
  SELECT id INTO v_asil FROM breeds WHERE code = 'ASIL';
  SELECT id INTO v_mlai FROM breeds WHERE code = 'MLAI';
  SELECT id INTO v_peru FROM breeds WHERE code = 'PERU';
  SELECT id INTO v_noi  FROM breeds WHERE code = 'NOI';
  SELECT id INTO v_tre  FROM breeds WHERE code = 'TRE';
  SELECT id INTO v_tanc FROM breeds WHERE code = 'TANC';
  SELECT id INTO v_laif1 FROM breeds WHERE code = 'LAIF1';

  SELECT id INTO v_area_a FROM areas WHERE code = 'A';
  SELECT id INTO v_area_b FROM areas WHERE code = 'B';
  SELECT id INTO v_area_c FROM areas WHERE code = 'C';
  SELECT id INTO v_area_d FROM areas WHERE code = 'D';
  SELECT id INTO v_area_e FROM areas WHERE code = 'E';

  SELECT cg.id INTO v_cage_a FROM cages cg JOIN cage_rows cr ON cr.id = cg.row_id WHERE cr.area_id = v_area_a ORDER BY cg.code LIMIT 1;
  SELECT cg.id INTO v_cage_b FROM cages cg JOIN cage_rows cr ON cr.id = cg.row_id WHERE cr.area_id = v_area_b ORDER BY cg.code LIMIT 1;
  SELECT cg.id INTO v_cage_c FROM cages cg JOIN cage_rows cr ON cr.id = cg.row_id WHERE cr.area_id = v_area_c ORDER BY cg.code LIMIT 1;
  SELECT cg.id INTO v_cage_d FROM cages cg JOIN cage_rows cr ON cr.id = cg.row_id WHERE cr.area_id = v_area_d ORDER BY cg.code LIMIT 1;
  SELECT cg.id INTO v_cage_e FROM cages cg JOIN cage_rows cr ON cr.id = cg.row_id WHERE cr.area_id = v_area_e ORDER BY cg.code LIMIT 1;

  -- 3 father roosters (older)
  INSERT INTO chickens (id, chicken_code, breed_id, name, gender, birth_date, status, source, weight_kg, color, description, cage_id, is_for_sale, listed_price)
  VALUES (uuid_generate_v4(), 'GA-ASIL-23-0001', v_asil, 'Đại Vương', 'trong', '2023-01-15', 'dang_nuoi', 'no_tai_trai', 3.1, 'Điều', 'Bố giống Asil — 9.5/10 điểm vần', v_cage_a, false, NULL)
  RETURNING id INTO v_father1;

  INSERT INTO chickens (id, chicken_code, breed_id, name, gender, birth_date, status, source, weight_kg, color, description, cage_id, is_for_sale, listed_price)
  VALUES (uuid_generate_v4(), 'GA-PERU-23-0002', v_peru, 'Hắc Long', 'trong', '2023-03-10', 'dang_nuoi', 'no_tai_trai', 3.3, 'Ô', 'Bố giống Peru cao cấp', v_cage_a, false, NULL)
  RETURNING id INTO v_father2;

  INSERT INTO chickens (id, chicken_code, breed_id, name, gender, birth_date, status, source, weight_kg, color, description, cage_id, is_for_sale, listed_price)
  VALUES (uuid_generate_v4(), 'GA-MLAI-22-0003', v_mlai, 'Hổ Đại', 'trong', '2022-11-20', 'dang_nuoi', 'mua', 3.0, 'Khét', 'Bố giống Mã Lai — gia phả 4 đời', v_cage_a, false, NULL)
  RETURNING id INTO v_father3;

  -- 3 mother hens
  INSERT INTO chickens (id, chicken_code, breed_id, name, gender, birth_date, status, source, weight_kg, color, description, cage_id)
  VALUES (uuid_generate_v4(), 'GA-ASIL-23-0004', v_asil, 'Phượng', 'mai', '2023-02-01', 'dang_nuoi', 'no_tai_trai', 2.3, 'Điều', 'Mẹ giống Asil — tỷ lệ nở 88%', v_cage_b)
  RETURNING id INTO v_mother1;

  INSERT INTO chickens (id, chicken_code, breed_id, name, gender, birth_date, status, source, weight_kg, color, description, cage_id)
  VALUES (uuid_generate_v4(), 'GA-PERU-23-0005', v_peru, 'Mai Hậu', 'mai', '2023-04-05', 'dang_nuoi', 'no_tai_trai', 2.4, 'Ô', 'Mẹ Peru — tỷ lệ nở 92%', v_cage_b)
  RETURNING id INTO v_mother2;

  INSERT INTO chickens (id, chicken_code, breed_id, name, gender, birth_date, status, source, weight_kg, color, description, cage_id)
  VALUES (uuid_generate_v4(), 'GA-MLAI-23-0006', v_mlai, 'Bạch Hậu', 'mai', '2023-01-22', 'dang_nuoi', 'no_tai_trai', 2.2, 'Bạch', 'Mẹ Mã Lai — top 3 tỷ lệ nở', v_cage_b)
  RETURNING id INTO v_mother3;

  -- 44 young chickens for sale (assorted)
  FOR i IN 1..44 LOOP
    INSERT INTO chickens (
      id, chicken_code, breed_id, name, gender, birth_date, status, source, weight_kg, color, description,
      cage_id, is_for_sale, listed_price, parent_male_id, parent_female_id
    )
    VALUES (
      uuid_generate_v4(),
      'GA-' || (ARRAY['ASIL','PERU','MLAI','NOI','TRE','TANC','LAIF1'])[1 + (i % 7)] || '-25-' || LPAD((1000 + i)::TEXT, 4, '0'),
      (ARRAY[v_asil, v_peru, v_mlai, v_noi, v_tre, v_tanc, v_laif1])[1 + (i % 7)],
      CASE i
        WHEN 1 THEN 'Hổ Vương' WHEN 2 THEN 'Thiết Vương' WHEN 3 THEN 'Bạch Hổ' WHEN 4 THEN 'Hoàng Đế'
        WHEN 5 THEN 'Bạch Long' WHEN 6 THEN 'Hắc Vũ' WHEN 7 THEN 'Lôi Vương' WHEN 8 THEN 'Tiên Nga'
        WHEN 9 THEN 'Phong Vương' WHEN 10 THEN 'Thanh Hậu' WHEN 11 THEN 'Linh Hậu' WHEN 12 THEN 'Đại Hoàng'
        WHEN 13 THEN 'Xích Long' WHEN 14 THEN 'Bạch Kim' WHEN 15 THEN 'Minh Vương' WHEN 16 THEN 'Vân Hậu'
        WHEN 17 THEN 'Trấn Ma' WHEN 18 THEN 'Hàn Vương' WHEN 19 THEN 'Thiên Tướng' WHEN 20 THEN 'Hỏa Long'
        WHEN 21 THEN 'Ngọc Phượng' WHEN 22 THEN 'Lam Vân' WHEN 23 THEN 'Vũ Sinh' WHEN 24 THEN 'Thanh Phong'
        ELSE NULL
      END,
      (CASE WHEN i % 3 = 0 THEN 'mai' ELSE 'trong' END)::chicken_gender,
      (CURRENT_DATE - ((i * 17 + 180) || ' days')::INTERVAL)::DATE,
      CASE
        WHEN i IN (2, 7) THEN 'chet'::chicken_status
        WHEN i IN (5, 13, 21) THEN 'da_ban'::chicken_status
        WHEN i IN (3, 11) THEN 'dang_cach_ly'::chicken_status
        ELSE 'dang_nuoi'::chicken_status
      END,
      'no_tai_trai'::chicken_source,
      2.0 + ((i % 20) * 0.1),
      (ARRAY['Điều', 'Ô', 'Khét', 'Bạch', 'Nhạn', 'Chuối', 'Xám', 'Cú Lâm'])[1 + (i % 8)],
      CASE WHEN i <= 10 THEN
        'Chiến kê ' || (ARRAY['Asil', 'Peru', 'Mã Lai', 'Nòi', 'Tre', 'Tân Châu', 'Lai F1'])[1 + (i % 7)] || ' thuần chủng. Vần tốt, đòn dứt khoát, phong độ ổn định. Phù hợp trường chiến lớn.'
      ELSE 'Gà giống chất lượng, nguồn gốc rõ ràng, gia phả minh bạch.'
      END,
      CASE
        WHEN i IN (2, 7) THEN NULL
        WHEN i IN (3, 11) THEN v_cage_e
        WHEN (i % 4) = 0 THEN v_cage_a
        ELSE v_cage_d
      END,
      CASE WHEN i IN (2, 7, 5, 13, 21) THEN FALSE ELSE TRUE END,
      CASE
        WHEN i % 7 = 0 THEN 15000000
        WHEN i % 7 = 1 THEN 8500000
        WHEN i % 7 = 2 THEN 6200000
        WHEN i % 7 = 3 THEN 12000000
        WHEN i % 7 = 4 THEN 4800000
        WHEN i % 7 = 5 THEN 3500000
        ELSE 2800000
      END,
      CASE WHEN i % 3 = 0 THEN v_father1 WHEN i % 3 = 1 THEN v_father2 ELSE v_father3 END,
      CASE WHEN i % 3 = 0 THEN v_mother1 WHEN i % 3 = 1 THEN v_mother2 ELSE v_mother3 END
    );
  END LOOP;

  -- Set some chickens as sold with sale_date + sale_price for P&L
  UPDATE chickens SET sale_date = CURRENT_DATE - INTERVAL '5 days', sale_price = 8500000,
    customer_id = (SELECT id FROM customers WHERE name = 'Trần Văn Hùng')
  WHERE status = 'da_ban' AND name = 'Bạch Long';

  UPDATE chickens SET sale_date = CURRENT_DATE - INTERVAL '20 days', sale_price = 6500000,
    customer_id = (SELECT id FROM customers WHERE name = 'Lê Minh Tuấn')
  WHERE status = 'da_ban' AND name = 'Xích Long';

  UPDATE chickens SET sale_date = CURRENT_DATE - INTERVAL '40 days', sale_price = 12000000,
    customer_id = (SELECT id FROM customers WHERE name = 'Nguyễn Văn Đức')
  WHERE status = 'da_ban' AND name = 'Ngọc Phượng';

  -- Set status_date for dead chickens
  UPDATE chickens SET status_date = CURRENT_DATE - INTERVAL '7 days' WHERE status = 'chet';
END $$;

-- ==========================================
-- MEDICINES inventory
-- ==========================================
INSERT INTO medicines (code, name_vi, unit, current_stock, min_stock_alert, cost_per_unit, is_active)
VALUES
  ('MED-001', 'Vime-Atropin',      'lọ',  0,  5,  85000, true),
  ('MED-002', 'Amoxicillin 500mg', 'hộp', 4,  10, 120000, true),
  ('MED-003', 'Enrofloxacin 10%',  'chai', 2, 5, 180000, true),
  ('MED-004', 'Vitamin B-complex', 'gói', 8,  20, 35000, true),
  ('MED-005', 'Tylosin 200mg',     'lọ',  18, 8,  95000, true),
  ('MED-006', 'Doxycycline 20%',   'chai', 25, 5, 240000, true),
  ('MED-007', 'Electrolyte',       'gói', 42, 15, 28000, true);

-- ==========================================
-- FEEDS inventory
-- ==========================================
INSERT INTO feeds (code, name_vi, unit, current_stock, min_stock_alert, cost_per_unit, is_active)
VALUES
  ('FEED-001', 'Cám viên GT-10', 'kg', 420, 200, 18000, true),
  ('FEED-002', 'Lúa ngô xay',    'kg', 380, 150, 12000, true),
  ('FEED-003', 'Cám con GT-01',  'kg', 45,  100, 22000, true),
  ('FEED-004', 'Thóc lứt',       'kg', 220, 100, 15000, true),
  ('FEED-005', 'Rau xanh mùng tơi', 'kg', 50,  0,  8000, true);

-- ==========================================
-- VACCINATIONS (some due today, some overdue)
-- ==========================================
DO $$
DECLARE
  v_newcastle UUID; v_h5n1 UUID; v_gumboro UUID; v_ib UUID;
  r RECORD;
  i INT := 0;
BEGIN
  SELECT id INTO v_newcastle FROM vaccines WHERE code = 'newcastle';
  SELECT id INTO v_h5n1 FROM vaccines WHERE code = 'h5n1';
  SELECT id INTO v_gumboro FROM vaccines WHERE code = 'gumboro';
  SELECT id INTO v_ib FROM vaccines WHERE code = 'ib';

  FOR r IN SELECT id FROM chickens WHERE status IN ('dang_nuoi', 'dang_cach_ly') ORDER BY created_at LIMIT 25 LOOP
    i := i + 1;
    IF i <= 12 THEN
      -- due today
      INSERT INTO vaccinations (chicken_id, vaccine_id, scheduled_date, status)
      VALUES (r.id, v_newcastle, CURRENT_DATE, 'cho_tiem');
    ELSIF i <= 15 THEN
      -- overdue (3 rows)
      INSERT INTO vaccinations (chicken_id, vaccine_id, scheduled_date, status)
      VALUES (r.id, v_gumboro, CURRENT_DATE - (i || ' days')::INTERVAL, 'cho_tiem');
    ELSIF i <= 20 THEN
      -- this week
      INSERT INTO vaccinations (chicken_id, vaccine_id, scheduled_date, status)
      VALUES (r.id, v_h5n1, CURRENT_DATE + ((i - 15) || ' days')::INTERVAL, 'cho_tiem');
    ELSE
      -- already done
      INSERT INTO vaccinations (chicken_id, vaccine_id, scheduled_date, actual_date, status)
      VALUES (r.id, v_ib, CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE - INTERVAL '30 days', 'da_tiem');
    END IF;
  END LOOP;
END $$;

-- ==========================================
-- TRAINING SESSIONS
-- ==========================================
INSERT INTO training_sessions (chicken_id, session_number, session_date, opponent_name, result, score_strength, score_appearance, score_aggression, notes)
SELECT
  c.id,
  (ROW_NUMBER() OVER (PARTITION BY c.id))::INT,
  CURRENT_DATE - ((ROW_NUMBER() OVER () * 7) || ' days')::INTERVAL,
  'Đối thủ cùng hạng',
  CASE WHEN (ROW_NUMBER() OVER ()) % 3 = 0 THEN 'thua' ELSE 'thang' END,
  7.5 + (ROW_NUMBER() OVER () % 3) * 0.5,
  8.0 + (ROW_NUMBER() OVER () % 3) * 0.3,
  7.0 + (ROW_NUMBER() OVER () % 3) * 0.6,
  'Phong độ tốt, đòn dứt khoát'
FROM chickens c
WHERE c.status = 'dang_nuoi' AND c.gender = 'trong'
LIMIT 15;

-- ==========================================
-- BREEDING LITTERS (8)
-- ==========================================
INSERT INTO breeding_litters (litter_code, female_id, male_ids, paired_date, status, eggs_total, eggs_fertile, hatched_count, hatched_date)
SELECT
  'L-2026-' || LPAD(g::TEXT, 3, '0'),
  (SELECT id FROM chickens WHERE name = 'Phượng'),
  ARRAY[(SELECT id FROM chickens WHERE name = 'Đại Vương')],
  (CURRENT_DATE - ((g * 15) || ' days')::INTERVAL)::DATE,
  CASE
    WHEN g <= 4 THEN 'dang_ap'::litter_status
    ELSE 'da_no'::litter_status
  END,
  15 + g,
  12 + g,
  CASE WHEN g >= 5 THEN 10 + g ELSE 0 END,
  CASE WHEN g >= 5 THEN (CURRENT_DATE - ((g * 15 - 28) || ' days')::INTERVAL)::DATE ELSE NULL END
FROM generate_series(1, 8) g;

-- ==========================================
-- SALES ORDERS (15 orders across statuses)
-- ==========================================
DO $$
DECLARE
  v_cust_hung UUID; v_cust_duc UUID; v_cust_tuan UUID; v_cust_hoa UUID; v_cust_khai UUID;
  v_staff UUID;
BEGIN
  SELECT id INTO v_cust_hung FROM customers WHERE name = 'Trần Văn Hùng';
  SELECT id INTO v_cust_duc FROM customers WHERE name = 'Nguyễn Văn Đức';
  SELECT id INTO v_cust_tuan FROM customers WHERE name = 'Lê Minh Tuấn';
  SELECT id INTO v_cust_hoa FROM customers WHERE name = 'Phạm Thị Hoa';
  SELECT id INTO v_cust_khai FROM customers WHERE name = 'Hoàng Văn Khải';

  SELECT id INTO v_staff FROM profiles WHERE role = 'chu_trai' LIMIT 1;

  -- 3 đã giao
  INSERT INTO sales_orders (id, order_code, customer_id, status, total_amount, deposit_amount, order_date, delivered_date, performed_by)
  VALUES
    (uuid_generate_v4(), 'BH-2026-001', v_cust_hung, 'da_giao', 8500000, 3000000, CURRENT_DATE - 5, CURRENT_DATE - 3, v_staff),
    (uuid_generate_v4(), 'BH-2026-002', v_cust_duc,  'da_giao', 12000000, 5000000, CURRENT_DATE - 40, CURRENT_DATE - 38, v_staff),
    (uuid_generate_v4(), 'BH-2026-003', v_cust_tuan, 'da_giao', 6500000, 2000000, CURRENT_DATE - 20, CURRENT_DATE - 18, v_staff);

  -- 2 đặt cọc
  INSERT INTO sales_orders (order_code, customer_id, status, total_amount, deposit_amount, order_date, performed_by)
  VALUES
    ('BH-2026-004', v_cust_hoa, 'dat_coc', 4800000, 1500000, CURRENT_DATE - 1, v_staff),
    ('BH-2026-005', v_cust_khai,'dat_coc', 15000000, 5000000, CURRENT_DATE, v_staff);

  -- 3 hỏi mua
  INSERT INTO sales_orders (order_code, customer_id, status, total_amount, order_date, performed_by)
  VALUES
    ('BH-2026-006', v_cust_hung, 'hoi_mua', 3500000, CURRENT_DATE, v_staff),
    ('BH-2026-007', v_cust_hoa,  'hoi_mua', 6200000, CURRENT_DATE, v_staff),
    ('BH-2026-008', v_cust_tuan, 'hoi_mua', 12000000, CURRENT_DATE - 1, v_staff);
END $$;

-- ==========================================
-- EXPENSES (past 3 months across 8 categories)
-- ==========================================
INSERT INTO expenses (expense_date, category_id, amount, description, performed_by)
SELECT
  CURRENT_DATE - (day_offset || ' days')::INTERVAL,
  (SELECT id FROM expense_categories WHERE code = cat_code),
  amt,
  descr,
  (SELECT id FROM profiles WHERE role = 'chu_trai' LIMIT 1)
FROM (VALUES
  (5,  'thuc_an',     5200000, 'Cám GT-10 1 tấn'),
  (12, 'thuc_an',     3800000, 'Lúa ngô 2 tạ'),
  (18, 'nhan_cong',  18500000, 'Lương nhân viên tháng'),
  (20, 'thuoc_thu_y', 1450000, 'Vaccine Newcastle 100 liều'),
  (25, 'dien_nuoc',    840000, 'Điện + nước tháng'),
  (30, 'van_chuyen',   450000, 'Giao hàng 2 đơn'),
  (35, 'thuc_an',     5100000, 'Cám tháng trước'),
  (40, 'marketing',    500000, 'Quảng cáo Zalo'),
  (45, 'khau_hao',   2000000, 'Khấu hao chuồng trại'),
  (50, 'du_phong',     300000, 'Chi phí khác'),
  (55, 'nhan_cong',  18000000, 'Lương tháng trước'),
  (60, 'thuc_an',     4900000, 'Thức ăn tháng -2'),
  (65, 'thuoc_thu_y', 1800000, 'Thuốc kháng sinh'),
  (72, 'dien_nuoc',    800000, 'Điện nước tháng -2'),
  (80, 'van_chuyen',   350000, 'Vận chuyển')
) AS x(day_offset, cat_code, amt, descr);

-- ==========================================
-- ASSIGN QR TAGS to some chickens
-- ==========================================
DO $$
DECLARE
  r RECORD;
  tag RECORD;
BEGIN
  FOR r IN SELECT id FROM chickens WHERE qr_tag_id IS NULL AND status IN ('dang_nuoi', 'dang_cach_ly') ORDER BY created_at LIMIT 30 LOOP
    SELECT id INTO tag FROM qr_tags WHERE status = 'chua_su_dung' ORDER BY tag_number LIMIT 1;
    IF FOUND THEN
      UPDATE qr_tags SET status = 'dang_su_dung', chicken_id = r.id WHERE id = tag.id;
      UPDATE chickens SET qr_tag_id = tag.id WHERE id = r.id;
    END IF;
  END LOOP;
END $$;

-- ==========================================
-- A few alerts
-- ==========================================
INSERT INTO alerts (alert_type, priority, title, message, related_entity_type, related_entity_id, status)
VALUES
  ('low_stock',    'cao',      'Hết thuốc Vime-Atropin',    'Cần nhập ngay, 0 lọ còn lại',     'medicine', (SELECT id FROM medicines WHERE code='MED-001'), 'chua_doc'),
  ('low_stock',    'trung_binh','Sắp hết Cám con GT-01',    'Còn 45/100 kg, đủ dùng 10 ngày',  'feed',    (SELECT id FROM feeds WHERE code='FEED-003'),    'chua_doc'),
  ('vaccination',  'cao',      'Vaccine Gumboro quá hạn',   '3 con quá hạn 3 ngày',            NULL,      NULL,                                              'chua_doc'),
  ('disease',      'khan_cap', 'Nghi dịch tại Khu A',       '2 gà chết gần nhau / baseline 1.2/ngày', 'area', (SELECT id FROM areas WHERE code='A'),    'chua_doc'),
  ('order',        'thap',     'Đơn hàng mới BH-2026-008',  'KH: Lê Minh Tuấn · 12M',          NULL,      NULL,                                              'chua_doc');

-- ==========================================
-- NEWS ARTICLES — 6 bài SEO (research từ web, viết lại)
-- ==========================================
INSERT INTO news_articles (slug, title, excerpt, body_markdown, cover_image_url, category, status, tags, seo_title, seo_description, source_url, source_name, published_at, view_count)
VALUES
  -- Bài 1: Giống gà Peru
  (
    'giong-ga-peru-dac-diem-phan-biet-ga-my-asil',
    'Giống Gà Peru: Đặc Điểm, Ưu Nhược Điểm, Phân Biệt Gà Mỹ & Asil',
    'Tổng quan chi tiết về giống gà Peru — chiến kê cỗ máy hạng nặng từ Nam Mỹ. Hướng dẫn phân biệt với gà Mỹ và Asil qua ngoại hình, lối đánh và thể lực.',
    $md$Trong thế giới chiến kê quốc tế, **gà Peru** được mệnh danh là "cỗ máy hạng nặng" với sức mạnh khủng khiếp cùng lối đá bền bỉ. Cùng với gà Mỹ và gà Asil, đây là bộ ba giống gà chọi ngoại được sư kê Việt Nam săn đón để lai tạo và nâng cấp đàn chiến kê. Bài viết này sẽ giúp bạn hiểu rõ đặc điểm gà Peru và cách phân biệt với hai giống còn lại.

## Nguồn gốc và đặc điểm ngoại hình gà Peru

Gà Peru có nguồn gốc từ đất nước Peru ở Nam Mỹ, được lai tạo qua nhiều thế kỷ từ các dòng gà bản địa kết hợp với gà chọi Tây Ban Nha. Đây là giống gà có thể hình đồ sộ và thuộc nhóm chiến kê đá cựa sắt nổi tiếng thế giới.

### Nhận dạng qua ngoại hình

- **Đầu to, mòng lá hoặc mòng dâu đổ**, mắt đen nháy, tinh nhanh
- **Mỏ dài màu đen**, đầu mỏ thường có vệt trắng đặc trưng
- **Lông bờm vừa phải**, không quá dày và rậm như gà Mỹ
- **Thân hình to cao**, trọng lượng trưởng thành dao động 3–4.5 kg
- **Chân hai đoạn rõ ràng**, chắc khoẻ, ngón giữa lúc nhỏ trắng, lớn lên chuyển song bạch đầu chỉ

### Màu lông điển hình

Gà Peru con thường có lông đen, khi trưởng thành chuyển sang các màu điều xanh, que, khét hoặc ô. Màu sắc đa dạng cũng là một trong những nét hấp dẫn của giống này.

## Ưu và nhược điểm của gà Peru

> "Gà Peru đá như cơn bão, một phát ra đòn là đối thủ chao đảo. Nhưng nếu không hạ gục nhanh, thể lực của chúng lại không dẻo bằng Asil." – kinh nghiệm nhiều sư kê đúc kết.

**Ưu điểm nổi bật:**

- Lực đá cực mạnh, đòn hiểm và sát thương cao
- Cấu trúc xương chắc, chịu đòn tốt
- Phù hợp với thể thức đá cựa sắt, cựa dao tốc độ cao
- Dễ lai tạo để cải thiện sức mạnh cho đàn gà nội

**Nhược điểm cần lưu ý:**

- Thể lực không bền bằng Asil khi trận đấu kéo dài
- Kích thước lớn khiến khả năng xoay trở kém linh hoạt hơn gà Mỹ
- Giá thành cao và khó nuôi thuần khi chưa thích nghi khí hậu nóng ẩm
- Cần chế độ dinh dưỡng và chăm sóc kỹ lưỡng

## Phân biệt gà Peru với gà Mỹ và gà Asil

### So sánh gà Peru và gà Mỹ

Gà Mỹ và gà Peru thường bị nhầm lẫn vì có dòng máu pha lẫn. Tuy nhiên có thể phân biệt qua các điểm:

1. **Thể hình**: Gà Mỹ nhỏ hơn, nhanh nhẹn hơn; Peru to nặng, uy dũng hơn
2. **Lông bờm**: Gà Mỹ lông bờm dày rậm, Peru vừa phải
3. **Lối đá**: Gà Mỹ đá tốc độ như "cơn lốc biên", Peru đá nặng đòn
4. **Thời gian trận đấu**: Gà Mỹ phù hợp trận ngắn, Peru cần kết thúc trong 1–2 hồ đầu

### So sánh gà Peru và gà Asil

Gà Asil (Ấn Độ/Pakistan) là dòng chiến kê cổ nhất thế giới với đặc điểm hoàn toàn khác:

- **Khung xương Asil** cực kỳ cứng chắc, da đỏ au và dày như lớp giáp tự nhiên
- **Thế trận**: Asil là bậc thầy chiến thuật, đá bền, đòn tinh tế; Peru đá mạnh bạo, dứt điểm nhanh
- **Sức bền**: Asil có thể thi đấu liên tục nhiều hồ, Peru thiên về đòn chết nhanh
- **Tính cách**: Asil điềm tĩnh, Peru hung hăng hơn

## Nên chọn giống nào để nuôi?

Tùy vào mục tiêu và điều kiện, sư kê có thể lựa chọn:

- Thích **cựa sắt kịch tính, kết thúc nhanh** → gà Mỹ hoặc lai Peru-Mỹ
- Chuộng **đòn thế kỹ thuật, trận đấu bền** → gà Asil
- Muốn **đòn nặng, sức phá huỷ** → gà Peru thuần hoặc lai

Tại Việt Nam, nhiều sư kê chọn phương án lai F1 giữa gà nòi Việt với gà Peru để giữ được sự lanh lợi truyền thống, đồng thời bổ sung sức mạnh và chiều cao. Bạn có thể tham khảo thêm các [giống gà chọi chuẩn](/giong) tại trang trại để chọn dòng phù hợp.

## Kết luận

Gà Peru là một trong những giống chiến kê đẳng cấp quốc tế với sức mạnh và đòn đá hủy diệt. Tuy nhiên để phát huy tối đa tiềm năng, sư kê cần hiểu rõ đặc điểm giống, có kỹ thuật nuôi dưỡng và lai tạo bài bản. Nếu bạn đang tìm chiến kê chất lượng, hãy xem [danh sách gà đang bán](/ban) của Gà Chọi Việt NB để được tư vấn trực tiếp.$md$,
    'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=1200&h=630&fit=crop',
    'giong-ga',
    'published',
    ARRAY['ga-peru','giong-ga','ga-my','ga-asil','chien-ke'],
    'Giống Gà Peru: Đặc Điểm & Cách Phân Biệt | Gà Chọi Việt NB',
    'Tìm hiểu giống gà Peru: đặc điểm ngoại hình, ưu nhược điểm và cách phân biệt với gà Mỹ, gà Asil. Hướng dẫn chi tiết từ sư kê lâu năm.',
    'https://channuoithuy.com.vn/ga-peru-va-nhung-dieu-can-biet/',
    'Chăn Nuôi Thuỷ',
    NOW() - INTERVAL '1 days',
    178
  ),
  -- Bài 2: Cách vần gà
  (
    'cach-van-ga-choi-dung-ky-thuat-moi-truong-thanh',
    'Cách Vần Gà Chọi Đúng Kỹ Thuật Cho Gà Mới Trưởng Thành',
    'Hướng dẫn chi tiết cách vần hơi, vần đòn và lịch vần theo tuần cho gà chọi tơ. Kỹ thuật chuẩn từ sư kê lão làng giúp gà lên chân, lên đòn nhanh chóng.',
    $md$Vần gà là công đoạn quan trọng nhất để biến một con **gà mộc** thành chiến kê thực thụ. Không chỉ rèn luyện thể lực, quá trình vần còn giúp gà tích lũy kinh nghiệm chiến đấu, tôi luyện đòn thế và tăng khả năng chịu đựng. Bài viết dưới đây tổng hợp kỹ thuật vần hơi, vần đòn chuẩn và lịch vần theo tuần áp dụng cho gà vừa trưởng thành.

## Vần gà là gì và tại sao cần vần?

Vần vỗ là quá trình tập luyện có hệ thống, kết hợp giữa đá đối kháng và các bài tập thể lực. Mục đích chính:

- Tăng **nhịp tim, dung tích phổi** để gà đá lâu không mệt
- Rèn **đòn thế, phản xạ** thông qua đối kháng thật
- Làm **da gà dày** hơn để chịu đòn tốt
- Giảm mỡ thừa, định hình cơ bắp săn chắc
- Tạo **tâm lý gan lỳ**, không sợ đối thủ

> "Gà tài mà không vần thì cũng chỉ là gà đẹp trong chuồng. Vần đúng kỹ thuật mới biến tài năng thành chiến thắng." – câu nói quen thuộc trong giới sư kê.

## Ba hình thức vần gà cơ bản

### 1. Vần hơi (tập sức bền)

Hai con gà được **bịt cựa, buộc mỏ**, chỉ cuốn chân và quần thảo. Bài này chủ yếu tăng nhịp tim, rèn sức bền, không gây thương tích.

- Thời gian: 20–40 phút/lần
- Tần suất: 1–2 lần/tuần
- Ưu điểm: an toàn, gà không bị hao đòn

### 2. Vần đòn (tập kỹ thuật)

Hai gà đá thật nhưng vẫn **bịt cựa** để tránh thương tích nặng. Đây là bài quan trọng nhất để rèn đòn thế và tâm lý chiến đấu.

- Thời gian: 15–25 phút/hồ
- Tần suất: 1 lần/8–20 ngày (tùy kỳ vần)
- Cần nghỉ dài để gà phục hồi

### 3. Chạy lồng / bắn chân

Cho gà **chạy quanh lồng** hoặc tập bắn chân 5–10 phút để duy trì thể lực giữa các kỳ vần. Đây là bài tập bổ trợ không thể thiếu.

## Lịch vần gà chọi theo tuần (chuẩn sư kê)

Dưới đây là phác đồ vần cho gà mới trưởng thành (khoảng 10–12 tháng tuổi), áp dụng trong khoảng 2–3 tháng trước khi ra trường:

1. **Kỳ 1 – Tuần 1–2**: Vần 1 hồ đòn (15–20 phút), nghỉ 8 ngày. Sau đó vần 1 hồ hơi (30–40 phút), nghỉ tiếp 7 ngày.
2. **Kỳ 2 – Tuần 3–5**: Vần 2 hồ đòn (17–25 phút), nghỉ 14–20 ngày. Kế tiếp vần 2 hồ hơi (30–40 phút), nghỉ 10 ngày.
3. **Kỳ 3 – Tuần 6–9**: Vần 3–4 hồ đòn (17–25 phút), nghỉ 21–28 ngày, kèm bắn chân 5 phút. Ba ngày sau vần 4 hồ hơi (30–40 phút), nghỉ 10 ngày.
4. **Tuần cuối trước trận**: Bắn chân 10 phút, nghỉ 7 ngày dưỡng sức rồi **ra trường**.

## Những lưu ý quan trọng khi vần gà

### Chọn thời tiết phù hợp

Nên vần vào **sáng sớm hoặc chiều mát**, trời khô ráo, nắng nhẹ. Tránh ngày mưa, gió lớn hoặc nhiệt độ quá cao/thấp – gà dễ cảm lạnh, trúng gió.

### Chăm sóc sau mỗi kỳ vần

- **Om bóp bằng rượu nghệ** cho tan đòn, dày da
- Cho gà ăn cơm nóng trộn **B1, B-complex**
- Bổ sung mồi tươi: thịt bò, lòng đỏ trứng, tôm tép
- Cho uống **Electrolyte** bù nước và khoáng

### Tránh các sai lầm phổ biến

- Vần quá sức, không đủ ngày nghỉ → gà kiệt sức, suy
- Chọn đối thủ quá mạnh/nhẹ → lệch tâm lý gà
- Vần khi gà chưa đủ tuổi (< 9 tháng) → hỏng xương khớp
- Không om bóp sau vần → gà bị sưng, bầm kéo dài

## Kết luận

Vần gà là nghệ thuật kết hợp giữa khoa học và kinh nghiệm. Một lịch vần bài bản kết hợp chăm sóc đúng cách sẽ đưa gà tơ của bạn đạt đỉnh phong độ. Nếu bạn cần **chiến kê đã được vần đòn sẵn**, hãy tham khảo [danh sách gà chiến](/ban) của Gà Chọi Việt NB để sở hữu ngay những chiến binh đã qua tôi luyện.$md$,
    'https://images.unsplash.com/photo-1612170153139-6f881ff067e0?w=1200&h=630&fit=crop',
    'kinh-nghiem',
    'published',
    ARRAY['van-ga','van-hoi','van-don','ga-to','ky-thuat'],
    'Cách Vần Gà Chọi Đúng Kỹ Thuật Theo Tuần | Gà Chọi Việt NB',
    'Kỹ thuật vần gà chọi chi tiết: vần hơi, vần đòn, lịch tập theo tuần cho gà mới trưởng thành. Bí quyết biến gà mộc thành chiến kê dũng mãnh.',
    'https://gachoiquelua.com/cach-huan-luyen-ga-choi-to-tang-the-luc-thanh-chien-ke/',
    'Gà Chọi Quê Lúa',
    NOW() - INTERVAL '3 days',
    345
  ),
  -- Bài 3: Thuốc bổ B-complex, Electrolyte
  (
    'thuoc-bo-ga-choi-b-complex-electrolyte-cach-dung',
    'Thuốc Bổ Gà Chọi: B-complex, Electrolyte & Cách Sử Dụng Chuẩn',
    'Hướng dẫn sử dụng B-complex và Electrolyte cho gà chọi đúng liều, đúng thời điểm. Bí quyết giúp chiến kê tăng thể lực, phục hồi nhanh và luôn sung sức.',
    $md$Trong hành trình nuôi dưỡng một chiến kê đỉnh cao, thuốc bổ đóng vai trò như "bệ đỡ dinh dưỡng" không thể thiếu. Hai loại phổ biến và hiệu quả nhất trong giới sư kê hiện nay là **B-complex** và **Electrolyte**. Bài viết dưới đây sẽ giúp bạn hiểu rõ công dụng, liều lượng và cách sử dụng đúng kỹ thuật.

## B-complex là gì và vì sao gà chọi cần?

B-complex là phức hợp các vitamin nhóm B, thường bao gồm **B1, B2, B3, B5, B6, B12**, cùng với **Biotin, Acid Folic** và đôi khi kèm Vitamin C. Đây là nhóm vitamin quan trọng cho quá trình chuyển hóa năng lượng, tạo máu và bảo vệ hệ thần kinh.

### Công dụng chính với gà chọi

- **Kích thích ăn uống, tăng hấp thu** dưỡng chất
- Hỗ trợ **tăng cân đều, phát triển cơ bắp** săn chắc
- Giúp gà **mọc lông đẹp, bóng mượt**, hạn chế cắn mổ lông
- **Giảm stress** sau vần, sau đá
- Rút ngắn thời gian **phục hồi sau chấn thương** và bệnh

### Liều lượng B-complex chuẩn

Tùy dạng bào chế mà liều dùng khác nhau:

1. **Dạng bột pha nước**: 1g pha với 1–2 lít nước uống, hoặc trộn 1g với 2–5kg thức ăn
2. **Dạng tiêm** (B-complex + C): 0.5–1ml/con, tiêm bắp khi gà suy, sau trận đấu nặng
3. **Dạng viên** (B-complex for Roosters): 1 viên/con/ngày, cho uống trực tiếp

Dùng liên tục **7–10 ngày** là một đợt, sau đó nghỉ rồi lặp lại.

## Electrolyte – "nước biển" cho chiến kê

Electrolyte là dung dịch bù khoáng và điện giải, chứa **Natri, Kali, Canxi, Magie, Glucose** và các vitamin bổ trợ. Vai trò tương tự Oresol ở người – bù nước và khoáng khi mất nhiều mồ hôi.

### Khi nào dùng Electrolyte?

- Sau **vần hơi, vần đòn** – gà ra nhiều mồ hôi, mất khoáng
- Sau **trận đá thực chiến** – phục hồi nhanh thể lực
- Ngày **thời tiết nóng bức** > 32°C
- Khi gà bị **tiêu chảy, mất nước**
- Trước trận đấu **2–3 ngày** để tích trữ khoáng

### Liều dùng chuẩn

- Pha **1g Electrolyte với 1 lít nước uống**
- Cho uống tự do trong 3–5 ngày liên tục
- Không pha cùng kháng sinh trừ khi có chỉ định

> Một sư kê giỏi không chỉ biết nuôi gà mà còn phải hiểu gà đang thiếu gì. Thuốc bổ đúng lúc có thể cứu cả phong độ trận đấu.

## Phác đồ kết hợp B-complex và Electrolyte

Dưới đây là lịch dùng bài bản cho gà trong giai đoạn luyện tập và thi đấu:

1. **Ngày vần**: Sáng cho uống Electrolyte pha loãng. Chiều sau vần cho 1 viên B-complex.
2. **Ngày nghỉ sau vần**: Duy trì B-complex 3 ngày, kết hợp mồi tươi (thịt bò, lòng đỏ trứng).
3. **Trước trận 3 ngày**: Dùng Electrolyte liều đầy đủ, kết hợp B-complex liều nhẹ.
4. **Sau trận**: Electrolyte + B-complex + C (dạng tiêm nếu gà suy).

## Lưu ý quan trọng khi dùng thuốc bổ

### Nên làm

- Đọc **kỹ hướng dẫn liều lượng** trên bao bì từng sản phẩm
- Pha nước sạch, uống hết trong ngày – không để qua đêm
- Kết hợp với **chế độ ăn đầy đủ**: thóc ngâm, rau xanh, mồi tươi
- Theo dõi **phản ứng** của gà trong 24h đầu dùng loại mới

### Không nên làm

- Lạm dụng **quá liều** → gà bị "ngộ" thuốc, chán ăn
- Dùng **liên tục quanh năm** không nghỉ → giảm tác dụng
- Trộn chung Electrolyte với **kháng sinh** nhóm Tetracycline
- Dùng thay thế **thức ăn tự nhiên** và mồi tươi

## Kết luận

B-complex và Electrolyte là hai "vũ khí" không thể thiếu trong tủ thuốc của bất kỳ sư kê nào. Sử dụng đúng liều, đúng thời điểm sẽ giúp chiến kê của bạn luôn ở đỉnh phong độ, phục hồi nhanh sau mỗi kỳ vần hay trận đá. Tham khảo thêm các [giống gà khỏe mạnh](/giong) được chăm sóc đúng chuẩn tại Gà Chọi Việt NB để sở hữu chiến kê chất lượng.$md$,
    'https://images.unsplash.com/photo-1569587112025-0d460e81a126?w=1200&h=630&fit=crop',
    'cham-soc',
    'published',
    ARRAY['thuoc-bo','b-complex','electrolyte','ga-choi','cham-soc'],
    'Thuốc Bổ Gà Chọi: B-complex & Electrolyte | Gà Chọi Việt NB',
    'Tất tần tật về B-complex, Electrolyte cho gà chọi: thành phần, liều lượng, thời điểm dùng và lưu ý. Giúp chiến kê luôn sung sức, phục hồi nhanh.',
    'https://greenvet.com.vn/b-complex',
    'Greenvet',
    NOW() - INTERVAL '5 days',
    421
  ),
  -- Bài 4: Om bóp nghệ rượu
  (
    'ky-thuat-om-bop-ga-choi-nghe-ruou',
    'Kỹ Thuật Om Bóp Gà Chọi Bằng Nghệ Rượu – Bí Quyết Sư Kê',
    'Công thức ngâm rượu nghệ, kỹ thuật om bóp đúng chuẩn giúp gà chọi da đỏ, dày, săn chắc. Hướng dẫn chi tiết từng bước và tần suất áp dụng hiệu quả nhất.',
    $md$Trong bộ kỹ thuật chăm sóc chiến kê, **om bóp bằng nghệ rượu** là công đoạn cổ truyền không thể thay thế. Đây là phương pháp giúp da gà dày lên, đỏ au và săn chắc – yếu tố sống còn trong những trận đòn cựa. Bài viết dưới đây chia sẻ công thức ngâm rượu nghệ, kỹ thuật om đúng chuẩn và những lưu ý vàng từ sư kê lâu năm.

## Vì sao phải om bóp gà chọi?

Khác với các giống gà nuôi thịt, **gà chọi cần lớp da dày và đàn hồi** để chịu được đòn đá trực tiếp từ đối thủ. Om bóp nghệ rượu mang lại ba lợi ích chính:

- **Làm dày da, đỏ da**: giảm sát thương khi bị đá
- **Tan đòn, tan máu bầm**: hồi phục nhanh sau va chạm
- **Giảm mỡ thừa, săn cơ**: vóc dáng chiến kê chuẩn
- **Khử khuẩn, chống nấm mốc**: giữ da khô, tránh bệnh ngoài da

> "Một chiến kê không được om nghệ thì dù tài giỏi cỡ nào cũng khó sống sót qua trận đòn dài. Da mỏng là yếu điểm chết người."

## Công thức pha rượu nghệ chuẩn sư kê

### Công thức cơ bản (dành cho người mới)

Nguyên liệu đơn giản, dễ tìm:

- **Nghệ già** (nghệ vàng hoặc nghệ đỏ): 1 phần
- **Rượu trắng 40 độ**: 3 phần

Giã nhuyễn nghệ, cho vào bình thủy tinh, đổ rượu ngập và đậy kín. **Ngâm tối thiểu 7 ngày** là có thể dùng, ngâm 30 ngày càng tốt.

### Công thức nâng cao (bí truyền)

Sư kê lâu năm thường phối hợp nhiều nguyên liệu để tăng hiệu quả:

1. **Nghệ xà cừ**: 100g – dày da, đỏ da
2. **Củ riềng**: 100g – khử lạnh, ấm da
3. **Vỏ măng cụt**: 200g – chống viêm, làm se
4. **Vỏ cây bần**: 200g – tan bầm, kháng khuẩn
5. **Gừng tươi**: 100g – tăng tuần hoàn
6. **Rượu trắng 40 độ**: 2–3 lít

Tất cả rửa sạch, giã dập, ngâm trong bình sành hoặc thủy tinh tối thiểu **30 ngày** trước khi dùng. Ngâm càng lâu hiệu quả càng cao.

## Kỹ thuật om bóp đúng chuẩn

### Chuẩn bị trước khi om

- Gà phải **tỉnh táo**, không vừa ăn no
- Phòng kín gió, nhiệt độ mát
- Khăn mềm, sạch; bình xịt hoặc bát nhỏ
- Rượu nghệ đã ngâm đủ ngày

### Các bước om bóp

1. **Làm ấm rượu** bằng cách ngâm bát vào nước nóng (không đun trực tiếp)
2. **Xịt hoặc nhúng khăn** vào rượu nghệ, vắt ráo
3. **Om theo thứ tự**: mỏ → đầu cổ → khe vai → ngực → hông → đùi → chân
4. Ở mỗi vùng, **vạch lông ra để rượu thấm vào da**
5. **Massage nhẹ** theo chiều cơ bắp, mỗi vùng 1–2 phút
6. Sau khi om, **phơi nắng sớm** 5–10 phút để da khô và hấp thu

### Tần suất om

- **Gà tơ mới bắt đầu**: 2–3 lần/tuần
- **Gà đang vần**: sau mỗi buổi vần
- **Sau trận đấu**: om hàng ngày 3–5 ngày liên tục
- **Giai đoạn dưỡng**: 1–2 lần/tuần duy trì

## Những sai lầm cần tránh

### Sai về công thức

- Dùng **rượu quá nhẹ** (< 35 độ) → nghệ không phai màu, không thấm
- Ngâm **chưa đủ ngày** → gà bị kích ứng, lột da
- Dùng nghệ **tươi quá non** → không đủ tinh chất curcumin

### Sai về kỹ thuật

- Om khi gà **vừa ăn no** → nôn mửa, khó chịu
- Om **quá mạnh tay** → bầm thêm, lông gãy
- Phơi nắng **quá lâu** (> 30 phút) → gà sốc nhiệt
- Không **phủ kín lông** sau om → gà cảm lạnh

## Kết luận

Om bóp nghệ rượu là nghệ thuật cần kiên trì và đúng kỹ thuật. Một chiến kê được om đều đặn sẽ có lớp da "đồng tiền" vô cùng lợi hại trên sàn đấu. Bạn có thể tìm hiểu thêm [các giống gà chọi](/giong) đã được chăm sóc theo chuẩn cổ truyền tại Gà Chọi Việt NB để sở hữu chiến kê khỏe mạnh, sẵn sàng ra trường.$md$,
    'https://images.unsplash.com/photo-1569631346732-4b6073525a36?w=1200&h=630&fit=crop',
    'kinh-nghiem',
    'published',
    ARRAY['om-bop','nghe-ruou','cham-soc','ky-thuat','da-ga'],
    'Kỹ Thuật Om Bóp Gà Chọi Bằng Nghệ Rượu | Gà Chọi Việt NB',
    'Hướng dẫn om bóp gà chọi bằng nghệ rượu: công thức pha, cách om từng bước, tần suất và lợi ích. Bí quyết giúp da gà dày, đỏ, săn chắc như thép.',
    'https://kiemlamthuathienhue.org.vn/cach-ngam-ruou-nghe-cho-ga-choi/',
    'Kiểm Lâm Thừa Thiên Huế',
    NOW() - INTERVAL '7 days',
    512
  ),
  -- Bài 5: Chăm gà sau khi đá về
  (
    'cach-cham-ga-choi-sau-khi-da-ve',
    'Cách Chăm Gà Chọi Sau Khi Đá Về – Phục Hồi Nhanh, Sung Sức',
    'Hướng dẫn vệ sinh vết thương, phục hồi thể lực và dinh dưỡng cho gà chọi sau trận đấu. Bí quyết giúp chiến kê nhanh hồi phục, không bị suy sau đá.',
    $md$Sau mỗi trận đấu, gà chọi thường mất nhiều máu, kiệt sức và mang theo nhiều vết thương. Cách chăm sóc trong **24–72 giờ đầu** sẽ quyết định gà có hồi phục hoàn toàn hay bị suy, lại tật, thậm chí bỏ mạng. Bài viết này tổng hợp quy trình chăm gà chọi sau đá chuẩn từ các sư kê giàu kinh nghiệm.

## Bước 1: Vệ sinh và xử lý vết thương

Ngay khi gà về đến nhà, cần thực hiện ngay các bước sau:

### Làm sạch vết thương

- Dùng **khăn ấm** lau sạch máu, bụi, đất cát trên toàn thân
- Rửa vết thương hở bằng **nước muối sinh lý** (NaCl 0.9%) hoặc **oxy già**
- Với vết thương sâu, rộng → dùng bông tăm nhúng oxy già lau nhẹ
- Thấm khô trước khi sát trùng

### Sát trùng và băng bó

1. Bôi **Betadine** hoặc **thuốc đỏ** lên vết hở nông
2. Với vết sâu: rắc **Terramycin** (kháng sinh dạng bột) trực tiếp
3. Nếu chảy máu nhiều → dùng **bột cầm máu** hoặc bột tam thất
4. Chỉ băng bó khi vết quá to; vết nhỏ để khô tự nhiên

### Xử lý vết bầm, sưng

- **Chườm đá lạnh** 10 phút giảm sưng ngay trong 1–2 giờ đầu
- Sau 6–12 giờ chuyển sang **chườm ấm** để tan bầm
- Dùng **rượu nghệ xoa bóp nhẹ** các vùng bầm tím
- Có thể bôi **kem Arnica** hoặc dầu gió xanh pha loãng

> "Sư kê giỏi không phải là người có gà thắng mọi trận, mà là người biết đưa gà thua trở về nguyên trạng để đánh tiếp."

## Bước 2: Hỗ trợ phục hồi thể lực

### Cho uống thuốc bổ

Ngay trong 24 giờ đầu:

- **Electrolyte** pha nước uống tự do – bù nước, bù khoáng
- **B-complex + C** dạng tiêm 1 mũi nếu gà suy nặng
- **Vitamin B1** trộn cơm nóng cho ăn
- Kháng sinh nhẹ (Amoxicillin, Ampicillin) nếu vết thương có nguy cơ nhiễm trùng

### Om bóp hàng ngày

Khác với om dưỡng thông thường, **om sau trận** cần nhẹ tay và tập trung vào vùng bầm:

1. Dùng **rượu nghệ đã pha loãng**
2. Xoa đều các vùng bầm, không day mạnh
3. Tiếp tục 3–5 ngày liên tục đến khi vết bầm tan hết
4. Kết hợp **chườm khăn ấm** trước om

## Bước 3: Dinh dưỡng phục hồi

Chế độ ăn sau đá khác hẳn ngày thường – ưu tiên **dễ tiêu, giàu đạm**:

- **Ngày 1**: Cơm nóng trộn B1, nước Electrolyte. Tránh thóc cứng.
- **Ngày 2–3**: Cháo loãng + lòng đỏ trứng gà ta. Thêm 1–2 miếng thịt bò xay.
- **Ngày 4–7**: Chuyển dần sang thóc ngâm mềm + mồi tươi (tôm, tép, thịt bò)
- **Sau tuần 1**: Trở lại chế độ bình thường + bổ sung rau xanh

### Mồi tươi khuyến nghị

- **Thịt bò xay**: phục hồi cơ bắp, bổ máu
- **Lòng đỏ trứng gà ta**: giàu protein dễ tiêu
- **Tôm, tép nhỏ**: bổ sung canxi
- **Sâu tươi, dế**: kích thích ăn ngon

## Bước 4: Môi trường nghỉ dưỡng

Môi trường tốt quyết định tốc độ hồi phục:

- **Nhốt riêng** trong chuồng yên tĩnh, **tránh gió lùa**
- **Giữ ấm bằng đèn sưởi** nếu trời lạnh dưới 20°C
- **Lót rơm khô, sạch** đáy chuồng để gà nằm thoải mái
- **Tắt điện ban đêm** để gà ngủ đủ giấc
- Kiểm tra **nhiệt độ, độ ẩm** chuồng mỗi ngày

## Bước 5: Theo dõi và xử lý biến chứng

### Dấu hiệu nguy hiểm

Cần can thiệp ngay nếu thấy:

- **Bỏ ăn, uống nước liên tục** trên 24 giờ
- **Sốt, rụt cổ, lim dim mắt**
- **Vết thương sưng đỏ, có mủ** hoặc mùi hôi
- **Phân lỏng, xanh, có máu**
- **Thở khò khè, há mỏ**

### Xử lý khi có biến chứng

1. Tăng liều kháng sinh theo đúng chỉ định thú y
2. Dùng **Enrofloxacin** với nhiễm trùng nặng
3. Tiêm **B-complex + C** mỗi 2 ngày
4. Nếu không đỡ trong 48 giờ → **đưa đến bác sĩ thú y**

## Kết luận

Chăm gà chọi sau khi đá về là công đoạn "vàng" mà bất kỳ sư kê nào cũng phải thành thạo. Một quy trình chăm sóc đúng kỹ thuật sẽ giúp chiến kê sớm trở lại đỉnh phong độ, sẵn sàng cho trận đấu tiếp theo. Nếu bạn đang tìm **gà chọi đã được chăm sóc bài bản**, hãy xem [gà chiến đang bán](/ban) của Gà Chọi Việt NB để sở hữu chiến kê khỏe mạnh ngay hôm nay.$md$,
    'https://images.unsplash.com/photo-1563281577-a7be47e20db9?w=1200&h=630&fit=crop',
    'cham-soc',
    'published',
    ARRAY['cham-soc','sau-da','vet-thuong','phuc-hoi','dinh-duong'],
    'Cách Chăm Gà Chọi Sau Khi Đá Về Chuẩn Nhất | Gà Chọi Việt NB',
    'Hướng dẫn chăm gà chọi sau khi đá về: vệ sinh vết thương, phục hồi thể lực, dinh dưỡng. Bí quyết giúp chiến kê nhanh khoẻ, không bị suy, không lại tật.',
    'https://goovetvn.com/tin/bi-quyet-cach-cham-soc-ga-choi.html',
    'Goovet',
    NOW() - INTERVAL '10 days',
    689
  ),
  -- Bài 6: Trường gà nổi tiếng
  (
    'truong-ga-noi-tieng-viet-nam-va-the-gioi',
    'Những Trường Gà Nổi Tiếng Ở Việt Nam Và Thế Giới',
    'Khám phá các trường gà huyền thoại: Thomo Campuchia, đấu trường Philippines, sân Thái Lan và văn hoá đá gà đặc sắc của các quốc gia châu Á.',
    $md$Đá gà không chỉ là thú chơi mà còn là di sản văn hoá lâu đời ở nhiều quốc gia châu Á. Mỗi nước có những **trường gà nổi tiếng** mang đặc trưng riêng, quy tụ chiến kê đỉnh cao và thu hút hàng triệu người hâm mộ. Bài viết này giới thiệu các đấu trường lừng danh từ Việt Nam đến quốc tế cùng nét văn hoá độc đáo đi kèm.

## Trường gà Thomo – Biểu tượng Đông Nam Á

**Trường gà Thomo** nằm ở vùng biên giới Campuchia – Việt Nam, gần cửa khẩu Thomo thuộc tỉnh Svay Rieng. Đây được xem là **trung tâm đá gà lớn nhất Đông Nam Á**, hoạt động hợp pháp và có giấy phép của chính quyền Campuchia.

### Đặc điểm nổi bật

- **Quy mô chuyên nghiệp**: sân đấu rộng, khán đài hàng ngàn chỗ
- **Thể thức đá cựa sắt** là chính, thời gian ngắn, kịch tính cao
- **Luật chơi rõ ràng**, có trọng tài giám sát
- **Diễn ra hàng ngày**, đặc biệt sôi động dịp cuối tuần và lễ Tết
- **Phát trực tiếp** qua các kênh livestream quốc tế

### Ý nghĩa văn hoá

Trong văn hoá Khmer, gà chọi được xem là **biểu tượng của lòng kiên trì và ý chí**. Chủ gà không chỉ nuôi con vật – họ đầu tư niềm tự hào và danh dự vào từng chiến kê. Thomo đã trở thành một phần bản sắc Campuchia, góp phần đưa ngành chăn nuôi gà chọi khu vực lên tầm công nghiệp.

> "Thomo không chỉ là sân đá – đó là thánh địa nơi sư kê khắp Đông Nam Á gặp gỡ, học hỏi và chứng minh đẳng cấp chiến kê quê hương."

## Philippines – Cường quốc đá gà số 1 thế giới

**Philippines** là quốc gia có truyền thống đá gà (sabong) lâu đời nhất và phát triển nhất thế giới. Luật pháp nước này **chính thức hợp pháp hoá** môn đá gà từ thế kỷ 19.

### Các đấu trường danh tiếng

1. **Roligon Mega Cockpit** (Manila) – đấu trường lớn nhất, sức chứa hàng ngàn người
2. **Araneta Cockpit** – trung tâm đá gà truyền thống
3. **World Slasher Cup** – giải đấu quốc tế thường niên quy tụ chiến kê từ hơn 20 nước
4. **Các sabungan địa phương** khắp 7.000 hòn đảo

### Giống gà đặc trưng

Philippines nổi tiếng với **gà Sweater, Kelso, Hatch, Roundhead** – những dòng lai tạo từ gà Mỹ được tối ưu cho cựa dao. Ngành công nghiệp gà chọi nước này tạo việc làm cho hàng triệu lao động.

## Thái Lan – Cái nôi của gà đòn Á Đông

Thái Lan nổi tiếng với truyền thống **đá gà đòn không cựa**, tập trung vào kỹ thuật và sức bền thay vì tốc độ. Các trường gà lớn tập trung tại:

- **Khorat, Nakhon Ratchasima** – vùng gà đòn Thái chuẩn
- **Bangkok** – khu vực tổ chức giải đấu quy mô lớn
- **Chiang Mai** – trung tâm giống gà đòn cổ

Đặc điểm gà chọi Thái là thể hình to, mỏ dài, cổ cao – đá hiểm và bền. Nhiều sư kê Việt Nam nhập giống gà Thái để lai với gà nòi bản địa.

## Các trường gà nổi tiếng tại Việt Nam

### Miền Bắc

- **Trường gà Hà Nội**: truyền thống lâu đời, chơi gà đòn nòi Bắc
- **Bắc Ninh, Bắc Giang**: cái nôi của dòng gà nòi cổ
- **Hải Phòng**: gà chọi đất Cảng nổi tiếng lỳ đòn

### Miền Trung

- **Bình Định**: quê hương gà nòi Bình Định lừng danh, đòn hiểm, tốc độ cao
- **Phú Yên, Khánh Hoà**: các dòng gà lai Mỹ chất lượng

### Miền Nam

- **Long An, Tây Ninh**: giáp biên Campuchia, chơi cựa sắt theo phong cách Thomo
- **Cà Mau, Bến Tre**: trường gà miền Tây sôi động dịp Tết
- **Đồng Nai, Bình Dương**: nơi hội tụ nhiều dòng gà ngoại nhập

## Văn hoá đá gà Á Đông

Đá gà là bộ môn gắn liền với nhiều nét văn hoá truyền thống:

1. **Biểu tượng bản lĩnh đàn ông**: gà chọi thể hiện sự dũng cảm, gan lỳ
2. **Gắn liền lễ hội**: nhiều làng nghề tổ chức đá gà dịp xuân, Tết
3. **Nghệ thuật nuôi dưỡng**: từ chọn giống, vần đòn đến om bóp – tất cả là tinh hoa
4. **Kinh tế phụ trợ**: tạo việc làm cho hàng triệu sư kê, nhà chăn nuôi

### Sự khác biệt giữa các quốc gia

- **Việt Nam**: chuộng gà đòn truyền thống, đá chay không cựa
- **Campuchia**: cựa sắt, thời gian ngắn, tốc độ cao
- **Philippines**: cựa dao, thể thức đa dạng, giải đấu quốc tế
- **Thái Lan**: gà đòn thuần, kỹ thuật tinh xảo

## Kết luận

Mỗi trường gà là một phần di sản văn hoá của dân tộc. Dù đá gà ở Việt Nam hiện còn nhiều hạn chế về mặt pháp lý, thú chơi gà chọi truyền thống vẫn được gìn giữ và phát triển trong phạm vi **văn hoá, lai tạo giống**. Nếu bạn muốn sở hữu chiến kê chuẩn các dòng nổi tiếng, hãy xem [các giống gà](/giong) được Gà Chọi Việt NB tuyển chọn và chăm sóc kỹ lưỡng.$md$,
    'https://images.unsplash.com/photo-1501706362039-c06b2d715385?w=1200&h=630&fit=crop',
    'tin-tuc',
    'published',
    ARRAY['truong-ga','thomo','campuchia','philippines','van-hoa'],
    'Trường Gà Nổi Tiếng Ở Việt Nam Và Thế Giới | Gà Chọi Việt NB',
    'Tìm hiểu các trường gà nổi tiếng: Thomo Campuchia, Philippines, Thái Lan. Khám phá văn hoá đá gà châu Á và vị thế của chiến kê Việt trên bản đồ thế giới.',
    'https://en.wikipedia.org/wiki/Cockfighting',
    'Wikipedia',
    NOW() - INTERVAL '14 days',
    903
  );

-- ==========================================
-- DONE — verify counts
-- ==========================================
SELECT 'chickens' AS tbl, COUNT(*) FROM chickens
UNION ALL SELECT 'customers', COUNT(*) FROM customers
UNION ALL SELECT 'sales_orders', COUNT(*) FROM sales_orders
UNION ALL SELECT 'vaccinations', COUNT(*) FROM vaccinations
UNION ALL SELECT 'breeding_litters', COUNT(*) FROM breeding_litters
UNION ALL SELECT 'training_sessions', COUNT(*) FROM training_sessions
UNION ALL SELECT 'expenses', COUNT(*) FROM expenses
UNION ALL SELECT 'alerts', COUNT(*) FROM alerts
UNION ALL SELECT 'medicines', COUNT(*) FROM medicines
UNION ALL SELECT 'feeds', COUNT(*) FROM feeds
UNION ALL SELECT 'news_articles', COUNT(*) FROM news_articles;
