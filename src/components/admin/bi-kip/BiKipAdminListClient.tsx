'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { removeDiacritics } from '@/lib/utils/slugify'

export type AdminArticle = {
  number: number
  slug: string
  filename: string
  title: string
  metaDescription: string
  primaryKeyword: string
  expectedLength: string
  readMinutes: number
  wordCount: number
  secondaryKeywordsCount: number
  longTailKeywordsCount: number
  imagesCount: number
  hasHero: boolean
  chapter: {
    key: string
    emoji: string
    title: string
    bar: string
    badge: string
  }
}

type SortKey = 'number' | 'words_desc' | 'words_asc' | 'title'

export function BiKipAdminListClient({ articles }: { articles: AdminArticle[] }) {
  const [q, setQ] = useState('')
  const [chapterKey, setChapterKey] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('number')

  const qNorm = removeDiacritics(q.trim())

  const chapterList = useMemo(() => {
    const seen = new Set<string>()
    const out: AdminArticle['chapter'][] = []
    for (const a of articles) {
      if (!seen.has(a.chapter.key)) {
        seen.add(a.chapter.key)
        out.push(a.chapter)
      }
    }
    return out
  }, [articles])

  const filtered = useMemo(() => {
    const out = articles.filter((a) => {
      if (chapterKey && a.chapter.key !== chapterKey) return false
      if (qNorm) {
        const hay = removeDiacritics(
          `${a.title} ${a.primaryKeyword} ${a.metaDescription} ${a.slug}`
        )
        if (!hay.includes(qNorm)) return false
      }
      return true
    })
    out.sort((a, b) => {
      if (sortKey === 'words_desc') return b.wordCount - a.wordCount
      if (sortKey === 'words_asc') return a.wordCount - b.wordCount
      if (sortKey === 'title') return a.title.localeCompare(b.title, 'vi')
      return a.number - b.number
    })
    return out
  }, [articles, qNorm, chapterKey, sortKey])

  const hasFilter = !!q || !!chapterKey

  return (
    <div className="space-y-4">
      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm theo tên bài, từ khoá, slug…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          {hasFilter && (
            <button
              onClick={() => {
                setQ('')
                setChapterKey('')
              }}
              className="text-sm text-rose-600 dark:text-rose-400 hover:underline px-2"
            >
              Bỏ lọc
            </button>
          )}
        </div>

        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setChapterKey('')}
              className={
                'px-3 py-1.5 rounded-full text-xs font-medium border transition ' +
                (!chapterKey
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white border-transparent shadow'
                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-orange-400')
              }
            >
              🌐 Tất cả ({articles.length})
            </button>
            {chapterList.map((c) => {
              const active = chapterKey === c.key
              const count = articles.filter((a) => a.chapter.key === c.key).length
              return (
                <button
                  key={c.key}
                  onClick={() => setChapterKey(c.key)}
                  className={
                    'px-3 py-1.5 rounded-full text-xs font-medium border transition ' +
                    (active
                      ? `bg-gradient-to-r ${c.bar} text-white border-transparent shadow`
                      : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-orange-400')
                  }
                >
                  {c.emoji} {c.title} ({count})
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500 dark:text-gray-400">
              {filtered.length}/{articles.length}
            </span>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded px-2 py-1"
            >
              <option value="number">📑 Theo số bài</option>
              <option value="title">🔤 Tên A→Z</option>
              <option value="words_desc">✍️ Bài dài</option>
              <option value="words_asc">📏 Bài ngắn</option>
            </select>
          </div>
        </div>
      </section>

      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-10 text-center">
          <div className="text-5xl mb-2">🔍</div>
          <p className="text-sm text-gray-600 dark:text-gray-300">Không có bài khớp bộ lọc.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((a) => (
            <ArticleCard key={a.slug} article={a} />
          ))}
        </div>
      )}
    </div>
  )
}

function ArticleCard({ article }: { article: AdminArticle }) {
  const wordsOk = article.wordCount >= 1500
  const seoOk = article.metaDescription.length >= 100 && article.primaryKeyword.length > 0

  return (
    <article className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:shadow-lg hover:border-orange-300 transition flex flex-col">
      <div className={`h-1.5 bg-gradient-to-r ${article.chapter.bar}`} />
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400">
            BÀI {String(article.number).padStart(2, '0')}/35
          </span>
          <span className={`text-[10.5px] px-2 py-0.5 rounded-full border ${article.chapter.badge}`}>
            {article.chapter.emoji} {article.chapter.title}
          </span>
        </div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 leading-snug mb-1.5 line-clamp-2">
          {article.title}
        </h3>
        <p className="text-[12px] text-gray-600 dark:text-gray-400 line-clamp-2 mb-2 leading-relaxed">
          {article.metaDescription || (
            <span className="italic text-rose-600 dark:text-rose-400">
              ⚠️ Chưa có meta description
            </span>
          )}
        </p>

        {article.primaryKeyword && (
          <div className="text-[11px] text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900 rounded px-2 py-0.5 mb-2 inline-flex w-fit">
            🎯 {article.primaryKeyword}
          </div>
        )}

        <div className="grid grid-cols-3 gap-1.5 text-[11px] mt-auto mb-2">
          <Stat
            label="Từ"
            value={article.wordCount.toLocaleString('vi-VN')}
            ok={wordsOk}
            sub={`⏱ ${article.readMinutes}p`}
          />
          <Stat
            label="Keyword"
            value={`${article.secondaryKeywordsCount + article.longTailKeywordsCount}`}
            ok={article.secondaryKeywordsCount + article.longTailKeywordsCount > 0}
          />
          <Stat
            label="Ảnh"
            value={String(article.imagesCount)}
            ok={article.hasHero}
            sub={article.hasHero ? '✓ hero' : 'thiếu hero'}
          />
        </div>

        <div className="font-mono text-[10.5px] text-gray-400 truncate mb-3" title={article.filename}>
          /{article.slug}
        </div>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
          <div
            className={
              'text-[10.5px] font-medium ' +
              (seoOk
                ? 'text-emerald-700 dark:text-emerald-300'
                : 'text-amber-700 dark:text-amber-300')
            }
          >
            {seoOk ? '✓ SEO ổn' : '⚠ SEO chưa đủ'}
          </div>
          <div className="flex gap-1.5">
            <Link
              href={`/bi-kip-su-ke/${article.slug}`}
              target="_blank"
              className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-semibold"
            >
              👁 Xem
            </Link>
            <Link
              href={`/admin/bi-kip-su-ke/${article.slug}/sua`}
              className="text-[11px] bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg px-3 py-1 font-semibold shadow hover:shadow-md transition"
            >
              ✏️ Sửa
            </Link>
          </div>
        </div>
      </div>
    </article>
  )
}

function Stat({
  label,
  value,
  ok,
  sub,
}: {
  label: string
  value: string
  ok?: boolean
  sub?: string
}) {
  return (
    <div className="bg-gray-50 dark:bg-gray-900/40 rounded px-2 py-1">
      <div className="text-[9px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </div>
      <div
        className={
          'font-bold tabular-nums text-[11px] ' +
          (ok
            ? 'text-emerald-700 dark:text-emerald-300'
            : 'text-amber-700 dark:text-amber-300')
        }
      >
        {value}
      </div>
      {sub && <div className="text-[9px] text-gray-500 dark:text-gray-400">{sub}</div>}
    </div>
  )
}
