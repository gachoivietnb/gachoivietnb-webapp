# 🚀 Hướng dẫn Deploy gachoivietnb.com

> Bạn làm các bước **🟦 Bạn**, Claude làm các bước **🤖 Claude**.

## 📋 Tổng quan

Hệ thống cần dựng trên 4 dịch vụ:

| Dịch vụ | Vai trò | Chi phí |
|---|---|---|
| **Supabase Cloud** | Database + Auth + Storage | Free tier (đủ cho 100+ trại) |
| **Vercel** | Chạy Next.js + serve domain | Free tier (đủ cho 1M request/tháng) |
| **GitHub** | Lưu code | Free |
| **Domain registrar** (nơi mua tên miền) | Cấu hình DNS | Đã trả tiền |

**Thời gian dự kiến:** 30-45 phút (bạn) + 10-15 phút (Claude tự động).

---

## 🟦 BƯỚC 1 — Tạo Supabase Cloud project

⏱️ ~5 phút

1. Vào https://supabase.com/dashboard → đăng nhập (đã có account)
2. Bấm **"New project"**
3. Điền:
   - **Name:** `gachoivietnb-prod`
   - **Database password:** đặt mật khẩu mạnh (≥16 ký tự, có chữ + số + ký tự đặc biệt)
   - **Region:** chọn **`Southeast Asia (Singapore)`** (gần Việt Nam, tốc độ tốt nhất)
   - **Pricing plan:** Free
4. Bấm **"Create new project"** → đợi 1-2 phút (logo Supabase loading)
5. Sau khi xong → vào **Settings (⚙️) → API** ở sidebar, thu thập:
   - **Project URL**: vd `https://abcdefghijkl.supabase.co`
   - **anon public** key (dài, dạng `eyJ...`)
   - **service_role** key (BÍ MẬT — không share)

6. Tạo **Personal Access Token** cho Claude:
   - Avatar góc trên phải → **Account** → **Access Tokens**
   - **"Generate new token"** → đặt tên `gachoivietnb-deploy`
   - Copy token (dạng `sbp_xxx`) — **chỉ hiện 1 lần**

➡️ Có 6 thông tin: PROJECT_URL, PROJECT_REF (chuỗi `abcdefghijkl` trong URL), ANON_KEY, SERVICE_ROLE_KEY, DB_PASSWORD, ACCESS_TOKEN.

---

## 🟦 BƯỚC 2 — Tạo GitHub repo

⏱️ ~3 phút

1. Vào https://github.com/new
2. Điền:
   - **Repository name:** `gachoivietnb-webapp`
   - **Visibility:** **Private** (khuyến nghị)
   - **KHÔNG tick** "Add a README", "Add .gitignore", "Choose a license" (project đã có)
3. Bấm **"Create repository"**

4. Tạo **Personal Access Token** cho Claude:
   - Vào https://github.com/settings/tokens?type=beta
   - **"Generate new token"** → **"Fine-grained token"**
   - **Token name:** `gachoivietnb-deploy`
   - **Expiration:** 90 days
   - **Repository access:** Only select repositories → tick `gachoivietnb-webapp`
   - **Repository permissions:**
     - **Contents:** `Read and write` ✅
     - **Workflows:** `Read and write` ✅
     - Còn lại để mặc định
   - Bấm **Generate token** → copy (dạng `github_pat_xxx`)

---

## 🟦 BƯỚC 3 — Tạo Vercel account + token

⏱️ ~3 phút

1. Vào https://vercel.com/signup
2. Bấm **"Continue with GitHub"** — đăng nhập bằng tài khoản GitHub vừa rồi
3. Chấp nhận terms, chọn **Hobby plan** (free)
4. **KHÔNG cần import project ngay** — Claude sẽ làm.

5. Tạo **Personal Access Token**:
   - Vào https://vercel.com/account/tokens
   - **"Create Token"** → tên `gachoivietnb-deploy`
   - **Scope:** Full Account
   - **Expiration:** No expiration (hoặc 1 năm)
   - Copy token

---

## 🟦 BƯỚC 4 — Lấy Gemini API key

⏱️ ~2 phút

1. Vào https://aistudio.google.com/apikey
2. Đăng nhập Google
3. Bấm **"Create API key"** → chọn project (hoặc tạo project mới `gachoivietnb`)
4. Copy key (dạng `AIzaSyxxx`)

> Free tier: 15 request/phút, 1500/ngày — đủ cho 1 trại quy mô vừa dùng AI Marketing + Phân tích báo cáo.

---

## 🟦 BƯỚC 5 — Điền credentials

⏱️ ~5 phút

