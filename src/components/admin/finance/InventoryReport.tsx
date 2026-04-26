'use client'

import { useEffect, useMemo, useState } from 'react'
import { formatVnd } from '@/lib/utils/format'
import { removeDiacritics } from '@/lib/utils/slugify'

type SummaryRow = { category: string; count: number; description: string }
type DetailEvent = {
  event_date: string
  event_type: 'opening' | 'purchased' | 'hatched' | 'sold' | 'died' | 'culled' | 'current'
  event_label: string
  chicken_id: string
  chicken_code: string
  name: string | null
  breed_name: string | null
  breed_code: string | null
  status: string
  amount: number | null
  counterparty: string | null
  reference: string | null
  notes: string | null
}

const CATEGORY_META: Record<
  string,
  { label: string; icon: string; tint: string; bgCell: string; isInflow: boolean; isOutflow: boolean }
> = {
  opening_stock: { label: 'Tồn đầu kỳ', icon: '📦', tint: 'blue', bgCell: 'text-blue-700 dark:text-blue-300', isInflow: false, isOutflow: false },
  purchased: { label: 'Mua vào', icon: '📥', tint: 'emerald', bgCell: 'text-emerald-700 dark:text-emerald-300', isInflow: true, isOutflow: false },
  hatched: { label: 'Nở tại trại', icon: '🐣', tint: 'teal', bgCell: 'text-teal-700 dark:text-teal-300', isInflow: true, isOutflow: false },
  sold: { label: 'Đã bán', icon: '💰', tint: 'green', bgCell: 'text-green-700 dark:text-green-300', isInflow: false, isOutflow: true },
  died: { label: 'Chết', icon: '💀', tint: 'red', bgCell: 'text-red-700 dark:text-red-300', isInflow: false, isOutflow: true },
  culled: { label: 'Loại thải', icon: '⚰', tint: 'rose', bgCell: 'text-rose-700 dark:text-rose-300', isInflow: false, isOutflow: true },
  closing_stock: { label: 'Tồn cuối kỳ', icon: '📦', tint: 'indigo', bgCell: 'text-indigo-700 dark:text-indigo-300', isInflow: false, isOutflow: false },
}

const EVENT_COLORS: Record<string, string> = {
  purchased: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300',
  hatched: 'bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-300',
  sold: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300',
  died: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300',
  culled: 'bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300',
  current: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300',
}

const today = new Date()
const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
const todayIso = today.toISOString().slice(0, 10)

