'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { removeDiacritics } from '@/lib/utils/slugify'
import {
  type DiaryEntryWithMeta,
  type DiaryCategory,
  type DiaryMood,
  type DiaryComment,
  CATEGORY_META,
  MOOD_META,
  weatherEmoji,
} from '@/lib/diary/types'
import type { DiaryKpi } from '@/lib/diary/queries'
import { DiaryFormModal } from './DiaryFormModal'
import { DiarySummaryModal } from './DiarySummaryModal'

type Profile = { id: string; full_name: string }
type Area = { id: string; code: string; name: string }

const PRESETS = [
  { key: 'this_week', label: '7 ngày qua' },
  { key: 'this_month', label: '30 ngày' },
  { key: 'last_90', label: '90 ngày' },
  { key: 'this_year', label: 'Năm nay' },
  { key: 'all', label: 'Tất cả' },
] as const

function presetRange(p: string): { from?: string; to?: string } {
  const today = new Date()
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  if (p === 'this_week') {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return { from: fmt(d), to: fmt(today) }
  }
  if (p === 'this_month') {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return { from: fmt(d), to: fmt(today) }
  }
  if (p === 'last_90') {
    const d = new Date()
    d.setDate(d.getDate() - 90)
    return { from: fmt(d), to: fmt(today) }
  }
  if (p === 'this_year') {
    return { from: fmt(new Date(today.getFullYear(), 0, 1)), to: fmt(today) }
  }
  return {}
}

