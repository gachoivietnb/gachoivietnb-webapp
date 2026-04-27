-- ============================================================
-- SUPPLIERS V2 — Mở rộng module Nhà cung cấp
-- ============================================================

DO $$ BEGIN
  CREATE TYPE supplier_category AS ENUM (
    'ga',          -- gà giống / gà thịt
    'thuoc_thu_y', -- thuốc thú y, vaccine
    'thuc_an',     -- cám, ngô, rau xanh, premix
    'vat_lieu',    -- vật liệu xây chuồng (lưới, gỗ, tôn...)
    'thiet_bi',    -- máy ấp, đèn sưởi, máng ăn
    'dich_vu',     -- vận chuyển, thú y, tư vấn
    'khac'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS code TEXT,
  ADD COLUMN IF NOT EXISTS supplier_category supplier_category,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS tax_code TEXT,
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_account TEXT,
  ADD COLUMN IF NOT EXISTS bank_branch TEXT,
  ADD COLUMN IF NOT EXISTS province TEXT,
  ADD COLUMN IF NOT EXISTS products_summary TEXT,
  ADD COLUMN IF NOT EXISTS payment_terms TEXT,
  ADD COLUMN IF NOT EXISTS credit_limit BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating SMALLINT CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS facebook TEXT,
  ADD COLUMN IF NOT EXISTS map_url TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Migrate cũ: text supplier_type → enum supplier_category
DO $$
BEGIN
  UPDATE public.suppliers
     SET supplier_category = CASE
       WHEN LOWER(supplier_type) LIKE '%gà%' OR LOWER(supplier_type) LIKE '%ga%' THEN 'ga'::supplier_category
       WHEN LOWER(supplier_type) LIKE '%thuốc%' OR LOWER(supplier_type) LIKE '%vacc%' THEN 'thuoc_thu_y'::supplier_category
       WHEN LOWER(supplier_type) LIKE '%cám%' OR LOWER(supplier_type) LIKE '%thức ăn%' THEN 'thuc_an'::supplier_category
       WHEN LOWER(supplier_type) LIKE '%vật liệu%' OR LOWER(supplier_type) LIKE '%lưới%' THEN 'vat_lieu'::supplier_category
       WHEN LOWER(supplier_type) LIKE '%thiết bị%' OR LOWER(supplier_type) LIKE '%máy%' THEN 'thiet_bi'::supplier_category
       WHEN LOWER(supplier_type) LIKE '%dịch vụ%' OR LOWER(supplier_type) LIKE '%vận chuyển%' THEN 'dich_vu'::supplier_category
       ELSE 'khac'::supplier_category
     END
   WHERE supplier_category IS NULL;
END $$;

-- Auto-fill code (NCC-001) trigger
CREATE OR REPLACE FUNCTION public.fill_supplier_code()
RETURNS TRIGGER AS $$
DECLARE v_seq INT; v_farm UUID;
BEGIN
  IF NEW.code IS NOT NULL AND NEW.code <> '' THEN RETURN NEW; END IF;
  v_farm := COALESCE(NEW.farm_id, public.current_farm_id());
  SELECT COALESCE(MAX(NULLIF(regexp_replace(code, '^NCC-', ''), '')::int), 0) + 1
    INTO v_seq FROM public.suppliers
   WHERE farm_id = v_farm AND code LIKE 'NCC-%';
  NEW.code := 'NCC-' || LPAD(v_seq::TEXT, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_fill_supplier_code ON public.suppliers;
CREATE TRIGGER tr_fill_supplier_code
  BEFORE INSERT ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.fill_supplier_code();

DROP TRIGGER IF EXISTS tr_suppliers_updated_at ON public.suppliers;
CREATE TRIGGER tr_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_suppliers_farm_category
  ON public.suppliers(farm_id, supplier_category) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_suppliers_rating
  ON public.suppliers(farm_id, rating) WHERE rating IS NOT NULL;

-- Backfill code cho rows hiện tại
UPDATE public.suppliers s
   SET code = 'NCC-' || LPAD(((SELECT COUNT(*) FROM public.suppliers s2 WHERE s2.farm_id = s.farm_id AND s2.created_at <= s.created_at))::TEXT, 3, '0')
 WHERE code IS NULL;

-- ============ View: supplier_stats ============

DROP VIEW IF EXISTS public.supplier_stats CASCADE;
CREATE VIEW public.supplier_stats AS
SELECT
  s.id,
  s.farm_id,
  s.code,
  s.name,
  s.supplier_category,
  s.contact_person,
  s.phone,
  s.zalo,
  s.email,
  s.address,
  s.province,
  s.tax_code,
  s.products_summary,
  s.payment_terms,
  s.credit_limit,
  s.rating,
  s.tags,
  s.avatar_url,
  s.is_active,
  s.notes,
  s.created_at,
  s.updated_at,
  COALESCE(p.total_orders, 0)::int AS total_orders,
  COALESCE(p.total_amount, 0) AS total_amount,
  p.last_order_date,
  COALESCE(p.avg_order_amount, 0) AS avg_order_amount,
  COALESCE(p.orders_30d, 0)::int AS orders_30d,
  COALESCE(p.orders_ytd, 0)::int AS orders_ytd
FROM public.suppliers s
LEFT JOIN (
  SELECT
    supplier_id,
    COUNT(*) AS total_orders,
    SUM(total_amount) AS total_amount,
    MAX(purchase_date) AS last_order_date,
    AVG(total_amount) AS avg_order_amount,
    COUNT(*) FILTER (WHERE purchase_date >= CURRENT_DATE - INTERVAL '30 days') AS orders_30d,
    COUNT(*) FILTER (WHERE purchase_date >= date_trunc('year', CURRENT_DATE)) AS orders_ytd
  FROM public.purchases
  WHERE supplier_id IS NOT NULL
  GROUP BY supplier_id
) p ON p.supplier_id = s.id;

-- ============ RPC supplier_kpis ============

CREATE OR REPLACE FUNCTION public.supplier_kpis()
RETURNS JSONB AS $$
DECLARE v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total',
      (SELECT COUNT(*) FROM public.suppliers WHERE farm_id = public.current_farm_id()),
    'active',
      (SELECT COUNT(*) FROM public.suppliers WHERE farm_id = public.current_farm_id() AND is_active = TRUE),
    'by_category',
      (SELECT jsonb_object_agg(c, cnt) FROM (
        SELECT supplier_category::text AS c, COUNT(*) AS cnt
        FROM public.suppliers
        WHERE farm_id = public.current_farm_id() AND is_active = TRUE
        GROUP BY supplier_category
      ) sub),
    'top_rated',
      (SELECT COUNT(*) FROM public.suppliers
        WHERE farm_id = public.current_farm_id() AND rating >= 4),
    'orders_ytd',
      (SELECT COALESCE(SUM(total_amount), 0) FROM public.purchases p
        JOIN public.suppliers s ON s.id = p.supplier_id
        WHERE s.farm_id = public.current_farm_id()
          AND p.purchase_date >= date_trunc('year', CURRENT_DATE)),
    'top5',
      COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'id', id, 'code', code, 'name', name, 'category', supplier_category::text, 'total_amount', total_amount, 'orders', total_orders
      )) FROM (
        SELECT id, code, name, supplier_category, total_amount, total_orders
        FROM public.supplier_stats
        WHERE farm_id = public.current_farm_id() AND total_orders > 0
        ORDER BY total_amount DESC LIMIT 5
      ) t), '[]'::jsonb)
  ) INTO v_result;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.supplier_kpis() TO authenticated;

COMMENT ON VIEW public.supplier_stats IS 'Suppliers + tổng số đơn / tổng tiền / đơn 30d / YTD / đơn gần nhất';
