-- ============================================================
-- PAYMENT SETTINGS + SUBSCRIPTION ORDERS
-- ============================================================
-- Phase 2 of SaaS commercialization. Adds 2 global tables:
--
--   1) payment_settings — singleton (key='default') giữ thông tin
--      tài khoản nhận tiền của SaaS owner. Super-admin nhập 1 lần
--      qua trang /admin/super-admin/payments.
--
--   2) subscription_orders — mỗi đơn nâng gói tạo 1 row. User chuyển
--      khoản theo `payment_note`. Super-admin (manual) hoặc Casso
--      webhook (auto, Phase 3) update status='paid' → trigger activate.
--
-- Cả 2 bảng GLOBAL (không farm_id ở payment_settings; orders có
-- farm_id reference). Chỉ service_role + super-admin được write.
-- ============================================================

-- ---- 1. PAYMENT SETTINGS (singleton) -----------------------
CREATE TABLE IF NOT EXISTS public.payment_settings (
  id TEXT PRIMARY KEY DEFAULT 'default'
    CHECK (id = 'default'),
  -- Bank transfer (Vietcombank mặc định, nhưng có thể đổi)
  bank_name TEXT,                 -- "Vietcombank"
  bank_bin TEXT,                  -- "970436" (mã BIN cho VietQR)
  bank_account_number TEXT,
  bank_account_holder TEXT,       -- TÊN CHỦ TK in hoa
  bank_branch TEXT,
  -- MoMo
  momo_phone TEXT,
  momo_holder TEXT,
  -- VietQR template (img.vietqr.io). Nếu null thì dùng template 'compact2'
  vietqr_template TEXT NOT NULL DEFAULT 'compact2',
  -- Cấu hình mã ghi chú đơn hàng
  payment_note_prefix TEXT NOT NULL DEFAULT 'GCV',
  -- Tự động kích hoạt khi Casso báo (Phase 3)
  auto_activate_enabled BOOLEAN NOT NULL DEFAULT false,
  casso_api_key TEXT,             -- (encrypted later, lưu plaintext trong dev)
  casso_webhook_secret TEXT,
  -- Liên hệ hiển thị trên trang thanh toán
  support_phone TEXT,
  support_zalo TEXT,
  -- Audit
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

DROP TRIGGER IF EXISTS tr_payment_settings_updated_at ON public.payment_settings;
CREATE TRIGGER tr_payment_settings_updated_at
  BEFORE UPDATE ON public.payment_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

-- Authenticated users đọc được (cần để hiển thị TK trên /admin/payment/[id])
DROP POLICY IF EXISTS payment_settings_authenticated_read ON public.payment_settings;
CREATE POLICY payment_settings_authenticated_read ON public.payment_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Chỉ service_role write — super-admin gọi qua API server-side.
-- (Không tạo policy cho authenticated write.)

-- Seed singleton row
INSERT INTO public.payment_settings (id, bank_name, bank_bin, vietqr_template, payment_note_prefix)
VALUES ('default', 'Vietcombank', '970436', 'compact2', 'GCV')
ON CONFLICT (id) DO NOTHING;


-- ---- 2. SUBSCRIPTION ORDERS --------------------------------
CREATE TABLE IF NOT EXISTS public.subscription_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Gói + thời hạn
  tier TEXT NOT NULL CHECK (tier IN ('basic', 'pro', 'enterprise')),
  months INTEGER NOT NULL CHECK (months IN (1, 3, 6, 12)),
  amount_vnd BIGINT NOT NULL CHECK (amount_vnd > 0),

  -- Phương thức thanh toán
  payment_method TEXT NOT NULL DEFAULT 'bank_transfer'
    CHECK (payment_method IN ('bank_transfer', 'momo', 'vnpay', 'manual')),

  -- Mã ghi chú yêu cầu user nhập khi chuyển khoản (unique index để Casso match)
  payment_note TEXT NOT NULL UNIQUE,

  -- Trạng thái
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'cancelled', 'expired', 'refunded')),

  -- Mốc thời gian
  expires_at TIMESTAMPTZ NOT NULL,    -- thường = created + 24h
  paid_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,

  -- Ai xác nhận (nếu manual). null nếu auto qua webhook.
  confirmed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  cancellation_reason TEXT,

  -- Slot cho Phase 3: Casso transaction ID + raw payload
  casso_txn_id TEXT,
  casso_payload JSONB,
  -- Slot cho VNPay/MoMo (nếu sau này tích hợp)
  gateway_txn_ref TEXT,
  gateway_payload JSONB,

  -- Ghi chú nội bộ (super-admin)
  admin_note TEXT,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_orders_farm_id ON public.subscription_orders(farm_id);
CREATE INDEX IF NOT EXISTS idx_subscription_orders_user_id ON public.subscription_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_orders_status ON public.subscription_orders(status);
CREATE INDEX IF NOT EXISTS idx_subscription_orders_payment_note ON public.subscription_orders(payment_note);
CREATE INDEX IF NOT EXISTS idx_subscription_orders_created_at ON public.subscription_orders(created_at DESC);

DROP TRIGGER IF EXISTS tr_subscription_orders_updated_at ON public.subscription_orders;
CREATE TRIGGER tr_subscription_orders_updated_at
  BEFORE UPDATE ON public.subscription_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.subscription_orders ENABLE ROW LEVEL SECURITY;

-- Tenant đọc đơn của farm mình
DROP POLICY IF EXISTS subscription_orders_tenant_read ON public.subscription_orders;
CREATE POLICY subscription_orders_tenant_read ON public.subscription_orders
  FOR SELECT
  TO authenticated
  USING (farm_id = public.current_farm_id());

-- Tenant insert đơn cho farm mình (chỉ chủ trại)
DROP POLICY IF EXISTS subscription_orders_tenant_insert ON public.subscription_orders;
CREATE POLICY subscription_orders_tenant_insert ON public.subscription_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    farm_id = public.current_farm_id()
    AND user_id = auth.uid()
  );

-- Tenant cancel đơn của mình (status pending → cancelled)
DROP POLICY IF EXISTS subscription_orders_tenant_update ON public.subscription_orders;
CREATE POLICY subscription_orders_tenant_update ON public.subscription_orders
  FOR UPDATE
  TO authenticated
  USING (farm_id = public.current_farm_id() AND user_id = auth.uid())
  WITH CHECK (farm_id = public.current_farm_id() AND user_id = auth.uid());

-- service_role bypass RLS (dùng cho confirmOrder server-side)

COMMENT ON TABLE public.payment_settings IS
  'Singleton: thông tin tài khoản nhận tiền của SaaS owner.';
COMMENT ON TABLE public.subscription_orders IS
  'Đơn nâng gói. user chuyển khoản theo payment_note. status=paid trigger activate farm.';
