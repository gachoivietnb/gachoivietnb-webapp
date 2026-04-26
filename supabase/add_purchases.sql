-- Demo data cho Mua vào (purchases + suppliers)
-- Chạy sau seed_demo.sql

DELETE FROM purchase_items;
DELETE FROM purchases;
DELETE FROM suppliers;

-- 5 suppliers
INSERT INTO suppliers (id, name, contact_person, phone, zalo, address, supplier_type, notes, is_active)
VALUES
  (uuid_generate_v4(), 'Trại Gà Minh Hải',       'Nguyễn Minh Hải', '0913000111', '0913000111', 'Hải Dương',      'trang_trai',   'Chuyên Asil thuần chủng', true),
  (uuid_generate_v4(), 'Trại Gà Đông Anh',       'Trần Văn Long',   '0914000222', '0914000222', 'Đông Anh, Hà Nội','trang_trai',  'Giá Peru tốt, giao nhanh', true),
  (uuid_generate_v4(), 'Anh Khánh (cá nhân)',    'Phạm Khánh',      '0915000333', '0915000333', 'Thanh Hóa',      'ca_nhan',      'Bán gà tơ, đã tiêm', true),
  (uuid_generate_v4(), 'Trại Gà Mã Lai Phú Quý', 'Lê Phú Quý',      '0916000444', '0916000444', 'Ninh Bình',      'trang_trai',   'Chuyên Mã Lai cao cấp', true),
  (uuid_generate_v4(), 'Chợ gà Bắc Ninh',        'Bà Hoa',          '0917000555', NULL,          'Từ Sơn, Bắc Ninh','cho',         'Giá rẻ, phải kiểm kỹ', true);

-- Helper: tạo purchase + auto tính total_quantity/amount từ purchase_items
DO $$
DECLARE
  v_staff UUID;
  v_sup_1 UUID; v_sup_2 UUID; v_sup_3 UUID; v_sup_4 UUID; v_sup_5 UUID;
  v_purchase_id UUID;
  v_chicken_ids UUID[];
  v_chicken UUID;
  v_total_amount NUMERIC := 0;
  v_count INT := 0;
  v_price NUMERIC;
