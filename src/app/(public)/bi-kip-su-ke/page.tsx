import Link from 'next/link'
import type { Metadata } from 'next'
import { loadAllArticles, CHAPTERS } from '@/lib/bi-kip/loader'
import { BiKipHubClient, type ArticleCard } from '@/components/public/BiKipHubClient'

export const metadata: Metadata = {
  title: 'Bí Kíp Sư Kê — Cẩm nang nuôi gà chọi từ A–Z | Gà Chọi Việt Ninh Bình',
  description:
    'Cẩm nang 35 bài đầy đủ về nuôi gà chọi: từ chọn giống, làm chuồng, dinh dưỡng, sức khoẻ, huấn luyện đến kinh doanh. Kinh nghiệm sư kê dày dặn — đọc miễn phí.',
  keywords: [
    'bí kíp sư kê',
    'cẩm nang nuôi gà chọi',
    'kỹ thuật nuôi gà chọi',
    'chăm sóc gà chọi',
    'huấn luyện gà chọi',
    'gà chọi việt nam',
  ],
  openGraph: {
    title: 'Bí Kíp Sư Kê — Cẩm nang nuôi gà chọi từ A–Z',
    description:
      'Toàn bộ kiến thức về nuôi, chăm sóc, huấn luyện và kinh doanh gà chọi từ trại Gà Chọi Việt Ninh Bình.',
    type: 'website',
  },
}

export const revalidate = 3600

export default async function BiKipHubPage() {
  const articles = await loadAllArticles()

  const totalWords = articles.reduce((s, a) => s + a.wordCount, 0)
  const totalRead = articles.reduce((s, a) => s + a.readMinutes, 0)
  const totalHours = (totalRead / 60).toFixed(1)

  const cards: ArticleCard[] = articles.map((a) => ({
    number: a.number,
    slug: a.slug,
    title: a.title,
    metaDescription: a.metaDescription,
    primaryKeyword: a.primaryKeyword,
    expectedLength: a.expectedLength,
    readMinutes: a.readMinutes,
    wordCount: a.wordCount,
    heroImage: a.heroImage ? { url: a.heroImage.url, alt: a.heroImage.alt } : null,
    chapter: {
      key: a.chapter.key,
      emoji: a.chapter.emoji,
      title: a.chapter.title,
      bar: a.chapter.bar,
      badge: a.chapter.badge,
    },
  }))

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-orange-500 via-red-500 to-rose-600 text-white">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <span className="absolute top-8 left-8 text-9xl">🐓</span>
          <span className="absolute bottom-4 right-12 text-8xl">📚</span>
          <span className="absolute top-16 right-1/4 text-6xl">🏆</span>
        </div>
        <div className="container mx-auto px-4 py-12 md:py-16 relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full px-3 py-1 text-xs font-semibold mb-3">
              📚 CẨM NANG SƯ KÊ — MIỄN PHÍ
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold leading-tight mb-3">
              Bí Kíp Sư Kê
            </h1>
            <p className="text-lg md:text-xl text-orange-50/95 leading-relaxed max-w-2xl">
              Toàn bộ kiến thức nuôi gà chọi — từ chọn giống, làm chuồng, dinh dưỡng, phòng bệnh đến
              huấn luyện và kinh doanh. Đọc đi đọc lại để trở thành sư kê thực thụ.
            </p>

            <div className="flex flex-wrap gap-3 mt-6">
              <StatPill icon="📖" label="Bài viết" value={`${articles.length} bài`} />
              <StatPill
                icon="✍️"
                label="Tổng nội dung"
                value={`~${(totalWords / 1000).toFixed(1)}k từ`}
              />
              <StatPill icon="⏱" label="Thời gian đọc" value={`~${totalHours} giờ`} />
              <StatPill icon="🎯" label="Cập nhật" value="2026" />
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Chapter overview */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {CHAPTERS.map((c) => {
            const count = articles.filter((a) => a.chapter.key === c.key).length
            return (
              <a
                key={c.key}
                href={`#chuong-${c.key}`}
                className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:shadow-lg hover:border-orange-300 transition"
              >
                <div className={`h-1.5 bg-gradient-to-r ${c.bar}`} />
                <div className="p-3.5">
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-2xl">{c.emoji}</span>
                    <span className="text-[10.5px] font-mono text-gray-400">
                      Bài {c.range[0]}–{c.range[1]}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-orange-700 dark:group-hover:text-orange-400 transition">
                    {c.title}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{c.desc}</p>
                  <div className="text-[11px] text-gray-500 mt-1.5">{count} bài</div>
                </div>
              </a>
            )
          })}
        </section>

        {/* Search + cards */}
        <BiKipHubClient articles={cards} />

        {/* CTA */}
        <section className="relative overflow-hidden bg-gradient-to-br from-orange-50 via-red-50 to-rose-50 dark:from-orange-950/30 dark:via-red-950/30 dark:to-rose-950/30 border border-orange-200 dark:border-orange-900 rounded-2xl p-6 md:p-8">
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-orange-300/30 blur-3xl" />
          <div className="absolute -left-10 -bottom-10 w-40 h-40 rounded-full bg-rose-300/30 blur-3xl" />
          <div className="relative grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-center">
            <div>
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                🐓 Đã đọc xong cẩm nang? Hành động ngay!
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                Mua gà chọi giống <strong>thuần chủng</strong>, có gia phả minh bạch, đã tiêm phòng
                đầy đủ tại trang trại <strong>Gà Chọi Việt Ninh Bình</strong>. Tư vấn miễn phí 24/7
                — không lo bị ép giá.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/ban"
                className="bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-lg px-5 py-3 font-semibold shadow hover:shadow-lg transition"
              >
                🔥 Xem gà đang bán
              </Link>
              <Link
                href="/lien-he"
                className="border border-orange-400 dark:border-orange-700 text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-950/30 rounded-lg px-5 py-3 font-semibold transition"
              >
                📞 Tư vấn miễn phí
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

function StatPill({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="bg-white/15 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-2 min-w-[110px]">
      <div className="text-[10.5px] uppercase tracking-wider text-orange-100/90">
        {icon} {label}
      </div>
      <div className="text-sm font-bold tabular-nums">{value}</div>
    </div>
  )
}
