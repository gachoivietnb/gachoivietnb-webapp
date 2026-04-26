import Link from 'next/link'
import type { Metadata } from 'next'
import { getLandingContent, type PricingTier, type Testimonial, type Faq } from '@/lib/landing/content'

export const metadata: Metadata = {
  title: 'Phần mềm quản lý trang trại gà chọi #1 Việt Nam | Gà Chọi Việt Ninh Bình',
  description:
    'Hệ thống quản lý trang trại gà chọi toàn diện: hồ sơ gà · gia phả 5 đời · tiêm phòng · vần gà · tài chính · AI Marketing · Bí Kíp Sư Kê 35 bài. Dùng thử miễn phí 14 ngày.',
  keywords: [
    'phần mềm quản lý gà chọi',
    'phần mềm trang trại gà chọi',
    'phần mềm quản lý gà nòi',
    'app quản lý gà chọi',
    'hệ thống gia phả gà chọi',
    'phần mềm tiêm phòng gà',
  ],
  openGraph: {
    title: 'Phần mềm quản lý trang trại gà chọi #1 Việt Nam',
    description:
      'Số hoá toàn bộ trang trại gà chọi của bạn — từ hồ sơ, gia phả, tiêm phòng đến tài chính và marketing AI.',
    type: 'website',
  },
}

export const revalidate = 3600

export default async function PhanMemLandingPage() {
  const { pricing, testimonials, faqs } = await getLandingContent()
  return (
    <div className="bg-white dark:bg-gray-950">
      <Hero />
      <StatsBar />
      <Pains />
      <FeaturesGrid />
      <HowItWorks />
      <Spotlights />
      <PricingSection pricing={pricing} />
      <Testimonials testimonials={testimonials} />
      <FAQ faqs={faqs} />
      <FinalCTA />
    </div>
  )
}

/* ============================================================ */
/*  HERO                                                        */
/* ============================================================ */
function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-orange-50 via-rose-50 to-amber-50 dark:from-gray-900 dark:via-orange-950/20 dark:to-rose-950/20 pt-12 md:pt-20 pb-16">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 -left-20 w-96 h-96 bg-orange-300/30 dark:bg-orange-600/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-rose-300/30 dark:bg-rose-600/15 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-amber-300/20 dark:bg-amber-600/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-10 items-center">
          {/* Left: Copy */}
          <div>
            <div className="inline-flex items-center gap-2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-orange-200 dark:border-orange-900 rounded-full px-3 py-1 text-xs font-semibold text-orange-700 dark:text-orange-300 mb-5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              🚀 Đang hoạt động · 30+ module · 🤖 Trợ lý AI · cập nhật 2026
            </div>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-gray-100 leading-[1.1] tracking-tight">
              Quản lý trang trại gà chọi{' '}
              <span className="bg-gradient-to-r from-red-600 via-orange-600 to-amber-500 bg-clip-text text-transparent">
                như một CEO
              </span>
            </h1>
            <p className="text-lg md:text-xl text-gray-700 dark:text-gray-300 mt-5 leading-relaxed max-w-2xl">
              Số hoá toàn bộ trang trại — hồ sơ gà · gia phả 5 đời · tiêm phòng · vần gà · quản lý quỹ ·
              tài sản · 9 loại báo cáo · <b className="text-violet-600 dark:text-violet-400">trợ lý AI phân tích</b> ·
              📔 nhật ký công việc · AI Marketing · Bí Kíp Sư Kê. Một hệ thống duy nhất, dùng trên cả máy tính lẫn điện thoại.
            </p>

            <div className="flex flex-wrap gap-3 mt-7">
              <Link
                href="/auth/signup?tier=trial"
                className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white rounded-xl px-6 py-3.5 font-bold shadow-xl shadow-orange-500/30 hover:shadow-2xl hover:scale-105 transition text-base"
              >
                🎁 Dùng thử miễn phí 14 ngày
              </Link>
              <a
                href="#features"
                className="bg-white dark:bg-gray-800 border-2 border-orange-300 dark:border-orange-800 text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/30 rounded-xl px-6 py-3.5 font-bold transition text-base"
              >
                📺 Xem tính năng →
              </a>
            </div>

            <div className="flex items-center gap-5 mt-6 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-1.5">
                <span className="text-emerald-600">✓</span> Không cần thẻ tín dụng
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-emerald-600">✓</span> Setup trong 10 phút
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-emerald-600">✓</span> Hỗ trợ 24/7
              </div>
            </div>
          </div>

          {/* Right: Hero mockup */}
          <div className="relative">
            <DashboardMockup />
          </div>
        </div>
      </div>
    </section>
  )
}