export function InventoryReport() {
  const [from, setFrom] = useState(firstOfMonth)
  const [to, setTo] = useState(todayIso)
  const [tab, setTab] = useState<'summary' | 'detail'>('summary')

  // Summary data
  const [summary, setSummary] = useState<SummaryRow[]>([])
  // Detail data
  const [events, setEvents] = useState<DetailEvent[]>([])
  const [loading, setLoading] = useState(false)

  // Filters for detail tab
  const [q, setQ] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [breedFilter, setBreedFilter] = useState<string>('')

  // Export state
  const [exportingSum, setExportingSum] = useState<'excel' | 'pdf' | null>(null)
  const [exportingDet, setExportingDet] = useState<'excel' | 'pdf' | null>(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/finance/reports/inventory?from=${from}&to=${to}`).then((r) => r.json()),
      fetch(`/api/finance/reports/inventory-detail?from=${from}&to=${to}`).then((r) => r.json()),
    ])
      .then(([sRes, dRes]) => {
        setSummary((sRes.data ?? []) as SummaryRow[])
        setEvents((dRes.data ?? []) as DetailEvent[])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [from, to])

  const breedsInData = useMemo(() => {
    const s = new Map<string, string>()
    for (const e of events) {
      if (e.breed_code && e.breed_name) s.set(e.breed_code, e.breed_name)
    }
    return [...s.entries()].sort(([, a], [, b]) => a.localeCompare(b, 'vi'))
  }, [events])

  const filteredEvents = useMemo(() => {
    const qn = removeDiacritics(q.trim())
    return events.filter((e) => {
      if (typeFilter && e.event_type !== typeFilter) return false
      if (breedFilter && e.breed_code !== breedFilter) return false
      if (qn) {
        const hay = removeDiacritics(
          `${e.chicken_code} ${e.name ?? ''} ${e.breed_name ?? ''} ${e.counterparty ?? ''} ${e.reference ?? ''}`
        )
        if (!hay.includes(qn)) return false
      }
      return true
    })
  }, [events, q, typeFilter, breedFilter])

  // Summary aggregates
  const opening = summary.find((r) => r.category === 'opening_stock')?.count ?? 0
  const purchased = summary.find((r) => r.category === 'purchased')?.count ?? 0
  const hatched = summary.find((r) => r.category === 'hatched')?.count ?? 0
  const sold = summary.find((r) => r.category === 'sold')?.count ?? 0
  const died = summary.find((r) => r.category === 'died')?.count ?? 0
  const culled = summary.find((r) => r.category === 'culled')?.count ?? 0
  const closing =
    summary.find((r) => r.category === 'closing_stock')?.count ??
    opening + purchased + hatched - sold - died - culled
  const totalIn = purchased + hatched
  const totalOut = sold + died + culled
  const mortality = opening + totalIn > 0 ? ((died + culled) / (opening + totalIn)) * 100 : 0

  // Detail aggregates (for sub-sections)
  const inflowEvents = filteredEvents.filter((e) =>
    ['purchased', 'hatched'].includes(e.event_type)
  )
  const outflowEvents = filteredEvents.filter((e) =>
    ['sold', 'died', 'culled'].includes(e.event_type)
  )
  const currentEvents = filteredEvents.filter((e) => e.event_type === 'current')
  const inflowAmount = inflowEvents.reduce((s, e) => s + (e.amount ?? 0), 0)
  const outflowAmount = outflowEvents.reduce((s, e) => s + (e.amount ?? 0), 0)

  function presetRange(preset: 'this_month' | 'last_month' | 'this_year' | '30d' | '90d') {
    const now = new Date()
    if (preset === 'this_month') {
      setFrom(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10))
      setTo(todayIso)
    } else if (preset === 'last_month') {
      setFrom(new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10))
      setTo(new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10))
    } else if (preset === 'this_year') {
      setFrom(new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10))
      setTo(todayIso)
    } else if (preset === '30d') {
      setFrom(new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10))
      setTo(todayIso)
    } else if (preset === '90d') {
      setFrom(new Date(now.getTime() - 90 * 86400000).toISOString().slice(0, 10))
      setTo(todayIso)
    }
  }

  async function download(
    mode: 'summary' | 'detail',
    format: 'excel' | 'pdf'
  ) {
    const setter = mode === 'summary' ? setExportingSum : setExportingDet
    setter(format)
    try {
      const p = new URLSearchParams({ from, to, mode, format })
      if (mode === 'detail') {
        if (q.trim()) p.set('q', q.trim())
        if (typeFilter) p.set('type', typeFilter)
        if (breedFilter) p.set('breed_code', breedFilter)
      }
      const res = await fetch(`/api/finance/reports/inventory-detail/export?${p}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const href = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = href
      const ext = format === 'pdf' ? 'pdf' : 'xlsx'
      a.download = `nxt-${mode === 'summary' ? 'tong-hop' : 'chi-tiet'}_${from}_${to}.${ext}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(href)
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e))
    } finally {
      setter(null)
    }
  }

  function printReport() {
    window.print()
  }

  const hasFilter = !!(q || typeFilter || breedFilter)

  return (
    <div className="space-y-4">
      {/* ===== GLOBAL FILTER (date range) — hidden on print ===== */}
      <div className="print:hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 md:p-5 shadow-sm">
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
                type="button"
                onClick={() => presetRange(k)}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 font-semibold"
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ===== TAB HEADER — hidden on print ===== */}
      <div className="print:hidden flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {([
          ['summary', '📊 Tổng hợp'],
          ['detail', '📋 Chi tiết nhập xuất tồn'],
        ] as const).map(([k, label]) => (
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

      {loading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">⏳ Đang tải...</div>
      ) : tab === 'summary' ? (
        <SummaryView
          periodLabel={`${new Date(from).toLocaleDateString('vi-VN')} → ${new Date(to).toLocaleDateString('vi-VN')}`}
          opening={opening}
          purchased={purchased}
          hatched={hatched}
          sold={sold}
          died={died}
          culled={culled}
          closing={closing}
          totalIn={totalIn}
          totalOut={totalOut}
          mortality={mortality}
          onPrint={printReport}
          onExport={(format) => download('summary', format)}
          exporting={exportingSum}
        />
      ) : (
        <DetailView
          periodLabel={`${new Date(from).toLocaleDateString('vi-VN')} → ${new Date(to).toLocaleDateString('vi-VN')}`}
          q={q}
          setQ={setQ}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          breedFilter={breedFilter}
          setBreedFilter={setBreedFilter}
          breedsInData={breedsInData}
          hasFilter={hasFilter}
          onClearFilters={() => {
            setQ('')
            setTypeFilter('')
            setBreedFilter('')
          }}
          inflowEvents={inflowEvents}
          outflowEvents={outflowEvents}
          currentEvents={currentEvents}
          inflowAmount={inflowAmount}
          outflowAmount={outflowAmount}
          onPrint={printReport}
          onExport={(format) => download('detail', format)}
          exporting={exportingDet}
        />
      )}

      {/* Print styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
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

/* ============================================================== */
/*                     SUMMARY VIEW                                 */
/* ============================================================== */
function SummaryView({
  periodLabel,
  opening,
  purchased,
  hatched,
  sold,
  died,
  culled,
  closing,
  totalIn,
  totalOut,
  mortality,
  onPrint,
  onExport,
  exporting,
}: {
  periodLabel: string
  opening: number
  purchased: number
  hatched: number
  sold: number
  died: number
  culled: number
  closing: number
  totalIn: number
  totalOut: number
  mortality: number
  onPrint: () => void
  onExport: (format: 'excel' | 'pdf') => void
  exporting: 'excel' | 'pdf' | null
}) {
  return (
    <>
      {/* Actions */}
      <div className="print:hidden flex items-center justify-end gap-2 flex-wrap">
        <button
          onClick={onPrint}
          className="inline-flex items-center gap-1.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-3 py-2 text-sm font-semibold shadow-sm"
        >
          🖨 In báo cáo
        </button>
        <button
          onClick={() => onExport('excel')}
          disabled={!!exporting}
          className="inline-flex items-center gap-1.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg px-3 py-2 text-sm font-bold shadow-sm disabled:opacity-50"
        >
          {exporting === 'excel' ? '⏳' : '📥'} Excel
        </button>
        <button
          onClick={() => onExport('pdf')}
          disabled={!!exporting}
          className="inline-flex items-center gap-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-lg px-3 py-2 text-sm font-bold shadow-sm disabled:opacity-50"
        >
          {exporting === 'pdf' ? '⏳' : '📄'} PDF
        </button>
      </div>

      {/* Printable content */}
      <article className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden print:shadow-none print:border-0">
        <div className="px-6 py-5 bg-gradient-to-r from-blue-50 via-white to-indigo-50 dark:from-blue-950/30 dark:via-gray-800 dark:to-indigo-950/30 print:bg-white border-b border-blue-200 dark:border-blue-900 text-center">
          <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
            Báo cáo tổng hợp nhập xuất tồn
          </h2>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Kỳ báo cáo: <b className="text-gray-700 dark:text-gray-300">{periodLabel}</b>
          </div>
        </div>

        <div className="p-4 md:p-6 space-y-6">
          {/* Key balance equation visualization */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <BalanceCard label="Tồn đầu kỳ" value={opening} tint="blue" icon="📦" />
            <OpCard op="+" />
            <BalanceCard label="Tổng nhập" value={totalIn} tint="emerald" icon="📥" sub={`Mua ${purchased} · Nở ${hatched}`} />
            <OpCard op="−" label="xuất" />
            <BalanceCard label="Tồn cuối kỳ" value={closing} tint="indigo" icon="📊" bold />
          </div>

          {/* Flow breakdown grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* NHẬP */}
            <div className="border border-emerald-200 dark:border-emerald-900 rounded-xl overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-600 to-green-600 text-white px-4 py-2.5 font-bold text-sm flex items-center justify-between">
                <span>📥 NHẬP ({totalIn} con)</span>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  <TrRow icon="🏪" label="Mua vào" value={purchased} sub="Từ NCC ngoài" />
                  <TrRow icon="🐣" label="Nở tại trại" value={hatched} sub="Từ lứa ấp nội bộ" />
                  <TrRow
                    icon="Σ"
                    label="TỔNG NHẬP"
                    value={totalIn}
                    highlight
                  />
                </tbody>
              </table>
            </div>

            {/* XUẤT */}
            <div className="border border-red-200 dark:border-red-900 rounded-xl overflow-hidden">
              <div className="bg-gradient-to-r from-red-600 to-rose-600 text-white px-4 py-2.5 font-bold text-sm flex items-center justify-between">
                <span>📤 XUẤT ({totalOut} con)</span>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  <TrRow icon="💰" label="Đã bán" value={sold} sub="Giao cho khách" />
                  <TrRow icon="💀" label="Chết" value={died} sub="Do bệnh / tai nạn" />
                  <TrRow icon="⚰" label="Loại thải" value={culled} sub="Không đạt chuẩn" />
                  <TrRow
                    icon="Σ"
                    label="TỔNG XUẤT"
                    value={totalOut}
                    highlight
                  />
                </tbody>
              </table>
            </div>
          </div>

          {/* Mortality KPI */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 print:bg-amber-50 border border-amber-200 dark:border-amber-900 rounded-xl p-4 flex items-center justify-between gap-4">
            <div>
              <div className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-widest">
                Tỉ lệ hao hụt
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                (Chết + Loại) / (Tồn đầu + Tổng nhập) × 100%
              </div>
            </div>
            <div
              className={`text-3xl font-extrabold tabular-nums ${
                mortality > 10
                  ? 'text-red-600 dark:text-red-400'
                  : mortality > 5
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-green-600 dark:text-green-400'
              }`}
            >
              {mortality.toFixed(1)}%
            </div>
          </div>

          {/* Balance formula */}
          <div className="bg-gray-50 dark:bg-gray-900 print:bg-gray-50 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 text-center font-mono text-sm">
            <span className="text-blue-700 dark:text-blue-400 font-bold">{opening}</span>
            <span className="text-gray-500 mx-2">(đầu kỳ)</span>
            <span className="text-emerald-700 dark:text-emerald-400"> + {totalIn}</span>
            <span className="text-gray-500 mx-1">(nhập)</span>
            <span className="text-red-700 dark:text-red-400"> − {totalOut}</span>
            <span className="text-gray-500 mx-1">(xuất)</span>
            <span className="text-gray-500 mx-1">=</span>
            <span className="text-indigo-700 dark:text-indigo-400 font-bold text-lg">
              {closing}
            </span>
            <span className="text-gray-500 ml-1">(cuối kỳ)</span>
          </div>
        </div>
      </article>
    </>
  )
}

function BalanceCard({
  label,
  value,
  tint,
  icon,
  sub,
  bold,
}: {
  label: string
  value: number
  tint: 'blue' | 'emerald' | 'red' | 'indigo'
  icon: string
  sub?: string
  bold?: boolean
}) {
  const map: Record<string, string> = {
    blue: 'from-blue-500 to-indigo-600 border-blue-200 dark:border-blue-900',
    emerald: 'from-emerald-500 to-green-600 border-emerald-200 dark:border-emerald-900',
    red: 'from-red-500 to-rose-600 border-red-200 dark:border-red-900',
    indigo: 'from-indigo-500 to-purple-600 border-indigo-200 dark:border-indigo-900',
  }
  return (
    <div
      className={`bg-white dark:bg-gray-800 border-2 print:border print:border-gray-400 ${map[tint].split(' ').slice(-2).join(' ')} rounded-xl p-4 text-center relative overflow-hidden`}
    >
      <div
        className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${map[tint]}`}
      />
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
        {label}
      </div>
      <div
        className={`${bold ? 'text-3xl' : 'text-2xl'} font-extrabold text-gray-900 dark:text-gray-100 tabular-nums mt-1`}
      >
        {value}
      </div>
      {sub && (
        <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">{sub}</div>
      )}
    </div>
  )
}