export function DiaryClient({
  initialEntries,
  initialKpi,
  profiles,
  areas,
  currentUserId,
  isOwner,
}: {
  initialEntries: DiaryEntryWithMeta[]
  initialKpi: DiaryKpi
  profiles: Profile[]
  areas: Area[]
  currentUserId: string
  isOwner: boolean
}) {
  const router = useRouter()
  const [entries, setEntries] = useState<DiaryEntryWithMeta[]>(initialEntries)
  const [kpi, setKpi] = useState<DiaryKpi>(initialKpi)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<DiaryCategory | ''>('')
  const [mood, setMood] = useState<DiaryMood | ''>('')
  const [authorId, setAuthorId] = useState('')
  const [tag, setTag] = useState('')
  const [preset, setPreset] = useState<string>('this_month')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<DiaryEntryWithMeta | undefined>(undefined)
  const [summaryOpen, setSummaryOpen] = useState(false)

  async function refresh() {
    const r = presetRange(preset)
    const params = new URLSearchParams()
    if (category) params.set('category', category)
    if (mood) params.set('mood', mood)
    if (authorId) params.set('author_id', authorId)
    if (tag) params.set('tag', tag)
    if (r.from) params.set('from', r.from)
    if (r.to) params.set('to', r.to)
    const res = await fetch(`/api/diary?${params.toString()}`)
    if (res.ok) {
      const j = await res.json()
      setEntries(j.data ?? [])
    }
    // refresh KPI
    const k = await fetch('/api/diary')
    if (k.ok) {
      // KPI is computed server-side; tốt hơn reload page để re-fetch
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, mood, authorId, tag, preset])

  const filtered = useMemo(() => {
    if (!search.trim()) return entries
    const q = removeDiacritics(search.trim().toLowerCase())
    return entries.filter((e) => {
      const hay = removeDiacritics(`${e.title ?? ''} ${e.content} ${e.tags.join(' ')}`.toLowerCase())
      return hay.includes(q)
    })
  }, [entries, search])

  // Group by date
  const grouped = useMemo(() => {
    const m = new Map<string, DiaryEntryWithMeta[]>()
    // Pinned trên cùng (1 group riêng)
    const pinned = filtered.filter((e) => e.is_pinned)
    const rest = filtered.filter((e) => !e.is_pinned)
    if (pinned.length > 0) m.set('__pinned__', pinned)
    for (const e of rest) {
      const arr = m.get(e.diary_date) ?? []
      arr.push(e)
      m.set(e.diary_date, arr)
    }
    // Sort groups: pinned first, then date desc
    return [...m.entries()].sort(([a], [b]) => {
      if (a === '__pinned__') return -1
      if (b === '__pinned__') return 1
      return a < b ? 1 : -1
    })
  }, [filtered])

  function openNew() {
    setEditing(undefined)
    setFormOpen(true)
  }

  function openEdit(e: DiaryEntryWithMeta) {
    if (!isOwner && e.author_id !== currentUserId) {
      alert('Chỉ chủ trại hoặc tác giả mới sửa được entry này.')
      return
    }
    setEditing(e)
    setFormOpen(true)
  }

  async function handleDelete(e: DiaryEntryWithMeta) {
    if (!isOwner && e.author_id !== currentUserId) {
      alert('Chỉ chủ trại hoặc tác giả mới xoá được entry này.')
      return
    }
    if (!confirm(`Xoá nhật ký này?\n\n"${(e.title ?? e.content).slice(0, 80)}..."`)) return
    const res = await fetch(`/api/diary/${e.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const j = await res.json()
      alert('Lỗi: ' + (typeof j.error === 'string' ? j.error : 'unknown'))
      return
    }
    refresh()
    router.refresh()
  }

  async function togglePin(e: DiaryEntryWithMeta) {
    if (!isOwner && e.author_id !== currentUserId) {
      alert('Không có quyền.')
      return
    }
    const res = await fetch(`/api/diary/${e.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_pinned: !e.is_pinned }),
    })
    if (res.ok) refresh()
  }

  function onSaved() {
    setFormOpen(false)
    setEditing(undefined)
    refresh()
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {/* HERO */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-600 text-white shadow-xl">
        <div className="absolute inset-0 opacity-15 pointer-events-none">
          <span className="absolute top-3 right-6 text-7xl">📔</span>
          <span className="absolute -bottom-2 left-8 text-5xl">✏️</span>
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.18),transparent_60%)]" />
        <div className="relative p-6 md:p-7">
          <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
            <div>
              <div className="text-xs uppercase tracking-widest opacity-80">Nhật ký công việc hằng ngày</div>
              <div className="text-3xl md:text-4xl font-black mt-1">{kpi.thisMonth} entries</div>
              <div className="text-sm opacity-85 mt-0.5">
                30 ngày qua · {kpi.thisWeek} tuần này · {kpi.total} tổng cộng
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSummaryOpen(true)}
                className="bg-white/15 hover:bg-white/25 backdrop-blur text-white rounded-xl px-4 py-2.5 font-bold border border-white/30 flex items-center gap-1.5"
              >
                🤖 Tóm tắt AI
              </button>
              <button
                onClick={openNew}
                className="bg-white text-blue-700 hover:bg-blue-50 rounded-xl px-5 py-2.5 font-bold shadow-lg flex items-center gap-1.5"
              >
                ✏️ Ghi nhật ký mới
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
            <HeroKpi emoji="📔" label="Tổng nhật ký" value={String(kpi.total)} sub={`${kpi.pinned} ghim`} />
            <HeroKpi emoji="📅" label="Tuần qua" value={String(kpi.thisWeek)} sub="7 ngày" />
            <HeroKpi emoji="🗓" label="Tháng qua" value={String(kpi.thisMonth)} sub="30 ngày" />
            <HeroKpi
              emoji="⚠️"
              label="Sự cố"
              value={String(kpi.incidents)}
              sub={kpi.incidents > 0 ? 'Cần xem lại' : 'An toàn'}
              alert={kpi.incidents > 0}
            />
          </div>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 space-y-2.5">
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPreset(p.key)}
              className={
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition ' +
                (preset === p.key
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600')
              }
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as DiaryCategory | '')}
            className="px-3 py-1.5 rounded-lg text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
          >
            <option value="">📚 Tất cả loại</option>
            {(Object.keys(CATEGORY_META) as DiaryCategory[]).map((c) => (
              <option key={c} value={c}>
                {CATEGORY_META[c].emoji} {CATEGORY_META[c].label}
              </option>
            ))}
          </select>

          <select
            value={mood}
            onChange={(e) => setMood(e.target.value as DiaryMood | '')}
            className="px-3 py-1.5 rounded-lg text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
          >
            <option value="">😶 Mọi tâm trạng</option>
            {(Object.keys(MOOD_META) as DiaryMood[]).map((m) => (
              <option key={m} value={m}>
                {MOOD_META[m].emoji} {MOOD_META[m].label}
              </option>
            ))}
          </select>

          <select
            value={authorId}
            onChange={(e) => setAuthorId(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
          >
            <option value="">Mọi tác giả</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </select>

          <input
            type="search"
            placeholder="🔍 Tìm trong tiêu đề / nội dung / thẻ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[180px] px-3 py-1.5 rounded-lg text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
          />
        </div>

        {/* Recent tags */}
        {kpi.recentTags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1 border-t border-gray-100 dark:border-gray-700">
            <span className="text-[11px] text-gray-500 dark:text-gray-400 self-center mr-1">🏷 Thẻ:</span>
            <button
              onClick={() => setTag('')}
              className={
                'text-[11px] px-2 py-0.5 rounded-full transition ' +
                (tag === ''
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200')
              }
            >
              Tất cả
            </button>
            {kpi.recentTags.map((t) => (
              <button
                key={t.tag}
                onClick={() => setTag(tag === t.tag ? '' : t.tag)}
                className={
                  'text-[11px] px-2 py-0.5 rounded-full transition ' +
                  (tag === t.tag
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200')
                }
              >
                #{t.tag} <span className="opacity-60">({t.count})</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* TIMELINE */}
      {grouped.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 md:p-12 text-center">
          <div className="text-6xl mb-3">📔</div>
          <div className="text-base font-semibold mb-1">Chưa có nhật ký nào</div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Bắt đầu ghi nhật ký công việc hằng ngày
          </div>
          <button
            onClick={openNew}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-5 py-2 text-sm font-semibold"
          >
            ✏️ Ghi nhật ký đầu tiên
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map(([date, items]) => (
            <div key={date}>
              {/* Date header */}
              <div className="flex items-center gap-2 mb-2 px-1">
                {date === '__pinned__' ? (
                  <h3 className="text-sm font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                    📌 Đã ghim
                  </h3>
                ) : (
                  <>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      📅 {new Date(date).toLocaleDateString('vi-VN', {
                        weekday: 'long',
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400">· {items.length} entries</span>
                  </>
                )}
              </div>
              <div className="space-y-2">
                {items.map((e) => (
                  <EntryCard
                    key={e.id}
                    entry={e}
                    canEdit={isOwner || e.author_id === currentUserId}
                    currentUserId={currentUserId}
                    isOwner={isOwner}
                    onEdit={() => openEdit(e)}
                    onDelete={() => handleDelete(e)}
                    onTogglePin={() => togglePin(e)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {formOpen && (
        <DiaryFormModal
          initial={editing}
          profiles={profiles}
          areas={areas}
          onClose={() => {
            setFormOpen(false)
            setEditing(undefined)
          }}
          onSaved={onSaved}
        />
      )}

      {summaryOpen && (
        <DiarySummaryModal onClose={() => setSummaryOpen(false)} />
      )}
    </div>
  )
}

function HeroKpi({
  emoji, label, value, sub, alert,
}: {
  emoji: string
  label: string
  value: string
  sub?: string
  alert?: boolean
}) {
  return (
    <div className={'bg-white/10 backdrop-blur rounded-xl p-3 border border-white/20 ' + (alert ? 'ring-2 ring-yellow-300 animate-pulse' : '')}>
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[10px] uppercase tracking-wider opacity-80">{label}</span>
        <span className="text-base">{emoji}</span>
      </div>
      <div className="text-xl md:text-2xl font-black tabular-nums">{value}</div>
      {sub && <div className="text-[10px] opacity-75">{sub}</div>}
    </div>
  )
}

/**
 * Render text content với highlight @mentions (vd "@Anh Tuấn")
 * Pattern: @ + word(s) tiếp theo cho đến whitespace.
 */
function renderContentWithMentions(content: string): React.ReactNode {
  // Split bằng pattern @\S+ (kèm dấu tiếng Việt)
  const parts = content.split(/(@[\p{L}0-9_.]+(?:\s[\p{L}0-9_.]+)?)/gu)
  return parts.map((p, i) => {
    if (p.startsWith('@')) {
      return (
        <span
          key={i}
          className="inline-block px-1 mx-0.5 rounded bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold"
        >
          {p}
        </span>
      )
    }
    return <span key={i}>{p}</span>
  })
}

function EntryCard({
  entry,
  canEdit,
  currentUserId,
  isOwner,
  onEdit,
  onDelete,
  onTogglePin,
}: {
  entry: DiaryEntryWithMeta
  canEdit: boolean
  currentUserId: string
  isOwner: boolean
  onEdit: () => void
  onDelete: () => void
  onTogglePin: () => void
}) {
  const cat = CATEGORY_META[entry.category]
  const moodMeta = entry.mood ? MOOD_META[entry.mood] : null
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<DiaryComment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [posting, setPosting] = useState(false)
  const [commentCount, setCommentCount] = useState(entry.comment_count ?? 0)
  const [lightbox, setLightbox] = useState<string | null>(null)

  async function loadComments() {
    setCommentsLoading(true)
    const res = await fetch(`/api/diary/${entry.id}/comments`)
    if (res.ok) {
      const j = await res.json()
      setComments(j.data ?? [])
      setCommentCount((j.data ?? []).length)
    }
    setCommentsLoading(false)
  }

  async function toggleComments() {
    if (!showComments && comments.length === 0) await loadComments()
    setShowComments((v) => !v)
  }

  async function postComment(e: React.FormEvent) {
    e.preventDefault()
    if (newComment.trim().length < 1) return
    setPosting(true)
    const res = await fetch(`/api/diary/${entry.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newComment.trim() }),
    })
    setPosting(false)
    if (!res.ok) {
      const j = await res.json()
      alert('Lỗi: ' + (typeof j.error === 'string' ? j.error : 'unknown'))
      return
    }
    const j = await res.json()
    setComments((c) => [...c, j.data])
    setCommentCount((n) => n + 1)
    setNewComment('')
  }

  async function deleteComment(c: DiaryComment) {
    if (!confirm('Xoá comment này?')) return
    const res = await fetch(`/api/diary/${entry.id}/comments?comment_id=${c.id}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      const j = await res.json()
      alert('Lỗi: ' + (typeof j.error === 'string' ? j.error : 'unknown'))
      return
    }
    setComments((cs) => cs.filter((x) => x.id !== c.id))
    setCommentCount((n) => Math.max(0, n - 1))
  }

  return (
    <article
      className={
        'group bg-white dark:bg-gray-800 border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition ' +
        (entry.is_pinned
          ? 'border-amber-300 dark:border-amber-700 ring-1 ring-amber-200 dark:ring-amber-800'
          : 'border-gray-200 dark:border-gray-700')
      }
    >
      <div className={`h-1 bg-gradient-to-r ${cat.bar}`} />
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${cat.bar} text-white flex items-center justify-center text-lg shadow shrink-0`}>
            {cat.emoji}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap mb-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={'text-[10px] font-bold px-1.5 py-0.5 rounded border ' + cat.cls}>
                  {cat.label}
                </span>
                {moodMeta && (
                  <span className={'text-[10px] font-bold px-1.5 py-0.5 rounded ' + moodMeta.cls}>
                    {moodMeta.emoji} {moodMeta.label}
                  </span>
                )}
                {entry.weather && (
                  <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400">
                    {weatherEmoji(entry.weather)} {entry.weather}
                  </span>
                )}
                {entry.area_name && (
                  <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">
                    📍 {entry.area_name}
                  </span>
                )}
                {entry.is_pinned && (
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">📌</span>
                )}
              </div>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
                {canEdit && (
                  <>
                    <button
                      onClick={onTogglePin}
                      title={entry.is_pinned ? 'Bỏ ghim' : 'Ghim'}
                      className="w-7 h-7 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700/50 flex items-center justify-center text-xs"
                    >
                      {entry.is_pinned ? '📌' : '📍'}
                    </button>
                    <button
                      onClick={onEdit}
                      title="Sửa"
                      className="w-7 h-7 rounded text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 flex items-center justify-center text-xs"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={onDelete}
                      title="Xoá"
                      className="w-7 h-7 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center justify-center text-xs"
                    >
                      🗑
                    </button>
                  </>
                )}
              </div>
            </div>

            {entry.title && (
              <h4 className="font-bold text-sm md:text-base text-gray-900 dark:text-gray-100 mb-1">
                {entry.title}
              </h4>
            )}
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
              {renderContentWithMentions(entry.content)}
            </p>

            {/* Attachments */}
            {entry.attachments.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 mt-2.5">
                {entry.attachments.map((url, idx) => (
                  <button
                    key={url + idx}
                    type="button"
                    onClick={() => setLightbox(url)}
                    className="aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:opacity-90 hover:scale-[1.02] transition cursor-zoom-in"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Tags */}
            {entry.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {entry.tags.map((t) => (
                  <span
                    key={t}
                    className="text-[10.5px] px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}

            {/* Footer: comment toggle + author + time */}
            <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between gap-2 text-[11px] text-gray-500 dark:text-gray-400">
              <button
                onClick={toggleComments}
                className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition font-medium"
              >
                💬 {commentCount > 0 ? `${commentCount} comment` : 'Bình luận'}
                <span className="text-xs">{showComments ? '▲' : '▼'}</span>
              </button>
              <div className="flex items-center gap-2 text-[11px]">
                <span>👤 {entry.author_name ?? 'Hệ thống'}</span>
                <span>·</span>
                <span>{new Date(entry.created_at).toLocaleString('vi-VN')}</span>
              </div>
            </div>

            {/* Comments thread */}
            {showComments && (
              <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 space-y-2">
                {commentsLoading ? (
                  <div className="text-xs text-gray-500 text-center py-2">Đang tải...</div>
                ) : comments.length === 0 ? (
                  <div className="text-xs text-gray-500 text-center py-2">Chưa có bình luận</div>
                ) : (
                  <ul className="space-y-1.5">
                    {comments.map((c) => {
                      const canDeleteThis = isOwner || c.author_id === currentUserId
                      return (
                        <li
                          key={c.id}
                          className="group/c bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 rounded-lg p-2"
                        >
                          <div className="flex items-start justify-between gap-2 mb-0.5">
                            <span className="text-[11px] font-bold text-gray-900 dark:text-gray-100">
                              👤 {c.author_name ?? 'Hệ thống'}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                {new Date(c.created_at).toLocaleString('vi-VN')}
                              </span>
                              {canDeleteThis && (
                                <button
                                  onClick={() => deleteComment(c)}
                                  className="opacity-0 group-hover/c:opacity-100 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded px-1 text-[10px] transition"
                                >
                                  🗑
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-snug">
                            {renderContentWithMentions(c.content)}
                          </p>
                        </li>
                      )
                    })}
                  </ul>
                )}

                {/* Reply input */}
                <form onSubmit={postComment} className="flex gap-1.5 pt-1">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Viết bình luận... (gõ @tên để mention)"
                    maxLength={2000}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={posting || newComment.trim().length < 1}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold disabled:opacity-50"
                  >
                    {posting ? '...' : 'Gửi'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox preview ảnh full-screen */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightbox(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt=""
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur text-white text-xl"
          >
            ×
          </button>
        </div>
      )}
    </article>
  )
}
