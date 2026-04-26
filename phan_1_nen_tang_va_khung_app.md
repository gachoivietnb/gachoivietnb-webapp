# PROMPT CHO CLAUDE CODE — PHẦN 1: NỀN TẢNG & KHUNG APP
## Dự án: Gà Chọi Việt Ninh Bình (gachoivietnb.com)

---

## 🎯 NHIỆM VỤ CỦA BẠN (Claude Code)

Bạn sẽ build **toàn bộ nền tảng** cho web app quản lý trang trại gà chọi + website bán hàng public, gồm:

1. Khởi tạo project Next.js 14 với cấu trúc thư mục đầy đủ
2. Tạo toàn bộ Supabase database schema cho 16 module (chỉ schema, chưa cần UI)
3. Setup Auth + Phân quyền 3 role
4. Tạo 2 Layout chính: Admin (private) + Public (website bán hàng)
5. Setup kết nối Google Drive API + Gemini API
6. Tạo skeleton pages cho tất cả module (chỉ "Coming soon" — UI thực sẽ làm Phần 2-8)

**Sau khi hoàn thành Phần 1, dự án phải:**
- Deploy được lên Vercel
- Login được bằng tài khoản admin
- Vào được tất cả trang admin (dù chưa có nội dung)
- Trang public hiển thị được skeleton trang chủ
- Database có sẵn 9.999 thẻ QR, vaccine danh mục, giống gà danh mục

---

## 📋 STACK & QUY TẮC TUYỆT ĐỐI

### Stack
- **Next.js 14** (App Router, TypeScript)
- **Supabase** (Postgres + Auth + Storage)
- **Tailwind CSS** + **shadcn/ui**
- **Google Drive API** (lưu ảnh/video gà)
- **Gemini API** (AI marketing — Phần 7 mới dùng)
- **Vercel** (deploy)

### Quy tắc tuyệt đối — không vi phạm
1. **Tiếng Anh cho code, tiếng Việt cho UI label**
2. **Mobile-first** — design cho điện thoại trước
3. **Snake_case cho tên bảng/cột** trong Postgres
4. **camelCase cho biến/hàm** trong TypeScript
5. **TypeScript strict mode** — không dùng `any`
6. **Server Components mặc định** — chỉ dùng `'use client'` khi cần
7. **Mọi truy vấn DB qua Supabase client** — không tự viết SQL trong code (trừ migrations)
8. **Tên domain:** `gachoivietnb.com`
9. **URL pattern:**
   - `/` `/ban` `/giong` `/ga/[tag_number]` `/lien-he` → public
   - `/admin/*` → private
   - `/auth/login` → đăng nhập

---

## 🗂️ BƯỚC 1: KHỞI TẠO PROJECT

### Cấu trúc thư mục cuối cùng cần đạt được:

```
ga-choi-viet-nb/
├── src/
│   ├── app/
│   │   ├── (public)/                # Route group cho public site
│   │   │   ├── page.tsx              # Trang chủ /
│   │   │   ├── ban/
│   │   │   │   └── page.tsx          # /ban - danh sách gà bán
│   │   │   ├── giong/
│   │   │   │   └── page.tsx          # /giong - thư viện giống
│   │   │   ├── ga/
│   │   │   │   └── [tagNumber]/
│   │   │   │       └── page.tsx      # /ga/0347 - bio QR
│   │   │   ├── lien-he/
│   │   │   │   └── page.tsx          # /lien-he
│   │   │   └── layout.tsx
│   │   ├── (admin)/                  # Route group cho admin
│   │   │   ├── admin/
│   │   │   │   ├── page.tsx          # Dashboard /admin
│   │   │   │   ├── ho-so-ga/page.tsx
│   │   │   │   ├── chuong-trai/page.tsx
│   │   │   │   ├── gia-pha/page.tsx
│   │   │   │   ├── sinh-san/page.tsx
│   │   │   │   ├── tiem-phong/page.tsx
│   │   │   │   ├── kho-thuoc/page.tsx
│   │   │   │   ├── kho-thuc-an/page.tsx
│   │   │   │   ├── van-ga/page.tsx
│   │   │   │   ├── mua-vao/page.tsx
│   │   │   │   ├── ban-ra/page.tsx
│   │   │   │   ├── khach-hang/page.tsx
│   │   │   │   ├── tai-chinh/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── chi-phi/page.tsx
│   │   │   │   │   ├── bao-cao/page.tsx
│   │   │   │   │   └── nhap-xuat-ton/page.tsx
│   │   │   │   ├── nhan-su/page.tsx
│   │   │   │   ├── ai-marketing/page.tsx
│   │   │   │   ├── giong/page.tsx
│   │   │   │   ├── nhat-ky/page.tsx
│   │   │   │   ├── cai-dat/page.tsx
│   │   │   │   ├── huong-dan/page.tsx
│   │   │   │   └── generate-qr/page.tsx
│   │   │   └── layout.tsx
│   │   ├── auth/
│   │   │   ├── login/page.tsx
│   │   │   ├── callback/route.ts
│   │   │   └── logout/route.ts
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   ├── gemini/
│   │   │   └── google-drive/
│   │   ├── layout.tsx                # Root layout
│   │   ├── globals.css
│   │   └── not-found.tsx
│   ├── components/
│   │   ├── ui/                       # shadcn/ui components
│   │   ├── layout/
│   │   │   ├── AdminSidebar.tsx
│   │   │   ├── AdminBottomNav.tsx
│   │   │   ├── AdminHeader.tsx
│   │   │   ├── PublicHeader.tsx
│   │   │   └── PublicFooter.tsx
│   │   ├── admin/                    # admin-specific (sẽ thêm Phần 2+)
│   │   └── public/                   # public-specific (sẽ thêm Phần 6)
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts             # Browser client
│   │   │   ├── server.ts             # Server client
│   │   │   └── middleware.ts         # Middleware client
│   │   ├── google-drive/
│   │   │   └── client.ts
│   │   ├── gemini/
│   │   │   └── client.ts
│   │   └── utils/
│   │       ├── cn.ts                 # className merger
│   │       ├── format.ts             # date/currency format
│   │       └── constants.ts
│   ├── types/
│   │   ├── database.ts               # auto-generated từ Supabase
│   │   └── index.ts
│   ├── hooks/
│   │   └── useUser.ts
│   └── middleware.ts                 # Next.js middleware (auth guard)
├── supabase/
│   └── migrations/
│       ├── 20260101000001_initial_schema.sql
│       ├── 20260101000002_functions_triggers.sql
│       ├── 20260101000003_rls_policies.sql
│       └── 20260101000004_seed_data.sql
├── public/
│   ├── manifest.json
│   ├── favicon.ico
│   └── images/
│       └── logo.png
├── .env.local.example
├── .env.local                        # Không commit
├── .gitignore
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

### Lệnh khởi tạo:

```bash
npx create-next-app@latest ga-choi-viet-nb \
  --typescript --tailwind --app --src-dir \
  --import-alias "@/*" --no-eslint

