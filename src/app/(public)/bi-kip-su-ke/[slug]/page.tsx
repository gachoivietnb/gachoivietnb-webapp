import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { loadAllArticles, getArticleBySlug } from '@/lib/bi-kip/loader'
import { renderMarkdown } from '@/lib/bi-kip/markdown'
import { BiKipReadingProgress } from '@/components/public/BiKipReadingProgress'
import { BiKipCopyGuard } from '@/components/public/BiKipCopyGuard'

export const revalidate = 3600

export async function generateStaticParams() {
  const all = await loadAllArticles()
  return all.map((a) => ({ slug: a.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const article = await getArticleBySlug(slug)
  if (!article) {
    return { title: 'Không tìm thấy bài viết' }
  }
  const allKeywords = [
    article.primaryKeyword,
    ...article.secondaryKeywords,
    ...article.longTailKeywords.slice(0, 5),
  ].filter(Boolean)

  return {
    title: `${article.title} | Bí Kíp Sư Kê — Gà Chọi Việt Ninh Bình`,
    description: article.metaDescription,
    keywords: allKeywords,
    openGraph: {
      title: article.title,
      description: article.metaDescription,
      type: 'article',
      images: article.heroImage ? [{ url: article.heroImage.url }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.metaDescription,
      images: article.heroImage ? [article.heroImage.url] : undefined,
    },
  }
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const article = await getArticleBySlug(slug)
  if (!article) notFound()

  const all = await loadAllArticles()
  const idx = all.findIndex((a) => a.slug === article.slug)
  const prev = idx > 0 ? all[idx - 1] : null
  const next = idx < all.length - 1 ? all[idx + 1] : null

  const related = all
    .filter((a) => a.chapter.key === article.chapter.key && a.slug !== article.slug)
    .slice(0, 4)

  const { nodes, headings } = renderMarkdown(article.rawBody, article.images)

  // JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.metaDescription,
    image: article.heroImage ? [article.heroImage.url] : undefined,
    author: { '@type': 'Organization', name: 'Gà Chọi Việt Ninh Bình' },
    publisher: {
      '@type': 'Organization',
      name: 'Gà Chọi Việt Ninh Bình',
      logo: {
        '@type': 'ImageObject',
        url: 'https://gachoivietnb.com/og-image.png',
      },
    },
    keywords: [
      article.primaryKeyword,
      ...article.secondaryKeywords,
      ...article.longTailKeywords,
    ]
      .filter(Boolean)
      .join(', '),
    wordCount: article.wordCount,
    inLanguage: 'vi-VN',
  }

  return (
    <>
      <BiKipReadingProgress />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950 text-white">
        {article.heroImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.heroImage.url}
            alt={article.heroImage.alt}
            className="absolute inset-0 w-full h-full object-cover opacity-30"
          />
        )}
        <div className={`absolute inset-x-0 bottom-0 h-2 bg-gradient-to-r ${article.chapter.bar}`} />
        <div className="container mx-auto px-4 py-10 md:py-14 relative">
          <Link
            href="/bi-kip-su-ke"
            className="inline-flex items-center gap-1 text-sm text-orange-200 hover:text-white mb-3"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại Bí Kíp Sư Kê
          </Link>
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <span className="text-[11px] font-bold bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-2.5 py-0.5">
              📖 BÀI {String(article.number).padStart(2, '0')}/35
            </span>
            <span className={`text-[11px] font-bold rounded-full px-2.5 py-0.5 border bg-white/15 backdrop-blur-sm border-white/20`}>
              {article.chapter.emoji} {article.chapter.title}
            </span>
            <span className="text-[11px] text-orange-200/90">
              ⏱ {article.readMinutes} phút đọc · ~{(article.wordCount / 1000).toFixed(1)}k từ
            </span>
          </div>
          <h1 className="text-2xl md:text-4xl lg:text-5xl font-extrabold leading-tight max-w-4xl">
            {article.title}
          </h1>
          <p className="text-sm md:text-base text-orange-50/90 mt-3 max-w-3xl leading-relaxed">
            {article.metaDescription}
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
          {/* Article body — wrapped in copy-protection guard */}
          <article className="min-w-0">
            <BiKipCopyGuard watermark="gachoivietnb.com">
              <div className="prose-bikip">{nodes}</div>
            </BiKipCopyGuard>

            <div className="mt-6 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 border border-orange-200 dark:border-orange-900 rounded-lg p-3 text-xs text-orange-800 dark:text-orange-200 flex items-start gap-2">
              <span className="text-base">🔒</span>
              <div>
                <strong>Nội dung được bảo vệ bản quyền.</strong> Vui lòng chia sẻ link bài viết
                thay vì copy. Liên hệ <a href="tel:0933669639" className="font-semibold underline">0933.669.639</a> nếu cần dùng cho mục đích thương mại / báo chí.
              </div>
            </div>

            {/* Keywords footer */}
            {(article.primaryKeyword ||
              article.secondaryKeywords.length > 0 ||
              article.longTailKeywords.length > 0) && (
              <section className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-6">
                <h2 className="text-sm uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 mb-3">
                  🔖 Chủ đề liên quan
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  {[article.primaryKeyword, ...article.secondaryKeywords]
                    .filter(Boolean)
                    .map((k) => (
                      <span
                        key={k}
                        className="text-[11px] bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-900 rounded-full px-2.5 py-1"
                      >
                        #{k}
                      </span>
                    ))}
                </div>
              </section>
            )}

            {/* Prev / Next */}
            <section className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-3">
              {prev ? (
                <Link
                  href={`/bi-kip-su-ke/${prev.slug}`}
                  className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-md hover:border-orange-300 transition"
                >
                  <div className="text-[10.5px] uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <ArrowLeft className="w-3 h-3" /> Bài trước · #{String(prev.number).padStart(2, '0')}
                  </div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-orange-700 dark:group-hover:text-orange-400 mt-1 line-clamp-2">
                    {prev.title}
                  </div>
                </Link>
              ) : (
                <div />
              )}
              {next ? (
                <Link
                  href={`/bi-kip-su-ke/${next.slug}`}
                  className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-md hover:border-orange-300 transition text-right"
                >
                  <div className="text-[10.5px] uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1 justify-end">
                    Bài sau · #{String(next.number).padStart(2, '0')} <ArrowRight className="w-3 h-3" />
                  </div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-orange-700 dark:group-hover:text-orange-400 mt-1 line-clamp-2">
                    {next.title}
                  </div>
                </Link>
              ) : (
                <div />
              )}
            </section>

            {/* Related */}
            {related.length > 0 && (
              <section className="mt-10">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                  <span>{article.chapter.emoji}</span>
                  Cùng chủ đề: {article.chapter.title}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {related.map((r) => (
                    <Link
                      key={r.slug}
                      href={`/bi-kip-su-ke/${r.slug}`}
                      className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:shadow-md hover:border-orange-300 transition flex"
                    >
                      {r.heroImage && (
                        <div className="w-24 h-24 flex-shrink-0 overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={r.heroImage.url}
                            alt={r.heroImage.alt}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                      )}
                      <div className="p-3 min-w-0 flex-1">
                        <div className="text-[10.5px] font-mono text-gray-500">
                          BÀI {String(r.number).padStart(2, '0')}
                        </div>
                        <div className="font-semibold text-sm text-gray-900 dark:text-gray-100 line-clamp-2 group-hover:text-orange-700 dark:group-hover:text-orange-400">
                          {r.title}
                        </div>
                        <div className="text-[11px] text-gray-500 mt-0.5">
                          ⏱ {r.readMinutes} phút
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* CTA */}
            <section className="mt-10 relative overflow-hidden bg-gradient-to-br from-orange-50 via-red-50 to-rose-50 dark:from-orange-950/30 dark:via-red-950/30 dark:to-rose-950/30 border border-orange-200 dark:border-orange-900 rounded-2xl p-5 md:p-7">
              <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-orange-300/30 blur-3xl" />
              <div className="relative grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-center">
                <div>
                  <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-gray-100 mb-1.5 flex items-center gap-2">
                    🐓 Cần mua gà giống thuần chủng?
                  </h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    Trại <strong>Gà Chọi Việt Ninh Bình</strong> cung cấp gà giống thuần chủng, có
                    gia phả minh bạch, tiêm phòng đầy đủ. Tư vấn miễn phí từ sư kê dày dặn.
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Link
                    href="/ban"
                    className="bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-lg px-4 py-2.5 font-semibold shadow hover:shadow-lg transition text-center text-sm"
                  >
                    🔥 Xem gà đang bán
                  </Link>
                  <a
                    href="tel:0933669639"
                    className="border border-orange-400 dark:border-orange-700 text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-950/30 rounded-lg px-4 py-2.5 font-semibold transition text-center text-sm"
                  >
                    📞 0933.669.639
                  </a>
                </div>
              </div>
            </section>
          </article>

          {/* TOC sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-4">
              <nav className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <div className={`h-1.5 bg-gradient-to-r ${article.chapter.bar}`} />
                <div className="p-3.5">
                  <div className="text-[10.5px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 mb-2">
                    📑 Trong bài này có
                  </div>
                  <ul className="space-y-1 text-sm">
                    {headings.map((h) => (
                      <li key={h.id}>
                        <a
                          href={`#${h.id}`}
                          className={
                            'block px-2 py-1 rounded hover:bg-orange-50 dark:hover:bg-orange-950/30 hover:text-orange-700 dark:hover:text-orange-400 text-gray-700 dark:text-gray-300 transition ' +
                            (h.level === 3 ? 'pl-5 text-[13px] text-gray-600 dark:text-gray-400' : '')
                          }
                        >
                          {h.text}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </nav>

              <Link
                href="/bi-kip-su-ke"
                className="block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3.5 text-center hover:border-orange-300 transition"
              >
                <div className="text-2xl mb-1">📚</div>
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Xem 35 bài đầy đủ
                </div>
                <div className="text-[11px] text-gray-500 mt-0.5">
                  Mục lục cẩm nang sư kê
                </div>
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </>
  )
}
