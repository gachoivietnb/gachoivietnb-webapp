'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { formatVnd } from '@/lib/utils/format'
import { removeDiacritics } from '@/lib/utils/slugify'

export type AggCustomer = {
  customer_id: string
  customer_name: string
  phone: string | null
  total_due: number
  total_value: number
  total_paid: number
  order_count: number
  overdue_count: number
  oldest_days: number
}

type AmountBand = '' | 'under_10m' | '10m_50m' | '50m_200m' | 'over_200m'
type AgeBand = '' | 'fresh' | 'overdue_30' | 'overdue_60' | 'overdue_90'
type SortKey = 'due_desc' | 'due_asc' | 'oldest_first' | 'name_asc' | 'orders_desc'

export function ReceivablesClient({ customers }: { customers: AggCustomer[] }) {
  const [q, setQ] = useState('')
  const [amount, setAmount] = useState<AmountBand>('')
  const [age, setAge] = useState<AgeBand>('')
  const [onlyOverdue, setOnlyOverdue] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('due_desc')

  const qNorm = removeDiacritics(q.trim())

  const filtered = useMemo(() => {
    const out = customers.filter((c) => {
      if (qNorm) {
        const hay = removeDiacritics(`${c.customer_name} ${c.phone ?? ''}`)
        if (!hay.includes(qNorm)) return false
      }
      if (amount === 'under_10m' && c.total_due >= 10_000_000) return false
      if (amount === '10m_50m' && (c.total_due < 10_000_000 || c.total_due >= 50_000_000))
        return false
      if (amount === '50m_200m' && (c.total_due < 50_000_000 || c.total_due >= 200_000_000))
        return false
      if (amount === 'over_200m' && c.total_due < 200_000_000) return false
      if (age === 'fresh' && c.oldest_days > 30) return false
      if (age === 'overdue_30' && (c.oldest_days <= 30 || c.oldest_days > 60)) return false
      if (age === 'overdue_60' && (c.oldest_days <= 60 || c.oldest_days > 90)) return false
      if (age === 'overdue_90' && c.oldest_days <= 90) return false
      if (onlyOverdue && c.overdue_count === 0) return false
      return true
    })
    // Sort
    const sorted = [...out]
    if (sortKey === 'due_desc') sorted.sort((a, b) => b.total_due - a.total_due)
    else if (sortKey === 'due_asc') sorted.sort((a, b) => a.total_due - b.total_due)
    else if (sortKey === 'oldest_first') sorted.sort((a, b) => b.oldest_days - a.oldest_days)
    else if (sortKey === 'name_asc')
      sorted.sort((a, b) => a.customer_name.localeCompare(b.customer_name, 'vi'))
    else if (sortKey === 'orders_desc') sorted.sort((a, b) => b.order_count - a.order_count)
    return sorted
  }, [customers, qNorm, amount, age, onlyOverdue, sortKey])

  // Live KPI
  const liveTotalDue = filtered.reduce((s, c) => s + c.total_due, 0)
  const liveOverdueOrders = filtered.reduce((s, c) => s + c.overdue_count, 0)
  const maxDue = filtered.length > 0 ? filtered[0].total_due : 0
  const biggestDebtor = filtered.length > 0
    ? filtered.reduce((max, c) => (c.total_due > max.total_due ? c : max), filtered[0])
    : null

  const hasFilter = !!(q || amount || age || onlyOverdue)

  function clearFilters() {
    setQ('')
    setAmount('')
    setAge('')
    setOnlyOverdue(false)
  }

  return (
    <div className="space-y-4">
      {/* KPI cards — live filter */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi
          label="Khách đang nợ"
          value={filtered.length.toLocaleString('vi-VN')}
          sub={`/ ${customers.length} tổng`}
          tint="blue"
          icon="👥"
        />
        <Kpi
          label="Tổng còn nợ"
          value={formatVnd(liveTotalDue)}
          tint="red"
          icon="⚠️"
        />
        <Kpi
          label="Đơn quá hạn"
          value={liveOverdueOrders.toLocaleString('vi-VN')}
          sub="( > 30 ngày)"
          tint="amber"
          icon="⏰"
        />
        <Kpi
          label="Nợ lớn nhất"
          value={formatVnd(maxDue)}
          sub={biggestDebtor?.customer_name ?? '—'}
          tint="purple"
          icon="💰"
        />
      </div>

      {/* Filter bar */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 md:p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">🔍 Bộ lọc thông minh</h2>
          {hasFilter && (
            <button
              onClick={clearFilters}
              className="text-xs text-red-600 dark:text-red-400 hover:underline font-semibold ml-auto"
            >
              ✕ Xóa lọc
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 md:gap-3">
          {/* Search */}
          <div className="relative md:col-span-2">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              🔍
            </span>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm tên khách / số điện thoại..."
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg pl-9 pr-3 py-2 text-sm outline-none transition"
            />
          </div>

          {/* Amount band */}
          <select
            value={amount}
            onChange={(e) => setAmount(e.target.value as AmountBand)}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">💰 Mức nợ bất kỳ</option>
            <option value="under_10m">{'< 10 triệu'}</option>
            <option value="10m_50m">10 – 50 triệu</option>
            <option value="50m_200m">50 – 200 triệu</option>
            <option value="over_200m">{'≥ 200 triệu'}</option>
          </select>

          {/* Age band */}
          <select
            value={age}
            onChange={(e) => setAge(e.target.value as AgeBand)}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">⏱ Tuổi nợ bất kỳ</option>
            <option value="fresh">Còn hạn (≤ 30 ngày)</option>
            <option value="overdue_30">Quá hạn 30 – 60 ngày</option>
            <option value="overdue_60">Quá hạn 60 – 90 ngày</option>
            <option value="overdue_90">{'> 90 ngày (nợ xấu)'}</option>
          </select>

          {/* Sort */}
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
          >
            <option value="due_desc">↓ Nợ nhiều nhất</option>
            <option value="due_asc">↑ Nợ ít nhất</option>
            <option value="oldest_first">⏰ Quá hạn lâu nhất</option>
            <option value="orders_desc">📋 Nhiều đơn nhất</option>
            <option value="name_asc">🔤 Tên A → Z</option>
          </select>
        </div>

        {/* Quick toggles */}
        <div className="mt-3 flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyOverdue}
              onChange={(e) => setOnlyOverdue(e.target.checked)}
              className="w-4 h-4 rounded accent-red-600"
            />
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              ⚠ Chỉ hiện khách có đơn quá hạn
            </span>
          </label>

          {/* Quick chips */}
          <div className="ml-auto flex gap-1.5 flex-wrap">
            <QuickChip
              label="Khẩn cấp: nợ > 90 ngày"
              active={age === 'overdue_90'}
              tint="red"
              onClick={() => setAge((a) => (a === 'overdue_90' ? '' : 'overdue_90'))}
            />
            <QuickChip
              label="Nợ lớn: ≥ 50M"
              active={amount === '50m_200m' || amount === 'over_200m'}
              tint="amber"
              onClick={() => setAmount((a) => (a === '50m_200m' ? 'over_200m' : a === 'over_200m' ? '' : '50m_200m'))}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-8 text-center">
          <div className="text-4xl mb-2">{customers.length === 0 ? '✅' : '🔍'}</div>
          <p className="text-gray-600 dark:text-gray-400">
            {customers.length === 0
              ? 'Không có công nợ nào'
              : 'Không có khách hàng nào khớp tiêu chí lọc'}
          </p>
          {hasFilter && customers.length > 0 && (
            <button
              onClick={clearFilters}
              className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline font-semibold"
            >
              Bỏ tất cả bộ lọc
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700 rounded-xl overflow-x-auto shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs uppercase text-gray-700 dark:text-gray-300">
              <tr>
                <th className="px-4 py-2.5 text-left">Khách hàng</th>
                <th className="px-4 py-2.5 text-right">Số đơn</th>
                <th className="px-4 py-2.5 text-right">Tổng giá trị</th>
                <th className="px-4 py-2.5 text-right">Đã thu</th>
                <th className="px-4 py-2.5 text-right">Còn nợ</th>
                <th className="px-4 py-2.5 text-left">Nợ lâu nhất</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-gray-900 dark:text-gray-100">
              {filtered.map((c) => {
                const isOverdue = c.oldest_days > 30
                const isBad = c.oldest_days > 90
                return (
                  <tr
                    key={c.customer_id}
                    className={
                      isBad
                        ? 'bg-red-50/80 dark:bg-red-950/30'
                        : isOverdue
                          ? 'bg-amber-50/50 dark:bg-amber-950/20'
                          : 'hover:bg-gray-50/50 dark:hover:bg-gray-700/30'
                    }
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-[11px] font-semibold shrink-0">
                          {c.customer_name.split(' ').slice(-1)[0]?.[0] ?? '?'}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{c.customer_name}</div>
                          {c.phone && (
                            <div className="text-[11px] text-gray-500 dark:text-gray-400">
                              {c.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{c.order_count}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatVnd(c.total_value)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-green-600 dark:text-green-400">
                      {formatVnd(c.total_paid)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-red-600 dark:text-red-400">
                      {formatVnd(c.total_due)}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span
                        className={
                          isBad
                            ? 'text-red-700 dark:text-red-300 font-bold'
                            : isOverdue
                              ? 'text-amber-700 dark:text-amber-300 font-semibold'
                              : 'text-gray-600 dark:text-gray-400'
                        }
                      >
                        {c.oldest_days} ngày
                        {isBad && ' 🚨'}
                        {!isBad && isOverdue && ' ⚠'}
                      </span>
                      {c.overdue_count > 0 && (
                        <div className="text-[11px] text-red-600 dark:text-red-400">
                          {c.overdue_count} đơn quá hạn
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/tai-chinh/bao-cao/cong-no/${c.customer_id}`}
                        className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
                      >
                        Sổ chi tiết →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
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
  tint: 'blue' | 'red' | 'amber' | 'purple'
  icon: string
}) {
  const map: Record<string, string> = {
    blue: 'from-blue-500 to-indigo-600',
    red: 'from-red-500 to-rose-600',
    amber: 'from-amber-500 to-orange-600',
    purple: 'from-purple-500 to-fuchsia-600',
  }
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-sm relative overflow-hidden">
      <div
        className={`absolute top-0 right-0 w-14 h-14 rounded-full bg-gradient-to-br ${map[tint]} opacity-10 -translate-y-4 translate-x-4`}
      />
      <div className="flex items-start justify-between gap-2 relative">
        <div className="min-w-0">
          <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest truncate">
            {label}
          </div>
          <div className="text-sm md:text-base font-extrabold text-gray-900 dark:text-gray-100 mt-1 tabular-nums truncate">
            {value}
          </div>
          {sub && (
            <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{sub}</div>
          )}
        </div>
        <span className="text-xl">{icon}</span>
      </div>
    </div>
  )
}

function QuickChip({
  label,
  active,
  tint,
  onClick,
}: {
  label: string
  active: boolean
  tint: 'red' | 'amber'
  onClick: () => void
}) {
  const base = 'text-xs px-2.5 py-1 rounded-full font-semibold transition whitespace-nowrap'
  const tintActive =
    tint === 'red'
      ? 'bg-red-600 text-white shadow-sm'
      : 'bg-amber-600 text-white shadow-sm'
  const tintInactive =
    tint === 'red'
      ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 hover:bg-red-100'
      : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
  return (
    <button type="button" onClick={onClick} className={`${base} ${active ? tintActive : tintInactive}`}>
      {label}
    </button>
  )
}
