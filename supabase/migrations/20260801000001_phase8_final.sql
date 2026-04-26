-- =====================================================
-- PHASE 8: DASHBOARD + REPORTS + FINISHING
-- =====================================================

-- 1. USER PREFERENCES (theme, onboarding)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS dark_mode BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;

-- 2. BACKUP LOGS
CREATE TABLE IF NOT EXISTS backup_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  backup_type TEXT NOT NULL,
  exported_by UUID REFERENCES profiles(id),
  rows_exported JSONB,
  file_size_bytes BIGINT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE backup_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chu_trai_view_backup_logs" ON backup_logs;
CREATE POLICY "chu_trai_view_backup_logs" ON backup_logs FOR SELECT USING (is_chu_trai());

DROP POLICY IF EXISTS "chu_trai_insert_backup_logs" ON backup_logs;
CREATE POLICY "chu_trai_insert_backup_logs" ON backup_logs FOR INSERT WITH CHECK (is_chu_trai());

-- 3. DASHBOARD STATS
CREATE OR REPLACE FUNCTION dashboard_stats()
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_chickens', (SELECT COUNT(*) FROM chickens WHERE status IN ('dang_nuoi', 'dang_cach_ly')),
    'total_chickens_growth_week',
      (SELECT COUNT(*) FROM chickens
        WHERE created_at >= NOW() - INTERVAL '7 days'
          AND status IN ('dang_nuoi', 'dang_cach_ly')),
    'vaccinations_today',
      (SELECT COUNT(*) FROM vaccinations
        WHERE scheduled_date = CURRENT_DATE AND status = 'cho_tiem'),
    'vaccinations_overdue',
      (SELECT COUNT(*) FROM vaccinations
        WHERE scheduled_date < CURRENT_DATE AND status = 'cho_tiem'),
    'ready_to_sell',
      (SELECT COUNT(*) FROM chickens
        WHERE status = 'dang_nuoi'
          AND birth_date <= CURRENT_DATE - INTERVAL '12 months'),
    'revenue_this_month',
      COALESCE((SELECT SUM(sale_price) FROM chickens
        WHERE status = 'da_ban'
          AND sale_date >= date_trunc('month', CURRENT_DATE)), 0),
    'revenue_last_month',
      COALESCE((SELECT SUM(sale_price) FROM chickens
        WHERE status = 'da_ban'
          AND sale_date >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
          AND sale_date < date_trunc('month', CURRENT_DATE)), 0),
    'orders_pending',
      (SELECT COUNT(*) FROM sales_orders WHERE status = 'hoi_mua'),
    'orders_deposit',
      (SELECT COUNT(*) FROM sales_orders WHERE status = 'dat_coc'),
    'unread_alerts',
      (SELECT COUNT(*) FROM alerts WHERE status = 'chua_doc'),
    'critical_alerts',
      (SELECT COUNT(*) FROM alerts
        WHERE status = 'chua_doc' AND priority IN ('cao', 'khan_cap')),
    'medicines_low_stock',
      (SELECT COUNT(*) FROM medicines
        WHERE current_stock <= min_stock_alert AND is_active = TRUE),
    'feeds_low_stock',
      (SELECT COUNT(*) FROM feeds
        WHERE current_stock <= min_stock_alert AND is_active = TRUE)
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. TRENDS 6 MONTHS
CREATE OR REPLACE FUNCTION trends_6_months()
RETURNS TABLE (
  month TEXT,
  revenue DECIMAL,
  expenses DECIMAL,
  cogs DECIMAL,
  net_profit DECIMAL,
  chickens_sold BIGINT,
  chickens_died BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH months AS (
    SELECT generate_series(
      date_trunc('month', CURRENT_DATE - INTERVAL '5 months'),
      date_trunc('month', CURRENT_DATE),
      '1 month'::INTERVAL
    )::DATE AS month_start
  )
  SELECT
    TO_CHAR(m.month_start, 'YYYY-MM') AS month,
    COALESCE((SELECT SUM(sale_price) FROM chickens
      WHERE status = 'da_ban'
        AND sale_date >= m.month_start
        AND sale_date < m.month_start + INTERVAL '1 month'), 0)::DECIMAL AS revenue,
    COALESCE((SELECT SUM(amount) FROM expenses
      WHERE expense_date >= m.month_start
        AND expense_date < m.month_start + INTERVAL '1 month'), 0)::DECIMAL AS expenses,
    COALESCE((SELECT SUM(cb.total_cost) FROM chicken_cost_basis cb
      JOIN chickens c ON c.id = cb.id
      WHERE c.status = 'da_ban'
        AND c.sale_date >= m.month_start
        AND c.sale_date < m.month_start + INTERVAL '1 month'), 0)::DECIMAL AS cogs,
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
          AND expense_date < m.month_start + INTERVAL '1 month'), 0))::DECIMAL AS net_profit,
    (SELECT COUNT(*) FROM chickens
      WHERE status = 'da_ban'
        AND sale_date >= m.month_start
        AND sale_date < m.month_start + INTERVAL '1 month')::BIGINT AS chickens_sold,
    (SELECT COUNT(*) FROM chickens
      WHERE status = 'chet'
        AND status_date >= m.month_start
        AND status_date < m.month_start + INTERVAL '1 month')::BIGINT AS chickens_died
  FROM months m
  ORDER BY m.month_start;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. SURVIVAL RATE BY AREA
