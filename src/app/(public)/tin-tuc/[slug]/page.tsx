import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { markdownToHtml } from '@/lib/utils/markdown'
import { SITE_URL, SITE_FULL_NAME } from '@/lib/utils/constants'

export const revalidate = 600

const CAT_LABEL: Record<string, string> = {
  'tin-tuc': 'Tin tức',
  'kinh-nghiem': 'Kinh nghiệm',
  'su-kien': 'Sự kiện',
  'giong-ga': 'Giống gà',
  'cham-soc': 'Chăm sóc',
}

type Article = {
  id: string
  slug: string
  title: string
  excerpt: string | null
  body_markdown: string
  cover_image_url: string | null
  category: string
  tags: string[] | null
  source_url: string | null
  source_name: string | null
  seo_title: string | null
  seo_description: string | null
  published_at: string | null
  updated_at: string
  view_count: number
  author_id: string | null
}

async function loadArticle(slug: string): Promise<Article | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('news_articles')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()
  return (data as Article | null) ?? null
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const article = await loadArticle(slug)
  if (!article) return { title: 'Không tìm thấy bài viết' }

  const rawTitle = article.seo_title || article.title
  const titleHasBrand = /Gà Chọi Việt/i.test(rawTitle)
  const title = titleHasBrand ? rawTitle : `${rawTitle} | ${SITE_FULL_NAME}`
  const description =
    article.seo_description ||
    article.excerpt ||
    `Bài viết về ${article.title} — ${SITE_FULL_NAME}`
  const url = `${SITE_URL}/tin-tuc/${article.slug}`
  const images = article.cover_image_url
    ? [{ url: article.cover_image_url, width: 1200, height: 630 }]
    : []

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_FULL_NAME,
      locale: 'vi_VN',
      type: 'article',
      publishedTime: article.published_at ?? undefined,
      modifiedTime: article.updated_at,
      images,
      tags: article.tags ?? [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: article.cover_image_url ? [article.cover_image_url] : [],
    },
  }
}

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const article = await loadArticle(slug)
  if (!article) notFound()

  // Increment view count (không await - fire & forget)
  const supabase = await createClient()
  void supabase.rpc('news_increment_view', { p_slug: slug })

  // Related posts cùng category
  const { data: relatedData } = await supabase
    .from('news_articles')
    .select('id, slug, title, cover_image_url, category, published_at')
    .eq('status', 'published')
    .eq('category', article.category)
    .neq('id', article.id)
    .order('published_at', { ascending: false })
    .limit(3)
  const related = (relatedData ?? []) as Array<{
    id: string
    slug: string
    title: string
    cover_image_url: string | null
    category: string
    published_at: string | null
  }>

  const html = markdownToHtml(article.body_markdown)
  const publishedDate = article.published_at
    ? new Date(article.published_at).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  // JSON-LD Article schema (SEO)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    description: article.excerpt ?? article.seo_description ?? '',
    image: article.cover_image_url ? [article.cover_image_url] : [],
    datePublished: article.published_at,
    dateModified: article.updated_at,
    author: {
      '@type': 'Organization',
      name: SITE_FULL_NAME,
      url: SITE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_FULL_NAME,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/icon-512.png` },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/tin-tuc/${article.slug}`,
    },
    keywords: (article.tags ?? []).join(', '),
  }

  return (
    <>
      {/* JSON-LD for Google structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Breadcrumb */}
        <nav className="text-xs text-gray-500 dark:text-gray-400 mb-4" aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5 flex-wrap">
            <li>
              <Link href="/" className="hover:underline">
                Trang chủ
              </Link>
            </li>
            <li>›</li>
            <li>
              <Link href="/tin-tuc" className="hover:underline">
                Tin tức
              </Link>
            </li>
            <li>›</li>
            <li>
              <Link
                href={`/tin-tuc?category=${article.category}`}
                className="hover:underline"
              >
                {CAT_LABEL[article.category]}
              </Link>
            </li>
          </ol>
        </nav>

        {/* Header */}
        <header className="mb-6">
          <span className="inline-block text-xs font-bold tracking-wider uppercase bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 rounded px-2.5 py-1 mb-3">
            {CAT_LABEL[article.category] ?? article.category}
          </span>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 leading-tight mb-3">
            {article.title}
          </h1>
          {article.excerpt && (
            <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
              {article.excerpt}
            </p>
          )}
          <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mt-4 pb-4 border-b border-gray-200 dark:border-gray-700 flex-wrap">
            <span>🏠 {SITE_FULL_NAME}</span>
            {publishedDate && (
              <>
                <span>·</span>
                <time dateTime={article.published_at ?? undefined}>{publishedDate}</time>
              </>
            )}
            {article.view_count > 0 && (
              <>
                <span>·</span>
                <span>👁️ {article.view_count} lượt xem</span>
              </>
            )}
          </div>
        </header>

        {/* Cover image */}
        {article.cover_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.cover_image_url}
            alt={article.title}
            className="w-full rounded-xl mb-6 object-cover max-h-96"
          />
        )}

        {/* Body */}
        <div
          className="prose prose-lg dark:prose-invert max-w-none text-gray-800 dark:text-gray-200"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {/* Tags */}
        {article.tags && article.tags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Tags:</span>
            {article.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full px-3 py-1"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Source */}
        {article.source_url && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-6 italic">
            Nguồn tham khảo:{' '}
            <a
              href={article.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              {article.source_name ?? article.source_url}
            </a>
          </p>
        )}

        {/* CTA */}
        <section className="mt-10 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-2xl p-6 md:p-8 text-center">
          <h3 className="text-xl font-bold mb-2">Quan tâm tới gà chọi chất lượng?</h3>
          <p className="opacity-95 mb-4">
            Xem ngay danh sách gà đang bán tại {SITE_FULL_NAME}
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link
              href="/ban"
              className="bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 rounded-xl px-6 py-2.5 font-bold hover:scale-105 transition"
            >
              🔥 Xem gà đang bán
            </Link>
            <Link
              href="/lien-he"
              className="bg-white/10 backdrop-blur-sm border-2 border-white text-white rounded-xl px-6 py-2.5 font-bold hover:bg-white/20 transition"
            >
              📞 Liên hệ
            </Link>
          </div>
        </section>

        {/* Related */}
        {related.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              📚 Bài viết liên quan
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {related.map((r) => (
                <Link
                  key={r.id}
                  href={`/tin-tuc/${r.slug}`}
                  className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:shadow-lg transition"
                >
                  <div className="aspect-video bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 overflow-hidden">
                    {r.cover_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.cover_image_url}
                        alt={r.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl text-gray-400 dark:text-gray-500">
                        📰
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      {r.title}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </>
  )
}
