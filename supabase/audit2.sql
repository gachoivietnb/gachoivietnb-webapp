\echo === A1) Gà có parent_male_id trỏ tới gà MÁI (sai giới tính) ===
SELECT c.chicken_code, c.name, p.chicken_code AS father_code, p.gender AS father_gender
FROM chickens c JOIN chickens p ON p.id = c.parent_male_id
WHERE p.gender != 'trong' LIMIT 5;

\echo === A2) Gà có parent_female_id trỏ tới gà TRỐNG (sai giới tính) ===
SELECT c.chicken_code, c.name, p.chicken_code AS mother_code, p.gender AS mother_gender
FROM chickens c JOIN chickens p ON p.id = c.parent_female_id
WHERE p.gender != 'mai' LIMIT 5;

\echo === A3) Gà có parent = chính nó ===
SELECT chicken_code FROM chickens WHERE parent_male_id = id OR parent_female_id = id LIMIT 5;

\echo === A4) Gà con sinh TRƯỚC bố/mẹ ===
SELECT c.chicken_code, c.birth_date, p.chicken_code AS parent_code, p.birth_date AS parent_birth
FROM chickens c JOIN chickens p ON p.id IN (c.parent_male_id, c.parent_female_id)
WHERE c.birth_date IS NOT NULL AND p.birth_date IS NOT NULL AND c.birth_date < p.birth_date
LIMIT 5;

\echo === B1) Cage chứa quá capacity ===
SELECT cg.full_code, cg.capacity, COUNT(c.id) AS alive
FROM cages cg JOIN chickens c ON c.cage_id = cg.id
WHERE c.status IN ('dang_nuoi','dang_cach_ly')
GROUP BY cg.id, cg.full_code, cg.capacity
HAVING COUNT(c.id) > cg.capacity
LIMIT 10;

\echo === B2) Cage status bảo trì nhưng vẫn có gà ===
SELECT cg.full_code, cg.status, COUNT(c.id) AS chickens
FROM cages cg JOIN chickens c ON c.cage_id = cg.id
WHERE cg.status = 'bao_tri' AND c.status IN ('dang_nuoi','dang_cach_ly')
GROUP BY cg.id, cg.full_code, cg.status
LIMIT 5;

\echo === C1) sales_items có unit_price = 0 hoặc NULL ===
SELECT so.order_code, si.unit_price FROM sales_items si
JOIN sales_orders so ON so.id = si.sales_order_id
WHERE si.unit_price IS NULL OR si.unit_price = 0 LIMIT 10;

\echo === C2) sales_orders da_giao nhưng delivered_date NULL ===
SELECT order_code, status, delivered_date FROM sales_orders
WHERE status = 'da_giao' AND delivered_date IS NULL LIMIT 5;

\echo === C3) sales_order total_amount khác SUM(sales_items.unit_price) ===
SELECT so.order_code, so.total_amount, COALESCE(SUM(si.unit_price), 0) AS items_sum
FROM sales_orders so LEFT JOIN sales_items si ON si.sales_order_id = so.id
GROUP BY so.id, so.order_code, so.total_amount
HAVING ABS(so.total_amount - COALESCE(SUM(si.unit_price), 0)) > 1000
LIMIT 10;

\echo === C4) Cùng 1 chicken có 2+ sales_items active (bán 2 lần) ===
SELECT c.chicken_code, COUNT(*) AS count
FROM sales_items si
JOIN sales_orders so ON so.id = si.sales_order_id
JOIN chickens c ON c.id = si.chicken_id
WHERE so.status IN ('dat_coc', 'da_giao')
GROUP BY c.id, c.chicken_code
HAVING COUNT(*) > 1
LIMIT 10;

\echo === D1) breeding_litter với female_id là gà TRỐNG ===
SELECT bl.litter_code, p.chicken_code, p.gender FROM breeding_litters bl
JOIN chickens p ON p.id = bl.female_id
WHERE p.gender = 'trong' LIMIT 5;

\echo === D2) eggs_fertile > eggs_total ===
SELECT litter_code, eggs_total, eggs_fertile FROM breeding_litters
WHERE eggs_fertile > eggs_total LIMIT 5;

\echo === D3) status='da_no' nhưng hatched_count=0 hoặc NULL ===
SELECT litter_code, status, hatched_count FROM breeding_litters
WHERE status = 'da_no' AND COALESCE(hatched_count, 0) = 0 LIMIT 5;