function DashboardMockup() {
  return (
    <div className="relative">
      {/* Glow */}
      <div className="absolute -inset-4 bg-gradient-to-br from-orange-400 to-rose-600 rounded-3xl blur-2xl opacity-20" />

      <div className="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Browser chrome */}
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          </div>
          <div className="flex-1 text-center text-[10.5px] text-gray-500 dark:text-gray-400 font-mono">
            🔒 gachoivietnb.com/admin
          </div>
        </div>

        {/* Mockup body */}
        <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 text-white flex items-center justify-center font-bold text-sm shadow">
              G
            </div>
            <div>
              <div className="text-xs font-bold text-gray-900 dark:text-gray-100">📊 Dashboard</div>
              <div className="text-[10px] text-gray-500">Hôm nay · 26/04/2026</div>
            </div>
            <div className="ml-auto flex gap-1">
              <span className="w-5 h-5 rounded bg-blue-100 dark:bg-blue-950/40 text-[10px] flex items-center justify-center">🔔</span>
              <span className="w-5 h-5 rounded bg-emerald-100 dark:bg-emerald-950/40 text-[10px] flex items-center justify-center">👤</span>
            </div>
          </div>

          {/* KPI */}
          <div className="grid grid-cols-4 gap-1.5 mb-3">
            <MockKpi label="Tổng đàn" value="847" emoji="🐓" tone="from-blue-500 to-indigo-500" />
            <MockKpi label="Cần tiêm" value="12" emoji="💉" tone="from-rose-500 to-red-500" pulse />
            <MockKpi label="Đến tuổi bán" value="34" emoji="💰" tone="from-amber-500 to-orange-500" />
            <MockKpi label="DT tháng" value="48M" emoji="📈" tone="from-emerald-500 to-teal-500" />
          </div>

          {/* Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-2.5 border border-gray-200 dark:border-gray-700 mb-2">
            <div className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              📊 Doanh thu vs Chi phí 6 tháng
            </div>
            <div className="flex items-end gap-1 h-16">
              {[40, 55, 35, 70, 65, 85].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col gap-0.5 items-stretch">
                  <div
                    className="bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t-sm"
                    style={{ height: `${h}%` }}
                  />
                  <div
                    className="bg-gradient-to-t from-rose-500 to-rose-400 rounded-t-sm"
                    style={{ height: `${h * 0.6}%` }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Bottom mini cards */}
          <div className="grid grid-cols-3 gap-1.5">
            <MockMini label="🌳 Gia phả" value="5 đời" />
            <MockMini label="📷 Quét QR" value="Live" />
            <MockMini label="✨ AI" value="ON" />
          </div>
        </div>
      </div>

      {/* Floating badges */}
      <div className="absolute -top-3 -right-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg animate-pulse">
        ✓ ĐANG HOẠT ĐỘNG
      </div>
      <div className="absolute -bottom-3 -left-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Realtime sync
      </div>
    </div>
  )
}

function MockKpi({
  label,
  value,
  emoji,
  tone,
  pulse,
}: {
  label: string
  value: string
  emoji: string
  tone: string
  pulse?: boolean
}) {
  return (
    <div className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-md p-1.5 border border-gray-200 dark:border-gray-700">
      <div
        className={`absolute -right-3 -top-3 w-10 h-10 rounded-full bg-gradient-to-br ${tone} opacity-20 blur-md ${
          pulse ? 'animate-pulse' : ''
        }`}
      />
      <div className="relative">
        <div className="text-[8px] text-gray-500 dark:text-gray-400">
          {emoji} {label}
        </div>
        <div className="text-sm font-bold text-gray-900 dark:text-gray-100 tabular-nums">
          {value}
        </div>
      </div>
    </div>
  )
}

function MockMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded p-1.5 border border-gray-200 dark:border-gray-700 text-center">
      <div className="text-[8px] text-gray-500 dark:text-gray-400">{label}</div>
      <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">{value}</div>
    </div>
  )
}

/* ============================================================ */
/*  STATS BAR                                                   */
/* ============================================================ */
function StatsBar() {
  return (
    <section className="bg-gray-900 dark:bg-black text-white py-10 border-y border-gray-800">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <Stat number="23+" label="Module quản trị" sub="Toàn diện A-Z" />
          <Stat number="5 đời" label="Gia phả minh bạch" sub="Mỗi con 1 cây phả" />
          <Stat number="35" label="Bài Bí Kíp Sư Kê" sub="~70.000 từ kiến thức" />
          <Stat number="24/7" label="Hỗ trợ kỹ thuật" sub="Zalo · Hotline · Email" />
        </div>
      </div>
    </section>
  )
}

function Stat({ number, label, sub }: { number: string; label: string; sub: string }) {
  return (
    <div>
      <div className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-orange-400 to-rose-400 bg-clip-text text-transparent">
        {number}
      </div>
      <div className="text-sm font-semibold text-gray-200 mt-1">{label}</div>
      <div className="text-[11px] text-gray-500 mt-0.5">{sub}</div>
    </div>
  )
}

