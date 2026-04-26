-- =====================================================
-- P&L FULL: thêm summary rows (Lãi gộp, Lãi ròng, biên %)
-- Thay thế pnl_report() cũ
-- =====================================================

DROP FUNCTION IF EXISTS pnl_report(DATE, DATE);
CREATE FUNCTION pnl_report(
  p_from_date DATE,
  p_to_date DATE
) RETURNS TABLE (
  line_item TEXT,
  amount DECIMAL,
  category TEXT,
  display_order INT
) AS $$
DECLARE
  v_rev_caocap DECIMAL;
  v_rev_phothong DECIMAL;
  v_rev_thit DECIMAL;
  v_total_revenue DECIMAL;
  v_cogs DECIMAL;
  v_gross_profit DECIMAL;
  v_gross_margin DECIMAL;
  v_opex DECIMAL;
  v_operating_profit DECIMAL;
  v_operating_margin DECIMAL;
  v_net_profit DECIMAL;
  v_net_margin DECIMAL;
BEGIN
  -- Revenue segments
  SELECT
    COALESCE(SUM(sale_price) FILTER (WHERE price_segment = 'cao_cap'), 0),
    COALESCE(SUM(sale_price) FILTER (WHERE price_segment = 'pho_thong'), 0),
    COALESCE(SUM(sale_price) FILTER (WHERE price_segment = 'thit'), 0),
    COALESCE(SUM(sale_price), 0),
    COALESCE(SUM(cost_basis), 0)
  INTO v_rev_caocap, v_rev_phothong, v_rev_thit, v_total_revenue, v_cogs
  FROM sales_performance
  WHERE sale_date BETWEEN p_from_date AND p_to_date;

  v_gross_profit := v_total_revenue - v_cogs;
  v_gross_margin := CASE WHEN v_total_revenue > 0
    THEN ROUND((v_gross_profit / v_total_revenue * 100)::NUMERIC, 1)
    ELSE 0 END;

  -- Opex total (qualify column để tránh ambiguous với TABLE return "amount")
  SELECT COALESCE(SUM(e.amount), 0) INTO v_opex
  FROM expenses e WHERE e.expense_date BETWEEN p_from_date AND p_to_date;

  v_operating_profit := v_gross_profit - v_opex;
  v_operating_margin := CASE WHEN v_total_revenue > 0
    THEN ROUND((v_operating_profit / v_total_revenue * 100)::NUMERIC, 1)
    ELSE 0 END;

  -- Hiện tại chưa có thu/chi tài chính + thuế → net = operating
  v_net_profit := v_operating_profit;
  v_net_margin := v_operating_margin;

  RETURN QUERY
  -- Revenue lines
  SELECT 'Gà cao cấp'::TEXT, v_rev_caocap, 'revenue'::TEXT, 1
  UNION ALL SELECT 'Gà phổ thông'::TEXT, v_rev_phothong, 'revenue'::TEXT, 2
  UNION ALL SELECT 'Gà thịt'::TEXT, v_rev_thit, 'revenue'::TEXT, 3
  UNION ALL SELECT 'Tổng doanh thu'::TEXT, v_total_revenue, 'revenue_total'::TEXT, 4

  -- COGS
  UNION ALL SELECT 'Giá vốn hàng bán (COGS)'::TEXT, v_cogs, 'cogs'::TEXT, 10
  UNION ALL SELECT 'Lợi nhuận gộp'::TEXT, v_gross_profit, 'gross_profit'::TEXT, 11
  UNION ALL SELECT 'Biên lợi nhuận gộp (%)'::TEXT, v_gross_margin, 'gross_margin'::TEXT, 12

  -- Opex lines (per category)
  UNION ALL
  SELECT ec.name_vi::TEXT,
    COALESCE(SUM(e.amount), 0)::DECIMAL,
    'opex'::TEXT,
    20 + ec.display_order
  FROM expense_categories ec
  LEFT JOIN expenses e ON e.category_id = ec.id
    AND e.expense_date BETWEEN p_from_date AND p_to_date
  GROUP BY ec.id, ec.name_vi, ec.display_order

  UNION ALL SELECT 'Tổng chi phí vận hành'::TEXT, v_opex, 'opex_total'::TEXT, 80

  -- Operating / Net
  UNION ALL SELECT 'Lợi nhuận từ hoạt động (EBIT)'::TEXT, v_operating_profit, 'operating_profit'::TEXT, 90
  UNION ALL SELECT 'Biên lợi nhuận hoạt động (%)'::TEXT, v_operating_margin, 'operating_margin'::TEXT, 91
  UNION ALL SELECT 'Lợi nhuận ròng'::TEXT, v_net_profit, 'net_profit'::TEXT, 100
  UNION ALL SELECT 'Biên lợi nhuận ròng (%)'::TEXT, v_net_margin, 'net_margin'::TEXT, 101

  ORDER BY 4;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
