import Link from 'next/link'
import { loadAllArticles, CHAPTERS } from '@/lib/bi-kip/loader'
import { BiKipAdminListClient } from '@/components/admin/bi-kip/BiKipAdminListClient'

export const revalidate = 0

export default async function BiKipAdminPage() {
  const articles = await loadAllArticles()

  const cards = articles.map((a) => ({
    number: a.number,
    slug: a.slug,
    filename: a.filename,
    title: a.title,
    metaDescription: a.metaDescription,
    primaryKeyword: a.primaryKeyword,
    expectedLength: a.expectedLength,
    readMinutes: a.readMinutes,
    wordCount: a.wordCount,
    secondaryKeywordsCount: a.secondaryKeywords.length,
    longTailKeywordsCount: a.longTailKeywords.length,
    imagesCount: a.images.length,
    hasHero: !!a.heroImage,
    chapter: {
      key: a.chapter.key,
      emoji: a.chapter.emoji,
      title: a.chapter.title,
      bar: a.chapter.bar,
      badge: a.chapter.badge,
    },
  }))

  const totalWords = articles.reduce((s, a) => s + a.wordCount, 0)
  const avgWords = articles.length > 0 ? Math.round(totalWords / articles.length) : 0

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
            📚 Bí Kíp Sư Kê — Quản trị nội dung
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Quản lý {articles.length} bài cẩm nang · Sửa Markdown · Xem trạng thái SEO
          </p>
        </div>
        <Link
          href="/bi-kip-su-ke"
          target="_blank"
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline self-center"
        >
          Xem trang public ↗
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <Kpi
          label="Tổng bài"
          value={String(articles.length)}
          icon="📖"
          tone="from-blue-500 to-indigo-500"
        />
        <Kpi
          label="Tổng từ"
          value={`${(totalWords / 1000).toFixed(1)}k`}
          icon="✍️"
          tone="from-emerald-500 to-teal-500"
          sub={`TB ${avgWords.toLocaleString('vi-VN')}/bài`}
        />
        <Kpi
          label="Chương"
          value={String(CHAPTERS.length)}
          icon="📂"
          tone="from-violet-500 to-purple-500"
        />
        <Kpi
          label="Có hero ảnh"
          value={`${cards.filter((c) => c.hasHero).length}/${cards.length}`}
          icon="🖼"
          tone="from-amber-500 to-orange-500"
        />
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl p-3 mb-4 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
        <span>⚠️</span>
        <div>
          Bí Kíp Sư Kê lưu dạng <strong>file Markdown</strong> trong repo{' '}
          <code className="font-mono bg-white/50 dark:bg-gray-900/40 px-1 rounded">bi kip su ke/</code>
          . Chỉ chủ trại sửa được. Sau khi lưu, chạy build/redeploy để file mới có hiệu lực trên
          Vercel (production filesystem read-only). Local dev: hot-reload ngay.
        </div>
      </div>

      <BiKipAdminListClient articles={cards} />
    </div>
  )
}

function Kpi({
  label,
  value,
  icon,
  tone,
  sub,
}: {
  label: string
  value: string
  icon: string
  tone: string
  sub?: string
}) {
  return (
    <div className="relative overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3.5">
      <div
        className={`absolute -right-6 -top-6 w-20 h-20 rounded-full bg-gradient-to-br ${tone} opacity-15 blur-xl`}
      />
      <div className="relative">
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <span>{icon}</span>
          <span className="truncate">{label}</span>
        </div>
        <div className="mt-1 text-2xl font-bold tabular-nums text-gray-900 dark:text-gray-100">
          {value}
        </div>
        {sub && (
          <div className="text-[10.5px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
            {sub}
          </div>
        )}
      </div>
    </div>
  )
}
