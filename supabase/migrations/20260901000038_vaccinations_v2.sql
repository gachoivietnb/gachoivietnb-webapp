-- ============================================================
-- VACCINATIONS V2 — Schema chuyên nghiệp cho tiêm phòng gà chọi VN
-- ============================================================

-- ============ ENUMS ============

DO $$ BEGIN
  CREATE TYPE vaccine_route AS ENUM (
    'mat',          -- nhỏ mắt
    'mui',          -- nhỏ mũi
    'da',           -- tiêm dưới da
    'bap',          -- tiêm bắp
    'xuyen_canh',   -- châm cánh xuyên màng (đậu gà)
    'nuoc_uong',    -- pha nước uống
    'phun_suong',   -- phun sương (cho lứa lớn)
    'tron_cam',     -- trộn cám (thuốc phòng)
    'khac'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE vaccine_type_enum AS ENUM (
    'song_nhuoc_doc',  -- vaccine sống nhược độc
    'vo_hoat',         -- vaccine vô hoạt (chết)
    'tai_to_hop',      -- tái tổ hợp / vector
    'sub_unit',        -- tiểu đơn vị
    'thuoc_phong'      -- thuốc phòng (không phải vaccine)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE vaccination_result AS ENUM (
    'thanh_cong',     -- thành công, không phản ứng
    'co_phan_ung',    -- có phản ứng nhẹ
    'phan_ung_nang',  -- phản ứng nặng
    'that_bai',       -- thất bại (không vào)
    'chua_xac_dinh'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE vaccination_batch_status AS ENUM (
    'chuan_bi','dang_tiem','hoan_tat','huy_bo'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE vaccination_status ADD VALUE IF NOT EXISTS 'bi_phan_ung';
EXCEPTION WHEN others THEN NULL; END $$;

-- ============ VACCINES — bổ sung columns + multi-tenant unique ============

-- Drop global UNIQUE on code (vaccines giờ per farm)
ALTER TABLE public.vaccines DROP CONSTRAINT IF EXISTS vaccines_code_key;
DO $$ BEGIN
  ALTER TABLE public.vaccines ADD CONSTRAINT vaccines_farm_code_key UNIQUE (farm_id, code);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; END $$;

ALTER TABLE public.vaccines
  ADD COLUMN IF NOT EXISTS target_disease TEXT,
  ADD COLUMN IF NOT EXISTS target_disease_code TEXT,
  ADD COLUMN IF NOT EXISTS vaccine_type vaccine_type_enum,
  ADD COLUMN IF NOT EXISTS route vaccine_route DEFAULT 'bap',
  ADD COLUMN IF NOT EXISTS dose TEXT,
  ADD COLUMN IF NOT EXISTS recommended_brands TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS minimum_age_days INT,
  ADD COLUMN IF NOT EXISTS maximum_age_days INT,
  ADD COLUMN IF NOT EXISTS repeat_interval_days INT,
  ADD COLUMN IF NOT EXISTS contraindications TEXT,
  ADD COLUMN IF NOT EXISTS side_effects TEXT,
  ADD COLUMN IF NOT EXISTS storage_temp TEXT,
  ADD COLUMN IF NOT EXISTS color_hex TEXT DEFAULT '#3b82f6',
  ADD COLUMN IF NOT EXISTS emoji TEXT DEFAULT '💉',
  ADD COLUMN IF NOT EXISTS protection_duration_days INT,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- ============ VACCINATIONS — bổ sung columns ============

-- Drop UNIQUE constraint cũ để cho phép tiêm nhắc
ALTER TABLE public.vaccinations
  DROP CONSTRAINT IF EXISTS vaccinations_chicken_id_vaccine_id_key;

ALTER TABLE public.vaccinations
  ADD COLUMN IF NOT EXISTS batch_id UUID,
  ADD COLUMN IF NOT EXISTS vaccine_lot_number TEXT,
  ADD COLUMN IF NOT EXISTS vaccine_expiry DATE,
  ADD COLUMN IF NOT EXISTS dose_actual TEXT,
  ADD COLUMN IF NOT EXISTS route_actual vaccine_route,
  ADD COLUMN IF NOT EXISTS side_effects TEXT,
  ADD COLUMN IF NOT EXISTS post_observations TEXT,
  ADD COLUMN IF NOT EXISTS result vaccination_result,
  ADD COLUMN IF NOT EXISTS next_due_date DATE,
  ADD COLUMN IF NOT EXISTS linked_medicine_id UUID REFERENCES public.medicines(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS weight_at_vaccination NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS cost BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS skip_reason TEXT,
  ADD COLUMN IF NOT EXISTS sequence_no INT DEFAULT 1;  -- thứ tự nhắc

CREATE INDEX IF NOT EXISTS idx_vaccinations_batch ON public.vaccinations(batch_id) WHERE batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vaccinations_next_due ON public.vaccinations(next_due_date) WHERE next_due_date IS NOT NULL;

-- ============ NEW TABLE: vaccination_batches ============

CREATE TABLE IF NOT EXISTS public.vaccination_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,

  batch_code TEXT,                       -- TIEM-YYYY-NNN
  batch_date DATE NOT NULL DEFAULT CURRENT_DATE,
  vaccine_id UUID NOT NULL REFERENCES public.vaccines(id),

  -- Vaccine info
  vaccine_lot_number TEXT,
  vaccine_expiry DATE,
  total_dose_used NUMERIC(10,2),         -- tổng vaccine dùng (ml)

  -- Performer
  performed_by UUID REFERENCES public.profiles(id),
  vet_name TEXT,                          -- bác sĩ thú y nếu có

  -- Cost
  total_cost BIGINT DEFAULT 0,

  -- Stats
  target_count INT DEFAULT 0,
  completed_count INT DEFAULT 0,
  reaction_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,

  -- Targeting filter (JSON ghi lại lựa chọn)
  target_filter JSONB DEFAULT '{}'::jsonb,

  status vaccination_batch_status NOT NULL DEFAULT 'chuan_bi',

  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vaccination_batches_farm ON public.vaccination_batches(farm_id, batch_date DESC);
CREATE INDEX IF NOT EXISTS idx_vaccination_batches_vaccine ON public.vaccination_batches(vaccine_id);

ALTER TABLE public.vaccinations
  ADD CONSTRAINT vaccinations_batch_fk FOREIGN KEY (batch_id)
    REFERENCES public.vaccination_batches(id) ON DELETE SET NULL;

DROP TRIGGER IF EXISTS tr_vaccination_batches_updated_at ON public.vaccination_batches;
CREATE TRIGGER tr_vaccination_batches_updated_at
  BEFORE UPDATE ON public.vaccination_batches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.vaccination_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vaccination_batches_tenant_all ON public.vaccination_batches;
CREATE POLICY vaccination_batches_tenant_all ON public.vaccination_batches
  FOR ALL TO authenticated
  USING (farm_id = public.current_farm_id())
  WITH CHECK (farm_id = public.current_farm_id());

-- Auto-fill farm_id + batch_code
CREATE OR REPLACE FUNCTION public.fill_batch_code()
RETURNS TRIGGER AS $$
DECLARE v_year TEXT; v_seq INT; v_farm UUID;
BEGIN
  IF NEW.farm_id IS NULL THEN NEW.farm_id := public.current_farm_id(); END IF;
  IF NEW.batch_code IS NOT NULL AND NEW.batch_code <> '' THEN RETURN NEW; END IF;
  v_farm := NEW.farm_id;
  v_year := TO_CHAR(COALESCE(NEW.batch_date, CURRENT_DATE), 'YYYY');
  SELECT COALESCE(MAX(NULLIF(regexp_replace(batch_code, '^TIEM-' || v_year || '-', ''), '')::int), 0) + 1
    INTO v_seq FROM public.vaccination_batches
   WHERE farm_id = v_farm AND batch_code LIKE 'TIEM-' || v_year || '-%';
  NEW.batch_code := 'TIEM-' || v_year || '-' || LPAD(v_seq::TEXT, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_fill_batch_code ON public.vaccination_batches;
CREATE TRIGGER tr_fill_batch_code
  BEFORE INSERT ON public.vaccination_batches
  FOR EACH ROW EXECUTE FUNCTION public.fill_batch_code();

-- ============ Re-seed 14 vaccines chuẩn cho gà chọi VN ============

-- Update existing vaccines với info chuyên môn
UPDATE public.vaccines SET
  target_disease = 'Bệnh Marek (ung thư lympho)',
  target_disease_code = 'marek',
  vaccine_type = 'tai_to_hop',
  route = 'da',
  dose = '0.2 ml/con',
  recommended_brands = ARRAY['Marexine (Merial)','Vaxxitek HVT+IBD','Cevac MD HVT'],
  minimum_age_days = 1,
  maximum_age_days = 1,
  repeat_interval_days = NULL,
  protection_duration_days = NULL,
  storage_temp = 'Nitơ lỏng (-196°C) hoặc 2-8°C',
  side_effects = 'Hầu như không',
  contraindications = 'Gà đã nhiễm Marek',
  color_hex = '#dc2626',
  emoji = '🧬',
  notes = 'Tiêm tại trại ấp ngay khi mới nở. Cực quan trọng — 1 lần duy nhất, không thể bù.'
WHERE code = 'MAREK';

UPDATE public.vaccines SET
  target_disease = 'Newcastle (gà rù) + Viêm phế quản truyền nhiễm IB',
  target_disease_code = 'newcastle_ib',
  vaccine_type = 'song_nhuoc_doc',
  route = 'mat',
  dose = '1 giọt/mắt',
  recommended_brands = ARRAY['Lasota+H120','Vinavax-2','ND-IB Cevac'],
  minimum_age_days = 5,
  maximum_age_days = 10,
  repeat_interval_days = NULL,
  storage_temp = '2-8°C',
  side_effects = 'Đôi khi hắt hơi nhẹ',
  color_hex = '#0ea5e9',
  emoji = '👁',
  notes = 'Nhỏ mắt — pha hoặc dùng dropper. Bỏ thuốc ra khỏi tủ lạnh 30p trước khi tiêm.',
  default_age_days = 7
WHERE code = 'NEW1';

UPDATE public.vaccines SET
  target_disease = 'Bệnh Gumboro (suy giảm miễn dịch)',
  target_disease_code = 'gumboro',
  vaccine_type = 'song_nhuoc_doc',
  route = 'nuoc_uong',
  dose = 'Pha 1000 liều / 5L nước (10-14 ngày)',
  recommended_brands = ARRAY['D78 (Boehringer)','Bursin-2','Cevac IBD L'],
  minimum_age_days = 10,
  maximum_age_days = 18,
  repeat_interval_days = NULL,
  storage_temp = '2-8°C',
  side_effects = 'Tiêu chảy nhẹ 1-2 ngày',
  contraindications = 'Có Clo trong nước uống',
  color_hex = '#f59e0b',
  emoji = '💧',
  notes = 'Nhịn nước 2h trước. Pha 1 lần dùng trong 2h. Dùng nước sạch không Clo.',
  default_age_days = 14
WHERE code = 'GUM1';

UPDATE public.vaccines SET
  target_disease = 'Newcastle (gà rù) — nhắc lần 2',
  target_disease_code = 'newcastle',
  vaccine_type = 'song_nhuoc_doc',
  route = 'mat',
  dose = '1 giọt/mắt',
  recommended_brands = ARRAY['Lasota','Cevac Vitabron L'],
  minimum_age_days = 18,
  maximum_age_days = 28,
  repeat_interval_days = NULL,
  color_hex = '#3b82f6',
  emoji = '🔄',
  notes = 'Lần 2 sau Lần 1 đúng 14 ngày. Tăng cường miễn dịch.',
  default_age_days = 21
WHERE code = 'NEW2';

UPDATE public.vaccines SET
  target_disease = 'Bệnh Gumboro — nhắc lần 2',
  target_disease_code = 'gumboro',
  vaccine_type = 'song_nhuoc_doc',
  route = 'nuoc_uong',
  dose = 'Pha 1000 liều / 5L nước',
  recommended_brands = ARRAY['D78','Bursin-2'],
  minimum_age_days = 25,
  maximum_age_days = 35,
  color_hex = '#fb923c',
  emoji = '🔄',
  notes = 'Lần 2 sau Lần 1 đúng 14 ngày.',
  default_age_days = 28
WHERE code = 'GUM2';

UPDATE public.vaccines SET
  target_disease = 'Cúm gia cầm A (H5N1, H5N6, H5N8)',
  target_disease_code = 'h5n1',
  vaccine_type = 'vo_hoat',
  route = 'bap',
  dose = '0.5 ml/con',
  recommended_brands = ARRAY['Navet H5N1 RE-6','Navet H5N1 RE-8','Cevac Flu-Kem'],
  minimum_age_days = 28,
  maximum_age_days = 45,
  repeat_interval_days = 180,
  protection_duration_days = 180,
  storage_temp = '2-8°C, không đông đá',
  side_effects = 'Sưng nhẹ chỗ tiêm 1-2 ngày, gà có thể mệt',
  contraindications = 'Gà ốm, suy nhược, đang nhiễm bệnh',
  color_hex = '#dc2626',
  emoji = '⚖️',
  notes = '⚖️ BẮT BUỘC theo TT 04/2024. Nhắc lại mỗi 6 tháng. Tiêm bắp đùi hoặc dưới da cổ.',
  default_age_days = 42
WHERE code = 'H5N1';

UPDATE public.vaccines SET
  target_disease = 'Bệnh đậu gà (Fowl Pox)',
  target_disease_code = 'dau_ga',
  vaccine_type = 'song_nhuoc_doc',
  route = 'xuyen_canh',
  dose = 'Châm 1 nhát xuyên màng cánh',
  recommended_brands = ARRAY['Pox-Fowl (Boehringer)','FOWL POX VN'],
  minimum_age_days = 21,
  maximum_age_days = 35,
  storage_temp = '2-8°C',
  side_effects = 'Vảy nhỏ chỗ châm sau 7-10 ngày (bình thường)',
  color_hex = '#a855f7',
  emoji = '🪡',
  notes = 'Châm 1 nhát xuyên màng cánh dùng kim 2 đầu. Kiểm tra sau 7 ngày: có vảy = thành công.',
  default_age_days = 28
WHERE code = 'DAU';

UPDATE public.vaccines SET
  target_disease = 'Newcastle + IB nhắc',
  target_disease_code = 'newcastle_ib',
  vaccine_type = 'song_nhuoc_doc',
  route = 'mat',
  dose = '1 giọt/mắt',
  minimum_age_days = 70,
  maximum_age_days = 100,
  repeat_interval_days = 180,
  color_hex = '#0891b2',
  emoji = '🛡',
  notes = 'Nhắc tăng cường ở tuần 12 trước khi đi đấu. Dùng cho gà chiến.',
  default_age_days = 84
WHERE code = 'NDIB';

-- ============ THÊM VACCINES MỚI ============

-- Insert mới cho mỗi farm hiện có (vaccines đã thành multi-tenant)
INSERT INTO public.vaccines (farm_id, code, name_vi, default_age_days, is_required, display_order, description,
  target_disease, target_disease_code, vaccine_type, route, dose, recommended_brands,
  minimum_age_days, maximum_age_days, repeat_interval_days, storage_temp, side_effects,
  color_hex, emoji, notes, is_active)
SELECT f.id,
  v.code, v.name_vi, v.default_age_days, v.is_required, v.display_order, v.description,
  v.target_disease, v.target_disease_code, v.vaccine_type::vaccine_type_enum, v.route::vaccine_route, v.dose, v.recommended_brands,
  v.minimum_age_days, v.maximum_age_days, v.repeat_interval_days, v.storage_temp, v.side_effects,
  v.color_hex, v.emoji, v.notes, v.is_active
FROM public.farms f
CROSS JOIN (VALUES
  ('ILT', 'ILT (Viêm thanh-khí quản)', 45, FALSE, 9,
    'Phòng ILT cho gà ở vùng có dịch',
    'Viêm thanh-khí quản truyền nhiễm', 'ilt', 'song_nhuoc_doc', 'mat', '1 giọt/mắt',
    ARRAY['ILT vaccine (Merial)','Cevac ILT'],
    42, 56, NULL, '2-8°C', 'Hắt hơi nhẹ 2-3 ngày',
    '#7c3aed', '🌬', 'Chỉ tiêm ở vùng có dịch ILT — không dùng nếu trại sạch.', TRUE),

  ('ND_HE1', 'ND hệ 1 (Mukteswar)', 90, FALSE, 10,
    'Newcastle hệ 1 cho gà chiến trước khi đấu',
    'Newcastle (chủng mạnh)', 'newcastle', 'vo_hoat', 'bap', '0.5 ml/con',
    ARRAY['ND Mukteswar VN','Navet ND hệ 1'],
    60, 120, 180, '2-8°C', 'Sưng chỗ tiêm 1-2 ngày',
    '#1d4ed8', '⚔️', 'Tiêm trước khi đi chiến để tăng miễn dịch mạnh nhất.', TRUE),

  ('CORYZA', 'Coryza (sổ mũi truyền nhiễm)', 100, FALSE, 11,
    'Phòng sổ mũi gà — quan trọng cho gà chiến',
    'Coryza (Avibacterium paragallinarum)', 'coryza', 'vo_hoat', 'bap', '0.5 ml/con',
    ARRAY['Coryza+Pasteurella','Vaccin Coryza VN'],
    90, 150, 180, '2-8°C', 'Sưng nhẹ chỗ tiêm',
    '#06b6d4', '🤧', 'Bệnh Coryza phổ biến vào mùa đông xuân. Gà chiến rất dễ mắc.', TRUE),

  ('TUHUYET', 'Tụ huyết trùng (Pasteurella)', 120, FALSE, 12,
    'Phòng tụ huyết trùng cho gà trên 4 tháng',
    'Tụ huyết trùng (Pasteurella multocida)', 'tu_huyet_trung', 'vo_hoat', 'bap', '1 ml/con',
    ARRAY['Pasteurella VN','Tụ huyết trùng NAVETCO'],
    90, NULL, 180, '2-8°C', 'Có thể sốt nhẹ 1 ngày',
    '#9f1239', '🩸', 'Phòng đặc biệt khi thay đổi thời tiết đột ngột.', TRUE),

  ('CRD_TYL', 'CRD/Mycoplasma (Tylosin)', 30, FALSE, 13,
    'Phòng CRD bằng kháng sinh trộn cám/nước',
    'Mycoplasma gallisepticum (CRD)', 'crd', 'thuoc_phong', 'tron_cam', '0.5g/L nước 5 ngày',
    ARRAY['Tylosin','Tilmicosin','Tylan 100'],
    30, NULL, 30, NULL, 'Không',
    '#65a30d', '💊', 'Không phải vaccine — là thuốc kháng sinh phòng. Dùng định kỳ mỗi tháng 5 ngày.', TRUE),

  ('CAU_TRUNG', 'Cầu trùng (Coccidiosis)', 14, FALSE, 14,
    'Phòng cầu trùng bằng thuốc trộn cám',
    'Cầu trùng (Eimeria spp.)', 'cau_trung', 'thuoc_phong', 'tron_cam', '1g/kg cám 5 ngày',
    ARRAY['Diclazuril','Toltrazuril','Sulfa quinoxaline'],
    14, NULL, 21, NULL, 'Không',
    '#16a34a', '🦠', 'Dùng từ tuần 2-12 tuổi. Định kỳ trộn 5 ngày, nghỉ 16 ngày, lặp lại.', TRUE)
) AS v(code, name_vi, default_age_days, is_required, display_order, description,
       target_disease, target_disease_code, vaccine_type, route, dose, recommended_brands,
       minimum_age_days, maximum_age_days, repeat_interval_days, storage_temp, side_effects,
       color_hex, emoji, notes, is_active)
WHERE NOT EXISTS (SELECT 1 FROM public.vaccines x WHERE x.farm_id = f.id AND x.code = v.code);

-- ============ VIEW: chicken_vaccination_summary ============

DROP VIEW IF EXISTS public.chicken_vaccination_summary CASCADE;
CREATE VIEW public.chicken_vaccination_summary AS
SELECT
  c.id AS chicken_id,
  c.farm_id,
  c.chicken_code,
  c.name,
  c.birth_date,
  COUNT(v.id) FILTER (WHERE v.status = 'da_tiem')::int AS done_count,
  COUNT(v.id) FILTER (WHERE v.status = 'cho_tiem' AND v.scheduled_date <= CURRENT_DATE)::int AS overdue_count,
  COUNT(v.id) FILTER (WHERE v.status = 'cho_tiem' AND v.scheduled_date > CURRENT_DATE)::int AS upcoming_count,
  COUNT(DISTINCT vc.target_disease_code) FILTER (WHERE v.status = 'da_tiem' AND vc.target_disease_code IS NOT NULL) AS diseases_protected_count,
  ARRAY_AGG(DISTINCT vc.target_disease) FILTER (WHERE v.status = 'da_tiem' AND vc.target_disease IS NOT NULL) AS diseases_protected,
  ARRAY_AGG(DISTINCT vc.target_disease_code) FILTER (WHERE v.status = 'da_tiem' AND vc.target_disease_code IS NOT NULL) AS disease_codes_protected,
  MAX(v.actual_date) AS last_vaccination_date,
  MIN(v.scheduled_date) FILTER (WHERE v.status = 'cho_tiem') AS next_due_date,
  -- % baseline coverage (5 vaccine cốt lõi: Marek, ND-IB, Gumboro, Đậu, Cúm H5N1)
  ROUND(
    (COUNT(DISTINCT vc.target_disease_code) FILTER (
      WHERE v.status = 'da_tiem'
        AND vc.target_disease_code IN ('marek','newcastle_ib','newcastle','gumboro','dau_ga','h5n1')
    )::numeric / 5 * 100), 0
  ) AS baseline_coverage_pct
FROM public.chickens c
LEFT JOIN public.vaccinations v ON v.chicken_id = c.id
LEFT JOIN public.vaccines vc ON vc.id = v.vaccine_id
GROUP BY c.id, c.farm_id, c.chicken_code, c.name, c.birth_date;

-- ============ farm_vaccination_kpis() ============

CREATE OR REPLACE FUNCTION public.farm_vaccination_kpis()
RETURNS JSONB AS $$
DECLARE v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_due',
      (SELECT COUNT(*) FROM public.vaccinations v
        JOIN public.chickens c ON c.id = v.chicken_id
        WHERE c.farm_id = public.current_farm_id()
          AND v.status = 'cho_tiem'),
    'overdue',
      (SELECT COUNT(*) FROM public.vaccinations v
        JOIN public.chickens c ON c.id = v.chicken_id
        WHERE c.farm_id = public.current_farm_id()
          AND v.status = 'cho_tiem'
          AND v.scheduled_date < CURRENT_DATE),
    'this_week',
      (SELECT COUNT(*) FROM public.vaccinations v
        JOIN public.chickens c ON c.id = v.chicken_id
        WHERE c.farm_id = public.current_farm_id()
          AND v.status = 'cho_tiem'
          AND v.scheduled_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'),
    'done_30d',
      (SELECT COUNT(*) FROM public.vaccinations v
        JOIN public.chickens c ON c.id = v.chicken_id
        WHERE c.farm_id = public.current_farm_id()
          AND v.status = 'da_tiem'
          AND v.actual_date >= CURRENT_DATE - INTERVAL '30 days'),
    'cost_30d',
      COALESCE((SELECT SUM(v.cost) FROM public.vaccinations v
        JOIN public.chickens c ON c.id = v.chicken_id
        WHERE c.farm_id = public.current_farm_id()
          AND v.actual_date >= CURRENT_DATE - INTERVAL '30 days'), 0),
    'baseline_complete_count',
      (SELECT COUNT(*) FROM public.chicken_vaccination_summary
        WHERE farm_id = public.current_farm_id()
          AND baseline_coverage_pct >= 80),
    'reactions_30d',
      (SELECT COUNT(*) FROM public.vaccinations v
        JOIN public.chickens c ON c.id = v.chicken_id
        WHERE c.farm_id = public.current_farm_id()
          AND v.actual_date >= CURRENT_DATE - INTERVAL '30 days'
          AND v.result IN ('co_phan_ung','phan_ung_nang')),
    'active_batches',
      (SELECT COUNT(*) FROM public.vaccination_batches
        WHERE farm_id = public.current_farm_id()
          AND status IN ('chuan_bi','dang_tiem'))
  ) INTO v_result;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.farm_vaccination_kpis() TO authenticated;

COMMENT ON TABLE public.vaccination_batches IS 'Đợt tiêm hàng loạt — 1 vaccine cho nhiều con cùng lúc';
COMMENT ON VIEW public.chicken_vaccination_summary IS 'Tổng hợp tiêm phòng mỗi gà + baseline coverage %';
