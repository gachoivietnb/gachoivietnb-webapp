import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { SITE_FULL_NAME } from '@/lib/utils/constants'

export const metadata = {
  title: 'Tin tức & Kinh nghiệm gà chọi | Gà Chọi Việt NB',
  description:
    'Tin tức gà chọi, kinh nghiệm nuôi, chăm sóc, chọn giống, huấn luyện từ Gà Chọi Việt Ninh Bình. Cập nhật thường xuyên.',
}

export const revalidate = 600

const CAT_META: Record<string, { label: string; emoji: string; color: string }> = {
  'tin-tuc': { label: 'Tin tức', emoji: '📰', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300' },
  'kinh-nghiem': { label: 'Kinh nghiệm', emoji: '💡', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' },
  'su-kien': { label: 'Sự kiện', emoji: '🎉', color: 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300' },
  'giong-ga': { label: 'Giống gà', emoji: '🧬', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' },
  'cham-soc': { label: 'Chăm sóc', emoji: '💚', color: 'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300' },
}

type Article = {
  id: string
  slug: string
  title: string
  excerpt: string | null
  cover_image_url: string | null
  category: string
  tags: string[] | null
  published_at: string | null
  view_count: number
}

export default async function TinTucPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; page?: string }>
}) {
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)
  const pageSize = 12
  const supabase = await createClient()

  let query = supabase
    .from('news_articles')
    .select('id, slug, title, excerpt, cover_image_url, category, tags, published_at, view_count', {
      count: 'exact',
    })
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (sp.category) query = query.eq('category', sp.category)

  const { data, count } = await query
  const articles = (data ?? []) as Article[]
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / pageSize))

  const featured = articles[0]
  const rest = articles.slice(1)

  return (
    <>
      {/* HERO */}
      <section className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/40 dark:via-indigo-950/40 dark:to-purple-950/40 py-12">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-block text-xs font-bold tracking-widest text-indigo-600 dark:text-indigo-400 uppercase mb-2">
            📰 Tin tức
          </div>
          <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Tin tức & Kinh nghiệm gà chọi
          </h1>
          <p className="text-gray-700 dark:text-gray-300 max-w-2xl mx-auto">
            Cập nhật thường xuyên từ {SITE_FULL_NAME} — kinh nghiệm nuôi, chăm sóc, chọn giống
          </p>
        </div>
      </section>

      {/* CATEGORY TABS */}
      <section className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-2 flex-wrap mb-6 overflow-x-auto">
          <Link
            href="/tin-tuc"
            className={`px-4 py-1.5 rounded-full text-sm font-medium ${
              !sp.category
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50'
            }`}
          >
            📚 Tất cả
          </Link>
          {Object.entries(CAT_META).map(([k, m]) => {
            const active = sp.category === k
            return (
              <Link
                key={k}
                href={`?category=${k}`}
                className={`px-4 py-1.5 rounded-full text-sm font-medium ${
                  active
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50'
                }`}
              >
                {m.emoji} {m.label}
              </Link>
            )
          })}
        </div>

        {articles.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-12 text-center">
            <div className="text-5xl mb-3">📭</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Chưa có bài nào
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Quay lại sau — chúng tôi cập nhật thường xuyên
            </p>
          </div>
        ) : (
          <>
            {/* FEATURED POST */}
            {featured && !sp.category && page === 1 && (
              <Link
                href={`/tin-tuc/${featured.slug}`}
                className="block group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition mb-8"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                  <div className="relative aspect-video md:aspect-auto bg-gradient-to-br from-blue-500 to-purple-600 overflow-hidden">
                    {featured.cover_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={featured.cover_image_url}
                        alt={featured.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-7xl text-white opacity-50">
                        📰
                      </div>
                    )}
                    <span className="absolute top-3 left-3 bg-red-500 text-white rounded-full px-3 py-1 text-xs font-bold shadow">
                      ⭐ Bài mới
                    </span>
                  </div>
                  <div className="p-6 md:p-8 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-3">
                      <span
                        className={`text-[10px] font-bold tracking-wider rounded px-2 py-0.5 ${
                          CAT_META[featured.category]?.color ?? 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {CAT_META[featured.category]?.emoji} {CAT_META[featured.category]?.label}
                      </span>
                      {featured.published_at && (
                        <span className="text-[11px] text-gray-500 dark:text-gray-400">
                          {new Date(featured.published_at).toLocaleDateString('vi-VN')}
                        </span>
                      )}
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                      {featured.title}
                    </h2>
                    {featured.excerpt && (
                      <p className="text-gray-600 dark:text-gray-400 line-clamp-3 mb-4">
                        {featured.excerpt}
                      </p>
                    )}
                    <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm">
                      Đọc tiếp →
                    </span>
                  </div>
                </div>
              </Link>
            )}

            {/* REST GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {(featured && !sp.category && page === 1 ? rest : articles).map((a) => (
                <ArticleCard key={a.id} article={a} />
              ))}
            </div>

            {/* PAGINATION */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                  const params = new URLSearchParams()
                  if (sp.category) params.set('category', sp.category)
                  if (p !== 1) params.set('page', String(p))
                  return (
                    <Link
                      key={p}
                      href={`?${params.toString()}`}
                      className={`min-w-[40px] h-10 rounded-lg flex items-center justify-center font-medium text-sm ${
                        p === page
                          ? 'bg-blue-600 text-white'
                          : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {p}
                    </Link>
                  )
                })}
              </div>
            )}
          </>
        )}
      </section>
    </>
  )
}

function ArticleCard({ article: a }: { article: Article }) {
  const cat = CAT_META[a.category] ?? { label: a.category, emoji: '📄', color: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300' }
  return (
    <Link
      href={`/tin-tuc/${a.slug}`}
      className="group bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition"
    >
      <div className="relative aspect-video bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 overflow-hidden">
        {a.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={a.cover_image_url}
            alt={a.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl text-gray-400 dark:text-gray-500">
            {cat.emoji}
          </div>
        )}
        <span className={`absolute top-2 left-2 text-[10px] font-bold rounded px-2 py-0.5 ${cat.color}`}>
          {cat.emoji} {cat.label}
        </span>
      </div>
      <div className="p-4">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
          {a.title}
        </h3>
        {a.excerpt && (
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-2">{a.excerpt}</p>
        )}
        <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400 mt-3">
          {a.published_at && (
            <span>{new Date(a.published_at).toLocaleDateString('vi-VN')}</span>
          )}
          {a.view_count > 0 && (
            <>
              <span>·</span>
              <span>👁️ {a.view_count}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  )
}
