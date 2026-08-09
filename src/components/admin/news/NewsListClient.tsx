'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatDateTime } from '@/lib/utils/format'
import { removeDiacritics } from '@/lib/utils/slugify'

type Article = {
  id: string
  slug: string
  title: string
  excerpt: string | null
  cover_image_url: string | null
  status: 'draft' | 'published' | 'archived'
  category: string
  tags: string[] | null
  ai_generated: boolean
  view_count: number
  published_at: string | null
  created_at: string
}

const CAT_META: Record<string, { label: string; emoji: string; gradient: string }> = {
  'tin-tuc': { label: 'Tin tức', emoji: '📰', gradient: 'from-blue-500 to-indigo-600' },
  'kinh-nghiem': { label: 'Kinh nghiệm', emoji: '💡', gradient: 'from-amber-500 to-orange-600' },
  'su-kien': { label: 'Sự kiện', emoji: '🎉', gradient: 'from-purple-500 to-pink-600' },
  'giong-ga': { label: 'Giống gà', emoji: '🧬', gradient: 'from-emerald-500 to-green-600' },
  'cham-soc': { label: 'Chăm sóc', emoji: '💚', gradient: 'from-teal-500 to-cyan-600' },
}

const STATUS_META: Record<
  string,
  { label: string; pill: string; emoji: string; gradient: string }
> = {
  draft: {
    label: 'Nháp',
    pill: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
    emoji: '📝',
    gradient: 'from-gray-400 to-slate-500',
  },
  published: {
    label: 'Đã đăng',
    pill: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
    emoji: '🌐',
    gradient: 'from-emerald-500 to-green-600',
  },
  archived: {
    label: 'Lưu trữ',
    pill: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
    emoji: '🗄️',
    gradient: 'from-amber-500 to-orange-600',
  },
}

type SortKey = 'newest' | 'oldest' | 'most_viewed' | 'title'
type ViewMode = 'grid' | 'list'
type StatusFilter = '' | 'draft' | 'published' | 'archived'
type AiFilter = '' | 'ai' | 'human'

