'use client'

import { useEffect, useMemo, useState } from 'react'
import { formatVnd } from '@/lib/utils/format'

type Row = { line_item: string; amount: number; category: string }
type PnLData = {
  revenue: Row[]
  cogs: Row[]
  opex: Row[]
  totals: {
    revenue: number
    cogs: number
    gross_profit: number
    opex: number
    net_profit: number
  }
}

type RangeKey = 'this_month' | 'last_month' | 'q' | 'ytd' | '7d' | '30d' | '90d' | 'custom'

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function rangeFor(key: RangeKey): { from: string; to: string } | null {
  const today = new Date()
  if (key === 'this_month') {
    return {
      from: fmtDate(new Date(today.getFullYear(), today.getMonth(), 1)),
      to: fmtDate(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
    }
  }
  if (key === 'last_month') {
    return {
      from: fmtDate(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
      to: fmtDate(new Date(today.getFullYear(), today.getMonth(), 0)),
    }
  }
  if (key === 'q') {
    const qStart = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1)
    return { from: fmtDate(qStart), to: fmtDate(today) }
  }
  if (key === 'ytd') {
    return { from: `${today.getFullYear()}-01-01`, to: fmtDate(today) }
  }
  if (key === '7d') {
    const f = new Date(today.getTime() - 7 * 86400_000)
    return { from: fmtDate(f), to: fmtDate(today) }
  }
  if (key === '30d') {
    const f = new Date(today.getTime() - 30 * 86400_000)
    return { from: fmtDate(f), to: fmtDate(today) }
  }
  if (key === '90d') {
    const f = new Date(today.getTime() - 90 * 86400_000)
    return { from: fmtDate(f), to: fmtDate(today) }
  }
  return null
}

const RANGE_CHIPS: { k: RangeKey; label: string }[] = [
  { k: 'this_month', label: '📆 Tháng này' },
  { k: 'last_month', label: '↩ Tháng trước' },
  { k: 'q', label: '🗓 Quý này' },
  { k: 'ytd', label: '📅 YTD' },
  { k: '7d', label: '⏱ 7N' },
  { k: '30d', label: '🗓️ 30N' },
  { k: '90d', label: '🧮 90N' },
]

export function PnLReport() {
  const initial = rangeFor('this_month')!
  const [from, setFrom] = useState(initial.from)
  const [to, setTo] = useState(initial.to)
  const [range, setRange] = useState<RangeKey>('this_month')
  const [data, setData] = useState<PnLData | null>(null)
  const [loading, setLoading] = useState(false)
  const [hideZero, setHideZero] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/finance/reports/pnl?from=${from}&to=${to}`)
      .then((r) => r.json())
      .then((j) => {
        setData(j.data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [from, to])

  function applyRange(k: RangeKey) {
    setRange(k)
    if (k === 'custom') return
    const r = rangeFor(k)
    if (r) {
      setFrom(r.from)
      setTo(r.to)
    }
  }

  const grossMargin = useMemo(() => {
    if (!data || data.totals.revenue === 0) return 0
    return (data.totals.gross_profit / data.totals.revenue) * 100
  }, [data])

  const netMargin = useMemo(() => {
    if (!data || data.totals.revenue === 0) return 0
    return (data.totals.net_profit / data.totals.revenue) * 100
  }, [data])

  return (
    <div className="space-y-4">
      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
        <div className="flex items-center gap-2 flex-wrap">
          {RANGE_CHIPS.map((c) => {
            const active = range === c.k
            return (
              <button
                key={c.k}
                onClick={() => applyRange(c.k)}
                className={
                  'px-3 py-1.5 rounded-full text-xs font-medium border transition ' +
                  (active
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-transparent shadow'
                    : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-emerald-400')
                }
              >
                {c.label}
              </button>
            )
          })}
          <span className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />
          <input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value)
              setRange('custom')
            }}
            className="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-1.5"
          />
          <span className="text-gray-400">→</span>
          <input
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value)
              setRange('custom')
            }}
            className="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-1.5"
          />
          <label className="ml-auto inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={hideZero}
              onChange={(e) => setHideZero(e.target.checked)}
              className="w-3.5 h-3.5"
            />
            Ẩn dòng = 0
          </label>
        </div>
      </section>

      {loading ? (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-12 text-center text-gray-500 dark:text-gray-400">
          ⏳ Đang tải báo cáo…
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <Kpi
              label="Doanh thu"
              value={formatVnd(data.totals.revenue)}
              icon="💵"
              tone="from-blue-500 to-indigo-500"
              small
            />
            <Kpi
              label="Giá vốn (COGS)"
              value={formatVnd(data.totals.cogs)}
              icon="📦"
              tone="from-amber-500 to-orange-500"
              small
            />
            <Kpi
              label={`Lãi gộp · ${grossMargin.toFixed(1)}%`}
              value={formatVnd(data.totals.gross_profit)}
              icon="📊"
              tone={
                data.totals.gross_profit >= 0
                  ? 'from-emerald-500 to-teal-500'
                  : 'from-rose-500 to-red-500'
              }
              small
              pulse={data.totals.gross_profit < 0}
            />
            <Kpi
              label="Chi phí (OpEx)"
              value={formatVnd(data.totals.opex)}
              icon="🏢"
              tone="from-rose-500 to-red-500"
              small
            />
            <Kpi
              label={`Lãi ròng · ${netMargin.toFixed(1)}%`}
              value={formatVnd(data.totals.net_profit)}
              icon={data.totals.net_profit >= 0 ? '🎯' : '⚠️'}
              tone={
                data.totals.net_profit >= 0
                  ? 'from-emerald-500 to-teal-500'
                  : 'from-rose-500 to-red-600'
              }
              pulse={data.totals.net_profit < 0}
              small
            />
          </div>

          <Waterfall data={data} />

          <Section
            title="💰 Doanh thu"
            rows={data.revenue}
            total={data.totals.revenue}
            tone="emerald"
            hideZero={hideZero}
          />
          <Section
            title="📦 Giá vốn hàng bán"
            rows={data.cogs}
            total={data.totals.cogs}
            tone="amber"
            hideZero={hideZero}
          />

          <div
            className={
              'rounded-xl p-4 border-2 ' +
              (data.totals.gross_profit >= 0
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800')
            }
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Lãi gộp (Doanh thu − Giá vốn)
              </span>
              <span
                className={
                  'text-xl font-bold tabular-nums ' +
                  (data.totals.gross_profit >= 0
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-rose-700 dark:text-rose-300')
                }
              >
                {formatVnd(data.totals.gross_profit)}
              </span>
            </div>
          </div>

          <Section
            title="🏢 Chi phí hoạt động (OpEx)"
            rows={data.opex}
            total={data.totals.opex}
            tone="rose"
            hideZero={hideZero}
          />

          <div
            className={
              'rounded-xl p-5 border-2 shadow-md ' +
              (data.totals.net_profit >= 0
                ? 'bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-50 dark:from-emerald-950/40 dark:via-teal-950/40 dark:to-emerald-950/40 border-emerald-400 dark:border-emerald-700'
                : 'bg-gradient-to-br from-rose-50 via-red-50 to-rose-50 dark:from-rose-950/40 dark:via-red-950/40 dark:to-rose-950/40 border-rose-400 dark:border-rose-700')
            }
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                  Net Profit · Biên ròng {netMargin.toFixed(1)}%
                </div>
                <div className="text-base font-bold text-gray-900 dark:text-gray-100">
                  🎯 LÃI RÒNG
                </div>
              </div>
              <div className="text-right">
                <div
                  className={
                    'text-3xl font-bold tabular-nums ' +
                    (data.totals.net_profit >= 0
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : 'text-rose-700 dark:text-rose-300')
                  }
                >
                  {formatVnd(data.totals.net_profit)}
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  Doanh thu − Giá vốn − Chi phí
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-10 text-center text-gray-500 dark:text-gray-400">
          Chưa có dữ liệu. Đổi khoảng thời gian hoặc tạo giao dịch trước.
        </div>
      )}
    </div>
  )
}

function Section({
  title,
  rows,
  total,
  tone,
  hideZero,
}: {
  title: string
  rows: Row[]
  total: number
  tone: 'emerald' | 'amber' | 'rose'
  hideZero: boolean
}) {
  const cls = {
    emerald: {
      bar: 'from-emerald-400 to-teal-500',
      text: 'text-emerald-700 dark:text-emerald-300',
      bg: 'bg-emerald-50/50 dark:bg-emerald-950/20',
    },
    amber: {
      bar: 'from-amber-400 to-orange-500',
      text: 'text-amber-700 dark:text-amber-300',
      bg: 'bg-amber-50/50 dark:bg-amber-950/20',
    },
    rose: {
      bar: 'from-rose-400 to-red-500',
      text: 'text-rose-700 dark:text-rose-300',
      bg: 'bg-rose-50/50 dark:bg-rose-950/20',
    },
  }[tone]

  const visible = hideZero ? rows.filter((r) => Number(r.amount) !== 0) : rows
  const max = Math.max(1, ...visible.map((r) => Math.abs(Number(r.amount))))

  return (
    <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <div className={`h-1.5 bg-gradient-to-r ${cls.bar}`} />
      <div className="p-4">
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          <span className={`text-base font-bold tabular-nums ${cls.text}`}>{formatVnd(total)}</span>
        </div>
        {visible.length === 0 ? (
          <p className="text-xs italic text-gray-500 dark:text-gray-400 text-center py-3">
            Không có khoản nào
          </p>
        ) : (
          <ul className="space-y-1">
            {visible.map((r, i) => {
              const v = Number(r.amount)
              const pct = (Math.abs(v) / max) * 100
              return (
                <li key={i} className="text-sm">
                  <div className="flex items-baseline justify-between gap-2 mb-0.5">
                    <span className="text-gray-700 dark:text-gray-300 truncate">{r.line_item}</span>
                    <span className={`tabular-nums font-medium ${cls.text}`}>{formatVnd(v)}</span>
                  </div>
                  <div className={`h-1 rounded-full ${cls.bg}`}>
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${cls.bar}`}
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
  )
}

