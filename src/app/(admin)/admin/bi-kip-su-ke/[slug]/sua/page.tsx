import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getArticleBySlug } from '@/lib/bi-kip/loader'
import fs from 'fs/promises'
import path from 'path'
import { BiKipEditor } from '@/components/admin/bi-kip/BiKipEditor'

export const revalidate = 0

const CONTENT_DIR = path.join(process.cwd(), 'bi kip su ke')

export default async function EditBiKipPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const article = await getArticleBySlug(slug)
  if (!article) notFound()

  const filePath = path.join(CONTENT_DIR, article.filename)
  const raw = await fs.readFile(filePath, 'utf-8')
  const stat = await fs.stat(filePath)

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
        <div>
          <Link
            href="/admin/bi-kip-su-ke"
            className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
          </Link>
          <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2 flex-wrap">
            ✏️ Sửa Bí Kíp · Bài {String(article.number).padStart(2, '0')}/35
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full border ${article.chapter.badge}`}
            >
              {article.chapter.emoji} {article.chapter.title}
            </span>
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
            {article.title}
          </p>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 font-mono">
            📄 {article.filename} · {(stat.size / 1024).toFixed(1)} KB · sửa lần cuối{' '}
            {new Date(stat.mtime).toLocaleString('vi-VN')}
          </div>
        </div>
        <Link
          href={`/bi-kip-su-ke/${article.slug}`}
          target="_blank"
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline self-center"
        >
          Xem trang public ↗
        </Link>
      </div>

      <BiKipEditor
        slug={article.slug}
        filename={article.filename}
        initialRaw={raw}
        articleNumber={article.number}
      />
    </div>
  )
}