/* ============================================================ */
/*  PAIN POINTS                                                 */
/* ============================================================ */
function Pains() {
  const pains = [
    {
      emoji: '📓',
      title: 'Quản lý bằng sổ tay → mất sổ là mất hết',
      desc: 'Hàng trăm con gà với mã, ngày sinh, dòng máu — chỉ ghi tay là sai sót và thất lạc',
    },
    {
      emoji: '💉',
      title: 'Không nhớ con nào tiêm vaccine, con nào chưa',
      desc: 'Sai lịch tiêm = dịch bệnh = chết hàng loạt = mất tiền tỷ',
    },
    {
      emoji: '📊',
      title: 'Tính lãi/lỗ phải mở 10 file Excel',
      desc: 'Cuối tháng không biết thực sự lãi bao nhiêu, chi phí ở đâu, nuôi giống nào lời nhất',
    },
    {
      emoji: '🌳',
      title: 'Khách hỏi gia phả mà không có',
      desc: 'Gà thuần chủng giá cao gấp 3-5 lần gà thường, nhưng không có gia phả thì chứng minh sao?',
    },
    {
      emoji: '👷',
      title: 'Nhân viên kê khống chấm công',
      desc: 'Trả lương theo trí nhớ, không có log chính xác giờ vào / giờ ra',
    },
    {
      emoji: '✍️',
      title: 'Bài quảng cáo Zalo viết tay mỗi lần',
      desc: 'Mỗi lần đăng bán phải nghĩ caption, mất 30 phút/bài, mà còn không hấp dẫn',
    },
  ]
  return (
    <section className="container mx-auto px-4 py-16">
      <div className="text-center mb-12 max-w-3xl mx-auto">
        <span className="inline-block text-xs font-bold tracking-widest text-rose-600 dark:text-rose-400 uppercase mb-2">
          ⚠️ Vấn đề bạn đang gặp
        </span>
        <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
          Trang trại nhỏ thì sổ tay,{' '}
          <span className="text-rose-600 dark:text-rose-400">lớn lên thì... cuồng quay</span>
        </h2>
        <p className="text-base md:text-lg text-gray-600 dark:text-gray-400 mt-4">
          Đây là 6 nỗi đau chung của 90% chủ trang trại gà chọi đang phải đối mặt mỗi ngày
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pains.map((p) => (
          <div
            key={p.title}
            className="bg-white dark:bg-gray-800 border border-rose-200 dark:border-rose-900 rounded-xl p-5 hover:shadow-lg hover:border-rose-300 transition group"
          >
            <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">
              {p.emoji}
            </div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base mb-1.5">
              {p.title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{p.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ============================================================ */
/*  FEATURES GRID                                               */
/* ============================================================ */
function FeaturesGrid() {
  const features = [
    {
      emoji: '🐓',
      title: 'Hồ sơ gà chi tiết',
      desc: 'Mỗi con 1 hồ sơ: mã QR, ảnh/video, cân nặng, vaccine, vần gà, lịch sử y tế đầy đủ',
      bar: 'from-blue-500 to-indigo-500',
    },
    {
      emoji: '🌳',
      title: 'Gia phả 5 đời',
      desc: 'Sơ đồ cây gia phả minh bạch, quét QR là thấy bố mẹ ông bà cụ kỵ — chứng minh thuần chủng',
      bar: 'from-emerald-500 to-teal-500',
    },
    {
      emoji: '🏠',
      title: 'Quản lý chuồng trại',
      desc: '3 cấp Khu → Dãy → Chuồng, theo dõi sức chứa, trạng thái, tỷ lệ sống theo khu',
      bar: 'from-amber-500 to-orange-500',
    },
    {
      emoji: '🥚',
      title: 'Sinh sản & ấp trứng',
      desc: 'Ghép đôi, theo dõi trứng/ngày nở dự kiến, tốt nghiệp lứa thành hồ sơ con riêng',
      bar: 'from-pink-500 to-rose-500',
    },
    {
      emoji: '💉',
      title: 'Tiêm phòng tự động',
      desc: '8 loại vaccine theo lịch chuẩn thú y, alert khi đến lịch, tự trừ kho thuốc',
      bar: 'from-cyan-500 to-blue-500',
    },
    {
      emoji: '🥊',
      title: 'Vần gà & huấn luyện',
      desc: 'Lịch tập thể lực, ghi điểm sau mỗi buổi vần, top podium gà có thành tích cao',
      bar: 'from-violet-500 to-purple-500',
    },
    {
      emoji: '🤖',
      title: 'Phân tích AI báo cáo',
      desc: 'Trợ lý AI Gemini đóng vai chuyên gia tài chính 15 năm — chấm điểm, gợi ý 3-6 hành động cho tháng tới',
      bar: 'from-violet-500 to-fuchsia-500',
      badge: 'MỚI',
    },
    {
      emoji: '📊',
      title: '9 báo cáo quản trị',
      desc: 'P&L · Dòng tiền · Chi phí · Giá vốn · Công nợ · Xu hướng · Đàn gà · Nhập xuất tồn · TSCĐ — Excel + PDF',
      bar: 'from-emerald-500 to-green-600',
    },
    {
      emoji: '💰',
      title: 'Quản lý quỹ tiền',
      desc: 'Tiền mặt + ngân hàng + ví điện tử · Sổ quỹ · Nhật ký thu / chi · Xuất Excel + PDF',
      bar: 'from-blue-500 to-indigo-600',
      badge: 'MỚI',
    },
    {
      emoji: '🛠',
      title: 'Tài sản & CCDC',
      desc: 'Quản lý TSCĐ + công cụ dụng cụ · Khấu hao tự động · Lịch bảo trì · Cảnh báo hỏng / quá hạn',
      bar: 'from-amber-500 to-orange-600',
      badge: 'MỚI',
    },
    {
      emoji: '👔',
      title: 'Nhân sự & chấm công',
      desc: 'Check-in/out, bảng công tháng, tự chốt lương → ghi vào báo cáo tài chính',
      bar: 'from-blue-500 to-cyan-500',
    },
    {
      emoji: '✨',
      title: 'AI Marketing',
      desc: 'Gemini AI tự sinh bio bán hàng, bài Zalo/Facebook, bài SEO 600-1000 từ — chỉ cần 1 click',
      bar: 'from-violet-500 to-pink-500',
    },
    {
      emoji: '📚',
      title: 'Bí Kíp Sư Kê',
      desc: 'Cẩm nang 35 bài (~70k từ) từ chọn giống, làm chuồng, dinh dưỡng đến kinh doanh',
      bar: 'from-orange-500 to-red-500',
    },
    {
      emoji: '🔳',
      title: 'In thẻ QR + tài liệu',
      desc: 'Tự tạo PDF 36 thẻ QR/trang A4 · Tài liệu kỹ thuật vòng silicon + thẻ PET đầy đủ',
      bar: 'from-cyan-500 to-blue-500',
    },
    {
      emoji: '📔',
      title: 'Nhật ký công việc + AI',
      desc: 'Ghi nhật ký hằng ngày · upload ảnh · @mention nhân viên · comment thread · 🤖 AI Gemini tóm tắt theo tuần/tháng',
      bar: 'from-cyan-500 to-blue-600',
      badge: 'MỚI',
    },
    {
      emoji: '📷',
      title: 'Quét QR + Mobile/PWA',
      desc: 'Quét thẻ chân gà ngoài chuồng, app cài như native, dùng offline khi mất sóng',
      bar: 'from-fuchsia-500 to-pink-500',
    },
    {
      emoji: '🔔',
      title: 'Push notification',
      desc: 'Cảnh báo dịch bệnh, kho hết thuốc, đơn mới — không bỏ lỡ việc quan trọng',
      bar: 'from-amber-500 to-yellow-500',
    },
  ]

  return (
    <section
      id="features"
      className="relative overflow-hidden bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 py-16"
    >
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 max-w-3xl mx-auto">
          <span className="inline-block text-xs font-bold tracking-widest text-orange-600 dark:text-orange-400 uppercase mb-2">
            ✨ Giải pháp toàn diện
          </span>
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
            Mọi việc trong{' '}
            <span className="bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
              một hệ thống
            </span>
          </h2>
          <p className="text-base md:text-lg text-gray-600 dark:text-gray-400 mt-4">
            17 tính năng cốt lõi · 30+ module phụ trợ · Đủ để chạy trang trại từ 50 đến 10.000 con
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="group relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all"
            >
              {f.badge && (
                <span className="absolute top-3 right-3 z-10 text-[10px] font-extrabold bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full px-2 py-0.5 shadow">
                  {f.badge}
                </span>
              )}
              <div className={`h-1.5 bg-gradient-to-r ${f.bar}`} />
              <div className="p-5">
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">
                  {f.emoji}
                </div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base mb-1.5">
                  {f.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ============================================================ */
/*  HOW IT WORKS                                                */
/* ============================================================ */
function HowItWorks() {
  const steps = [
    {
      n: 1,
      emoji: '📝',
      title: 'Đăng ký tài khoản',
      desc: 'Tạo trại trong 2 phút bằng email. Không cần thẻ tín dụng cho gói dùng thử 14 ngày.',
      tone: 'from-blue-500 to-indigo-500',
    },
    {
      n: 2,
      emoji: '⚙️',
      title: 'Setup ban đầu',
      desc: 'Nhập tên trại, tạo khu/dãy/chuồng, import danh sách gà từ Excel hoặc tạo mới từ đầu. Tổng ~10 phút.',
      tone: 'from-amber-500 to-orange-500',
    },
    {
      n: 3,
      emoji: '🚀',
      title: 'Quản lý hàng ngày',
      desc: 'Quét QR ngoài chuồng, chấm công, ghi tiêm, tạo bài AI, theo dõi tài chính — tất cả từ điện thoại hoặc máy tính.',
      tone: 'from-emerald-500 to-teal-500',
    },
  ]

  return (
    <section className="container mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <span className="inline-block text-xs font-bold tracking-widest text-emerald-600 dark:text-emerald-400 uppercase mb-2">
          🚀 3 bước đơn giản
        </span>
        <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
          Bắt đầu trong <span className="text-emerald-600 dark:text-emerald-400">10 phút</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
        {/* Connecting line (desktop) */}
        <div className="hidden md:block absolute top-12 left-[16.66%] right-[16.66%] h-0.5 bg-gradient-to-r from-blue-300 via-amber-300 to-emerald-300 -z-0" />

        {steps.map((s) => (
          <div
            key={s.n}
            className="relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 text-center hover:shadow-xl transition"
          >
            <div
              className={`w-16 h-16 rounded-full bg-gradient-to-br ${s.tone} text-white flex items-center justify-center text-2xl font-bold mx-auto shadow-lg ring-4 ring-white dark:ring-gray-800 mb-4`}
            >
              {s.n}
            </div>
            <div className="text-4xl mb-2">{s.emoji}</div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">{s.title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ============================================================ */
/*  SPOTLIGHTS (alternating image + text)                       */
/* ============================================================ */
function Spotlights() {
  return (
    <section className="bg-gradient-to-br from-orange-50 via-rose-50 to-amber-50 dark:from-gray-900 dark:via-orange-950/10 dark:to-rose-950/10 py-16">
      <div className="container mx-auto px-4 space-y-16">
        <Spotlight
          tag="🌳 Gia phả minh bạch"
          title="Bằng chứng thuần chủng cho từng con gà"
          desc="Mỗi con đều có cây gia phả 5 đời (bố · mẹ · ông nội · bà ngoại · cụ kỵ). Khách hàng chỉ cần quét QR ở chân gà là thấy ngay nguồn gốc — không thể giả mạo. Đây là yếu tố quyết định để bán gà giá cao 5-10 triệu thay vì 1 triệu."
          bullets={[
            'Cây gia phả interactive · zoom in/out',
            'QR code in trên thẻ chân gà',
            'Tự tính tỷ lệ máu thuần / lai',
            'Chia sẻ link gia phả qua Zalo / Facebook',
          ]}
          mockup={<PedigreeMockup />}
          reverse={false}
        />

        <Spotlight
          tag="✨ AI Marketing"
          title="Gemini AI viết bài Zalo / Facebook trong 30 giây"
          desc="Chọn 1 con gà → AI Gemini tự sinh bài quảng cáo chuẩn SEO theo phong cách bạn chọn (chuyên nghiệp / thân thiện / hấp dẫn). Tích hợp ảnh từ kho watermark của trại. Copy 1 click — dán Zalo / Facebook là đăng được ngay."
          bullets={[
            'Bio bán hàng 200-300 từ',
            'Bài Zalo / Facebook 100-150 từ',
            'Bài SEO blog 600-1000 từ',
            'Tone: chuyên nghiệp / thân thiện / hấp dẫn / kể chuyện',
          ]}
          mockup={<AIMockup />}
          reverse={true}
        />

        <Spotlight
          tag="💰 Tài chính kế toán"
          title="9 báo cáo chuẩn — đỡ mở Excel cả đời"
          desc="Tự động tính lãi/lỗ theo chuẩn kế toán, chi phí 8 hạng mục, dòng tiền chuẩn kế toán, giá vốn từng con (biên lợi nhuận realtime), công nợ khách hàng, báo cáo đàn gà, TSCĐ + CCDC. Mọi báo cáo xuất Excel/PDF chỉ 1 click — dùng đi xưởng / nộp thuế / báo cáo cuối năm."
          bullets={[
            'P&L · Lãi gộp · Lãi ròng',
            'Sổ quỹ · Nhật ký thu / chi · ô ký tên đầy đủ',
            'Báo cáo đàn gà: đầu/cuối kỳ + sinh + bán + chết',
            'TSCĐ + CCDC: khấu hao tự động + bảo trì',
          ]}
          mockup={<FinanceMockup />}
          reverse={false}
        />

        <Spotlight
          tag="🤖 Trợ lý AI quản trị · ĐIỂM KHÁC BIỆT"
          title="Đọc số liệu của bạn như chuyên gia tài chính 15 năm"
          desc="Một mình bạn — nhưng có chuyên gia tài chính chuyên ngành gà chọi đứng sau lưng 24/7. Gemini AI đọc toàn bộ KPI tháng này so với tháng trước (doanh thu, tỷ lệ sống, dòng tiền, công nợ, kho thuốc cận date, tài sản cần bảo trì…) → chấm điểm 0-100, chỉ điểm yếu cụ thể, gợi ý 3-6 hành động đo lường được cho tháng tới."
          bullets={[
            'Score tổng quan + verdict 1-2 câu',
            'Điểm mạnh / yếu / cần cải thiện / lưu ý',
            '3-6 hành động cụ thể + ước lượng tác động (vd "+5tr/tháng")',
            'Bảng đánh giá 8 KPI quan trọng (good/warning/bad)',
          ]}
          mockup={<AiReportMockup />}
          reverse={true}
        />
      </div>
    </section>
  )
}

function Spotlight({
  tag,
  title,
  desc,
  bullets,
  mockup,
  reverse,
}: {
  tag: string
  title: string
  desc: string
  bullets: string[]
  mockup: React.ReactNode
  reverse: boolean
}) {
  return (
    <div
      className={`grid grid-cols-1 lg:grid-cols-2 gap-10 items-center ${
        reverse ? 'lg:[direction:rtl]' : ''
      }`}
    >
      <div className="lg:[direction:ltr]">
        <div className="inline-block text-xs font-bold tracking-widest text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-950/40 rounded-full px-3 py-1 uppercase mb-3">
          {tag}
        </div>
        <h3 className="text-2xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 leading-tight mb-4">
          {title}
        </h3>
        <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed mb-5">{desc}</p>
        <ul className="space-y-2">
          {bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-bold mt-0.5">
                ✓
              </span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="lg:[direction:ltr]">{mockup}</div>
    </div>
  )
}

function PedigreeMockup() {
  return (
    <div className="relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl p-5">
      <div className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
        🌳 Gia phả · Mã 0042
      </div>
      <div className="flex flex-col items-center gap-2">
        {/* Gen 1 */}
        <PedigreeNode label="Hổ Vương" code="0042" tone="from-amber-500 to-orange-500" big />
        <div className="w-0.5 h-3 bg-gray-300" />
        {/* Gen 2 */}
        <div className="flex gap-3">
          <PedigreeNode label="Bố · Hùng Vương" code="0021" tone="from-blue-500 to-indigo-500" />
          <PedigreeNode label="Mẹ · Lan Phượng" code="0019" tone="from-pink-500 to-rose-500" />
        </div>
        <div className="w-0.5 h-2 bg-gray-300" />
        {/* Gen 3 */}
        <div className="grid grid-cols-4 gap-1.5">
          <PedigreeNode label="Ông nội" code="0008" tone="from-blue-400 to-cyan-500" tiny />
          <PedigreeNode label="Bà nội" code="0009" tone="from-pink-400 to-fuchsia-500" tiny />
          <PedigreeNode label="Ông ngoại" code="0007" tone="from-violet-400 to-purple-500" tiny />
          <PedigreeNode label="Bà ngoại" code="0010" tone="from-rose-400 to-red-500" tiny />
        </div>
      </div>
      <div className="mt-3 text-center text-[10px] text-gray-500">
        ✓ Quét QR là khách hàng thấy đầy đủ 5 đời
      </div>
    </div>
  )
}

function PedigreeNode({
  label,
  code,
  tone,
  big,
  tiny,
}: {
  label: string
  code: string
  tone: string
  big?: boolean
  tiny?: boolean
}) {
  return (
    <div
      className={
        'rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 ' +
        (big ? 'w-32' : tiny ? 'w-16' : 'w-24')
      }
    >
      <div className={`h-1 bg-gradient-to-r ${tone}`} />
      <div className="p-1.5 bg-white dark:bg-gray-900">
        <div
          className={
            'font-mono font-bold text-gray-900 dark:text-gray-100 ' +
            (big ? 'text-sm' : tiny ? 'text-[9px]' : 'text-xs')
          }
        >
          {code}
        </div>
        <div
          className={
            'text-gray-500 dark:text-gray-400 truncate ' +
            (big ? 'text-[10px]' : 'text-[8px]')
          }
        >
          {label}
        </div>
      </div>
    </div>
  )
}

function AIMockup() {
  return (
    <div className="relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden">
      <div className="h-1.5 bg-gradient-to-r from-violet-500 via-pink-500 to-rose-500" />
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 text-white flex items-center justify-center text-base shadow">
            ✨
          </div>
          <div className="text-xs font-bold text-gray-900 dark:text-gray-100">AI Studio</div>
          <span className="ml-auto text-[10px] bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-full px-2 py-0.5 font-bold">
            ✓ ĐANG TẠO
          </span>
        </div>
        <div className="text-[10px] text-gray-500 mb-1">Chủ đề:</div>
        <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-2 text-xs text-gray-800 dark:text-gray-200 mb-2">
          Bí quyết nuôi gà Asil khoẻ mạnh quanh năm
        </div>
        <div className="flex gap-1 mb-3">
          <span className="text-[9px] bg-violet-500 text-white rounded-full px-2 py-0.5 font-semibold">
            🔥 Hấp dẫn
          </span>
          <span className="text-[9px] bg-blue-500 text-white rounded-full px-2 py-0.5 font-semibold">
            👤 Khách mua
          </span>
          <span className="text-[9px] bg-emerald-500 text-white rounded-full px-2 py-0.5 font-semibold">
            📄 800 từ
          </span>
        </div>
        <div className="bg-gradient-to-br from-violet-50 to-pink-50 dark:from-violet-950/30 dark:to-pink-950/30 rounded-lg p-2.5 border border-violet-200 dark:border-violet-900 text-[10px] text-gray-700 dark:text-gray-300 leading-relaxed">
          <p className="font-bold mb-1 text-violet-900 dark:text-violet-100">
            Gà Asil — Chiến binh đến từ Ấn Độ 🐓
          </p>
          <p className="line-clamp-3">
            Nếu bạn đang tìm một dòng gà chọi vừa khoẻ vừa bền, vừa có tướng oai hùng — thì gà
            Asil chính là lựa chọn không thể bỏ qua. Tại trang trại Gà Chọi Việt Ninh Bình, chúng
            tôi đã nuôi giống Asil hơn 10 năm và xin chia sẻ...
          </p>
        </div>
        <div className="mt-2.5 flex gap-1.5">
          <button className="flex-1 text-[9px] bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded px-2 py-1 font-semibold">
            📋 Copy
          </button>
          <button className="text-[9px] bg-cyan-100 text-cyan-700 rounded px-2 py-1 font-semibold">
            💬 Zalo
          </button>
          <button className="text-[9px] bg-blue-100 text-blue-700 rounded px-2 py-1 font-semibold">
            📘 FB
          </button>
        </div>
      </div>
    </div>
  )
}

function FinanceMockup() {
  return (
    <div className="relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden">
      <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
      <div className="p-4">
        <div className="text-xs font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
          💰 P&L · Tháng 04/2026
        </div>

        <div className="space-y-1.5 text-[11px]">
          <Row label="Doanh thu" value="48.500.000" tone="text-blue-600 dark:text-blue-400" />
          <Row label="Giá vốn (-)" value="−12.300.000" tone="text-amber-600 dark:text-amber-400" />
          <div className="border-y border-gray-200 dark:border-gray-700 py-1">
            <Row
              label="Lãi gộp · 74.6%"
              value="36.200.000"
              bold
              tone="text-emerald-600 dark:text-emerald-400"
            />
          </div>
          <Row label="Chi phí (-)" value="−15.800.000" tone="text-rose-600 dark:text-rose-400" />
        </div>

        <div className="mt-3 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-2 border-emerald-300 dark:border-emerald-800 rounded-lg p-3">
          <div className="text-[9px] uppercase tracking-wider text-emerald-700 dark:text-emerald-300 font-bold">
            Lãi ròng · 42.1%
          </div>
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 tabular-nums mt-0.5">
            20.400.000 đ
          </div>
        </div>

        <div className="mt-3 text-[9px] text-gray-500 text-center">
          ✓ Tự tính · Xuất Excel/PDF 1 click
        </div>
      </div>
    </div>
  )
}

function Row({
  label,
  value,
  bold,
  tone,
}: {
  label: string
  value: string
  bold?: boolean
  tone?: string
}) {
  return (
    <div className="flex items-baseline justify-between">
      <span className={'text-gray-700 dark:text-gray-300 ' + (bold ? 'font-bold' : '')}>{label}</span>
      <span className={'tabular-nums ' + (bold ? 'font-bold' : '') + ' ' + (tone ?? '')}>
        {value}
      </span>
    </div>
  )
}

/* AI Report mockup — gradient violet-fuchsia + score gauge + nhận định */
function AiReportMockup() {
  return (
    <div className="relative">
      <div className="absolute -inset-3 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-3xl blur-2xl opacity-25" />
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden">
        {/* Header gradient */}
        <div className="relative bg-gradient-to-br from-violet-600 via-fuchsia-600 to-pink-600 text-white p-4">
          <div className="absolute -top-2 right-3 text-5xl opacity-20">🤖</div>
          <div className="text-[9px] uppercase tracking-widest opacity-80 font-bold">
            🤖 Trợ lý AI · Tháng 04/2026 vs T03/2026
          </div>
          <div className="grid grid-cols-[auto_1fr] gap-3 mt-2 items-center relative">
            {/* Score gauge */}
            <div className="relative w-20 h-20">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="10" />
                <circle
                  cx="50" cy="50" r="42" fill="none"
                  stroke="white" strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={`${(82 / 100) * 264} 264`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-2xl font-black tabular-nums leading-none">82</div>
                <div className="text-[8px] opacity-80 uppercase">/100</div>
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-[9px] bg-white/25 inline-block px-1.5 py-0.5 rounded-full uppercase font-bold tracking-wider">Tốt</div>
              <p className="text-[11px] font-medium leading-snug mt-1 opacity-95">
                &quot;Doanh thu tăng 18%, lợi nhuận tốt. Chú ý kho thuốc 3 loại cận date 30 ngày.&quot;
              </p>
            </div>
          </div>
        </div>

        {/* Body — strengths/weaknesses pills */}
        <div className="p-4 space-y-2.5">
          {/* Điểm mạnh */}
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border-l-3 border-emerald-500 rounded px-2.5 py-1.5">
            <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">
              ✅ Điểm mạnh
            </div>
            <div className="text-[11px] text-gray-700 dark:text-gray-300 mt-0.5">
              Tỷ lệ sống <b>96.2%</b> (+2.1%) · Biên LN <b>42.1%</b>
            </div>
          </div>

          {/* Lưu ý */}
          <div className="bg-amber-50 dark:bg-amber-950/30 border-l-3 border-amber-500 rounded px-2.5 py-1.5">
            <div className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wide">
              ⚠️ Cần lưu ý
            </div>
            <div className="text-[11px] text-gray-700 dark:text-gray-300 mt-0.5">
              3 loại thuốc cận date dưới 30 ngày — dùng kịp tránh lãng phí
            </div>
          </div>

          {/* Action */}
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded p-2">
            <div className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide mb-1">
              🚀 Việc cần làm tháng tới
            </div>
            <div className="space-y-1 text-[10.5px]">
              {[
                { p: 'CAO', c: 'rose', t: 'Tiêm phòng đợt 3 cho lứa nhân giống mới' },
                { p: 'TB', c: 'amber', t: 'Đẩy mạnh bán 12 con đến tuổi · ước +18tr' },
              ].map((a, i) => (
                <div key={i} className="flex gap-1.5 items-start">
                  <span className={
                    'text-[8.5px] font-extrabold px-1 py-0.5 rounded shrink-0 mt-0.5 ' +
                    (a.c === 'rose'
                      ? 'bg-rose-500 text-white'
                      : 'bg-amber-500 text-white')
                  }>{a.p}</span>
                  <span className="text-gray-700 dark:text-gray-300 leading-snug">{a.t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ============================================================ */
/*  PRICING                                                     */
/* ============================================================ */
function PricingSection({ pricing }: { pricing: PricingTier[] }) {
  const tiers = pricing
  return (
    <section
      id="pricing"
      className="container mx-auto px-4 py-16"
    >
      <div className="text-center mb-12 max-w-3xl mx-auto">
        <span className="inline-block text-xs font-bold tracking-widest text-orange-600 dark:text-orange-400 uppercase mb-2">
          💎 Bảng giá
        </span>
        <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
          Gói nào cũng <span className="text-emerald-600 dark:text-emerald-400">hủy bất kỳ lúc nào</span>
        </h2>
        <p className="text-base md:text-lg text-gray-600 dark:text-gray-400 mt-4">
          Dùng thử 14 ngày miễn phí · Không cần thẻ tín dụng · Đổi gói linh hoạt
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {tiers.map((t, idx) => {
          // Map tier theo index (DEFAULT_PRICING giữ thứ tự cố định: trial→basic→pro→enterprise)
          const tierSlug = ['trial', 'basic', 'pro', 'enterprise'][idx] ?? 'trial'
          return (
          <div
            key={t.name}
            className={
              'relative bg-white dark:bg-gray-800 border rounded-2xl overflow-hidden flex flex-col transition ' +
              (t.featured
                ? 'border-orange-400 dark:border-orange-700 shadow-2xl shadow-orange-500/20 lg:scale-105 z-10'
                : 'border-gray-200 dark:border-gray-700 hover:shadow-lg')
            }
          >
            {t.featured && (
              <div className="absolute top-0 right-0 left-0 bg-gradient-to-r from-red-600 to-orange-600 text-white text-[11px] font-bold text-center py-1.5 tracking-wider">
                ⭐ PHỔ BIẾN NHẤT
              </div>
            )}
            <div className={`h-1.5 bg-gradient-to-r ${t.bar} ${t.featured ? 'mt-7' : ''}`} />
            <div className="p-5 flex-1 flex flex-col">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t.name}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 mb-3">{t.desc}</p>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-extrabold text-gray-900 dark:text-gray-100 tabular-nums">
                  {t.price}đ
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">/{t.period}</span>
              </div>
              <ul className="space-y-2 mb-5 flex-1">
                {t.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
                  >
                    <span className="flex-shrink-0 text-emerald-500 mt-0.5">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={`/auth/signup?tier=${tierSlug}`}
                className={'block text-center rounded-lg px-4 py-2.5 font-bold text-sm transition ' + t.ctaTone}
              >
                {t.cta}
              </Link>
            </div>
          </div>
          )
        })}
      </div>

      <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-6">
        💳 Thanh toán qua MoMo · VNPay · Chuyển khoản · Hoá đơn VAT cho doanh nghiệp
      </p>
    </section>
  )
}

/* ============================================================ */
/*  TESTIMONIALS                                                */
/* ============================================================ */
function Testimonials({ testimonials }: { testimonials: Testimonial[] }) {
  const reviews = testimonials
  return (
    <section className="bg-gray-50 dark:bg-gray-900 py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 max-w-3xl mx-auto">
          <span className="inline-block text-xs font-bold tracking-widest text-amber-600 dark:text-amber-400 uppercase mb-2">
            ⭐ Khách hàng nói gì
          </span>
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
            Từ <span className="text-amber-600 dark:text-amber-400">sư kê</span> thực thụ
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {reviews.map((r, i) => (
            <div
              key={r.name + i}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 hover:shadow-lg transition"
            >
              <div className="flex items-center gap-1 mb-3">
                {Array.from({ length: r.stars }).map((_, i) => (
                  <span key={i} className="text-amber-400">
                    ★
                  </span>
                ))}
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-4 italic">
                &ldquo;{r.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full bg-gradient-to-br ${r.avatarTone} text-white font-bold flex items-center justify-center shadow`}
                >
                  {r.avatar}
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {r.name}
                  </div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400">{r.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ============================================================ */
/*  FAQ                                                         */
/* ============================================================ */
function FAQ({ faqs }: { faqs: Faq[] }) {
  return (
    <section className="container mx-auto px-4 py-16 max-w-3xl">
      <div className="text-center mb-10">
        <span className="inline-block text-xs font-bold tracking-widest text-blue-600 dark:text-blue-400 uppercase mb-2">
          ❓ Câu hỏi thường gặp
        </span>
        <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
          Còn thắc mắc?
        </h2>
      </div>

      <div className="space-y-3">
        {faqs.map((f, i) => (
          <details
            key={i}
            className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:border-orange-300 transition"
          >
            <summary className="cursor-pointer px-5 py-4 flex items-center justify-between gap-3 list-none">
              <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm md:text-base">
                {f.q}
              </span>
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 flex items-center justify-center font-bold transition group-open:rotate-45 group-open:bg-orange-500 group-open:text-white">
                +
              </span>
            </summary>
            <div className="px-5 pb-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed border-t border-gray-100 dark:border-gray-700 pt-3">
              {f.a}
            </div>
          </details>
        ))}
      </div>

      <div className="mt-8 text-center bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl p-5">
        <p className="text-sm text-blue-900 dark:text-blue-200">
          Còn câu hỏi khác? Gọi{' '}
          <a href="tel:0933669639" className="font-bold underline">
            0933.669.639
          </a>{' '}
          hoặc nhắn{' '}
          <a
            href="https://zalo.me/0933669639"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold underline"
          >
            Zalo
          </a>{' '}
          — chúng tôi tư vấn miễn phí.
        </p>
      </div>
    </section>
  )
}

/* ============================================================ */
/*  FINAL CTA                                                   */
/* ============================================================ */
function FinalCTA() {
  return (
    <section
      id="cta"
      className="relative overflow-hidden bg-gradient-to-br from-red-600 via-orange-600 to-amber-600 text-white py-20"
    >
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <span className="absolute top-10 left-10 text-9xl">🐓</span>
        <span className="absolute bottom-10 right-10 text-8xl">🚀</span>
        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 text-7xl">📊</span>
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.2),transparent_60%)]" />

      <div className="container mx-auto px-4 relative text-center max-w-3xl">
        <div className="text-5xl mb-4">🎯</div>
        <h2 className="text-3xl md:text-5xl font-extrabold leading-tight mb-4">
          Sẵn sàng số hoá trang trại của bạn?
        </h2>
        <p className="text-lg md:text-xl text-orange-50/95 mb-8 leading-relaxed">
          Đừng để công sức nuôi gà bị lãng phí vì quản lý lộn xộn. Dùng thử miễn phí 14 ngày —
          không cần thẻ tín dụng, không cam kết.
        </p>

        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/auth/signup?tier=trial"
            className="bg-white text-red-600 hover:bg-orange-50 rounded-xl px-8 py-4 font-extrabold shadow-2xl hover:scale-105 transition text-base"
          >
            🎁 Bắt đầu dùng thử miễn phí
          </Link>
          <a
            href="tel:0933669639"
            className="bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white hover:bg-white/20 rounded-xl px-8 py-4 font-bold transition text-base"
          >
            📞 Tư vấn: 0933.669.639
          </a>
        </div>

        <div className="flex items-center gap-5 justify-center mt-8 text-sm text-orange-50/80 flex-wrap">
          <span className="flex items-center gap-1">✓ 14 ngày miễn phí</span>
          <span className="flex items-center gap-1">✓ Không thẻ tín dụng</span>
          <span className="flex items-center gap-1">✓ Setup 10 phút</span>
          <span className="flex items-center gap-1">✓ Huỷ bất kỳ lúc nào</span>
        </div>
      </div>
    </section>
  )
}