function Waterfall({ data }: { data: PnLData }) {
  const total = Math.max(
    Math.abs(data.totals.revenue),
    Math.abs(data.totals.net_profit) * 1.2,
    1
  )
  const steps = [
    {
      label: 'Doanh thu',
      value: data.totals.revenue,
      cls: 'from-blue-500 to-indigo-500',
      sign: '+',
    },
    {
      label: 'Giá vốn',
      value: data.totals.cogs,
      cls: 'from-amber-500 to-orange-500',
      sign: '−',
    },
    {
      label: 'Lãi gộp',
      value: data.totals.gross_profit,
      cls:
        data.totals.gross_profit >= 0
          ? 'from-emerald-500 to-teal-500'
          : 'from-rose-500 to-red-500',
      sign: '=',
    },
    {
      label: 'Chi phí',
      value: data.totals.opex,
      cls: 'from-rose-500 to-red-500',
      sign: '−',
    },
    {
      label: 'Lãi ròng',
      value: data.totals.net_profit,
      cls:
        data.totals.net_profit >= 0
          ? 'from-emerald-500 to-teal-500'
          : 'from-rose-500 to-red-500',
      sign: '=',
    },
  ]
  return (
    <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
        🌊 Waterfall — Từ doanh thu đến lãi ròng
      </h3>
      <div className="grid grid-cols-5 gap-2">
        {steps.map((s, i) => {
          const pct = Math.max(4, (Math.abs(s.value) / total) * 100)
          return (
            <div key={i} className="flex flex-col">
              <div className="flex-1 flex items-end h-28">
                <div
                  className={`w-full rounded-t-md bg-gradient-to-t ${s.cls} shadow-sm`}
                  style={{ height: `${pct}%` }}
                  title={formatVnd(s.value)}
                />
              </div>
              <div className="mt-1 text-center">
                <div className="text-[10.5px] text-gray-500 dark:text-gray-400 truncate">
                  {s.sign} {s.label}
                </div>
                <div className="text-xs font-bold tabular-nums text-gray-700 dark:text-gray-300">
                  {formatVnd(s.value)}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function Kpi({
  label,
  value,
  icon,
  tone,
  pulse,
  small,
}: {
  label: string
  value: string
  icon: string
  tone: string
  pulse?: boolean
  small?: boolean
}) {
  return (
    <div className="relative overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3.5">
      <div
        className={`absolute -right-6 -top-6 w-20 h-20 rounded-full bg-gradient-to-br ${tone} opacity-15 blur-xl ${
          pulse ? 'animate-pulse' : ''
        }`}
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
      </div>
    </div>
  )
}
