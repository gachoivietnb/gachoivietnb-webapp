'use client'

import { useEffect, useMemo, useState } from 'react'
import { formatVnd } from '@/lib/utils/format'
import { removeDiacritics } from '@/lib/utils/slugify'

export type StockKind = 'medicine' | 'feed'

type Preview = {
  summary: {
    total_items: number
    active_items: number
    total_nhap: number
    total_xuat: number
    total_cost_in: number
    total_cost_out: number
    current_total_value: number
  }
  items: Array<{
    item_id: string
    code: string
    name_vi: string
    unit: string
    opening: number
    nhap: number
    xuat: number
    closing: number
    cost_in: number
    cost_out: number
  }>
  transactions: Array<{
    id: string
    transaction_date: string
    transaction_type: 'nhap' | 'xuat'
    item_code: string
    item_name: string
    unit: string
    quantity: number
    cost: number
    notes: string | null
  }>
}

const today = new Date()
const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
const todayIso = today.toISOString().slice(0, 10)

export function StockReport({ kind }: { kind: StockKind }) {
  const kindLabel = kind === 'medicine' ? 'kho thuốc' : 'kho thức ăn'
  const ItemLabel = kind === 'medicine' ? 'thuốc' : 'thức ăn'

  const [from, setFrom] = useState(firstOfMonth)
  const [to, setTo] = useState(todayIso)
  const [tab, setTab] = useState<'summary' | 'detail-in' | 'detail-out'>('summary')
  const [q, setQ] = useState('')
  const [itemId, setItemId] = useState('')
  const [txType, setTxType] = useState<'' | 'nhap' | 'xuat'>('')
  const [data, setData] = useState<Preview | null>(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState<string | null>(null)

  useEffect(() => {
    const p = new URLSearchParams({ from, to })
    if (itemId) p.set('item_id', itemId)
    if (txType) p.set('type', txType)
    setLoading(true)
    fetch(`/api/inventory/${kind}/report/preview?${p}`)
      .then((r) => r.json())
      .then((j) => setData(j as Preview))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [kind, from, to, itemId, txType])

  const qNorm = removeDiacritics(q.trim())

  const filteredItems = useMemo(() => {
    if (!data) return []
    return data.items.filter((x) => {
      if (qNorm) {
        const hay = removeDiacritics(`${x.code} ${x.name_vi}`)
        if (!hay.includes(qNorm)) return false
      }
      if (itemId && x.item_id !== itemId) return false
      return true
    })
  }, [data, qNorm, itemId])

  const filteredTxs = useMemo(() => {
    if (!data) return []
    return data.transactions.filter((t) => {
      if (qNorm) {
        const hay = removeDiacritics(
          `${t.item_code} ${t.item_name} ${t.notes ?? ''}`
        )
        if (!hay.includes(qNorm)) return false
      }
      return true
    })
  }, [data, qNorm])

  const itemsList = useMemo(() => {
    const m = new Map<string, string>()
    data?.items.forEach((x) => m.set(x.item_id, `${x.name_vi} (${x.code})`))
    return [...m.entries()]
  }, [data])

  function preset(p: '30d' | 'this_month' | 'last_month' | '90d' | 'this_year') {
    const now = new Date()
    if (p === '30d') {
      setFrom(new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10))
      setTo(todayIso)
    } else if (p === 'this_month') {
      setFrom(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10))
      setTo(todayIso)
    } else if (p === 'last_month') {
      setFrom(new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10))
      setTo(new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10))
    } else if (p === '90d') {
      setFrom(new Date(now.getTime() - 90 * 86400000).toISOString().slice(0, 10))
      setTo(todayIso)
    } else if (p === 'this_year') {
      setFrom(new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10))
      setTo(todayIso)
    }
  }

  async function download(
    tabKey: 'summary' | 'detail-in' | 'detail-out',
    format: 'excel' | 'pdf'
  ) {
    setExporting(`${tabKey}-${format}`)
    try {
      const mode = tabKey === 'summary' ? 'summary' : 'detail'
      const p = new URLSearchParams({ from, to, mode, format })
      if (q.trim()) p.set('q', q.trim())
      if (itemId) p.set('item_id', itemId)
      // Tab-specific: detail-in restricts to nhap, detail-out to xuat
      if (tabKey === 'detail-in') p.set('direction', 'nhap')
      else if (tabKey === 'detail-out') p.set('direction', 'xuat')
      else if (txType) p.set('type', txType)
      const res = await fetch(`/api/inventory/${kind}/report/export?${p}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const href = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = href
      const ext = format === 'pdf' ? 'pdf' : 'xlsx'
      const tabSlug =
        tabKey === 'summary'
          ? 'tong-hop'
          : tabKey === 'detail-in'
            ? 'chi-tiet-nhap'
            : 'chi-tiet-xuat'
      a.download = `nxt-${kind === 'medicine' ? 'thuoc' : 'thuc-an'}-${tabSlug}_${from}_${to}.${ext}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(href)
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e))
    } finally {
      setExporting(null)
    }
  }

  const periodLabel = `${new Date(from).toLocaleDateString('vi-VN')} → ${new Date(to).toLocaleDateString('vi-VN')}`
  const hasFilter = !!(q || itemId || txType)

  return (
    <div className="space-y-4">
      {/* Date + preset — hidden on print */}
      <div className="print:hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <label>
            <span className="text-[11px] block mb-1 font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
              Từ ngày
            </span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
            />
          </label>
          <label>
            <span className="text-[11px] block mb-1 font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
              Đến ngày
            </span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
            />
          </label>
          <div className="flex gap-1.5 flex-wrap">
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
                onClick={() => preset(k)}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 font-semibold"
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filter + actions row */}
      <div className="print:hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-3">
          <div className="relative md:col-span-2">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">🔍</span>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`Tìm mã, tên ${ItemLabel}, ghi chú...`}
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg pl-9 pr-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
          </div>
          <select
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">📦 Tất cả {ItemLabel}</option>
            {itemsList.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={txType}
            onChange={(e) => setTxType(e.target.value as '' | 'nhap' | 'xuat')}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">🔄 Nhập và xuất</option>
            <option value="nhap">📥 Chỉ nhập</option>
            <option value="xuat">📤 Chỉ xuất</option>
          </select>
        </div>
        {hasFilter && (
          <button
            onClick={() => { setQ(''); setItemId(''); setTxType('') }}
            className="mt-2 text-xs text-red-600 dark:text-red-400 hover:underline font-semibold"
          >
            ✕ Xóa lọc
          </button>
        )}
      </div>

      {/* Tabs + actions */}
      <div className="print:hidden flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 flex-wrap">
        <div className="flex gap-1 flex-1 flex-wrap">
          {(
            [
              ['summary', '📊 Tổng hợp'],
              ['detail-in', '📥 Chi tiết NHẬP'],
              ['detail-out', '📤 Chi tiết XUẤT'],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`px-4 py-2 text-sm font-semibold -mb-px border-b-2 transition ${
                tab === k
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 pb-2 flex-wrap">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-3 py-2 text-sm font-semibold"
          >
            🖨 In
          </button>
          <button
            onClick={() => download(tab, 'excel')}
            disabled={!data || !!exporting}
            className="inline-flex items-center gap-1.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg px-3 py-2 text-sm font-bold disabled:opacity-50"
          >
            {exporting?.startsWith(`${tab}-excel`) ? '⏳' : '📥'} Excel
          </button>
          <button
            onClick={() => download(tab, 'pdf')}
            disabled={!data || !!exporting}
            className="inline-flex items-center gap-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-lg px-3 py-2 text-sm font-bold disabled:opacity-50"
          >
            {exporting?.startsWith(`${tab}-pdf`) ? '⏳' : '📄'} PDF
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">⏳ Đang tải...</div>
      ) : !data ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Không tải được dữ liệu</div>
      ) : tab === 'summary' ? (
        <SummaryView
          periodLabel={periodLabel}
          kindLabel={kindLabel}
          data={data}
          filteredItems={filteredItems}
        />
      ) : (
        <DetailView
          periodLabel={periodLabel}
          kindLabel={kindLabel}
          transactions={filteredTxs}
          direction={tab === 'detail-in' ? 'nhap' : 'xuat'}
        />
      )}

      {/* Print CSS */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          .print\\:bg-white { background: white !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:border-0 { border: 0 !important; }
          nav, header, aside, .sidebar, [data-sidebar] { display: none !important; }
        }
      `,
        }}
      />
    </div>
  )
}