cd ga-choi-viet-nb

# Cài packages
npm install @supabase/supabase-js @supabase/ssr
npm install @google/generative-ai
npm install googleapis
npm install date-fns
npm install zod
npm install lucide-react
npm install class-variance-authority clsx tailwind-merge
npm install qrcode jspdf

# shadcn/ui setup
npx shadcn@latest init -d
npx shadcn@latest add button card input label form dialog \
  dropdown-menu select sheet table tabs toast badge separator
```

---

## 🗄️ BƯỚC 2: TẠO SUPABASE SCHEMA

Tạo file `supabase/migrations/20260101000001_initial_schema.sql` với toàn bộ nội dung dưới đây. Đây là **schema HOÀN CHỈNH** cho 16 module — không được sửa tên bảng/cột sau này.

### File 1: `20260101000001_initial_schema.sql`

```sql
-- =====================================================
-- GÀ CHỌI VIỆT NB - INITIAL SCHEMA
-- 16 modules: profiles, breeds, areas, rows, cages, qr_tags,
-- chickens, chicken_media, breeding_litters, chick_groups,
-- vaccines, vaccinations, medicines, medicine_transactions,
-- feeds, feed_transactions, diseases, training_sessions,
-- suppliers, purchases, purchase_items, customers,
-- customer_alerts, sales_orders, sales_items,
-- expense_categories, expenses, staff_attendance,
-- staff_assignments, activity_logs, alerts, system_settings
-- =====================================================

-- Enable extensions
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
  assigned_areas UUID[] DEFAULT '{}',  -- nhân viên được phân khu nào
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. BREEDS (giống gà)
-- =====================================================

CREATE TABLE breeds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,           -- 'ASIL', 'MLAI', 'NOI'
  name_vi TEXT NOT NULL,                -- 'Asil', 'Mã Lai', 'Nòi'
  origin TEXT,                          -- 'Ấn Độ', 'Malaysia'
  description TEXT,
  characteristics JSONB,                -- {body_size, temperament, ...}
  tier breed_tier NOT NULL DEFAULT 'pho_thong',
  default_avatar_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. AREAS (khu vực) → 4. ROWS (dãy) → 5. CAGES (chuồng)
-- =====================================================

CREATE TABLE areas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,            -- 'A', 'B', 'E'
  name_vi TEXT NOT NULL,                -- 'Khu A - Trống'
  type area_type NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cage_rows (                -- 'rows' là từ dự trữ trong SQL
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  area_id UUID NOT NULL REFERENCES areas(id) ON DELETE RESTRICT,
  code TEXT NOT NULL,                   -- '01', '02'
  name_vi TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(area_id, code)
);

CREATE TABLE cages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  row_id UUID NOT NULL REFERENCES cage_rows(id) ON DELETE RESTRICT,
  code TEXT NOT NULL,                   -- '012'
  full_code TEXT NOT NULL,              -- 'A-01-012' - tự động tính qua trigger
  capacity INT DEFAULT 1,
  status cage_status DEFAULT 'trong',
  qr_door_code TEXT UNIQUE,             -- mã QR cửa chuồng
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(row_id, code)
);

CREATE INDEX idx_cages_full_code ON cages(full_code);
CREATE INDEX idx_cages_status ON cages(status);

-- =====================================================
-- 6. QR_TAGS (thẻ QR vật lý 0001-9999)
-- =====================================================

CREATE TABLE qr_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tag_number TEXT UNIQUE NOT NULL,      -- '0001' đến '9999'
  status qr_tag_status DEFAULT 'chua_su_dung',
  chicken_id UUID,                      -- FK sẽ thêm sau khi tạo bảng chickens
  assigned_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_qr_tags_status ON qr_tags(status);

-- =====================================================
-- 7. CHICKENS (gà - bảng chính)
-- =====================================================

