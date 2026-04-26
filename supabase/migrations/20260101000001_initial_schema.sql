-- =====================================================
-- GÀ CHỌI VIỆT NB - INITIAL SCHEMA
-- Part 1/4: 32 tables (core data model)
-- =====================================================

-- Enable extensions (nếu chưa enable qua Dashboard)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE user_role AS ENUM ('chu_trai', 'nhan_vien', 'khach');
CREATE TYPE breed_tier AS ENUM ('cao_cap', 'trung_cap', 'pho_thong', 'dac_biet');
CREATE TYPE area_type AS ENUM ('trong', 'mai', 'duc', 'ghep_doi', 'cach_ly', 'gia_pho_tong');
CREATE TYPE cage_status AS ENUM ('trong', 'dang_co_ga', 'bao_tri');
CREATE TYPE qr_tag_status AS ENUM ('chua_su_dung', 'dang_su_dung', 'hong_mat');
CREATE TYPE chicken_gender AS ENUM ('trong', 'mai', 'chua_xac_dinh');
CREATE TYPE chicken_source AS ENUM ('mua', 'no_tai_trai');
CREATE TYPE chicken_status AS ENUM ('dang_nuoi', 'dang_cach_ly', 'da_ban', 'chet', 'loai_thai');
CREATE TYPE media_type AS ENUM ('anh', 'video');
CREATE TYPE litter_status AS ENUM ('dang_ap', 'da_no', 'that_bai');
CREATE TYPE vaccination_status AS ENUM ('cho_tiem', 'da_tiem', 'bo_qua');
CREATE TYPE transaction_type AS ENUM ('nhap', 'xuat');
CREATE TYPE customer_tier AS ENUM ('vip', 'thuong');
CREATE TYPE order_status AS ENUM ('hoi_mua', 'dat_coc', 'da_giao', 'huy');
CREATE TYPE alert_priority AS ENUM ('thap', 'trung_binh', 'cao', 'khan_cap');
CREATE TYPE alert_status AS ENUM ('chua_doc', 'da_doc', 'da_xu_ly');

-- =====================================================
-- 1. PROFILES (extends auth.users)
-- =====================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'nhan_vien',
  is_active BOOLEAN DEFAULT TRUE,
  assigned_areas UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. BREEDS (giống gà)
-- =====================================================

CREATE TABLE breeds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name_vi TEXT NOT NULL,
  origin TEXT,
  description TEXT,
  characteristics JSONB,
  tier breed_tier NOT NULL DEFAULT 'pho_thong',
  default_avatar_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. AREAS → 4. CAGE_ROWS → 5. CAGES (3-level cage structure)
-- =====================================================

CREATE TABLE areas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name_vi TEXT NOT NULL,
  type area_type NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cage_rows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  area_id UUID NOT NULL REFERENCES areas(id) ON DELETE RESTRICT,
  code TEXT NOT NULL,
  name_vi TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(area_id, code)
);

CREATE TABLE cages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  row_id UUID NOT NULL REFERENCES cage_rows(id) ON DELETE RESTRICT,
  code TEXT NOT NULL,
  full_code TEXT NOT NULL,
  capacity INT DEFAULT 1,
  status cage_status DEFAULT 'trong',
  qr_door_code TEXT UNIQUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(row_id, code)
);

CREATE INDEX idx_cages_full_code ON cages(full_code);
CREATE INDEX idx_cages_status ON cages(status);

-- =====================================================
-- 6. QR_TAGS (physical QR tags 0001-9999)
-- =====================================================

CREATE TABLE qr_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tag_number TEXT UNIQUE NOT NULL,
  status qr_tag_status DEFAULT 'chua_su_dung',
  chicken_id UUID,
  assigned_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_qr_tags_status ON qr_tags(status);

-- =====================================================
-- 7. CHICKENS (main entity)
-- =====================================================

CREATE TABLE chickens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chicken_code TEXT UNIQUE NOT NULL,
  name TEXT,
  breed_id UUID NOT NULL REFERENCES breeds(id),
  qr_tag_id UUID UNIQUE REFERENCES qr_tags(id),
  cage_id UUID REFERENCES cages(id),
  gender chicken_gender DEFAULT 'chua_xac_dinh',
  birth_date DATE,
  source chicken_source NOT NULL,
  parent_male_id UUID REFERENCES chickens(id),
  parent_female_id UUID REFERENCES chickens(id),
  breeding_litter_id UUID,
  weight_kg DECIMAL(5,2),
  color TEXT,
  appearance JSONB,
  status chicken_status DEFAULT 'dang_nuoi',
  status_date DATE,
  status_reason TEXT,
  cost_purchase DECIMAL(15,2),
  is_for_sale BOOLEAN DEFAULT FALSE,
  listed_price DECIMAL(15,2),
  listed_at TIMESTAMPTZ,
  description TEXT,
  ai_description_updated_at TIMESTAMPTZ,
  main_photo_url TEXT,
  drive_folder_id TEXT,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chickens_code ON chickens(chicken_code);
