'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { formatDate, formatVnd } from '@/lib/utils/format'
import { removeDiacritics } from '@/lib/utils/slugify'
import { getBreedColor } from '@/lib/utils/breed-colors'

export type OrderRow = {
  id: string
  order_code: string
  order_date: string
  status: string
  total_amount: number
  paid_amount: number
  deposit_amount: number
  remaining: number
  delivered_date: string | null
  payment_method: string | null
  notes: string | null
  customer_id: string | null
  customer_name: string | null
  customer_phone: string | null
  customer_tier: string | null
  breed_codes: string[]
  breed_names: string[]
  item_count: number
  chicken_codes: string[]
  chicken_names: string[]
}

type Customer = { id: string; name: string; tier: string | null }
type Breed = { code: string; name: string }
type SortKey = 'date_desc' | 'date_asc' | 'amount_desc' | 'remaining_desc' | 'qty_desc'
type ViewMode = 'grid' | 'list'
type DateRange = '' | '7d' | '30d' | '90d' | 'this_month' | 'last_month' | 'this_year'

const STATUS_META: Record<
  string,
  { label: string; pill: string; gradient: string; emoji: string }
> = {
  hoi_mua: {
    label: 'Hỏi mua',
    pill: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300',
    gradient: 'from-blue-500 to-indigo-600',
    emoji: '💬',
  },
  dat_coc: {
    label: 'Đặt cọc',
    pill: 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300',
    gradient: 'from-amber-500 to-orange-600',
    emoji: '🔒',
  },
  da_giao: {
    label: 'Đã giao',
    pill: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300',
    gradient: 'from-emerald-500 to-green-600',
    emoji: '✅',
  },
  huy: {
    label: 'Đã hủy',
    pill: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300',
    gradient: 'from-red-500 to-rose-600',
    emoji: '✕',
  },
}