CREATE TABLE chickens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chicken_code TEXT UNIQUE NOT NULL,    -- 'GA-ASIL-25-0347' - tự sinh qua trigger
  name TEXT,                            -- tên riêng (tùy chọn)
  breed_id UUID NOT NULL REFERENCES breeds(id),
  qr_tag_id UUID UNIQUE REFERENCES qr_tags(id),
  cage_id UUID REFERENCES cages(id),
  gender chicken_gender DEFAULT 'chua_xac_dinh',
  birth_date DATE,
  source chicken_source NOT NULL,
  parent_male_id UUID REFERENCES chickens(id),
  parent_female_id UUID REFERENCES chickens(id),
  breeding_litter_id UUID,              -- FK thêm sau
  weight_kg DECIMAL(5,2),
  color TEXT,                           -- màu lông
  appearance JSONB,                     -- {comb_type, leg_color, ...}
  status chicken_status DEFAULT 'dang_nuoi',
  status_date DATE,
  status_reason TEXT,
  cost_purchase DECIMAL(15,2),          -- giá mua (nếu source = mua)
  is_for_sale BOOLEAN DEFAULT FALSE,
  listed_price DECIMAL(15,2),
  listed_at TIMESTAMPTZ,
  description TEXT,                     -- mô tả - có thể AI generated
  ai_description_updated_at TIMESTAMPTZ,
  main_photo_url TEXT,                  -- link Drive
  drive_folder_id TEXT,                 -- Google Drive folder ID
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

-- Thêm FK còn thiếu
ALTER TABLE qr_tags ADD CONSTRAINT fk_qr_tags_chicken
  FOREIGN KEY (chicken_id) REFERENCES chickens(id) ON DELETE SET NULL;

-- =====================================================
-- 8. CHICKEN_MEDIA (ảnh/video từng con gà - link Drive)
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
-- 9. BREEDING_LITTERS (lứa ghép đôi)
-- =====================================================

CREATE TABLE breeding_litters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  litter_code TEXT UNIQUE NOT NULL,     -- 'L-2025-001'
  female_id UUID NOT NULL REFERENCES chickens(id),
  male_ids UUID[] NOT NULL,             -- mảng id đực (có thể nhiều)
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
  default_age_days INT NOT NULL,        -- ngày tuổi nên tiêm
  description TEXT,
  is_required BOOLEAN DEFAULT FALSE,    -- bắt buộc theo luật
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
  unit TEXT NOT NULL,                   -- 'liều', 'ml', 'viên'
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
-- 17. DISEASES (theo dõi bệnh)
-- =====================================================

CREATE TABLE diseases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chicken_id UUID NOT NULL REFERENCES chickens(id) ON DELETE CASCADE,
  symptoms TEXT NOT NULL,
  diagnosis TEXT,
  treatment TEXT,
  outcome TEXT,                         -- 'khoi', 'chet', 'dang_dieu_tri'
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
  opponent_name TEXT,                   -- nếu đối thủ ngoài
  duration_minutes INT,
  score_strength DECIMAL(3,1),          -- thể lực 0-10
  score_appearance DECIMAL(3,1),        -- vóc dáng 0-10
  score_aggression DECIMAL(3,1),        -- tính hung hãn 0-10
  score_total DECIMAL(3,1) GENERATED ALWAYS AS (
    (COALESCE(score_strength, 0) + COALESCE(score_appearance, 0) + COALESCE(score_aggression, 0)) / 3
  ) STORED,
  result TEXT,                          -- 'thang', 'thua', 'hoa'
  notes TEXT,
  performed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_training_chicken ON training_sessions(chicken_id);

-- =====================================================
-- 19. SUPPLIERS (nhà cung cấp)
-- =====================================================

CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  zalo TEXT,
  address TEXT,
  supplier_type TEXT,                   -- 'ga_giong', 'thuc_an', 'thuoc'
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 20. PURCHASES + 21. PURCHASE_ITEMS (nhập gà)
-- =====================================================

CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_code TEXT UNIQUE NOT NULL,   -- 'NH-2025-001'
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
-- 22. CUSTOMERS + 23. CUSTOMER_ALERTS (CRM)
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
  source TEXT,                          -- 'website', 'gioi_thieu', 'facebook'...
  preferences JSONB,                    -- {breeds: ['ASIL'], price_max: 10000000}
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
  order_code TEXT UNIQUE NOT NULL,      -- 'BH-2025-001'
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
  code TEXT UNIQUE NOT NULL,            -- 'thuc_an', 'nhan_cong'...
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
  receipt_url TEXT,                     -- ảnh hóa đơn (Drive)
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
  task_type TEXT NOT NULL,              -- 'cho_an', 'tiem_phong', 'van_ga'
  task_description TEXT,
  status TEXT DEFAULT 'cho_lam',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 30. ACTIVITY_LOGS (nhật ký hoạt động)
-- =====================================================

CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,                 -- 'create', 'update', 'delete'
  entity_type TEXT NOT NULL,            -- 'chickens', 'sales_orders'...
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
-- 31. ALERTS (cảnh báo hệ thống)
-- =====================================================

CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_type TEXT NOT NULL,             -- 'tiem_phong', 'kho_thuoc_thap'...
  priority alert_priority DEFAULT 'trung_binh',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_entity_type TEXT,
  related_entity_id UUID,
  target_users UUID[],                  -- nếu null = gửi cho tất cả chu_trai
  status alert_status DEFAULT 'chua_doc',
  read_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_priority ON alerts(priority);

