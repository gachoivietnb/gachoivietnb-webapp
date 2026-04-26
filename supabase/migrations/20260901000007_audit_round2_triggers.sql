-- =====================================================
-- AUDIT ROUND 2 — triggers + self-heal
-- =====================================================

-- 1. Auto-cancel pending vaccinations khi gà chết/bán/loại thải
CREATE OR REPLACE FUNCTION cancel_pending_vaccinations_on_chicken_inactive()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('chet', 'da_ban', 'loai_thai')
     AND (OLD.status IS NULL OR OLD.status NOT IN ('chet', 'da_ban', 'loai_thai')) THEN
    UPDATE vaccinations
    SET status = 'huy_bo'
    WHERE chicken_id = NEW.id AND status = 'cho_tiem';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cancel_vaccinations ON chickens;
CREATE TRIGGER trigger_cancel_vaccinations
  AFTER UPDATE OF status ON chickens
  FOR EACH ROW EXECUTE FUNCTION cancel_pending_vaccinations_on_chicken_inactive();

-- 2. Self-heal: hủy vaccinations cho gà đã inactive
UPDATE vaccinations v
SET status = 'huy_bo'
FROM chickens c
WHERE v.chicken_id = c.id
  AND v.status = 'cho_tiem'
  AND c.status IN ('chet', 'da_ban', 'loai_thai');

-- 3. Validate: paid_amount / deposit_amount không vượt total_amount
CREATE OR REPLACE FUNCTION validate_sales_order_amounts()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.paid_amount IS NOT NULL AND NEW.paid_amount > NEW.total_amount THEN
    RAISE EXCEPTION 'Đã trả (%) không thể lớn hơn tổng (%)', NEW.paid_amount, NEW.total_amount;
  END IF;
  IF NEW.deposit_amount IS NOT NULL AND NEW.deposit_amount > NEW.total_amount THEN
    RAISE EXCEPTION 'Đặt cọc (%) không thể lớn hơn tổng (%)', NEW.deposit_amount, NEW.total_amount;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_sales_order_amounts ON sales_orders;
CREATE TRIGGER trigger_validate_sales_order_amounts
  BEFORE INSERT OR UPDATE ON sales_orders
  FOR EACH ROW EXECUTE FUNCTION validate_sales_order_amounts();

-- 4. Khi cancel sales_order, release chicken (reset is_reserved + revert status nếu da_ban)
CREATE OR REPLACE FUNCTION release_reserved_chickens_on_cancel()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'huy' AND (OLD.status IS NULL OR OLD.status != 'huy') THEN
    UPDATE chickens SET is_reserved = false, reserved_for_order_id = NULL
    WHERE reserved_for_order_id = NEW.id;

    UPDATE chickens c
    SET status = 'dang_nuoi', sale_date = NULL, sale_price = NULL, customer_id = NULL
    FROM sales_items si
    WHERE si.sales_order_id = NEW.id
      AND c.id = si.chicken_id
      AND c.status = 'da_ban';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_release_on_cancel ON sales_orders;
CREATE TRIGGER trigger_release_on_cancel
  AFTER UPDATE OF status ON sales_orders
  FOR EACH ROW EXECUTE FUNCTION release_reserved_chickens_on_cancel();

-- 5. Auto-sync total_amount khi sales_items thay đổi
CREATE OR REPLACE FUNCTION sync_sales_order_total()
RETURNS TRIGGER AS $$
DECLARE
  v_order_id UUID;
  v_total NUMERIC;
BEGIN
  v_order_id := COALESCE(NEW.sales_order_id, OLD.sales_order_id);
  SELECT COALESCE(SUM(unit_price), 0) INTO v_total
  FROM sales_items WHERE sales_order_id = v_order_id;
  UPDATE sales_orders SET total_amount = v_total WHERE id = v_order_id;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_sales_total ON sales_items;
CREATE TRIGGER trigger_sync_sales_total
  AFTER INSERT OR UPDATE OF unit_price OR DELETE ON sales_items
  FOR EACH ROW EXECUTE FUNCTION sync_sales_order_total();

-- 6. Chặn medicines/feeds stock âm
ALTER TABLE medicines DROP CONSTRAINT IF EXISTS medicines_stock_nonneg;
ALTER TABLE medicines ADD CONSTRAINT medicines_stock_nonneg CHECK (current_stock >= 0);
ALTER TABLE feeds DROP CONSTRAINT IF EXISTS feeds_stock_nonneg;
ALTER TABLE feeds ADD CONSTRAINT feeds_stock_nonneg CHECK (current_stock >= 0);

-- 7. Self-heal: sync chicken.sale_price từ sales_items cho da_ban
UPDATE chickens c
SET sale_price = si.unit_price
FROM sales_items si
JOIN sales_orders so ON so.id = si.sales_order_id
WHERE si.chicken_id = c.id
  AND so.status = 'da_giao'
  AND c.status = 'da_ban'
  AND (c.sale_price IS NULL OR c.sale_price = 0);

-- 8. Self-heal: recompute customer totals
UPDATE customers c
SET
  total_spent = COALESCE((SELECT SUM(total_amount) FROM sales_orders WHERE customer_id = c.id AND status = 'da_giao'), 0),
  total_purchased = COALESCE((SELECT COUNT(*) FROM sales_orders WHERE customer_id = c.id AND status = 'da_giao'), 0);

-- 9. Cảnh báo khi chuồng quá tải (không chặn, tránh phá data hiện có)
CREATE OR REPLACE FUNCTION warn_cage_overflow()
RETURNS TRIGGER AS $$
DECLARE
  v_capacity INT;
  v_current INT;
BEGIN
  IF NEW.cage_id IS NULL OR NEW.status NOT IN ('dang_nuoi', 'dang_cach_ly') THEN
    RETURN NEW;
  END IF;
  SELECT capacity INTO v_capacity FROM cages WHERE id = NEW.cage_id;
  SELECT COUNT(*) INTO v_current FROM chickens
  WHERE cage_id = NEW.cage_id AND status IN ('dang_nuoi', 'dang_cach_ly');

  IF v_current > v_capacity THEN
    INSERT INTO alerts (alert_type, priority, title, message, related_entity_type, related_entity_id)
    SELECT 'cage_overflow', 'trung_binh',
      'Chuồng quá tải: ' || cg.full_code,
      'Chuồng có ' || v_current || ' con nhưng capacity chỉ ' || v_capacity || '. Nên phân bổ lại.',
      'cage', NEW.cage_id
    FROM cages cg WHERE cg.id = NEW.cage_id
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_warn_cage_overflow ON chickens;
CREATE TRIGGER trigger_warn_cage_overflow
  AFTER INSERT OR UPDATE OF cage_id ON chickens
  FOR EACH ROW EXECUTE FUNCTION warn_cage_overflow();

-- Verify
SELECT
  (SELECT COUNT(*) FROM vaccinations v JOIN chickens c ON c.id = v.chicken_id
   WHERE c.status IN ('chet','da_ban','loai_thai') AND v.status = 'cho_tiem') AS pending_vax_on_dead,
  (SELECT COUNT(*) FROM sales_orders WHERE paid_amount > total_amount) AS overpaid_orders,
  (SELECT COUNT(*) FROM medicines WHERE current_stock < 0) AS medicines_negative,
  (SELECT COUNT(*) FROM feeds WHERE current_stock < 0) AS feeds_negative;
