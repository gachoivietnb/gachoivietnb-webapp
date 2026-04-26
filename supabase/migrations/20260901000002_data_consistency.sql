-- =====================================================
-- DATA CONSISTENCY: cage.status sync + self-heal
-- =====================================================

-- 1. Trigger auto-sync cage.status khi chicken chuyển vào/ra
CREATE OR REPLACE FUNCTION sync_cage_status()
RETURNS TRIGGER AS $$
DECLARE
  v_cage_ids UUID[];
BEGIN
  -- Gom các cage_id bị ảnh hưởng
  IF TG_OP = 'DELETE' THEN
    v_cage_ids := ARRAY[OLD.cage_id];
  ELSIF TG_OP = 'INSERT' THEN
    v_cage_ids := ARRAY[NEW.cage_id];
  ELSE
    v_cage_ids := ARRAY[OLD.cage_id, NEW.cage_id];
  END IF;

  UPDATE cages cg
  SET status = CASE
    WHEN cg.status = 'bao_tri' THEN 'bao_tri'::cage_status
    WHEN EXISTS (
      SELECT 1 FROM chickens c
      WHERE c.cage_id = cg.id AND c.status IN ('dang_nuoi','dang_cach_ly')
    ) THEN 'dang_co_ga'::cage_status
    ELSE 'trong'::cage_status
  END
  WHERE cg.id = ANY(v_cage_ids) AND cg.id IS NOT NULL;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_cage_status ON chickens;
CREATE TRIGGER trigger_sync_cage_status
  AFTER INSERT OR UPDATE OF cage_id, status OR DELETE ON chickens
  FOR EACH ROW EXECUTE FUNCTION sync_cage_status();

-- 2. Self-heal: recompute cage.status toàn bộ
UPDATE cages cg
SET status = CASE
  WHEN cg.status = 'bao_tri' THEN 'bao_tri'::cage_status
  WHEN EXISTS (
    SELECT 1 FROM chickens c
    WHERE c.cage_id = cg.id AND c.status IN ('dang_nuoi','dang_cach_ly')
  ) THEN 'dang_co_ga'::cage_status
  ELSE 'trong'::cage_status
END;

-- 3. Self-heal: recompute customers.total_spent/total_purchased từ sales_orders
UPDATE customers c
SET
  total_spent = COALESCE((
    SELECT SUM(so.total_amount)
    FROM sales_orders so
    WHERE so.customer_id = c.id AND so.status = 'da_giao'
  ), 0),
  total_purchased = COALESCE((
    SELECT COUNT(*)
    FROM sales_orders so
    WHERE so.customer_id = c.id AND so.status = 'da_giao'
  ), 0),
  last_purchase_date = (
    SELECT MAX(COALESCE(so.delivered_date, so.order_date))
    FROM sales_orders so
    WHERE so.customer_id = c.id AND so.status = 'da_giao'
  );

-- 4. Self-heal: QR tags dang_su_dung không trỏ về chicken → reset về chua_su_dung
UPDATE qr_tags
SET status = 'chua_su_dung'
WHERE status = 'dang_su_dung' AND chicken_id IS NULL;

-- 5. Self-heal: chicken.is_for_sale = false nếu status != dang_nuoi
UPDATE chickens
SET is_for_sale = false
WHERE is_for_sale = true AND status NOT IN ('dang_nuoi');

-- 6. Self-heal: chet/da_ban thì clear cage_id
UPDATE chickens
SET cage_id = NULL
WHERE status IN ('chet', 'da_ban') AND cage_id IS NOT NULL;