/* ========= SUMMARY VIEW ========= */
function SummaryView({
  periodLabel,
  kindLabel,
  data,
  filteredItems,
}: {
  periodLabel: string
  kindLabel: string
  data: Preview
  filteredItems: Preview['items']
}) {
  const itemsWithActivity = filteredItems.filter((x) => x.nhap + x.xuat > 0 || x.closing > 0)
  const totalOpening = itemsWithActivity.reduce((s, x) => s + x.opening, 0)
  const totalNhap = itemsWithActivity.reduce((s, x) => s + x.nhap, 0)
  const totalXuat = itemsWithActivity.reduce((s, x) => s + x.xuat, 0)
  const totalClosing = itemsWithActivity.reduce((s, x) => s + x.closing, 0)
  const totalCostIn = itemsWithActivity.reduce((s, x) => s + x.cost_in, 0)

  return (
    <article className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden print:shadow-none print:border-0">
      <div className="px-6 py-5 bg-gradient-to-r from-blue-50 via-white to-indigo-50 dark:from-blue-950/30 dark:via-gray-800 dark:to-indigo-950/30 print:bg-white border-b border-blue-200 dark:border-blue-900 text-center">
        <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
          Báo cáo tổng hợp nhập xuất tồn {kindLabel}
        </h2>
        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Kỳ báo cáo: <b className="text-gray-700 dark:text-gray-300">{periodLabel}</b>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-5">
        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KpiMini label="Tổng loại" value={data.summary.total_items.toString()} tint="blue" icon="📦" />
          <KpiMini label="Có phát sinh" value={data.summary.active_items.toString()} tint="indigo" icon="✨" />
          <KpiMini label="Chi phí nhập" value={formatVnd(data.summary.total_cost_in)} tint="emerald" icon="📥" />
          <KpiMini label="Giá trị xuất" value={formatVnd(data.summary.total_cost_out)} tint="red" icon="📤" />
          <KpiMini label="Tồn cuối kỳ" value={formatVnd(data.summary.current_total_value)} tint="amber" icon="💰" />
        </div>

        {/* Items table */}
        <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[11px] uppercase tracking-wider print:bg-gray-100 print:text-gray-900">
              <tr>
                <th className="px-3 py-2.5 text-left">Mã</th>
                <th className="px-3 py-2.5 text-left">Tên</th>
                <th className="px-3 py-2.5 text-center w-16">Đơn vị</th>
                <th className="px-3 py-2.5 text-right w-24">Tồn đầu kỳ</th>
                <th className="px-3 py-2.5 text-right w-24">Nhập</th>
                <th className="px-3 py-2.5 text-right w-24">Xuất</th>
                <th className="px-3 py-2.5 text-right w-24">Tồn cuối kỳ</th>
                <th className="px-3 py-2.5 text-right w-32">Chi phí nhập</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {itemsWithActivity.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-gray-500 dark:text-gray-400">
                    Không có phát sinh trong kỳ
                  </td>
                </tr>
              ) : (
                itemsWithActivity.map((x, i) => (
                  <tr
                    key={x.item_id}
                    className={i % 2 === 1 ? 'bg-gray-50/60 dark:bg-gray-900/30 print:bg-gray-50' : ''}
                  >
                    <td className="px-3 py-2 font-mono text-xs">{x.code}</td>
                    <td className="px-3 py-2 font-medium">{x.name_vi}</td>
                    <td className="px-3 py-2 text-center text-xs text-gray-500 dark:text-gray-400">{x.unit}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt(x.opening)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-emerald-700 dark:text-emerald-400 font-semibold">
                      {x.nhap > 0 ? `+${fmt(x.nhap)}` : '—'}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-red-700 dark:text-red-400 font-semibold">
                      {x.xuat > 0 ? `−${fmt(x.xuat)}` : '—'}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-bold text-indigo-700 dark:text-indigo-400">
                      {fmt(x.closing)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-700 dark:text-gray-300">
                      {x.cost_in > 0 ? formatVnd(x.cost_in) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-amber-50 dark:bg-amber-950/30 print:bg-amber-50 font-bold text-amber-900 dark:text-amber-200">
              <tr>
                <td colSpan={3} className="px-3 py-2.5 uppercase tracking-wider">
                  TỔNG
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">{fmt(totalOpening)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">+{fmt(totalNhap)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">−{fmt(totalXuat)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{fmt(totalClosing)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{formatVnd(totalCostIn)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Balance formula */}
        <div className="bg-gray-50 dark:bg-gray-900 print:bg-gray-50 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 text-center font-mono text-sm">
          <span className="text-blue-700 dark:text-blue-400 font-bold">{fmt(totalOpening)}</span>
          <span className="text-gray-500 mx-1">(đầu kỳ)</span>
          <span className="text-emerald-700 dark:text-emerald-400"> + {fmt(totalNhap)}</span>
          <span className="text-gray-500 mx-1">(nhập)</span>
          <span className="text-red-700 dark:text-red-400"> − {fmt(totalXuat)}</span>
          <span className="text-gray-500 mx-1">(xuất)</span>
          <span className="text-gray-500 mx-1">=</span>
          <span className="text-indigo-700 dark:text-indigo-400 font-bold text-lg">{fmt(totalClosing)}</span>
          <span className="text-gray-500 ml-1">(cuối kỳ)</span>
        </div>
      </div>
    </article>
  )
}

/* ========= DETAIL VIEW (single direction) ========= */
function DetailView({
  periodLabel,
  kindLabel,
  transactions,
  direction,
}: {
  periodLabel: string
  kindLabel: string
  transactions: Preview['transactions']
  direction: 'nhap' | 'xuat'
}) {
  const txs = transactions.filter((t) => t.transaction_type === direction)
  const totalCost = txs.reduce((s, t) => s + t.cost, 0)
  const totalQty = txs.reduce((s, t) => s + t.quantity, 0)
  const isInflow = direction === 'nhap'
  const dirLabel = isInflow ? 'NHẬP' : 'XUẤT'
  const dirIcon = isInflow ? '📥' : '📤'
  const tint = isInflow ? 'emerald' : 'red'
  const amountHeader = isInflow ? 'Chi phí' : 'Giá trị'

  // Aggregate per item for summary header
  const byItem = new Map<string, { item_code: string; item_name: string; unit: string; qty: number; cost: number; count: number }>()
  for (const t of txs) {
    const key = t.item_code
    const cur = byItem.get(key) ?? {
      item_code: t.item_code,
      item_name: t.item_name,
      unit: t.unit,
      qty: 0,
      cost: 0,
      count: 0,
    }
    cur.qty += t.quantity
    cur.cost += t.cost
    cur.count += 1
    byItem.set(key, cur)
  }
  const itemSummary = [...byItem.values()].sort((a, b) => b.cost - a.cost)

  const headerBg = isInflow
    ? 'from-emerald-50 via-white to-green-50 dark:from-emerald-950/30 dark:via-gray-800 dark:to-green-950/30 border-emerald-200 dark:border-emerald-900'
    : 'from-red-50 via-white to-rose-50 dark:from-red-950/30 dark:via-gray-800 dark:to-rose-950/30 border-red-200 dark:border-red-900'

  return (
    <article className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm print:shadow-none print:border-0 overflow-hidden">
      <div className={`px-6 py-5 bg-gradient-to-r ${headerBg} print:bg-white border-b text-center`}>
        <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
          {dirIcon} Báo cáo chi tiết {dirLabel.toLowerCase()} {kindLabel}
        </h2>
        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Kỳ báo cáo: <b className="text-gray-700 dark:text-gray-300">{periodLabel}</b>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-5">
        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiMini
            label={`Số lần ${isInflow ? 'nhập' : 'xuất'}`}
            value={txs.length.toLocaleString('vi-VN')}
            tint={tint}
            icon={dirIcon}
          />
          <KpiMini
            label="Số loại có giao dịch"
            value={byItem.size.toLocaleString('vi-VN')}
            tint="indigo"
            icon="📦"
          />
          <KpiMini
            label={`Tổng SL ${isInflow ? 'nhập' : 'xuất'}`}
            value={`${fmt(totalQty)} đơn vị`}
            tint="blue"
            icon="⚖️"
          />
          <KpiMini
            label={`Tổng ${amountHeader.toLowerCase()}`}
            value={formatVnd(totalCost)}
            tint={tint}
            icon="💰"
          />
        </div>

        {/* Aggregated by item */}
        {itemSummary.length > 0 && (
          <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className={`bg-gradient-to-r ${isInflow ? 'from-emerald-600 to-green-600' : 'from-red-600 to-rose-600'} text-white px-4 py-2 font-bold text-sm print:bg-gray-100 print:text-gray-900`}>
              📊 Tổng hợp theo loại {kindLabel.replace('kho ', '')}
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/60 print:bg-gray-50 text-[11px] uppercase text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-3 py-2 text-left">Mã</th>
                  <th className="px-3 py-2 text-left">Tên</th>
                  <th className="px-3 py-2 text-center">Đơn vị</th>
                  <th className="px-3 py-2 text-right">Số lần</th>
                  <th className="px-3 py-2 text-right">SL</th>
                  <th className="px-3 py-2 text-right">{amountHeader}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {itemSummary.map((it, i) => (
                  <tr key={i} className={i % 2 === 1 ? 'bg-gray-50/60 dark:bg-gray-900/30 print:bg-gray-50' : ''}>
                    <td className="px-3 py-2 font-mono text-xs">{it.item_code}</td>
                    <td className="px-3 py-2 font-medium">{it.item_name}</td>
                    <td className="px-3 py-2 text-center text-xs text-gray-500 dark:text-gray-400">{it.unit}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{it.count}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold">{fmt(it.qty)}</td>
                    <td className={`px-3 py-2 text-right tabular-nums font-bold ${isInflow ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'} print:text-gray-900`}>
                      {formatVnd(it.cost)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-amber-50 dark:bg-amber-950/30 print:bg-amber-50 font-bold text-amber-900 dark:text-amber-200">
                <tr>
                  <td colSpan={3} className="px-3 py-2.5 uppercase tracking-wider">TỔNG</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{txs.length}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{fmt(totalQty)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{formatVnd(totalCost)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Detail transactions */}
        <TxSection
          title={`CHI TIẾT TỪNG GIAO DỊCH ${dirLabel}`}
          tint={tint}
          count={txs.length}
          totalQty={totalQty}
          totalCost={totalCost}
          txs={txs}
          amountHeader={amountHeader}
        />
      </div>
    </article>
  )
}

function TxSection({
  title,
  tint,
  count,
  totalQty,
  totalCost,
  txs,
  amountHeader,
}: {
  title: string
  tint: 'emerald' | 'red'
  count: number
  totalQty: number
  totalCost: number
  txs: Preview['transactions']
  amountHeader: string
}) {
  const g = tint === 'emerald' ? 'from-emerald-600 to-green-600' : 'from-red-600 to-rose-600'
  return (
    <div>
      <div
        className={`bg-gradient-to-r ${g} text-white px-4 py-2.5 rounded-t-lg flex items-center justify-between flex-wrap gap-2 print:bg-gray-100 print:text-gray-900`}
      >
        <h3 className="font-bold text-sm uppercase tracking-wide">{title}</h3>
        <div className="flex items-center gap-2 text-xs">
          <span className="bg-white/20 rounded-full px-2.5 py-0.5 font-semibold">{count} giao dịch</span>
          <span className="bg-white/20 rounded-full px-2.5 py-0.5 font-semibold tabular-nums">
            SL tổng: {fmt(totalQty)}
          </span>
          <span className="bg-white/20 rounded-full px-2.5 py-0.5 font-semibold tabular-nums">
            {amountHeader}: {formatVnd(totalCost)}
          </span>
        </div>
      </div>
      <div className="border border-t-0 border-gray-200 dark:border-gray-700 rounded-b-lg p-3 md:p-4 bg-white dark:bg-gray-800 print:bg-white">
        {count === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-6">Không có giao dịch trong kỳ</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/60 print:bg-gray-50 text-[11px] uppercase text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-3 py-2 text-left">Ngày</th>
                  <th className="px-3 py-2 text-left">Mã</th>
                  <th className="px-3 py-2 text-left">Tên</th>
                  <th className="px-3 py-2 text-center">Đơn vị</th>
                  <th className="px-3 py-2 text-right">Số lượng</th>
                  <th className="px-3 py-2 text-right">{amountHeader} (đ)</th>
                  <th className="px-3 py-2 text-left">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {txs.map((t) => (
                  <tr key={t.id}>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {new Date(t.transaction_date).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{t.item_code}</td>
                    <td className="px-3 py-2 font-medium">{t.item_name}</td>
                    <td className="px-3 py-2 text-center text-xs text-gray-500 dark:text-gray-400">{t.unit}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold">{fmt(t.quantity)}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold">
                      {t.cost > 0 ? formatVnd(t.cost) : '—'}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400">{t.notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function KpiMini({
  label,
  value,
  tint,
  icon,
}: {
  label: string
  value: string
  tint: 'blue' | 'indigo' | 'emerald' | 'red' | 'amber'
  icon: string
}) {
  const map: Record<string, string> = {
    blue: 'from-blue-500 to-indigo-600',
    indigo: 'from-indigo-500 to-purple-600',
    emerald: 'from-emerald-500 to-green-600',
    red: 'from-red-500 to-rose-600',
    amber: 'from-amber-500 to-orange-600',
  }
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-sm relative overflow-hidden print:bg-white">
      <div className={`absolute top-0 right-0 w-12 h-12 rounded-full bg-gradient-to-br ${map[tint]} opacity-10 -translate-y-3 translate-x-3`} />
      <div className="flex items-start justify-between gap-2 relative">
        <div className="min-w-0">
          <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest truncate">
            {label}
          </div>
          <div className="text-sm md:text-base font-extrabold text-gray-900 dark:text-gray-100 mt-0.5 tabular-nums truncate">
            {value}
          </div>
        </div>
        <span className="text-lg">{icon}</span>
      </div>
    </div>
  )
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return '0'
  const rounded = Math.round(n * 100) / 100
  return rounded.toLocaleString('vi-VN')
}
