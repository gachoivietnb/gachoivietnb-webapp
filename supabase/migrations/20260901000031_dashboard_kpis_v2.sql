-- ============================================================
-- DASHBOARD KPIs V2 — 15+ chỉ số chuyên nghiệp cho Pro Dashboard
-- ============================================================

CREATE OR REPLACE FUNCTION dashboard_kpis_v2()
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_now DATE := CURRENT_DATE;
  v_month_start DATE := date_trunc('month', v_now)::DATE;
  v_year_start DATE := date_trunc('year', v_now)::DATE;
  v_last_month_start DATE := date_trunc('month', v_now - INTERVAL '1 month')::DATE;
  v_last_month_end DATE := v_month_start - INTERVAL '1 day';
  v_30d DATE := v_now - INTERVAL '30 days';
  v_60d DATE := v_now - INTERVAL '60 days';
BEGIN
  SELECT jsonb_build_object(
    -- ============ ĐÀN GÀ ============
    'total_chickens',
      (SELECT COUNT(*) FROM chickens WHERE status IN ('dang_nuoi', 'dang_cach_ly')),
    'total_chickens_30d_ago',
      (SELECT COUNT(*) FROM chickens
        WHERE status IN ('dang_nuoi', 'dang_cach_ly')
          AND created_at < v_30d),
    'chickens_by_status',
      (SELECT jsonb_object_agg(status, cnt) FROM (
        SELECT status, COUNT(*) AS cnt FROM chickens
         WHERE status NOT IN ('da_ban', 'chet')
         GROUP BY status
      ) s),
    'chickens_quarantine',
      (SELECT COUNT(*) FROM chickens WHERE status = 'dang_cach_ly'),
    'ready_to_sell',
      (SELECT COUNT(*) FROM chickens
        WHERE status = 'dang_nuoi'
          AND birth_date <= CURRENT_DATE - INTERVAL '12 months'),

    -- Tỷ lệ hao hụt 30 ngày qua
    'mortality_30d',
      (SELECT COUNT(*) FROM chickens
        WHERE status = 'chet' AND status_date >= v_30d),
    'mortality_30d_prev',
      (SELECT COUNT(*) FROM chickens
        WHERE status = 'chet' AND status_date >= v_60d AND status_date < v_30d),

    -- ============ DOANH THU ============
    'revenue_mtd',
      COALESCE((SELECT SUM(sale_price) FROM chickens
        WHERE status = 'da_ban' AND sale_date >= v_month_start), 0),
    'revenue_last_month',
      COALESCE((SELECT SUM(sale_price) FROM chickens
        WHERE status = 'da_ban'
          AND sale_date >= v_last_month_start
          AND sale_date <= v_last_month_end), 0),
    'revenue_ytd',
      COALESCE((SELECT SUM(sale_price) FROM chickens
        WHERE status = 'da_ban' AND sale_date >= v_year_start), 0),
    'sold_count_mtd',
      (SELECT COUNT(*) FROM chickens
        WHERE status = 'da_ban' AND sale_date >= v_month_start),
    'avg_sale_price_mtd',
      (SELECT COALESCE(AVG(sale_price), 0) FROM chickens
        WHERE status = 'da_ban' AND sale_date >= v_month_start),

    -- ============ CHI PHÍ + LỢI NHUẬN ============
    'expenses_mtd',
      COALESCE((SELECT SUM(amount) FROM expenses
        WHERE expense_date >= v_month_start), 0),
    'expenses_last_month',
      COALESCE((SELECT SUM(amount) FROM expenses
        WHERE expense_date >= v_last_month_start
          AND expense_date <= v_last_month_end), 0),

    -- ============ QUỸ ============
    'cash_total',
      COALESCE((SELECT SUM(current_balance) FROM cash_account_balances), 0),
    'cash_accounts_count',
      (SELECT COUNT(*) FROM cash_accounts WHERE is_active = TRUE),

    -- ============ KHÁCH HÀNG ============
    'customers_total',
      (SELECT COUNT(*) FROM customers),
    'customers_new_mtd',
      (SELECT COUNT(*) FROM customers WHERE created_at >= v_month_start),
    'customers_vip',
      (SELECT COUNT(*) FROM customers WHERE tier = 'vip'),

    -- ============ ĐƠN HÀNG ============
    'orders_pending',
      (SELECT COUNT(*) FROM sales_orders WHERE status = 'hoi_mua'),
    'orders_deposit',
      (SELECT COUNT(*) FROM sales_orders WHERE status = 'dat_coc'),
    'orders_delivered_mtd',
      (SELECT COUNT(*) FROM sales_orders
        WHERE status = 'da_giao' AND order_date >= v_month_start),
    'orders_total_mtd',
      (SELECT COUNT(*) FROM sales_orders WHERE order_date >= v_month_start),

    -- Conversion rate (đã giao / tổng đơn) trong 30d
    'conversion_30d_delivered',
      (SELECT COUNT(*) FROM sales_orders
        WHERE status = 'da_giao' AND order_date >= v_30d),
    'conversion_30d_total',
      (SELECT COUNT(*) FROM sales_orders WHERE order_date >= v_30d),

    -- ============ CÔNG NỢ ============
    'receivables_total',
      COALESCE((SELECT SUM(amount_due) FROM customer_receivables), 0),
    'receivables_overdue',
      COALESCE((SELECT SUM(amount_due) FROM customer_receivables
        WHERE days_since_order > 30), 0),
    'receivables_overdue_count',
      (SELECT COUNT(DISTINCT customer_id) FROM customer_receivables
        WHERE days_since_order > 30),

    -- ============ HÓA ĐƠN ĐIỆN TỬ ============
    'invoices_issued_mtd',
      (SELECT COUNT(*) FROM invoices
        WHERE status = 'da_phat_hanh' AND issue_date >= v_month_start),
    'invoices_pending',
      (SELECT COUNT(*) FROM invoices
        WHERE status IN ('nhap', 'cho_phat_hanh')),

    -- ============ KHO ============
    'medicines_low_stock',
      (SELECT COUNT(*) FROM medicines
        WHERE current_stock <= min_stock_alert AND is_active = TRUE),
    'feeds_low_stock',
      (SELECT COUNT(*) FROM feeds
        WHERE current_stock <= min_stock_alert AND is_active = TRUE),

    -- ============ HOẠT ĐỘNG / NHẮC VIỆC ============
    'vaccinations_today',
      (SELECT COUNT(*) FROM vaccinations
        WHERE scheduled_date = v_now AND status = 'cho_tiem'),
    'vaccinations_overdue',
      (SELECT COUNT(*) FROM vaccinations
        WHERE scheduled_date < v_now AND status = 'cho_tiem'),
    'vaccinations_this_week',
      (SELECT COUNT(*) FROM vaccinations
        WHERE scheduled_date BETWEEN v_now AND v_now + INTERVAL '7 days'
          AND status = 'cho_tiem'),

    'diary_plans_today',
      (SELECT COUNT(*) FROM diary_plans
        WHERE status = 'pending' AND due_date = v_now),
    'diary_plans_pending',
      (SELECT COUNT(*) FROM diary_plans
        WHERE status = 'pending'),

    -- ============ TÀI SẢN / BẢO TRÌ ============
    'assets_maint_overdue',
      (SELECT COUNT(*) FROM assets
        WHERE next_maintenance_date IS NOT NULL
          AND next_maintenance_date < v_now
          AND status NOT IN ('da_thanh_ly', 'hong')),

    -- ============ ẤP / SINH SẢN ============
    'breeding_active',
      (SELECT COUNT(*) FROM breeding_litters WHERE status = 'dang_ap'),
    'breeding_hatched_mtd',
      (SELECT COUNT(*) FROM breeding_litters
        WHERE status = 'da_no' AND hatch_date >= v_month_start),
    'breeding_failed_mtd',
      (SELECT COUNT(*) FROM breeding_litters
        WHERE status = 'that_bai' AND updated_at >= v_month_start),

    -- ============ CHUỒNG TRẠI ============
    'cages_total',
      (SELECT COUNT(*) FROM cages),
    'cages_in_use',
      (SELECT COUNT(*) FROM cages WHERE status = 'dang_co_ga'),
    'cages_maintenance',
      (SELECT COUNT(*) FROM cages WHERE status = 'bao_tri'),

    -- ============ CẢNH BÁO ============
    'alerts_unread',
      (SELECT COUNT(*) FROM alerts WHERE status = 'chua_doc'),
    'alerts_critical',
      (SELECT COUNT(*) FROM alerts
        WHERE status = 'chua_doc' AND priority IN ('cao', 'khan_cap'))
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION dashboard_kpis_v2() TO authenticated;

-- ============================================================
-- 12-MONTH REVENUE/EXPENSE TREND (extends trends_6_months)
-- ============================================================

CREATE OR REPLACE FUNCTION trends_12_months()
RETURNS TABLE (
  month TEXT,
  revenue NUMERIC,
  expenses NUMERIC,
  cogs NUMERIC,
  net_profit NUMERIC,
  chickens_sold BIGINT,
  chickens_died BIGINT,
  new_customers BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH months AS (
    SELECT generate_series(
      date_trunc('month', CURRENT_DATE - INTERVAL '11 months'),
      date_trunc('month', CURRENT_DATE),
      '1 month'::INTERVAL
    )::DATE AS month_start
  )
  SELECT
    TO_CHAR(m.month_start, 'YYYY-MM') AS month,
    COALESCE((SELECT SUM(sale_price) FROM chickens
      WHERE status = 'da_ban'
        AND sale_date >= m.month_start
        AND sale_date < m.month_start + INTERVAL '1 month'), 0)::NUMERIC AS revenue,
    COALESCE((SELECT SUM(amount) FROM expenses
      WHERE expense_date >= m.month_start
        AND expense_date < m.month_start + INTERVAL '1 month'), 0)::NUMERIC AS expenses,
    COALESCE((SELECT SUM(cb.total_cost) FROM chicken_cost_basis cb
      JOIN chickens c ON c.id = cb.id
      WHERE c.status = 'da_ban'
        AND c.sale_date >= m.month_start
        AND c.sale_date < m.month_start + INTERVAL '1 month'), 0)::NUMERIC AS cogs,
    (COALESCE((SELECT SUM(sale_price) FROM chickens
      WHERE status = 'da_ban'
        AND sale_date >= m.month_start
        AND sale_date < m.month_start + INTERVAL '1 month'), 0)
     - COALESCE((SELECT SUM(cb.total_cost) FROM chicken_cost_basis cb
        JOIN chickens c ON c.id = cb.id
        WHERE c.status = 'da_ban'
          AND c.sale_date >= m.month_start
          AND c.sale_date < m.month_start + INTERVAL '1 month'), 0)
     - COALESCE((SELECT SUM(amount) FROM expenses
        WHERE expense_date >= m.month_start
          AND expense_date < m.month_start + INTERVAL '1 month'), 0))::NUMERIC AS net_profit,
    (SELECT COUNT(*) FROM chickens
      WHERE status = 'da_ban'
        AND sale_date >= m.month_start
        AND sale_date < m.month_start + INTERVAL '1 month')::BIGINT AS chickens_sold,
    (SELECT COUNT(*) FROM chickens
      WHERE status = 'chet'
        AND status_date >= m.month_start
        AND status_date < m.month_start + INTERVAL '1 month')::BIGINT AS chickens_died,
    (SELECT COUNT(*) FROM customers
      WHERE created_at >= m.month_start
        AND created_at < m.month_start + INTERVAL '1 month')::BIGINT AS new_customers
  FROM months m
  ORDER BY m.month_start;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION trends_12_months() TO authenticated;

-- ============================================================
-- TOP CUSTOMERS / TOP BREEDS / EXPENSE CATEGORIES (12 months)
-- ============================================================

CREATE OR REPLACE FUNCTION dashboard_top_customers(p_limit INT DEFAULT 5)
RETURNS TABLE (
  customer_id UUID,
  customer_name TEXT,
  tier TEXT,
  total_revenue NUMERIC,
  orders_count BIGINT,
  avg_order_value NUMERIC,
  last_purchase_date DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id, c.name, c.tier,
    COALESCE(SUM(so.total_amount), 0)::NUMERIC AS total_revenue,
    COUNT(so.id)::BIGINT AS orders_count,
    COALESCE(AVG(so.total_amount), 0)::NUMERIC AS avg_order_value,
    MAX(so.order_date) AS last_purchase_date
  FROM customers c
  JOIN sales_orders so ON so.customer_id = c.id
  WHERE so.order_date >= CURRENT_DATE - INTERVAL '12 months'
    AND so.status IN ('dat_coc', 'da_giao')
  GROUP BY c.id, c.name, c.tier
  ORDER BY total_revenue DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION dashboard_top_customers(INT) TO authenticated;

CREATE OR REPLACE FUNCTION dashboard_breed_revenue()
RETURNS TABLE (
  breed_id UUID,
  breed_name TEXT,
  chickens_sold BIGINT,
  total_revenue NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id, b.name_vi,
    COUNT(c.id)::BIGINT AS chickens_sold,
    COALESCE(SUM(c.sale_price), 0)::NUMERIC AS total_revenue
  FROM breeds b
  LEFT JOIN chickens c ON c.breed_id = b.id
    AND c.status = 'da_ban'
    AND c.sale_date >= CURRENT_DATE - INTERVAL '12 months'
  GROUP BY b.id, b.name_vi
  HAVING COUNT(c.id) > 0
  ORDER BY total_revenue DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION dashboard_breed_revenue() TO authenticated;

CREATE OR REPLACE FUNCTION dashboard_expense_breakdown()
RETURNS TABLE (
  category_code TEXT,
  category_name TEXT,
  total_amount NUMERIC,
  txn_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ec.code, ec.name_vi,
    COALESCE(SUM(e.amount), 0)::NUMERIC AS total_amount,
    COUNT(e.id)::BIGINT AS txn_count
  FROM expense_categories ec
  LEFT JOIN expenses e ON e.category_id = ec.id
    AND e.expense_date >= CURRENT_DATE - INTERVAL '6 months'
  GROUP BY ec.code, ec.name_vi
  HAVING COALESCE(SUM(e.amount), 0) > 0
  ORDER BY total_amount DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION dashboard_expense_breakdown() TO authenticated;

COMMENT ON FUNCTION dashboard_kpis_v2() IS 'KPI v2 — 30+ chỉ số cho Pro Dashboard';
COMMENT ON FUNCTION trends_12_months() IS 'Doanh thu/chi phí/LN/đàn gà bán/chết/KH mới 12 tháng';
COMMENT ON FUNCTION dashboard_top_customers(INT) IS 'Top KH theo doanh thu 12 tháng';
COMMENT ON FUNCTION dashboard_breed_revenue() IS 'Doanh thu theo giống gà 12 tháng';
COMMENT ON FUNCTION dashboard_expense_breakdown() IS 'Chi phí theo category 6 tháng';
