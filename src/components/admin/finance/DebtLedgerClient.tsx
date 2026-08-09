'use client'

import { useMemo, useState } from 'react'
import { formatVnd } from '@/lib/utils/format'
import { removeDiacritics } from '@/lib/utils/slugify'
import { FileSpreadsheet, Printer } from 'lucide-react'
import { buildLedger, filterItems, type StmtItem, type StmtPayment } from '@/lib/reports/debt-statement'

type Side = 'receivable' | 'payable'
type Preset = 'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'all' | 'custom'

const KIND_LABEL: Record<string, string> = {
  ga: '🐓 Gà', thuc_an: '🌾 Thức ăn', thuoc: '💊 Thuốc', vat_tu: '📦 Vật tư', khac: '📦 Khác',
}
const pad = (n: number) => String(n).padStart(2, '0')
const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
function periodRange(preset: Preset, cFrom: string, cTo: string): [string, string] {
  const d = new Date()
  const y = d.getFullYear(), m = d.getMonth()
  const lastDay = (yy: number, mm: number) => new Date(yy, mm + 1, 0)
  switch (preset) {
    case 'this_month': return [fmt(new Date(y, m, 1)), fmt(lastDay(y, m))]
    case 'last_month': return [fmt(new Date(y, m - 1, 1)), fmt(lastDay(y, m - 1))]
    case 'this_quarter': { const qs = Math.floor(m / 3) * 3; return [fmt(new Date(y, qs, 1)), fmt(lastDay(y, qs + 2))] }
    case 'this_year': return [fmt(new Date(y, 0, 1)), fmt(new Date(y, 11, 31))]
    case 'all': return ['0000-01-01', '9999-12-31']
    case 'custom': return [cFrom || fmt(new Date(y, m, 1)), cTo || fmt(d)]
  }
}