CREATE INDEX idx_chickens_breed ON chickens(breed_id);
CREATE INDEX idx_chickens_status ON chickens(status);
CREATE INDEX idx_chickens_for_sale ON chickens(is_for_sale) WHERE is_for_sale = TRUE;
CREATE INDEX idx_chickens_birth_date ON chickens(birth_date);
CREATE INDEX idx_chickens_parents ON chickens(parent_male_id, parent_female_id);

ALTER TABLE qr_tags ADD CONSTRAINT fk_qr_tags_chicken
  FOREIGN KEY (chicken_id) REFERENCES chickens(id) ON DELETE SET NULL;

-- =====================================================
-- 8. CHICKEN_MEDIA (ảnh/video Drive)
-- =====================================================

CREATE TABLE chicken_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chicken_id UUID NOT NULL REFERENCES chickens(id) ON DELETE CASCADE,
  media_type media_type NOT NULL,
  drive_file_id TEXT NOT NULL,
  drive_url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT,
  taken_at DATE,
  is_main BOOLEAN DEFAULT FALSE,
  display_order INT DEFAULT 0,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chicken_media_chicken ON chicken_media(chicken_id);

-- =====================================================
-- 9. BREEDING_LITTERS
-- =====================================================

CREATE TABLE breeding_litters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  litter_code TEXT UNIQUE NOT NULL,
  female_id UUID NOT NULL REFERENCES chickens(id),
  male_ids UUID[] NOT NULL,
  paired_date DATE NOT NULL,
  expected_hatch_date DATE,
  eggs_total INT DEFAULT 0,
  eggs_fertile INT DEFAULT 0,
  hatched_count INT DEFAULT 0,
  hatched_date DATE,
  status litter_status DEFAULT 'dang_ap',
  cage_id UUID REFERENCES cages(id),
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE chickens ADD CONSTRAINT fk_chickens_litter
  FOREIGN KEY (breeding_litter_id) REFERENCES breeding_litters(id) ON DELETE SET NULL;

-- =====================================================
-- 10. CHICK_GROUPS (nhóm gà con 4 tuần đầu)
-- =====================================================

CREATE TABLE chick_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  litter_id UUID NOT NULL REFERENCES breeding_litters(id) ON DELETE CASCADE,
  cage_id UUID REFERENCES cages(id),
  hatched_count INT NOT NULL,
  alive_count INT NOT NULL,
  dead_count INT DEFAULT 0,
  sick_count INT DEFAULT 0,
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 11. VACCINES + 12. VACCINATIONS
-- =====================================================

CREATE TABLE vaccines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name_vi TEXT NOT NULL,
  default_age_days INT NOT NULL,
  description TEXT,
  is_required BOOLEAN DEFAULT FALSE,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE vaccinations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chicken_id UUID NOT NULL REFERENCES chickens(id) ON DELETE CASCADE,
  vaccine_id UUID NOT NULL REFERENCES vaccines(id),
  scheduled_date DATE NOT NULL,
  actual_date DATE,
  status vaccination_status DEFAULT 'cho_tiem',
  performed_by UUID REFERENCES profiles(id),
  batch_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(chicken_id, vaccine_id)
);

CREATE INDEX idx_vaccinations_scheduled ON vaccinations(scheduled_date) WHERE status = 'cho_tiem';
CREATE INDEX idx_vaccinations_chicken ON vaccinations(chicken_id);

-- =====================================================
-- 13. MEDICINES + 14. MEDICINE_TRANSACTIONS
-- =====================================================

CREATE TABLE medicines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name_vi TEXT NOT NULL,
  unit TEXT NOT NULL,
  current_stock DECIMAL(10,2) DEFAULT 0,
  min_stock_alert DECIMAL(10,2) DEFAULT 0,
  expiry_date DATE,
  cost_per_unit DECIMAL(15,2),
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE medicine_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  medicine_id UUID NOT NULL REFERENCES medicines(id),
  transaction_type transaction_type NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  related_chicken_id UUID REFERENCES chickens(id),
  cost DECIMAL(15,2),
  notes TEXT,
  performed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_medicine_trans_medicine ON medicine_transactions(medicine_id);
CREATE INDEX idx_medicine_trans_date ON medicine_transactions(transaction_date);

-- =====================================================
-- 15. FEEDS + 16. FEED_TRANSACTIONS
-- =====================================================

CREATE TABLE feeds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name_vi TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'kg',
  current_stock DECIMAL(10,2) DEFAULT 0,
  min_stock_alert DECIMAL(10,2) DEFAULT 0,
  cost_per_unit DECIMAL(15,2),
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE feed_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  feed_id UUID NOT NULL REFERENCES feeds(id),
  transaction_type transaction_type NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  related_area_id UUID REFERENCES areas(id),
  cost DECIMAL(15,2),
  notes TEXT,
  performed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 17. DISEASES
