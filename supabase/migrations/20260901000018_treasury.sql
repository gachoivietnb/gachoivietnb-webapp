-- ============================================================
-- TREASURY — Quản lý quỹ / dòng tiền / thu chi
-- ============================================================
-- 3 bảng + 1 view per-tenant (RLS theo farm_id):
--
--   1) cash_accounts — tài khoản quỹ (Tiền mặt, Vietcombank, MoMo...)
--      có initial_balance, type, color, icon
--
--   2) cash_transactions — mọi dòng tiền IN/OUT
--      có direction, amount, category, ref_type/ref_id để link
--      sang sales_orders/purchases/expenses/payroll_payments
--
--   3) cash_transfers — chuyển khoản nội bộ giữa 2 account
--      sinh ra cặp transactions (out + in [+ fee])
--
-- View `cash_account_balances`: số dư hiện tại = initial + IN - OUT
-- ============================================================

-- ---- 1. CASH ACCOUNTS ---------------------------------------
CREATE TABLE IF NOT EXISTS public.cash_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,

  name TEXT NOT NULL,                          -- "Két tiền mặt", "Vietcombank Hậu"
  account_type TEXT NOT NULL DEFAULT 'cash'
    CHECK (account_type IN ('cash', 'bank', 'ewallet', 'other')),
  bank_name TEXT,                              -- nếu type=bank
  account_number TEXT,                         -- số TK (lưu plaintext, không sensitive cao)

  initial_balance BIGINT NOT NULL DEFAULT 0,   -- số dư khai báo lúc tạo TK
  initial_balance_date DATE NOT NULL DEFAULT CURRENT_DATE,

  is_default BOOLEAN NOT NULL DEFAULT false,   -- TK mặc định cho thu chi nhanh
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,

  -- Visual
  color TEXT NOT NULL DEFAULT 'from-emerald-500 to-teal-500',  -- tailwind gradient
  icon TEXT NOT NULL DEFAULT '💵',
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 1 farm chỉ có 1 default account
  CONSTRAINT cash_accounts_one_default
    EXCLUDE USING btree (farm_id WITH =) WHERE (is_default = true)
);

CREATE INDEX IF NOT EXISTS idx_cash_accounts_farm_id ON public.cash_accounts(farm_id);
CREATE INDEX IF NOT EXISTS idx_cash_accounts_active ON public.cash_accounts(farm_id, is_active);

DROP TRIGGER IF EXISTS tr_cash_accounts_updated_at ON public.cash_accounts;
CREATE TRIGGER tr_cash_accounts_updated_at
  BEFORE UPDATE ON public.cash_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---- 2. CASH TRANSACTIONS -----------------------------------
CREATE TABLE IF NOT EXISTS public.cash_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.cash_accounts(id) ON DELETE RESTRICT,

  direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  amount BIGINT NOT NULL CHECK (amount > 0),
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Phân loại nghiệp vụ
  category TEXT NOT NULL DEFAULT 'other'
    CHECK (category IN (
      'sale',          -- thu từ bán gà
      'purchase',      -- chi mua gà / nhập kho
      'expense',       -- chi phí (điện nước, sửa chuồng...)
      'payroll',       -- trả lương
      'transfer_in',   -- nhận từ chuyển khoản nội bộ
      'transfer_out',  -- gửi đi chuyển khoản nội bộ
      'transfer_fee',  -- phí chuyển khoản
      'opening',       -- ghi nhận số dư đầu kỳ
      'adjustment',    -- điều chỉnh đối soát
      'capital_in',    -- góp vốn / nạp tiền
      'capital_out',   -- rút vốn
      'loan_in',       -- nhận vay
      'loan_out',      -- trả nợ
      'other'
    )),

  -- Link tới module gốc (nếu có)
  ref_type TEXT
    CHECK (ref_type IS NULL OR ref_type IN (
      'sales_order', 'purchase', 'expense', 'payroll_payment',
      'cash_transfer', 'manual'
    )),
  ref_id UUID,
  expense_category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,

  description TEXT,
  reconciled BOOLEAN NOT NULL DEFAULT false,

  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cash_tx_farm_id ON public.cash_transactions(farm_id);
CREATE INDEX IF NOT EXISTS idx_cash_tx_account_id ON public.cash_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_cash_tx_date ON public.cash_transactions(farm_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_cash_tx_category ON public.cash_transactions(farm_id, category);
CREATE INDEX IF NOT EXISTS idx_cash_tx_ref ON public.cash_transactions(ref_type, ref_id);

DROP TRIGGER IF EXISTS tr_cash_transactions_updated_at ON public.cash_transactions;
CREATE TRIGGER tr_cash_transactions_updated_at
  BEFORE UPDATE ON public.cash_transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---- 3. CASH TRANSFERS --------------------------------------
CREATE TABLE IF NOT EXISTS public.cash_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,

  from_account_id UUID NOT NULL REFERENCES public.cash_accounts(id) ON DELETE RESTRICT,
  to_account_id UUID NOT NULL REFERENCES public.cash_accounts(id) ON DELETE RESTRICT,
  amount BIGINT NOT NULL CHECK (amount > 0),
  fee BIGINT NOT NULL DEFAULT 0 CHECK (fee >= 0),
  transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,

  -- Cặp transactions sinh ra (set sau khi insert tx)
  out_transaction_id UUID REFERENCES public.cash_transactions(id) ON DELETE SET NULL,
  in_transaction_id UUID REFERENCES public.cash_transactions(id) ON DELETE SET NULL,
  fee_transaction_id UUID REFERENCES public.cash_transactions(id) ON DELETE SET NULL,

  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT cash_transfers_diff_accounts CHECK (from_account_id <> to_account_id)
);

