-- ============================================================
-- Công nợ phải trả NCC — Đợt B
-- Đối xứng với công nợ phải thu khách (customer_receivables).
--   - purchases: thêm paid_amount / payment_status / payment_method
--   - supplier_payments: sổ chi trả NCC (mỗi lần trả 1 dòng)
--   - supplier_debt: view các phiếu còn nợ (mirror customer_receivables)
-- ============================================================
BEGIN;

-- 1. purchases: theo dõi thanh toán
ALTER TABLE public.purchases
  ADD COLUMN IF NOT EXISTS paid_amount BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'chua_tra',
  ADD COLUMN IF NOT EXISTS payment_method TEXT;

DO $$ BEGIN
  ALTER TABLE public.purchases ADD CONSTRAINT purchases_payment_status_check
    CHECK (payment_status IN ('chua_tra', 'tra_mot_phan', 'da_tra'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Backfill: mọi phiếu CŨ (trước tính năng) coi như đã tất toán → không bỗng dưng
-- hiện thành công nợ. Phiếu mới từ nay sẽ mặc định 'chua_tra' và do API set.
UPDATE public.purchases
SET paid_amount = total_amount, payment_status = 'da_tra'
WHERE paid_amount = 0;

-- 2. supplier_payments: sổ chi trả NCC
CREATE TABLE IF NOT EXISTS public.supplier_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  purchase_id UUID REFERENCES public.purchases(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT,
  notes TEXT,
  performed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_supplier ON public.supplier_payments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_purchase ON public.supplier_payments(purchase_id);

-- farm_id tự điền (như các bảng per-tenant khác)
DROP TRIGGER IF EXISTS tr_supplier_payments_set_farm_id ON public.supplier_payments;
CREATE TRIGGER tr_supplier_payments_set_farm_id
  BEFORE INSERT ON public.supplier_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_farm_id_default();

-- RLS cô lập theo trại (template chuẩn)
ALTER TABLE public.supplier_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS supplier_payments_tenant_isolation ON public.supplier_payments;
CREATE POLICY supplier_payments_tenant_isolation ON public.supplier_payments
  FOR ALL TO authenticated
  USING (farm_id = public.current_farm_id())
  WITH CHECK (farm_id = public.current_farm_id());

-- 3. supplier_debt: các phiếu còn nợ (mirror customer_receivables, security_invoker để RLS đúng trại)
DROP VIEW IF EXISTS public.supplier_debt;
CREATE VIEW public.supplier_debt
WITH (security_invoker = true) AS
SELECT
  sup.id           AS supplier_id,
  sup.name         AS supplier_name,
  sup.phone,
  p.farm_id,
  p.id             AS purchase_id,
  p.purchase_code,
  p.purchase_date,
  p.kind,
  p.total_amount,
  p.paid_amount,
  p.total_amount - p.paid_amount AS amount_due,
  p.payment_status,
  CURRENT_DATE - p.purchase_date AS days_since
FROM public.purchases p
JOIN public.suppliers sup ON sup.id = p.supplier_id
WHERE p.total_amount > p.paid_amount;

GRANT SELECT ON public.supplier_debt TO authenticated;

COMMIT;
