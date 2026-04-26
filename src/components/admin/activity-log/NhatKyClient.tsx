'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { formatDateTime } from '@/lib/utils/format'
import { removeDiacritics } from '@/lib/utils/slugify'

export type Log = {
  id: string
  action: string
  entity_type: string
  entity_id: string | null
  before_data: Record<string, unknown> | null
  after_data: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
  user_name: string | null
  user_role: string | null
}

const ACTION_META: Record<
  string,
  { label: string; emoji: string; bg: string; text: string; ring: string; bar: string }
> = {
  create: {
    label: 'Tạo mới',
    emoji: '➕',
    bg: 'bg-emerald-100 dark:bg-emerald-950/50',
    text: 'text-emerald-700 dark:text-emerald-300',
    ring: 'ring-emerald-400/40',
    bar: 'from-emerald-400 to-teal-500',
  },
  update: {
    label: 'Chỉnh sửa',
    emoji: '✏️',
    bg: 'bg-blue-100 dark:bg-blue-950/50',
    text: 'text-blue-700 dark:text-blue-300',
    ring: 'ring-blue-400/40',
    bar: 'from-blue-400 to-indigo-500',
  },
  delete: {
    label: 'Xóa',
    emoji: '🗑️',
    bg: 'bg-rose-100 dark:bg-rose-950/50',
    text: 'text-rose-700 dark:text-rose-300',
    ring: 'ring-rose-400/40',
    bar: 'from-rose-400 to-red-500',
  },
}

const ENTITY_META: Record<
  string,
  { label: string; emoji: string; href?: (id: string) => string }
> = {
  chickens: { label: 'Hồ sơ gà', emoji: '🐓', href: (id) => `/admin/ho-so-ga/${id}` },
  sales_orders: { label: 'Đơn bán', emoji: '💵', href: (id) => `/admin/ban-ra/${id}` },
  purchases: { label: 'Đơn nhập', emoji: '📥' },
  breeding_litters: { label: 'Lứa sinh sản', emoji: '🥚' },
  customers: { label: 'Khách hàng', emoji: '👥' },
  vaccinations: { label: 'Tiêm phòng', emoji: '💉' },
  staff_attendance: { label: 'Chấm công', emoji: '🕐' },
  payroll_payments: { label: 'Bảng lương', emoji: '💰' },
  chicken_media: { label: 'Ảnh/Video gà', emoji: '📸' },
  medicines: { label: 'Thuốc', emoji: '💊' },
  feeds: { label: 'Thức ăn', emoji: '🌾' },
  profiles: { label: 'Nhân viên', emoji: '👔' },
  breeds: { label: 'Giống', emoji: '🧬' },
  expenses: { label: 'Chi phí', emoji: '💸' },
  news_articles: { label: 'Tin tức', emoji: '📰' },
  farm_media: { label: 'Thư viện trại', emoji: '🖼️' },
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

function summarizeChange(log: Log): string {
  const { action, after_data, before_data } = log
  if (action === 'create' && after_data) {
    const a = after_data as Record<string, unknown>
    const name = (a.name ?? a.chicken_code ?? a.order_code ?? a.caption ?? a.title) as string | undefined
    return name ? `"${name}"` : ''
  }
  if (action === 'update' && before_data && after_data) {
    const b = before_data as Record<string, unknown>
    const a = after_data as Record<string, unknown>
    const changes = Object.keys(a).filter(
      (k) => JSON.stringify(b[k]) !== JSON.stringify(a[k])
    )
    if (changes.length === 0) return ''
    if (changes.length === 1) {
      const k = changes[0]
      return `${k}: ${formatValue(b[k])} → ${formatValue(a[k])}`
    }
    return `${changes.length} trường: ${changes.slice(0, 3).join(', ')}${
      changes.length > 3 ? '…' : ''
    }`
  }
  if (action === 'delete' && before_data) {
    const b = before_data as Record<string, unknown>
    const name = (b.name ?? b.chicken_code ?? b.order_code) as string | undefined
    return name ? `"${name}"` : ''
  }
  return ''
}

function avatarSeed(name: string): string {
  const palette = [
    'from-rose-400 to-pink-500',
    'from-amber-400 to-orange-500',
    'from-emerald-400 to-teal-500',
    'from-sky-400 to-blue-500',
    'from-violet-400 to-purple-500',
    'from-fuchsia-400 to-pink-500',
    'from-lime-400 to-green-500',
    'from-cyan-400 to-sky-500',
  ]
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return palette[h % palette.length]
}

function dayKey(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const t = new Date(d)
  t.setHours(0, 0, 0, 0)
  const diff = Math.round((today.getTime() - t.getTime()) / 86400_000)
  if (diff === 0) return 'Hôm nay'
  if (diff === 1) return 'Hôm qua'
  if (diff < 7) return `${diff} ngày trước`
  return d.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })
}

