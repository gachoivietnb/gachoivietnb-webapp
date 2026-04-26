'use client'

import { useEffect, useMemo, useState } from 'react'
import { formatVnd } from '@/lib/utils/format'

type Supplier = { id: string; name: string }
type Breed = { code: string; name_vi: string }

type Preview = {
  total_purchases: number
  total_qty: number
  total_amount: number
  avg_price: number
  by_supplier: Array<{ name: string; purchases: number; qty: number; amount: number }>
  by_breed: Array<{ name: string; qty: number; amount: number }>
  by_month: Array<{ label: string; purchases: number; qty: number; amount: number }>
  sample_rows: Array<{
    id: string
    purchase_code: string
    purchase_date: string
    total_quantity: number
    total_amount: number
    supplier_name: string
  }>
}

const today = new Date().toISOString().slice(0, 10)
const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)

export function PurchaseReportClient({
  suppliers,
  breeds,
}: {
  suppliers: Supplier[]
  breeds: Breed[]
}) {
  const [from, setFrom] = useState(firstOfMonth)
  const [to, setTo] = useState(today)
  const [supplierId, setSupplierId] = useState('')
  const [breedCode, setBreedCode] = useState('')
  const [q, setQ] = useState('')
  const [preview, setPreview] = useState<Preview | null>(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const queryParams = useMemo(() => {
    const p = new URLSearchParams()
    p.set('from', from)
    p.set('to', to)
    if (supplierId) p.set('supplier_id', supplierId)
    if (breedCode) p.set('breed_code', breedCode)
    if (q.trim()) p.set('q', q.trim())
    return p
  }, [from, to, supplierId, breedCode, q])

  async function loadPreview() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/purchases/report/preview?${queryParams}`, { cache: 'no-store' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(typeof j.error === 'string' ? j.error : `HTTP ${res.status}`)
      }
      const data = (await res.json()) as Preview
      setPreview(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPreview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function download(format: 'excel' | 'pdf') {
    setExporting(format)
    try {
      const url = `/api/purchases/report/export?format=${format}&${queryParams}`
      // Use anchor download trick so filename from Content-Disposition is honored
      const res = await fetch(url)
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(typeof j.error === 'string' ? j.error : `HTTP ${res.status}`)
      }
      const blob = await res.blob()
      const href = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = href
      const ext = format === 'pdf' ? 'pdf' : 'xlsx'
      a.download = `bao-cao-mua-vao_${from}_${to}.${ext}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(href)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setExporting(null)
    }
  }

  const hasFilter = !!(supplierId || breedCode || q.trim())

  function clearFilters() {
    setSupplierId('')
    setBreedCode('')
    setQ('')
  }

  function presetRange(preset: 'this_month' | 'last_month' | 'this_year' | '30d' | '90d') {
    const now = new Date()
    if (preset === 'this_month') {
      setFrom(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10))
      setTo(today)
    } else if (preset === 'last_month') {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const last = new Date(now.getFullYear(), now.getMonth(), 0)
      setFrom(first.toISOString().slice(0, 10))
      setTo(last.toISOString().slice(0, 10))
    } else if (preset === 'this_year') {
      setFrom(new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10))
      setTo(today)
    } else if (preset === '30d') {
      setFrom(new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10))
      setTo(today)
    } else if (preset === '90d') {
      setFrom(new Date(now.getTime() - 90 * 86400000).toISOString().slice(0, 10))
      setTo(today)
    }
  }

  return (
    <div className="space-y-4">
      {/* FILTER CARD */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 md:p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">🔍 Bộ lọc</h2>
          {hasFilter && (
            <button
              onClick={clearFilters}
              className="text-xs text-red-600 dark:text-red-400 hover:underline font-semibold ml-auto"
            >
              ✕ Xóa lọc
            </button>
          )}
        </div>

        {/* Date range + presets */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3 mb-3">
          <label className="block">
            <span className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
              Từ ngày
            </span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
              Đến ngày
            </span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
            />
          </label>
          <div className="flex items-end gap-1.5 flex-wrap">
            {(
              [
                ['30d', '30 ngày'],
                ['this_month', 'Tháng này'],
                ['last_month', 'Tháng trước'],
                ['90d', '90 ngày'],
                ['this_year', 'Năm nay'],
              ] as const
            ).map(([k, l]) => (
              <button
                key={k}
                type="button"
                onClick={() => presetRange(k)}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 font-semibold transition"
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Other filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3">
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Tất cả nhà cung cấp</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            value={breedCode}
            onChange={(e) => setBreedCode(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Tất cả giống</option>
            {breeds.map((b) => (
              <option key={b.code} value={b.code}>
                {b.name_vi}
              </option>
            ))}
          </select>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              🔍
            </span>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm mã phiếu / mã gà / ghi chú..."
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg pl-9 pr-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Apply button */}
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={loadPreview}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-bold shadow-sm disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {loading ? '⏳ Đang tải...' : '🔎 Áp dụng bộ lọc'}
          </button>
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => download('excel')}
              disabled={!preview || loading || !!exporting}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg px-4 py-2 text-sm font-bold shadow-sm disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {exporting === 'excel' ? '⏳' : '📥'} Excel
            </button>
            <button
              onClick={() => download('pdf')}
              disabled={!preview || loading || !!exporting}
              className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-lg px-4 py-2 text-sm font-bold shadow-sm disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {exporting === 'pdf' ? '⏳' : '📄'} PDF
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-300 rounded-lg p-3 text-sm">
          ⚠ {error}
        </div>
      )}

      {/* KPI SUMMARY */}
      {preview && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi
              label="Số phiếu nhập"
              value={preview.total_purchases.toLocaleString('vi-VN')}
              tint="blue"
              icon="📋"
            />
            <Kpi
              label="Gà nhập (con)"
              value={preview.total_qty.toLocaleString('vi-VN')}
              tint="green"
              icon="🐓"
            />
            <Kpi label="Tổng chi mua" value={formatVnd(preview.total_amount)} tint="red" icon="💸" />
            <Kpi label="Giá TB / con" value={formatVnd(preview.avg_price)} tint="amber" icon="⚖️" />
          </div>

          {/* SAMPLE TABLE + AGGREGATES */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* By supplier */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2.5 font-bold text-sm">
                🏢 Theo nhà cung cấp ({preview.by_supplier.length})
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/60 text-[11px] uppercase text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-3 py-2 text-left">NCC</th>
                    <th className="px-3 py-2 text-right">Phiếu</th>
                    <th className="px-3 py-2 text-right">SL</th>
                    <th className="px-3 py-2 text-right">Tổng</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.by_supplier.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-gray-500 dark:text-gray-400">
                        Không có dữ liệu
                      </td>
                    </tr>
                  ) : (
                    preview.by_supplier.slice(0, 10).map((s, i) => (
                      <tr key={i} className="border-t border-gray-100 dark:border-gray-700">
                        <td className="px-3 py-2 truncate max-w-[180px]">{s.name}</td>
                        <td className="px-3 py-2 text-right">{s.purchases}</td>
                        <td className="px-3 py-2 text-right">{s.qty}</td>
                        <td className="px-3 py-2 text-right font-semibold text-red-600 dark:text-red-400">
                          {formatVnd(s.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* By breed */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-4 py-2.5 font-bold text-sm">
                🧬 Theo giống gà ({preview.by_breed.length})
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/60 text-[11px] uppercase text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-3 py-2 text-left">Giống</th>
                    <th className="px-3 py-2 text-right">Con</th>
                    <th className="px-3 py-2 text-right">Tổng tiền</th>
                    <th className="px-3 py-2 text-right">TB/con</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.by_breed.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-gray-500 dark:text-gray-400">
                        Không có dữ liệu
                      </td>
                    </tr>
                  ) : (
                    preview.by_breed.slice(0, 10).map((b, i) => {
                      const avg = b.qty > 0 ? b.amount / b.qty : 0
                      return (
                        <tr key={i} className="border-t border-gray-100 dark:border-gray-700">
                          <td className="px-3 py-2">{b.name}</td>
                          <td className="px-3 py-2 text-right">{b.qty}</td>
                          <td className="px-3 py-2 text-right font-semibold text-red-600 dark:text-red-400">
                            {formatVnd(b.amount)}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">
                            {formatVnd(avg)}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* By month */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2.5 font-bold text-sm">
              📅 Theo tháng ({preview.by_month.length})
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead className="bg-gray-50 dark:bg-gray-900/60 text-[11px] uppercase text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-3 py-2 text-left">Tháng</th>
                    <th className="px-3 py-2 text-right">Số phiếu</th>
                    <th className="px-3 py-2 text-right">SL gà</th>
                    <th className="px-3 py-2 text-right">Tổng tiền</th>
                    <th className="px-3 py-2 text-right">Giá TB/con</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.by_month.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-gray-500 dark:text-gray-400">
                        Không có dữ liệu
                      </td>
                    </tr>
                  ) : (
                    preview.by_month.map((m, i) => {
                      const avg = m.qty > 0 ? m.amount / m.qty : 0
                      return (
                        <tr key={i} className="border-t border-gray-100 dark:border-gray-700">
                          <td className="px-3 py-2 font-mono">{m.label}</td>
                          <td className="px-3 py-2 text-right">{m.purchases}</td>
                          <td className="px-3 py-2 text-right">{m.qty}</td>
                          <td className="px-3 py-2 text-right font-semibold text-red-600 dark:text-red-400">
                            {formatVnd(m.amount)}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">
                            {formatVnd(avg)}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sample purchases */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-gradient-to-r from-gray-700 to-gray-800 text-white px-4 py-2.5 font-bold text-sm flex items-center justify-between">
              <span>📋 10 phiếu mới nhất</span>
              <span className="text-xs font-normal opacity-80">
                (file xuất đầy đủ {preview.total_purchases} phiếu)
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead className="bg-gray-50 dark:bg-gray-900/60 text-[11px] uppercase text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-3 py-2 text-left">Mã phiếu</th>
                    <th className="px-3 py-2 text-left">Ngày</th>
                    <th className="px-3 py-2 text-left">NCC</th>
                    <th className="px-3 py-2 text-right">SL</th>
                    <th className="px-3 py-2 text-right">Tổng</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.sample_rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-gray-500 dark:text-gray-400">
                        Không có phiếu nào trong kỳ
                      </td>
                    </tr>
                  ) : (
                    preview.sample_rows.map((r) => (
                      <tr key={r.id} className="border-t border-gray-100 dark:border-gray-700">
                        <td className="px-3 py-2 font-mono font-medium">{r.purchase_code}</td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                          {new Date(r.purchase_date).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="px-3 py-2">{r.supplier_name}</td>
                        <td className="px-3 py-2 text-right">{r.total_quantity}</td>
                        <td className="px-3 py-2 text-right font-semibold text-red-600 dark:text-red-400">
                          {formatVnd(r.total_amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function Kpi({
  label,
  value,
  tint,
  icon,
}: {
  label: string
  value: string
  tint: 'blue' | 'green' | 'red' | 'amber'
  icon: string
}) {
  const map: Record<string, string> = {
    blue: 'from-blue-500 to-indigo-600 ring-blue-200 dark:ring-blue-900',
    green: 'from-emerald-500 to-green-600 ring-emerald-200 dark:ring-emerald-900',
    red: 'from-red-500 to-rose-600 ring-red-200 dark:ring-red-900',
    amber: 'from-amber-500 to-orange-600 ring-amber-200 dark:ring-amber-900',
  }
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm ring-1 relative overflow-hidden">
      <div
        className={`absolute top-0 right-0 w-14 h-14 rounded-full bg-gradient-to-br ${map[tint]} opacity-10 -translate-y-4 translate-x-4`}
      />
      <div className="flex items-start justify-between gap-2 relative">
        <div>
          <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
            {label}
          </div>
          <div className="text-xl md:text-2xl font-extrabold text-gray-900 dark:text-gray-100 mt-1 tabular-nums">
            {value}
          </div>
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  )
}
