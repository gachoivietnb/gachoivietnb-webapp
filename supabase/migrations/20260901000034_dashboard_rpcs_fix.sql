-- ============================================================
-- FIX: dashboard supporting RPCs — cast enum to text
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
    c.id, c.name, c.tier::TEXT,
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
