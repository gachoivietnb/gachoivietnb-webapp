import { HuongDanClient, type GuideSection } from '@/components/admin/help/HuongDanClient'

const SECTIONS: GuideSection[] = [
  {
    role: 'all',
    title: '📖 Hướng dẫn chung',
    items: [
      {
        title: 'Bắt đầu sử dụng',
        content: `1. Đăng nhập với tài khoản được cấp (chủ trại hoặc nhân viên)
2. Chủ trại lần đầu: Vào Cài đặt → Thông tin trang trại → điền tên, địa chỉ, hotline, Zalo, Facebook, email, website (dùng cho watermark ảnh + báo cáo)
3. Vào Cài đặt → Tích hợp AI → dán Gemini API key (lấy miễn phí tại https://aistudio.google.com/app/apikey) → bấm "Test kết nối" → "Lưu". Bắt buộc nếu muốn dùng AI Marketing + Phân tích AI báo cáo
4. Vào Cài đặt → Push notification → bấm "Bật thông báo trên thiết bị này" để nhận cảnh báo dịch bệnh / kho hết / lịch tiêm
5. Mobile: mở Chrome/Safari → menu → "Add to Home Screen" để dùng như app gốc (PWA, hoạt động offline)
6. Tuỳ chọn: nhập Drive folder ID trong Cài đặt để backup media tự động lên Google Drive
7. Tuỳ chọn (chủ trại): vào /admin/quy/tai-khoan để khai báo các tài khoản quỹ (Két tiền mặt, Vietcombank, MoMo...) — mặc định đã seed sẵn 2 TK`,
      },
      {
        title: 'Điều hướng giao diện',
        content: `Sidebar trái (desktop) chia thành 7 nhóm:
- 📊 Tổng quan: Dashboard, Nhật ký công việc
- 🐓 Quản lý đàn: Hồ sơ gà, Chuồng trại, Gia phả, Sinh sản, Thư viện giống
- 💉 Sức khỏe: Tiêm phòng, Kho thuốc, Kho thức ăn, Vần gà
- 💵 Kinh doanh: Mua vào, Bán ra, Khách hàng, Quản lý quỹ, Tài sản/CCDC, Nhân sự
- 📊 Báo cáo: Báo cáo tổng hợp, Phân tích AI
- ✨ Marketing: AI Marketing, Tin tức, Bí Kíp Sư Kê, Thư viện
- ⚙️ Hệ thống: Cài đặt, Hướng dẫn, Nhật ký, In thẻ QR, Quét QR

Chủ trại đặc biệt (super-admin SaaS) còn thấy thêm nhóm 👑 SaaS Owner: Super Admin · Tất cả Farms · Landing /phan-mem · Thanh toán (TK nhận) · Đơn hàng SaaS.

Mobile có Bottom nav 5 nút (Home / Gà / Quét QR nổi giữa / Bán / Thêm). Bấm "Thêm" để mở danh sách đầy đủ.

Header: avatar, toggle 🌙 dark mode. Góc dưới phải: 💬 chatbot AI. Góc dưới trái: trạng thái online/offline + hàng đợi sync.`,
      },
      {
        title: 'Phân quyền & vai trò',
        content: `Hệ thống có 2 vai trò chính:
- 👑 Chủ trại (chu_trai): full quyền mọi module — không bị giới hạn
- 👷 Nhân viên (nhan_vien): mặc định Read-Only ở các module nghiệp vụ; chủ trại tự cấu hình quyền chi tiết

Mỗi nhân viên được cấp 3 mức quyền theo từng module:
- Xem (read) · Thêm-Sửa (write) · Xóa (delete)

Để cấu hình: vào Nhân sự → 🔐 Phân quyền → chọn nhân viên → tick các quyền cho từng module.

Mặc định nhân viên KHÔNG xem được:
- Quản lý quỹ (quy)
- Báo cáo tổng hợp (tai_chinh)
- Nhân sự (nhan_su)
- Nhật ký (nhat_ky)
- Cài đặt (cai_dat)

Mặc định nhân viên XEM được:
- 📔 Nhật ký công việc (đầy đủ read/write/delete) · Hồ sơ gà · Gia phả · Sinh sản · Giống · Tiêm phòng · Kho thuốc · Kho thức ăn · Vần gà · Bán ra · Khách hàng · Tài sản/CCDC · AI Marketing (read-only) · QR

Ngoài ra có 1 vai trò ẩn: 🌐 Super-admin (SaaS owner). Phân biệt qua env var SUPER_ADMIN_EMAILS — không phải role DB.`,
      },
      {
        title: 'Offline & Sync',
        content: `- App tự cache dữ liệu đã xem (service worker /sw.js)
- Khi mất mạng, các thao tác tạo/sửa được đưa vào hàng đợi IndexedDB
- Khi có mạng lại, hệ thống tự đồng bộ — không mất dữ liệu
- Xem trạng thái ở góc dưới trái: 🟢 Online | 🟡 N yêu cầu chờ | 🔴 Offline

Tip: lúc đi chuồng (vùng kém sóng), cứ thao tác bình thường — đồng bộ sau khi về nhà có wifi.`,
      },
    ],
  },
  {
    role: 'chu_trai',
    title: '👑 Dành cho chủ trại',
    items: [
      {
        title: 'Dashboard tổng quan',
        content: `Vào /admin để xem:
- KPI cards: Tổng đàn đang nuôi, Cần tiêm hôm nay, Đến tuổi bán, Doanh thu tháng
- Greeting + công việc nổi bật trong ngày (chip pill)
- Top cảnh báo chưa đọc (sắp xếp theo priority)
- Biểu đồ vòng đời đàn (Cách ly → Đang nuôi → Đến tuổi bán → Đã bán)
- Tỷ lệ sống theo khu (bar chart)
- Doanh thu vs Chi phí 6 tháng (composed chart)
- Activity feed: gà mới, đơn bán mới, đơn nhập mới
- Alert sắp hết kho thuốc / thức ăn`,
      },
      {
        title: '📔 Nhật ký công việc (Diary)',
        content: `Vào /admin/nhat-ky-cong-viec — module ghi nhật ký hằng ngày, KHÁC với /admin/nhat-ky (audit log auto của hệ thống). Cả chủ trại lẫn nhân viên đều dùng để ghi lại hoạt động, quan sát, sự việc trong ngày.

11 loại nhật ký với gradient + emoji riêng:
🐓 Chăm sóc · 🌾 Cho ăn · 🧽 Vệ sinh · 🥊 Huấn luyện · 🥚 Sinh sản · 💉 Thú y · 💵 Kinh doanh · ⚠️ Sự cố · 👁 Quan sát · 📋 Công việc · 📝 Khác

Mỗi entry có:
- Tiêu đề (tuỳ chọn) + nội dung (max 10.000 ký tự)
- 5 mood: 😄 Rất tốt · 🙂 Tốt · 😐 Bình thường · 😟 Lo lắng · 😞 Rất xấu
- 8 thời tiết: ☀️ ⛅ 🌧 💨 🥶 🥵 💧 🌫
- Thẻ tự do (vd "lứa T4", "Hổ Vương", "khu A2") — tạo tag cloud filter
- Gắn khu / vị trí (optional)
- Ngày + ghim 📌 lên đầu

4 tính năng nâng cao:
1. 🖼 UPLOAD ẢNH — kéo thả hoặc chọn nhiều file (PNG/JPG/WEBP, max 5MB/ảnh, tối đa 10/entry). Click thumbnail → lightbox full-screen.
2. 👥 MENTION @nhân viên — gõ "@Tên" trong nội dung → hiển thị highlight xanh. Hoạt động trong cả entry + comment.
3. 💬 COMMENTS THREAD — mỗi entry có nút "💬 N comment" → expand inline. Trao đổi nhanh giữa chủ trại và nhân viên về sự việc cụ thể. Tác giả + chủ trại xoá được.
4. 🤖 AI TÓM TẮT — bấm "🤖 Tóm tắt AI" trên hero → AI Gemini đọc nhật ký 7/30/90 ngày → đưa ra: Tổng quan + ✨ Điểm nổi bật + ⚠️ Cần lưu ý (severity) + 🔍 Mẫu hình phát hiện + 🚀 Đề xuất hành động (priority).

Filter:
- Preset thời gian: 7 / 30 / 90 ngày · Năm nay · Tất cả
- Lọc theo loại / mood / tác giả / search (không dấu) / tag cloud
- Timeline group theo ngày, ghim trên đầu

Quyền: nhân viên đầy đủ read/write/delete entries của mình; chủ trại quản tất cả farm.`,
      },
      {
        title: '💰 Quản lý quỹ (module độc lập)',
        content: `Vào /admin/quy — module riêng để theo dõi tiền mặt + ngân hàng + ví điện tử (tách khỏi Báo cáo để truy cập 1 click).

3 trang con:
- /admin/quy → Dashboard quỹ: hero gradient, tổng số dư, KPI thu/chi tháng, chart 30 ngày, 10 giao dịch gần nhất, 3 nút lớn (📥 Thu nhanh · 📤 Chi nhanh · 🔄 Chuyển khoản)
- /admin/quy/giao-dich → Sổ giao dịch: filter chip (Tháng này/30 ngày/Quý/Năm), filter tài khoản/loại/danh mục, group theo ngày, có thể xoá
- /admin/quy/tai-khoan → Quản lý tài khoản: CRUD với 18 emoji + 8 màu gradient. Mặc định seed sẵn "Két tiền mặt" + "Vietcombank"

Modal thu/chi đẹp:
- Toggle Nhập/Xuất gradient đổi màu (xanh/đỏ)
- Quick reasons (Bán gà · Mua vào · Lương · Sửa chữa...)
- Auto link với hạng mục chi phí (kết nối báo cáo P&L)
- Preview số dư sau giao dịch

13 phân loại giao dịch: sale, purchase, expense, payroll, transfer_in/out, transfer_fee, opening, adjustment, capital_in/out, loan_in/out, other.`,
      },
      {
        title: '🛠 Tài sản & Công cụ dụng cụ',
        content: `Vào /admin/tai-san — quản lý 2 loại tài sản:
- TSCĐ (Tài sản cố định): máy ấp trứng, lò sưởi, máy phát điện, tủ lạnh thuốc, camera, hệ thống nước, xe máy... có khấu hao
- CCDC (Công cụ dụng cụ): cân, kéo cắt cánh, găng tay, ủng, kim tiêm, đèn úm... phân bổ dần

Tính năng:
- Hero gradient với tổng giá trị còn lại + 4 KPI (TSCĐ, CCDC, Cần bảo trì, Hỏng)
- Filter chip 📚 Tất cả / 🏭 TSCĐ / 🛠 CCDC + dropdown trạng thái + vị trí + search
- View lưới (cards có gradient + emoji theo phân loại + progress bar khấu hao) hoặc bảng
- 16 phân loại sẵn: máy ấp/nở · lò sưởi · máy phát điện · tủ lạnh · camera · hệ thống nước · công trình · phương tiện · thiết bị VP · dụng cụ chăn nuôi · đồ bảo hộ · dụng cụ thú y · vệ sinh · cân đo · chiếu sáng · khác

Trang detail /admin/tai-san/[id]:
- Hero gradient + 4 stat (Giá mua, Còn lại, Khấu hao %, Tổng chi phí)
- 6 quick action (Bảo trì · Sửa chữa · Sự cố · Kiểm kê · Chuyển vị trí · Ghi chú) với gradient riêng
- Status changer 5 nút (Đang dùng / Đang sửa / Hỏng / Chờ thanh lý / Đã thanh lý)
- Timeline events theo thời gian
- Khấu hao straight-line tự động tính trong DB view

5 trạng thái: dang_dung · cho_sua · hong · cho_ban · da_thanh_ly.`,
      },
      {
        title: '📊 Báo cáo tổng hợp (HUB MỚI)',
        content: `Vào /admin/tai-chinh — trung tâm tất cả báo cáo của trang trại (đã đổi từ "Tài chính" cũ).

Hero: tổng quan tháng + 4 KPI (Doanh thu, Chi phí, Lợi nhuận, Tổng quỹ) + so sánh với tháng trước.

Banner 🤖 lớn link sang Phân tích AI.

4 nhóm báo cáo (cards có gradient riêng + 📥 Excel · 📄 PDF · 🖨 In):

1. 💰 TÀI CHÍNH (6 báo cáo):
   - 💰 Lãi/Lỗ (P&L) — /admin/tai-chinh/bao-cao/pnl
   - 📈 Xu hướng 6 tháng — /admin/tai-chinh/bao-cao/xu-huong
   - 💸 Dòng tiền — /admin/tai-chinh/bao-cao/dong-tien (kèm xuất Sổ quỹ + Nhật ký thu / chi)
   - 🧾 Chi phí 8 hạng mục — /admin/tai-chinh/bao-cao/chi-phi
   - 🐓 Giá vốn từng con — /admin/tai-chinh/bao-cao/gia-von
   - ⚠️ Công nợ khách hàng — /admin/tai-chinh/bao-cao/cong-no

2. 🐓 HOẠT ĐỘNG CHĂN NUÔI (2 báo cáo):
   - 🐓 Báo cáo về đàn gà — /admin/tai-chinh/bao-cao/dan-ga (đầu/cuối kỳ + sinh + bán + chết + theo giống/khu)
   - 📦 Nhập xuất tồn gà — /admin/tai-chinh/bao-cao/nhap-xuat-ton

3. 📦 KHO HÀNG (4 link cross-module):
   - 🌾 Kho thức ăn — /admin/kho-thuc-an/bao-cao
   - 💊 Kho thuốc — /admin/kho-thuoc/bao-cao
   - 📥 Nhập hàng — /admin/mua-vao/bao-cao
   - 💵 Bán hàng — /admin/ban-ra/bao-cao

4. 🛠 TÀI SẢN (1 báo cáo):
   - 🛠 TSCĐ + CCDC — /admin/tai-chinh/bao-cao/tai-san

Tất cả báo cáo có thể: Print, Export Excel/CSV, một số có Export PDF (font Roboto VN).`,
      },
      {
        title: '🤖 Phân tích AI báo cáo (Trợ lý chuyên gia)',
        content: `Vào /admin/tai-chinh/phan-tich-ai — Gemini AI đóng vai chuyên gia tài chính 15 năm kinh nghiệm gà chọi VN, đọc số liệu báo cáo của bạn rồi đưa nhận định.

Yêu cầu: đã setup Gemini API key trong Cài đặt → Tích hợp AI.

Cách dùng:
1. Chọn kỳ phân tích (Tháng này / Tháng trước / Quý / Năm)
2. Xem 8 KPI compare cards (kỳ này vs kỳ trước, có arrow up/down %)
3. Bấm "🚀 Phân tích ngay" → AI chạy 10-20s

Output AI hiển thị:
- 🎯 Score gauge tròn 0-100 với verdict + chỉ tiêu nổi bật
- ✅ Điểm mạnh đang phát huy tốt
- ⚠️ Điểm yếu / chưa đạt
- 🛠 Cần cải thiện (kèm priority CAO/TB/THẤP)
- 🔔 Lưu ý quản trị (severity 🔴 NẶNG / 🟡 VỪA / 🟢 NHẸ)
- 🚀 Hành động đề xuất tháng tới (3-6 đầu việc kèm expected_impact ước lượng bằng số)
- 📋 Bảng đánh giá chi tiết 8 KPI (good/warning/bad/neutral)

AI tổng hợp 30+ KPI từ 9 phần hành: chickens, sales, expenses, treasury, assets, payroll, vaccinations, breeding_litters, customer_receivables.

Tip: chạy phân tích đầu mỗi tháng để có roadmap rõ ràng cho tháng tới.`,
      },
      {
        title: 'Quản lý nhân viên (chấm công · bảng công · lương · phân quyền)',
        content: `Vào /admin/nhan-su:
- 👥 Danh sách nhân viên + KPI (đang hoạt động, chấm công hôm nay, đang làm)
- Self check-in / check-out cho chính chủ trại
- Bộ lọc thông minh: tìm theo tên/SĐT, lọc theo vai trò / trạng thái / hôm nay
- Card mỗi nhân viên: ngày & giờ công tháng, lương cơ bản, badge "đang làm" pulse

Sub-routes:
- 🗓️ /admin/nhan-su/bang-cong: bảng công cả tháng — cơ sở chốt lương, có lọc theo year/month
- 💰 /admin/nhan-su/luong: chốt lương tháng → tự động ghi vào chi phí nhân công của báo cáo P&L
- 🔐 /admin/nhan-su/phan-quyen: cấu hình quyền Read/Write/Delete cho từng nhân viên trên từng module

Tạo tài khoản nhân viên mới: dùng Supabase Studio → Authentication → Add user, sau đó update profile role:
UPDATE profiles SET role='nhan_vien', full_name='...', phone='...' WHERE id='<user_id>'`,
      },
      {
        title: 'Thư viện giống',
        content: `Vào /admin/giong để CRUD giống:
- Thêm giống: code (vd: asil), tên VN, xuất xứ, phân khúc (cao_cap/trung_cap/pho_thong/dac_biet), ảnh URL
- Giống có gà đang nuôi → không thể xóa, chỉ tắt is_active
- Thông tin giống hiển thị ở public /giong (SEO landing) và dùng cho dropdown chọn giống khi tạo gà / lứa sinh sản`,
      },
      {
        title: 'AI Marketing — tự sinh nội dung Zalo / Facebook',
        content: `Yêu cầu: đã cấu hình Gemini API key ở Cài đặt → Tích hợp AI.

Vào /admin/ai-marketing để:
- Sinh post quảng cáo Zalo / Facebook / Website cho từng con gà — chọn tone (chuyên nghiệp / thân thiện / hấp dẫn)
- Tự động kèm thông tin trại (tên, hotline, Zalo) lấy từ Cài đặt
- Preview → copy → dán sang nền tảng

Thư viện ảnh dùng cho post: /admin/thu-vien — upload + watermark tự động (tên trại + website từ Cài đặt).`,
      },
      {
        title: '📚 Bí Kíp Sư Kê (35 bài)',
        content: `Vào /admin/bi-kip-su-ke — quản lý bộ 35 bài bí kíp đào tạo sư kê (kinh nghiệm chăm sóc, chiến đấu, dinh dưỡng, vần gà...).

Tính năng:
- Editor markdown đầy đủ, AI viết bài (nếu có Gemini)
- Public hiển thị ở /bi-kip-su-ke với layout đẹp + breadcrumb + table of contents
- Có chống copy: CSS user-select:none + JS chặn keyboard shortcut + chặn right-click → bảo vệ kiến thức trại
- Phân loại theo category: dinh-duong, vong-doi, ky-thuat, chien-thuat, suc-khoe...

Chỉ chủ trại có quyền edit. Public mở cho mọi người (tăng SEO, tăng tin cậy thương hiệu).`,
      },
      {
        title: 'Tin tức (blog SEO)',
        content: `Vào /admin/tin-tuc:
- Bộ lọc thông minh: search không dấu (title + excerpt + slug + tags) · trạng thái · category · AI/Human · có ảnh bìa
- Sort: mới nhất / nhiều view / tiêu đề / cũ nhất
- View Lưới (cover image card) hoặc Danh sách
- Bulk publish / draft / archive / delete

Tạo bài:
- ✨ /admin/tin-tuc/them-moi?mode=ai — AI Gemini tự sinh bài chuẩn SEO theo chủ đề
- + /admin/tin-tuc/them-moi — viết tay với editor + auto slug

6 category: tin-tuc, kinh-nghiem, su-kien, giong-ga, cham-soc — bài "đã đăng" hiện trên public /tin-tuc.`,
      },
      {
        title: 'Thư viện trang trại',
        content: `Vào /admin/thu-vien:
- Upload ảnh / video giới thiệu farm — auto watermark theo Cài đặt
- 3 view: Lưới / Compact / Danh sách
- Lọc thông minh theo chủ đề, sắp xếp display_order, bulk hide/delete
- Hiển thị public ở /thu-vien để khách tham quan trại online

Mục đích: thay vì để khách hàng phải đến trại thật mới xem được, đăng tour ảo lên web để tăng tin cậy → tăng đơn online.`,
      },
      {
        title: 'In thẻ QR cho gà',
        content: `Vào /admin/generate-qr:
- KPI: Tổng đã tạo / Chưa dùng / Đang dùng / Hỏng-mất + progress bar phân bổ
- Bấm ✨ "Gợi ý: tiếp theo {N}" để tự động chọn dải tiếp theo dải đã có (tránh trùng)
- Preset nhanh: 1 / 2 / 5 / 10 / 20 trang (mỗi trang A4 = 36 thẻ)
- Mini preview A4 4×9 ô để hình dung số trang
- "📥 Tạo & tải PDF" → download → in actual size (KHÔNG fit-to-page) → kẹp thẻ vào chân gà

Sau khi kẹp thẻ, gắn QR với hồ sơ con khi tạo gà mới (form Hồ sơ gà → field "QR tag") hoặc khi tốt nghiệp lứa sinh sản (Sinh sản → Tốt nghiệp). Quản lý vòng đời thẻ ở /admin/qr-tags.`,
      },
      {
        title: 'Backup dữ liệu',
        content: `Vào Cài đặt → 💾 Sao lưu dữ liệu:
- Bấm "Tải backup Excel" → file .xlsx multi-sheet chứa ~40 bảng nghiệp vụ:
  Core: profiles · areas · cage_rows · cages · breeds · qr_tags · chickens · breeding_litters · chick_groups
  Sức khỏe: vaccines · vaccinations · medicines · medicine_transactions · feeds · feed_transactions · diseases · disease_outbreaks · training_sessions
  Kinh doanh: suppliers · purchases · purchase_items · customers · sales_orders · sales_items · expense_categories · expenses
  Tiền: cash_accounts · cash_transactions · cash_transfers · payment_settings · subscription_orders
  Tài sản: assets · asset_events
  Nhân sự: staff_attendance · staff_assignments · payroll_payments
  Khác: activity_logs · alerts · customer_reviews · system_settings · backup_logs · news_articles · farm_media · ai_generations · push_subscriptions · landing_settings · farms · diary_entries · diary_comments · signup_throttle

- Mỗi lần backup được ghi vào bảng backup_logs (audit)
- Khuyến nghị: backup cuối tuần và trước mỗi thay đổi lớn (import lô gà mới, đổi giá)
- File backup với 5000 con: ~25–120 MB

Lưu ý: media (ảnh/video) KHÔNG nằm trong file Excel — backup riêng qua Drive folder (cấu hình Drive ID ở Cài đặt → Thông tin trang trại).`,
      },
    ],
  },
  {
    role: 'nhan_vien',
    title: '👷 Dành cho nhân viên',
    items: [
      {
        title: '📔 Ghi nhật ký công việc hằng ngày',
        content: `Vào /admin/nhat-ky-cong-viec (link "📔 Nhật ký công việc" trong sidebar group Tổng quan).

Cuối ngày dành 5-10 phút ghi lại những gì đã làm + sự việc xảy ra. Mai sáng chủ trại đọc lại sẽ nắm tình hình ngay.

Ghi gì?
- 🐓 Chăm sóc / cho ăn / vệ sinh chuồng nào
- 💉 Tiêm phòng cho lứa nào, bao nhiêu con
- 🥊 Vần gà nào, kết quả ra sao
- ⚠️ Sự cố: gà ốm, mất điện, hỏng máy → ghim 📌 lên đầu để chủ trại không bỏ sót
- 👁 Quan sát: thời tiết bất thường, hành vi đàn lạ

Tip viết nhật ký nhanh:
- Tiêu đề chỉ là tóm tắt 1 câu, ko bắt buộc
- Nội dung viết tự do, có thể vài dòng
- Chọn 😄/🙂/😐/😟/😞 để chủ trại cảm nhận tâm trạng buổi làm
- Chụp ảnh hiện trường → upload kèm (gà ốm, máy hỏng, đường đi mòn...)
- Gõ "@Tên chủ trại" trong nội dung để gọi sự chú ý
- Bấm 💬 dưới entry chủ trại đã ghi để comment / hỏi lại
- Thêm thẻ (tag) như "khu A2", "lứa T4" để mọi người tìm lại nhanh

Đặc biệt: nếu có chuyện cần báo gấp → tạo entry "⚠️ Sự cố" + ghim + viết rõ → chủ trại sẽ thấy ngay khi vào.`,
      },
      {
        title: 'Quét QR ngoài chuồng',
        content: `1. Mở app → vào "Quét QR" (icon camera giữa bottom nav, mobile)
2. Cho phép truy cập camera lần đầu
3. Trỏ camera vào thẻ QR ở chân gà
4. App tự mở hồ sơ con đó — có thể: ghi tiêm, ghi vần, báo chết, cập nhật cân nặng

Tip cho điều kiện kém sóng:
- 📸 /admin/quet-qr/upload — chụp/quay ảnh thẻ rồi upload, hệ thống decode QR từ ảnh — hữu ích khi camera real-time chậm
- App vẫn quét được khi offline (PWA cache)`,
      },
      {
        title: 'Ghi lịch tiêm phòng',
        content: `- Vào /admin/tiem-phong — xem lịch tiêm hôm nay (đầu trang)
- Bấm "Xác nhận đã tiêm" → tự động trừ kho thuốc + ghi lịch sử
- Tiêm muộn: hệ thống vẫn nhận nhưng tính overdue (cảnh báo)
- Xem lịch sử tiêm của 1 con: vào hồ sơ gà → tab tiêm phòng`,
      },
      {
        title: 'Nhập / Xuất kho thuốc & thức ăn',
        content: `Vào /admin/kho-thuoc hoặc /admin/kho-thuc-an → click 📦 Nhập/Xuất ở từng mặt hàng:
- Toggle Nhập (xanh) / Xuất (đỏ) gradient đổi màu
- Nhập số lượng lớn với unit suffix
- Preview tồn sau giao dịch (đỏ nếu vượt tồn)
- Quick reasons: 🐓 Cho gà ăn · 💉 Tiêm phòng · 🚮 Hỏng · 🌡 Trộn cám...
- Auto suggest cost = quantity × cost_per_unit
- Date picker
- Xem 8 giao dịch gần nhất ở dưới (collapsible)`,
      },
      {
        title: 'Chấm công',
        content: `- Vào /admin/nhan-su → card "Chấm công hôm nay"
- 🟢 Check-in mỗi sáng → 🔴 Check-out cuối ngày
- Hệ thống tự tính total_hours và hiển thị giờ realtime trong khi đang làm
- Chủ trại xem được lịch sử của tất cả nhân viên + chốt lương cuối tháng`,
      },
      {
        title: 'Báo gà chết / bệnh',
        content: `- Vào hồ sơ con (qua scan QR hoặc tìm trong /admin/ho-so-ga)
- Đổi trạng thái → "chet" hoặc "dang_cach_ly" → nhập nguyên nhân
- Nếu cùng chuồng có nhiều con bệnh → hệ thống tự tạo outbreak alert (xem /admin/benh để theo dõi)
- Bấm "Báo cách ly" trên hồ sơ → di chuyển con đó vào chuồng cách ly tạm thời`,
      },
    ],
  },
  {
    role: 'technical',
    title: '🔧 Kỹ thuật',
    items: [
      {
        title: 'Cài đặt Gemini API key',
        content: `1. Truy cập https://aistudio.google.com/app/apikey
2. Đăng nhập Google → "Create API key"
3. Copy key (dạng AIza...)
4. Paste vào Cài đặt → Tích hợp AI → "Gemini API Key"
5. Bấm "🧪 Test kết nối" — nếu OK → "💾 Lưu cài đặt"

Free tier (gemini-2.0-flash-exp): 15 request/phút, 1500 request/ngày — đủ cho 1 trang trại quy mô vừa.

Có thể đổi sang model khác (gemini-1.5-flash / gemini-1.5-pro) trong dropdown ngay tại trang Cài đặt nếu cần chất lượng cao hơn (đổi bất cứ lúc nào, không cần redeploy).

Dùng cho: AI Marketing (sinh post Zalo/FB), Tin tức AI Studio, Bí Kíp AI Editor, Phân tích AI báo cáo.`,
      },
      {
        title: '🌐 Multi-tenancy SaaS architecture',
        content: `App đã được convert thành SaaS multi-tenant từ phase 9:
- Mỗi trại là 1 row trong bảng farms (có id, slug, tier, subscription_active, max_chickens, max_users...)
- Mọi bảng nghiệp vụ có cột farm_id NOT NULL + RLS policy isolation theo current_farm_id()
- profiles.farm_id link user → farm
- Helper SQL: public.current_farm_id() resolve farm của user đang đăng nhập

4 tier subscription:
- 🎁 trial: 50 gà · 1 user · 14 ngày
- 🥉 basic (199k/tháng): 200 gà · 2 user
- 🥈 pro (499k/tháng): 1.000 gà · 5 user · AI Marketing
- 🥇 enterprise (1.499k/tháng): không giới hạn · API · white-label

Default farm seed: id='00000000-0000-0000-0000-000000000001', tier='enterprise' (cho test).`,
      },
      {
        title: '👑 Super-admin (SaaS Owner)',
        content: `Super-admin = chủ phần mềm (người vận hành gachoivietnb.com), khác chu_trai (chủ 1 trại).

Cấu hình: env var SUPER_ADMIN_EMAILS (CSV list email).
Hiện tại: admin@gachoivietnb.com, haunau486@gmail.com.

Truy cập:
- /admin/super-admin → Dashboard tất cả farms (MRR, churn, top farms, signups mới)
- /admin/super-admin/farms → list + filter + chi tiết từng farm + actions (set tier, extend, cancel, reactivate)
- /admin/super-admin/landing → CMS sửa pricing/testimonials/FAQ trên trang /phan-mem
- /admin/super-admin/payments → form khai báo TK ngân hàng nhận tiền (Vietcombank, MoMo, Casso...)
- /admin/super-admin/orders → list đơn nâng gói chờ xác nhận → click "✅ Xác nhận đã nhận" → tự active farm

Super-admin client server-side dùng service_role key (bypass RLS) — chỉ gọi sau requireSuperAdmin().`,
      },
      {
        title: '💳 Payment & Subscription flow',
        content: `Free trial: /phan-mem → CTA → /auth/signup → form farm-signup atomic (auth user + farm trial 14d + profile chu_trai) → auto signin → /admin.

Paid (manual confirm):
1. User: /admin/upgrade → chọn tier × tháng (1/3/6/12) với discount 0/5/10/17%
2. Submit → tạo subscription_orders row (status=pending, payment_note unique GCV<yymmdd><6digit>)
3. Redirect /admin/payment/[orderId] → hiển thị VietQR (img.vietqr.io) + thông tin TK + nút copy + polling 8s
4. User chuyển khoản qua app ngân hàng
5. Super-admin: /admin/super-admin/orders → bấm "Xác nhận đã nhận" → confirmOrder() set tier + extend N tháng (cộng dồn nếu còn hạn)
6. Polling phía user → status='paid' → hiển thị "🎉 Thanh toán thành công" → reload /admin

Phase 3 (chưa làm): Casso webhook /api/webhook/casso → match payment_note → auto activate.

Schema: subscription_orders (slot sẵn casso_txn_id, gateway_txn_ref cho tích hợp sau).`,
      },
      {
        title: 'Service Worker & Cache',
        content: `File public/sw.js, CACHE_VERSION='v1'.

3 chiến lược cache:
- API routes (/api/*): network-first, fallback cache khi offline
- Pages (HTML): stale-while-revalidate (hiện ngay, update nền)
- Static (JS/CSS/image): cache-first

Khi deploy phiên bản mới có breaking change ở format dữ liệu cache: tăng CACHE_VERSION trong sw.js → SW activate sẽ xóa cache cũ.

Force clear cache user: DevTools → Application → Storage → Clear site data.`,
      },
      {
        title: 'Recovery từ backup Excel',
        content: `Để restore từ file Excel backup:
1. Đọc từng sheet bằng Excel/Numbers
2. Convert ra CSV
3. Import vào Supabase Studio → Table Editor → Import CSV

Lưu ý thứ tự phụ thuộc (foreign key):
farms → profiles → areas → cage_rows → cages → breeds → qr_tags → chickens → breeding_litters → chick_groups → vaccines/medicines/feeds → vaccinations/transactions → suppliers → purchases → customers → sales_orders → expenses → cash_accounts → cash_transactions → assets → asset_events → staff_attendance → activity_logs → subscription_orders

Media (ảnh/video) phải restore riêng từ Google Drive folder (đã cấu hình ở Cài đặt → Drive folder ID).

Đặc biệt với SaaS: phải set farm_id cho mọi row khi import — không có farm_id sẽ bị RLS reject.`,
      },
      {
        title: 'Local vs Cloud deployment',
        content: `Hiện tại (giai đoạn 1): local Supabase (Docker) + Next.js dev server.

Để chạy local:
\`\`\`bash
wsl -d Ubuntu
cd /mnt/e/GaChoiVietNB/WebApp
supabase start            # khởi Postgres + Auth + Storage
supabase db push --local  # apply migrations 1-19
npm run dev
\`\`\`

Apply tất cả migrations + seed:
\`\`\`bash
node scripts/create-super-admin.mjs   # admin@gachoivietnb.com / SuperAdmin@2026
node scripts/seed-treasury-demo.mjs   # 29 giao dịch quỹ demo
node scripts/seed-assets-demo.mjs     # 12 TSCĐ + 12 CCDC + 31 events
\`\`\`

Để deploy online (giai đoạn 2):
1. Tạo project Supabase cloud (supabase.com)
2. supabase link → supabase db push để đẩy migrations
3. Copy env vars (SUPABASE_URL, SUPABASE_ANON_KEY, SERVICE_ROLE, GEMINI_API_KEY, RESEND_API_KEY, VAPID keys, GOOGLE_DRIVE_*, SUPER_ADMIN_EMAILS) vào Vercel
4. Deploy Next.js lên Vercel
5. Cấu hình domain gachoivietnb.com (DNS A/CNAME tới Vercel)
6. Cập nhật Site URL + Redirect URL trong Supabase Auth settings
7. Generate VAPID keys mới cho production: npx web-push generate-vapid-keys

Xem chi tiết trong file kế hoạch phan_1 (giai đoạn deploy online).`,
      },
      {
        title: 'Migrations applied',
        content: `22 migrations đã apply (theo thứ tự thời gian):
1-9. Phase 1-7 cũ (schema gốc, AI, push, audit fixes)
10. news_articles (blog SEO)
11. litter_code_max_seq (fix bug duplicate code)
12. multitenancy_schema (farms + farm_id columns)
13. multitenancy_rls (RLS theo farm)
14. multitenancy_triggers (auto-fill farm_id)
15. landing_settings (CMS landing /phan-mem)
16. update_handle_new_user (fix trigger sau multi-tenancy)
17. payment_orders (payment_settings + subscription_orders)
18. treasury (cash_accounts + cash_transactions + cash_transfers + view balances)
19. assets (TSCĐ + CCDC + asset_events + view depreciation)
20. signup_throttle (audit log + rate limit chống bot signup)
21. diary_entries (nhật ký công việc + 11 category enum + mood enum + tags array gin index)
22. diary_storage_comments (Storage bucket "diary-media" + bảng diary_comments)

Mỗi migration có RLS, auto-fill farm_id, indexes phù hợp.`,
      },
    ],
  },
]

export default function HuongDanPage() {
  return (
    <div className="max-w-5xl">
      <div className="mb-5">
        <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
          ❓ Hướng dẫn sử dụng
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Trung tâm trợ giúp · Tìm theo từ khoá · Lọc theo vai trò · Highlight đoạn khớp
        </p>
      </div>

      <HuongDanClient sections={SECTIONS} />
    </div>
  )
}
