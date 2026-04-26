-- ============================================================
-- FARM backup tracking — last backup timestamp + reminder logic
-- ============================================================
ALTER TABLE public.farms
  ADD COLUMN IF NOT EXISTS last_backup_at TIMESTAMPTZ;

COMMENT ON COLUMN public.farms.last_backup_at IS
  'Lần cuối chu_trai download backup zip. Dùng để hiển thị reminder hằng tháng.';