CREATE OR REPLACE VIEW area_survival_stats AS
SELECT
  a.id AS area_id,
  a.code AS area_code,
  a.name_vi AS area_name,
  a.type AS area_type,
  COUNT(c.id) AS total_assigned,
  COUNT(c.id) FILTER (WHERE c.status IN ('dang_nuoi', 'dang_cach_ly', 'da_ban', 'loai_thai')) AS alive,
  COUNT(c.id) FILTER (WHERE c.status = 'chet') AS dead,
  CASE WHEN COUNT(c.id) > 0
    THEN ROUND((COUNT(c.id) FILTER (WHERE c.status != 'chet')::NUMERIC / COUNT(c.id)) * 100, 1)
    ELSE 100
  END AS survival_rate_pct
FROM areas a
LEFT JOIN cage_rows cr ON cr.area_id = a.id
LEFT JOIN cages cg ON cg.row_id = cr.id
LEFT JOIN chickens c ON c.cage_id = cg.id
WHERE a.is_active = TRUE
GROUP BY a.id, a.code, a.name_vi, a.type;

-- 6. EXPENSES SUMMARY
CREATE OR REPLACE FUNCTION expenses_summary(
  p_from_date DATE DEFAULT date_trunc('month', CURRENT_DATE)::DATE,
  p_to_date DATE DEFAULT CURRENT_DATE
) RETURNS TABLE (
  category_code TEXT,
  category_name TEXT,
  total_amount DECIMAL,
  transaction_count BIGINT,
  percentage NUMERIC
) AS $$
DECLARE
  v_total DECIMAL;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_total
  FROM expenses
  WHERE expense_date BETWEEN p_from_date AND p_to_date;

  RETURN QUERY
  SELECT
    ec.code,
    ec.name_vi,
    COALESCE(SUM(e.amount), 0)::DECIMAL,
    COUNT(e.id)::BIGINT,
    CASE WHEN v_total > 0
      THEN ROUND((COALESCE(SUM(e.amount), 0) / v_total * 100)::NUMERIC, 1)
      ELSE 0
    END
  FROM expense_categories ec
  LEFT JOIN expenses e ON e.category_id = ec.id
    AND e.expense_date BETWEEN p_from_date AND p_to_date
  GROUP BY ec.id, ec.code, ec.name_vi, ec.display_order
  ORDER BY ec.display_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
