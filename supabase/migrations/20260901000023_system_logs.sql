-- ============================================================
-- SYSTEM LOGS — centralized error/event tracking cho Super Admin
-- ============================================================
-- Mục đích:
--   - Mọi auth failure / API error / security event / DB error / push fail
--     đều log về đây qua helper logSystem() ở src/lib/logging/system-logger.ts
--   - Super admin xem dashboard hằng ngày tại /admin/super-admin/logs
-- ============================================================

CREATE TABLE IF NOT EXISTS public.system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error', 'critical')),
  category TEXT NOT NULL CHECK (category IN (
    'auth', 'api', 'db', 'security', 'push', 'ai', 'payment',
    'signup', 'middleware', 'storage', 'cron', 'other'
  )),
  message TEXT NOT NULL,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Nullable, no FK — keep logs even after user/farm deleted
  user_id UUID,
  user_email TEXT,
  farm_id UUID,
  ip_address INET,
  user_agent TEXT,
  path TEXT,
  http_status INT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  resolved_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_system_logs_created
  ON public.system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_level_created
  ON public.system_logs(level, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_category_created
  ON public.system_logs(category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_unresolved
  ON public.system_logs(created_at DESC) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_system_logs_ip
  ON public.system_logs(ip_address, created_at DESC) WHERE ip_address IS NOT NULL;

-- RLS — không có policy SELECT cho user thường;
-- Super admin đọc qua service_role client (createAdminClient) bypass RLS.
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.system_logs IS
  'Centralized log cho mọi error/event app-level. Super admin xem qua /admin/super-admin/logs.';

-- Helper function để cleanup log cũ (>90 ngày) — dùng cron sau
CREATE OR REPLACE FUNCTION public.prune_system_logs(days_keep INT DEFAULT 90)
RETURNS INT AS $$
DECLARE deleted INT;
BEGIN
  DELETE FROM public.system_logs
  WHERE created_at < NOW() - (days_keep || ' days')::INTERVAL
    AND resolved_at IS NOT NULL;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END;
$$ LANGUAGE plpgsql;
