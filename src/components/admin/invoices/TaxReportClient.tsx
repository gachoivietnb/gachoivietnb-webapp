'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type Invoice = {
  id: string
  internal_no: string
  invoice_no: string | null
  invoice_serial: string | null
  invoice_form: string | null
  issue_date: string
  buyer_name: string | null
  buyer_tax_code: string | null
  buyer_address: string | null
  subtotal: number
  tax_amount: number
  total: number
  cqt_code: string | null
  notes: string | null
}

const fmt = (n: number) => Number(n || 0).toLocaleString('vi-VN')

export function TaxReportClient({
  invoices,
  from,
  to,
}: {
  invoices: Invoice[]
  from: string
  to: string
}) {
  const router = useRouter()
  const [dateFrom, setDateFrom] = useState(from)
  const [dateTo, setDateTo] = useState(to)
  const [groupBy, setGroupBy] = useState<'none' | 'buyer' | 'tax_rate' | 'month'>('none')

  function applyDate() {
    const url = new URL(window.location.href)
    url.searchParams.set('from', dateFrom)
    url.searchParams.set('to', dateTo)
    router.push(url.pathname + '?' + url.searchParams.toString())
  }

  function quickPick(period: 'thismonth' | 'lastmonth' | 'thisquarter' | 'lastquarter' | 'thisyear' | 'lastyear') {
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth()
    let f: Date
    let t: Date
    if (period === 'thismonth') {
      // ngày 1 → ngày cuối cùng của tháng hiện tại
      f = new Date(y, m, 1)
      t = new Date(y, m + 1, 0)
    } else if (period === 'lastmonth') {
      f = new Date(y, m - 1, 1)
      t = new Date(y, m, 0)
    } else if (period === 'thisquarter') {
      const q = Math.floor(m / 3)
      f = new Date(y, q * 3, 1)
      t = new Date(y, q * 3 + 3, 0)
    } else if (period === 'lastquarter') {
      const q = Math.floor(m / 3) - 1
      const qy = q < 0 ? y - 1 : y
      const qm = q < 0 ? 9 : q * 3
      f = new Date(qy, qm, 1)
      t = new Date(qy, qm + 3, 0)
    } else if (period === 'thisyear') {
      f = new Date(y, 0, 1)
      t = new Date(y, 11, 31)
    } else {
      // lastyear
      f = new Date(y - 1, 0, 1)
      t = new Date(y - 1, 11, 31)
    }
    setDateFrom(toLocalISO(f))
    setDateTo(toLocalISO(t))
    setTimeout(applyDate, 0)
  }

  // Format thành YYYY-MM-DD theo timezone local (tránh bug toISOString lệch UTC)
  function toLocalISO(d: Date): string {
    const yy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yy}-${mm}-${dd}`
  }

  const totals = useMemo(() => {
    return invoices.reduce(
      (acc, inv) => {
        acc.count += 1
        acc.subtotal += Number(inv.subtotal)
        acc.tax += Number(inv.tax_amount)
        acc.total += Number(inv.total)
        return acc
      },
      { count: 0, subtotal: 0, tax: 0, total: 0 }
    )
  }, [invoices])

  const grouped = useMemo(() => {
    if (groupBy === 'none') return null
    const map = new Map<string, { rows: Invoice[]; subtotal: number; tax: number; total: number }>()
    for (const inv of invoices) {
      let key = ''
      if (groupBy === 'buyer') key = inv.buyer_name || '(không tên)'
      else if (groupBy === 'tax_rate') {
        // approximate from total/subtotal
        const rate = Number(inv.subtotal) > 0 ? Math.round((Number(inv.tax_amount) / Number(inv.subtotal)) * 100) : 0
        key = `${rate}%`
      } else if (groupBy === 'month') {
        key = inv.issue_date.slice(0, 7)
      }
      if (!map.has(key)) map.set(key, { rows: [], subtotal: 0, tax: 0, total: 0 })
      const g = map.get(key)!
      g.rows.push(inv)
      g.subtotal += Number(inv.subtotal)
      g.tax += Number(inv.tax_amount)
      g.total += Number(inv.total)
    }
    return Array.from(map.entries()).sort((a, b) => b[1].total - a[1].total)
  }, [invoices, groupBy])

  function exportExcel() {
    const params = new URLSearchParams({ from: dateFrom, to: dateTo, status: 'da_phat_hanh' })
    window.location.href = `/api/invoices/export-excel?${params.toString()}`
  }

  return (
    <div className="space-y-4">
      {/* Filter card */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500">Kỳ báo cáo:</span>
          <button onClick={() => quickPick('thismonth')}    className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2.5 py-1 hover:bg-amber-50 hover:border-amber-400 dark:hover:bg-gray-700">Tháng này</button>
          <button onClick={() => quickPick('lastmonth')}    className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2.5 py-1 hover:bg-amber-50 hover:border-amber-400 dark:hover:bg-gray-700">Tháng trước</button>
          <span className="text-gray-300">·</span>
          <button onClick={() => quickPick('thisquarter')}  className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2.5 py-1 hover:bg-amber-50 hover:border-amber-400 dark:hover:bg-gray-700">Quý này</button>
          <button onClick={() => quickPick('lastquarter')}  className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2.5 py-1 hover:bg-amber-50 hover:border-amber-400 dark:hover:bg-gray-700">Quý trước</button>
          <span className="text-gray-300">·</span>
          <button onClick={() => quickPick('thisyear')}     className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2.5 py-1 hover:bg-amber-50 hover:border-amber-400 dark:hover:bg-gray-700">Năm nay</button>
          <button onClick={() => quickPick('lastyear')}     className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2.5 py-1 hover:bg-amber-50 hover:border-amber-400 dark:hover:bg-gray-700">Năm trước</button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded px-2 py-1.5"
          />
          <span className="text-gray-400">→</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded px-2 py-1.5"
          />
          <button
            onClick={applyDate}
            className="bg-amber-500 text-white rounded px-4 py-1.5 text-sm font-semibold"
          >
            Áp dụng
          </button>
          <span className="text-gray-300 mx-1">|</span>
          <span className="text-xs text-gray-500">Nhóm theo:</span>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as typeof groupBy)}
            className="text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded px-2 py-1.5"
          >
            <option value="none">Không</option>
            <option value="buyer">Người mua</option>
            <option value="tax_rate">Thuế suất</option>
            <option value="month">Tháng</option>
          </select>
          <button
            onClick={exportExcel}
            className="ml-auto bg-emerald-600 hover:bg-emerald-700 text-white rounded px-4 py-1.5 text-sm font-semibold"
          >
            📊 Xuất Excel (Bảng kê HĐ bán ra)
          </button>
        </div>
      </div>

      {/* Tổng hợp */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Số HĐ phát hành" value={totals.count.toString()} tone="from-blue-500 to-indigo-500" />
        <Stat label="Cộng tiền hàng" value={fmt(totals.subtotal)} tone="from-amber-500 to-orange-600" />
        <Stat label="Tổng thuế GTGT" value={fmt(totals.tax)} tone="from-purple-500 to-pink-500" />
        <Stat label="Doanh thu" value={fmt(totals.total)} tone="from-emerald-500 to-teal-500" />
      </div>

      {/* Grouped */}
      {grouped && grouped.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3">📊 Tổng hợp theo {groupBy === 'buyer' ? 'người mua' : groupBy === 'tax_rate' ? 'thuế suất' : 'tháng'}</h3>
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-gray-500 border-b">
              <tr>
                <th className="text-left p-2">Nhóm</th>
                <th className="text-right p-2">Số HĐ</th>
                <th className="text-right p-2">Tiền hàng</th>
                <th className="text-right p-2">Thuế</th>
                <th className="text-right p-2">Doanh thu</th>
                <th className="text-right p-2">% DT</th>
              </tr>
            </thead>
            <tbody>
              {grouped.map(([key, g]) => (
                <tr key={key} className="border-t border-gray-100 dark:border-gray-700">
                  <td className="p-2 font-medium">{key}</td>
                  <td className="p-2 text-right">{g.rows.length}</td>
                  <td className="p-2 text-right font-mono">{fmt(g.subtotal)}</td>
                  <td className="p-2 text-right font-mono text-gray-600">{fmt(g.tax)}</td>
                  <td className="p-2 text-right font-mono font-semibold">{fmt(g.total)}</td>
                  <td className="p-2 text-right text-xs text-gray-500">
                    {totals.total > 0 ? ((g.total / totals.total) * 100).toFixed(1) : '0'}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Bảng kê HĐ bán ra (chuẩn TT 78) */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-amber-50 dark:bg-amber-950/30">
          <h3 className="text-sm font-semibold">
            📋 Bảng kê HĐ bán ra · Kỳ {dateFrom.split('-').reverse().join('/')} → {dateTo.split('-').reverse().join('/')}
          </h3>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Mẫu áp dụng cho tờ khai 01/GTGT — sao chép sang phần mềm HTKK hoặc xuất Excel để kê khai.
          </p>
        </div>
        {invoices.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">
            Không có HĐ phát hành trong kỳ.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/40 text-[10px] uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="text-left p-2">STT</th>
                  <th className="text-left p-2">Số HĐ</th>
                  <th className="text-left p-2">Mẫu/KH</th>
                  <th className="text-left p-2">Ngày</th>
                  <th className="text-left p-2">Người mua</th>
                  <th className="text-left p-2">MST</th>
                  <th className="text-right p-2">Tiền hàng</th>
                  <th className="text-right p-2">Thuế GTGT</th>
                  <th className="text-right p-2">Tổng</th>
                  <th className="text-left p-2">Mã CQT</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv, i) => (
                  <tr key={inv.id} className="border-t border-gray-100 dark:border-gray-700 hover:bg-amber-50/30">
                    <td className="p-2 text-gray-500">{i + 1}</td>
                    <td className="p-2 font-mono text-xs">
                      <Link href={`/admin/hoa-don/${inv.id}`} className="text-blue-600 hover:underline">
                        {inv.invoice_no || inv.internal_no}
                      </Link>
                    </td>
                    <td className="p-2 font-mono text-xs text-gray-600">
                      {[inv.invoice_form, inv.invoice_serial].filter(Boolean).join('/')}
                    </td>
                    <td className="p-2 whitespace-nowrap text-xs">
                      {inv.issue_date.split('-').reverse().join('/')}
                    </td>
                    <td className="p-2 max-w-[200px] truncate">{inv.buyer_name}</td>
                    <td className="p-2 font-mono text-xs">{inv.buyer_tax_code || '—'}</td>
                    <td className="p-2 text-right font-mono">{fmt(Number(inv.subtotal))}</td>
                    <td className="p-2 text-right font-mono text-gray-600">{fmt(Number(inv.tax_amount))}</td>
                    <td className="p-2 text-right font-mono font-semibold">{fmt(Number(inv.total))}</td>
                    <td className="p-2 font-mono text-[10px] text-emerald-600 dark:text-emerald-400 max-w-[120px] truncate">
                      {inv.cqt_code || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-amber-50 dark:bg-amber-950/30 font-bold">
                <tr className="border-t-2 border-amber-400">
                  <td colSpan={6} className="p-2 text-right">TỔNG CỘNG ({invoices.length} HĐ):</td>
                  <td className="p-2 text-right font-mono">{fmt(totals.subtotal)}</td>
                  <td className="p-2 text-right font-mono">{fmt(totals.tax)}</td>
                  <td className="p-2 text-right font-mono">{fmt(totals.total)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className={`rounded-xl p-3 bg-gradient-to-br ${tone} text-white shadow-sm`}>
      <div className="text-[10px] uppercase tracking-wide opacity-80">{label}</div>
      <div className="font-bold text-2xl leading-tight truncate font-mono">{value}</div>
    </div>
  )
}
