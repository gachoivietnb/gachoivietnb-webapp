-- ============================================================
-- INVOICES — Hóa đơn điện tử (TT 78/2021/TT-BTC)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 5 bảng:
--   invoice_providers — cấu hình NCC HĐĐT (Viettel/VNPT/MISA/custom)
--   invoice_buyers    — người mua HĐ (link với customers)
--   invoices          — header HĐ
--   invoice_items     — chi tiết dòng HĐ
--   invoice_events    — audit log: tạo/phát hành/huỷ/điều chỉnh + payload API
-- ============================================================

-- ============ ENUMS ============

DO $$ BEGIN
  CREATE TYPE invoice_provider_code AS ENUM ('viettel', 'vnpt', 'misa', 'custom');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM (
    'nhap',           -- HĐ nháp (chưa phát hành)
    'cho_phat_hanh',  -- chờ ký số / chờ NCC trả mã CQT
    'da_phat_hanh',   -- đã phát hành thành công, có mã CQT
    'da_huy',         -- đã hủy (kèm lý do)
    'dieu_chinh',     -- HĐ điều chỉnh (cho HĐ đã PH khác)
    'thay_the'        -- HĐ thay thế (cho HĐ đã PH khác)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE invoice_buyer_type AS ENUM ('ca_nhan', 'doanh_nghiep');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE invoice_payment_method AS ENUM ('TM', 'CK', 'TM_CK');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE invoice_cqt_status AS ENUM (
    'chua_gui',       -- chưa gửi cơ quan thuế
    'cho_cap_ma',     -- đã gửi, chờ cấp mã
    'da_cap_ma',      -- đã được cấp mã CQT
    'tu_choi'         -- bị từ chối
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ 1. INVOICE_PROVIDERS ============

CREATE TABLE IF NOT EXISTS public.invoice_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,

  provider_code invoice_provider_code NOT NULL,
  name TEXT NOT NULL,                          -- "Viettel S-Invoice (chính thức)"

  -- Endpoint + auth
  api_url TEXT,                                -- VD: https://api-vinvoice.viettel.vn
  api_username TEXT,
  api_password_encrypted TEXT,                 -- mã hoá AES-256 trước khi lưu
  api_token TEXT,                              -- token (nếu NCC trả token thay password)

  -- Thông tin bên bán mặc định trên HĐ
  seller_tax_code TEXT NOT NULL,               -- MST trại
  seller_name TEXT NOT NULL,                   -- tên pháp nhân
  seller_address TEXT,
  seller_phone TEXT,
  seller_email TEXT,
  seller_bank_account TEXT,
  seller_bank_name TEXT,

  -- Mẫu số / ký hiệu / serial chữ ký số
  default_template_code TEXT,                  -- "1" hoặc "01GTKT0/001"
  default_invoice_serial TEXT,                 -- "C26TNN", "K26TAA"
  signing_serial TEXT,                         -- serial chữ ký số HSM
  signing_cert_alias TEXT,

  -- Cấu hình bổ sung (cho custom hoặc field đặc thù)
  extra_config JSONB NOT NULL DEFAULT '{}'::jsonb,

  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  test_mode BOOLEAN NOT NULL DEFAULT TRUE,     -- mode test (sandbox NCC) vs production

  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT invoice_providers_name_per_farm UNIQUE (farm_id, name)
);

CREATE INDEX IF NOT EXISTS idx_invoice_providers_farm ON public.invoice_providers(farm_id);
CREATE INDEX IF NOT EXISTS idx_invoice_providers_default ON public.invoice_providers(farm_id, is_default)
  WHERE is_default = TRUE;

DROP TRIGGER IF EXISTS tr_invoice_providers_updated_at ON public.invoice_providers;
CREATE TRIGGER tr_invoice_providers_updated_at
  BEFORE UPDATE ON public.invoice_providers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Đảm bảo chỉ 1 default per farm
CREATE OR REPLACE FUNCTION public.enforce_single_default_provider()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default THEN
    UPDATE public.invoice_providers
       SET is_default = FALSE
     WHERE farm_id = NEW.farm_id
       AND id <> NEW.id
       AND is_default = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_enforce_single_default_provider ON public.invoice_providers;
CREATE TRIGGER tr_enforce_single_default_provider
  AFTER INSERT OR UPDATE OF is_default ON public.invoice_providers
  FOR EACH ROW EXECUTE FUNCTION public.enforce_single_default_provider();


-- ============ 2. INVOICE_BUYERS ============

CREATE TABLE IF NOT EXISTS public.invoice_buyers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,

  -- Liên kết tuỳ chọn với customers
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,

  buyer_type invoice_buyer_type NOT NULL DEFAULT 'ca_nhan',
  name TEXT NOT NULL,                           -- tên người mua / công ty
  tax_code TEXT,                                -- MST (bắt buộc với DN)
  address TEXT,
  email TEXT,                                   -- để gửi HĐ
  phone TEXT,

  -- Tài khoản NH (optional, hiển thị trên HĐ)
  bank_account TEXT,
  bank_name TEXT,

  -- Đại diện DN
  representative_name TEXT,

  -- Buyer code nội bộ (để tìm nhanh)
  buyer_code TEXT,

  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT invoice_buyers_taxcode_per_farm UNIQUE NULLS NOT DISTINCT (farm_id, tax_code)
);

