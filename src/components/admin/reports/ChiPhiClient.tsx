'use client'

import { useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import { formatVnd } from '@/lib/utils/format'
import { removeDiacritics } from '@/lib/utils/slugify'

const ExpensesPieChart = dynamic(() => import('@/components/admin/reports/ExpensesPieChart'), {
  ssr: false,
})

export type ExpenseRow = {
  category_code: string | null
  category_name: string | null
  total_amount: string | number
  transaction_count: string | number
  percentage: string | number
}

type SortKey = 'amount_desc' | 'amount_asc' | 'count_desc' | 'percentage_desc' | 'name_az'

function fmtDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const RANGES = [
  { k: 'this_month', label: '📆 Tháng này' },
  { k: 'last_month', label: '↩ Tháng trước' },
  { k: 'q', label: '🗓 Quý này' },
  { k: 'ytd', label: '📅 YTD' },
  { k: '7d', label: '⏱ 7N' },
  { k: '30d', label: '🗓️ 30N' },
  { k: '90d', label: '🧮 90N' },
  { k: '1y', label: '📈 1 năm' },
] as const
type RangeKey = (typeof RANGES)[number]['k'] | 'custom'

function rangeFor(k: Exclude<RangeKey, 'custom'>): { from: string; to: string } {
  const today = new Date()
  if (k === 'this_month')
    return {
      from: fmtDate(new Date(today.getFullYear(), today.getMonth(), 1)),
      to: fmtDate(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
    }
  if (k === 'last_month')
    return {
      from: fmtDate(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
      to: fmtDate(new Date(today.getFullYear(), today.getMonth(), 0)),
    }
  if (k === 'q') {
    const qStart = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1)
    return { from: fmtDate(qStart), to: fmtDate(today) }
  }
  if (k === 'ytd')
    return { from: `${today.getFullYear()}-01-01`, to: fmtDate(today) }
  if (k === '7d')
    return { from: fmtDate(new Date(today.getTime() - 7 * 86400_000)), to: fmtDate(today) }
  if (k === '30d')
    return { from: fmtDate(new Date(today.getTime() - 30 * 86400_000)), to: fmtDate(today) }
  if (k === '90d')
    return { from: fmtDate(new Date(today.getTime() - 90 * 86400_000)), to: fmtDate(today) }
  if (k === '1y')
    return { from: fmtDate(new Date(today.getTime() - 365 * 86400_000)), to: fmtDate(today) }
  return { from: fmtDate(today), to: fmtDate(today) }
}

export function ChiPhiClient({
  rows,
  from,
  to,
  initialRange,
}: {
  rows: ExpenseRow[]
  from: string
  to: string
  initialRange: RangeKey
}) {
  const router = useRouter()
  const sp = useSearchParams()
  const [q, setQ] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('amount_desc')
  const [rangeK, setRangeK] = useState<RangeKey>(initialRange)

  const qNorm = removeDiacritics(q.trim())

  function jumpRange(k: Exclude<RangeKey, 'custom'>) {
    const r = rangeFor(k)
    const params = new URLSearchParams(sp?.toString())
    params.set('from', r.from)
    params.set('to', r.to)
    router.push(`/admin/tai-chinh/bao-cao/chi-phi?${params.toString()}`)
  }

  function setCustomDate(field: 'from' | 'to', v: string) {
    const params = new URLSearchParams(sp?.toString())
    params.set(field, v)
    if (field === 'from') params.set('to', to)
    if (field === 'to') params.set('from', from)
    setRangeK('custom')
    router.push(`/admin/tai-chinh/bao-cao/chi-phi?${params.toString()}`)
  }

  const filteredSorted = useMemo(() => {
    const list = rows.filter((r) => {
      if (qNorm) {
        const hay = removeDiacritics(`${r.category_name ?? ''} ${r.category_code ?? ''}`)
        if (!hay.includes(qNorm)) return false
      }
      return true
    })
    list.sort((a, b) => {
      if (sortKey === 'amount_desc') return Number(b.total_amount) - Number(a.total_amount)
      if (sortKey === 'amount_asc') return Number(a.total_amount) - Number(b.total_amount)
      if (sortKey === 'count_desc')
        return Number(b.transaction_count) - Number(a.transaction_count)
      if (sortKey === 'percentage_desc') return Number(b.percentage) - Number(a.percentage)
      if (sortKey === 'name_az')
        return (a.category_name ?? '').localeCompare(b.category_name ?? '', 'vi')
      return 0
    })
    return list
  }, [rows, qNorm, sortKey])

  const stats = useMemo(() => {
    const total = filteredSorted.reduce((s, r) => s + Number(r.total_amount), 0)
    const totalCount = filteredSorted.reduce((s, r) => s + Number(r.transaction_count), 0)
    const top = filteredSorted[0]
    const days = Math.max(
      1,
      Math.round(
        (new Date(to).getTime() - new Date(from).getTime()) / 86400_000 + 1
      )
    )
    const avgPerDay = total / days
    return { total, totalCount, top, avgPerDay, days, items: filteredSorted.length }
  }, [filteredSorted, from, to])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Kpi
          label="Tổng chi phí"
          value={formatVnd(stats.total)}
          icon="💸"
          tone="from-rose-500 to-red-500"
          small
        />
        <Kpi
          label={`Trung bình / ngày · ${stats.days}N`}
          value={formatVnd(stats.avgPerDay)}
          icon="📅"
          tone="from-amber-500 to-orange-500"
          small
        />
        <Kpi
          label="Số giao dịch"
          value={String(stats.totalCount)}
          icon="🧾"
          tone="from-blue-500 to-indigo-500"
        />
        <Kpi
          label="Hạng mục lớn nhất"
          value={stats.top ? (stats.top.category_name ?? '—') : '—'}
          icon="🏆"
          tone="from-violet-500 to-purple-500"
          small
          sub={stats.top ? `${Number(stats.top.percentage)}% · ${formatVnd(Number(stats.top.total_amount))}` : ''}
        />
      </div>

      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1 min-w-0">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm hạng mục: thức ăn, thuốc, lương, điện…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={from}
              onChange={(e) => setCustomDate('from', e.target.value)}
              className="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2"
            />
            <span className="text-gray-400">→</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setCustomDate('to', e.target.value)}
              className="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2"
            />
          </div>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
          <div className="flex flex-wrap gap-1.5">
            {RANGES.map((r) => {
              const active = rangeK === r.k
              return (
                <button
                  key={r.k}
                  onClick={() => {
                    setRangeK(r.k)
                    jumpRange(r.k)
                  }}
                  className={
                    'px-3 py-1.5 rounded-full text-xs font-medium border transition ' +
                    (active
                      ? 'bg-gradient-to-r from-rose-500 to-red-500 text-white border-transparent shadow'
                      : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-rose-400')
                  }
                >
                  {r.label}
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500 dark:text-gray-400">
              Hiện <strong className="text-gray-900 dark:text-gray-100">{stats.items}</strong>/
              {rows.length} hạng mục
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 pt-1">
          {[
            { k: 'amount_desc' as const, label: '💰 Tiền cao' },
            { k: 'amount_asc' as const, label: '💵 Tiền thấp' },
            { k: 'count_desc' as const, label: '🧾 Nhiều giao dịch' },
            { k: 'percentage_desc' as const, label: '🥇 Tỷ trọng cao' },
            { k: 'name_az' as const, label: '🔤 Tên A→Z' },
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
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
        <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-rose-400 to-red-500" />
          <div className="p-4">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                📋 Bảng chi tiết
              </h2>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Tổng {formatVnd(stats.total)}
              </span>
            </div>

            {filteredSorted.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">📭</div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Không có chi phí nào khớp.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {filteredSorted.map((r) => {
                  const amt = Number(r.total_amount)
                  const pct = Number(r.percentage)
                  return (
                    <li
                      key={r.category_code ?? r.category_name ?? Math.random()}
                      className="bg-gray-50/60 dark:bg-gray-900/40 rounded-lg p-3"
                    >
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {r.category_name ?? r.category_code ?? '— Khác —'}
                        </span>
                        <span className="text-sm font-bold tabular-nums text-rose-700 dark:text-rose-300">
                          {formatVnd(amt)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 mb-1.5">
                        <span>
                          🧾 {Number(r.transaction_count)} giao dịch · TB{' '}
                          {formatVnd(
                            Number(r.transaction_count) > 0
                              ? amt / Number(r.transaction_count)
                              : 0
                          )}
                          /lần
                        </span>
                        <span className="font-mono">{pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-rose-100/60 dark:bg-rose-950/30 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-rose-400 to-red-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
              🥧 Tỷ trọng chi phí
            </h3>
            <ExpensesPieChart data={filteredSorted} />
          </section>

          <section className="bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-rose-900 dark:text-rose-200 mb-2 flex items-center gap-1.5">
              <span>💡</span> Tip kiểm soát chi phí
            </h3>
            <ul className="text-xs text-rose-800 dark:text-rose-200 space-y-1 list-disc list-inside leading-relaxed">
              <li>Hạng mục chiếm &gt; 30% tổng = cần xem xét tối ưu</li>
              <li>So sánh với "Tháng trước" để phát hiện đột biến</li>
              <li>Click "🥇 Tỷ trọng cao" để sắp theo % giảm dần</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  )
}

function Kpi({
  label,
  value,
  icon,
  tone,
  small,
  sub,
}: {
  label: string
  value: string
  icon: string
  tone: string
  small?: boolean
  sub?: string
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
        <div
          className={
            'mt-1 font-bold tabular-nums text-gray-900 dark:text-gray-100 ' +
            (small ? 'text-base' : 'text-2xl')
          }
        >
          {value}
        </div>
        {sub && (
          <div className="text-[10.5px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
            {sub}
          </div>
        )}
      </div>
    </div>
  )
}