-- =====================================================
-- 32. SYSTEM_SETTINGS (cài đặt hệ thống)
-- =====================================================

CREATE TABLE system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);
```

### File 2: `20260101000002_functions_triggers.sql`

```sql
-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Auto-create profile khi user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'nhan_vien'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_breeds_updated_at BEFORE UPDATE ON breeds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_chickens_updated_at BEFORE UPDATE ON chickens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_sales_orders_updated_at BEFORE UPDATE ON sales_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto generate chicken_code: GA-{BREED}-{YY}-{SEQ}
CREATE OR REPLACE FUNCTION generate_chicken_code()
RETURNS TRIGGER AS $$
DECLARE
  v_breed_code TEXT;
  v_year TEXT;
  v_seq INT;
  v_new_code TEXT;
BEGIN
  IF NEW.chicken_code IS NOT NULL AND NEW.chicken_code != '' THEN
    RETURN NEW;
  END IF;

  SELECT code INTO v_breed_code FROM breeds WHERE id = NEW.breed_id;
  v_year := TO_CHAR(COALESCE(NEW.birth_date, CURRENT_DATE), 'YY');

  -- Lấy số thứ tự tiếp theo cho breed + year
  SELECT COUNT(*) + 1 INTO v_seq
  FROM chickens
  WHERE breed_id = NEW.breed_id
    AND TO_CHAR(COALESCE(birth_date, created_at::DATE), 'YY') = v_year;

  v_new_code := 'GA-' || v_breed_code || '-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');
  NEW.chicken_code := v_new_code;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_chicken_code
  BEFORE INSERT ON chickens
  FOR EACH ROW EXECUTE FUNCTION generate_chicken_code();

-- Auto generate cage full_code: {AREA}-{ROW}-{CAGE}
CREATE OR REPLACE FUNCTION generate_cage_full_code()
RETURNS TRIGGER AS $$
DECLARE
  v_area_code TEXT;
  v_row_code TEXT;
BEGIN
  SELECT a.code, r.code INTO v_area_code, v_row_code
  FROM cage_rows r
  JOIN areas a ON a.id = r.area_id
  WHERE r.id = NEW.row_id;

  NEW.full_code := v_area_code || '-' || v_row_code || '-' || NEW.code;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_cage_full_code
  BEFORE INSERT OR UPDATE OF row_id, code ON cages
  FOR EACH ROW EXECUTE FUNCTION generate_cage_full_code();

-- Auto sync qr_tag status khi gắn vào gà
CREATE OR REPLACE FUNCTION sync_qr_tag_status()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.qr_tag_id IS DISTINCT FROM NEW.qr_tag_id) THEN
    -- Reset thẻ cũ
    IF TG_OP = 'UPDATE' AND OLD.qr_tag_id IS NOT NULL THEN
      UPDATE qr_tags SET status = 'chua_su_dung', chicken_id = NULL, assigned_at = NULL
      WHERE id = OLD.qr_tag_id;
    END IF;
    -- Set thẻ mới
    IF NEW.qr_tag_id IS NOT NULL THEN
      UPDATE qr_tags SET status = 'dang_su_dung', chicken_id = NEW.id, assigned_at = NOW()
      WHERE id = NEW.qr_tag_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_qr_tag
  AFTER INSERT OR UPDATE OF qr_tag_id ON chickens
  FOR EACH ROW EXECUTE FUNCTION sync_qr_tag_status();

