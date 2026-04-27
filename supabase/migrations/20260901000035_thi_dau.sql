-- ============================================================
-- THI ĐẤU & THÀNH TÍCH — Tournaments / Matches / Match Rounds
-- ============================================================
-- 3 bảng + 2 view + 7 enum + RLS + auto-tier
-- ============================================================

-- ============ ENUMS ============

DO $$ BEGIN
  CREATE TYPE tournament_type AS ENUM (
    'van_trai',     -- Vần trại nhà
    'hoi_xom',      -- Hội xóm/làng
    'giai_tinh',    -- Giải tỉnh
    'khu_vuc',      -- Khu vực
    'quoc_gia'      -- Quốc gia / quốc tế
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE tournament_status AS ENUM ('sap_dien_ra','dang_dien_ra','da_ket_thuc','huy_bo');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE match_rules AS ENUM ('don','cua');  -- đá đòn / đá cựa
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE match_spurs_type AS ENUM ('khong','sat','dao','tron');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE match_result AS ENUM (
    'thang','thua','hoa',
    'be_tran_minh','be_tran_doi',  -- mình bỏ / đối bỏ
    'chet','bi_thuong','huy'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE match_result_method AS ENUM (
    'ko_doi',         -- knock out đối
    'ko_minh',        -- bị knock out
    'quyet_dinh',     -- quyết định trọng tài
    'het_gio',        -- hết giờ
    'bo_chay_doi',    -- đối chạy
    'bo_chay_minh',   -- mình chạy
    'chet_tran',
    'khac'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE match_injury_level AS ENUM ('khong','nhe','nang','chi_mang');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE chicken_combat_tier AS ENUM (
    'ga_con',          -- chưa đủ tuổi
    'ga_to',           -- chưa từng đấu
    'ga_van_kho',      -- đã vần khô
    'ga_van_nuoc',     -- đã vần nước
    'ga_mo_mo',        -- đấu trận đầu
    'ga_an_ky_1',      -- thắng 1
    'ga_an_ky_2',      -- thắng 2-3
    'ga_an_ky_3',      -- thắng 4-5
    'chien_tuong',     -- thắng 6-9
    'huyen_thoai'      -- thắng ≥10 hoặc giải tỉnh+
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ 1. TOURNAMENTS ============

CREATE TABLE IF NOT EXISTS public.tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  type tournament_type NOT NULL DEFAULT 'hoi_xom',
  status tournament_status NOT NULL DEFAULT 'sap_dien_ra',

  venue TEXT,                     -- địa điểm cụ thể
  location TEXT,                  -- tỉnh/thành
  start_date DATE,
  end_date DATE,

  -- Hạng cân + luật
  weight_class_min NUMERIC(5,2),  -- kg
  weight_class_max NUMERIC(5,2),
  rules match_rules NOT NULL DEFAULT 'don',
  spurs_type match_spurs_type DEFAULT 'khong',

  -- Tài chính giải
  prize_pool BIGINT DEFAULT 0,
  entry_fee BIGINT DEFAULT 0,
  organizer TEXT,
  organizer_phone TEXT,

  banner_url TEXT,
  notes TEXT,

  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tournaments_farm_date ON public.tournaments(farm_id, start_date DESC);
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON public.tournaments(farm_id, status);

DROP TRIGGER IF EXISTS tr_tournaments_updated_at ON public.tournaments;
CREATE TRIGGER tr_tournaments_updated_at
  BEFORE UPDATE ON public.tournaments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ 2. MATCHES ============

CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,

  -- Gà của trại
  chicken_id UUID NOT NULL REFERENCES public.chickens(id) ON DELETE CASCADE,

  -- Giải đấu (nullable — có thể là trận tự do)
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE SET NULL,

  -- Mã trận
  match_code TEXT,                            -- "TR-2026-001"

  match_date DATE NOT NULL DEFAULT CURRENT_DATE,
  match_time TIME,

  -- Đối thủ (snapshot — không link table riêng)
  opponent_name TEXT NOT NULL,
  opponent_owner TEXT,
  opponent_owner_phone TEXT,
  opponent_breed TEXT,                        -- giống đối
  opponent_origin TEXT,                       -- xã/huyện/tỉnh
  opponent_weight_kg NUMERIC(5,2),
  opponent_age_months INT,
  opponent_color TEXT,
  opponent_photo_url TEXT,

  -- Cân nặng gà ta + thông tin
  self_weight_kg NUMERIC(5,2),

  -- Luật
  rules match_rules NOT NULL DEFAULT 'don',
  spurs_type match_spurs_type DEFAULT 'khong',
  weight_class TEXT,                          -- VD "Hạng 2.0-2.5kg"
  rounds_planned INT,                         -- 3/5/7 hoặc 0=hồ độc
  is_ho_doc BOOLEAN DEFAULT FALSE,

  -- Kết quả
  result match_result,
  result_method match_result_method,
  result_round INT,                           -- kết thúc ở hồ thứ mấy
  rounds_actual INT DEFAULT 0,
  total_duration_minutes INT,

  -- Sức khoẻ sau trận
  injury_self match_injury_level DEFAULT 'khong',
  injury_notes TEXT,
  recovery_days INT,

  -- Tài chính (KHÔNG hiển thị public)
  prize_money BIGINT DEFAULT 0,
  betting_amount BIGINT DEFAULT 0,
  betting_won BIGINT DEFAULT 0,                -- số tiền cược thắng/thua thực tế

  -- Media
  photo_urls TEXT[] DEFAULT '{}',
  video_url TEXT,

  -- Trọng tài
  referee_name TEXT,
  witnesses TEXT[],

  -- Đánh giá
  match_quality SMALLINT CHECK (match_quality IS NULL OR (match_quality >= 1 AND match_quality <= 5)),
  highlight_moments TEXT[],

  -- Note
  internal_notes TEXT,                         -- private cho trại
  public_notes TEXT,                           -- show trên public web

  -- Hiển thị
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,

  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT matches_code_per_farm UNIQUE NULLS NOT DISTINCT (farm_id, match_code)
);

CREATE INDEX IF NOT EXISTS idx_matches_farm_date ON public.matches(farm_id, match_date DESC);
CREATE INDEX IF NOT EXISTS idx_matches_chicken ON public.matches(chicken_id, match_date DESC);
CREATE INDEX IF NOT EXISTS idx_matches_tournament ON public.matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_matches_result ON public.matches(farm_id, result);
CREATE INDEX IF NOT EXISTS idx_matches_public ON public.matches(chicken_id, is_public)
  WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_matches_opponent_trgm ON public.matches
  USING gin(opponent_name gin_trgm_ops);

DROP TRIGGER IF EXISTS tr_matches_updated_at ON public.matches;
CREATE TRIGGER tr_matches_updated_at
  BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-fill match_code: TR-YYYY-NNNN
CREATE OR REPLACE FUNCTION public.fill_match_code()
RETURNS TRIGGER AS $$
DECLARE v_year TEXT; v_seq INT; v_farm UUID;
BEGIN
  IF NEW.match_code IS NOT NULL AND NEW.match_code <> '' THEN
    RETURN NEW;
  END IF;
  v_farm := COALESCE(NEW.farm_id, public.current_farm_id());
  v_year := TO_CHAR(COALESCE(NEW.match_date, CURRENT_DATE), 'YYYY');
  SELECT COALESCE(MAX(
    NULLIF(regexp_replace(match_code, '^TR-' || v_year || '-', ''), '')::int
  ), 0) + 1
    INTO v_seq
    FROM public.matches
   WHERE farm_id = v_farm
     AND match_code LIKE 'TR-' || v_year || '-%';
  NEW.match_code := 'TR-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_fill_match_code ON public.matches;
CREATE TRIGGER tr_fill_match_code
  BEFORE INSERT ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.fill_match_code();

-- ============ 3. MATCH_ROUNDS (chi tiết từng hồ) ============

CREATE TABLE IF NOT EXISTS public.match_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,

  round_number INT NOT NULL CHECK (round_number > 0),
  duration_seconds INT,

  -- Stats
  self_strikes INT DEFAULT 0,         -- số cú đá hiệu quả
  opp_strikes INT DEFAULT 0,
  self_knockdowns INT DEFAULT 0,      -- số lần ngã
  opp_knockdowns INT DEFAULT 0,
  self_blood_level SMALLINT DEFAULT 0 CHECK (self_blood_level BETWEEN 0 AND 3),
  opp_blood_level SMALLINT DEFAULT 0 CHECK (opp_blood_level BETWEEN 0 AND 3),

  -- Highlight
  notable_strikes TEXT[],

  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT match_rounds_unique UNIQUE (match_id, round_number)
);

CREATE INDEX IF NOT EXISTS idx_match_rounds_match ON public.match_rounds(match_id, round_number);

-- ============ Add combat_tier_manual column to chickens (BEFORE view) ============

ALTER TABLE public.chickens
  ADD COLUMN IF NOT EXISTS combat_tier_manual chicken_combat_tier;

-- ============ VIEWS ============

-- Combat stats per chicken
DROP VIEW IF EXISTS public.farm_top_chickens CASCADE;
DROP VIEW IF EXISTS public.chicken_combat_stats CASCADE;

CREATE VIEW public.chicken_combat_stats AS
WITH stats AS (
  SELECT
    m.chicken_id,
    m.farm_id,
    COUNT(*) AS total_matches,
    COUNT(*) FILTER (WHERE m.result = 'thang') AS wins,
    COUNT(*) FILTER (WHERE m.result = 'thua') AS losses,
    COUNT(*) FILTER (WHERE m.result = 'hoa') AS draws,
    COUNT(*) FILTER (WHERE m.result IN ('be_tran_minh','be_tran_doi')) AS forfeits,
    COUNT(*) FILTER (WHERE m.result = 'chet') AS deaths,
    COUNT(*) FILTER (WHERE m.result = 'bi_thuong') AS injuries,
    MAX(m.match_date) AS last_match_date,
    SUM(COALESCE(m.prize_money, 0)) AS prize_total,
    AVG(m.rounds_actual) FILTER (WHERE m.rounds_actual > 0) AS avg_rounds,
    AVG(m.total_duration_minutes) FILTER (WHERE m.total_duration_minutes > 0) AS avg_duration,
    MAX(CASE t.type
      WHEN 'quoc_gia' THEN 5
      WHEN 'khu_vuc' THEN 4
      WHEN 'giai_tinh' THEN 3
      WHEN 'hoi_xom' THEN 2
      WHEN 'van_trai' THEN 1
      ELSE 0 END) AS best_tournament_rank
  FROM public.matches m
  LEFT JOIN public.tournaments t ON t.id = m.tournament_id
  WHERE m.result IS NOT NULL
  GROUP BY m.chicken_id, m.farm_id
),
ranked AS (
  SELECT
    m.chicken_id,
    m.result,
    ROW_NUMBER() OVER (
      PARTITION BY m.chicken_id
      ORDER BY m.match_date DESC, m.created_at DESC
    ) AS rn
  FROM public.matches m
  WHERE m.result IS NOT NULL
),
first_non_win AS (
  SELECT chicken_id, MIN(rn) AS first_non_win_rn
  FROM ranked
  WHERE result <> 'thang'
  GROUP BY chicken_id
),
streaks AS (
  SELECT r.chicken_id, COUNT(*) AS current_win_streak
  FROM ranked r
  LEFT JOIN first_non_win f ON f.chicken_id = r.chicken_id
  WHERE r.result = 'thang'
    AND (f.first_non_win_rn IS NULL OR r.rn < f.first_non_win_rn)
  GROUP BY r.chicken_id
)
SELECT
  c.id AS chicken_id,
  c.farm_id,
  c.chicken_code,
  c.name,
  c.birth_date,
  c.combat_tier_manual,
  COALESCE(s.total_matches, 0) AS total_matches,
  COALESCE(s.wins, 0) AS wins,
  COALESCE(s.losses, 0) AS losses,
  COALESCE(s.draws, 0) AS draws,
  COALESCE(s.forfeits, 0) AS forfeits,
  COALESCE(s.deaths, 0) AS deaths,
  COALESCE(s.injuries, 0) AS injuries,
  COALESCE(s.wins, 0) AS stars,
  CASE
    WHEN COALESCE(s.total_matches, 0) = 0 THEN NULL
    ELSE ROUND((COALESCE(s.wins, 0)::NUMERIC / s.total_matches) * 100, 1)
  END AS win_rate_pct,
  s.last_match_date,
  COALESCE(s.prize_total, 0) AS prize_total,
  s.avg_rounds,
  s.avg_duration,
  s.best_tournament_rank,
  COALESCE(strk.current_win_streak, 0) AS current_win_streak,
  CASE
    WHEN c.combat_tier_manual IS NOT NULL THEN c.combat_tier_manual
    WHEN COALESCE(s.wins, 0) >= 10 OR COALESCE(s.best_tournament_rank, 0) >= 3 THEN 'huyen_thoai'::chicken_combat_tier
    WHEN COALESCE(s.wins, 0) >= 6 THEN 'chien_tuong'::chicken_combat_tier
    WHEN COALESCE(s.wins, 0) >= 4 THEN 'ga_an_ky_3'::chicken_combat_tier
    WHEN COALESCE(s.wins, 0) >= 2 THEN 'ga_an_ky_2'::chicken_combat_tier
    WHEN COALESCE(s.wins, 0) >= 1 THEN 'ga_an_ky_1'::chicken_combat_tier
    WHEN COALESCE(s.total_matches, 0) >= 1 THEN 'ga_mo_mo'::chicken_combat_tier
    WHEN c.birth_date IS NULL THEN 'ga_to'::chicken_combat_tier
    WHEN c.birth_date > CURRENT_DATE - INTERVAL '6 months' THEN 'ga_con'::chicken_combat_tier
    ELSE 'ga_to'::chicken_combat_tier
  END AS combat_tier
FROM public.chickens c
LEFT JOIN stats s ON s.chicken_id = c.id
LEFT JOIN streaks strk ON strk.chicken_id = c.id;

-- Top chickens leaderboard view
DROP VIEW IF EXISTS public.farm_top_chickens CASCADE;
CREATE VIEW public.farm_top_chickens AS
SELECT
  cs.*,
  RANK() OVER (PARTITION BY cs.farm_id ORDER BY cs.stars DESC, cs.win_rate_pct DESC NULLS LAST) AS rank_overall,
  RANK() OVER (PARTITION BY cs.farm_id, cs.combat_tier ORDER BY cs.stars DESC, cs.win_rate_pct DESC NULLS LAST) AS rank_in_tier
FROM public.chicken_combat_stats cs
WHERE cs.total_matches > 0;

-- ============ RLS ============

ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_rounds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tournaments_tenant_all ON public.tournaments;
CREATE POLICY tournaments_tenant_all ON public.tournaments
  FOR ALL TO authenticated
  USING (farm_id = public.current_farm_id())
  WITH CHECK (farm_id = public.current_farm_id());

DROP POLICY IF EXISTS matches_tenant_all ON public.matches;
CREATE POLICY matches_tenant_all ON public.matches
  FOR ALL TO authenticated
  USING (farm_id = public.current_farm_id())
  WITH CHECK (farm_id = public.current_farm_id());

DROP POLICY IF EXISTS match_rounds_tenant_all ON public.match_rounds;
CREATE POLICY match_rounds_tenant_all ON public.match_rounds
  FOR ALL TO authenticated
  USING (farm_id = public.current_farm_id())
  WITH CHECK (farm_id = public.current_farm_id());

-- Public read for matches with is_public=true (anonymous users on public site)
DROP POLICY IF EXISTS matches_public_read ON public.matches;
CREATE POLICY matches_public_read ON public.matches
  FOR SELECT TO anon
  USING (is_public = TRUE);

-- ============ Auto-fill farm_id ============

CREATE OR REPLACE FUNCTION public.fill_farm_id_tournaments()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.farm_id IS NULL THEN NEW.farm_id := public.current_farm_id(); END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS tr_fill_farm_id_tournaments ON public.tournaments;
CREATE TRIGGER tr_fill_farm_id_tournaments
  BEFORE INSERT ON public.tournaments
  FOR EACH ROW EXECUTE FUNCTION public.fill_farm_id_tournaments();

CREATE OR REPLACE FUNCTION public.fill_farm_id_matches()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.farm_id IS NULL THEN
    SELECT farm_id INTO NEW.farm_id FROM public.chickens WHERE id = NEW.chicken_id;
  END IF;
  IF NEW.farm_id IS NULL THEN NEW.farm_id := public.current_farm_id(); END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS tr_fill_farm_id_matches ON public.matches;
CREATE TRIGGER tr_fill_farm_id_matches
  BEFORE INSERT ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.fill_farm_id_matches();

CREATE OR REPLACE FUNCTION public.fill_farm_id_match_rounds()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.farm_id IS NULL THEN
    SELECT farm_id INTO NEW.farm_id FROM public.matches WHERE id = NEW.match_id;
  END IF;
  IF NEW.farm_id IS NULL THEN NEW.farm_id := public.current_farm_id(); END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS tr_fill_farm_id_match_rounds ON public.match_rounds;
CREATE TRIGGER tr_fill_farm_id_match_rounds
  BEFORE INSERT ON public.match_rounds
  FOR EACH ROW EXECUTE FUNCTION public.fill_farm_id_match_rounds();

-- ============ Helpers cho aggregator/dashboard ============

CREATE OR REPLACE FUNCTION public.farm_combat_kpis()
RETURNS JSONB AS $$
DECLARE v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'matches_total',
      (SELECT COUNT(*) FROM public.matches WHERE farm_id = public.current_farm_id()),
    'wins',
      (SELECT COUNT(*) FROM public.matches WHERE farm_id = public.current_farm_id() AND result = 'thang'),
    'losses',
      (SELECT COUNT(*) FROM public.matches WHERE farm_id = public.current_farm_id() AND result = 'thua'),
    'draws',
      (SELECT COUNT(*) FROM public.matches WHERE farm_id = public.current_farm_id() AND result = 'hoa'),
    'prize_ytd',
      (SELECT COALESCE(SUM(prize_money), 0) FROM public.matches
        WHERE farm_id = public.current_farm_id()
          AND match_date >= date_trunc('year', CURRENT_DATE)),
    'on_fire_chickens',
      COALESCE((SELECT jsonb_agg(jsonb_build_object('chicken_id', chicken_id, 'name', name, 'streak', current_win_streak, 'stars', stars))
        FROM public.chicken_combat_stats
        WHERE farm_id = public.current_farm_id()
          AND current_win_streak >= 3
        ORDER BY current_win_streak DESC LIMIT 5), '[]'::jsonb)
  ) INTO v_result;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.farm_combat_kpis() TO authenticated;

COMMENT ON TABLE public.tournaments IS 'Giải đấu — 5 cấp từ vần trại đến quốc gia';
COMMENT ON TABLE public.matches IS 'Trận đấu của gà — cốt lõi module Thi đấu';
COMMENT ON TABLE public.match_rounds IS 'Chi tiết từng hồ trong trận';
COMMENT ON VIEW public.chicken_combat_stats IS 'Stats thi đấu mỗi gà — auto-derive combat_tier (10 cấp)';
COMMENT ON VIEW public.farm_top_chickens IS 'BXH gà của trại theo sao + win rate';