BEGIN
  SELECT id INTO v_staff FROM profiles WHERE role = 'chu_trai' LIMIT 1;

  SELECT id INTO v_sup_1 FROM suppliers WHERE name = 'Trại Gà Minh Hải';
  SELECT id INTO v_sup_2 FROM suppliers WHERE name = 'Trại Gà Đông Anh';
  SELECT id INTO v_sup_3 FROM suppliers WHERE name = 'Anh Khánh (cá nhân)';
  SELECT id INTO v_sup_4 FROM suppliers WHERE name = 'Trại Gà Mã Lai Phú Quý';
  SELECT id INTO v_sup_5 FROM suppliers WHERE name = 'Chợ gà Bắc Ninh';

  -- =========================================================
  -- Purchase 1: Trại Gà Minh Hải — 3 con Asil, 15 ngày trước
  -- =========================================================
  v_chicken_ids := ARRAY(
    SELECT c.id FROM chickens c
    JOIN breeds b ON b.id = c.breed_id
    WHERE b.code = 'ASIL' AND c.source = 'no_tai_trai' AND c.status != 'chet'
    ORDER BY c.created_at LIMIT 3
  );

  v_total_amount := 0;
  v_count := 0;

  INSERT INTO purchases (purchase_code, supplier_id, purchase_date, total_quantity, total_amount, notes, performed_by)
  VALUES ('MV-2026-001', v_sup_1, CURRENT_DATE - 15, 0, 0, 'Mua giống Asil nhân đàn — đã kiểm tra tiêm phòng', v_staff)
  RETURNING id INTO v_purchase_id;

  FOREACH v_chicken IN ARRAY v_chicken_ids LOOP
    v_price := 2500000 + (v_count * 200000);
    INSERT INTO purchase_items (purchase_id, chicken_id, unit_price, notes)
    VALUES (v_purchase_id, v_chicken, v_price, 'Gà Asil tơ ~6 tháng');
    UPDATE chickens SET source = 'mua', cost_purchase = v_price WHERE id = v_chicken;
    v_total_amount := v_total_amount + v_price;
    v_count := v_count + 1;
  END LOOP;

  UPDATE purchases SET total_quantity = v_count, total_amount = v_total_amount WHERE id = v_purchase_id;

  -- =========================================================
  -- Purchase 2: Trại Gà Đông Anh — 2 con Peru, 30 ngày trước
  -- =========================================================
  v_chicken_ids := ARRAY(
    SELECT c.id FROM chickens c
    JOIN breeds b ON b.id = c.breed_id
    WHERE b.code = 'PERU' AND c.source = 'no_tai_trai' AND c.status != 'chet'
    ORDER BY c.created_at LIMIT 2
  );

  v_total_amount := 0;
  v_count := 0;

  INSERT INTO purchases (purchase_code, supplier_id, purchase_date, total_quantity, total_amount, notes, performed_by)
  VALUES ('MV-2026-002', v_sup_2, CURRENT_DATE - 30, 0, 0, 'Peru cao cấp, có giấy chứng nhận giống', v_staff)
  RETURNING id INTO v_purchase_id;

  FOREACH v_chicken IN ARRAY v_chicken_ids LOOP
    v_price := 5000000 + (v_count * 1000000);
    INSERT INTO purchase_items (purchase_id, chicken_id, unit_price, notes)
    VALUES (v_purchase_id, v_chicken, v_price, 'Peru thuần');
    UPDATE chickens SET source = 'mua', cost_purchase = v_price WHERE id = v_chicken;
    v_total_amount := v_total_amount + v_price;
    v_count := v_count + 1;
  END LOOP;

  UPDATE purchases SET total_quantity = v_count, total_amount = v_total_amount WHERE id = v_purchase_id;

  -- =========================================================
  -- Purchase 3: Anh Khánh — 5 con Nòi + Tre, 45 ngày trước
  -- =========================================================
  v_chicken_ids := ARRAY(
    SELECT c.id FROM chickens c
    JOIN breeds b ON b.id = c.breed_id
    WHERE b.code IN ('NOI', 'TRE') AND c.source = 'no_tai_trai' AND c.status != 'chet'
    ORDER BY c.created_at LIMIT 5
  );

  v_total_amount := 0;
  v_count := 0;

  INSERT INTO purchases (purchase_code, supplier_id, purchase_date, total_quantity, total_amount, notes, performed_by)
  VALUES ('MV-2026-003', v_sup_3, CURRENT_DATE - 45, 0, 0, 'Mua lẻ từ cá nhân, giá mềm', v_staff)
  RETURNING id INTO v_purchase_id;

  FOREACH v_chicken IN ARRAY v_chicken_ids LOOP
    v_price := 1200000 + (v_count * 150000);
    INSERT INTO purchase_items (purchase_id, chicken_id, unit_price, notes)
    VALUES (v_purchase_id, v_chicken, v_price, NULL);
    UPDATE chickens SET source = 'mua', cost_purchase = v_price WHERE id = v_chicken;
    v_total_amount := v_total_amount + v_price;
    v_count := v_count + 1;
  END LOOP;

  UPDATE purchases SET total_quantity = v_count, total_amount = v_total_amount WHERE id = v_purchase_id;

  -- =========================================================
  -- Purchase 4: Trại Mã Lai Phú Quý — 2 con Mã Lai, 60 ngày trước
  -- =========================================================
  v_chicken_ids := ARRAY(
    SELECT c.id FROM chickens c
    JOIN breeds b ON b.id = c.breed_id
    WHERE b.code = 'MLAI' AND c.source = 'no_tai_trai' AND c.status != 'chet'
    ORDER BY c.created_at LIMIT 2
  );

  v_total_amount := 0;
  v_count := 0;

  INSERT INTO purchases (purchase_code, supplier_id, purchase_date, total_quantity, total_amount, notes, performed_by)
  VALUES ('MV-2026-004', v_sup_4, CURRENT_DATE - 60, 0, 0, 'Gà bố mẹ nhân giống, đã kiểm phả 3 đời', v_staff)
  RETURNING id INTO v_purchase_id;

  FOREACH v_chicken IN ARRAY v_chicken_ids LOOP
    v_price := 8000000 + (v_count * 2000000);
    INSERT INTO purchase_items (purchase_id, chicken_id, unit_price, notes)
    VALUES (v_purchase_id, v_chicken, v_price, 'Mã Lai cao cấp, có gia phả');
    UPDATE chickens SET source = 'mua', cost_purchase = v_price WHERE id = v_chicken;
    v_total_amount := v_total_amount + v_price;
    v_count := v_count + 1;
  END LOOP;

  UPDATE purchases SET total_quantity = v_count, total_amount = v_total_amount WHERE id = v_purchase_id;

  -- =========================================================
  -- Purchase 5: Chợ gà Bắc Ninh — 4 con Tân Châu + Lai F1, 75 ngày trước
  -- =========================================================
  v_chicken_ids := ARRAY(
    SELECT c.id FROM chickens c
    JOIN breeds b ON b.id = c.breed_id
    WHERE b.code IN ('TANC', 'LAIF1') AND c.source = 'no_tai_trai' AND c.status != 'chet'
    ORDER BY c.created_at LIMIT 4
  );

  v_total_amount := 0;
  v_count := 0;

  INSERT INTO purchases (purchase_code, supplier_id, purchase_date, total_quantity, total_amount, notes, performed_by)
  VALUES ('MV-2026-005', v_sup_5, CURRENT_DATE - 75, 0, 0, 'Mua sỉ tại chợ phiên, kiểm tra kỹ trước khi về', v_staff)
  RETURNING id INTO v_purchase_id;

  FOREACH v_chicken IN ARRAY v_chicken_ids LOOP
    v_price := 1800000 + (v_count * 250000);
    INSERT INTO purchase_items (purchase_id, chicken_id, unit_price, notes)
    VALUES (v_purchase_id, v_chicken, v_price, NULL);
    UPDATE chickens SET source = 'mua', cost_purchase = v_price WHERE id = v_chicken;
    v_total_amount := v_total_amount + v_price;
    v_count := v_count + 1;
  END LOOP;

  UPDATE purchases SET total_quantity = v_count, total_amount = v_total_amount WHERE id = v_purchase_id;

  -- =========================================================
  -- Purchase 6: Minh Hải lần 2 — 2 con Asil bố, 90 ngày trước
  -- =========================================================
  v_chicken_ids := ARRAY(
    SELECT c.id FROM chickens c
    JOIN breeds b ON b.id = c.breed_id
    WHERE b.code = 'ASIL' AND c.source = 'no_tai_trai' AND c.status != 'chet'
    ORDER BY c.created_at DESC LIMIT 2
  );

  v_total_amount := 0;
  v_count := 0;

  INSERT INTO purchases (purchase_code, supplier_id, purchase_date, total_quantity, total_amount, notes, performed_by)
  VALUES ('MV-2026-006', v_sup_1, CURRENT_DATE - 90, 0, 0, 'Mua bố giống tuyển, đã test đá 3 buổi', v_staff)
  RETURNING id INTO v_purchase_id;

  FOREACH v_chicken IN ARRAY v_chicken_ids LOOP
    v_price := 12000000 + (v_count * 3000000);
    INSERT INTO purchase_items (purchase_id, chicken_id, unit_price, notes)
    VALUES (v_purchase_id, v_chicken, v_price, 'Bố giống tuyển');
    UPDATE chickens SET source = 'mua', cost_purchase = v_price WHERE id = v_chicken;
    v_total_amount := v_total_amount + v_price;
    v_count := v_count + 1;
  END LOOP;

  UPDATE purchases SET total_quantity = v_count, total_amount = v_total_amount WHERE id = v_purchase_id;
END $$;

-- Verify
SELECT
  (SELECT COUNT(*) FROM suppliers) AS suppliers,
  (SELECT COUNT(*) FROM purchases) AS purchases,
  (SELECT COUNT(*) FROM purchase_items) AS purchase_items,
  (SELECT SUM(total_amount)::BIGINT FROM purchases) AS total_spent;

SELECT p.purchase_code, s.name AS supplier, p.purchase_date, p.total_quantity AS qty, p.total_amount
FROM purchases p JOIN suppliers s ON s.id = p.supplier_id
ORDER BY p.purchase_date DESC;
