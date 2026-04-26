'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { removeDiacritics } from '@/lib/utils/slugify'

export type GuideItem = {
  title: string
  content: string
  tags?: string[]
}
export type GuideSection = {
  role: 'all' | 'chu_trai' | 'nhan_vien' | 'technical'
  title: string
  items: GuideItem[]
}

const ROLE_META: Record<
  GuideSection['role'],
  { short: string; emoji: string; bar: string; cls: string; chip: string }
> = {
  all: {
    short: 'Chung',
    emoji: '📖',
    bar: 'from-blue-400 to-indigo-500',
    cls: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-900',
    chip: 'from-blue-500 to-indigo-500',
  },
  chu_trai: {
    short: 'Chủ trại',
    emoji: '👑',
    bar: 'from-amber-400 to-orange-500',
    cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-900',
    chip: 'from-amber-500 to-orange-500',
  },
  nhan_vien: {
    short: 'Nhân viên',
    emoji: '👷',
    bar: 'from-emerald-400 to-teal-500',
    cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900',
    chip: 'from-emerald-500 to-teal-500',
  },
  technical: {
    short: 'Kỹ thuật',
    emoji: '🔧',
    bar: 'from-violet-400 to-purple-500',
    cls: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 border-violet-200 dark:border-violet-900',
    chip: 'from-violet-500 to-purple-500',
  },
}

const QUICK_LINKS = [
  { href: '/admin/cai-dat', emoji: '⚙️', label: 'Cài đặt' },
  { href: '/admin/quet-qr', emoji: '📷', label: 'Quét QR' },
  { href: '/admin/tiem-phong', emoji: '💉', label: 'Tiêm phòng' },
  { href: '/admin/nhan-su', emoji: '👔', label: 'Chấm công' },
  { href: '/admin/tai-chinh', emoji: '💰', label: 'Tài chính' },
  { href: '/admin/nhat-ky', emoji: '📝', label: 'Nhật ký' },
]

type RoleFilter = '' | GuideSection['role']
type SortKey = 'default' | 'az' | 'length'