1. Mở thư mục project: `E:\GaChoiVietNB\WebApp\`
2. Copy file `deploy-credentials.example.txt` → đổi tên thành `deploy-credentials.txt`
3. Mở `deploy-credentials.txt` bằng Notepad / VSCode
4. Điền các giá trị đã thu thập từ các bước trên vào sau dấu `=`:

   ```
   SUPABASE_PROJECT_URL=https://abcdefghijkl.supabase.co
   SUPABASE_PROJECT_REF=abcdefghijkl
   SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   SUPABASE_DB_PASSWORD=mật-khẩu-bạn-đặt
   SUPABASE_ACCESS_TOKEN=sbp_...

   GITHUB_USERNAME=tên-github-của-bạn
   GITHUB_REPO_NAME=gachoivietnb-webapp
   GITHUB_TOKEN=github_pat_...

   VERCEL_TOKEN=...

   GEMINI_API_KEY=AIzaSy_dán_key_thật_của_bạn_vào_đây

   DOMAIN=gachoivietnb.com
   DOMAIN_REGISTRAR=tên-nhà-cung-cấp-domain   # vd matbao.net / tenten.vn

   SUPER_ADMIN_EMAIL=haunau486@gmail.com
   ```

   Các phần khác (Resend, Google Drive) có thể để trống — làm sau.

5. **Lưu file** (Ctrl+S).

⚠️ **CẢNH BÁO:** File này chứa secret keys. Đã được `.gitignore` — **KHÔNG** push lên GitHub. Tuyệt đối **KHÔNG** share cho ai khác.

---

## 🤖 BƯỚC 6 — Báo Claude làm tự động

Bạn nhắn:

> "Tôi đã điền xong file deploy-credentials.txt"

Claude sẽ:

1. ✅ Đọc credentials từ file
2. ✅ Link Supabase CLI với cloud project
3. ✅ Push **22 migrations** từ local lên cloud (tạo schema, RLS, indexes)
4. ✅ Setup Storage buckets (`diary-media`, `chicken-media`, `farm-media`, etc.)
5. ✅ Generate VAPID keys cho production push notification
6. ✅ Tạo file `.env.production.local` với env vars cho Vercel
7. ✅ Update Auth Site URL + Redirect URLs trên Supabase
8. ✅ Khởi tạo git, push code lên GitHub repo
9. ✅ Tạo Vercel project, link với GitHub repo, set env vars, trigger deploy
10. ✅ Tạo super admin account `admin@gachoivietnb.com` (password sẽ in ra cho bạn)
11. ✅ Báo URL Vercel preview để bạn test trước khi cấu hình domain

---

## 🟦 BƯỚC 7 — Cấu hình DNS cho domain

⏱️ ~5 phút (sau khi Claude xong bước 6)

Sau khi Vercel deploy thành công, Claude sẽ chỉ cho bạn **2-3 dòng DNS records** cần thêm vào trang quản lý domain (Mắt Bão / Tenten / GoDaddy...).

Thông thường:
- **A record:** `@` → `76.76.21.21` (IP Vercel)
- **CNAME:** `www` → `cname.vercel-dns.com`

DNS propagation thường mất 5-30 phút (có thể tới 24h tuỳ provider).

---

## 🟦 BƯỚC 8 — Test live

Sau khi DNS đã trỏ:

1. Vào `https://gachoivietnb.com` → trang landing /phan-mem hiển thị
2. Login `admin@gachoivietnb.com` với password Claude in ra
3. Test:
   - Tạo tài khoản trial từ landing → vào /admin
   - Tạo gà mới
   - Chụp ảnh nhật ký
   - Xuất Excel báo cáo
4. Báo Claude nếu có lỗi → Claude debug.

---

## 🆘 Sự cố thường gặp

| Lỗi | Cách xử |
|---|---|
| Vercel build fail | Check log trong Vercel dashboard; thường do thiếu env var → bổ sung và redeploy |
| Supabase migration fail | Reset DB trong Supabase dashboard → Claude push lại |
| DNS chưa trỏ sau 1h | Check lại A record / CNAME đúng chưa; clear browser cache; thử mạng khác |
| Push notification không gửi được | Check VAPID keys đã đúng + service worker đã register chưa |

---

## 💡 Mẹo

- **Thử ở Vercel preview URL trước** (vd `gachoivietnb-webapp-xxx.vercel.app`) trước khi setup domain
- **Xoá file `deploy-credentials.txt`** sau khi deploy xong → an toàn hơn
- **Backup DB Supabase định kỳ**: Supabase free tier giữ backup 7 ngày tự động
- **Monitor logs**: Vercel dashboard → Logs · Supabase dashboard → Logs

---

🎉 **Sẵn sàng?** Bắt đầu từ BƯỚC 1!
