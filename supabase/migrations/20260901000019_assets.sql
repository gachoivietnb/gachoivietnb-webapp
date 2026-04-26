-- ============================================================
-- ASSETS — Quản lý tài sản & công cụ dụng cụ
-- ============================================================
-- 2 loại trong 1 bảng:
--   - tscd (TSCĐ): máy móc, công trình lớn, có khấu hao
--   - ccdc (CCDC): công cụ dụng cụ, phân bổ dần
--
-- assets — bảng chính
-- asset_events — lịch sử bảo trì / sửa / sự cố / thanh lý
-- ============================================================

DO $$ BEGIN
  CREATE TYPE asset_kind AS ENUM ('tscd', 'ccdc');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE asset_status AS ENUM (
    'dang_dung',     -- đang sử dụng
    'cho_sua',       -- đang chờ sửa / đang sửa
    'hong',          -- hỏng (không dùng được)
    'cho_ban',       -- chờ thanh lý
    'da_thanh_ly'    -- đã thanh lý
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,

  kind asset_kind NOT NULL,
  code TEXT NOT NULL,                          -- "TSCD-001", "CCDC-001"
  name TEXT NOT NULL,
  category TEXT,                               -- meta key (xem categories.ts)

  -- Số lượng + đơn vị
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  unit TEXT NOT NULL DEFAULT 'cái',

  -- Vị trí + người phụ trách
  area_id UUID REFERENCES public.areas(id) ON DELETE SET NULL,
  responsible_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  location_note TEXT,                          -- "Khu A2, kệ 3" — text bổ sung

  -- Mua sắm
  purchase_date DATE,
  purchase_price BIGINT NOT NULL DEFAULT 0 CHECK (purchase_price >= 0),
  supplier_name TEXT,
  invoice_number TEXT,
  warranty_until DATE,

  -- Khấu hao TSCĐ / Phân bổ CCDC
  useful_life_months INTEGER CHECK (useful_life_months IS NULL OR useful_life_months > 0),
  salvage_value BIGINT NOT NULL DEFAULT 0,    -- giá trị thu hồi cuối kỳ

  -- Thông số kỹ thuật
  brand TEXT,
  model TEXT,
  serial_number TEXT,
  image_url TEXT,

  -- Trạng thái + bảo trì
  status asset_status NOT NULL DEFAULT 'dang_dung',
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  maintenance_interval_months INTEGER,

  notes TEXT,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT assets_code_per_farm UNIQUE (farm_id, code)
);

CREATE INDEX IF NOT EXISTS idx_assets_farm_id ON public.assets(farm_id);
CREATE INDEX IF NOT EXISTS idx_assets_kind ON public.assets(farm_id, kind);
CREATE INDEX IF NOT EXISTS idx_assets_status ON public.assets(farm_id, status);
CREATE INDEX IF NOT EXISTS idx_assets_area ON public.assets(area_id);
CREATE INDEX IF NOT EXISTS idx_assets_next_maintenance ON public.assets(next_maintenance_date)
  WHERE next_maintenance_date IS NOT NULL;

DROP TRIGGER IF EXISTS tr_assets_updated_at ON public.assets;
CREATE TRIGGER tr_assets_updated_at
  BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