CREATE INDEX IF NOT EXISTS idx_cash_transfers_farm_id ON public.cash_transfers(farm_id);
CREATE INDEX IF NOT EXISTS idx_cash_transfers_date ON public.cash_transfers(farm_id, transfer_date DESC);

-- ---- 4. VIEW: cash_account_balances -------------------------
-- Tính số dư hiện tại của mỗi account = initial + sum(IN) - sum(OUT)
DROP VIEW IF EXISTS public.cash_account_balances CASCADE;
CREATE VIEW public.cash_account_balances AS
SELECT
  a.id AS account_id,
  a.farm_id,
  a.name,
  a.account_type,
  a.bank_name,
  a.account_number,
  a.is_default,
  a.is_active,
  a.display_order,
  a.color,
  a.icon,
  a.initial_balance,
  COALESCE(SUM(CASE WHEN t.direction = 'in' THEN t.amount ELSE 0 END), 0) AS total_in,
  COALESCE(SUM(CASE WHEN t.direction = 'out' THEN t.amount ELSE 0 END), 0) AS total_out,
  a.initial_balance
    + COALESCE(SUM(CASE WHEN t.direction = 'in' THEN t.amount ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN t.direction = 'out' THEN t.amount ELSE 0 END), 0)
    AS current_balance,
  COUNT(t.id) AS transaction_count,
  MAX(t.transaction_date) AS last_transaction_date
FROM public.cash_accounts a
LEFT JOIN public.cash_transactions t ON t.account_id = a.id
GROUP BY a.id;

COMMENT ON VIEW public.cash_account_balances IS
  'Số dư hiện tại từng tài khoản quỹ = initial + tổng IN - tổng OUT';

-- ---- 5. RLS -------------------------------------------------
ALTER TABLE public.cash_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cash_accounts_tenant_all ON public.cash_accounts;
CREATE POLICY cash_accounts_tenant_all ON public.cash_accounts
  FOR ALL TO authenticated
  USING (farm_id = public.current_farm_id())
  WITH CHECK (farm_id = public.current_farm_id());

DROP POLICY IF EXISTS cash_transactions_tenant_all ON public.cash_transactions;
CREATE POLICY cash_transactions_tenant_all ON public.cash_transactions
  FOR ALL TO authenticated
  USING (farm_id = public.current_farm_id())
  WITH CHECK (farm_id = public.current_farm_id());

DROP POLICY IF EXISTS cash_transfers_tenant_all ON public.cash_transfers;
CREATE POLICY cash_transfers_tenant_all ON public.cash_transfers
  FOR ALL TO authenticated
  USING (farm_id = public.current_farm_id())
  WITH CHECK (farm_id = public.current_farm_id());

-- ---- 6. AUTO-FILL farm_id triggers --------------------------
-- Pattern giống các bảng khác trong migration 14
CREATE OR REPLACE FUNCTION public.fill_farm_id_cash_accounts()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.farm_id IS NULL THEN
    NEW.farm_id := public.current_farm_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_fill_farm_id_cash_accounts ON public.cash_accounts;
CREATE TRIGGER tr_fill_farm_id_cash_accounts
  BEFORE INSERT ON public.cash_accounts
  FOR EACH ROW EXECUTE FUNCTION public.fill_farm_id_cash_accounts();

CREATE OR REPLACE FUNCTION public.fill_farm_id_cash_transactions()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.farm_id IS NULL THEN
    NEW.farm_id := public.current_farm_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_fill_farm_id_cash_transactions ON public.cash_transactions;
CREATE TRIGGER tr_fill_farm_id_cash_transactions
  BEFORE INSERT ON public.cash_transactions
  FOR EACH ROW EXECUTE FUNCTION public.fill_farm_id_cash_transactions();

CREATE OR REPLACE FUNCTION public.fill_farm_id_cash_transfers()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.farm_id IS NULL THEN
    NEW.farm_id := public.current_farm_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_fill_farm_id_cash_transfers ON public.cash_transfers;
CREATE TRIGGER tr_fill_farm_id_cash_transfers
  BEFORE INSERT ON public.cash_transfers
  FOR EACH ROW EXECUTE FUNCTION public.fill_farm_id_cash_transfers();

-- ---- 7. SEED 2 default accounts cho farm hiện có ------------
-- (dành cho farm đã backfill từ migration 12 — farm mới sẽ tự seed
--  qua app code khi chu_trai vào /admin/tai-chinh/quy lần đầu)
INSERT INTO public.cash_accounts (farm_id, name, account_type, is_default, color, icon, display_order)
SELECT
  f.id,
  'Két tiền mặt',
  'cash',
  true,
  'from-emerald-500 to-teal-500',
  '💵',
  0
FROM public.farms f
WHERE NOT EXISTS (
  SELECT 1 FROM public.cash_accounts ca WHERE ca.farm_id = f.id
)
ON CONFLICT DO NOTHING;

INSERT INTO public.cash_accounts (farm_id, name, account_type, bank_name, color, icon, display_order)
SELECT
  f.id,
  'Vietcombank',
  'bank',
  'Vietcombank',
  'from-green-600 to-emerald-700',
  '🏦',
  1
FROM public.farms f
WHERE NOT EXISTS (
  SELECT 1 FROM public.cash_accounts ca
  WHERE ca.farm_id = f.id AND ca.account_type = 'bank'
);

COMMENT ON TABLE public.cash_accounts IS
  'Tài khoản quỹ của farm (tiền mặt, ngân hàng, ví điện tử)';
COMMENT ON TABLE public.cash_transactions IS
  'Mọi dòng tiền IN/OUT — link với sales/purchases/expenses qua ref_type/ref_id';
COMMENT ON TABLE public.cash_transfers IS
  'Chuyển khoản nội bộ giữa 2 cash_accounts — sinh ra cặp transactions';