-- Auto tạo lịch tiêm phòng khi tạo hồ sơ gà mới
CREATE OR REPLACE FUNCTION create_vaccination_schedule()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.birth_date IS NOT NULL THEN
    INSERT INTO vaccinations (chicken_id, vaccine_id, scheduled_date)
    SELECT NEW.id, v.id, NEW.birth_date + (v.default_age_days || ' days')::INTERVAL
    FROM vaccines v
    WHERE v.is_active = TRUE
    ON CONFLICT (chicken_id, vaccine_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_vaccination_schedule
  AFTER INSERT ON chickens
  FOR EACH ROW EXECUTE FUNCTION create_vaccination_schedule();

-- View: chicken_cost_basis (giá vốn từng con)
CREATE OR REPLACE VIEW chicken_cost_basis AS
SELECT
  c.id,
  c.chicken_code,
  c.cost_purchase,
  COALESCE(c.cost_purchase, 0) AS purchase_cost,
  -- Sẽ thêm logic tính chi phí nuôi sau khi có dữ liệu thực tế
  -- Tạm tính: số tháng nuôi × chi phí trung bình/con/tháng (lấy từ system_settings)
  CASE
    WHEN c.birth_date IS NOT NULL THEN
      EXTRACT(MONTH FROM AGE(COALESCE(c.status_date, CURRENT_DATE), c.birth_date))
    ELSE 0
  END AS months_raised,
  COALESCE(c.cost_purchase, 0) AS total_cost  -- placeholder, sẽ tính chi tiết sau
FROM chickens c;

-- View: chickens_for_sale_public (cho website public)
CREATE OR REPLACE VIEW chickens_for_sale_public AS
SELECT
  c.id,
  c.chicken_code,
  c.name,
  qt.tag_number,
  b.code AS breed_code,
  b.name_vi AS breed_name,
  c.gender,
  c.birth_date,
  EXTRACT(MONTH FROM AGE(CURRENT_DATE, c.birth_date)) AS age_months,
  c.weight_kg,
  c.color,
  c.listed_price,
  c.description,
  c.main_photo_url,
  c.created_at
FROM chickens c
JOIN breeds b ON b.id = c.breed_id
LEFT JOIN qr_tags qt ON qt.id = c.qr_tag_id
WHERE c.is_for_sale = TRUE
  AND c.status = 'dang_nuoi';
```

### File 3: `20260101000003_rls_policies.sql`

```sql
-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS trên TẤT CẢ bảng
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE breeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE cage_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE cages ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE chickens ENABLE ROW LEVEL SECURITY;
ALTER TABLE chicken_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE breeding_litters ENABLE ROW LEVEL SECURITY;
ALTER TABLE chick_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE vaccines ENABLE ROW LEVEL SECURITY;
ALTER TABLE vaccinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicine_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE diseases ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Helper function: kiểm tra role
CREATE OR REPLACE FUNCTION auth_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_chu_trai()
RETURNS BOOLEAN AS $$
  SELECT auth_role() = 'chu_trai';
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_authenticated_staff()
RETURNS BOOLEAN AS $$
  SELECT auth_role() IN ('chu_trai', 'nhan_vien');
$$ LANGUAGE SQL SECURITY DEFINER;

-- ==========================================
-- POLICIES
-- ==========================================

-- PROFILES: user xem profile của mình + chu_trai xem tất cả
CREATE POLICY "Users view own profile" ON profiles FOR SELECT
  USING (auth.uid() = id OR is_chu_trai());
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE
  USING (auth.uid() = id);
CREATE POLICY "Chu trai manages all profiles" ON profiles FOR ALL
  USING (is_chu_trai());

-- BREEDS: ai cũng xem được, chỉ chu_trai sửa
CREATE POLICY "Anyone view active breeds" ON breeds FOR SELECT
  USING (is_active = TRUE OR is_authenticated_staff());
CREATE POLICY "Chu trai manages breeds" ON breeds FOR ALL
  USING (is_chu_trai());

-- AREAS, CAGE_ROWS, CAGES: nhân viên xem, chu_trai sửa
CREATE POLICY "Staff view areas" ON areas FOR SELECT
  USING (is_authenticated_staff());
CREATE POLICY "Chu trai manages areas" ON areas FOR ALL
  USING (is_chu_trai());

CREATE POLICY "Staff view rows" ON cage_rows FOR SELECT
  USING (is_authenticated_staff());
CREATE POLICY "Chu trai manages rows" ON cage_rows FOR ALL
  USING (is_chu_trai());

CREATE POLICY "Staff view cages" ON cages FOR SELECT
  USING (is_authenticated_staff());
CREATE POLICY "Chu trai manages cages" ON cages FOR ALL
  USING (is_chu_trai());

-- QR_TAGS: nhân viên xem & gắn, chu_trai full
CREATE POLICY "Staff view qr tags" ON qr_tags FOR SELECT
  USING (is_authenticated_staff());
CREATE POLICY "Staff update qr tags" ON qr_tags FOR UPDATE
  USING (is_authenticated_staff());
CREATE POLICY "Chu trai manages qr tags" ON qr_tags FOR ALL
  USING (is_chu_trai());

-- CHICKENS: public xem được con đang bán, nhân viên full
CREATE POLICY "Public view chickens for sale" ON chickens FOR SELECT
  USING (is_for_sale = TRUE AND status = 'dang_nuoi');
CREATE POLICY "Staff view all chickens" ON chickens FOR SELECT
  USING (is_authenticated_staff());
CREATE POLICY "Staff manages chickens" ON chickens FOR ALL
  USING (is_authenticated_staff());

-- CHICKEN_MEDIA: public xem media của gà đang bán
CREATE POLICY "Public view media of for-sale chickens" ON chicken_media FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chickens
      WHERE chickens.id = chicken_media.chicken_id
      AND chickens.is_for_sale = TRUE
    )
  );
CREATE POLICY "Staff manages chicken media" ON chicken_media FOR ALL
  USING (is_authenticated_staff());

-- VACCINES: ai cũng xem
CREATE POLICY "Anyone view vaccines" ON vaccines FOR SELECT
  USING (TRUE);
CREATE POLICY "Chu trai manages vaccines" ON vaccines FOR ALL
  USING (is_chu_trai());

-- Tất cả các bảng staff-only khác (medicines, feeds, breeding_litters, ...)
-- Pattern chung: nhân viên full quyền nội bộ
CREATE POLICY "Staff full access vaccinations" ON vaccinations FOR ALL
  USING (is_authenticated_staff());
CREATE POLICY "Staff full access medicines" ON medicines FOR ALL
  USING (is_authenticated_staff());
CREATE POLICY "Staff full access medicine_transactions" ON medicine_transactions FOR ALL
  USING (is_authenticated_staff());
CREATE POLICY "Staff full access feeds" ON feeds FOR ALL
  USING (is_authenticated_staff());
CREATE POLICY "Staff full access feed_transactions" ON feed_transactions FOR ALL
  USING (is_authenticated_staff());
CREATE POLICY "Staff full access diseases" ON diseases FOR ALL
  USING (is_authenticated_staff());
CREATE POLICY "Staff full access training_sessions" ON training_sessions FOR ALL
  USING (is_authenticated_staff());
CREATE POLICY "Staff full access breeding_litters" ON breeding_litters FOR ALL
  USING (is_authenticated_staff());
CREATE POLICY "Staff full access chick_groups" ON chick_groups FOR ALL
  USING (is_authenticated_staff());