function OpCard({ op, label }: { op: string; label?: string }) {
  return (
    <div className="hidden md:flex items-center justify-center flex-col text-gray-400 dark:text-gray-500">
      <div className="text-4xl font-bold">{op}</div>
      {label && (
        <div className="text-[10px] uppercase tracking-widest font-bold">{label}</div>
      )}
    </div>
  )
}

function TrRow({
  icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: string
  label: string
  value: number
  sub?: string
  highlight?: boolean
}) {
  return (
    <tr
      className={`border-t border-gray-100 dark:border-gray-700 ${highlight ? 'bg-gray-50 dark:bg-gray-900/60 print:bg-gray-50 font-bold' : ''}`}
    >
      <td className="px-4 py-2.5 w-8 text-center text-lg">{icon}</td>
      <td className="px-4 py-2.5">
        <div className={highlight ? 'font-bold text-gray-900 dark:text-gray-100' : 'font-medium'}>
          {label}
        </div>
        {sub && <div className="text-[11px] text-gray-500 dark:text-gray-400">{sub}</div>}
      </td>
      <td className="px-4 py-2.5 text-right font-bold tabular-nums text-lg">{value}</td>
    </tr>
  )
}

/* ============================================================== */
/*                     DETAIL VIEW                                  */
/* ============================================================== */
function DetailView({
  periodLabel,
  q,
  setQ,
  typeFilter,
  setTypeFilter,
  breedFilter,
  setBreedFilter,
  breedsInData,
  hasFilter,
  onClearFilters,
  inflowEvents,
  outflowEvents,
  currentEvents,
  inflowAmount,
  outflowAmount,
  onPrint,
  onExport,
  exporting,
}: {
  periodLabel: string
  q: string
  setQ: (v: string) => void
  typeFilter: string
  setTypeFilter: (v: string) => void
  breedFilter: string
  setBreedFilter: (v: string) => void
  breedsInData: Array<[string, string]>
  hasFilter: boolean
  onClearFilters: () => void
  inflowEvents: DetailEvent[]
  outflowEvents: DetailEvent[]
  currentEvents: DetailEvent[]
  inflowAmount: number
  outflowAmount: number
  onPrint: () => void
  onExport: (format: 'excel' | 'pdf') => void
  exporting: 'excel' | 'pdf' | null
}) {
  // Group current by breed
  const currentByBreed = useMemo(() => {
    const m = new Map<string, { name: string; count: number; cost: number }>()
    for (const c of currentEvents) {
      const key = c.breed_code ?? 'unknown'
      const name = c.breed_name ?? '—'
      const cur = m.get(key) ?? { name, count: 0, cost: 0 }
      cur.count += 1
      cur.cost += c.amount ?? 0
      m.set(key, cur)
    }
    return [...m.values()].sort((a, b) => b.count - a.count)
  }, [currentEvents])

  return (
    <>
      {/* Filter bar + Actions — hidden on print */}
      <div className="print:hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-3">
          <div className="relative md:col-span-2">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">🔍</span>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm mã gà / tên / giống / khách / NCC..."
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg pl-9 pr-3 py-2 text-sm outline-none"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">📦 Mọi loại sự kiện</option>
            <option value="purchased">📥 Mua vào</option>
            <option value="hatched">🐣 Nở tại trại</option>
            <option value="sold">💰 Đã bán</option>
            <option value="died">💀 Chết</option>
            <option value="culled">⚰ Loại thải</option>
            <option value="current">📊 Tồn hiện tại</option>
          </select>
          <select
            value={breedFilter}
            onChange={(e) => setBreedFilter(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">🧬 Mọi giống</option>
            {breedsInData.map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            <b className="text-gray-900 dark:text-gray-100">
              {inflowEvents.length + outflowEvents.length + currentEvents.length}
            </b>{' '}
            sự kiện ({inflowEvents.length} nhập · {outflowEvents.length} xuất · {currentEvents.length} tồn)
            {hasFilter && (
              <button
                onClick={onClearFilters}
                className="ml-2 text-red-600 dark:text-red-400 hover:underline font-semibold"
              >
                ✕ Xóa lọc
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onPrint}
              className="inline-flex items-center gap-1.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-3 py-2 text-sm font-semibold"
            >
              🖨 In
            </button>
            <button
              onClick={() => onExport('excel')}
              disabled={!!exporting}
              className="inline-flex items-center gap-1.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg px-3 py-2 text-sm font-bold disabled:opacity-50"
            >
              {exporting === 'excel' ? '⏳' : '📥'} Excel
            </button>
            <button
              onClick={() => onExport('pdf')}
              disabled={!!exporting}
              className="inline-flex items-center gap-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-lg px-3 py-2 text-sm font-bold disabled:opacity-50"
            >
              {exporting === 'pdf' ? '⏳' : '📄'} PDF
            </button>
          </div>
        </div>
      </div>

      {/* Printable content */}
      <article className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm print:shadow-none print:border-0 overflow-hidden">
        <div className="px-6 py-5 bg-gradient-to-r from-indigo-50 via-white to-purple-50 dark:from-indigo-950/30 dark:via-gray-800 dark:to-purple-950/30 print:bg-white border-b border-indigo-200 dark:border-indigo-900 text-center">
          <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
            Báo cáo chi tiết nhập xuất tồn
          </h2>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Kỳ báo cáo: <b className="text-gray-700 dark:text-gray-300">{periodLabel}</b>
          </div>
        </div>

        <div className="p-4 md:p-6 space-y-6">
          {/* NHẬP SECTION */}
          <Section
            title="1. CHI TIẾT NHẬP"
            count={inflowEvents.length}
            amountLabel="Tổng chi mua"
            amount={inflowAmount}
            tint="emerald"
          >
            <DetailTable events={inflowEvents} columns="inflow" />
          </Section>

          {/* XUẤT SECTION */}
          <Section
            title="2. CHI TIẾT XUẤT"
            count={outflowEvents.length}
            amountLabel="Tổng doanh thu"
            amount={outflowAmount}
            tint="red"
          >
            <DetailTable events={outflowEvents} columns="outflow" />
          </Section>

          {/* TỒN CUỐI KỲ — summary by breed + detail list */}
          <Section title="3. TỒN CUỐI KỲ" count={currentEvents.length} tint="indigo">
            {currentByBreed.length > 0 && (
              <div className="mb-3 overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-indigo-50 dark:bg-indigo-950/40 text-[11px] uppercase text-indigo-800 dark:text-indigo-300">
                    <tr>
                      <th className="px-3 py-2 text-left">Giống</th>
                      <th className="px-3 py-2 text-right">Số con</th>
                      <th className="px-3 py-2 text-right">Giá vốn luỹ kế</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {currentByBreed.map((b, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 font-medium">{b.name}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{b.count}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-gray-700 dark:text-gray-300">
                          {formatVnd(b.cost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-indigo-50 dark:bg-indigo-950/40 font-bold">
                    <tr>
                      <td className="px-3 py-2 text-indigo-900 dark:text-indigo-200 uppercase">TỔNG</td>
                      <td className="px-3 py-2 text-right tabular-nums text-indigo-900 dark:text-indigo-200">
                        {currentEvents.length}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-indigo-900 dark:text-indigo-200">
                        {formatVnd(currentByBreed.reduce((s, b) => s + b.cost, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
            <DetailTable events={currentEvents.slice(0, 100)} columns="current" />
            {currentEvents.length > 100 && (
              <div className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2 italic">
                Hiển thị 100/{currentEvents.length} con. Tải file Excel/PDF để xem đầy đủ.
              </div>
            )}
          </Section>
        </div>
      </article>
    </>
  )
}

function Section({
  title,
  count,
  amountLabel,
  amount,
  tint,
  children,
}: {
  title: string
  count: number
  amountLabel?: string
  amount?: number
  tint: 'emerald' | 'red' | 'indigo'
  children: React.ReactNode
}) {
  const map: Record<string, string> = {
    emerald: 'from-emerald-600 to-green-600',
    red: 'from-red-600 to-rose-600',
    indigo: 'from-indigo-600 to-purple-600',
  }
  return (
    <div>
      <div
        className={`bg-gradient-to-r ${map[tint]} text-white px-4 py-2.5 rounded-t-lg flex items-center justify-between flex-wrap gap-2 print:bg-gray-100 print:text-gray-900`}
      >
        <h3 className="font-bold text-sm uppercase tracking-wide">{title}</h3>
        <div className="flex items-center gap-3 text-xs">
          <span className="bg-white/20 rounded-full px-2.5 py-0.5 font-semibold">
            {count} con
          </span>
          {amountLabel && amount != null && (
            <span className="bg-white/20 rounded-full px-2.5 py-0.5 font-semibold tabular-nums">
              {amountLabel}: {formatVnd(amount)}
            </span>
          )}
        </div>
      </div>
      <div className="border border-t-0 border-gray-200 dark:border-gray-700 rounded-b-lg p-3 md:p-4 bg-white dark:bg-gray-800 print:bg-white">
        {count === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-6">
            Không có dữ liệu trong kỳ
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}

function DetailTable({
  events,
  columns,
}: {
  events: DetailEvent[]
  columns: 'inflow' | 'outflow' | 'current'
}) {
  if (events.length === 0) return null
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-900/60 print:bg-gray-50 text-[11px] uppercase text-gray-500 dark:text-gray-400">
          <tr>
            <th className="px-3 py-2 text-left">Ngày</th>
            <th className="px-3 py-2 text-left">Loại</th>
            <th className="px-3 py-2 text-left">Mã gà</th>
            <th className="px-3 py-2 text-left">Tên</th>
            <th className="px-3 py-2 text-left">Giống</th>
            {columns !== 'current' && (
              <th className="px-3 py-2 text-left">
                {columns === 'inflow' ? 'NCC / Phiếu' : 'Khách / Mã đơn / Lý do'}
              </th>
            )}
            {columns !== 'current' && <th className="px-3 py-2 text-right">Giá (đ)</th>}
            {columns === 'current' && (
              <th className="px-3 py-2 text-right">Giá vốn (đ)</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {events.map((e, i) => (
            <tr key={`${e.chicken_id}-${e.event_type}-${i}`}>
              <td className="px-3 py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                {e.event_date ? new Date(e.event_date).toLocaleDateString('vi-VN') : '—'}
              </td>
              <td className="px-3 py-2">
                <span
                  className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    EVENT_COLORS[e.event_type] ?? 'bg-gray-100 dark:bg-gray-700'
                  }`}
                >
                  {e.event_label}
                </span>
              </td>
              <td className="px-3 py-2 font-mono text-xs">{e.chicken_code}</td>
              <td className="px-3 py-2">{e.name ?? '—'}</td>
              <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{e.breed_name ?? '—'}</td>
              {columns !== 'current' && (
                <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300">
                  {columns === 'inflow'
                    ? [e.counterparty, e.reference].filter(Boolean).join(' / ') || '—'
                    : e.event_type === 'sold'
                      ? [e.counterparty, e.reference].filter(Boolean).join(' / ') || '—'
                      : e.notes || '—'}
                </td>
              )}
              <td className="px-3 py-2 text-right font-semibold tabular-nums">
                {e.amount != null ? formatVnd(e.amount) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
