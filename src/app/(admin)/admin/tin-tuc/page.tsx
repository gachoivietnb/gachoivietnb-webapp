import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { NewsListClient } from '@/components/admin/news/NewsListClient'

export const revalidate = 0

export default async function NewsAdminList() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('news_articles')
    .select(
      'id, slug, title, excerpt, cover_image_url, status, category, tags, ai_generated, view_count, published_at, created_at'
    )
    .order('created_at', { ascending: false })
    .limit(500)

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
            📰 Tin tức
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Quản lý bài viết SEO · AI auto-generate · Publish ra trang public
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/tin-tuc" target="_blank" className="text-sm text-blue-600 dark:text-blue-400 hover:underline self-center">
            Xem trang public ↗
          </Link>
          <Link
            href="/admin/tin-tuc/them-moi?mode=ai"
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg px-4 py-2 text-sm font-semibold shadow hover:shadow-lg transition"
          >
            ✨ AI tạo bài mới
          </Link>
          <Link
            href="/admin/tin-tuc/them-moi"
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium"
          >
            + Viết bài mới
          </Link>
        </div>
      </div>

      <NewsListClient articles={(data ?? []) as never} />
    </div>
  )
}