export function NewsListClient({ articles }: { articles: Article[] }) {
  const [busy, setBusy] = useState<string | null>(null)
  const [bulkBusy, setBulkBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<StatusFilter>('')
  const [category, setCategory] = useState('')
  const [aiFilter, setAiFilter] = useState<AiFilter>('')
  const [hasImage, setHasImage] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('newest')
  const [view, setView] = useState<ViewMode>('grid')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const router = useRouter()

  const qNorm = removeDiacritics(q.trim())

  const filtered = useMemo(() => {
    const out = articles.filter((a) => {
      if (qNorm) {
        const hay = removeDiacritics(`${a.title} ${a.excerpt ?? ''} ${a.slug} ${(a.tags ?? []).join(' ')}`)
        if (!hay.includes(qNorm)) return false
      }
      if (status && a.status !== status) return false
      if (category && a.category !== category) return false
      if (aiFilter === 'ai' && !a.ai_generated) return false
      if (aiFilter === 'human' && a.ai_generated) return false
      if (hasImage && !a.cover_image_url) return false
      return true
    })
    const sorted = [...out]
    if (sortKey === 'newest') sorted.sort((a, b) => b.created_at.localeCompare(a.created_at))
    else if (sortKey === 'oldest') sorted.sort((a, b) => a.created_at.localeCompare(b.created_at))
    else if (sortKey === 'most_viewed') sorted.sort((a, b) => b.view_count - a.view_count)
    else if (sortKey === 'title') sorted.sort((a, b) => a.title.localeCompare(b.title, 'vi'))
    return sorted
  }, [articles, qNorm, status, category, aiFilter, hasImage, sortKey])

  // KPIs (live)
  const total = articles.length
  const published = articles.filter((a) => a.status === 'published').length
  const draft = articles.filter((a) => a.status === 'draft').length
  const archived = articles.filter((a) => a.status === 'archived').length
  const aiGenerated = articles.filter((a) => a.ai_generated).length
  const totalViews = articles.reduce((s, a) => s + a.view_count, 0)
  const topArticle = articles
    .filter((a) => a.status === 'published' && a.view_count > 0)
    .sort((a, b) => b.view_count - a.view_count)[0]

  // Counts per category for chip badges
  const byCat: Record<string, number> = {}
  for (const a of articles) byCat[a.category] = (byCat[a.category] ?? 0) + 1

  const hasFilter = !!(q || status || category || aiFilter || hasImage)
  function clearFilters() {
    setQ('')
    setStatus('')
    setCategory('')
    setAiFilter('')
    setHasImage(false)
  }

  async function changeStatus(id: string, newStatus: 'draft' | 'published' | 'archived') {
    setBusy(id)
    try {
      const res = await fetch(`/api/news/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const j = await res.json()
      if (!res.ok) setMsg(`❌ ${j.error ?? 'Lỗi'}`)
      else {
        setMsg(
          newStatus === 'published'
            ? '✓ Đã publish'
            : newStatus === 'draft'
              ? 'Đã chuyển về nháp'
              : 'Đã lưu trữ'
        )
        router.refresh()
      }
      setTimeout(() => setMsg(null), 3000)
    } finally {
      setBusy(null)
    }
  }

  async function remove(a: Article) {
    if (!confirm(`Xóa bài "${a.title}"? Không hoàn tác.`)) return
    setBusy(a.id)
    try {
      const res = await fetch(`/api/news/${a.id}`, { method: 'DELETE' })
      if (res.ok) {
        setMsg(`✓ Đã xóa`)
        router.refresh()
      }
      setTimeout(() => setMsg(null), 3000)
    } finally {
      setBusy(null)
    }
  }

  // Bulk actions
  function toggleSelect(id: string) {
    setSelected((p) => {
      const n = new Set(p)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }
  function toggleAllVisible() {
    const ids = filtered.map((a) => a.id)
    const allSelected = ids.every((id) => selected.has(id))
    setSelected((p) => {
      const n = new Set(p)
      if (allSelected) ids.forEach((id) => n.delete(id))
      else ids.forEach((id) => n.add(id))
      return n
    })
  }
  async function bulkChangeStatus(newStatus: 'draft' | 'published' | 'archived') {
    if (selected.size === 0) return
    setBulkBusy(true)
    try {
      for (const id of selected) {
        await fetch(`/api/news/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        })
      }
      setSelected(new Set())
      setMsg(`✓ Đã đổi trạng thái ${selected.size} bài`)
      router.refresh()
      setTimeout(() => setMsg(null), 3000)
    } finally {
      setBulkBusy(false)
    }
  }
  async function bulkDelete() {
    if (selected.size === 0) return
    if (!confirm(`Xóa ${selected.size} bài đã chọn? Không hoàn tác.`)) return
    setBulkBusy(true)
    try {
      for (const id of selected) {
        await fetch(`/api/news/${id}`, { method: 'DELETE' })
      }
      setSelected(new Set())
      setMsg(`✓ Đã xóa`)
      router.refresh()
      setTimeout(() => setMsg(null), 3000)
    } finally {
      setBulkBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      {msg && (
        <div className="bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 p-2.5 rounded-lg text-sm">
          {msg}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Kpi label="Tổng bài" value={total.toLocaleString('vi-VN')} sub={`${filtered.length} hiển thị`} tint="blue" icon="📰" />
        <Kpi
          label="Đã đăng"
          value={published.toLocaleString('vi-VN')}
          sub={total > 0 ? `${Math.round((published / total) * 100)}% / tổng` : '—'}
          tint="emerald"
          icon="🌐"
        />
        <Kpi label="Bài nháp" value={draft.toLocaleString('vi-VN')} sub={archived > 0 ? `${archived} lưu trữ` : 'Sẵn sàng'} tint="amber" icon="📝" />
        <Kpi
          label="Tổng lượt xem"
          value={totalViews.toLocaleString('vi-VN')}
          sub={topArticle ? `🥇 ${topArticle.title.slice(0, 22)}${topArticle.title.length > 22 ? '...' : ''}` : '—'}
          tint="purple"
          icon="👁️"
        />
        <Kpi label="Bài AI viết" value={aiGenerated.toLocaleString('vi-VN')} sub="✨ Auto-generated" tint="pink" icon="🤖" />
      </div>

      {/* Filter bar */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">🔍 Lọc thông minh</h2>
          {hasFilter && (
            <button onClick={clearFilters} className="text-xs text-red-600 dark:text-red-400 hover:underline font-semibold ml-auto">
              ✕ Xóa lọc
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 md:gap-3">
          <div className="relative md:col-span-2">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">🔍</span>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tiêu đề, mô tả, tag, slug..."
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg pl-9 pr-3 py-2 text-sm outline-none"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">📋 Mọi trạng thái</option>
            <option value="draft">📝 Nháp</option>
            <option value="published">🌐 Đã đăng</option>
            <option value="archived">🗄️ Lưu trữ</option>
          </select>
          <select
            value={aiFilter}
            onChange={(e) => setAiFilter(e.target.value as AiFilter)}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">🖋 Mọi nguồn</option>
            <option value="ai">🤖 AI viết</option>
            <option value="human">✍️ Người viết</option>
          </select>
          <label className="flex items-center gap-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
            <input type="checkbox" checked={hasImage} onChange={(e) => setHasImage(e.target.checked)} className="w-4 h-4 accent-blue-600" />
            <span className="font-medium">🖼 Có ảnh bìa</span>
          </label>
        </div>

        {/* Category pills */}
        <div className="mt-3 flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mr-1">
            Danh mục:
          </span>
          <button
            onClick={() => setCategory('')}
            className={`text-xs px-2.5 py-1 rounded-full font-semibold transition ${
              !category
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
            }`}
          >
            Tất cả ({total})
          </button>
          {Object.entries(CAT_META).map(([k, m]) => (
            <button
              key={k}
              onClick={() => setCategory(k)}
              className={`text-xs px-2.5 py-1 rounded-full font-semibold transition ${
                category === k
                  ? `bg-gradient-to-r ${m.gradient} text-white shadow-sm`
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              {m.emoji} {m.label} ({byCat[k] ?? 0})
            </button>
          ))}
        </div>

        {/* Sort + view */}
        <div className="mt-3 flex items-center gap-2 flex-wrap pt-3 border-t border-gray-100 dark:border-gray-700">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sắp xếp:</span>
          {(
            [
              ['newest', '🆕 Mới nhất'],
              ['most_viewed', '🔥 Nhiều view'],
              ['title', '🔤 Tiêu đề'],
              ['oldest', '📅 Cũ nhất'],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setSortKey(k)}
              className={`text-xs px-2.5 py-1 rounded-full font-semibold transition ${
                sortKey === k
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              {l}
            </button>
          ))}

          <div className="ml-auto flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
            <button
              onClick={() => setView('grid')}
              className={`text-xs px-2.5 py-1 rounded font-semibold transition ${
                view === 'grid' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              ▦ Lưới
            </button>
            <button
              onClick={() => setView('list')}
              className={`text-xs px-2.5 py-1 rounded font-semibold transition ${
                view === 'list' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              ☰ Danh sách
            </button>
          </div>
        </div>
      </div>

      {/* Bulk actions bar */}
      {selected.size > 0 && (
        <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-900 rounded-lg px-3 py-2 flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-blue-700 dark:text-blue-300">
            ☑ Đã chọn {selected.size}
          </span>
          <button
            onClick={() => bulkChangeStatus('published')}
            disabled={bulkBusy}
            className="text-xs px-2.5 py-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-50"
          >
            🌐 Publish
          </button>
          <button
            onClick={() => bulkChangeStatus('draft')}
            disabled={bulkBusy}
            className="text-xs px-2.5 py-1 rounded-full bg-gray-500 hover:bg-gray-600 text-white font-semibold disabled:opacity-50"
          >
            📝 Nháp
          </button>
          <button
            onClick={() => bulkChangeStatus('archived')}
            disabled={bulkBusy}
            className="text-xs px-2.5 py-1 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-semibold disabled:opacity-50"
          >
            🗄️ Lưu trữ
          </button>
          <button
            onClick={bulkDelete}
            disabled={bulkBusy}
            className="text-xs px-2.5 py-1 rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold disabled:opacity-50"
          >
            🗑 Xóa
          </button>
          <button onClick={() => setSelected(new Set())} className="text-xs text-blue-700 dark:text-blue-300 hover:underline font-semibold ml-auto">
            ✕ Bỏ chọn
          </button>
        </div>
      )}

      {/* Select all visible */}
      {filtered.length > 0 && (
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={toggleAllVisible}
            className="px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-semibold"
          >
            {filtered.every((a) => selected.has(a.id))
              ? '☐ Bỏ chọn hiển thị'
              : `☑ Chọn tất cả (${filtered.length})`}
          </button>
          <span className="text-gray-500 dark:text-gray-400">
            <b className="text-gray-900 dark:text-gray-100">{filtered.length}</b> bài
          </span>
        </div>
      )}

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 md:p-12 text-center">
          <div className="text-5xl mb-2">📰</div>
          <p className="text-gray-600 dark:text-gray-400 text-lg font-semibold">
            {articles.length === 0 ? 'Chưa có bài nào' : 'Không có bài nào khớp tiêu chí'}
          </p>
          {hasFilter && articles.length > 0 && (
            <button onClick={clearFilters} className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline font-semibold">
              Bỏ tất cả bộ lọc
            </button>
          )}
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((a) => (
            <NewsCard
              key={a.id}
              a={a}
              selected={selected.has(a.id)}
              busy={busy === a.id}
              onSelect={() => toggleSelect(a.id)}
              onChangeStatus={(s) => changeStatus(a.id, s)}
              onDelete={() => remove(a)}
            />
          ))}
        </div>
      ) : (
        <ListView
          items={filtered}
          selected={selected}
          busy={busy}
          onSelect={toggleSelect}
          onChangeStatus={(id, s) => changeStatus(id, s)}
          onDelete={remove}
        />
      )}
    </div>
  )
}

/* ========= GRID CARD ========= */
function NewsCard({
  a,
  selected,
  busy,
  onSelect,
  onChangeStatus,
  onDelete,
}: {
  a: Article
  selected: boolean
  busy: boolean
  onSelect: () => void
  onChangeStatus: (s: 'draft' | 'published' | 'archived') => void
  onDelete: () => void
}) {
  const cat = CAT_META[a.category] ?? { label: a.category, emoji: '📄', gradient: 'from-gray-500 to-slate-500' }
  const status = STATUS_META[a.status] ?? STATUS_META.draft

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border-2 transition-all shadow-sm hover:shadow-xl hover:-translate-y-0.5 ${
        selected ? 'border-blue-500 ring-2 ring-blue-300 dark:ring-blue-900' : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      {/* Cover */}
      <div className="relative aspect-video bg-gray-100 dark:bg-gray-700">
        {a.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={a.cover_image_url} alt={a.title} className="w-full h-full object-cover" />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${cat.gradient} flex items-center justify-center text-5xl`}>
            {cat.emoji}
          </div>
        )}
        {/* Select checkbox */}
        <button
          onClick={onSelect}
          className={`absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition shadow ${
            selected ? 'bg-blue-600 text-white' : 'bg-white/95 text-gray-400 hover:text-gray-700'
          }`}
        >
          {selected ? '✓' : '○'}
        </button>
        {/* AI badge */}
        {a.ai_generated && (
          <span className="absolute top-2 right-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full px-2 py-0.5 text-[10px] font-bold shadow">
            🤖 AI
          </span>
        )}
        {/* Status badge */}
        <span className={`absolute bottom-2 left-2 ${status.pill} rounded-full px-2 py-0.5 text-[10px] font-bold shadow`}>
          {status.emoji} {status.label}
        </span>
        {/* Category badge */}
        <span className={`absolute bottom-2 right-2 bg-gradient-to-r ${cat.gradient} text-white rounded-full px-2 py-0.5 text-[10px] font-bold shadow`}>
          {cat.emoji} {cat.label}
        </span>
      </div>

      <div className="p-3">
        <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 line-clamp-2 leading-tight min-h-[2.5em]">
          {a.title}
        </h3>
        {a.excerpt && (
          <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">{a.excerpt}</p>
        )}

        {/* Meta */}
        <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400 mt-2 flex-wrap">
          <span>{formatDateTime(a.created_at).slice(0, 10)}</span>
          {a.status === 'published' && (
            <>
              <span>·</span>
              <span className="font-semibold text-purple-600 dark:text-purple-400">👁️ {a.view_count}</span>
            </>
          )}
        </div>

        {/* Slug */}
        <div className="text-[10px] font-mono text-gray-400 dark:text-gray-500 truncate mt-1">/{a.slug}</div>

        {/* Tags */}
        {a.tags && a.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {a.tags.slice(0, 3).map((t) => (
              <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                #{t}
              </span>
            ))}
            {a.tags.length > 3 && (
              <span className="text-[9px] text-gray-400">+{a.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 mt-3 pt-2 border-t border-gray-100 dark:border-gray-700">
          <Link
            href={`/admin/tin-tuc/${a.id}/sua`}
            className="flex-1 text-center text-[10px] px-2 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-semibold"
          >
            ✎ Sửa
          </Link>
          {a.status === 'published' ? (
            <Link
              href={`/tin-tuc/${a.slug}`}
              target="_blank"
              className="text-[10px] px-2 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 hover:bg-emerald-200 text-emerald-700 dark:text-emerald-300 font-semibold"
              title="Xem trang public"
            >
              ↗
            </Link>
          ) : (
            <button
              onClick={() => onChangeStatus('published')}
              disabled={busy}
              className="text-[10px] px-2 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 hover:bg-emerald-200 text-emerald-700 dark:text-emerald-300 font-semibold disabled:opacity-50"
              title="Publish"
            >
              🌐
            </button>
          )}
          <button
            onClick={() =>
              onChangeStatus(a.status === 'archived' ? 'draft' : 'archived')
            }
            disabled={busy}
            className="text-[10px] px-2 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 text-amber-700 dark:text-amber-300 font-semibold disabled:opacity-50"
            title={a.status === 'archived' ? 'Bỏ lưu trữ' : 'Lưu trữ'}
          >
            🗄️
          </button>
          <button
            onClick={onDelete}
            disabled={busy}
            className="text-[10px] px-2 py-1.5 rounded-lg bg-red-100 dark:bg-red-900/40 hover:bg-red-200 text-red-700 dark:text-red-300 font-semibold disabled:opacity-50"
            title="Xóa"
          >
            🗑
          </button>
        </div>
      </div>
    </div>
  )
}

/* ========= LIST VIEW ========= */
function ListView({
  items,
  selected,
  busy,
  onSelect,
  onChangeStatus,
  onDelete,
}: {
  items: Article[]
  selected: Set<string>
  busy: string | null
  onSelect: (id: string) => void
  onChangeStatus: (id: string, s: 'draft' | 'published' | 'archived') => void
  onDelete: (a: Article) => void
}) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
      <ul className="divide-y divide-gray-100 dark:divide-gray-700">
        {items.map((a) => {
          const cat = CAT_META[a.category] ?? { label: a.category, emoji: '📄', gradient: 'from-gray-500 to-slate-500' }
          const status = STATUS_META[a.status] ?? STATUS_META.draft
          const isSelected = selected.has(a.id)
          return (
            <li
              key={a.id}
              className={`p-3 hover:bg-gray-50/60 dark:hover:bg-gray-900/30 transition ${
                isSelected ? 'bg-blue-50/60 dark:bg-blue-950/30' : ''
              }`}
            >
              <div className="flex gap-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onSelect(a.id)}
                  className="mt-1 w-4 h-4 accent-blue-600"
                />
                {/* Thumb */}
                <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0">
                  {a.cover_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.cover_image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${cat.gradient} flex items-center justify-center text-3xl`}>
                      {cat.emoji}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{a.title}</h3>
                      {a.excerpt && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1 mt-0.5">{a.excerpt}</p>
                      )}
                    </div>
                    <div className="flex gap-1 flex-wrap shrink-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${status.pill}`}>
                        {status.emoji} {status.label}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold bg-gradient-to-r ${cat.gradient} text-white`}>
                        {cat.emoji} {cat.label}
                      </span>
                      {a.ai_generated && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold">
                          🤖 AI
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400 mt-2 flex-wrap">
                    <span>Tạo: {formatDateTime(a.created_at)}</span>
                    {a.published_at && (
                      <>
                        <span>·</span>
                        <span>Đăng: {formatDateTime(a.published_at)}</span>
                      </>
                    )}
                    {a.status === 'published' && (
                      <>
                        <span>·</span>
                        <span className="font-semibold text-purple-600 dark:text-purple-400">👁️ {a.view_count}</span>
                      </>
                    )}
                    <span>·</span>
                    <span className="font-mono">/{a.slug}</span>
                  </div>

                  <div className="flex items-center gap-3 mt-2 text-xs">
                    <Link href={`/admin/tin-tuc/${a.id}/sua`} className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                      ✎ Sửa
                    </Link>
                    {a.status === 'published' && (
                      <Link href={`/tin-tuc/${a.slug}`} target="_blank" className="text-emerald-600 dark:text-emerald-400 hover:underline">
                        ↗ Xem public
                      </Link>
                    )}
                    {a.status !== 'published' && (
                      <button
                        onClick={() => onChangeStatus(a.id, 'published')}
                        disabled={busy === a.id}
                        className="text-emerald-600 dark:text-emerald-400 hover:underline"
                      >
                        🌐 Publish
                      </button>
                    )}
                    {a.status === 'published' && (
                      <button
                        onClick={() => onChangeStatus(a.id, 'draft')}
                        disabled={busy === a.id}
                        className="text-amber-600 dark:text-amber-400 hover:underline"
                      >
                        ⬅ Về nháp
                      </button>
                    )}
                    {a.status !== 'archived' && (
                      <button
                        onClick={() => onChangeStatus(a.id, 'archived')}
                        disabled={busy === a.id}
                        className="text-gray-500 dark:text-gray-400 hover:underline"
                      >
                        🗄️ Lưu trữ
                      </button>
                    )}
                    <button
                      onClick={() => onDelete(a)}
                      disabled={busy === a.id}
                      className="text-red-600 dark:text-red-400 hover:underline ml-auto"
                    >
                      🗑 Xóa
                    </button>
                  </div>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function Kpi({
  label,
  value,
  sub,
  tint,
  icon,
}: {
  label: string
  value: string
  sub?: string
  tint: 'blue' | 'emerald' | 'amber' | 'purple' | 'pink'
  icon: string
}) {
  const map: Record<string, string> = {
    blue: 'from-blue-500 to-indigo-600',
    emerald: 'from-emerald-500 to-green-600',
    amber: 'from-amber-500 to-orange-600',
    purple: 'from-purple-500 to-fuchsia-600',
    pink: 'from-pink-500 to-rose-600',
  }
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-sm relative overflow-hidden">
      <div className={`absolute top-0 right-0 w-14 h-14 rounded-full bg-gradient-to-br ${map[tint]} opacity-10 -translate-y-4 translate-x-4`} />
      <div className="flex items-start justify-between gap-2 relative">
        <div className="min-w-0">
          <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest truncate">{label}</div>
          <div className="text-base md:text-xl font-extrabold text-gray-900 dark:text-gray-100 mt-0.5 tabular-nums truncate">
            {value}
          </div>
          {sub && <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5">{sub}</div>}
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  )
}