CREATE TABLE IF NOT EXISTS public.asset_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,

  event_type TEXT NOT NULL CHECK (event_type IN (
    'purchase',         -- ghi nhận mua mới
    'maintenance',      -- bảo trì định kỳ
    'repair',           -- sửa chữa
    'incident',         -- sự cố
    'transfer',         -- chuyển vị trí / người phụ trách
    'status_change',    -- đổi trạng thái
    'inspection',       -- kiểm kê
    'liquidation',      -- thanh lý
    'note'              -- ghi chú khác
  )),
  event_date DATE NOT NULL DEFAULT CURRENT_DATE,
  cost BIGINT NOT NULL DEFAULT 0 CHECK (cost >= 0),
  description TEXT,
  next_due_date DATE,                          -- cho maintenance lần kế

  performed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asset_events_asset ON public.asset_events(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_events_farm_date ON public.asset_events(farm_id, event_date DESC);

-- View: assets_with_value — tính current_value (giá trị còn lại)
DROP VIEW IF EXISTS public.assets_with_value CASCADE;
CREATE VIEW public.assets_with_value AS
SELECT
  a.*,
  -- Số tháng đã sử dụng
  CASE
    WHEN a.purchase_date IS NULL THEN 0
    ELSE GREATEST(0, EXTRACT(YEAR FROM age(CURRENT_DATE, a.purchase_date))::int * 12
                   + EXTRACT(MONTH FROM age(CURRENT_DATE, a.purchase_date))::int)
  END AS months_used,

  -- Giá trị còn lại tính theo straight-line depreciation
  CASE
    WHEN a.useful_life_months IS NULL OR a.useful_life_months = 0 THEN a.purchase_price
    WHEN a.purchase_date IS NULL THEN a.purchase_price
    WHEN a.status = 'da_thanh_ly' THEN 0
    ELSE GREATEST(
      a.salvage_value,
      a.purchase_price - (
        (a.purchase_price - a.salvage_value)
        * LEAST(
          a.useful_life_months,
          GREATEST(0, EXTRACT(YEAR FROM age(CURRENT_DATE, a.purchase_date))::int * 12
                     + EXTRACT(MONTH FROM age(CURRENT_DATE, a.purchase_date))::int)
        )
        / NULLIF(a.useful_life_months, 0)
      )
    )::bigint
  END AS current_value,

  -- Khấu hao đã trích
  CASE
    WHEN a.useful_life_months IS NULL OR a.useful_life_months = 0 THEN 0
    WHEN a.purchase_date IS NULL THEN 0
    ELSE LEAST(
      a.purchase_price - a.salvage_value,
      ((a.purchase_price - a.salvage_value)
        * LEAST(
          a.useful_life_months,
          GREATEST(0, EXTRACT(YEAR FROM age(CURRENT_DATE, a.purchase_date))::int * 12
                     + EXTRACT(MONTH FROM age(CURRENT_DATE, a.purchase_date))::int)
        )
        / NULLIF(a.useful_life_months, 0))::bigint
    )
  END AS accumulated_depreciation,

  -- Phụ trách + khu (join)
  p.full_name AS responsible_name,
  ar.code AS area_code,
  ar.name_vi AS area_name,

  -- Trạng thái bảo trì
  CASE
    WHEN a.next_maintenance_date IS NULL THEN NULL
    WHEN a.next_maintenance_date < CURRENT_DATE THEN 'overdue'
    WHEN a.next_maintenance_date < CURRENT_DATE + INTERVAL '14 days' THEN 'due_soon'
    ELSE 'ok'
  END AS maintenance_status

FROM public.assets a
LEFT JOIN public.profiles p ON p.id = a.responsible_user_id
LEFT JOIN public.areas ar ON ar.id = a.area_id;


-- RLS
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS assets_tenant_all ON public.assets;
CREATE POLICY assets_tenant_all ON public.assets
  FOR ALL TO authenticated
  USING (farm_id = public.current_farm_id())
  WITH CHECK (farm_id = public.current_farm_id());

DROP POLICY IF EXISTS asset_events_tenant_all ON public.asset_events;
CREATE POLICY asset_events_tenant_all ON public.asset_events
  FOR ALL TO authenticated
  USING (farm_id = public.current_farm_id())
  WITH CHECK (farm_id = public.current_farm_id());

-- Auto-fill farm_id
CREATE OR REPLACE FUNCTION public.fill_farm_id_assets()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.farm_id IS NULL THEN
    NEW.farm_id := public.current_farm_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_fill_farm_id_assets ON public.assets;
CREATE TRIGGER tr_fill_farm_id_assets
  BEFORE INSERT ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.fill_farm_id_assets();

CREATE OR REPLACE FUNCTION public.fill_farm_id_asset_events()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.farm_id IS NULL THEN
    NEW.farm_id := public.current_farm_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_fill_farm_id_asset_events ON public.asset_events;
CREATE TRIGGER tr_fill_farm_id_asset_events
  BEFORE INSERT ON public.asset_events
  FOR EACH ROW EXECUTE FUNCTION public.fill_farm_id_asset_events();

COMMENT ON TABLE public.assets IS 'TSCĐ + CCDC của farm (kind=tscd|ccdc)';
COMMENT ON TABLE public.asset_events IS 'Lịch sử sự kiện: bảo trì, sửa, sự cố, thanh lý...';
COMMENT ON VIEW public.assets_with_value IS 'Asset + giá trị còn lại theo khấu hao straight-line + status bảo trì';
