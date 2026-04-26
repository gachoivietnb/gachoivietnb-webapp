-- ============================================================
-- SIGNUP THROTTLE — Bảo vệ /api/auth/farm-signup
-- ============================================================
-- Mục đích: chống spam signup, DDoS tạo tài khoản tự động bằng cách
-- track mỗi attempt theo IP + email. Server-side check trước khi gọi
-- auth.admin.createUser → tránh đụng tới auth.users + farms khi bị
-- flood.
--
-- Bảng GLOBAL (không farm_id) — không có RLS phía user; chỉ
-- service_role (server-side) mới đọc/ghi.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.signup_throttle (
  id BIGSERIAL PRIMARY KEY,
  ip_address INET,                              -- inet để có thể CIDR match
  email TEXT,
  user_agent TEXT,

  -- Kết quả
  success BOOLEAN NOT NULL DEFAULT false,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  farm_id UUID REFERENCES public.farms(id) ON DELETE SET NULL,

  -- Lý do từ chối / cờ
  honeypot_triggered BOOLEAN NOT NULL DEFAULT false,
  blocked_reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lookup nhanh theo IP + thời gian (rate limit window)
CREATE INDEX IF NOT EXISTS idx_signup_throttle_ip_time
  ON public.signup_throttle(ip_address, created_at DESC);

-- Lookup theo email
CREATE INDEX IF NOT EXISTS idx_signup_throttle_email_time
  ON public.signup_throttle(lower(email), created_at DESC);

-- Lookup các attempt thành công gần đây
CREATE INDEX IF NOT EXISTS idx_signup_throttle_success_recent
  ON public.signup_throttle(created_at DESC)
  WHERE success = true;

-- Auto cleanup: TTL records sau 30 ngày (giữ lại slim metadata cho audit)
-- Dùng pg_cron nếu enabled — tạm thời để service code tự delete cũng OK
COMMENT ON TABLE public.signup_throttle IS
  'Audit log + rate limit cho signup endpoint. Server-side only (service_role).';

-- RLS — chặn hoàn toàn từ phía client
ALTER TABLE public.signup_throttle ENABLE ROW LEVEL SECURITY;
-- Không tạo policy cho authenticated/anon → chỉ service_role bypass được.