CREATE INDEX IF NOT EXISTS idx_invoice_buyers_farm ON public.invoice_buyers(farm_id);
CREATE INDEX IF NOT EXISTS idx_invoice_buyers_customer ON public.invoice_buyers(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoice_buyers_tax ON public.invoice_buyers(farm_id, tax_code);
CREATE INDEX IF NOT EXISTS idx_invoice_buyers_name_trgm ON public.invoice_buyers
  USING gin (name gin_trgm_ops);

DROP TRIGGER IF EXISTS tr_invoice_buyers_updated_at ON public.invoice_buyers;
CREATE TRIGGER tr_invoice_buyers_updated_at
  BEFORE UPDATE ON public.invoice_buyers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============ 3. INVOICES (header) ============

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,

  -- NCC phát hành
  provider_id UUID REFERENCES public.invoice_providers(id) ON DELETE SET NULL,

  -- Thông tin HĐ (theo TT 78)
  invoice_no TEXT,                              -- số HĐ — NCC trả về sau khi phát hành
  invoice_form TEXT,                            -- mẫu số (template_code)
  invoice_serial TEXT,                          -- ký hiệu (VD "C26TNN")
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  internal_no TEXT NOT NULL,                    -- số nội bộ (auto sinh, unique trong farm)

  -- Bên mua
  buyer_id UUID REFERENCES public.invoice_buyers(id) ON DELETE RESTRICT,
  buyer_snapshot JSONB,                         -- snapshot buyer info tại thời điểm xuất

  -- Bên bán snapshot (lấy từ provider tại thời điểm xuất)
  seller_snapshot JSONB,

  -- Liên kết với phiếu Bán ra (nếu có)
  sales_order_id UUID REFERENCES public.sales_orders(id) ON DELETE SET NULL,

  -- Tiền tệ
  currency TEXT NOT NULL DEFAULT 'VND',
  exchange_rate NUMERIC(18,6) NOT NULL DEFAULT 1,

  -- Tổng hợp tiền
  subtotal NUMERIC(18,2) NOT NULL DEFAULT 0,    -- tổng chưa thuế (sau CK)
  discount_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  tax_rate_default NUMERIC(5,2),                -- thuế suất chung (thông tin)
  tax_amount NUMERIC(18,2) NOT NULL DEFAULT 0,  -- tổng thuế
  total NUMERIC(18,2) NOT NULL DEFAULT 0,       -- tổng cộng (sau thuế)
  total_words TEXT,                             -- số tiền bằng chữ

  payment_method invoice_payment_method NOT NULL DEFAULT 'TM_CK',

  -- Trạng thái
  status invoice_status NOT NULL DEFAULT 'nhap',
  cqt_status invoice_cqt_status NOT NULL DEFAULT 'chua_gui',
  cqt_code TEXT,                                -- mã CQT cấp
  cqt_lookup_code TEXT,                         -- mã tra cứu
  signed_at TIMESTAMPTZ,
  issued_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,

  -- Liên kết HĐ điều chỉnh / thay thế
  replaced_invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  adjustment_invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  adjustment_type TEXT CHECK (adjustment_type IN ('tang', 'giam')),  -- chỉ với HĐ điều chỉnh

  -- File
  pdf_url TEXT,
  xml_url TEXT,

  -- Email gửi cho khách
  buyer_email_sent_at TIMESTAMPTZ,
  buyer_email_log JSONB,

  -- Meta
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT invoices_internal_no_per_farm UNIQUE (farm_id, internal_no)
);

