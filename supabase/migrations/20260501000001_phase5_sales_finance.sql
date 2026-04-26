-- =====================================================
-- PHASE 5: SALES & FINANCE
-- =====================================================

-- =====================================================
-- 1. ALTER CHICKENS: add reservation + sale fields
-- =====================================================

ALTER TABLE chickens ADD COLUMN IF NOT EXISTS is_reserved BOOLEAN DEFAULT FALSE;
ALTER TABLE chickens ADD COLUMN IF NOT EXISTS reserved_for_order_id UUID;
ALTER TABLE chickens ADD COLUMN IF NOT EXISTS sale_date DATE;
ALTER TABLE chickens ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);
ALTER TABLE chickens ADD COLUMN IF NOT EXISTS sale_price DECIMAL(15,2);

CREATE INDEX IF NOT EXISTS idx_chickens_reserved ON chickens(is_reserved) WHERE is_reserved = TRUE;

-- =====================================================
-- 2. ALTER SALES_ORDERS: paid_amount + bank_transfer_ref
-- =====================================================

ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(15,2) DEFAULT 0;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS bank_transfer_ref TEXT;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS deposit_date DATE;

-- =====================================================
-- 3. AUTO CODES triggers (purchase, order)
-- =====================================================

CREATE OR REPLACE FUNCTION generate_purchase_code()
RETURNS TRIGGER AS $$
DECLARE v_year TEXT; v_seq INT;
BEGIN
  IF NEW.purchase_code IS NOT NULL AND NEW.purchase_code != '' THEN RETURN NEW; END IF;
  v_year := TO_CHAR(COALESCE(NEW.purchase_date, CURRENT_DATE), 'YYYY');
  SELECT COUNT(*) + 1 INTO v_seq FROM purchases WHERE TO_CHAR(purchase_date, 'YYYY') = v_year;
  NEW.purchase_code := 'NH-' || v_year || '-' || LPAD(v_seq::TEXT, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_purchase_code ON purchases;
CREATE TRIGGER trigger_generate_purchase_code
  BEFORE INSERT ON purchases FOR EACH ROW EXECUTE FUNCTION generate_purchase_code();

CREATE OR REPLACE FUNCTION generate_order_code()
RETURNS TRIGGER AS $$
DECLARE v_year TEXT; v_seq INT;
BEGIN
  IF NEW.order_code IS NOT NULL AND NEW.order_code != '' THEN RETURN NEW; END IF;
  v_year := TO_CHAR(COALESCE(NEW.order_date, CURRENT_DATE), 'YYYY');
  SELECT COUNT(*) + 1 INTO v_seq FROM sales_orders WHERE TO_CHAR(order_date, 'YYYY') = v_year;
  NEW.order_code := 'BH-' || v_year || '-' || LPAD(v_seq::TEXT, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_order_code ON sales_orders;
CREATE TRIGGER trigger_generate_order_code
  BEFORE INSERT ON sales_orders FOR EACH ROW EXECUTE FUNCTION generate_order_code();

-- =====================================================
-- 4. SYNC chicken status với sales_orders status
-- =====================================================

CREATE OR REPLACE FUNCTION sync_chicken_with_order_status()
RETURNS TRIGGER AS $$
DECLARE v_chicken_ids UUID[];
BEGIN
  SELECT array_agg(chicken_id) INTO v_chicken_ids
  FROM sales_items WHERE sales_order_id = NEW.id;

  IF v_chicken_ids IS NULL OR array_length(v_chicken_ids, 1) = 0 THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'dat_coc' AND (OLD.status IS NULL OR OLD.status != 'dat_coc') THEN
    UPDATE chickens SET is_reserved = TRUE, reserved_for_order_id = NEW.id
    WHERE id = ANY(v_chicken_ids);
  END IF;

  IF NEW.status = 'huy' AND OLD.status != 'huy' THEN
    UPDATE chickens SET is_reserved = FALSE, reserved_for_order_id = NULL
    WHERE id = ANY(v_chicken_ids) AND reserved_for_order_id = NEW.id;
  END IF;

  IF NEW.status = 'da_giao' AND OLD.status != 'da_giao' THEN
    UPDATE chickens
    SET status = 'da_ban', is_reserved = FALSE, reserved_for_order_id = NULL,
        sale_date = COALESCE(NEW.delivered_date, CURRENT_DATE),
        customer_id = NEW.customer_id,
        sale_price = (SELECT unit_price FROM sales_items
                      WHERE sales_order_id = NEW.id AND chicken_id = chickens.id)
    WHERE id = ANY(v_chicken_ids);

    IF NEW.customer_id IS NOT NULL THEN
      UPDATE customers
      SET total_purchased = total_purchased + array_length(v_chicken_ids, 1),
          total_spent = total_spent + NEW.total_amount,
          last_purchase_date = COALESCE(NEW.delivered_date, CURRENT_DATE)
      WHERE id = NEW.customer_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_chicken_with_order_status ON sales_orders;
CREATE TRIGGER trigger_sync_chicken_with_order_status
  AFTER UPDATE OF status ON sales_orders
  FOR EACH ROW EXECUTE FUNCTION sync_chicken_with_order_status();

-- =====================================================
-- 5. VIEW chicken_cost_basis (REPLACE)
-- =====================================================

DROP VIEW IF EXISTS chicken_cost_basis CASCADE;

CREATE OR REPLACE VIEW chicken_cost_basis AS
WITH default_monthly_cost AS (
  SELECT COALESCE((value->>'value')::DECIMAL, 100000) AS amount
  FROM system_settings WHERE key = 'default_cost_per_chicken_per_month'
),
medicine_costs AS (
  SELECT related_chicken_id, SUM(cost) AS total_medicine_cost
  FROM medicine_transactions
  WHERE transaction_type = 'xuat' AND related_chicken_id IS NOT NULL
  GROUP BY related_chicken_id
)
SELECT
  c.id,
  c.chicken_code,
  COALESCE(c.cost_purchase, 0) AS purchase_cost,
  GREATEST(
    (COALESCE(c.sale_date, c.status_date, CURRENT_DATE) - COALESCE(c.birth_date, c.created_at::DATE))::DECIMAL / 30,
    0
  )::DECIMAL(10,2) AS months_raised,
  (SELECT amount FROM default_monthly_cost) AS monthly_cost,
  GREATEST(
    (COALESCE(c.sale_date, c.status_date, CURRENT_DATE) - COALESCE(c.birth_date, c.created_at::DATE))::DECIMAL / 30,
    0
  )::DECIMAL(10,2) * (SELECT amount FROM default_monthly_cost) AS feeding_cost,
  COALESCE(mc.total_medicine_cost, 0) AS medicine_cost,
  COALESCE(c.cost_purchase, 0)
    + GREATEST(
        (COALESCE(c.sale_date, c.status_date, CURRENT_DATE) - COALESCE(c.birth_date, c.created_at::DATE))::DECIMAL / 30,
        0
      )::DECIMAL(10,2) * (SELECT amount FROM default_monthly_cost)
    + COALESCE(mc.total_medicine_cost, 0) AS total_cost
FROM chickens c
LEFT JOIN medicine_costs mc ON mc.related_chicken_id = c.id;

-- =====================================================
-- 6. VIEW sales_performance
-- =====================================================

CREATE OR REPLACE VIEW sales_performance AS
SELECT
  c.id AS chicken_id,
  c.chicken_code,
  c.sale_date,
  c.sale_price,
  cb.total_cost AS cost_basis,
  c.sale_price - cb.total_cost AS profit,
  CASE WHEN cb.total_cost > 0
    THEN ROUND(((c.sale_price - cb.total_cost) / cb.total_cost * 100)::NUMERIC, 1)
    ELSE 0
  END AS profit_margin_pct,
  b.id AS breed_id,
  b.name_vi AS breed_name,
  b.tier AS breed_tier,
  CASE
    WHEN c.sale_price < 2000000 THEN 'thit'
    WHEN c.sale_price < 5000000 THEN 'pho_thong'
    ELSE 'cao_cap'
  END AS price_segment,
  cust.id AS customer_id,
  cust.name AS customer_name
FROM chickens c
JOIN chicken_cost_basis cb ON cb.id = c.id
LEFT JOIN breeds b ON b.id = c.breed_id
LEFT JOIN customers cust ON cust.id = c.customer_id
WHERE c.status = 'da_ban' AND c.sale_date IS NOT NULL;

-- =====================================================
-- 7. inventory_report function
-- =====================================================

CREATE OR REPLACE FUNCTION inventory_report(
  p_from_date DATE,
  p_to_date DATE
) RETURNS TABLE (
  category TEXT,
  count BIGINT,
  description TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 'opening_stock'::TEXT, COUNT(*)::BIGINT, 'Tồn đầu kỳ'::TEXT
  FROM chickens
  WHERE created_at::DATE < p_from_date
    AND (status IN ('dang_nuoi', 'dang_cach_ly')
         OR (status_date >= p_from_date AND status IN ('da_ban', 'chet', 'loai_thai')))

  UNION ALL
  SELECT 'purchased'::TEXT, COUNT(*)::BIGINT, 'Mua vào'::TEXT
  FROM chickens
  WHERE source = 'mua' AND created_at::DATE BETWEEN p_from_date AND p_to_date

  UNION ALL
  SELECT 'hatched'::TEXT, COUNT(*)::BIGINT, 'Nở tại trại'::TEXT
  FROM chickens
  WHERE source = 'no_tai_trai' AND created_at::DATE BETWEEN p_from_date AND p_to_date

  UNION ALL
  SELECT 'sold'::TEXT, COUNT(*)::BIGINT, 'Đã bán'::TEXT
  FROM chickens
  WHERE status = 'da_ban' AND sale_date BETWEEN p_from_date AND p_to_date

  UNION ALL
  SELECT 'died'::TEXT, COUNT(*)::BIGINT, 'Chết'::TEXT
  FROM chickens
  WHERE status = 'chet' AND status_date BETWEEN p_from_date AND p_to_date

  UNION ALL
  SELECT 'culled'::TEXT, COUNT(*)::BIGINT, 'Loại thải'::TEXT
  FROM chickens
  WHERE status = 'loai_thai' AND status_date BETWEEN p_from_date AND p_to_date

  UNION ALL
  SELECT 'closing_stock'::TEXT, COUNT(*)::BIGINT, 'Tồn cuối kỳ'::TEXT
  FROM chickens
  WHERE created_at::DATE <= p_to_date
    AND (status IN ('dang_nuoi', 'dang_cach_ly')
         OR (status_date > p_to_date));
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. pnl_report function
-- =====================================================

CREATE OR REPLACE FUNCTION pnl_report(
  p_from_date DATE,
  p_to_date DATE
) RETURNS TABLE (
  line_item TEXT,
  amount DECIMAL,
  category TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 'Gà cao cấp'::TEXT,
    COALESCE(SUM(sp.sale_price) FILTER (WHERE sp.price_segment = 'cao_cap'), 0)::DECIMAL,
    'revenue'::TEXT
  FROM sales_performance sp
  WHERE sp.sale_date BETWEEN p_from_date AND p_to_date

  UNION ALL
  SELECT 'Gà phổ thông'::TEXT,
    COALESCE(SUM(sp.sale_price) FILTER (WHERE sp.price_segment = 'pho_thong'), 0)::DECIMAL,
    'revenue'::TEXT
  FROM sales_performance sp
  WHERE sp.sale_date BETWEEN p_from_date AND p_to_date

  UNION ALL
  SELECT 'Gà thịt'::TEXT,
    COALESCE(SUM(sp.sale_price) FILTER (WHERE sp.price_segment = 'thit'), 0)::DECIMAL,
    'revenue'::TEXT
  FROM sales_performance sp
  WHERE sp.sale_date BETWEEN p_from_date AND p_to_date

  UNION ALL
  SELECT 'Giá vốn hàng bán'::TEXT,
    COALESCE(SUM(sp.cost_basis), 0)::DECIMAL,
    'cogs'::TEXT
  FROM sales_performance sp
  WHERE sp.sale_date BETWEEN p_from_date AND p_to_date

  UNION ALL
  SELECT ec.name_vi::TEXT,
    COALESCE(SUM(e.amount), 0)::DECIMAL,
    'opex'::TEXT
  FROM expense_categories ec
  LEFT JOIN expenses e ON e.category_id = ec.id
    AND e.expense_date BETWEEN p_from_date AND p_to_date
  GROUP BY ec.id, ec.name_vi, ec.display_order
  ORDER BY 1;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. VIEW breed_performance
-- =====================================================

CREATE OR REPLACE VIEW breed_performance AS
SELECT
  b.id AS breed_id,
  b.code AS breed_code,
  b.name_vi AS breed_name,
  b.tier,
  COUNT(c.id) FILTER (WHERE c.status IN ('dang_nuoi', 'dang_cach_ly')) AS current_alive,
  COUNT(c.id) FILTER (WHERE c.status = 'da_ban') AS total_sold,
  COALESCE(SUM(c.sale_price) FILTER (WHERE c.status = 'da_ban'), 0) AS total_revenue,
  ROUND(COALESCE(AVG(c.sale_price) FILTER (WHERE c.status = 'da_ban'), 0)::NUMERIC, 0) AS avg_sale_price,
  ROUND(COALESCE(AVG(sp.profit), 0)::NUMERIC, 0) AS avg_profit,
  ROUND(COALESCE(AVG(sp.profit_margin_pct), 0)::NUMERIC, 1) AS avg_profit_margin,
  CASE WHEN COUNT(c.id) > 0
    THEN ROUND((COUNT(c.id) FILTER (WHERE c.status = 'chet')::NUMERIC / COUNT(c.id)) * 100, 1)
    ELSE 0
  END AS death_rate
FROM breeds b
LEFT JOIN chickens c ON c.breed_id = b.id
LEFT JOIN sales_performance sp ON sp.chicken_id = c.id
WHERE b.is_active = TRUE
GROUP BY b.id, b.code, b.name_vi, b.tier;

-- =====================================================
-- 10. VIEW customer_receivables
-- =====================================================

CREATE OR REPLACE VIEW customer_receivables AS
SELECT
  cust.id AS customer_id,
  cust.name AS customer_name,
  cust.phone,
  so.id AS order_id,
  so.order_code,
  so.order_date,
  so.delivered_date,
  so.total_amount,
  so.paid_amount,
  so.deposit_amount,
  so.total_amount - so.paid_amount AS amount_due,
  so.status,
  (CURRENT_DATE - so.order_date)::INT AS days_since_order
FROM sales_orders so
JOIN customers cust ON cust.id = so.customer_id
WHERE so.status IN ('dat_coc', 'da_giao')
  AND so.total_amount > so.paid_amount;
