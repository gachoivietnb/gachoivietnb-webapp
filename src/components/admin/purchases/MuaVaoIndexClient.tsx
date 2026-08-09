'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { formatDate, formatVnd } from '@/lib/utils/format'
import { removeDiacritics } from '@/lib/utils/slugify'
import { getBreedColor } from '@/lib/utils/breed-colors'

export type PurchaseRow = {
  id: string
  purchase_code: string
  purchase_date: string
  total_quantity: number
  total_amount: number
  avg_price: number
  notes: string | null
  supplier_id: string | null
  supplier_name: string | null
  supplier_phone: string | null
  breed_codes: string[]
  breed_names: string[]
  item_count: number
  chicken_codes: string[]
  chicken_names: string[]
  kind: string
  paid_amount: number
  payment_status: string
  amount_due: number
}

type Supplier = { id: string; name: string }
type Breed = { code: string; name: string }
type SortKey = 'date_desc' | 'date_asc' | 'amount_desc' | 'qty_desc' | 'avg_desc' | 'avg_asc'
type ViewMode = 'grid' | 'list'
type DateRange = '' | '7d' | '30d' | '90d' | 'this_month' | 'last_month' | 'this_year'

const todayIso = new Date().toISOString().slice(0, 10)

const KIND_META: Record<string, { label: string; emoji: string; badge: string; noun: string }> = {
  ga: { label: 'Gà', emoji: '🐓', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', noun: 'con' },
  thuc_an: { label: 'Cám', emoji: '🌾', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', noun: 'mục' },
  thuoc: { label: 'Thuốc', emoji: '💊', badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300', noun: 'mục' },
  vat_tu: { label: 'Vật tư', emoji: '📦', badge: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300', noun: 'mục' },
  khac: { label: 'Khác', emoji: '📦', badge: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300', noun: 'mục' },
}
function kindMeta(k: string) {
  return KIND_META[k] ?? KIND_META.ga
}
const KIND_TABS: Array<[string, string]> = [
  ['', 'Tất cả'],
  ['ga', '🐓 Gà'],
  ['thuc_an', '🌾 Cám'],
  ['thuoc', '💊 Thuốc'],
  ['vat_tu', '📦 Vật tư'],
]

export function MuaVaoIndexClient({
  purchases,
  suppliers,
  breeds,
}: {
  purchases: PurchaseRow[]
  suppliers: Supplier[]
  breeds: Breed[]
}) {
  const [q, setQ] = useState('')
  const [kind, setKind] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [breedCode, setBreedCode] = useState('')
  const [range, setRange] = useState<DateRange>('')
  const [amountBand, setAmountBand] = useState<'' | 'small' | 'medium' | 'large'>('')
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
    const out = purchases.filter((p) => {
      if (kind && (p.kind ?? 'ga') !== kind) return false
      if (qNorm) {
        const hay = removeDiacritics(
          `${p.purchase_code} ${p.supplier_name ?? ''} ${p.notes ?? ''} ${p.chicken_codes.join(' ')} ${p.chicken_names.join(' ')} ${p.breed_names.join(' ')}`
        )
        if (!hay.includes(qNorm)) return false
      }
      if (supplierId && p.supplier_id !== supplierId) return false
      if (breedCode && !p.breed_codes.includes(breedCode)) return false
      if (rStart && p.purchase_date < rStart) return false
      if (rEnd && p.purchase_date > rEnd) return false
      if (amountBand) {
        if (amountBand === 'small' && p.total_amount >= 10_000_000) return false
        if (amountBand === 'medium' && (p.total_amount < 10_000_000 || p.total_amount >= 50_000_000)) return false
        if (amountBand === 'large' && p.total_amount < 50_000_000) return false
      }
      return true
    })
    const sorted = [...out]
    if (sortKey === 'date_desc') sorted.sort((a, b) => b.purchase_date.localeCompare(a.purchase_date))
    else if (sortKey === 'date_asc') sorted.sort((a, b) => a.purchase_date.localeCompare(b.purchase_date))
    else if (sortKey === 'amount_desc') sorted.sort((a, b) => b.total_amount - a.total_amount)
    else if (sortKey === 'qty_desc') sorted.sort((a, b) => b.total_quantity - a.total_quantity)
    else if (sortKey === 'avg_desc') sorted.sort((a, b) => b.avg_price - a.avg_price)
    else if (sortKey === 'avg_asc') sorted.sort((a, b) => a.avg_price - b.avg_price)
    return sorted
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchases, qNorm, kind, supplierId, breedCode, range, amountBand, sortKey])

  // KPI
  const totalPurchases = purchases.length
  const totalSpent = purchases.reduce((s, p) => s + p.total_amount, 0)
  const gaPurchases = purchases.filter((p) => (p.kind ?? 'ga') === 'ga')
  const totalGaQty = gaPurchases.reduce((s, p) => s + p.total_quantity, 0)
  const gaSpent = gaPurchases.reduce((s, p) => s + p.total_amount, 0)
  const avgPriceOverall = totalGaQty > 0 ? gaSpent / totalGaQty : 0
  const totalDue = purchases.reduce((s, p) => s + (p.amount_due ?? 0), 0)

  const dt30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const recent30 = purchases.filter((p) => p.purchase_date >= dt30)
  const spent30 = recent30.reduce((s, p) => s + p.total_amount, 0)
  const qty30 = recent30.filter((p) => (p.kind ?? 'ga') === 'ga').reduce((s, p) => s + p.total_quantity, 0)

  // Chi mua theo loại (báo cáo nhanh)
  const byKind = new Map<string, { amount: number; count: number; due: number }>()
  for (const p of purchases) {
    const k = p.kind ?? 'ga'
    const c = byKind.get(k) ?? { amount: 0, count: 0, due: 0 }
    c.amount += p.total_amount
    c.count += 1
    c.due += p.amount_due ?? 0
    byKind.set(k, c)
  }
  const kindBreakdown = [...byKind.entries()].sort((a, b) => b[1].amount - a[1].amount)

  // Top supplier (by amount)
  const supplierAgg = new Map<string, { name: string; amount: number; count: number }>()
  for (const p of purchases) {
    if (!p.supplier_id || !p.supplier_name) continue
    const cur = supplierAgg.get(p.supplier_id) ?? { name: p.supplier_name, amount: 0, count: 0 }
    cur.amount += p.total_amount
    cur.count += 1
    supplierAgg.set(p.supplier_id, cur)
  }
  const topSupplier = [...supplierAgg.values()].sort((a, b) => b.amount - a.amount)[0]

  const hasFilter = !!(q || kind || supplierId || breedCode || range || amountBand)
  function clearFilters() {
    setQ('')
    setKind('')
    setSupplierId('')
    setBreedCode('')
    setRange('')
    setAmountBand('')
  }

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Kpi
          label="Tổng phiếu"
          value={totalPurchases.toLocaleString('vi-VN')}
          sub={`${filtered.length} hiển thị`}
          tint="blue"
          icon="📥"
        />
        <Kpi
          label="Tổng gà nhập"
          value={totalGaQty.toLocaleString('vi-VN')}
          sub={`30 ngày: ${qty30}`}
          tint="emerald"
          icon="🐓"
        />
        <Kpi
          label="Tổng chi mua"
          value={formatVnd(totalSpent)}
          sub={`30 ngày: ${formatVnd(spent30)}`}
          tint="red"
          icon="💸"
        />
        <Kpi
          label="Còn nợ NCC"
          value={formatVnd(totalDue)}
          sub={totalDue > 0 ? 'Chưa tất toán' : 'Đã trả hết'}
          tint="rose"
          icon="💳"
        />
        <Kpi
          label="Giá TB / con (gà)"
          value={formatVnd(avgPriceOverall)}
          sub="Trung bình gà nhập"
          tint="amber"
          icon="⚖️"
        />
        <Kpi
          label="NCC chính"
          value={topSupplier ? topSupplier.name : '—'}
          sub={topSupplier ? `${topSupplier.count} phiếu · ${formatVnd(topSupplier.amount)}` : '—'}
          tint="purple"
          icon="🏪"
        />
      </div>

      {/* Chi mua theo loại */}
      {kindBreakdown.length > 1 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-sm">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">📊 Chi mua theo loại:</span>
            {kindBreakdown.map(([k, v]) => {
              const m = kindMeta(k)
              return (
                <button
                  key={k}
                  onClick={() => setKind(kind === k ? '' : k)}
                  className={`text-xs rounded-full px-2.5 py-1 font-semibold border transition ${
                    kind === k ? 'ring-2 ring-blue-400 ' : ''
                  }${m.badge} border-transparent hover:opacity-80`}
                  title={`${v.count} phiếu`}
                >
                  {m.emoji} {m.label}: {formatVnd(v.amount)}
                  {v.due > 0 && <span className="ml-1 text-red-600 dark:text-red-300">· nợ {formatVnd(v.due)}</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}

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
              placeholder="Mã phiếu, NCC, mã/tên gà, ghi chú..."
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg pl-9 pr-3 py-2 text-sm outline-none"
            />
          </div>
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">🏪 Tất cả NCC</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
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
            value={amountBand}
            onChange={(e) => setAmountBand(e.target.value as '' | 'small' | 'medium' | 'large')}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">💰 Mức tiền</option>
            <option value="small">{'<'} 10 triệu</option>
            <option value="medium">10 – 50 triệu</option>
            <option value="large">≥ 50 triệu</option>
          </select>
        </div>

        {/* Loại phiếu */}
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">🏷 Loại:</span>
          {KIND_TABS.map(([k, l]) => (
            <button
              key={k || 'all'}
              onClick={() => setKind(k)}
              className={`text-xs px-2.5 py-1 rounded-full font-semibold transition ${
                kind === k
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Date range presets */}
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

        {/* Sort + view */}
        <div className="mt-3 flex items-center gap-2 flex-wrap pt-3 border-t border-gray-100 dark:border-gray-700">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sắp xếp:</span>
          {(
            [
              ['date_desc', '🆕 Mới nhất'],
              ['amount_desc', '💰 Tiền cao'],
              ['qty_desc', '🐓 SL nhiều'],
              ['avg_desc', '📈 TB cao'],
              ['avg_asc', '📉 TB thấp'],
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
              ☰ Bảng
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 md:p-12 text-center">
          <div className="text-5xl mb-2">📥</div>
          <p className="text-gray-600 dark:text-gray-400 text-lg font-semibold">
            {purchases.length === 0 ? 'Chưa có phiếu nhập nào' : 'Không có phiếu nào khớp tiêu chí'}
          </p>
          {hasFilter && purchases.length > 0 && (
            <button onClick={clearFilters} className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline font-semibold">
              Bỏ tất cả bộ lọc
            </button>
          )}
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((p) => (
            <PurchaseCard key={p.id} p={p} />
          ))}
        </div>
      ) : (
        <ListView items={filtered} />
      )}
    </div>
  )
}

function PurchaseCard({ p }: { p: PurchaseRow }) {
  const breeds = p.breed_codes.map((c, i) => ({ code: c, name: p.breed_names[i] ?? c }))
  // Use first breed color for accent
  const accentColor = getBreedColor(breeds[0]?.code ?? null)
  const daysSince = Math.floor((Date.now() - new Date(p.purchase_date).getTime()) / 86400000)
  const m = kindMeta(p.kind)

  return (
    <Link
      href={`/admin/mua-vao/${p.id}`}
      className="group block bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all"
    >
      {/* Header gradient by first breed */}
      <div className={`relative h-2 ${accentColor.bg}`} />

      <div className="p-4">
        {/* Badges: loại + công nợ */}
        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${m.badge}`}>
            {m.emoji} {m.label}
          </span>
          {p.amount_due > 0 ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
              Nợ {formatVnd(p.amount_due)}
            </span>
          ) : (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              ✓ Đã trả
            </span>
          )}
        </div>

        {/* Top: code + date */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0 flex-1">
            <div className="font-mono font-bold text-base truncate">{p.purchase_code}</div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
              📅 {formatDate(p.purchase_date)}
              {daysSince === 0 ? ' · Hôm nay' : daysSince === 1 ? ' · Hôm qua' : ` · ${daysSince} ngày trước`}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xl font-extrabold text-red-600 dark:text-red-400 tabular-nums leading-none">
              {formatVnd(p.total_amount)}
            </div>
            {p.kind === 'ga' && (
              <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                ≈ {formatVnd(p.avg_price)}/con
              </div>
            )}
          </div>
        </div>

        {/* Supplier */}
        <div className="flex items-center gap-2 mb-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg p-2 border border-blue-100 dark:border-blue-900/40">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
            {p.supplier_name?.[0] ?? '?'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-sm truncate">{p.supplier_name ?? '— Không có NCC —'}</div>
            {p.supplier_phone && (
              <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">📞 {p.supplier_phone}</div>
            )}
          </div>
        </div>

        {/* Stats: qty + breeds */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-2 text-center">
            <div className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Số lượng</div>
            <div className="text-lg font-extrabold tabular-nums text-emerald-700 dark:text-emerald-400 leading-tight">
              {p.total_quantity}
              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-normal ml-1">{m.noun}</span>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-2 text-center">
            {p.kind === 'ga' ? (
              <>
                <div className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Số giống</div>
                <div className="text-lg font-extrabold tabular-nums text-blue-700 dark:text-blue-400 leading-tight">
                  {breeds.length}
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 font-normal ml-1">loại</span>
                </div>
              </>
            ) : (
              <>
                <div className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Đã trả</div>
                <div className="text-sm font-extrabold tabular-nums text-emerald-700 dark:text-emerald-400 leading-tight mt-1.5">
                  {formatVnd(p.paid_amount)}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Breed badges */}
        {breeds.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {breeds.slice(0, 4).map((b) => {
              const color = getBreedColor(b.code)
              return (
                <span
                  key={b.code}
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${color.badge}`}
                >
                  {b.name}
                </span>
              )
            })}
            {breeds.length > 4 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 font-semibold">
                +{breeds.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Notes */}
        {p.notes && (
          <div className="text-[11px] text-gray-600 dark:text-gray-400 italic line-clamp-2 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            💬 {p.notes}
          </div>
        )}
      </div>
    </Link>
  )
}

function ListView({ items }: { items: PurchaseRow[] }) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-x-auto shadow-sm">
      <table className="w-full text-sm min-w-[900px]">
        <thead className="bg-gray-50 dark:bg-gray-900/60 text-[11px] uppercase text-gray-500 dark:text-gray-400">
          <tr>
            <th className="px-3 py-2.5 text-left">Mã phiếu</th>
            <th className="px-3 py-2.5 text-left">Ngày</th>
            <th className="px-3 py-2.5 text-left">Loại</th>
            <th className="px-3 py-2.5 text-left">NCC</th>
            <th className="px-3 py-2.5 text-left">Giống</th>
            <th className="px-3 py-2.5 text-right">SL</th>
            <th className="px-3 py-2.5 text-right">Tổng tiền</th>
            <th className="px-3 py-2.5 text-right">TB/con</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {items.map((p) => (
            <tr key={p.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-900/30 transition">
              <td className="px-3 py-2 font-mono">
                <Link href={`/admin/mua-vao/${p.id}`} className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                  {p.purchase_code}
                </Link>
              </td>
              <td className="px-3 py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">{formatDate(p.purchase_date)}</td>
              <td className="px-3 py-2 whitespace-nowrap">
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${kindMeta(p.kind).badge}`}>
                  {kindMeta(p.kind).emoji} {kindMeta(p.kind).label}
                </span>
              </td>
              <td className="px-3 py-2">
                <div className="font-medium truncate max-w-[200px]">{p.supplier_name ?? '—'}</div>
                {p.supplier_phone && <div className="text-[10px] text-gray-500 dark:text-gray-400">{p.supplier_phone}</div>}
              </td>
              <td className="px-3 py-2">
                <div className="flex flex-wrap gap-1">
                  {p.breed_codes.slice(0, 3).map((c, i) => {
                    const color = getBreedColor(c)
                    return (
                      <span key={c} className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${color.badge}`}>
                        {p.breed_names[i] ?? c}
                      </span>
                    )
                  })}
                  {p.breed_codes.length > 3 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                      +{p.breed_codes.length - 3}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-3 py-2 text-right font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                {p.total_quantity}
              </td>
              <td className="px-3 py-2 text-right font-bold tabular-nums text-red-600 dark:text-red-400">
                {formatVnd(p.total_amount)}
                {p.amount_due > 0 ? (
                  <div className="text-[10px] font-normal text-red-500">Nợ {formatVnd(p.amount_due)}</div>
                ) : (
                  <div className="text-[10px] font-normal text-emerald-600 dark:text-emerald-400">✓ đã trả</div>
                )}
              </td>
              <td className="px-3 py-2 text-right text-xs text-gray-600 dark:text-gray-400 tabular-nums">
                {p.kind === 'ga' ? formatVnd(p.avg_price) : '—'}
              </td>
            </tr>
          ))}
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
  tint: 'blue' | 'emerald' | 'red' | 'amber' | 'purple' | 'rose'
  icon: string
}) {
  const map: Record<string, string> = {
    blue: 'from-blue-500 to-indigo-600',
    emerald: 'from-emerald-500 to-green-600',
    red: 'from-red-500 to-rose-600',
    amber: 'from-amber-500 to-orange-600',
    purple: 'from-purple-500 to-fuchsia-600',
    rose: 'from-rose-500 to-pink-600',
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
