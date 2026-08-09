'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { removeDiacritics } from '@/lib/utils/slugify'
import { formatVnd } from '@/lib/utils/format'
import { StockTransactionModal } from './StockTransactionModal'

type Medicine = {
  id: string
  code: string
  name_vi: string
  unit: string
  current_stock: number
  min_stock_alert: number
  expiry_date: string | null
  cost_per_unit: number | null
}

type StockState = '' | 'ok' | 'low' | 'out'
type ExpiryState = '' | 'fresh' | 'soon' | 'expired'
type SortKey = 'name' | 'code' | 'stock_asc' | 'stock_desc' | 'expiry_asc' | 'value_desc'
type ViewMode = 'grid' | 'list'

export function MedicinesManager({ items }: { items: Medicine[] }) {
  const router = useRouter()
  const [addOpen, setAddOpen] = useState(false)
  const [txId, setTxId] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [stock, setStock] = useState<StockState>('')
  const [expiry, setExpiry] = useState<ExpiryState>('')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [view, setView] = useState<ViewMode>('grid')
  const [editing, setEditing] = useState<Medicine | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function startEdit(m: Medicine) {
    setAddOpen(false)
    setEditing(m)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  async function handleDelete(m: Medicine) {
    if (!window.confirm(`Xóa thuốc "${m.name_vi}"?\n\nLịch sử nhập/xuất vẫn được giữ, nhưng thuốc này sẽ ẩn khỏi danh sách kho.`)) return
    setDeletingId(m.id)
    const res = await fetch(`/api/medicines/${m.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string }
      window.alert('Lỗi xóa: ' + (j.error ?? `HTTP ${res.status}`))
      setDeletingId(null)
      return
    }
    setDeletingId(null)
    router.refresh()
  }

  const today = new Date()
  const soon = new Date(today.getTime() + 30 * 86400000)

  const qNorm = removeDiacritics(q.trim())

  // Compute helpers
  function expiryStatus(m: Medicine): 'fresh' | 'soon' | 'expired' | 'unknown' {
    if (!m.expiry_date) return 'unknown'
    const exp = new Date(m.expiry_date)
    if (exp < today) return 'expired'
    if (exp <= soon) return 'soon'
    return 'fresh'
  }
  function stockStatus(m: Medicine): 'out' | 'low' | 'ok' {
    if (m.current_stock <= 0) return 'out'
    if (m.current_stock <= m.min_stock_alert) return 'low'
    return 'ok'
  }
  function daysToExpiry(m: Medicine): number | null {
    if (!m.expiry_date) return null
    return Math.ceil((new Date(m.expiry_date).getTime() - today.getTime()) / 86400000)
  }
  function stockPct(m: Medicine): number {
    if (m.min_stock_alert <= 0) return m.current_stock > 0 ? 100 : 0
    // Treat min_stock_alert × 5 as "comfortable" target
    const target = m.min_stock_alert * 5
    return Math.min(100, Math.round((m.current_stock / target) * 100))
  }

  const filtered = useMemo(() => {
    const out = items.filter((m) => {
      if (qNorm) {
        const hay = removeDiacritics(`${m.code} ${m.name_vi} ${m.unit}`)
        if (!hay.includes(qNorm)) return false
      }
      if (stock) {
        if (stock === 'ok' && stockStatus(m) !== 'ok') return false
        if (stock === 'low' && stockStatus(m) !== 'low') return false
        if (stock === 'out' && stockStatus(m) !== 'out') return false
      }
      if (expiry) {
        const s = expiryStatus(m)
        if (expiry === 'fresh' && s !== 'fresh') return false
        if (expiry === 'soon' && s !== 'soon') return false
        if (expiry === 'expired' && s !== 'expired') return false
      }
      return true
    })

    const sorted = [...out]
    if (sortKey === 'name') sorted.sort((a, b) => a.name_vi.localeCompare(b.name_vi, 'vi'))
    else if (sortKey === 'code') sorted.sort((a, b) => a.code.localeCompare(b.code))
    else if (sortKey === 'stock_asc')
      sorted.sort((a, b) => (a.current_stock / Math.max(a.min_stock_alert, 1)) - (b.current_stock / Math.max(b.min_stock_alert, 1)))
    else if (sortKey === 'stock_desc')
      sorted.sort((a, b) => b.current_stock - a.current_stock)
    else if (sortKey === 'expiry_asc')
      sorted.sort((a, b) => {
        const da = daysToExpiry(a) ?? 99999
        const db = daysToExpiry(b) ?? 99999
        return da - db
      })
    else if (sortKey === 'value_desc')
      sorted.sort(
        (a, b) => b.current_stock * (b.cost_per_unit ?? 0) - a.current_stock * (a.cost_per_unit ?? 0)
      )
    return sorted
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, qNorm, stock, expiry, sortKey])

  // KPIs (live)
  const total = items.length
  const lowStock = items.filter((m) => stockStatus(m) === 'low').length
  const outOfStock = items.filter((m) => stockStatus(m) === 'out').length
  const expiringSoon = items.filter((m) => expiryStatus(m) === 'soon').length
  const expired = items.filter((m) => expiryStatus(m) === 'expired').length
  const totalValue = items.reduce((s, m) => s + m.current_stock * (m.cost_per_unit ?? 0), 0)

  const hasFilter = !!(q || stock || expiry)
  function clearFilters() {
    setQ('')
    setStock('')
    setExpiry('')
  }

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Kpi
          label="Tổng loại"
          value={total.toLocaleString('vi-VN')}
          sub={`${filtered.length} hiển thị`}
          tint="blue"
          icon="💊"
        />
        <Kpi
          label="Đã hết"
          value={outOfStock.toLocaleString('vi-VN')}
          sub={outOfStock > 0 ? '⚠ Cần nhập gấp' : 'Tốt'}
          tint="red"
          icon="🚨"
        />
        <Kpi
          label="Sắp hết"
          value={lowStock.toLocaleString('vi-VN')}
          sub="Dưới ngưỡng cảnh báo"
          tint="amber"
          icon="⚠"
        />
        <Kpi
          label="Hết hạn / sắp"
          value={(expired + expiringSoon).toLocaleString('vi-VN')}
          sub={expired > 0 ? `${expired} đã hết hạn` : `${expiringSoon} ≤ 30 ngày`}
          tint="purple"
          icon="📅"
        />
        <Kpi
          label="Giá trị tồn"
          value={formatVnd(totalValue)}
          sub="Tổng vốn đang nắm"
          tint="emerald"
          icon="💰"
        />
      </div>

      {/* Critical alerts */}
      {(outOfStock > 0 || expired > 0) && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-900 rounded-lg p-3 flex items-center gap-3 flex-wrap">
          <span className="text-2xl">🚨</span>
          <div className="flex-1 text-sm">
            <b className="text-red-700 dark:text-red-300">Cảnh báo khẩn:</b>{' '}
            {outOfStock > 0 && (
              <>
                <b>{outOfStock} loại</b> đã hết tồn{' '}
                <button onClick={() => setStock('out')} className="text-red-700 dark:text-red-300 underline font-semibold">
                  xem →
                </button>
              </>
            )}
            {outOfStock > 0 && expired > 0 && ' · '}
            {expired > 0 && (
              <>
                <b>{expired} loại</b> đã hết hạn{' '}
                <button onClick={() => setExpiry('expired')} className="text-red-700 dark:text-red-300 underline font-semibold">
                  xem →
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Action bar */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => { setEditing(null); setAddOpen((v) => !v) }}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-2 text-sm font-medium"
        >
          {addOpen ? '✕ Đóng form' : '+ Thêm thuốc'}
        </button>
        <Link
          href="/admin/kho-thuoc/bao-cao"
          className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg px-3 py-2 text-sm font-medium"
        >
          📊 Báo cáo nhập xuất tồn
        </Link>
      </div>

      {(addOpen || editing) && (
        <AddMedicineForm
          editing={editing}
          onDone={() => { setAddOpen(false); setEditing(null); router.refresh() }}
        />
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

        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-3">
          <div className="relative md:col-span-2">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">🔍</span>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm tên thuốc, mã, đơn vị..."
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg pl-9 pr-3 py-2 text-sm outline-none"
            />
          </div>
          <select
            value={stock}
            onChange={(e) => setStock(e.target.value as StockState)}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">📦 Mọi trạng thái tồn</option>
            <option value="ok">✓ Đủ tồn</option>
            <option value="low">⚠ Sắp hết</option>
            <option value="out">🚨 Đã hết</option>
          </select>
          <select
            value={expiry}
            onChange={(e) => setExpiry(e.target.value as ExpiryState)}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">📅 Mọi hạn SD</option>
            <option value="fresh">Còn hạn {'>'} 30 ngày</option>
            <option value="soon">⏰ Sắp hết hạn ({'≤'} 30 ngày)</option>
            <option value="expired">🚨 Đã hết hạn</option>
          </select>
        </div>

        {/* Sort + view */}
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sắp xếp:</span>
          {(
            [
              ['name', '🔤 Tên A→Z'],
              ['stock_asc', '⚠ Sắp hết trước'],
              ['expiry_asc', '⏰ Hết hạn sớm'],
              ['value_desc', '💰 Giá trị cao'],
              ['stock_desc', '📦 Tồn nhiều nhất'],
              ['code', '🔢 Mã'],
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
          <div className="text-5xl mb-2">💊</div>
          <p className="text-gray-600 dark:text-gray-400 text-lg font-semibold">
            {items.length === 0 ? 'Chưa có thuốc nào' : 'Không có thuốc nào khớp tiêu chí'}
          </p>
          {hasFilter && items.length > 0 && (
            <button onClick={clearFilters} className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline font-semibold">
              Bỏ tất cả bộ lọc
            </button>
          )}
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((m) => (
            <MedicineCard
              key={m.id}
              m={m}
              stockStatus={stockStatus(m)}
              expiryStatus={expiryStatus(m)}
              daysToExpiry={daysToExpiry(m)}
              stockPct={stockPct(m)}
              onTx={() => setTxId(m.id)}
              onEdit={() => startEdit(m)}
              onDelete={() => handleDelete(m)}
              deleting={deletingId === m.id}
            />
          ))}
        </div>
      ) : (
        <ListView
          items={filtered}
          onTx={(id) => setTxId(id)}
          stockStatus={stockStatus}
          expiryStatus={expiryStatus}
          daysToExpiry={daysToExpiry}
          onEdit={startEdit}
          onDelete={handleDelete}
          deletingId={deletingId}
        />
      )}

      {txId && (() => {
        const med = items.find((m) => m.id === txId)
        if (!med) return null
        return (
          <StockTransactionModal
            kind="medicine"
            item={{
              id: med.id,
              code: med.code,
              name_vi: med.name_vi,
              unit: med.unit,
              current_stock: med.current_stock,
              cost_per_unit: med.cost_per_unit,
              min_stock_alert: med.min_stock_alert,
              expiry_date: med.expiry_date,
            }}
            onClose={() => setTxId(null)}
            onDone={() => { setTxId(null); router.refresh() }}
          />
        )
      })()}
    </div>
  )
}

/* ========= CARD ========= */
function MedicineCard({
  m,
  stockStatus,
  expiryStatus,
  daysToExpiry,
  stockPct,
  onTx,
  onEdit,
  onDelete,
  deleting,
}: {
  m: Medicine
  stockStatus: 'out' | 'low' | 'ok'
  expiryStatus: 'fresh' | 'soon' | 'expired' | 'unknown'
  daysToExpiry: number | null
  stockPct: number
  onTx: () => void
  onEdit: () => void
  onDelete: () => void
  deleting: boolean
}) {
  // Header gradient based on combined urgency
  let headerGrad = 'from-emerald-500 to-green-600'
  let urgentLabel = ''
  if (stockStatus === 'out') {
    headerGrad = 'from-red-600 to-rose-600'
    urgentLabel = '🚨 ĐÃ HẾT'
  } else if (expiryStatus === 'expired') {
    headerGrad = 'from-red-600 to-rose-600'
    urgentLabel = '🚨 HẾT HẠN'
  } else if (stockStatus === 'low' || expiryStatus === 'soon') {
    headerGrad = 'from-amber-500 to-orange-600'
    urgentLabel = stockStatus === 'low' ? '⚠ SẮP HẾT' : '⏰ SẮP HẾT HẠN'
  }

  const stockBarColor =
    stockStatus === 'out'
      ? 'bg-red-500'
      : stockStatus === 'low'
        ? 'bg-amber-500'
        : 'bg-gradient-to-r from-emerald-500 to-green-500'

  const value = m.current_stock * (m.cost_per_unit ?? 0)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all">
      {/* Status header bar */}
      <div className={`h-2 bg-gradient-to-r ${headerGrad}`} />

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0 flex-1">
            <div className="font-extrabold text-base truncate">{m.name_vi}</div>
            <div className="text-[11px] font-mono text-gray-400 dark:text-gray-500">{m.code}</div>
          </div>
          {urgentLabel && (
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wider whitespace-nowrap ${
                stockStatus === 'out' || expiryStatus === 'expired'
                  ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                  : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
              }`}
            >
              {urgentLabel}
            </span>
          )}
        </div>

        {/* Big stock number */}
        <div className="flex items-baseline gap-2 mb-1">
          <span
            className={`text-3xl font-extrabold tabular-nums ${
              stockStatus === 'out'
                ? 'text-red-600 dark:text-red-400'
                : stockStatus === 'low'
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-emerald-700 dark:text-emerald-400'
            }`}
          >
            {m.current_stock}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">{m.unit}</span>
          <span className="text-[10px] text-gray-400 ml-auto">
            ngưỡng <b>{m.min_stock_alert}</b>
          </span>
        </div>

        {/* Stock bar */}
        <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
          <div className={`h-full ${stockBarColor}`} style={{ width: `${Math.min(100, stockPct)}%` }} />
        </div>

        {/* Bottom info grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-2">
            <div className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Hạn SD</div>
            {m.expiry_date ? (
              <div
                className={`font-semibold mt-0.5 ${
                  expiryStatus === 'expired'
                    ? 'text-red-700 dark:text-red-400'
                    : expiryStatus === 'soon'
                      ? 'text-amber-700 dark:text-amber-400'
                      : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                {m.expiry_date}
                {daysToExpiry != null && (
                  <div className="text-[10px] font-normal opacity-80">
                    {daysToExpiry < 0 ? `Trễ ${-daysToExpiry}d` : daysToExpiry === 0 ? 'Hôm nay' : `Còn ${daysToExpiry}d`}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-400 italic mt-0.5">Không có</div>
            )}
          </div>
          <div className="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-2">
            <div className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Giá trị tồn</div>
            <div className="font-semibold mt-0.5 text-gray-700 dark:text-gray-300">
              {value > 0 ? formatVnd(value) : <span className="text-gray-400 italic">—</span>}
            </div>
            {m.cost_per_unit && (
              <div className="text-[10px] text-gray-400">{formatVnd(m.cost_per_unit)}/{m.unit}</div>
            )}
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={onTx}
          className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 text-sm font-bold shadow-sm transition"
        >
          📦 Nhập / Xuất kho
        </button>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <button
            onClick={onEdit}
            className="rounded-lg py-1.5 text-xs font-semibold border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            ✏️ Sửa
          </button>
          <button
            onClick={onDelete}
            disabled={deleting}
            className="rounded-lg py-1.5 text-xs font-semibold border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-50 transition"
          >
            {deleting ? '⏳ Đang xóa…' : '🗑️ Xóa'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ========= LIST VIEW ========= */
function ListView({
  items,
  onTx,
  stockStatus,
  expiryStatus,
  daysToExpiry,
  onEdit,
  onDelete,
  deletingId,
}: {
  items: Medicine[]
  onTx: (id: string) => void
  stockStatus: (m: Medicine) => 'out' | 'low' | 'ok'
  expiryStatus: (m: Medicine) => 'fresh' | 'soon' | 'expired' | 'unknown'
  daysToExpiry: (m: Medicine) => number | null
  onEdit: (m: Medicine) => void
  onDelete: (m: Medicine) => void
  deletingId: string | null
}) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-x-auto shadow-sm">
      <table className="w-full text-sm min-w-[900px]">
        <thead className="bg-gray-50 dark:bg-gray-900/60 text-[11px] uppercase text-gray-500 dark:text-gray-400">
          <tr>
            <th className="px-3 py-2.5 text-left">Mã</th>
            <th className="px-3 py-2.5 text-left">Tên thuốc</th>
            <th className="px-3 py-2.5 text-right">Tồn</th>
            <th className="px-3 py-2.5 text-right">Ngưỡng</th>
            <th className="px-3 py-2.5 text-center">Tình trạng</th>
            <th className="px-3 py-2.5 text-left">Hạn SD</th>
            <th className="px-3 py-2.5 text-right">Giá / Giá trị</th>
            <th className="px-3 py-2.5"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {items.map((m) => {
            const ss = stockStatus(m)
            const es = expiryStatus(m)
            const days = daysToExpiry(m)
            const value = m.current_stock * (m.cost_per_unit ?? 0)
            const isUrgent = ss === 'out' || es === 'expired'
            return (
              <tr
                key={m.id}
                className={`hover:bg-gray-50/60 dark:hover:bg-gray-900/30 transition ${
                  isUrgent ? 'bg-red-50/40 dark:bg-red-950/20' : ''
                }`}
              >
                <td className="px-3 py-2 font-mono text-xs">{m.code}</td>
                <td className="px-3 py-2 font-semibold">{m.name_vi}</td>
                <td
                  className={`px-3 py-2 text-right font-extrabold tabular-nums ${
                    ss === 'out'
                      ? 'text-red-600 dark:text-red-400'
                      : ss === 'low'
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-700 dark:text-emerald-400'
                  }`}
                >
                  {m.current_stock} <span className="text-xs font-normal text-gray-500">{m.unit}</span>
                </td>
                <td className="px-3 py-2 text-right text-gray-500 dark:text-gray-400 tabular-nums">
                  {m.min_stock_alert}
                </td>
                <td className="px-3 py-2 text-center">
                  {ss === 'out' ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 font-bold">
                      🚨 Đã hết
                    </span>
                  ) : ss === 'low' ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-bold">
                      ⚠ Sắp hết
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-bold">
                      ✓ Đủ
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs whitespace-nowrap">
                  {m.expiry_date ? (
                    <div>
                      <div
                        className={
                          es === 'expired'
                            ? 'text-red-700 dark:text-red-400 font-bold'
                            : es === 'soon'
                              ? 'text-amber-700 dark:text-amber-400 font-bold'
                              : 'text-gray-700 dark:text-gray-300'
                        }
                      >
                        {m.expiry_date}
                      </div>
                      {days != null && (
                        <div className="text-[10px] text-gray-500 dark:text-gray-400">
                          {days < 0 ? `Trễ ${-days}d` : days === 0 ? 'Hôm nay' : `Còn ${days}d`}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400 italic">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right text-xs">
                  {m.cost_per_unit ? (
                    <>
                      <div className="font-semibold tabular-nums">{formatVnd(value)}</div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400">
                        {formatVnd(m.cost_per_unit)}/{m.unit}
                      </div>
                    </>
                  ) : (
                    <span className="text-gray-400 italic">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => onTx(m.id)}
                      className="text-xs px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold whitespace-nowrap"
                    >
                      📦 Nhập/Xuất
                    </button>
                    <button
                      onClick={() => onEdit(m)}
                      title="Sửa"
                      className="text-xs px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-semibold"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => onDelete(m)}
                      disabled={deletingId === m.id}
                      title="Xóa"
                      className="text-xs px-2 py-1 rounded-lg border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-50 font-semibold"
                    >
                      {deletingId === m.id ? '⏳' : '🗑️'}
                    </button>
                  </div>
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
  tint: 'blue' | 'red' | 'amber' | 'purple' | 'emerald'
  icon: string
}) {
  const map: Record<string, string> = {
    blue: 'from-blue-500 to-indigo-600',
    red: 'from-red-500 to-rose-600',
    amber: 'from-amber-500 to-orange-600',
    purple: 'from-purple-500 to-fuchsia-600',
    emerald: 'from-emerald-500 to-green-600',
  }
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-sm relative overflow-hidden">
      <div className={`absolute top-0 right-0 w-14 h-14 rounded-full bg-gradient-to-br ${map[tint]} opacity-10 -translate-y-4 translate-x-4`} />
      <div className="flex items-start justify-between gap-2 relative">
        <div className="min-w-0">
          <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest truncate">
            {label}
          </div>
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

/* ========= ADD FORM ========= */
const UNIT_PRESETS = [
  { v: 'liều', emoji: '💉' },
  { v: 'ml', emoji: '🧪' },
  { v: 'viên', emoji: '💊' },
  { v: 'gói', emoji: '📦' },
  { v: 'chai', emoji: '🍶' },
  { v: 'gram', emoji: '⚖️' },
  { v: 'hộp', emoji: '🎁' },
]

function AddMedicineForm({ editing, onDone }: { editing?: Medicine | null; onDone: () => void }) {
  const isEdit = !!editing
  const [form, setForm] = useState({
    code: editing?.code ?? '',
    name_vi: editing?.name_vi ?? '',
    unit: editing?.unit ?? 'liều',
    current_stock: editing?.current_stock ?? 0,
    min_stock_alert: editing?.min_stock_alert ?? 0,
    expiry_date: editing?.expiry_date ?? '',
    cost_per_unit: editing?.cost_per_unit ?? 0,
  })
  const [codeTouched, setCodeTouched] = useState(!!editing)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  function onNameChange(v: string) {
    setForm((f) => {
      const next = { ...f, name_vi: v }
      if (!codeTouched) {
        next.code = v
          .normalize('NFD')
          .replace(/[̀-ͯ]/g, '')
          .replace(/đ/g, 'd')
          .replace(/Đ/g, 'D')
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, '_')
          .replace(/^_|_$/g, '')
          .slice(0, 16)
      }
      return next
    })
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.code.trim()) {
      setErr('Mã thuốc không được trống')
      return
    }
    if (!form.name_vi.trim()) {
      setErr('Tên thuốc không được trống')
      return
    }
    setLoading(true)
    setErr(null)
    const res = await fetch(isEdit ? `/api/medicines/${editing!.id}` : '/api/medicines', {
      method: isEdit ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: form.code,
        name_vi: form.name_vi,
        unit: form.unit,
        current_stock: form.current_stock,
        min_stock_alert: form.min_stock_alert,
        expiry_date: form.expiry_date || (isEdit ? null : undefined),
        cost_per_unit: form.cost_per_unit || (isEdit ? null : undefined),
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      setErr(typeof json.error === 'string' ? json.error : 'Lỗi')
      setLoading(false)
      return
    }
    onDone()
  }

  // Derived hints
  const totalValue = form.current_stock * (form.cost_per_unit || 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expDate = form.expiry_date ? new Date(form.expiry_date) : null
  const daysUntilExpiry = expDate
    ? Math.round((expDate.getTime() - today.getTime()) / 86400_000)
    : null
  const expiryWarn =
    daysUntilExpiry == null
      ? null
      : daysUntilExpiry < 0
        ? { tone: 'rose' as const, text: `❌ Đã hết hạn ${Math.abs(daysUntilExpiry)} ngày` }
        : daysUntilExpiry < 30
          ? { tone: 'rose' as const, text: `⚠️ Sắp hết · còn ${daysUntilExpiry} ngày` }
          : daysUntilExpiry < 90
            ? { tone: 'amber' as const, text: `🟡 Còn ${daysUntilExpiry} ngày` }
            : { tone: 'emerald' as const, text: `🟢 Còn ${daysUntilExpiry} ngày` }

  const stockState =
    form.current_stock > 0 && form.current_stock <= form.min_stock_alert
      ? 'low'
      : form.current_stock === 0
        ? 'empty'
        : 'ok'

  return (
    <form
      onSubmit={submit}
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"
    >
      <div className="h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />
      <div className="p-4 md:p-5 space-y-5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xl">💊</span>
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {isEdit ? 'Sửa thuốc' : 'Thêm thuốc mới'}
          </h3>
          <span className="text-[11px] text-gray-500 dark:text-gray-400 ml-1">
            Mã sẽ auto-generate từ tên · Đơn vị có preset · Tồn + giá hiển thị giá trị kho
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
          <div className="space-y-4">
            <section>
              <SectionTitle icon="📌" title="Định danh thuốc" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Field label="Tên thuốc" required hint="Hiển thị mọi nơi" className="md:col-span-2">
                  <input
                    required
                    placeholder="VD: Amoxicillin 250mg"
                    value={form.name_vi}
                    onChange={(e) => onNameChange(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="Mã thuốc" required hint="Auto-suggest từ tên">
                  <input
                    required
                    placeholder="vd: AMOX"
                    value={form.code}
                    onChange={(e) => {
                      setCodeTouched(true)
                      setForm({ ...form, code: e.target.value.toUpperCase() })
                    }}
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm font-mono font-bold tracking-wider"
                  />
                </Field>
                <div className="md:col-span-3">
                  <Field
                    label={`Đơn vị tính · "${form.unit}"`}
                    hint="Click preset hoặc gõ custom"
                  >
                    <div className="flex gap-1.5 flex-wrap">
                      {UNIT_PRESETS.map((u) => {
                        const active = form.unit === u.v
                        return (
                          <button
                            key={u.v}
                            type="button"
                            onClick={() => setForm({ ...form, unit: u.v })}
                            className={
                              'px-3 py-1.5 rounded-full text-xs font-medium border transition ' +
                              (active
                                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-transparent shadow'
                                : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-400')
                            }
                          >
                            {u.emoji} {u.v}
                          </button>
                        )
                      })}
                      <input
                        type="text"
                        value={form.unit}
                        onChange={(e) => setForm({ ...form, unit: e.target.value })}
                        placeholder="custom"
                        className="w-32 border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-full px-3 py-1.5 text-xs"
                      />
                    </div>
                  </Field>
                </div>
              </div>
            </section>

            <section>
              <SectionTitle icon="📦" title="Tồn kho & Giá" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Field
                  label={`${isEdit ? 'Tồn hiện tại' : 'Tồn ban đầu'} (${form.unit})`}
                  hint={
                    stockState === 'empty'
                      ? 'Có thể nhập 0 — bổ sung sau bằng giao dịch nhập'
                      : stockState === 'low'
                        ? '⚠️ Tồn ≤ ngưỡng cảnh báo'
                        : 'OK'
                  }
                >
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.current_stock}
                    onChange={(e) =>
                      setForm({ ...form, current_stock: parseFloat(e.target.value) || 0 })
                    }
                    className={
                      'w-full border rounded-lg px-3 py-2 text-sm tabular-nums dark:bg-gray-900 ' +
                      (stockState === 'low'
                        ? 'border-rose-300 dark:border-rose-800 ring-1 ring-rose-200 dark:ring-rose-900/40'
                        : 'border-gray-300 dark:border-gray-600')
                    }
                  />
                </Field>
                <Field label="Ngưỡng cảnh báo" hint="App alert khi tồn ≤ ngưỡng">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.min_stock_alert}
                    onChange={(e) =>
                      setForm({ ...form, min_stock_alert: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm tabular-nums"
                  />
                </Field>
                <Field label="Giá / đơn vị (VND)" hint="Tuỳ chọn — để tính giá trị kho">
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={form.cost_per_unit}
                    onChange={(e) =>
                      setForm({ ...form, cost_per_unit: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm tabular-nums"
                  />
                </Field>
              </div>
            </section>

            <section>
              <SectionTitle icon="📅" title="Hạn sử dụng (tuỳ chọn)" />
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
                <Field label="Ngày hết hạn" hint="Để trống nếu không cần theo dõi">
                  <input
                    type="date"
                    value={form.expiry_date}
                    onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
                  />
                </Field>
                {expiryWarn && (
                  <div
                    className={
                      'self-end rounded-lg px-3 py-2 text-xs font-medium border ' +
                      (expiryWarn.tone === 'rose'
                        ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900'
                        : expiryWarn.tone === 'amber'
                          ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900'
                          : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900')
                    }
                  >
                    {expiryWarn.text}
                  </div>
                )}
              </div>
            </section>
          </div>

          <aside className="bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50 dark:from-blue-950/30 dark:via-indigo-950/30 dark:to-violet-950/30 border border-blue-200 dark:border-blue-900 rounded-xl p-4 self-start">
            <div className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              👁 Xem trước
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <span className="font-mono text-sm font-bold text-gray-900 dark:text-gray-100">
                  {form.code || '— Mã —'}
                </span>
                <span className="text-[11px] text-gray-500 dark:text-gray-400">{form.unit}</span>
              </div>
              <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2 break-words">
                {form.name_vi || '— Tên thuốc —'}
              </div>
              <div className="space-y-1 text-[11px] text-gray-600 dark:text-gray-400">
                <Kv k="Tồn" v={`${form.current_stock} ${form.unit}`} />
                <Kv k="Cảnh báo" v={`≤ ${form.min_stock_alert}`} />
                {form.cost_per_unit > 0 && (
                  <Kv
                    k="Giá / đv"
                    v={`${form.cost_per_unit.toLocaleString('vi-VN')} đ`}
                  />
                )}
                {totalValue > 0 && (
                  <Kv
                    k="Giá trị kho"
                    v={
                      <strong className="text-blue-700 dark:text-blue-300 tabular-nums">
                        {totalValue.toLocaleString('vi-VN')} đ
                      </strong>
                    }
                  />
                )}
                {expDate && (
                  <Kv k="Hạn SD" v={expDate.toLocaleDateString('vi-VN')} />
                )}
              </div>
              {stockState === 'low' && (
                <div className="mt-2 text-[10.5px] bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded px-1.5 py-0.5 text-center font-semibold">
                  ⚠️ Sẽ alert ngay khi tạo
                </div>
              )}
            </div>
            <p className="text-[10.5px] text-gray-500 dark:text-gray-400 mt-3 leading-relaxed">
              💡 Có thể bổ sung tồn sau bằng giao dịch <strong>📥 Nhập</strong> trong danh sách
              thuốc.
            </p>
          </aside>
        </div>

        {err && (
          <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 rounded-lg px-3 py-2 text-sm">
            ✗ {err}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 dark:border-gray-700 pt-4">
          <button
            type="button"
            onClick={onDone}
            className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg px-4 py-2 text-sm"
          >
            Huỷ
          </button>
          <button
            type="submit"
            disabled={loading || !form.code || !form.name_vi}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-5 py-2 text-sm font-semibold shadow hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? '⏳ Đang lưu…' : isEdit ? '💾 Cập nhật' : '💾 Lưu thuốc'}
          </button>
        </div>
      </div>
    </form>
  )
}

function SectionTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <h4 className="text-[11px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
      <span>{icon}</span>
      <span>{title}</span>
    </h4>
  )
}

function Field({
  label,
  required,
  hint,
  children,
  className,
}: {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && (
        <p className="text-[10.5px] text-gray-500 dark:text-gray-400 mt-0.5">{hint}</p>
      )}
    </div>
  )
}

function Kv({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span>{k}</span>
      <span className="text-gray-700 dark:text-gray-300">{v}</span>
    </div>
  )
}

// TransactionModal cũ đã được thay thế bằng StockTransactionModal (shared với FeedsManager)