export function DebtLedgerClient({
  side,
  items,
  payments,
  partners,
  defaultPartnerId,
}: {
  side: Side
  items: StmtItem[]
  payments: StmtPayment[]
  partners: Array<{ id: string; name: string }>
  defaultPartnerId?: string
}) {
  const isRec = side === 'receivable'
  const partnerLabel = isRec ? 'Khách hàng' : 'Nhà cung cấp'
  const tone = isRec ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
  const kinds = isRec ? [] : Array.from(new Set(items.map((i) => i.kind ?? 'ga')))

  const [preset, setPreset] = useState<Preset>('this_year')
  const [cFrom, setCFrom] = useState('')
  const [cTo, setCTo] = useState('')
  const [partnerId, setPartnerId] = useState(defaultPartnerId ?? '')
  const [kind, setKind] = useState('')
  const [q, setQ] = useState('')

  const [from, to] = periodRange(preset, cFrom, cTo)
  const qn = removeDiacritics(q.trim())

  const filteredItems = useMemo(
    () => filterItems(items, { partnerId, kind, qNorm: qn, norm: removeDiacritics }),
    [items, partnerId, kind, qn]
  )
  const ledger = useMemo(() => buildLedger(filteredItems, payments, from, to, side), [filteredItems, payments, from, to, side])

  const exportUrl = (format: 'excel' | 'pdf') => {
    const p = new URLSearchParams({ side, from, to, format, mode: 'ledger' })
    if (partnerId) p.set('partnerId', partnerId)
    if (kind) p.set('kind', kind)
    if (q.trim()) p.set('q', q.trim())
    return `/api/cong-no/statement/export?${p.toString()}`
  }

  const selCls = 'border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm'
  const PRESETS: Array<[Preset, string]> = [
    ['this_month', 'Tháng này'], ['last_month', 'Tháng trước'], ['this_quarter', 'Quý này'],
    ['this_year', 'Năm nay'], ['all', 'Toàn bộ'], ['custom', 'Tùy chọn'],
  ]
  const partnerName = partners.find((p) => p.id === partnerId)?.name

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <a href={exportUrl('excel')} className="inline-flex items-center gap-1.5 border border-emerald-500 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg px-3 py-1.5 text-sm font-medium">
          <FileSpreadsheet className="w-4 h-4" /> Xuất Excel
        </a>
        <a href={exportUrl('pdf')} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 border border-red-500 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg px-3 py-1.5 text-sm font-medium">
          <Printer className="w-4 h-4" /> In / PDF
        </a>
      </div>

      {/* Lọc thông minh */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">📅 Kỳ:</span>
          {PRESETS.map(([k, l]) => (
            <button key={k} onClick={() => setPreset(k)} className={`text-xs px-2.5 py-1 rounded-full font-semibold transition ${preset === k ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'}`}>{l}</button>
          ))}
          {preset === 'custom' && (
            <span className="flex items-center gap-1.5">
              <input type="date" value={cFrom} onChange={(e) => setCFrom(e.target.value)} className={selCls} />
              <span className="text-gray-400 text-xs">→</span>
              <input type="date" value={cTo} onChange={(e) => setCTo(e.target.value)} className={selCls} />
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <select value={partnerId} onChange={(e) => setPartnerId(e.target.value)} className={selCls}>
            <option value="">Tất cả {partnerLabel.toLowerCase()} (gộp)</option>
            {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {!isRec && (
            <select value={kind} onChange={(e) => setKind(e.target.value)} className={selCls}>
              <option value="">Mọi loại</option>
              {kinds.map((k) => <option key={k} value={k}>{KIND_LABEL[k] ?? k}</option>)}
            </select>
          )}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-sm">🔍</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Mã chứng từ / tên..." className={`${selCls} w-full pl-8`} />
          </div>
        </div>
        <p className="text-[11px] text-gray-400">
          {partnerName ? <>Đối tượng: <b>{partnerName}</b> · </> : 'Gộp tất cả đối tượng · '}
          Kỳ: <b>{from === '0000-01-01' ? 'từ đầu' : from.split('-').reverse().join('/')}</b> → <b>{to === '9999-12-31' ? 'nay' : to.split('-').reverse().join('/')}</b>
        </p>
      </div>

      {/* Sổ chi tiết */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="text-[11px] uppercase text-gray-500 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
              <tr>
                <th className="text-left p-2.5 w-24">Ngày</th>
                <th className="text-left p-2.5">Chứng từ</th>
                <th className="text-left p-2.5">Diễn giải</th>
                <th className="text-right p-2.5">Phát sinh tăng</th>
                <th className="text-right p-2.5">Phát sinh giảm</th>
                <th className="text-right p-2.5">Số dư</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-blue-50/40 dark:bg-blue-950/20 font-semibold">
                <td className="p-2.5" colSpan={3}>Số dư đầu kỳ</td>
                <td className="p-2.5"></td>
                <td className="p-2.5"></td>
                <td className={`p-2.5 text-right tabular-nums ${tone}`}>{formatVnd(ledger.opening)}</td>
              </tr>
              {ledger.rows.length === 0 ? (
                <tr><td colSpan={6} className="p-6 text-center text-sm text-gray-400">Không có phát sinh trong kỳ.</td></tr>
              ) : (
                ledger.rows.map((r, i) => (
                  <tr key={i} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/30">
                    <td className="p-2.5 text-xs whitespace-nowrap">{r.date.split('-').reverse().join('/')}</td>
                    <td className="p-2.5 font-mono text-xs">{r.code}</td>
                    <td className="p-2.5 text-xs">{r.desc}</td>
                    <td className="p-2.5 text-right tabular-nums text-emerald-600 dark:text-emerald-400">{r.increase ? formatVnd(r.increase) : ''}</td>
                    <td className="p-2.5 text-right tabular-nums text-blue-600 dark:text-blue-400">{r.decrease ? formatVnd(r.decrease) : ''}</td>
                    <td className="p-2.5 text-right tabular-nums font-medium">{formatVnd(r.balance)}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 font-bold">
                <td className="p-2.5" colSpan={3}>Cộng phát sinh trong kỳ</td>
                <td className="p-2.5 text-right tabular-nums text-emerald-600 dark:text-emerald-400">{formatVnd(ledger.totalInc)}</td>
                <td className="p-2.5 text-right tabular-nums text-blue-600 dark:text-blue-400">{formatVnd(ledger.totalDec)}</td>
                <td className="p-2.5"></td>
              </tr>
              <tr className="border-t-2 border-gray-300 dark:border-gray-600 bg-amber-50 dark:bg-amber-950/30 font-bold">
                <td className="p-2.5" colSpan={5}>SỐ DƯ CUỐI KỲ</td>
                <td className={`p-2.5 text-right tabular-nums text-base ${tone}`}>{formatVnd(ledger.closing)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      <p className="text-[11px] text-gray-400">Số dư cuối kỳ = Đầu kỳ + Σ phát sinh tăng − Σ phát sinh giảm. Chọn 1 {partnerLabel.toLowerCase()} để xem sổ riêng.</p>
    </div>
  )
}
