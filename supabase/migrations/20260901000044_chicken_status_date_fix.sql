-- ============================================================
-- Fix độ tin cậy của status_date cho BÁO CÁO TỒN KHO
--
-- Vấn đề: trigger bán (sync_chicken_with_order_status) khi giao hàng set
--   status='da_ban' + sale_date NHƯNG KHÔNG set status_date. Không trigger nào
--   set status_date khi đổi status → gà đã bán/chết/loại có status_date sai/NULL.
--   Báo cáo inventory_report dùng status_date cho opening_stock/closing_stock
--   → đếm sai tồn đầu/cuối kỳ. (Report SQL đúng; dữ liệu status_date mới là lỗi.)
--
-- Cách fix: đảm bảo status_date LUÔN được set khi status đổi (trigger) +
--   backfill dữ liệu cũ. Không đụng SQL báo cáo.
-- ============================================================
BEGIN;

-- 1. Trigger: tự set status_date khi status đổi (hoặc khi INSERT gà không-còn-sống)
--    Tôn trọng giá trị status_date nếu code đã set tường minh.
CREATE OR REPLACE FUNCTION set_chicken_status_date()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status IN ('da_ban', 'chet', 'loai_thai') AND NEW.status_date IS NULL THEN
      NEW.status_date := COALESCE(NEW.sale_date::timestamptz, NOW());
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       AND NEW.status_date IS NOT DISTINCT FROM OLD.status_date THEN
      -- gà bán → dùng sale_date (đồng nhất với cột 'sold' của report); còn lại → now()
      NEW.status_date := COALESCE(NEW.sale_date::timestamptz, NOW());
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_chicken_status_date ON chickens;
CREATE TRIGGER trg_set_chicken_status_date
  BEFORE INSERT OR UPDATE ON chickens
  FOR EACH ROW EXECUTE FUNCTION set_chicken_status_date();

-- 2. Backfill: gà đã bán → status_date = sale_date (đồng nhất với cột 'sold')
UPDATE chickens
SET status_date = sale_date::timestamptz
WHERE status = 'da_ban' AND sale_date IS NOT NULL
  AND (status_date IS NULL OR status_date::date <> sale_date);

-- 3. Backfill: gà chết/loại thải thiếu status_date → dùng updated_at/created_at
UPDATE chickens
SET status_date = COALESCE(updated_at, created_at)
WHERE status IN ('chet', 'loai_thai') AND status_date IS NULL;

COMMIT;
