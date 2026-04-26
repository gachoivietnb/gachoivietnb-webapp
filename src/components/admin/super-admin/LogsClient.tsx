'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'

type LogRow = {
  id: string
  level: string
  category: string
  message: string
  context: Record<string, unknown>
  user_email: string | null
  ip_address: string | null
  user_agent: string | null
  path: string | null
  http_status: number | null
  resolved_at: string | null
  created_at: string
}

const LEVEL_META: Record<string, { label: string; cls: string; emoji: string }> = {
  critical: { label: 'Critical', cls: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800', emoji: '🚨' },
  error: { label: 'Error', cls: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900', emoji: '❌' },
  warn: { label: 'Warn', cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900', emoji: '⚠️' },
  info: { label: 'Info', cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900', emoji: 'ℹ️' },
  debug: { label: 'Debug', cls: 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-900/40 dark:text-gray-400 dark:border-gray-700', emoji: '🔍' },
}

const CATEGORY_LABEL: Record<string, string> = {
  auth: 'Auth',
  signup: 'Signup',
  api: 'API',
  db: 'DB',
  security: '🔒 Security',
  push: 'Push',
  ai: 'AI',
  payment: 'Payment',
  middleware: 'Middleware',
  storage: 'Storage',
  cron: 'Cron',
  other: 'Other',
}

const CATS = Object.keys(CATEGORY_LABEL)

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const m = Math.floor(ms / 60000)
  if (m < 1) return 'vừa xong'
  if (m < 60) return `${m} phút`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} giờ`
  const d = Math.floor(h / 24)
  return `${d} ngày`
}

export function LogsClient({ initialLogs }: { initialLogs: LogRow[] }) {
  const router = useRouter()
  const [logs, setLogs] = useState(initialLogs)
  const [filterLevel, setFilterLevel] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterDays, setFilterDays] = useState(30)
  const [showResolved, setShowResolved] = useState(false)
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [busy, setBusy] = useState(false)

  async function refetch(opts?: { level?: string; category?: string; days?: number; resolved?: boolean }) {
    setBusy(true)
    const p = new URLSearchParams()
    const lv = opts?.level ?? filterLevel
    const cat = opts?.category ?? filterCategory
    const d = opts?.days ?? filterDays
    const res = opts?.resolved ?? showResolved
    if (lv) p.set('level', lv)
    if (cat) p.set('category', cat)
    if (d > 0) p.set('fromDays', String(d))
    if (res) p.set('showResolved', '1')
    p.set('limit', '300')
    const r = await fetch('/api/super-admin/logs?' + p.toString())
    const j = (await r.json()) as { logs?: LogRow[] }
    setLogs(j.logs ?? [])
    setBusy(false)
  }

  async function markResolved(id: string) {
    setBusy(true)
    const note = prompt('Ghi chú khi đánh dấu đã xử lý (tuỳ chọn):')
    if (note === null) {
      setBusy(false)
      return
    }
    await fetch('/api/super-admin/logs', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, note }),
    })
    setLogs((arr) => arr.filter((x) => x.id !== id))
    setBusy(false)
    startTransition(() => router.refresh())
  }

  async function createTestLog() {
    setBusy(true)
    await fetch('/api/super-admin/logs', { method: 'POST' })
    await refetch()
    setBusy(false)
  }

  async function purgeOld() {
    if (!confirm('Xoá toàn bộ log đã giải quyết quá 30 ngày? Action này không thể hoàn tác.')) return
    setBusy(true)
    const r = await fetch('/api/super-admin/logs?olderThanDays=30&onlyResolved=1', { method: 'DELETE' })
    const j = (await r.json()) as { deleted?: number }
    alert(`Đã xoá ${j.deleted ?? 0} log cũ.`)
    setBusy(false)
    startTransition(() => router.refresh())
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return logs
    const s = search.toLowerCase()
    return logs.filter(
      (l) =>
        l.message.toLowerCase().includes(s) ||
        (l.user_email ?? '').toLowerCase().includes(s) ||
        (l.ip_address ?? '').includes(s) ||
        (l.path ?? '').toLowerCase().includes(s) ||
        JSON.stringify(l.context ?? {}).toLowerCase().includes(s)
    )
  }, [logs, search])

  return (
    <>
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 mb-3">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          <select
            value={filterLevel}
            onChange={(e) => {
              setFilterLevel(e.target.value)
              refetch({ level: e.target.value })
            }}
            className="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-2 py-1.5"
          >
            <option value="">Mọi level</option>
            {Object.entries(LEVEL_META).map(([k, m]) => (
              <option key={k} value={k}>
                {m.emoji} {m.label}
              </option>
            ))}
          </select>
          <select
            value={filterCategory}
            onChange={(e) => {
              setFilterCategory(e.target.value)
              refetch({ category: e.target.value })
            }}
            className="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-2 py-1.5"
          >
            <option value="">Mọi category</option>
            {CATS.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
          <select
            value={filterDays}
            onChange={(e) => {
              const d = parseInt(e.target.value, 10)
              setFilterDays(d)
              refetch({ days: d })
            }}
            className="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-2 py-1.5"
          >
            <option value="1">24h qua</option>
            <option value="7">7 ngày</option>
            <option value="30">30 ngày</option>
            <option value="90">90 ngày</option>
            <option value="0">Tất cả</option>
          </select>
          <label className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={showResolved}
              onChange={(e) => {
                setShowResolved(e.target.checked)
                refetch({ resolved: e.target.checked })
              }}
            />
            Hiện đã xử lý
          </label>
          <input
            type="search"
            placeholder="🔍 message / IP / email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-2 py-1.5 col-span-2"
          />
        </div>

        <div className="flex flex-wrap gap-2 mt-2">
          <button
            onClick={() => refetch()}
            disabled={busy}
            className="text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 px-3 py-1.5 rounded-lg text-gray-700 dark:text-gray-200 disabled:opacity-50"
          >
            🔄 Làm mới
          </button>
          <button
            onClick={createTestLog}
            disabled={busy}
            className="text-xs bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-950/50 px-3 py-1.5 rounded-lg text-blue-700 dark:text-blue-300 disabled:opacity-50"
          >
            ➕ Tạo log test
          </button>
          <button
            onClick={purgeOld}
            disabled={busy}
            className="text-xs bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-950/50 px-3 py-1.5 rounded-lg text-rose-700 dark:text-rose-300 disabled:opacity-50"
          >
            🗑️ Dọn log cũ &gt;30d
          </button>
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto self-center">
            Hiển thị: {filtered.length}/{logs.length} {isPending ? '· đang sync' : ''}
          </span>
        </div>
      </div>

      {/* Log list */}
      {filtered.length === 0 ? (
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-xl p-8 text-center">
          <div className="text-4xl mb-2">✅</div>
          <p className="text-emerald-900 dark:text-emerald-200 font-semibold">
            Không có log lỗi nào trong khoảng đã chọn — hệ thống đang OK!
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((l) => {
            const meta = LEVEL_META[l.level] ?? LEVEL_META.info
            const expanded = expandedId === l.id
            return (
              <div
                key={l.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => setExpandedId(expanded ? null : l.id)}
                  className="w-full flex items-start gap-2 p-2.5 hover:bg-gray-50 dark:hover:bg-gray-900/40 text-left"
                >
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-bold shrink-0 ${meta.cls}`}>
                    {meta.emoji} {meta.label}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300 shrink-0 self-center">
                    {CATEGORY_LABEL[l.category] ?? l.category}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-900 dark:text-gray-100 font-medium truncate">{l.message}</div>
                    <div className="text-[10.5px] text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-0.5 flex-wrap">
                      <span>🕒 {timeAgo(l.created_at)} trước</span>
                      {l.user_email && <span>👤 {l.user_email}</span>}
                      {l.ip_address && <span>🌐 {l.ip_address}</span>}
                      {l.path && <span className="font-mono">📍 {l.path.slice(0, 50)}</span>}
                      {l.http_status && (
                        <span
                          className={
                            l.http_status >= 500
                              ? 'text-rose-600'
                              : l.http_status >= 400
                                ? 'text-amber-600'
                                : 'text-gray-500'
                          }
                        >
                          HTTP {l.http_status}
                        </span>
                      )}
                      {l.resolved_at && <span className="text-emerald-600">✓ đã xử lý</span>}
                    </div>
                  </div>
                  <span className="text-gray-400 text-xs">{expanded ? '▾' : '▸'}</span>
                </button>
                {expanded && (
                  <div className="px-2.5 pb-2.5 border-t border-gray-100 dark:border-gray-700 space-y-2 bg-gray-50/50 dark:bg-gray-900/20">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 text-[11.5px] text-gray-700 dark:text-gray-300 mt-2">
                      <div>
                        <span className="text-gray-500">Created:</span>{' '}
                        <span className="font-mono">{new Date(l.created_at).toLocaleString('vi-VN')}</span>
                      </div>
                      {l.user_agent && (
                        <div className="md:col-span-2">
                          <span className="text-gray-500">UA:</span>{' '}
                          <span className="font-mono text-[10.5px]">{l.user_agent}</span>
                        </div>
                      )}
                    </div>
                    {Object.keys(l.context ?? {}).length > 0 && (
                      <div>
                        <div className="text-[10.5px] text-gray-500 mb-0.5">Context:</div>
                        <pre className="text-[10.5px] font-mono bg-gray-900 dark:bg-black text-emerald-300 p-2 rounded overflow-x-auto max-h-40">
                          {JSON.stringify(l.context, null, 2)}
                        </pre>
                      </div>
                    )}
                    {!l.resolved_at && (
                      <button
                        onClick={() => markResolved(l.id)}
                        disabled={busy}
                        className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded px-3 py-1.5 disabled:opacity-50"
                      >
                        ✓ Đánh dấu đã xử lý
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