function highlightHtml(text: string, qNorm: string): string {
  if (!qNorm) return escapeHtml(text)
  const tokens = qNorm.split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return escapeHtml(text)
  const escaped = escapeHtml(text)
  // Walk char-by-char comparing diacritics-stripped lower vs query token
  const lower = removeDiacritics(text)
  let result = ''
  let i = 0
  while (i < text.length) {
    let matched = false
    for (const tok of tokens) {
      if (lower.slice(i, i + tok.length) === tok) {
        const original = text.slice(i, i + tok.length)
        result += `<mark class="bg-yellow-200 dark:bg-yellow-700/60 text-gray-900 dark:text-yellow-100 px-0.5 rounded">${escapeHtml(
          original
        )}</mark>`
        i += tok.length
        matched = true
        break
      }
    }
    if (!matched) {
      result += escaped[i] ?? ''
      i++
    }
  }
  return result
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function HuongDanClient({ sections }: { sections: GuideSection[] }) {
  const [q, setQ] = useState('')
  const [role, setRole] = useState<RoleFilter>('')
  const [sortKey, setSortKey] = useState<SortKey>('default')
  const [openAll, setOpenAll] = useState(false)
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({})

  const qNorm = removeDiacritics(q.trim())

  const totalItems = useMemo(
    () => sections.reduce((s, sec) => s + sec.items.length, 0),
    [sections]
  )

  const stats = useMemo(() => {
    const m: Record<string, number> = { all: 0, chu_trai: 0, nhan_vien: 0, technical: 0 }
    for (const sec of sections) m[sec.role] = (m[sec.role] ?? 0) + sec.items.length
    return m
  }, [sections])

  const filteredSections = useMemo(() => {
    return sections
      .filter((sec) => !role || sec.role === role)
      .map((sec) => {
        let items = sec.items
        if (qNorm) {
          items = items.filter((it) => {
            const hay = removeDiacritics(`${it.title} ${it.content} ${(it.tags ?? []).join(' ')}`)
            return hay.includes(qNorm)
          })
        }
        if (sortKey === 'az') {
          items = [...items].sort((a, b) => a.title.localeCompare(b.title, 'vi'))
        } else if (sortKey === 'length') {
          items = [...items].sort((a, b) => b.content.length - a.content.length)
        }
        return { ...sec, items }
      })
      .filter((sec) => sec.items.length > 0)
  }, [sections, qNorm, role, sortKey])

  const totalShown = filteredSections.reduce((s, sec) => s + sec.items.length, 0)
  const hasFilter = Boolean(q || role || sortKey !== 'default')

  function reset() {
    setQ('')
    setRole('')
    setSortKey('default')
  }

  function toggle(key: string) {
    setOpenMap((m) => ({ ...m, [key]: !m[key] }))
  }

  function expandAll() {
    const next: Record<string, boolean> = {}
    for (const sec of filteredSections)
      for (const [i] of sec.items.entries()) next[`${sec.role}-${i}-${sec.items[i].title}`] = true
    setOpenMap(next)
    setOpenAll(true)
  }

  function collapseAll() {
    setOpenMap({})
    setOpenAll(false)
  }

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50 dark:from-blue-950/40 dark:via-indigo-950/40 dark:to-violet-950/40 border border-blue-200 dark:border-blue-900 rounded-xl p-4 md:p-5">
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-blue-300/30 blur-3xl" />
        <div className="absolute -left-10 -bottom-10 w-40 h-40 rounded-full bg-violet-300/30 blur-3xl" />
        <div className="relative">
          <div className="flex items-start gap-3 mb-3">
            <span className="text-3xl">📚</span>
            <div className="flex-1">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                Trung tâm hỗ trợ — tìm câu trả lời cực nhanh
              </h2>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                Gõ từ khoá tiếng Việt có/không dấu · Lọc theo vai trò · Click nhảy tới module
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {QUICK_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="inline-flex items-center gap-1.5 bg-white/80 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-full px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition shadow-sm"
              >
                <span>{l.emoji}</span>
                <span>{l.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Kpi label="Tổng bài" value={String(totalItems)} icon="📚" tone="from-slate-500 to-slate-600" />
        <Kpi label="Chung" value={String(stats.all ?? 0)} icon="📖" tone={ROLE_META.all.chip} />
        <Kpi label="Chủ trại" value={String(stats.chu_trai ?? 0)} icon="👑" tone={ROLE_META.chu_trai.chip} />
        <Kpi label="Nhân viên" value={String(stats.nhan_vien ?? 0)} icon="👷" tone={ROLE_META.nhan_vien.chip} />
        <Kpi label="Kỹ thuật" value={String(stats.technical ?? 0)} icon="🔧" tone={ROLE_META.technical.chip} />
      </div>

      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm hướng dẫn: chấm công, gemini, backup, quét QR, watermark…"
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <button
            onClick={() => setRole('')}
            className={
              'px-3 py-1.5 rounded-full text-xs font-medium border transition ' +
              (!role
                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-transparent shadow'
                : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-400')
            }
          >
            🌐 Tất cả
          </button>
          {(['all', 'chu_trai', 'nhan_vien', 'technical'] as const).map((r) => {
            const m = ROLE_META[r]
            const active = role === r
            return (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={
                  'px-3 py-1.5 rounded-full text-xs font-medium border transition ' +
                  (active
                    ? `bg-gradient-to-r ${m.chip} text-white border-transparent shadow`
                    : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-400')
                }
              >
                {m.emoji} {m.short} <span className="opacity-70">({stats[r] ?? 0})</span>
              </button>
            )
          })}
          <span className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />
          {[
            { k: 'default' as const, label: '🗂 Mặc định' },
            { k: 'az' as const, label: '🔤 A→Z' },
            { k: 'length' as const, label: '📏 Bài dài' },
          ].map((s) => {
            const active = sortKey === s.k
            return (
              <button
                key={s.k}
                onClick={() => setSortKey(s.k)}
                className={
                  'px-3 py-1.5 rounded-full text-xs font-medium border transition ' +
                  (active
                    ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white border-transparent shadow'
                    : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-violet-400')
                }
              >
                {s.label}
              </button>
            )
          })}
          {hasFilter && (
            <button
              onClick={reset}
              className="text-sm text-rose-600 dark:text-rose-400 hover:underline px-2"
            >
              Bỏ lọc
            </button>
          )}
        </div>

        <div className="flex items-center justify-between flex-wrap gap-2 pt-1 text-xs">
          <span className="text-gray-500 dark:text-gray-400">
            Hiện <strong className="text-gray-900 dark:text-gray-100">{totalShown}</strong>/
            {totalItems} bài
          </span>
          <div className="flex gap-2">
            {!openAll ? (
              <button
                onClick={expandAll}
                disabled={totalShown === 0}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-40"
              >
                ⬇ Mở tất cả
              </button>
            ) : (
              <button
                onClick={collapseAll}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                ⬆ Thu gọn
              </button>
            )}
          </div>
        </div>
      </section>

      {filteredSections.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-10 text-center">
          <div className="text-5xl mb-2">🔍</div>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
            Không có bài hướng dẫn nào khớp <strong>&ldquo;{q}&rdquo;</strong>.
          </p>
          {hasFilter && (
            <button
              onClick={reset}
              className="text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2"
            >
              Bỏ tất cả bộ lọc
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSections.map((sec) => {
            const meta = ROLE_META[sec.role]
            return (
              <section
                key={sec.role}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"
              >
                <div className={`h-1.5 bg-gradient-to-r ${meta.bar}`} />
                <div className="p-4 md:p-5">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {sec.title}
                    </h2>
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${meta.cls}`}
                    >
                      {sec.items.length} bài
                    </span>
                  </div>
                  <div className="space-y-2">
                    {sec.items.map((it, i) => {
                      const key = `${sec.role}-${i}-${it.title}`
                      const isOpen = !!openMap[key]
                      return (
                        <GuideRow
                          key={key}
                          item={it}
                          qNorm={qNorm}
                          isOpen={isOpen}
                          onToggle={() => toggle(key)}
                          roleEmoji={meta.emoji}
                        />
                      )
                    })}
                  </div>
                </div>
              </section>
            )
          })}
        </div>
      )}

      <section className="bg-gradient-to-br from-emerald-50 to-cyan-50 dark:from-emerald-950/30 dark:to-cyan-950/30 border border-emerald-200 dark:border-emerald-900 rounded-xl p-4 text-sm">
        <p className="font-medium text-emerald-900 dark:text-emerald-100 flex items-center gap-2">
          <span className="text-lg">💡</span>
          Vẫn cần trợ giúp?
        </p>
        <ul className="mt-2 text-emerald-800 dark:text-emerald-200 space-y-1 list-disc list-inside text-xs">
          <li>Chatbot 💬 góc dưới phải — hỏi bằng tiếng Việt tự nhiên</li>
          <li>Zalo hỗ trợ: cấu hình ở Cài đặt → Thông tin trang trại</li>
          <li>Email kỹ thuật: haunau486@gmail.com</li>
        </ul>
      </section>
    </div>
  )
}

function GuideRow({
  item,
  qNorm,
  isOpen,
  onToggle,
  roleEmoji,
}: {
  item: GuideItem
  qNorm: string
  isOpen: boolean
  onToggle: () => void
  roleEmoji: string
}) {
  const titleHtml = highlightHtml(item.title, qNorm)
  const contentHtml = highlightHtml(item.content, qNorm)

  async function copy(e: React.MouseEvent) {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(`${item.title}\n\n${item.content}`)
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      className={
        'border rounded-lg overflow-hidden transition ' +
        (isOpen
          ? 'border-blue-300 dark:border-blue-800 shadow-sm'
          : 'border-gray-200 dark:border-gray-700 hover:border-blue-300')
      }
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-blue-50/40 dark:hover:bg-blue-950/15 transition"
      >
        <span className="text-base flex-shrink-0">{roleEmoji}</span>
        <span
          className="flex-1 font-medium text-gray-900 dark:text-gray-100"
          dangerouslySetInnerHTML={{ __html: titleHtml }}
        />
        <span
          className={
            'flex-shrink-0 text-gray-400 dark:text-gray-500 transition-transform ' +
            (isOpen ? 'rotate-180' : '')
          }
        >
          ▾
        </span>
      </button>
      {isOpen && (
        <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50/40 dark:bg-gray-900/40">
          <div className="px-4 py-3 flex items-start justify-between gap-3">
            <div
              className="flex-1 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed"
              dangerouslySetInnerHTML={{ __html: contentHtml }}
            />
            <button
              onClick={copy}
              className="flex-shrink-0 text-[11px] text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:underline"
              title="Copy nội dung"
            >
              📋 Copy
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Kpi({
  label,
  value,
  icon,
  tone,
}: {
  label: string
  value: string
  icon: string
  tone: string
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
      </div>
    </div>
  )
}
