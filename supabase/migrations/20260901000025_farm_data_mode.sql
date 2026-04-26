-- ============================================================
-- FARM data_mode — track demo vs real data per tenant
-- ============================================================
-- Mỗi farm có trạng thái:
--   - 'demo' (mặc định khi mới tạo): có dữ liệu mẫu
--   - 'real': đã xoá demo, đang dùng dữ liệu thật
--
-- Chỉ cho phép chuyển từ 'demo' → 'real' MỘT LẦN (chống abuse:
-- spam tạo CSDL mới để dùng demo nhiều lần).
-- ============================================================

ALTER TABLE public.farms
  ADD COLUMN IF NOT EXISTS data_mode TEXT NOT NULL DEFAULT 'demo'
    CHECK (data_mode IN ('demo', 'real')),
  ADD COLUMN IF NOT EXISTS data_mode_switched_at TIMESTAMPTZ;

COMMENT ON COLUMN public.farms.data_mode IS
  'Trại đang dùng dữ liệu demo hay dữ liệu thật. Chuyển demo→real chỉ được 1 lần.';

COMMENT ON COLUMN public.farms.data_mode_switched_at IS
  'Lần đầu chuyển demo → real. NULL = chưa chuyển.';
