-- ============================================================
-- DIARY_PLANS — "Việc cần làm tới đây" gắn với Nhật ký
-- ============================================================
-- Khi ghi nhật ký, user có thể thêm nhanh các việc cần làm tới
-- (lịch tiêm bổ sung, mua thuốc, sửa chuồng...). Các plan này
-- được module Kế hoạch hiển thị + nhắc đúng ngày.
-- ============================================================

DO $$ BEGIN
  CREATE TYPE diary_plan_priority AS ENUM ('critical', 'high', 'medium', 'low');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE diary_plan_status AS ENUM ('pending', 'done', 'snoozed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE diary_plan_category AS ENUM (
    'cong_viec',     -- công việc chung
    'cham_soc',      -- chăm sóc đàn
    'cho_an',        -- cho ăn / pha trộn cám
    've_sinh',       -- vệ sinh chuồng
    'huan_luyen',    -- huấn luyện / vần
    'sinh_san',      -- ấp / phối giống
    'thu_y',         -- tiêm phòng / khám / cách ly
    'kinh_doanh',    -- bán / mua / liên hệ KH
    'su_co',         -- xử lý sự cố
    'bao_tri',       -- bảo trì TS / CCDC
    'khac'           -- khác
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.diary_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,

  -- Liên kết với entry nhật ký (nullable — có thể tạo plan độc lập sau)
  diary_entry_id UUID REFERENCES public.diary_entries(id) ON DELETE SET NULL,

  -- Nội dung
  title TEXT NOT NULL CHECK (char_length(title) >= 1 AND char_length(title) <= 300),
  description TEXT,

  -- Lịch trình
  due_date DATE NOT NULL,
  due_time TIME,                       -- giờ cụ thể (optional)
  reminder_at TIMESTAMPTZ,             -- thời điểm gửi notification (server có thể cron sau)

  -- Phân loại
  category diary_plan_category NOT NULL DEFAULT 'cong_viec',
  priority diary_plan_priority NOT NULL DEFAULT 'medium',

  -- Phụ trách
  assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Liên kết nhanh (optional)
  related_chicken_id UUID REFERENCES public.chickens(id) ON DELETE SET NULL,
  related_area_id UUID REFERENCES public.areas(id) ON DELETE SET NULL,

  -- Trạng thái
  status diary_plan_status NOT NULL DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  completion_note TEXT,

  -- Snooze
  snoozed_until DATE,

  -- Audit
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_diary_plans_farm_due
  ON public.diary_plans(farm_id, due_date, status);
CREATE INDEX IF NOT EXISTS idx_diary_plans_entry
  ON public.diary_plans(diary_entry_id);
CREATE INDEX IF NOT EXISTS idx_diary_plans_assignee
  ON public.diary_plans(assignee_id, status)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_diary_plans_pending
  ON public.diary_plans(farm_id, due_date)
  WHERE status = 'pending';

DROP TRIGGER IF EXISTS tr_diary_plans_updated_at ON public.diary_plans;
CREATE TRIGGER tr_diary_plans_updated_at
  BEFORE UPDATE ON public.diary_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.diary_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS diary_plans_tenant_all ON public.diary_plans;
CREATE POLICY diary_plans_tenant_all ON public.diary_plans
  FOR ALL TO authenticated
  USING (farm_id = public.current_farm_id())
  WITH CHECK (farm_id = public.current_farm_id());

CREATE OR REPLACE FUNCTION public.fill_farm_id_diary_plans()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.farm_id IS NULL THEN
    -- Lấy farm_id từ diary_entry nếu có, ngược lại current_farm_id()
    IF NEW.diary_entry_id IS NOT NULL THEN
      SELECT farm_id INTO NEW.farm_id FROM public.diary_entries WHERE id = NEW.diary_entry_id;
    END IF;
    IF NEW.farm_id IS NULL THEN
      NEW.farm_id := public.current_farm_id();
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_fill_farm_id_diary_plans ON public.diary_plans;
CREATE TRIGGER tr_fill_farm_id_diary_plans
  BEFORE INSERT ON public.diary_plans
  FOR EACH ROW EXECUTE FUNCTION public.fill_farm_id_diary_plans();

-- Khi mark done → set completed_at
CREATE OR REPLACE FUNCTION public.diary_plan_status_audit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'done' AND (OLD.status IS DISTINCT FROM 'done') THEN
    NEW.completed_at := COALESCE(NEW.completed_at, NOW());
  END IF;
  IF NEW.status <> 'done' AND OLD.status = 'done' THEN
    NEW.completed_at := NULL;
    NEW.completed_by := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_diary_plan_status_audit ON public.diary_plans;
CREATE TRIGGER tr_diary_plan_status_audit
  BEFORE UPDATE OF status ON public.diary_plans
  FOR EACH ROW EXECUTE FUNCTION public.diary_plan_status_audit();

COMMENT ON TABLE public.diary_plans IS
  'Việc cần làm tới đây — gắn với nhật ký, đồng bộ sang module Kế hoạch';