CREATE INDEX IF NOT EXISTS idx_invoices_farm ON public.invoices(farm_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(farm_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON public.invoices(farm_id, issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_buyer ON public.invoices(buyer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_provider ON public.invoices(provider_id);
CREATE INDEX IF NOT EXISTS idx_invoices_sales_order ON public.invoices(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_no ON public.invoices(farm_id, invoice_no)
  WHERE invoice_no IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_cqt_status ON public.invoices(farm_id, cqt_status);

DROP TRIGGER IF EXISTS tr_invoices_updated_at ON public.invoices;
CREATE TRIGGER tr_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-fill internal_no theo dạng HD-YYYY-NNNN
CREATE OR REPLACE FUNCTION public.fill_invoice_internal_no()
RETURNS TRIGGER AS $$
DECLARE
  v_year TEXT;
  v_seq INT;
  v_farm UUID;
BEGIN
  IF NEW.internal_no IS NOT NULL AND NEW.internal_no <> '' THEN
    RETURN NEW;
  END IF;
  v_farm := COALESCE(NEW.farm_id, public.current_farm_id());
  v_year := TO_CHAR(COALESCE(NEW.issue_date, CURRENT_DATE), 'YYYY');
  SELECT COALESCE(MAX(
    NULLIF(regexp_replace(internal_no, '^HD-' || v_year || '-', ''), '')::int
  ), 0) + 1
    INTO v_seq
    FROM public.invoices
   WHERE farm_id = v_farm
     AND internal_no LIKE 'HD-' || v_year || '-%';
  NEW.internal_no := 'HD-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_fill_invoice_internal_no ON public.invoices;
CREATE TRIGGER tr_fill_invoice_internal_no
  BEFORE INSERT ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.fill_invoice_internal_no();


-- ============ 4. INVOICE_ITEMS ============

CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,

  sort_order INT NOT NULL DEFAULT 0,
  product_code TEXT,
  description TEXT NOT NULL,                    -- tên hàng hoá / dịch vụ
  unit TEXT NOT NULL DEFAULT 'cái',
  quantity NUMERIC(18,4) NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  unit_price NUMERIC(18,2) NOT NULL DEFAULT 0,
  discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (discount_pct >= 0 AND discount_pct <= 100),
  discount_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0,     -- 0/5/8/10 hoặc -1 (KCT) -2 (KKKNT) — convention
  tax_rate_label TEXT,                          -- "10%", "KCT", "KKKNT"
  line_subtotal NUMERIC(18,2) NOT NULL DEFAULT 0,  -- (qty * unit_price) - discount
  line_tax NUMERIC(18,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(18,2) NOT NULL DEFAULT 0,

  -- Liên kết hàng hoá nội bộ (gà, thuốc, ccdc, …)
  ref_type TEXT,                                -- 'chicken' | 'drug' | 'feed' | 'asset' | NULL
  ref_id UUID,

  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_farm ON public.invoice_items(farm_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_ref ON public.invoice_items(ref_type, ref_id)
  WHERE ref_type IS NOT NULL;


-- ============ 5. INVOICE_EVENTS (audit) ============

CREATE TABLE IF NOT EXISTS public.invoice_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,

  event_type TEXT NOT NULL CHECK (event_type IN (
    'created',
    'updated',
    'submitted',           -- gửi lên NCC HĐĐT
    'signed',              -- đã ký số
    'issued',              -- đã phát hành (CQT cấp mã)
    'cqt_rejected',        -- CQT từ chối
    'cancelled',
    'adjusted',
    'replaced',
    'sent_to_buyer',       -- đã gửi mail/zalo cho khách
    'pdf_generated',
    'note'
  )),

  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_name TEXT,

  request_payload JSONB,
  response_payload JSONB,
  error_message TEXT,
  message TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_events_invoice ON public.invoice_events(invoice_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoice_events_farm ON public.invoice_events(farm_id, created_at DESC);


-- ============ VIEW: invoices_full ============

DROP VIEW IF EXISTS public.invoices_full CASCADE;
CREATE VIEW public.invoices_full AS
SELECT
  i.*,
  b.name AS buyer_name,
  b.tax_code AS buyer_tax_code,
  b.address AS buyer_address,
  b.email AS buyer_email,
  b.phone AS buyer_phone,
  b.buyer_type AS buyer_type,
  b.customer_id AS buyer_customer_id,
  pr.name AS provider_name,
  pr.provider_code AS provider_code,
  pf.full_name AS created_by_name,
  (SELECT COUNT(*)::int FROM public.invoice_items ii WHERE ii.invoice_id = i.id) AS item_count
FROM public.invoices i
LEFT JOIN public.invoice_buyers b ON b.id = i.buyer_id
LEFT JOIN public.invoice_providers pr ON pr.id = i.provider_id
LEFT JOIN public.profiles pf ON pf.id = i.created_by;


-- ============ STATS VIEW: doanh thu theo tháng ============

DROP VIEW IF EXISTS public.invoice_monthly_stats CASCADE;
CREATE VIEW public.invoice_monthly_stats AS
SELECT
  i.farm_id,
  DATE_TRUNC('month', i.issue_date)::date AS month,
  COUNT(*) FILTER (WHERE i.status = 'da_phat_hanh')::int AS issued_count,
  COUNT(*) FILTER (WHERE i.status = 'nhap')::int         AS draft_count,
  COUNT(*) FILTER (WHERE i.status = 'da_huy')::int       AS cancelled_count,
  COALESCE(SUM(i.subtotal) FILTER (WHERE i.status = 'da_phat_hanh'), 0)    AS total_subtotal,
  COALESCE(SUM(i.tax_amount) FILTER (WHERE i.status = 'da_phat_hanh'), 0)  AS total_tax,
  COALESCE(SUM(i.total) FILTER (WHERE i.status = 'da_phat_hanh'), 0)       AS total_revenue
FROM public.invoices i
GROUP BY i.farm_id, DATE_TRUNC('month', i.issue_date);


-- ============ RLS ============

ALTER TABLE public.invoice_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_buyers    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_events    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS invoice_providers_tenant_all ON public.invoice_providers;
CREATE POLICY invoice_providers_tenant_all ON public.invoice_providers
  FOR ALL TO authenticated
  USING (farm_id = public.current_farm_id())
  WITH CHECK (farm_id = public.current_farm_id());

DROP POLICY IF EXISTS invoice_buyers_tenant_all ON public.invoice_buyers;
CREATE POLICY invoice_buyers_tenant_all ON public.invoice_buyers
  FOR ALL TO authenticated
  USING (farm_id = public.current_farm_id())
  WITH CHECK (farm_id = public.current_farm_id());

DROP POLICY IF EXISTS invoices_tenant_all ON public.invoices;
CREATE POLICY invoices_tenant_all ON public.invoices
  FOR ALL TO authenticated
  USING (farm_id = public.current_farm_id())
  WITH CHECK (farm_id = public.current_farm_id());

DROP POLICY IF EXISTS invoice_items_tenant_all ON public.invoice_items;
CREATE POLICY invoice_items_tenant_all ON public.invoice_items
  FOR ALL TO authenticated
  USING (farm_id = public.current_farm_id())
  WITH CHECK (farm_id = public.current_farm_id());

DROP POLICY IF EXISTS invoice_events_tenant_all ON public.invoice_events;
CREATE POLICY invoice_events_tenant_all ON public.invoice_events
  FOR ALL TO authenticated
  USING (farm_id = public.current_farm_id())
  WITH CHECK (farm_id = public.current_farm_id());


-- ============ Auto-fill farm_id (multitenancy) ============

CREATE OR REPLACE FUNCTION public.fill_farm_id_invoice_providers()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.farm_id IS NULL THEN NEW.farm_id := public.current_farm_id(); END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_fill_farm_id_invoice_providers ON public.invoice_providers;
CREATE TRIGGER tr_fill_farm_id_invoice_providers
  BEFORE INSERT ON public.invoice_providers
  FOR EACH ROW EXECUTE FUNCTION public.fill_farm_id_invoice_providers();

CREATE OR REPLACE FUNCTION public.fill_farm_id_invoice_buyers()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.farm_id IS NULL THEN NEW.farm_id := public.current_farm_id(); END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_fill_farm_id_invoice_buyers ON public.invoice_buyers;
CREATE TRIGGER tr_fill_farm_id_invoice_buyers
  BEFORE INSERT ON public.invoice_buyers
  FOR EACH ROW EXECUTE FUNCTION public.fill_farm_id_invoice_buyers();

CREATE OR REPLACE FUNCTION public.fill_farm_id_invoices()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.farm_id IS NULL THEN NEW.farm_id := public.current_farm_id(); END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_fill_farm_id_invoices ON public.invoices;
CREATE TRIGGER tr_fill_farm_id_invoices
  BEFORE INSERT ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.fill_farm_id_invoices();

CREATE OR REPLACE FUNCTION public.fill_farm_id_invoice_items()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.farm_id IS NULL THEN
    SELECT farm_id INTO NEW.farm_id FROM public.invoices WHERE id = NEW.invoice_id;
  END IF;
  IF NEW.farm_id IS NULL THEN NEW.farm_id := public.current_farm_id(); END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_fill_farm_id_invoice_items ON public.invoice_items;
CREATE TRIGGER tr_fill_farm_id_invoice_items
  BEFORE INSERT ON public.invoice_items
  FOR EACH ROW EXECUTE FUNCTION public.fill_farm_id_invoice_items();

CREATE OR REPLACE FUNCTION public.fill_farm_id_invoice_events()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.farm_id IS NULL THEN
    SELECT farm_id INTO NEW.farm_id FROM public.invoices WHERE id = NEW.invoice_id;
  END IF;
  IF NEW.farm_id IS NULL THEN NEW.farm_id := public.current_farm_id(); END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_fill_farm_id_invoice_events ON public.invoice_events;
CREATE TRIGGER tr_fill_farm_id_invoice_events
  BEFORE INSERT ON public.invoice_events
  FOR EACH ROW EXECUTE FUNCTION public.fill_farm_id_invoice_events();


-- ============ Trigger: tự tính lại totals khi items thay đổi ============

CREATE OR REPLACE FUNCTION public.recompute_invoice_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice_id UUID;
BEGIN
  v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);
  UPDATE public.invoices i
     SET subtotal = COALESCE((SELECT SUM(line_subtotal) FROM public.invoice_items WHERE invoice_id = v_invoice_id), 0),
         tax_amount = COALESCE((SELECT SUM(line_tax) FROM public.invoice_items WHERE invoice_id = v_invoice_id), 0),
         total = COALESCE((SELECT SUM(line_total) FROM public.invoice_items WHERE invoice_id = v_invoice_id), 0)
   WHERE i.id = v_invoice_id
     AND i.status IN ('nhap', 'cho_phat_hanh');
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_recompute_invoice_totals ON public.invoice_items;
CREATE TRIGGER tr_recompute_invoice_totals
  AFTER INSERT OR UPDATE OR DELETE ON public.invoice_items
  FOR EACH ROW EXECUTE FUNCTION public.recompute_invoice_totals();


-- ============ Trigger: chặn sửa HĐ đã phát hành ============

CREATE OR REPLACE FUNCTION public.prevent_modify_issued_invoice()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'da_phat_hanh' AND NEW.status = 'da_phat_hanh' THEN
    -- Chỉ cho phép cập nhật một số field nhất định
    IF NEW.subtotal <> OLD.subtotal
       OR NEW.tax_amount <> OLD.tax_amount
       OR NEW.total <> OLD.total
       OR NEW.buyer_id <> OLD.buyer_id
       OR NEW.invoice_no IS DISTINCT FROM OLD.invoice_no
    THEN
      RAISE EXCEPTION 'Không thể sửa HĐ đã phát hành. Vui lòng dùng HĐ điều chỉnh hoặc thay thế.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_prevent_modify_issued_invoice ON public.invoices;
CREATE TRIGGER tr_prevent_modify_issued_invoice
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.prevent_modify_issued_invoice();


-- ============ Comments ============

COMMENT ON TABLE public.invoice_providers IS 'Cấu hình nhà cung cấp HĐ điện tử (Viettel/VNPT/MISA/custom)';
COMMENT ON TABLE public.invoice_buyers IS 'Người mua HĐ — link với customers (nếu có)';
COMMENT ON TABLE public.invoices IS 'Header hóa đơn điện tử theo TT 78/2021/TT-BTC';
COMMENT ON TABLE public.invoice_items IS 'Chi tiết dòng HĐ — mỗi dòng có thuế suất riêng';
COMMENT ON TABLE public.invoice_events IS 'Audit log: tạo, gửi NCC, ký, phát hành, hủy, điều chỉnh, gửi mail';
COMMENT ON VIEW public.invoices_full IS 'Invoices + buyer info + provider info + creator name';
COMMENT ON VIEW public.invoice_monthly_stats IS 'Doanh thu HĐ theo tháng (cho dashboard)';