function timeOnly(iso: string): string {
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

type ActionFilter = '' | 'create' | 'update' | 'delete'
type RangeFilter = '' | '24h' | '7d' | '30d'
type ViewMode = 'timeline' | 'table'
type SortKey = 'newest' | 'oldest'

export function NhatKyClient({ logs, totalCount }: { logs: Log[]; totalCount: number }) {
  const [q, setQ] = useState('')
  const [entityType, setEntityType] = useState<string>('')
  const [action, setAction] = useState<ActionFilter>('')
  const [user, setUser] = useState<string>('')
  const [range, setRange] = useState<RangeFilter>('')
  const [from, setFrom] = useState<string>('')
  const [to, setTo] = useState<string>('')
  const [sortKey, setSortKey] = useState<SortKey>('newest')
  const [view, setView] = useState<ViewMode>('timeline')

  const users = useMemo(
    () => Array.from(new Set(logs.map((l) => l.user_name).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, 'vi')),
    [logs]
  )

  const usedEntities = useMemo(() => {
    const set = new Set(logs.map((l) => l.entity_type))
    return Array.from(set).sort()
  }, [logs])

  const qNorm = removeDiacritics(q.trim())

  const filtered = useMemo(() => {
    let cutoff = 0
    if (range === '24h') cutoff = Date.now() - 86400_000
    else if (range === '7d') cutoff = Date.now() - 7 * 86400_000
    else if (range === '30d') cutoff = Date.now() - 30 * 86400_000
    const fromTs = from ? new Date(from + 'T00:00:00').getTime() : 0
    const toTs = to ? new Date(to + 'T23:59:59').getTime() : 0

    const out = logs.filter((l) => {
      if (entityType && l.entity_type !== entityType) return false
      if (action && l.action !== action) return false
      if (user && l.user_name !== user) return false
      const t = new Date(l.created_at).getTime()
      if (cutoff && t < cutoff) return false
      if (fromTs && t < fromTs) return false
      if (toTs && t > toTs) return false
      if (qNorm) {
        const summary = summarizeChange(l)
        const hay = removeDiacritics(
          [
            l.user_name ?? '',
            l.entity_type,
            l.action,
            l.entity_id ?? '',
            l.ip_address ?? '',
            summary,
          ].join(' ')
        )
        if (!hay.includes(qNorm)) return false
      }
      return true
    })

    out.sort((a, b) => {
      const da = new Date(a.created_at).getTime()
      const db = new Date(b.created_at).getTime()
      return sortKey === 'oldest' ? da - db : db - da
    })
    return out
  }, [logs, qNorm, entityType, action, user, range, from, to, sortKey])

  const stats = useMemo(() => {
    const now = Date.now()
    const last24 = logs.filter((l) => now - new Date(l.created_at).getTime() < 86400_000).length
    const last7 = logs.filter((l) => now - new Date(l.created_at).getTime() < 7 * 86400_000).length
    const byAction: Record<string, number> = {}
    const byUser: Record<string, number> = {}
    for (const l of logs) {
      byAction[l.action] = (byAction[l.action] ?? 0) + 1
      if (l.user_name) byUser[l.user_name] = (byUser[l.user_name] ?? 0) + 1
    }
    const topUser = Object.entries(byUser).sort((a, b) => b[1] - a[1])[0]
    return {
      total: totalCount,
      shown: logs.length,
      last24,
      last7,
      create: byAction.create ?? 0,
      update: byAction.update ?? 0,
      delete: byAction.delete ?? 0,
      topUser,
    }
  }, [logs, totalCount])

  const grouped = useMemo(() => {
    const map = new Map<string, Log[]>()
    for (const l of filtered) {
      const key = dayKey(l.created_at)
      const arr = map.get(key) ?? []
      arr.push(l)
      map.set(key, arr)
    }
    return Array.from(map.entries())
  }, [filtered])

  const hasFilter = Boolean(q || entityType || action || user || range || from || to)

  function resetFilters() {
    setQ('')
    setEntityType('')
    setAction('')
    setUser('')
    setRange('')
    setFrom('')
    setTo('')
  }

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50 dark:from-indigo-950/40 dark:via-blue-950/40 dark:to-cyan-950/40 border border-blue-200 dark:border-blue-900 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🛡️</span>
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 text-sm mb-1">
              Sổ cái audit trail — không thể sửa, không thể xóa
            </h3>
            <p className="text-xs text-blue-800 dark:text-blue-200">
              Truy vết · Chống gian lận nội bộ · Kiểm toán · Debug khi số liệu bất thường.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Kpi label="Tổng log" value={String(stats.total)} icon="📊" tone="from-slate-500 to-slate-600" />
        <Kpi
          label="24h gần"
          value={String(stats.last24)}
          icon="⏱️"
          tone="from-blue-500 to-indigo-500"
          pulse={stats.last24 > 0}
        />
        <Kpi label="7 ngày qua" value={String(stats.last7)} icon="📅" tone="from-cyan-500 to-sky-500" />
        <Kpi label="Tạo mới" value={String(stats.create)} icon="➕" tone="from-emerald-500 to-teal-500" />
        <Kpi label="Chỉnh sửa" value={String(stats.update)} icon="✏️" tone="from-amber-500 to-orange-500" />
        <Kpi label="Đã xóa" value={String(stats.delete)} icon="🗑️" tone="from-rose-500 to-red-500" />
      </div>

      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1 min-w-0">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm theo người, entity, IP, mã, nội dung thay đổi…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2"
            >
              <option value="">Tất cả module</option>
              {Object.entries(ENTITY_META)
                .filter(([k]) => usedEntities.length === 0 || usedEntities.includes(k))
                .map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.emoji} {v.label}
                  </option>
                ))}
            </select>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value as ActionFilter)}
              className="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2"
            >
              <option value="">Tất cả hành động</option>
              <option value="create">➕ Tạo</option>
              <option value="update">✏️ Sửa</option>
              <option value="delete">🗑️ Xóa</option>
            </select>
            {users.length > 0 && (
              <select
                value={user}
                onChange={(e) => setUser(e.target.value)}
                className="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2"
              >
                <option value="">Tất cả người</option>
                {users.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            )}
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2"
            />
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2"
            />
            {hasFilter && (
              <button
                onClick={resetFilters}
                className="text-sm text-rose-600 dark:text-rose-400 hover:underline px-2"
              >
                Bỏ lọc
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
          <div className="flex flex-wrap gap-1.5">
            {[
              { k: '' as const, label: '🌐 Mọi lúc' },
              { k: '24h' as const, label: '⏱️ 24h' },
              { k: '7d' as const, label: '📅 7 ngày' },
              { k: '30d' as const, label: '🗓️ 30 ngày' },
            ].map((r) => {
              const active = range === r.k
              return (
                <button
                  key={r.k || 'all'}
                  onClick={() => setRange(r.k)}
                  className={
                    'px-3 py-1.5 rounded-full text-xs font-medium border transition ' +
                    (active
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-transparent shadow'
                      : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-400')
                  }
                >
                  {r.label}
                </button>
              )
            })}
            <span className="w-px bg-gray-200 dark:bg-gray-700 mx-1" />
            {[
              { k: 'newest' as const, label: '🆕 Mới nhất' },
              { k: 'oldest' as const, label: '📜 Cũ trước' },
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
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500 dark:text-gray-400">
              Hiện <strong className="text-gray-900 dark:text-gray-100">{filtered.length}</strong>/
              {logs.length}
              {stats.topUser && (
                <span className="ml-2 hidden md:inline">
                  · Năng suất nhất:{' '}
                  <strong className="text-gray-900 dark:text-gray-100">
                    {stats.topUser[0]} ({stats.topUser[1]})
                  </strong>
                </span>
              )}
            </span>
            <div className="flex border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <button
                onClick={() => setView('timeline')}
                className={
                  'px-3 py-1.5 ' +
                  (view === 'timeline'
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                    : 'bg-white dark:bg-gray-900 text-gray-500')
                }
              >
                ☰ Timeline
              </button>
              <button
                onClick={() => setView('table')}
                className={
                  'px-3 py-1.5 ' +
                  (view === 'table'
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                    : 'bg-white dark:bg-gray-900 text-gray-500')
                }
              >
                📋 Bảng
              </button>
            </div>
          </div>
        </div>
      </section>

      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-10 text-center">
          <div className="text-5xl mb-2">📋</div>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
            Không có log nào khớp bộ lọc.
          </p>
          {hasFilter && (
            <button
              onClick={resetFilters}
              className="text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2"
            >
              Bỏ tất cả bộ lọc
            </button>
          )}
        </div>
      ) : view === 'timeline' ? (
        <Timeline grouped={grouped} />
      ) : (
        <TableView rows={filtered} />
      )}

      <p className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2">
        Hiển thị {filtered.length}/{logs.length} log đã tải · Tổng {totalCount} log từ trước đến nay · Giữ vĩnh viễn
      </p>
    </div>
  )
}

function Timeline({ grouped }: { grouped: [string, Log[]][] }) {
  return (
    <div className="space-y-3">
      {grouped.map(([day, items]) => (
        <section
          key={day}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm"
        >
          <div className="px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              📅 {day}
            </h3>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {items.length} hoạt động
            </span>
          </div>
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {items.map((log) => (
              <LogRow key={log.id} log={log} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function LogRow({ log }: { log: Log }) {
  const action = ACTION_META[log.action] ?? {
    label: log.action,
    emoji: '•',
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-700 dark:text-gray-300',
    ring: 'ring-gray-400/40',
    bar: 'from-gray-400 to-gray-500',
  }
  const entity = ENTITY_META[log.entity_type] ?? { label: log.entity_type, emoji: '📄' }
  const summary = summarizeChange(log)
  const entityLink = entity.href && log.entity_id ? entity.href(log.entity_id) : null

  return (
    <li className="px-4 py-3 hover:bg-blue-50/40 dark:hover:bg-blue-950/15 transition">
      <div className="flex items-start gap-3">
        <div
          className={`${action.bg} ${action.text} rounded-lg w-10 h-10 flex items-center justify-center text-lg shrink-0 ring-2 ${action.ring}`}
        >
          {action.emoji}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className={`text-xs font-semibold ${action.text}`}>{action.label}</span>
            <span className="text-gray-400 dark:text-gray-500">·</span>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {entity.emoji} {entity.label}
            </span>
            {summary && (
              <span className="text-sm text-gray-600 dark:text-gray-400 truncate">{summary}</span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400 mt-1 flex-wrap">
            <span className="flex items-center gap-1">
              <span
                className={`w-4 h-4 rounded-full bg-gradient-to-br ${avatarSeed(
                  log.user_name ?? '?'
                )} text-white flex items-center justify-center text-[9px] font-semibold`}
              >
                {(log.user_name ?? '?').split(' ').slice(-1)[0]?.[0] ?? '?'}
              </span>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {log.user_name ?? 'Hệ thống'}
              </span>
              {log.user_role === 'chu_trai' && (
                <span className="text-amber-600 dark:text-amber-400">(Chủ trại)</span>
              )}
            </span>
            <span>·</span>
            <span title={formatDateTime(log.created_at)}>{timeOnly(log.created_at)}</span>
            {log.ip_address && (
              <>
                <span>·</span>
                <span className="font-mono">IP {log.ip_address}</span>
              </>
            )}
            {entityLink && (
              <>
                <span>·</span>
                <Link
                  href={entityLink}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Xem →
                </Link>
              </>
            )}
          </div>

          {(log.before_data || log.after_data) && (
            <details className="mt-1.5">
              <summary className="text-[11px] text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">
                Xem diff dữ liệu
              </summary>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                {log.before_data && (
                  <div>
                    <div className="text-gray-500 dark:text-gray-400 mb-1 font-medium">Trước</div>
                    <pre className="bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900 rounded p-2 overflow-x-auto max-h-40 text-rose-900 dark:text-rose-200 whitespace-pre-wrap break-all">
                      {JSON.stringify(log.before_data, null, 2)}
                    </pre>
                  </div>
                )}
                {log.after_data && (
                  <div>
                    <div className="text-gray-500 dark:text-gray-400 mb-1 font-medium">Sau</div>
                    <pre className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900 rounded p-2 overflow-x-auto max-h-40 text-emerald-900 dark:text-emerald-200 whitespace-pre-wrap break-all">
                      {JSON.stringify(log.after_data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          )}
        </div>
      </div>
    </li>
  )
}

function TableView({ rows }: { rows: Log[] }) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900 text-xs uppercase text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-3 py-2.5 text-left">Thời gian</th>
              <th className="px-3 py-2.5 text-left">Hành động</th>
              <th className="px-3 py-2.5 text-left">Module</th>
              <th className="px-3 py-2.5 text-left">Tóm tắt</th>
              <th className="px-3 py-2.5 text-left">Người</th>
              <th className="px-3 py-2.5 text-left">IP</th>
              <th className="px-3 py-2.5 text-left">Liên kết</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((log) => {
              const action = ACTION_META[log.action] ?? {
                label: log.action,
                emoji: '•',
                bg: 'bg-gray-100 dark:bg-gray-800',
                text: 'text-gray-700 dark:text-gray-300',
                ring: '',
                bar: '',
              }
              const entity = ENTITY_META[log.entity_type] ?? {
                label: log.entity_type,
                emoji: '📄',
              }
              const summary = summarizeChange(log)
              const entityLink =
                entity.href && log.entity_id ? entity.href(log.entity_id) : null
              return (
                <tr
                  key={log.id}
                  className="border-t border-gray-100 dark:border-gray-700 hover:bg-blue-50/40 dark:hover:bg-blue-950/20"
                >
                  <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap tabular-nums">
                    {formatDateTime(log.created_at)}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`${action.bg} ${action.text} px-2 py-0.5 rounded-full text-[11px] font-medium`}
                    >
                      {action.emoji} {action.label}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {entity.emoji} {entity.label}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400 max-w-xs truncate">
                    {summary || '—'}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <div className="flex items-center gap-1">
                      <span
                        className={`w-4 h-4 rounded-full bg-gradient-to-br ${avatarSeed(
                          log.user_name ?? '?'
                        )} text-white flex items-center justify-center text-[9px] font-semibold`}
                      >
                        {(log.user_name ?? '?').split(' ').slice(-1)[0]?.[0] ?? '?'}
                      </span>
                      <span className="text-gray-700 dark:text-gray-300">
                        {log.user_name ?? 'Hệ thống'}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs font-mono text-gray-500 dark:text-gray-400">
                    {log.ip_address ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {entityLink ? (
                      <Link
                        href={entityLink}
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Xem →
                      </Link>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Kpi({
  label,
  value,
  icon,
  tone,
  pulse,
}: {
  label: string
  value: string
  icon: string
  tone: string
  pulse?: boolean
}) {
  return (
    <div className="relative overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3.5">
      <div
        className={`absolute -right-6 -top-6 w-20 h-20 rounded-full bg-gradient-to-br ${tone} opacity-15 blur-xl ${
          pulse ? 'animate-pulse' : ''
        }`}
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
