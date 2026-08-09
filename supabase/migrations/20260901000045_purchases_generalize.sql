-- ============================================================
-- Tổng quát hóa "Mua vào": phiếu nhập có loại (kind) — Đợt A
-- purchases hiện chỉ cho GÀ. Mở rộng để nhập cám/thuốc/vật tư từ NCC.
-- (Công nợ phải trả = Đợt B ở migration sau.)
-- ============================================================
BEGIN;

-- Loại phiếu: ga (mua gà), thuc_an (cám), thuoc, vat_tu (vật tư), khac
ALTER TABLE purchases
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'ga';

DO $$ BEGIN
  ALTER TABLE purchases ADD CONSTRAINT purchases_kind_check
    CHECK (kind IN ('ga', 'thuc_an', 'thuoc', 'vat_tu', 'khac'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- purchase_items tổng quát: dòng hàng có thể là gà / cám / thuốc / tự do
ALTER TABLE purchase_items
  ADD COLUMN IF NOT EXISTS item_type TEXT NOT NULL DEFAULT 'ga',
  ADD COLUMN IF NOT EXISTS feed_id UUID REFERENCES feeds(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS medicine_id UUID REFERENCES medicines(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS item_name TEXT,
  ADD COLUMN IF NOT EXISTS quantity NUMERIC NOT NULL DEFAULT 1;

-- chicken_id không còn bắt buộc (phiếu cám/thuốc: chicken_id NULL)
ALTER TABLE purchase_items ALTER COLUMN chicken_id DROP NOT NULL;

-- Liên kết transaction kho với phiếu mua → xóa phiếu thì đảo tồn được
ALTER TABLE feed_transactions
  ADD COLUMN IF NOT EXISTS purchase_id UUID REFERENCES purchases(id) ON DELETE SET NULL;
ALTER TABLE medicine_transactions
  ADD COLUMN IF NOT EXISTS purchase_id UUID REFERENCES purchases(id) ON DELETE SET NULL;

COMMIT;
