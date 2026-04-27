-- ============================================================
-- FIX: dashboard_kpis_v2 — breeding_litters.hatch_date → hatched_date
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
        WHERE status = 'da_no' AND hatched_date >= v_month_start),
    'breeding_failed_mtd',
      (SELECT COUNT(*) FROM breeding_litters
        WHERE status = 'that_bai' AND created_at >= v_month_start),

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