CREATE POLICY "Staff full access suppliers" ON suppliers FOR ALL
  USING (is_authenticated_staff());
CREATE POLICY "Staff full access purchases" ON purchases FOR ALL
  USING (is_authenticated_staff());
CREATE POLICY "Staff full access purchase_items" ON purchase_items FOR ALL
  USING (is_authenticated_staff());
CREATE POLICY "Staff full access sales_orders" ON sales_orders FOR ALL
  USING (is_authenticated_staff());
CREATE POLICY "Staff full access sales_items" ON sales_items FOR ALL
  USING (is_authenticated_staff());
CREATE POLICY "Staff full access alerts" ON alerts FOR ALL
  USING (is_authenticated_staff());

-- CUSTOMERS: nhân viên full + public có thể INSERT (form liên hệ)
CREATE POLICY "Staff full access customers" ON customers FOR ALL
  USING (is_authenticated_staff());
CREATE POLICY "Public insert customers" ON customers FOR INSERT
  WITH CHECK (TRUE);
CREATE POLICY "Staff full access customer_alerts" ON customer_alerts FOR ALL
  USING (is_authenticated_staff());

-- EXPENSES: chỉ chu_trai
CREATE POLICY "Chu trai manages expense_categories" ON expense_categories FOR ALL
  USING (is_chu_trai());
CREATE POLICY "Anyone view expense_categories" ON expense_categories FOR SELECT
  USING (TRUE);
CREATE POLICY "Chu trai manages expenses" ON expenses FOR ALL
  USING (is_chu_trai());

-- STAFF (HR): chu_trai full, nhân viên xem của mình
CREATE POLICY "Chu trai manages attendance" ON staff_attendance FOR ALL
  USING (is_chu_trai());
CREATE POLICY "Staff view own attendance" ON staff_attendance FOR SELECT
  USING (staff_id = auth.uid());
CREATE POLICY "Chu trai manages assignments" ON staff_assignments FOR ALL
  USING (is_chu_trai());
CREATE POLICY "Staff view own assignments" ON staff_assignments FOR SELECT
  USING (staff_id = auth.uid());

-- ACTIVITY_LOGS: chỉ chu_trai xem
CREATE POLICY "Chu trai view activity logs" ON activity_logs FOR SELECT
  USING (is_chu_trai());
CREATE POLICY "System inserts activity logs" ON activity_logs FOR INSERT
  WITH CHECK (TRUE);

-- SYSTEM_SETTINGS: chỉ chu_trai
CREATE POLICY "Chu trai manages settings" ON system_settings FOR ALL
  USING (is_chu_trai());
```

### File 4: `20260101000004_seed_data.sql`

```sql
-- =====================================================
-- SEED DATA
-- =====================================================

-- 1. BREEDS - giống gà Việt Nam phổ biến
INSERT INTO breeds (code, name_vi, origin, tier, description, display_order) VALUES
('ASIL', 'Asil', 'Ấn Độ', 'cao_cap', 'Đòn cước chắc, gan lì, được ưa chuộng nhất', 1),
('MLAI', 'Mã Lai', 'Malaysia', 'cao_cap', 'Đòn cao, thể hình to, sức bền tốt', 2),
('PERU', 'Peru', 'Peru', 'trung_cap', 'Thể hình lớn, đòn mạnh', 3),
('NOI', 'Nòi', 'Việt Nam', 'pho_thong', 'Giống gà chọi truyền thống Việt Nam, dai sức', 4),
('TRE', 'Tre', 'Việt Nam', 'pho_thong', 'Nhỏ gọn, nhanh nhẹn', 5),
('TANC', 'Tân Châu', 'Việt Nam', 'cao_cap', 'Giống đẹp, lông mượt, nguồn gốc An Giang', 6),
('LAIF1', 'Lai F1', 'Lai tạo', 'dac_biet', 'Lai giữa các giống thuần để tận dụng ưu điểm', 7);

-- 2. VACCINES - 8 mũi tiêm phòng cơ bản
INSERT INTO vaccines (code, name_vi, default_age_days, is_required, display_order, description) VALUES
('MAREK', 'Marek', 1, TRUE, 1, 'Tiêm ngày đầu - phòng ung thư'),
('NEW1', 'Newcastle (Lasota) lần 1', 7, TRUE, 2, 'Phòng bệnh Newcastle - ngày 7'),
('GUM1', 'Gumboro lần 1', 14, TRUE, 3, 'Phòng bệnh Gumboro - ngày 14'),
('NEW2', 'Newcastle lần 2', 21, TRUE, 4, 'Tăng cường Newcastle - ngày 21'),
('GUM2', 'Gumboro lần 2', 28, TRUE, 5, 'Tăng cường Gumboro - ngày 28'),
('H5N1', 'Cúm gia cầm H5N1', 42, TRUE, 6, 'Bắt buộc theo luật - 6 tuần'),
('DAU', 'Đậu gà', 56, FALSE, 7, '8 tuần tuổi'),
('NDIB', 'ND-IB tăng cường', 84, FALSE, 8, '12 tuần - tăng cường miễn dịch');

