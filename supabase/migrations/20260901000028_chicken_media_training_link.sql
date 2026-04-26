-- Migration 28: link chicken_media to training sessions + per-row public toggle
--
-- Thêm khả năng:
--   1. Gắn 1 file media (ảnh/video) với 1 buổi vần cụ thể (training_session_id)
--   2. Người dùng tự chọn từng media public ra trang gia phả công khai hay chỉ private nội bộ
--
-- is_public default TRUE để không phá vỡ ảnh hiện hữu trên các con gà đang rao bán.
-- Người dùng vào media manager chuyển sang false nếu muốn ẩn.

ALTER TABLE chicken_media
  ADD COLUMN IF NOT EXISTS training_session_id UUID
    REFERENCES training_sessions(id) ON DELETE SET NULL;

ALTER TABLE chicken_media
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_chicken_media_training_session
  ON chicken_media(training_session_id)
  WHERE training_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chicken_media_chicken_public
  ON chicken_media(chicken_id, is_public, display_order)
  WHERE is_public = TRUE;

-- Update RLS: public anonymous read chỉ thấy media có is_public = TRUE
-- (giữ điều kiện chickens.is_for_sale = TRUE đã có)
DROP POLICY IF EXISTS "Public view media of for-sale chickens" ON chicken_media;
CREATE POLICY "Public view media of for-sale chickens" ON chicken_media FOR SELECT
  USING (
    is_public = TRUE
    AND EXISTS (
      SELECT 1 FROM chickens
      WHERE chickens.id = chicken_media.chicken_id
        AND chickens.is_for_sale = TRUE
    )
  );

COMMENT ON COLUMN chicken_media.training_session_id IS
  'Nếu media chụp/quay trong 1 buổi vần thì link về session đó. NULL = portrait/standalone media.';
COMMENT ON COLUMN chicken_media.is_public IS
  'Cho phép hiển thị trên trang công khai /ga/[tag]. Default TRUE; user toggle riêng từng file.';
