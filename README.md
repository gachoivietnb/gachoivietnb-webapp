# 🐓 Gà Chọi Việt Ninh Bình — Web App

Hệ thống quản lý trang trại gà chọi + website bán hàng công khai cho `gachoivietnb.com`.

**Phần 1 — Nền tảng & khung app** đã hoàn thành. Phần 2-8 sẽ được build tuần tự theo các file `phan_*.md` trong thư mục này.

---

## 🛠️ Stack

- **Next.js 14** (App Router + TypeScript strict)
- **Supabase** (Postgres + Auth + Storage)
- **Tailwind CSS** + **shadcn/ui**
- **Google Drive** (lưu ảnh gà, từ Phần 2)
- **Gemini API** (AI marketing, từ Phần 7)
- **Vercel** (deploy)

---

## 🚀 Cài đặt lần đầu

### 1. Cài dependencies

```bash
npm install
```

### 2. Tạo Supabase project

1. Vào https://supabase.com → New Project
2. Chọn region **Singapore** hoặc **Tokyo** cho tốc độ từ VN
3. Đặt password database (lưu lại cẩn thận)
4. Vào **Database → Extensions** → enable `uuid-ossp` + `pgcrypto`
5. Vào **Settings → API** lấy 3 giá trị:
   - Project URL
   - `anon` public key
   - `service_role` secret key

### 3. Tạo file `.env.local`

```bash
cp .env.local.example .env.local
```

Rồi điền 3 giá trị từ Supabase vào 3 dòng đầu. Các env khác có thể để trống (sẽ cần ở các phần sau).

### 4. Chạy migrations

Vào Supabase Dashboard → **SQL Editor** → New Query → copy từng file theo thứ tự và chạy:

1. `supabase/migrations/20260101000001_initial_schema.sql` (32 bảng + enums)
2. `supabase/migrations/20260101000002_functions_triggers.sql` (triggers tự sinh mã + views)
3. `supabase/migrations/20260101000003_rls_policies.sql` (Row Level Security 3 role)
4. `supabase/migrations/20260101000004_seed_data.sql` (9999 QR tags + 7 giống + 8 vaccines + 8 hạng mục + 5 khu)

### 5. Generate TypeScript types từ Supabase (tùy chọn, khuyến nghị)

Cài Supabase CLI (`npm i -g supabase`) rồi:

```bash
supabase login
supabase gen types typescript --project-id <YOUR_PROJECT_ID> > src/types/database.ts
```

### 6. Chạy dev server

```bash
npm run dev
```

Mở http://localhost:3000

### 7. Tạo tài khoản admin đầu tiên

1. Vào http://localhost:3000/auth/login → click "Đăng ký" → tạo tài khoản bằng email + password
2. Vào Supabase → SQL Editor → chạy:
   ```sql
   UPDATE profiles SET role = 'chu_trai' WHERE id = 'user-id-vừa-tạo';
   ```
   (Lấy `user-id` bằng `SELECT id, full_name FROM profiles;`)
3. Logout, login lại → vào được `/admin` với đủ quyền chủ trại

---

## 📁 Cấu trúc thư mục

```
src/
├── app/
│   ├── (public)/             # Route group cho website công khai
│   ├── (admin)/              # Route group cho admin (protected)
│   ├── auth/                 # Login, callback, logout
│   ├── api/                  # API routes
│   └── layout.tsx            # Root layout
├── components/
│   ├── ui/                   # shadcn/ui components
│   ├── layout/               # AdminSidebar, PublicHeader...
│   ├── admin/                # Admin-specific (Phần 2+)
│   └── public/               # Public-specific (Phần 6)
├── lib/
│   ├── supabase/             # client.ts, server.ts
│   ├── google-drive/
│   ├── gemini/
│   └── utils/
├── types/
├── hooks/
└── middleware.ts             # Auth guard cho /admin

supabase/
└── migrations/               # 4 file SQL (chạy theo thứ tự)

phan_1_*.md ... phan_8_*.md   # Tài liệu plan chi tiết (giữ lại làm reference)
```

---

## 📋 Kiểm tra Phần 1 đã OK

- [ ] `npm run dev` chạy không lỗi
- [ ] `npm run build` build thành công
- [ ] Truy cập `/` thấy trang chủ public "Gà Chọi Việt Ninh Bình"
- [ ] `/admin` chưa login → redirect `/auth/login`
- [ ] Đăng ký → tự tạo profile role `nhan_vien`
- [ ] Login chu_trai → vào dashboard skeleton
- [ ] Sidebar hiển thị 16 menu, click → thấy "Sẽ build ở Phần X"
- [ ] Mobile: sidebar ẩn, bottom nav hiển thị
- [ ] Supabase có đủ 32 tables + 9999 QR tags + 7 breeds + 8 vaccines

---

## 🗺️ Lộ trình 8 phần

| Phần | Nội dung | Trạng thái |
|------|----------|------------|
| 1 | Nền tảng, 32 bảng, auth, skeleton | ✅ Đang hoàn thành |
| 2 | Hồ sơ gà + QR + Chuồng trại | ⏳ |
| 3 | Gia phả + Sinh sản | ⏳ |
| 4 | Sức khỏe + Vần gà | ⏳ |
| 5 | Mua bán + Tài chính | ⏳ |
| 6 | Website Public + Bio QR | ⏳ |
| 7 | AI + Tự động hoá + CRM | ⏳ |
| 8 | Dashboard + Báo cáo + Hoàn thiện | ⏳ |
