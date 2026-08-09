-- ============================================================
-- Vá giới hạn: phiếu VẬT TƯ/KHÁC vào chi phí P&L — Đợt C+
-- P&L (pnl_report / trends_6_months) tính chi phí = SUM(expenses.amount),
-- KHÔNG đọc cash_transactions → tạo 1 dòng expenses cho vật tư sẽ vào P&L
-- mà không trùng với cash 'out' (thuộc báo cáo dòng tiền).
--
-- Liên kết expenses.purchase_id (CASCADE) → xóa phiếu vật tư thì dòng
-- chi phí tự đảo theo.
-- (Cám/thuốc = tồn kho, KHÔNG ghi chi phí ở đây — chi phí là khi tiêu thụ.)
-- ============================================================
BEGIN;

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS purchase_id UUID REFERENCES public.purchases(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_expenses_purchase ON public.expenses(purchase_id);

COMMIT;
