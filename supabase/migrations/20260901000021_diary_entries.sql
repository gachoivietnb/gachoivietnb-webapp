-- ============================================================
-- DIARY ENTRIES — Nhật ký công việc hằng ngày
-- ============================================================
-- KHÁC với activity_logs (audit auto của hệ thống — ai làm gì).
-- Đây là nhật ký user CHỦ ĐỘNG ghi: hoạt động chăm sóc, quan sát,
-- sự cố, ghi chú trong ngày. Cả chủ trại + nhân viên đều dùng.
-- ============================================================

DO $$ BEGIN
  CREATE TYPE diary_category AS ENUM (
    'cham_soc',     -- chăm sóc gà hằng ngày
    'cho_an',       -- cho ăn / pha cám
    've_sinh',      -- vệ sinh chuồng trại
    'huan_luyen',   -- huấn luyện / vần gà
    'sinh_san',     -- sinh sản / ấp trứng / nở
    'thu_y',        -- ghi chú thú y / sức khỏe
    'kinh_doanh',   -- bán hàng / khách / mua sắm
    'su_co',        -- sự cố / cảnh báo / mất mát
    'quan_sat',     -- quan sát / nhận xét
    'cong_viec',    -- công việc khác
    'khac'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE diary_mood AS ENUM (
    'rat_tot',      -- 😄 rất tốt
    'tot',          -- 🙂 tốt
    'binh_thuong',  -- 😐 bình thường
    'lo_lang',      -- 😟 lo lắng
    'rat_xau'       -- 😞 rất xấu
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.diary_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Nội dung chính
  title TEXT,
  content TEXT NOT NULL CHECK (char_length(content) >= 1),
  category diary_category NOT NULL DEFAULT 'cong_viec',
  mood diary_mood,

  -- Thẻ tự do (free-form labels, vd "khu A", "lứa T4", "Hổ Vương")
  tags TEXT[] NOT NULL DEFAULT '{}',

  -- Liên kết tùy chọn
  related_chicken_id UUID REFERENCES public.chickens(id) ON DELETE SET NULL,
  related_area_id UUID REFERENCES public.areas(id) ON DELETE SET NULL,

  -- Thời gian + thời tiết
  diary_date DATE NOT NULL DEFAULT CURRENT_DATE,
  weather TEXT,                              -- "nắng", "mưa", "lạnh"...

  -- Media URLs (upload sau)
  attachments TEXT[] NOT NULL DEFAULT '{}',

  -- Ghim đầu danh sách
  is_pinned BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_diary_farm_date
  ON public.diary_entries(farm_id, diary_date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_diary_author
  ON public.diary_entries(author_id);
CREATE INDEX IF NOT EXISTS idx_diary_category
  ON public.diary_entries(farm_id, category);
CREATE INDEX IF NOT EXISTS idx_diary_pinned
  ON public.diary_entries(farm_id, is_pinned)
  WHERE is_pinned = true;
CREATE INDEX IF NOT EXISTS idx_diary_tags
  ON public.diary_entries USING gin(tags);

DROP TRIGGER IF EXISTS tr_diary_entries_updated_at ON public.diary_entries;
CREATE TRIGGER tr_diary_entries_updated_at
  BEFORE UPDATE ON public.diary_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.diary_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS diary_entries_tenant_all ON public.diary_entries;
CREATE POLICY diary_entries_tenant_all ON public.diary_entries
  FOR ALL TO authenticated
  USING (farm_id = public.current_farm_id())
  WITH CHECK (farm_id = public.current_farm_id());

-- Auto-fill farm_id
CREATE OR REPLACE FUNCTION public.fill_farm_id_diary_entries()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.farm_id IS NULL THEN
    NEW.farm_id := public.current_farm_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_fill_farm_id_diary_entries ON public.diary_entries;
CREATE TRIGGER tr_fill_farm_id_diary_entries
  BEFORE INSERT ON public.diary_entries
  FOR EACH ROW EXECUTE FUNCTION public.fill_farm_id_diary_entries();

COMMENT ON TABLE public.diary_entries IS
  'Nhật ký công việc do user chủ động ghi (khác activity_logs audit auto)';
