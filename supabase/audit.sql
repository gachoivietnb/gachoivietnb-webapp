\echo === 1) qr_tags.chicken_id vs chickens.qr_tag_id mismatch ===
SELECT qt.tag_number, qt.chicken_id, c.qr_tag_id
FROM qr_tags qt LEFT JOIN chickens c ON c.id = qt.chicken_id
WHERE qt.chicken_id IS NOT NULL AND (c.qr_tag_id IS NULL OR c.qr_tag_id != qt.id)
LIMIT 5;

\echo === 2) chickens.qr_tag_id back-ref mismatch ===
SELECT c.chicken_code, c.qr_tag_id, qt.chicken_id AS qt_chicken_id
FROM chickens c JOIN qr_tags qt ON qt.id = c.qr_tag_id
WHERE qt.chicken_id IS NULL OR qt.chicken_id != c.id LIMIT 5;

\echo === 3) qr_tags dang_su_dung nhưng chicken_id NULL ===
SELECT tag_number, status, chicken_id FROM qr_tags WHERE status = 'dang_su_dung' AND chicken_id IS NULL LIMIT 5;

\echo === 4) sales_orders da_giao nhưng chickens chưa da_ban ===
SELECT so.order_code, COUNT(si.id) items, SUM(CASE WHEN c.status='da_ban' THEN 1 ELSE 0 END) sold
FROM sales_orders so
LEFT JOIN sales_items si ON si.sales_order_id = so.id
LEFT JOIN chickens c ON c.id = si.chicken_id
WHERE so.status='da_giao'
GROUP BY so.id, so.order_code
HAVING COUNT(si.id) > 0 AND SUM(CASE WHEN c.status='da_ban' THEN 1 ELSE 0 END) = 0
LIMIT 5;

\echo === 5) medicines/feeds stock âm ===
SELECT 'medicine' tbl, code, name_vi, current_stock FROM medicines WHERE current_stock < 0
UNION ALL SELECT 'feed', code, name_vi, current_stock FROM feeds WHERE current_stock < 0;

\echo === 6) chickens self-loop parent ===
SELECT chicken_code FROM chickens WHERE parent_male_id = id OR parent_female_id = id LIMIT 5;

\echo === 7) chickens da_ban nhưng is_for_sale=true ===
SELECT COUNT(*) cnt FROM chickens WHERE status = 'da_ban' AND is_for_sale = true;

\echo === 8) chickens chet/da_ban nhưng vẫn còn cage_id ===
SELECT chicken_code, status, cage_id FROM chickens WHERE status IN ('chet','da_ban') AND cage_id IS NOT NULL LIMIT 10;

\echo === 9) vaccinations da_tiem nhưng actual_date NULL ===
SELECT COUNT(*) cnt FROM vaccinations WHERE status = 'da_tiem' AND actual_date IS NULL;

\echo === 10) breeding_litters hatched > fertile ===
SELECT litter_code, eggs_fertile, hatched_count FROM breeding_litters WHERE hatched_count > eggs_fertile LIMIT 5;

\echo === 11) chickens thiếu breed_id ===
SELECT COUNT(*) cnt FROM chickens WHERE breed_id IS NULL;

\echo === 12) expenses amount <= 0 ===
SELECT COUNT(*) cnt FROM expenses WHERE amount <= 0;

\echo === 13) sales_orders paid > total ===
SELECT order_code, paid_amount, total_amount FROM sales_orders WHERE paid_amount > total_amount LIMIT 5;

\echo === 14) customers total_spent mismatch ===
SELECT c.name, c.total_spent::INT, COALESCE(SUM(so.total_amount) FILTER (WHERE so.status='da_giao'), 0)::INT actual
FROM customers c LEFT JOIN sales_orders so ON so.customer_id = c.id
GROUP BY c.id, c.name, c.total_spent
HAVING ABS(c.total_spent - COALESCE(SUM(so.total_amount) FILTER (WHERE so.status='da_giao'), 0)) > 1000
LIMIT 10;

\echo === 15) cages status mismatch với chickens đang ở đó ===
SELECT cg.full_code, cg.status AS cage_status, COUNT(c.id) FILTER (WHERE c.status IN ('dang_nuoi','dang_cach_ly')) AS alive
FROM cages cg LEFT JOIN chickens c ON c.cage_id = cg.id
GROUP BY cg.id, cg.full_code, cg.status
HAVING (cg.status = 'trong' AND COUNT(c.id) FILTER (WHERE c.status IN ('dang_nuoi','dang_cach_ly')) > 0)
    OR (cg.status = 'dang_co_ga' AND COUNT(c.id) FILTER (WHERE c.status IN ('dang_nuoi','dang_cach_ly')) = 0)
LIMIT 10;

\echo === 16) Orphan sales_items (parent order đã xóa) ===
SELECT COUNT(*) cnt FROM sales_items si LEFT JOIN sales_orders so ON so.id = si.sales_order_id WHERE so.id IS NULL;

\echo === 17) Chickens có sale_price/sale_date nhưng status != da_ban ===
SELECT COUNT(*) cnt FROM chickens WHERE (sale_price IS NOT NULL OR sale_date IS NOT NULL) AND status != 'da_ban';

\echo === 18) Chickens status=da_ban nhưng sale_price NULL ===
SELECT chicken_code FROM chickens WHERE status = 'da_ban' AND sale_price IS NULL LIMIT 10;