-- 3. EXPENSE CATEGORIES - 8 hạng mục chi phí
INSERT INTO expense_categories (code, name_vi, description, display_order) VALUES
('thuc_an', 'Thức ăn', 'Cám, ngô, lúa, rau xanh', 1),
('nhan_cong', 'Nhân công', 'Lương nhân viên', 2),
('thuoc_thu_y', 'Thuốc thú y', 'Thuốc chữa bệnh, vaccine', 3),
('dien_nuoc', 'Điện nước', 'Tiền điện, nước, vật tư chuồng', 4),
('khau_hao', 'Khấu hao', 'Khấu hao chuồng trại, thiết bị', 5),
('van_chuyen', 'Vận chuyển', 'Giao gà, mua nguyên liệu', 6),
('marketing', 'Marketing', 'Quảng cáo, content, in ấn', 7),
('du_phong', 'Dự phòng', 'Sự cố bất ngờ, sửa chữa', 8);

-- 4. AREAS - 5 khu vực mẫu
INSERT INTO areas (code, name_vi, type, description, display_order) VALUES
('A', 'Khu A - Trống chiến', 'duc', 'Khu nuôi gà trống chiến', 1),
('B', 'Khu B - Mái đẻ', 'mai', 'Khu nuôi gà mái sinh sản', 2),
('C', 'Khu C - Ghép đôi', 'ghep_doi', 'Khu cho lứa ghép đôi', 3),
('D', 'Khu D - Gà tơ', 'trong', 'Khu nuôi gà tơ chưa phân giới tính', 4),
('E', 'Khu E - Cách ly', 'cach_ly', 'Khu cách ly gà mới + bệnh', 5);

-- 5. QR TAGS - tạo sẵn 9999 thẻ (0001 -> 9999)
INSERT INTO qr_tags (tag_number)
SELECT LPAD(generate_series(1, 9999)::TEXT, 4, '0');

-- 6. SYSTEM SETTINGS - cài đặt mặc định
INSERT INTO system_settings (key, value, description) VALUES
('farm_info', '{"name": "Gà Chọi Việt Ninh Bình", "short_name": "Gà Chọi Việt NB", "address": "Ninh Bình", "phone": "", "zalo": "", "facebook": ""}', 'Thông tin trang trại'),
('alert_thresholds', '{"death_rate_daily_pct": 2, "death_rate_baseline_multiplier": 3, "low_stock_days_warning": 7}', 'Ngưỡng cảnh báo'),
('default_cost_per_chicken_per_month', '{"value": 100000}', 'Chi phí nuôi mặc định/con/tháng (VNĐ)'),
('vaccine_reminder_time', '{"hour": 7, "minute": 0}', 'Giờ gửi nhắc tiêm phòng hàng ngày');
```

---

## 🔐 BƯỚC 3: AUTH & MIDDLEWARE

### File `src/lib/supabase/server.ts`

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // ignore in Server Component
          }
        },
      },
    }
  )
}
```

### File `src/lib/supabase/client.ts`

```typescript
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### File `src/middleware.ts`

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Bảo vệ /admin
  if (request.nextUrl.pathname.startsWith('/admin') && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // Đã đăng nhập mà vào /auth/login → redirect /admin
  if (request.nextUrl.pathname === '/auth/login' && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

---

## 🎨 BƯỚC 4: LAYOUTS

### `src/app/(admin)/layout.tsx`

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminSidebar from '@/components/layout/AdminSidebar'
import AdminBottomNav from '@/components/layout/AdminBottomNav'
import AdminHeader from '@/components/layout/AdminHeader'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar profile={profile} />
      <div className="md:ml-64 pb-16 md:pb-0">
        <AdminHeader profile={profile} />
        <main className="p-4 md:p-6">{children}</main>
      </div>
      <AdminBottomNav />
    </div>
  )
}
```

### `src/components/layout/AdminSidebar.tsx`

Component này cần:
- Hiển thị logo "Gà Chọi Việt NB" + tên người dùng
- Menu chia 5 nhóm: ĐÀN / SỨC KHOẺ / KINH DOANH / BÁO CÁO / HỆ THỐNG
- Mỗi item có icon (lucide-react)
- Active state khi route khớp
- **Hiển thị fixed sidebar ở desktop (>=md), ẩn ở mobile**
- Badges: số gà cần tiêm, số đơn mới...

### `src/components/layout/AdminBottomNav.tsx`

5 tab cố định ở bottom (chỉ hiện ở mobile):
- Dashboard (home)
- Hồ sơ gà (chickens)
- Quét QR (camera - giữa, nổi bật)
- Bán ra
- Thêm (mở sheet menu các module khác)

### `src/app/(public)/layout.tsx`

```typescript
import PublicHeader from '@/components/layout/PublicHeader'
import PublicFooter from '@/components/layout/PublicFooter'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  )
}
```

---

## 🔌 BƯỚC 5: KẾT NỐI SERVICES

### File `.env.local.example`

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx

# Site
NEXT_PUBLIC_SITE_URL=https://gachoivietnb.com

# Google Drive
GOOGLE_DRIVE_CLIENT_ID=
GOOGLE_DRIVE_CLIENT_SECRET=
GOOGLE_DRIVE_REDIRECT_URI=http://localhost:3000/api/auth/google-drive/callback
GOOGLE_DRIVE_REFRESH_TOKEN=

# Gemini API
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.0-flash-exp
```

### File `src/lib/gemini/client.ts`

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai'

let geminiClient: GoogleGenerativeAI | null = null

export function getGeminiClient() {
  if (!geminiClient) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY missing')
    }
    geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  }
  return geminiClient
}

export function getGeminiModel(modelName?: string) {
  return getGeminiClient().getGenerativeModel({
    model: modelName || process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp',
  })
}
```

