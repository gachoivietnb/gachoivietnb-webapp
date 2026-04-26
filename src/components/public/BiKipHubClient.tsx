'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { removeDiacritics } from '@/lib/utils/slugify'

export type ArticleCard = {
  number: number
  slug: string
  title: string
  metaDescription: string
  primaryKeyword: string
  expectedLength: string
  readMinutes: number
  wordCount: number
  heroImage: { url: string; alt: string } | null
  chapter: {
    key: string
    emoji: string
    title: string
    bar: string
    badge: string
  }
}

export function BiKipHubClient({ articles }: { articles: ArticleCard[] }) {
  const [q, setQ] = useState('')
  const [chapterKey, setChapterKey] = useState<string>('')

  const qNorm = removeDiacritics(q.trim())

  const filtered = useMemo(() => {
    return articles.filter((a) => {
      if (chapterKey && a.chapter.key !== chapterKey) return false
      if (qNorm) {
        const hay = removeDiacritics(`${a.title} ${a.metaDescription} ${a.primaryKeyword}`)
        if (!hay.includes(qNorm)) return false
      }
      return true
    })
  }, [articles, qNorm, chapterKey])

  // Group by chapter key (preserves chapter order)
  const grouped = useMemo(() => {
    const map = new Map<string, ArticleCard[]>()
    for (const a of filtered) {
      const arr = map.get(a.chapter.key) ?? []
      arr.push(a)
      map.set(a.chapter.key, arr)
    }
    return Array.from(map.entries())
  }, [filtered])

  const chapterCounts = useMemo(() => {
    const m: Record<string, number> = {}
    for (const a of articles) m[a.chapter.key] = (m[a.chapter.key] ?? 0) + 1
    return m
  }, [articles])

  // Unique chapters in original order
  const chapterList = useMemo(() => {
    const seen = new Set<string>()
    const out: ArticleCard['chapter'][] = []
    for (const a of articles) {
      if (!seen.has(a.chapter.key)) {
        seen.add(a.chapter.key)
        out.push(a.chapter)
      }
    }
    return out
  }, [articles])

  function reset() {
    setQ('')
    setChapterKey('')
  }

  const hasFilter = !!q || !!chapterKey

  return (
    <div className="space-y-6">
      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3 sticky top-16 z-30">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm theo tên bài, từ khoá: chuồng, thức ăn, bệnh, asil…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          {hasFilter && (
            <button
              onClick={reset}
              className="text-sm text-rose-600 dark:text-rose-400 hover:underline px-2"
            >
              Bỏ lọc
            </button>
          )}
        </div>
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
                {c.emoji} {c.title} ({chapterCounts[c.key] ?? 0})
              </button>
            )
          })}
        </div>
        <div className="text-[11px] text-gray-500 dark:text-gray-400">
          Hiện <strong className="text-gray-900 dark:text-gray-100">{filtered.length}</strong>/
          {articles.length} bài
        </div>
      </section>

      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-10 text-center">
          <div className="text-5xl mb-2">📚</div>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
            Không có bài nào khớp <strong>&ldquo;{q}&rdquo;</strong>.
          </p>
          {hasFilter && (
            <button
              onClick={reset}
              className="text-sm bg-orange-500 hover:bg-orange-600 text-white rounded-lg px-4 py-2"
            >
              Bỏ tất cả bộ lọc
            </button>
          )}
        </div>
      ) : (
        grouped.map(([chapKey, items]) => {
          const ch = chapterList.find((c) => c.key === chapKey)!
          return (
            <section key={chapKey}>
              <div className="flex items-end justify-between flex-wrap gap-2 mb-3">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <span className="text-2xl">{ch.emoji}</span>
                  {ch.title}
                </h2>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {items.length} bài
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map((a) => (
                  <ArticleCardItem key={a.slug} article={a} />
                ))}
              </div>
            </section>
          )
        })
      )}
    </div>
  )
}

function ArticleCardItem({ article }: { article: ArticleCard }) {
  return (
    <Link
      href={`/bi-kip-su-ke/${article.slug}`}
      className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:shadow-lg hover:border-orange-300 transition flex flex-col"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800">
        {article.heroImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.heroImage.url}
            alt={article.heroImage.alt}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl opacity-40">
            🐓
          </div>
        )}
        <div className={`absolute inset-x-0 bottom-0 h-1.5 bg-gradient-to-r ${article.chapter.bar}`} />
        <div className="absolute top-2 left-2 text-[10.5px] font-bold bg-white/90 dark:bg-gray-900/90 backdrop-blur text-gray-700 dark:text-gray-300 rounded px-1.5 py-0.5 font-mono">
          BÀI {String(article.number).padStart(2, '0')}/35
        </div>
      </div>
      <div className="p-3.5 flex-1 flex flex-col">
        <div className="flex items-center gap-1 flex-wrap mb-1.5">
          <span className={`text-[10.5px] px-2 py-0.5 rounded-full border ${article.chapter.badge}`}>
            {article.chapter.emoji} {article.chapter.title}
          </span>
        </div>
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-base leading-snug group-hover:text-orange-700 dark:group-hover:text-orange-400 transition line-clamp-2">
          {article.title}
        </h3>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1.5 line-clamp-2 leading-relaxed flex-1">
          {article.metaDescription}
        </p>
        <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-gray-100 dark:border-gray-700 text-[11px] text-gray-500 dark:text-gray-400">
          <span>⏱ {article.readMinutes} phút đọc</span>
          <span className="text-orange-600 dark:text-orange-400 group-hover:translate-x-0.5 transition-transform font-semibold">
            Đọc →
          </span>
        </div>
      </div>
    </Link>
  )
}
