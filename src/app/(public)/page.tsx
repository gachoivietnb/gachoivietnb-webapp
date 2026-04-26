import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { SITE_FULL_NAME } from '@/lib/utils/constants'
import { formatVnd } from '@/lib/utils/format'
import { getBreedColor, TIER_LABEL } from '@/lib/utils/breed-colors'

export const revalidate = 3600

type PublicChicken = {
  id: string
  chicken_code: string
  name: string | null
  tag_number: string | null
  breed_code: string | null
  breed_name: string | null
  breed_tier: string | null
  age_months: number | null
  listed_price: number | null
  main_photo_url: string | null
  pedigree_depth: number | null
  vaccinations_done: number | null
  training_sessions_count: number | null
}

type PublicBreed = {
  id: string
  code: string
  name_vi: string
  tier: string
  current_count: number
  for_sale_count: number
}

export default async function HomePage() {
  const supabase = await createClient()
  const [statsRes, featuredRes, breedsRes, farmRow] = await Promise.all([
    supabase.from('public_farm_stats').select('*').maybeSingle(),
    supabase
      .from('public_chickens')
      .select('*')
      .eq('is_for_sale', true)
      .eq('status', 'dang_nuoi')
      .order('created_at', { ascending: false })
      .limit(4),
    supabase.from('public_breed_stats').select('*').order('display_order').limit(7),
    supabase.from('system_settings').select('value').eq('key', 'farm_info').maybeSingle(),
  ])

  const stats = (statsRes.data as {
    total_chickens: number
    total_breeds: number
    chickens_for_sale: number
    total_customers: number
  } | null) ?? { total_chickens: 0, total_breeds: 0, chickens_for_sale: 0, total_customers: 0 }

  const featured = (featuredRes.data ?? []) as PublicChicken[]
  const breeds = (breedsRes.data ?? []) as PublicBreed[]
  const farm =
    ((farmRow as { value?: Record<string, string> } | null)?.value as Record<string, string>) ?? {}
  const phone = farm.phone ?? '0933.669.639'
  const zaloNumber = farm.zalo ?? phone.replace(/[^0-9]/g, '')

  return (
    <>
      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-orange-50 via-amber-50 to-red-50 dark:from-orange-950/40 dark:via-amber-950/40 dark:to-red-950/40">
        {/* Decorative floating emojis */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <span className="absolute top-10 left-[8%] text-5xl opacity-10 rotate-[-15deg]">🐓</span>
          <span className="absolute top-32 right-[10%] text-6xl opacity-10 rotate-12">🏆</span>
          <span className="absolute bottom-16 left-[20%] text-5xl opacity-10 rotate-6">⭐</span>
          <span className="absolute top-1/2 right-[28%] text-4xl opacity-10 -rotate-12">🥚</span>
          <span className="absolute bottom-24 right-[15%] text-5xl opacity-10">🐣</span>
        </div>
        {/* Radial glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(249,115,22,0.15),transparent_60%)]" />

        <div className="container mx-auto px-4 py-20 md:py-28 text-center relative">
          <div className="inline-flex items-center gap-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-orange-200 dark:border-orange-800 rounded-full px-4 py-1.5 text-xs font-medium text-orange-800 dark:text-orange-300 mb-6 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Trang trại gà chọi uy tín số 1 Ninh Bình
          </div>

          <div className="inline-block relative mb-4">
            <div className="text-7xl md:text-8xl drop-shadow-xl animate-bounce-slow">🐓</div>
            <div className="absolute -top-2 -right-4 text-2xl animate-pulse">✨</div>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-orange-600 via-red-600 to-amber-600 bg-clip-text text-transparent leading-tight">
            {SITE_FULL_NAME}
          </h1>

          <p className="text-lg md:text-xl text-gray-800 dark:text-gray-200 max-w-2xl mx-auto font-medium">
            Trang trại gà chọi thuần chủng — Nơi hội tụ những chiến kê đỉnh cao
          </p>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-3 max-w-xl mx-auto">
            🌳 Gia phả minh bạch đến 5 đời · 💉 Tiêm phòng đầy đủ 8 mũi · 🏆 Cam kết chất lượng
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/ban"
              className="group inline-flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-orange-600 text-white px-8 py-3.5 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
            >
              🔥 Xem {stats.chickens_for_sale || ''} gà đang bán
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>
            <a
              href={`tel:${phone.replace(/[^0-9]/g, '')}`}
              className="inline-flex items-center justify-center gap-2 bg-white dark:bg-gray-800 border-2 border-orange-400 dark:border-orange-700 text-orange-700 dark:text-orange-300 px-8 py-3.5 rounded-xl font-semibold hover:bg-orange-50 dark:hover:bg-orange-950/30 shadow-sm"
            >
              📞 Gọi {phone}
            </a>
            <a
              href={`https://zalo.me/${zaloNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-[#0068FF] hover:bg-[#0055cc] text-white px-8 py-3.5 rounded-xl font-semibold shadow-lg transition"
            >
              💬 Zalo
            </a>
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0 h-12 overflow-hidden">
          <svg
            viewBox="0 0 1440 48"
            preserveAspectRatio="none"
            className="w-full h-full text-white dark:text-gray-900"
          >
            <path
              fill="currentColor"
              d="M0,32L80,29.3C160,27,320,21,480,21.3C640,21,800,27,960,29.3C1120,32,1280,32,1360,32L1440,32L1440,48L0,48Z"
            />
          </svg>
        </div>
      </section>

      {/* ============ STATS ============ */}
      <section className="container mx-auto px-4 py-12 -mt-6 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <StatCard
            value={stats.total_chickens}
            label="Con đang nuôi"
            emoji="🐓"
            gradient="from-orange-500 to-red-500"
          />
          <StatCard
            value={stats.total_breeds}
            label="Giống thuần chủng"
            emoji="🧬"
            gradient="from-purple-500 to-indigo-600"
          />
          <StatCard
            value={stats.chickens_for_sale}
            label="Đang bán"
            emoji="💰"
            gradient="from-emerald-500 to-green-600"
          />
          <StatCard
            value={`${stats.total_customers}+`}
            label="Khách tin tưởng"
            emoji="⭐"
            gradient="from-amber-500 to-orange-500"
          />
        </div>
      </section>

      {/* ============ FEATURED ============ */}
      {featured.length > 0 && (
        <section className="container mx-auto px-4 py-12">
          <div className="text-center mb-8">
            <span className="inline-block text-xs font-bold tracking-widest text-orange-600 dark:text-orange-400 uppercase mb-2">
              ⭐ Gà nổi bật
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100">
              Chiến kê đỉnh cao đang chờ chủ mới
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Tuyển chọn kỹ càng — gia phả rõ ràng — sẵn sàng ra trường
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {featured.map((c) => (
              <FeaturedCard key={c.id} chicken={c} />
            ))}
          </div>
          <div className="text-center mt-8">
            <Link
              href="/ban"
              className="inline-flex items-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-3 rounded-xl font-semibold hover:opacity-90 transition"
            >
              Xem toàn bộ danh sách
              <span>→</span>
            </Link>
          </div>
        </section>
      )}

      {/* ============ BREEDS SHOWCASE ============ */}
      {breeds.length > 0 && (
        <section className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950/40 dark:via-purple-950/40 dark:to-pink-950/40 py-16 mt-12">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(168,85,247,0.1),transparent_60%)]" />
          <div className="container mx-auto px-4 relative">
            <div className="text-center mb-10">
              <span className="inline-block text-xs font-bold tracking-widest text-purple-600 dark:text-purple-400 uppercase mb-2">
                🧬 Thư viện giống
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100">
                {breeds.length} giống gà chọi thuần chủng
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Asil · Mã Lai · Peru · Nòi · Tre · Tân Châu · Lai F1
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {breeds.map((b) => {
                const color = getBreedColor(b.code)
                return (
                  <Link
                    key={b.id}
                    href={`/ban?breeds=${b.code}`}
                    className={`group relative overflow-hidden rounded-xl ${color.bg} aspect-square flex flex-col items-center justify-center text-white p-3 text-center shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all`}
                  >
                    <div className="text-4xl drop-shadow-lg group-hover:scale-110 transition-transform">
                      🐓
                    </div>
                    <div className="font-bold mt-2 text-sm drop-shadow">{b.name_vi}</div>
                    <div className="text-[10px] opacity-90 font-semibold tracking-wider uppercase mt-0.5">
                      {TIER_LABEL[b.tier] ?? ''}
                    </div>
                    <div className="text-[11px] mt-1 opacity-90">
                      {b.current_count > 0 ? `${b.current_count} con` : 'Đang nhập'}
                    </div>
                  </Link>
                )
              })}
            </div>
            <div className="text-center mt-8">
              <Link
                href="/giong"
                className="inline-flex items-center gap-2 text-purple-700 dark:text-purple-300 font-semibold hover:underline"
              >
                Khám phá chi tiết từng giống →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ============ BÍ KÍP SƯ KÊ ============ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-orange-50 via-red-50 to-rose-50 dark:from-orange-950/40 dark:via-red-950/40 dark:to-rose-950/40 py-16 mt-12">
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <span className="absolute top-8 left-8 text-9xl">📚</span>
          <span className="absolute bottom-8 right-12 text-8xl">🐓</span>
        </div>
        <div className="container mx-auto px-4 relative">
          <div className="text-center mb-10">
            <span className="inline-block text-xs font-bold tracking-widest text-orange-600 dark:text-orange-400 uppercase mb-2">
              📚 Cẩm nang miễn phí
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100">
              Bí Kíp Sư Kê — Nuôi gà chọi từ A–Z
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2 max-w-2xl mx-auto">
              35 bài viết chi tiết từ chọn giống, làm chuồng, dinh dưỡng, sức khỏe đến huấn luyện và
              kinh doanh. Kinh nghiệm sư kê dày dặn — đọc đi đọc lại để trở thành chuyên gia.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
            {[
              { emoji: '📖', title: 'Khởi đầu', desc: '9 bài', bar: 'from-blue-400 to-indigo-500' },
              { emoji: '🏠', title: 'Chuồng trại', desc: '4 bài', bar: 'from-amber-400 to-orange-500' },
              { emoji: '🌾', title: 'Dinh dưỡng', desc: '6 bài', bar: 'from-emerald-400 to-teal-500' },
              { emoji: '💉', title: 'Sức khỏe', desc: '7 bài', bar: 'from-rose-400 to-red-500' },
              { emoji: '🥊', title: 'Huấn luyện', desc: '5 bài', bar: 'from-violet-400 to-purple-500' },
              { emoji: '💰', title: 'Kinh doanh', desc: '4 bài', bar: 'from-cyan-400 to-sky-500' },
            ].map((c) => (
              <Link
                key={c.title}
                href="/bi-kip-su-ke"
                className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition"
              >
                <div className={`h-1.5 bg-gradient-to-r ${c.bar}`} />
                <div className="p-3 text-center">
                  <div className="text-3xl mb-1">{c.emoji}</div>
                  <div className="text-sm font-bold text-gray-900 dark:text-gray-100 group-hover:text-orange-700 dark:group-hover:text-orange-400">
                    {c.title}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5">{c.desc}</div>
                </div>
              </Link>
            ))}
          </div>

          <div className="text-center">
            <Link
              href="/bi-kip-su-ke"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-red-600 to-orange-600 text-white px-6 py-3 rounded-lg font-semibold shadow hover:shadow-xl transition"
            >
              📚 Mở cẩm nang 35 bài →
            </Link>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              ~70.000 từ · Khoảng 5 giờ đọc · Cập nhật 2026
            </p>
          </div>
        </div>
      </section>

      {/* ============ TRUST ============ */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <span className="inline-block text-xs font-bold tracking-widest text-emerald-600 dark:text-emerald-400 uppercase mb-2">
            ✨ Cam kết của chúng tôi
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100">
            Tại sao chọn {SITE_FULL_NAME}?
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <TrustCard
            emoji="🌳"
            title="Gia phả minh bạch đến 5 đời"
            text="Mỗi con gà có cây gia phả chi tiết — biết rõ bố, mẹ, ông nội, bà ngoại đến cụ kỵ. Quét QR là thấy tất cả."
            gradient="from-emerald-500 to-green-600"
          />
          <TrustCard
            emoji="💉"
            title="Tiêm phòng 8 mũi vaccine"
            text="Marek, Newcastle, Gumboro, H5N1, IB, ILT, Tụ huyết trùng, Coryza — theo lịch chuẩn thú y nhà nước."
            gradient="from-blue-500 to-indigo-600"
          />
          <TrustCard
            emoji="🏷️"
            title="Mã QR định danh riêng"
            text="Mỗi con có 1 thẻ QR duy nhất. Khách quét là thấy hồ sơ đầy đủ — chống hàng giả, chống tráo gà."
            gradient="from-amber-500 to-orange-600"
          />
        </div>
      </section>

      {/* ============ CTA BANNER ============ */}
      <section className="relative overflow-hidden bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 py-16 mb-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.15),transparent_70%)]" />
        <div className="container mx-auto px-4 relative text-center text-white">
          <div className="text-5xl mb-4">🎯</div>
          <h2 className="text-3xl md:text-4xl font-bold mb-3">Sẵn sàng rước chiến kê về nhà?</h2>
          <p className="text-lg opacity-95 mb-8 max-w-xl mx-auto">
            Liên hệ Zalo / hotline — tư vấn chọn gà miễn phí, giao toàn quốc có bảo hành
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={`https://zalo.me/${zaloNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 px-8 py-3.5 rounded-xl font-bold shadow-xl hover:scale-105 transition"
            >
              💬 Nhắn Zalo ngay
            </a>
            <a
              href={`tel:${phone.replace(/[^0-9]/g, '')}`}
              className="inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm border-2 border-white text-white px-8 py-3.5 rounded-xl font-bold hover:bg-white/20 transition"
            >
              📞 {phone}
            </a>
          </div>
        </div>
      </section>
    </>
  )
}

function StatCard({
  value,
  label,
  emoji,
  gradient,
}: {
  value: number | string
  label: string
  emoji: string
  gradient: string
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700 p-4 md:p-5 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all">
      <div
        className={`absolute top-0 right-0 w-24 h-24 rounded-full bg-gradient-to-br ${gradient} opacity-20 blur-2xl group-hover:opacity-40 transition`}
      />
      <div className="relative">
        <div className="text-3xl mb-2">{emoji}</div>
        <div
          className={`text-3xl md:text-4xl font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent tabular-nums`}
        >
          {value}
        </div>
        <div className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mt-1 font-medium">
          {label}
        </div>
      </div>
    </div>
  )
}

function TrustCard({
  emoji,
  title,
  text,
  gradient,
}: {
  emoji: string
  title: string
  text: string
  gradient: string
}) {
  return (
    <div className="group relative overflow-hidden bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
      <div
        className={`absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br ${gradient} opacity-10 group-hover:opacity-25 transition`}
      />
      <div className="relative">
        <div
          className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${gradient} text-white text-2xl shadow-lg mb-4`}
        >
          {emoji}
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{text}</p>
      </div>
    </div>
  )
}

function FeaturedCard({ chicken: c }: { chicken: PublicChicken }) {
  const color = getBreedColor(c.breed_code)
  const href = `/ga/${c.tag_number ?? c.id}`
  return (
    <Link
      href={href}
      className="group bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700 rounded-2xl overflow-hidden shadow-md hover:shadow-2xl hover:-translate-y-1 transition-all"
    >
      <div className={`relative aspect-square ${color.bg} flex items-center justify-center overflow-hidden`}>
        {c.breed_tier === 'cao_cap' && (
          <span className="absolute top-2 left-2 z-10 bg-amber-400 text-amber-900 rounded-full px-2 py-0.5 text-[10px] font-bold shadow">
            ⭐ CAO CẤP
          </span>
        )}
        {c.tag_number && (
          <span className="absolute top-2 right-2 z-10 bg-white/90 text-gray-800 dark:text-gray-200 rounded-full px-2 py-0.5 text-[10px] font-semibold font-mono">
            #{c.tag_number}
          </span>
        )}
        {c.main_photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={c.main_photo_url}
            alt={c.chicken_code}
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
            className="w-full h-full object-cover pointer-events-none select-none group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="text-white text-7xl drop-shadow-lg group-hover:scale-110 transition-transform">
            🐓
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate">
          {c.name ?? c.chicken_code}
        </div>
        <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
          {c.breed_name}
          {c.age_months ? ` · ${c.age_months} tháng` : ''}
        </div>
        {c.listed_price && (
          <div className="text-base font-bold text-red-600 dark:text-red-400 mt-1 tabular-nums">
            {formatVnd(c.listed_price)}
          </div>
        )}
      </div>
    </Link>
  )
}