\echo === E1) vaccinations cho gà đã chết ===
SELECT c.chicken_code, c.status, v.scheduled_date, v.status AS vax_status
FROM vaccinations v JOIN chickens c ON c.id = v.chicken_id
WHERE c.status = 'chet' AND v.status = 'cho_tiem'
LIMIT 10;

\echo === E2) Vaccine cùng loại cùng chicken tiêm 2+ lần trùng ngày ===
SELECT c.chicken_code, v.vaccine_id, v.scheduled_date, COUNT(*) AS count
FROM vaccinations v JOIN chickens c ON c.id = v.chicken_id
GROUP BY c.chicken_code, v.vaccine_id, v.scheduled_date
HAVING COUNT(*) > 1 LIMIT 10;

\echo === F1) chicken_media thuộc chicken đã xóa ===
SELECT m.id, m.chicken_id FROM chicken_media m
LEFT JOIN chickens c ON c.id = m.chicken_id WHERE c.id IS NULL LIMIT 5;

\echo === F2) chickens.main_photo_url trỏ tới URL không có trong chicken_media ===
SELECT c.chicken_code, c.main_photo_url FROM chickens c
WHERE c.main_photo_url IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM chicken_media m WHERE m.chicken_id = c.id AND m.drive_url = c.main_photo_url)
LIMIT 5;

\echo === G1) payroll_payments thiếu expense_id (lương đã chốt nhưng không có chi phí) ===
SELECT id, period_year, period_month, net_paid FROM payroll_payments WHERE expense_id IS NULL LIMIT 5;

\echo === G2) profiles có permissions JSONB dạng sai (phải là object) ===
SELECT id, full_name, jsonb_typeof(permissions) AS type FROM profiles
WHERE permissions IS NOT NULL AND jsonb_typeof(permissions) != 'object' LIMIT 5;

\echo === H1) expense amount < 0 ===
SELECT id, amount FROM expenses WHERE amount < 0 LIMIT 5;

\echo === H2) sales_orders cancelled nhưng chickens vẫn da_ban ===
SELECT so.order_code, c.chicken_code, c.status FROM sales_orders so
JOIN sales_items si ON si.sales_order_id = so.id
JOIN chickens c ON c.id = si.chicken_id
WHERE so.status = 'huy' AND c.status = 'da_ban' LIMIT 5;

\echo === I1) QR tags dùng bởi chicken chet/da_ban nhưng vẫn 'dang_su_dung' ===
SELECT qt.tag_number, qt.status, c.chicken_code, c.status AS chicken_status
FROM qr_tags qt JOIN chickens c ON c.id = qt.chicken_id
WHERE qt.status = 'dang_su_dung' AND c.status IN ('chet','da_ban')
LIMIT 10;

\echo === J1) activity_logs orphan (user_id đã xóa) ===
SELECT COUNT(*) FROM activity_logs al
LEFT JOIN profiles p ON p.id = al.user_id
WHERE p.id IS NULL AND al.user_id IS NOT NULL;

\echo === K1) chicken_media orphan (chicken xóa cascade ok?) ===
SELECT COUNT(*) AS orphan_media FROM chicken_media m
LEFT JOIN chickens c ON c.id = m.chicken_id WHERE c.id IS NULL;

\echo === L1) Customer có tier=vip nhưng total_spent < 50M và total_purchased < 5 ===
SELECT name, tier, total_spent, total_purchased FROM customers
WHERE tier = 'vip' AND total_spent < 50000000 AND total_purchased < 5 LIMIT 10;

\echo === M1) training_sessions cho gà MÁI (thường chỉ vần gà trống) ===
SELECT c.chicken_code, c.gender, ts.session_number FROM training_sessions ts
JOIN chickens c ON c.id = ts.chicken_id
WHERE c.gender = 'mai' LIMIT 5;

\echo === N1) Gà đánh status='da_ban' nhưng không có sales_item tương ứng ===
SELECT c.chicken_code, c.sale_date, c.sale_price FROM chickens c
WHERE c.status = 'da_ban'
  AND NOT EXISTS (
    SELECT 1 FROM sales_items si JOIN sales_orders so ON so.id = si.sales_order_id
    WHERE si.chicken_id = c.id AND so.status = 'da_giao'
  )
LIMIT 10;