-- =====================================================

CREATE TABLE diseases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chicken_id UUID NOT NULL REFERENCES chickens(id) ON DELETE CASCADE,
  symptoms TEXT NOT NULL,
  diagnosis TEXT,
  treatment TEXT,
  outcome TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  performed_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_diseases_chicken ON diseases(chicken_id);

-- =====================================================
-- 18. TRAINING_SESSIONS (vần gà)
-- =====================================================

CREATE TABLE training_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chicken_id UUID NOT NULL REFERENCES chickens(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  session_number INT NOT NULL,
  opponent_chicken_id UUID REFERENCES chickens(id),
  opponent_name TEXT,
  duration_minutes INT,
  score_strength DECIMAL(3,1),
  score_appearance DECIMAL(3,1),
  score_aggression DECIMAL(3,1),
  score_total DECIMAL(3,1) GENERATED ALWAYS AS (
    (COALESCE(score_strength, 0) + COALESCE(score_appearance, 0) + COALESCE(score_aggression, 0)) / 3
  ) STORED,
  result TEXT,
  notes TEXT,
  performed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_training_chicken ON training_sessions(chicken_id);

-- =====================================================
-- 19. SUPPLIERS
-- =====================================================

CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  zalo TEXT,
  address TEXT,
  supplier_type TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 20. PURCHASES + 21. PURCHASE_ITEMS
-- =====================================================

CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_code TEXT UNIQUE NOT NULL,
  supplier_id UUID REFERENCES suppliers(id),
  purchase_date DATE NOT NULL,
  total_quantity INT NOT NULL,
  total_amount DECIMAL(15,2) NOT NULL,
  notes TEXT,
  performed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE purchase_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  chicken_id UUID NOT NULL REFERENCES chickens(id),
  unit_price DECIMAL(15,2) NOT NULL,
  notes TEXT
);

-- =====================================================
-- 22. CUSTOMERS + 23. CUSTOMER_ALERTS
-- =====================================================

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT,
  zalo TEXT,
  facebook TEXT,
  email TEXT,
  address TEXT,
  tier customer_tier DEFAULT 'thuong',
  source TEXT,
  preferences JSONB,
  total_purchased INT DEFAULT 0,
  total_spent DECIMAL(15,2) DEFAULT 0,
  last_purchase_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE customer_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  breed_filter UUID REFERENCES breeds(id),
  age_min_months INT,
  age_max_months INT,
  price_max DECIMAL(15,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 24. SALES_ORDERS + 25. SALES_ITEMS
-- =====================================================

CREATE TABLE sales_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_code TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id),
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status order_status DEFAULT 'hoi_mua',
  deposit_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL,
  payment_method TEXT,
  delivered_date DATE,
  notes TEXT,
  performed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sales_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sales_order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  chicken_id UUID NOT NULL REFERENCES chickens(id),
  unit_price DECIMAL(15,2) NOT NULL,
  notes TEXT
);

CREATE INDEX idx_sales_orders_status ON sales_orders(status);
CREATE INDEX idx_sales_items_chicken ON sales_items(chicken_id);

-- =====================================================
-- 26. EXPENSE_CATEGORIES + 27. EXPENSES
-- =====================================================

CREATE TABLE expense_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name_vi TEXT NOT NULL,
  description TEXT,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES expense_categories(id),
  amount DECIMAL(15,2) NOT NULL,
  expense_date DATE NOT NULL,
  description TEXT,
  related_area_id UUID REFERENCES areas(id),
  receipt_url TEXT,
  performed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_expenses_category ON expenses(category_id);

-- =====================================================
-- 28. STAFF_ATTENDANCE + 29. STAFF_ASSIGNMENTS
-- =====================================================

CREATE TABLE staff_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES profiles(id),
  attendance_date DATE NOT NULL,
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  total_hours DECIMAL(4,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, attendance_date)
);

CREATE TABLE staff_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES profiles(id),
  area_id UUID REFERENCES areas(id),
  assignment_date DATE NOT NULL,
  task_type TEXT NOT NULL,
  task_description TEXT,
  status TEXT DEFAULT 'cho_lam',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 30. ACTIVITY_LOGS
-- =====================================================

CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  before_data JSONB,
  after_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_logs_date ON activity_logs(created_at DESC);

-- =====================================================
-- 31. ALERTS
-- =====================================================

CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_type TEXT NOT NULL,
  priority alert_priority DEFAULT 'trung_binh',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_entity_type TEXT,
  related_entity_id UUID,
  target_users UUID[],
  status alert_status DEFAULT 'chua_doc',
  read_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_priority ON alerts(priority);

-- =====================================================
-- 32. SYSTEM_SETTINGS
-- =====================================================

CREATE TABLE system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);