export function BanRaIndexClient({
  orders,
  customers,
  breeds,
}: {
  orders: OrderRow[]
  customers: Customer[]
  breeds: Breed[]
}) {
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [breedCode, setBreedCode] = useState('')
  const [tierFilter, setTierFilter] = useState<'' | 'vip' | 'thuong'>('')
  const [debtOnly, setDebtOnly] = useState(false)
  const [range, setRange] = useState<DateRange>('')
  const [sortKey, setSortKey] = useState<SortKey>('date_desc')
  const [view, setView] = useState<ViewMode>('grid')

  const qNorm = removeDiacritics(q.trim())

  function rangeStartDate(): string | null {
    const now = new Date()
    if (range === '7d') return new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10)
    if (range === '30d') return new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10)
    if (range === '90d') return new Date(now.getTime() - 90 * 86400000).toISOString().slice(0, 10)
    if (range === 'this_month')
      return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    if (range === 'last_month')
      return new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10)
    if (range === 'this_year') return new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10)
    return null
  }
  function rangeEndDate(): string | null {
    if (range === 'last_month') {
      const now = new Date()
      return new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10)
    }
    return null
  }

  const filtered = useMemo(() => {
    const rStart = rangeStartDate()
    const rEnd = rangeEndDate()
    const out = orders.filter((o) => {
      if (qNorm) {
        const hay = removeDiacritics(
          `${o.order_code} ${o.customer_name ?? ''} ${o.customer_phone ?? ''} ${o.notes ?? ''} ${o.chicken_codes.join(' ')} ${o.chicken_names.join(' ')} ${o.breed_names.join(' ')}`
        )
        if (!hay.includes(qNorm)) return false
      }
      if (statusFilter && o.status !== statusFilter) return false
      if (customerId && o.customer_id !== customerId) return false
      if (breedCode && !o.breed_codes.includes(breedCode)) return false
      if (tierFilter === 'vip' && o.customer_tier !== 'vip') return false
      if (tierFilter === 'thuong' && o.customer_tier === 'vip') return false
      if (debtOnly && o.remaining <= 0) return false
      if (rStart && o.order_date < rStart) return false
      if (rEnd && o.order_date > rEnd) return false
      return true
    })
    const sorted = [...out]
    if (sortKey === 'date_desc') sorted.sort((a, b) => b.order_date.localeCompare(a.order_date))
    else if (sortKey === 'date_asc') sorted.sort((a, b) => a.order_date.localeCompare(b.order_date))
    else if (sortKey === 'amount_desc') sorted.sort((a, b) => b.total_amount - a.total_amount)
    else if (sortKey === 'remaining_desc') sorted.sort((a, b) => b.remaining - a.remaining)
    else if (sortKey === 'qty_desc') sorted.sort((a, b) => b.item_count - a.item_count)
    return sorted
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, qNorm, statusFilter, customerId, breedCode, tierFilter, debtOnly, range, sortKey])

  // KPI
  const total = orders.length
  const dlOrders = orders.filter((o) => o.status === 'da_giao')
  const totalRevenue = dlOrders.reduce((s, o) => s + o.total_amount, 0)
  const pendingRevenue = orders
    .filter((o) => o.status === 'hoi_mua' || o.status === 'dat_coc')
    .reduce((s, o) => s + o.total_amount, 0)
  const totalDeposit = orders.reduce((s, o) => s + o.deposit_amount, 0)
  const totalDebt = orders
    .filter((o) => o.status !== 'huy')
    .reduce((s, o) => s + o.remaining, 0)

  const dt30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const recent30Revenue = dlOrders
    .filter((o) => o.order_date >= dt30)
    .reduce((s, o) => s + o.total_amount, 0)

  // Top customer
  const customerAgg = new Map<string, { name: string; tier: string | null; amount: number; count: number }>()
  for (const o of orders) {
    if (!o.customer_id || !o.customer_name) continue
    if (o.status === 'huy') continue
    const cur = customerAgg.get(o.customer_id) ?? {
      name: o.customer_name,
      tier: o.customer_tier,
      amount: 0,
      count: 0,
    }
    cur.amount += o.total_amount
    cur.count += 1
    customerAgg.set(o.customer_id, cur)
  }
  const topCustomer = [...customerAgg.values()].sort((a, b) => b.amount - a.amount)[0]

  // Status counts (for tab pills)
  const statusCounts: Record<string, number> = { hoi_mua: 0, dat_coc: 0, da_giao: 0, huy: 0 }
  for (const o of orders) {
    if (statusCounts[o.status] != null) statusCounts[o.status]++
  }

  const hasFilter = !!(q || statusFilter || customerId || breedCode || tierFilter || debtOnly || range)
  function clearFilters() {
    setQ('')
    setStatusFilter('')
    setCustomerId('')
    setBreedCode('')
    setTierFilter('')
    setDebtOnly(false)
    setRange('')
  }

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Kpi
          label="Tổng đơn"
          value={total.toLocaleString('vi-VN')}
          sub={`${filtered.length} hiển thị`}
          tint="blue"
          icon="💵"
        />
        <Kpi
          label="Doanh thu đã giao"
          value={formatVnd(totalRevenue)}
          sub={`30 ngày: ${formatVnd(recent30Revenue)}`}
          tint="emerald"
          icon="💰"
        />
        <Kpi
          label="Đang xử lý"
          value={formatVnd(pendingRevenue)}
          sub={`Cọc đã thu: ${formatVnd(totalDeposit)}`}
          tint="amber"
          icon="⏳"
        />
        <Kpi
          label="Công nợ phải thu"
          value={formatVnd(totalDebt)}
          sub={totalDebt > 0 ? '⚠ Cần đôn đốc' : 'Đã thu sạch'}
          tint="red"
          icon="📋"
        />
        <Kpi
          label="Khách lớn nhất"
          value={topCustomer ? topCustomer.name : '—'}
          sub={topCustomer ? `${topCustomer.count} đơn · ${formatVnd(topCustomer.amount)}` : '—'}
          tint="purple"
          icon="👑"
        />
      </div>

      {/* Status tab pills (quick filter) */}
      <div className="flex gap-2 flex-wrap">
        {(['', 'hoi_mua', 'dat_coc', 'da_giao', 'huy'] as const).map((s) => {
          const active = statusFilter === s
          const meta = s ? STATUS_META[s] : { label: 'Tất cả', emoji: '📋', pill: '', gradient: '' }
          const count = s ? statusCounts[s] : total
          return (
            <button
              key={s || 'all'}
              onClick={() => setStatusFilter(s)}
              className={`text-xs px-3 py-1.5 rounded-full font-semibold transition inline-flex items-center gap-1.5 ${
                active
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <span>{meta.emoji}</span>
              <span>{meta.label}</span>
              <span className={`text-[10px] rounded-full px-1.5 ${active ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-700'}`}>
                {count}
              </span>
            </button>
          )
        })}
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
              placeholder="Mã đơn, khách, SĐT, mã/tên gà, ghi chú..."
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg pl-9 pr-3 py-2 text-sm outline-none"
            />
          </div>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">👤 Mọi khách</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}{c.tier === 'vip' ? ' ★ VIP' : ''}
              </option>
            ))}
          </select>
          <select
            value={breedCode}
            onChange={(e) => setBreedCode(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">🧬 Mọi giống</option>
            {breeds.map((b) => (
              <option key={b.code} value={b.code}>{b.name}</option>
            ))}
          </select>
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value as '' | 'vip' | 'thuong')}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">⭐ Mọi hạng KH</option>
            <option value="vip">★ VIP</option>
            <option value="thuong">Thường</option>
          </select>
        </div>

        {/* Date presets */}
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">📅 Thời gian:</span>
          {(
            [
              ['', 'Tất cả'],
              ['7d', '7 ngày'],
              ['30d', '30 ngày'],
              ['90d', '90 ngày'],
              ['this_month', 'Tháng này'],
              ['last_month', 'Tháng trước'],
              ['this_year', 'Năm nay'],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setRange(k as DateRange)}
              className={`text-xs px-2.5 py-1 rounded-full font-semibold transition ${
                range === k
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Toggle + sort + view */}
        <div className="mt-3 flex items-center gap-2 flex-wrap pt-3 border-t border-gray-100 dark:border-gray-700">
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={debtOnly}
              onChange={(e) => setDebtOnly(e.target.checked)}
              className="w-4 h-4 accent-red-600"
            />
            <span className="font-semibold text-gray-700 dark:text-gray-300">⚠ Chỉ đơn còn nợ</span>
          </label>

          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-auto">
            Sắp xếp:
          </span>
          {(
            [
              ['date_desc', '🆕 Mới nhất'],
              ['amount_desc', '💰 Tiền cao'],
              ['remaining_desc', '⚠ Nợ nhiều'],
              ['qty_desc', '🐓 Nhiều con'],
              ['date_asc', '📅 Cũ nhất'],
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

          <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
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
              ☰ Bảng
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-12 text-center">
          <div className="text-5xl mb-2">💵</div>
          <p className="text-gray-600 dark:text-gray-400 text-lg font-semibold">
            {orders.length === 0 ? 'Chưa có đơn nào' : 'Không có đơn nào khớp tiêu chí'}
          </p>
          {hasFilter && orders.length > 0 && (
            <button onClick={clearFilters} className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline font-semibold">
              Bỏ tất cả bộ lọc
            </button>
          )}
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((o) => (
            <OrderCard key={o.id} o={o} />
          ))}
        </div>
      ) : (
        <ListView items={filtered} />
      )}
    </div>
  )
}

function OrderCard({ o }: { o: OrderRow }) {
  const meta = STATUS_META[o.status] ?? STATUS_META.hoi_mua
  const accentColor = getBreedColor(o.breed_codes[0] ?? null)
  const daysSince = Math.floor((Date.now() - new Date(o.order_date).getTime()) / 86400000)

  return (
    <Link
      href={`/admin/ban-ra/${o.id}`}
      className="group block bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all"
    >
      {/* Status gradient bar */}
      <div className={`h-2 bg-gradient-to-r ${meta.gradient}`} />

      <div className="p-4">
        {/* Top: code + status */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0 flex-1">
            <div className="font-mono font-bold text-base truncate">{o.order_code}</div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
              📅 {formatDate(o.order_date)}
              {daysSince === 0 ? ' · Hôm nay' : daysSince === 1 ? ' · Hôm qua' : ` · ${daysSince}d trước`}
            </div>
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap ${meta.pill}`}>
            {meta.emoji} {meta.label}
          </span>
        </div>

        {/* Customer */}
        <div className="flex items-center gap-2 mb-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg p-2 border border-purple-100 dark:border-purple-900/40">
          <div className={`w-8 h-8 rounded-full ${o.customer_tier === 'vip' ? 'bg-gradient-to-br from-amber-400 to-yellow-500' : 'bg-gradient-to-br from-purple-500 to-fuchsia-600'} text-white flex items-center justify-center text-sm font-bold shrink-0`}>
            {o.customer_name?.[0] ?? '?'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-sm truncate flex items-center gap-1">
              {o.customer_name ?? '— Khách lẻ —'}
              {o.customer_tier === 'vip' && (
                <span className="text-[9px] px-1 py-0 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-bold">
                  ★ VIP
                </span>
              )}
            </div>
            {o.customer_phone && (
              <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">📞 {o.customer_phone}</div>
            )}
          </div>
        </div>

        {/* Total + qty */}
        <div className="flex items-end justify-between mb-3">
          <div>
            <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Tổng tiền</div>
            <div className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums leading-none mt-1">
              {formatVnd(o.total_amount)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">SL</div>
            <div className="text-lg font-extrabold tabular-nums text-blue-700 dark:text-blue-400">
              {o.item_count}<span className="text-[10px] text-gray-500 dark:text-gray-400 ml-1 font-normal">con</span>
            </div>
          </div>
        </div>

        {/* Payment status — visual */}
        {o.status !== 'huy' && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400 mb-1">
              <span>Đã thu / Tổng</span>
              <span className="font-bold tabular-nums text-gray-900 dark:text-gray-100">
                {formatVnd(o.paid_amount)} / {formatVnd(o.total_amount)}
              </span>
            </div>
            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full ${
                  o.remaining === 0
                    ? 'bg-gradient-to-r from-emerald-500 to-green-600'
                    : o.deposit_amount > 0
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                      : 'bg-red-500'
                }`}
                style={{
                  width: `${o.total_amount > 0 ? (o.paid_amount / o.total_amount) * 100 : 0}%`,
                }}
              />
            </div>
            {o.remaining > 0 && (
              <div className="text-[10px] text-red-600 dark:text-red-400 mt-1 font-semibold">
                ⚠ Còn nợ: {formatVnd(o.remaining)}
              </div>
            )}
            {o.remaining === 0 && o.status !== 'huy' && (
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">
                ✓ Đã tất toán
              </div>
            )}
          </div>
        )}

        {/* Breed badges */}
        {o.breed_codes.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {o.breed_codes.slice(0, 4).map((c, i) => {
              const color = getBreedColor(c)
              return (
                <span key={c} className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${color.badge}`}>
                  {o.breed_names[i] ?? c}
                </span>
              )
            })}
            {o.breed_codes.length > 4 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 font-semibold">
                +{o.breed_codes.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Notes */}
        {o.notes && (
          <div className="text-[11px] text-gray-600 dark:text-gray-400 italic line-clamp-2 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            💬 {o.notes}
          </div>
        )}

        {/* Accent dot for breed */}
        <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${accentColor.bg}`} aria-hidden />
      </div>
    </Link>
  )
}

function ListView({ items }: { items: OrderRow[] }) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-x-auto shadow-sm">
      <table className="w-full text-sm min-w-[1100px]">
        <thead className="bg-gray-50 dark:bg-gray-900/60 text-[11px] uppercase text-gray-500 dark:text-gray-400">
          <tr>
            <th className="px-3 py-2.5 text-left">Mã đơn</th>
            <th className="px-3 py-2.5 text-left">Ngày</th>
            <th className="px-3 py-2.5 text-left">Khách</th>
            <th className="px-3 py-2.5 text-left">Giống</th>
            <th className="px-3 py-2.5 text-right">SL</th>
            <th className="px-3 py-2.5 text-right">Tổng</th>
            <th className="px-3 py-2.5 text-right">Đã thu</th>
            <th className="px-3 py-2.5 text-right">Còn nợ</th>
            <th className="px-3 py-2.5 text-center">Trạng thái</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {items.map((o) => {
            const meta = STATUS_META[o.status] ?? STATUS_META.hoi_mua
            return (
              <tr
                key={o.id}
                className={`hover:bg-gray-50/60 dark:hover:bg-gray-900/30 transition ${
                  o.remaining > 0 && o.status !== 'huy' ? 'bg-red-50/30 dark:bg-red-950/10' : ''
                }`}
              >
                <td className="px-3 py-2 font-mono">
                  <Link href={`/admin/ban-ra/${o.id}`} className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                    {o.order_code}
                  </Link>
                </td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  {formatDate(o.order_date)}
                </td>
                <td className="px-3 py-2">
                  <div className="font-medium truncate flex items-center gap-1 max-w-[220px]">
                    <span className="truncate">{o.customer_name ?? '—'}</span>
                    {o.customer_tier === 'vip' && (
                      <span className="text-[9px] px-1 py-0 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-bold">
                        ★
                      </span>
                    )}
                  </div>
                  {o.customer_phone && (
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">{o.customer_phone}</div>
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1 max-w-[180px]">
                    {o.breed_codes.slice(0, 3).map((c, i) => {
                      const color = getBreedColor(c)
                      return (
                        <span key={c} className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${color.badge}`}>
                          {o.breed_names[i] ?? c}
                        </span>
                      )
                    })}
                    {o.breed_codes.length > 3 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                        +{o.breed_codes.length - 3}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums">{o.item_count}</td>
                <td className="px-3 py-2 text-right font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                  {formatVnd(o.total_amount)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-blue-700 dark:text-blue-400">
                  {formatVnd(o.paid_amount)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {o.remaining > 0 && o.status !== 'huy' ? (
                    <span className="font-bold text-red-600 dark:text-red-400">{formatVnd(o.remaining)}</span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap ${meta.pill}`}>
                    {meta.emoji} {meta.label}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
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
  tint: 'blue' | 'emerald' | 'amber' | 'red' | 'purple'
  icon: string
}) {
  const map: Record<string, string> = {
    blue: 'from-blue-500 to-indigo-600',
    emerald: 'from-emerald-500 to-green-600',
    amber: 'from-amber-500 to-orange-600',
    red: 'from-red-500 to-rose-600',
    purple: 'from-purple-500 to-fuchsia-600',
  }
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-sm relative overflow-hidden">
      <div className={`absolute top-0 right-0 w-14 h-14 rounded-full bg-gradient-to-br ${map[tint]} opacity-10 -translate-y-4 translate-x-4`} />
      <div className="flex items-start justify-between gap-2 relative">
        <div className="min-w-0">
          <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest truncate">{label}</div>
          <div className="text-base md:text-lg font-extrabold text-gray-900 dark:text-gray-100 mt-0.5 tabular-nums truncate">
            {value}
          </div>
          {sub && <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5">{sub}</div>}
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  )
}