### File `src/lib/google-drive/client.ts`

```typescript
import { google } from 'googleapis'

export function getDriveClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_DRIVE_CLIENT_ID,
    process.env.GOOGLE_DRIVE_CLIENT_SECRET,
    process.env.GOOGLE_DRIVE_REDIRECT_URI
  )

  if (process.env.GOOGLE_DRIVE_REFRESH_TOKEN) {
    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN,
    })
  }

  return google.drive({ version: 'v3', auth: oauth2Client })
}
```

---

## 📄 BƯỚC 6: SKELETON PAGES

Tạo TẤT CẢ pages với placeholder "Coming soon":

### Mẫu page admin (áp dụng cho mọi module):

```typescript
// src/app/(admin)/admin/ho-so-ga/page.tsx
export default function HoSoGaPage() {
  return (
    <div>
      <h1 className="text-2xl font-medium mb-4">Hồ sơ gà</h1>
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-500">
        <p>Module này sẽ được build trong Phần 2</p>
      </div>
    </div>
  )
}
```

Tạo tương tự cho TẤT CẢ trang admin trong cấu trúc thư mục.

### Trang Dashboard `/admin`:

Tạo dashboard skeleton có:
- 4 stat cards: "Tổng đàn", "Cần tiêm hôm nay", "Đến tuổi bán", "Doanh thu tháng" (số tạm = 0)
- Khung "Cảnh báo hôm nay" (rỗng)
- Khung "Doanh thu 6 tháng" (skeleton)

### Trang public:

- `/` Trang chủ với hero "Gà Chọi Việt Ninh Bình" + CTA
- `/ban` "Sắp ra mắt"
- `/giong` "Sắp ra mắt"
- `/lien-he` Form liên hệ cơ bản
- `/ga/[tagNumber]` Tạm hiển thị tag number

### Trang `/auth/login`:

Form đơn giản với email + password, dùng Supabase Auth.

---

## ✅ CHECKLIST HOÀN THÀNH PHẦN 1

Sau khi xong, kiểm tra:

- [ ] `npm run dev` chạy không lỗi
- [ ] `npm run build` build thành công
- [ ] Truy cập `/` thấy trang chủ public với tên "Gà Chọi Việt Ninh Bình"
- [ ] Truy cập `/admin` chưa login → redirect `/auth/login`
- [ ] Đăng ký user → tự tạo profile với role `nhan_vien`
- [ ] Login → vào được `/admin` thấy dashboard skeleton
- [ ] Sidebar hiện đầy đủ 16 menu, click vào thấy "Coming soon"
- [ ] Mobile (chrome devtools): sidebar ẩn, bottom nav hiện
- [ ] Trong Supabase Dashboard:
  - [ ] Thấy đủ 32 tables
  - [ ] Bảng `qr_tags` có 9999 dòng (0001-9999)
  - [ ] Bảng `breeds` có 7 giống
  - [ ] Bảng `vaccines` có 8 mũi
  - [ ] Bảng `expense_categories` có 8 hạng mục
  - [ ] Bảng `areas` có 5 khu mẫu
  - [ ] RLS đã enabled trên tất cả bảng
- [ ] Tạo manual 1 record test trong `chickens` → trigger tự sinh `chicken_code` đúng format `GA-ASIL-25-0001`
- [ ] Tạo manual 1 record test trong `cages` → trigger tự sinh `full_code`
- [ ] Generate Supabase types: `npx supabase gen types typescript --project-id xxx > src/types/database.ts`

---

## 🚨 LƯU Ý QUAN TRỌNG

1. **Tạo tài khoản admin đầu tiên thủ công:**
   - Đăng ký 1 user qua trang `/auth/login`
   - Vào Supabase Dashboard → SQL Editor → chạy:
     ```sql
     UPDATE profiles SET role = 'chu_trai' WHERE id = 'user-id-vừa-đăng-ký';
     ```

2. **Google Drive setup:** Tạm thời để trống các env Google Drive — sẽ setup chi tiết ở Phần 2 khi cần upload ảnh.

3. **Gemini API:** Lấy key tại [Google AI Studio](https://aistudio.google.com/app/apikey) — chỉ cần khi đến Phần 7.

4. **Supabase project:** Tạo project mới tại [supabase.com](https://supabase.com), enable extension `uuid-ossp` và `pgcrypto` qua Database → Extensions.

5. **Deploy Vercel:**
   - Push lên GitHub
   - Connect repo vào Vercel
   - Thêm tất cả env vars
   - Set `NEXT_PUBLIC_SITE_URL=https://gachoivietnb.com`

6. **Migrations:** Chạy theo thứ tự 4 file trong Supabase SQL Editor, hoặc dùng Supabase CLI `supabase db push`.

7. **Đừng tạo logic UI sâu trong Phần 1** — chỉ skeleton. Các phần sau sẽ fill chi tiết.

---

## 📦 OUTPUT MONG ĐỢI

Khi xong Phần 1, Claude Code đã tạo:
- Project Next.js hoàn chỉnh chạy được
- 4 file SQL migration đầy đủ
- Auth + middleware hoạt động
- 2 layout (admin + public) responsive
- Toàn bộ skeleton pages cho 16 module
- Setup Supabase, Gemini, Google Drive client
- README hướng dẫn cài đặt + chạy

**Bạn báo lại khi xong, sau đó tôi sẽ chuẩn bị prompt cho Phần 2.**
