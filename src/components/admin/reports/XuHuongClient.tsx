'use client'

import { useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { formatVnd } from '@/lib/utils/format'

const TrendsChart = dynamic(() => import('@/components/admin/reports/TrendsChart'), {
  ssr: false,
})

export type TrendRow = {
  month: string
  revenue: string | number
  expenses: string | number
  cogs: string | number
  net_profit: string | number
  chickens_sold: string | number
  chickens_died: string | number
}

type SortKey = 'month_asc' | 'month_desc' | 'revenue_desc' | 'profit_desc' | 'profit_asc'

export function XuHuongClient({ rows }: { rows: TrendRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('month_asc')

  const sorted = useMemo(() => {
    const list = [...rows]
    list.sort((a, b) => {
      if (sortKey === 'month_desc') return b.month.localeCompare(a.month)
      if (sortKey === 'revenue_desc') return Number(b.revenue) - Number(a.revenue)
      if (sortKey === 'profit_desc') return Number(b.net_profit) - Number(a.net_profit)
      if (sortKey === 'profit_asc') return Number(a.net_profit) - Number(b.net_profit)
      return a.month.localeCompare(b.month)
    })
    return list
  }, [rows, sortKey])

  const stats = useMemo(() => {
    if (rows.length === 0) {
      return {
        totalRev: 0,
        totalProfit: 0,
        avgProfit: 0,
        bestMonth: null as TrendRow | null,
        worstMonth: null as TrendRow | null,
        revenueGrowth: 0,
        profitGrowth: 0,
        totalSold: 0,
        totalDied: 0,
      }
    }
    const sortedByMonth = [...rows].sort((a, b) => a.month.localeCompare(b.month))
    const totalRev = sortedByMonth.reduce((s, r) => s + Number(r.revenue), 0)
    const totalProfit = sortedByMonth.reduce((s, r) => s + Number(r.net_profit), 0)
    const totalSold = sortedByMonth.reduce((s, r) => s + Number(r.chickens_sold), 0)
    const totalDied = sortedByMonth.reduce((s, r) => s + Number(r.chickens_died), 0)
    const avgProfit = totalProfit / sortedByMonth.length
    let bestMonth = sortedByMonth[0]
    let worstMonth = sortedByMonth[0]
    for (const r of sortedByMonth) {
      if (Number(r.net_profit) > Number(bestMonth.net_profit)) bestMonth = r
      if (Number(r.net_profit) < Number(worstMonth.net_profit)) worstMonth = r
    }
    const last = sortedByMonth[sortedByMonth.length - 1]
    const prev = sortedByMonth[sortedByMonth.length - 2]
    const revenueGrowth =
      prev && Number(prev.revenue) > 0
        ? ((Number(last.revenue) - Number(prev.revenue)) / Number(prev.revenue)) * 100
        : 0
    const profitGrowth =
      prev && Number(prev.net_profit) !== 0
        ? ((Number(last.net_profit) - Number(prev.net_profit)) / Math.abs(Number(prev.net_profit))) *
          100
        : 0
    return {
      totalRev,
      totalProfit,
      avgProfit,
      bestMonth,
      worstMonth,
      revenueGrowth,
      profitGrowth,
      totalSold,
      totalDied,
    }
  }, [rows])

  const maxRev = Math.max(1, ...rows.map((r) => Number(r.revenue)))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Kpi
          label="Tổng doanh thu 6 tháng"
          value={formatVnd(stats.totalRev)}
          icon="💵"
          tone="from-blue-500 to-indigo-500"
          small
        />
        <Kpi
          label="Tổng lãi 6 tháng"
          value={formatVnd(stats.totalProfit)}
          icon={stats.totalProfit >= 0 ? '📈' : '📉'}
          tone={
            stats.totalProfit >= 0 ? 'from-emerald-500 to-teal-500' : 'from-rose-500 to-red-500'
          }
          small
          pulse={stats.totalProfit < 0}
        />
        <Kpi
          label="Lãi TB / tháng"
          value={formatVnd(stats.avgProfit)}
          icon="⚖️"
          tone="from-violet-500 to-purple-500"
          small
        />
        <Kpi
          label="Tăng trưởng tháng cuối"
          value={`${stats.revenueGrowth >= 0 ? '+' : ''}${stats.revenueGrowth.toFixed(1)}%`}
          icon={stats.revenueGrowth >= 0 ? '🚀' : '⚠️'}
          tone={
            stats.revenueGrowth >= 0
              ? 'from-emerald-500 to-teal-500'
              : 'from-rose-500 to-red-500'
          }
          sub="Doanh thu so kỳ trước"
          small
        />
        <Kpi
          label="Bán / Chết"
          value={`${stats.totalSold} / ${stats.totalDied}`}
          icon="🐓"
          tone="from-amber-500 to-orange-500"
          small
          sub={`Tỷ lệ chết ${
            stats.totalSold + stats.totalDied > 0
              ? ((stats.totalDied / (stats.totalSold + stats.totalDied)) * 100).toFixed(1)
              : 0
          }%`}
        />
      </div>

      {(stats.bestMonth || stats.worstMonth) && rows.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {stats.bestMonth && Number(stats.bestMonth.net_profit) >= 0 && (
            <HighlightMonth title="🏆 Tháng tốt nhất" row={stats.bestMonth} tone="emerald" />
          )}
          {stats.worstMonth && Number(stats.worstMonth.net_profit) < 0 && (
            <HighlightMonth title="⚠️ Tháng lỗ" row={stats.worstMonth} tone="rose" />
          )}
        </div>
      )}

      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-violet-400 to-purple-500" />
        <div className="p-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <span>📊</span> Composed chart 6 tháng
          </h2>
          <TrendsChart data={rows} />
        </div>
      </section>

      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            📋 Số liệu chi tiết
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {[
              { k: 'month_asc' as const, label: '📅 Tháng tăng dần' },
              { k: 'month_desc' as const, label: '📅 Tháng giảm dần' },
              { k: 'revenue_desc' as const, label: '💵 Doanh thu cao' },
              { k: 'profit_desc' as const, label: '📈 Lãi cao' },
              { k: 'profit_asc' as const, label: '📉 Lỗ nặng' },
            ].map((s) => {
              const active = sortKey === s.k
              return (
                <button
                  key={s.k}
                  onClick={() => setSortKey(s.k)}
                  className={
                    'px-3 py-1.5 rounded-full text-xs font-medium border transition ' +
                    (active
                      ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white border-transparent shadow'
                      : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-violet-400')
                  }
                >
                  {s.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900 text-xs uppercase text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-3 py-2.5 text-left">Tháng</th>
                <th className="px-3 py-2.5 text-right">Doanh thu</th>
                <th className="px-3 py-2.5 text-right">Giá vốn</th>
                <th className="px-3 py-2.5 text-right">Chi phí</th>
                <th className="px-3 py-2.5 text-right">Lãi ròng</th>
                <th className="px-3 py-2.5 text-right">Bán</th>
                <th className="px-3 py-2.5 text-right">Chết</th>
                <th className="px-3 py-2.5 text-left">Mức doanh thu</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-8 text-center text-gray-500 dark:text-gray-400"
                  >
                    Chưa có dữ liệu trong 6 tháng gần nhất.
                  </td>
                </tr>
              ) : (
                sorted.map((r) => {
                  const profit = Number(r.net_profit)
                  const revPct = (Number(r.revenue) / maxRev) * 100
                  return (
                    <tr
                      key={r.month}
                      className={
                        'border-t border-gray-100 dark:border-gray-700 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 ' +
                        (profit < 0 ? 'bg-rose-50/40 dark:bg-rose-950/10' : '')
                      }
                    >
                      <td className="px-3 py-2 font-mono font-semibold text-gray-900 dark:text-gray-100">
                        {r.month}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-blue-700 dark:text-blue-300 font-medium">
                        {formatVnd(Number(r.revenue))}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-amber-700 dark:text-amber-300">
                        {formatVnd(Number(r.cogs))}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-rose-700 dark:text-rose-300">
                        {formatVnd(Number(r.expenses))}
                      </td>
                      <td
                        className={
                          'px-3 py-2 text-right tabular-nums font-bold ' +
                          (profit >= 0
                            ? 'text-emerald-700 dark:text-emerald-300'
                            : 'text-rose-700 dark:text-rose-300')
                        }
                      >
                        {profit >= 0 ? '+' : ''}
                        {formatVnd(profit)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {Number(r.chickens_sold)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-rose-600 dark:text-rose-400">
                        {Number(r.chickens_died)}
                      </td>
                      <td className="px-3 py-2 min-w-[120px]">
                        <div className="h-1.5 rounded-full bg-blue-100/60 dark:bg-blue-950/30 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-400 to-indigo-500"
                            style={{ width: `${revPct}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function HighlightMonth({
  title,
  row,
  tone,
}: {
  title: string
  row: TrendRow
  tone: 'emerald' | 'rose'
}) {
  const isProfit = tone === 'emerald'
  const cls = isProfit
    ? 'from-emerald-500 to-teal-500 border-emerald-200 dark:border-emerald-900 bg-emerald-50/60 dark:bg-emerald-950/30'
    : 'from-rose-500 to-red-500 border-rose-200 dark:border-rose-900 bg-rose-50/60 dark:bg-rose-950/30'
  return (
    <div className={`relative overflow-hidden rounded-xl border ${cls} p-4`}>
      <div
        className={`absolute -right-10 -top-10 w-40 h-40 rounded-full bg-gradient-to-br ${
          isProfit ? 'from-emerald-300 to-teal-400' : 'from-rose-300 to-red-400'
        } opacity-25 blur-3xl`}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <div
            className={`text-xs font-semibold mb-1 ${
              isProfit ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
            }`}
          >
            {title}
          </div>
          <div className="font-mono text-xl font-bold text-gray-900 dark:text-gray-100">
            {row.month}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
            DT {formatVnd(Number(row.revenue))} · CP {formatVnd(Number(row.expenses))}
          </div>
        </div>
        <div className="text-right whitespace-nowrap">
          <div
            className={
              'text-2xl font-bold tabular-nums ' +
              (isProfit
                ? 'text-emerald-700 dark:text-emerald-300'
                : 'text-rose-700 dark:text-rose-300')
            }
          >
            {Number(row.net_profit) >= 0 ? '+' : ''}
            {formatVnd(Number(row.net_profit))}
          </div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400">
            Bán {Number(row.chickens_sold)} · Chết {Number(row.chickens_died)}
          </div>
        </div>
      </div>
    </div>
  )
}

function Kpi({
  label,
  value,
  icon,
  tone,
  pulse,
  sub,
  small,
}: {
  label: string
  value: string
  icon: string
  tone: string
  pulse?: boolean
  sub?: string
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
        {sub && (
          <div className="text-[10.5px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
            {sub}
          </div>
        )}
      </div>
    </div>
  )
}
