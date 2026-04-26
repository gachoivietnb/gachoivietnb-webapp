'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { formatVnd } from '@/lib/utils/format'

export type MonthSeries = {
  key: string
  label: string
  revenue: number
  expense: number
  profit: number
  sales_count: number
  expense_count: number
}

export type TopReceivable = {
  customer_id: string
  customer_name: string
  phone: string | null
  total_due: number
  orders: number
  oldest_days: number
  ordersOverdue: number
}

export type CategoryBreakdown = {
  name: string
  amount: number
}

type RangePreset = 'this_month' | 'last_month' | 'q3' | 'q6' | 'all'

const PRESET_LABEL: Record<RangePreset, string> = {
  this_month: 'Tháng này',
  last_month: 'Tháng trước',
  q3: '3 tháng',
  q6: '6 tháng',
  all: 'Toàn bộ',
}

export type TreasurySummary = {
  totalBalance: number
  accountCount: number
  todayIn: number
  todayOut: number
  topAccounts: Array<{
    id: string
    name: string
    icon: string
    color: string
    current_balance: number
  }>
}

export function TaiChinhDashboard({
  monthlySeries,
  topReceivables,
  categoryBreakdown,
  pendingCount,
  pendingTotal,
  pendingPaid,
  pendingDeposit,
  currentMonthLabel,
  treasury,
}: {
  monthlySeries: MonthSeries[]
  topReceivables: TopReceivable[]
  categoryBreakdown: CategoryBreakdown[]
  pendingCount: number
  pendingTotal: number
  pendingPaid: number
  pendingDeposit: number
  currentMonthLabel: string
  treasury?: TreasurySummary | null
}) {
  const [preset, setPreset] = useState<RangePreset>('this_month')

  const visibleSeries = useMemo(() => {
    if (preset === 'this_month') return monthlySeries.slice(-1)
    if (preset === 'last_month') return monthlySeries.slice(-2, -1)
    if (preset === 'q3') return monthlySeries.slice(-3)
    if (preset === 'q6') return monthlySeries
    return monthlySeries
  }, [monthlySeries, preset])

  const totalRevenue = visibleSeries.reduce((s, m) => s + m.revenue, 0)
  const totalExpense = visibleSeries.reduce((s, m) => s + m.expense, 0)
  const totalProfit = totalRevenue - totalExpense
  const totalSales = visibleSeries.reduce((s, m) => s + m.sales_count, 0)
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0
  const avgRevenuePerMonth = visibleSeries.length > 0 ? totalRevenue / visibleSeries.length : 0

  // Comparison: this month vs last month (always available)
  const thisM = monthlySeries[monthlySeries.length - 1]
  const lastM = monthlySeries[monthlySeries.length - 2]
  const changeRevenue =
    lastM && lastM.revenue > 0 ? ((thisM.revenue - lastM.revenue) / lastM.revenue) * 100 : 0

  const totalReceivable = topReceivables.reduce((s, r) => s + r.total_due, 0)
  const overdueCount = topReceivables.filter((r) => r.ordersOverdue > 0).length

  // Max value for bar chart scale
  const maxBar = Math.max(
    1,
    ...monthlySeries.map((m) => Math.max(m.revenue, m.expense))
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
            💼 Tài chính
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Tổng quan dòng tiền · Báo cáo + công nợ · Phân tích chi phí
          </p>
        </div>

        {/* Range preset */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5 flex-wrap">
          {(['this_month', 'last_month', 'q3', 'q6'] as const).map((k) => (
            <button
              key={k}
              onClick={() => setPreset(k)}
              className={`text-xs px-3 py-1.5 rounded font-semibold transition ${
                preset === k
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              {PRESET_LABEL[k]}
            </button>
          ))}
        </div>
      </div>

      {/* Treasury banner — link sang module Quỹ */}
      {treasury && <TreasuryBanner data={treasury} />}

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi
          label="Doanh thu"
          value={formatVnd(totalRevenue)}
          sub={
            preset === 'this_month' && lastM
              ? changeRevenue >= 0
                ? `↑ ${changeRevenue.toFixed(1)}% so tháng trước`
                : `↓ ${Math.abs(changeRevenue).toFixed(1)}%`
              : preset === 'q6' || preset === 'q3'
                ? `TB: ${formatVnd(avgRevenuePerMonth)}/tháng`
                : `${totalSales} đơn`
          }
          subTint={preset === 'this_month' && changeRevenue < 0 ? 'red' : 'emerald'}
          tint="emerald"
          icon="💰"
        />
        <Kpi
          label="Chi phí"
          value={formatVnd(totalExpense)}
          sub={`${categoryBreakdown.length} hạng mục`}
          tint="amber"
          icon="💸"
        />
        <Kpi
          label="Lợi nhuận"
          value={formatVnd(totalProfit)}
          sub={
            totalRevenue > 0
              ? `Biên: ${profitMargin.toFixed(1)}% ${profitMargin >= 0 ? '✓' : '⚠'}`
              : '—'
          }
          tint={totalProfit >= 0 ? 'blue' : 'red'}
          icon={totalProfit >= 0 ? '📈' : '📉'}
        />
        <Kpi
          label="Công nợ phải thu"
          value={formatVnd(totalReceivable)}
          sub={
            overdueCount > 0
              ? `⚠ ${overdueCount} khách quá hạn`
              : `${topReceivables.length} khách`
          }
          tint="red"
          icon="📋"
        />
      </div>

      {/* Trend chart 6 months */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            📊 Xu hướng 6 tháng — doanh thu vs chi phí
          </h2>
          <Link
            href="/admin/tai-chinh/bao-cao/xu-huong"
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold"
          >
            Xem báo cáo chi tiết →
          </Link>
        </div>

        <div className="grid grid-cols-6 gap-2 md:gap-4 mt-2">
          {monthlySeries.map((m) => {
            const revH = (m.revenue / maxBar) * 100
            const expH = (m.expense / maxBar) * 100
            const isProfit = m.profit >= 0
            return (
              <div key={m.key} className="flex flex-col items-center gap-2">
                <div className="text-[10px] font-bold text-gray-700 dark:text-gray-300 tabular-nums">
                  {m.profit >= 0 ? '+' : ''}{formatVnd(m.profit)}
                </div>
                <div className="relative flex items-end gap-1 h-32 w-full justify-center">
                  <div
                    className="w-1/3 bg-gradient-to-t from-emerald-500 to-green-500 rounded-t-md min-h-[2px] transition-all"
                    style={{ height: `${revH}%` }}
                    title={`Doanh thu: ${formatVnd(m.revenue)}`}
                  />
                  <div
                    className="w-1/3 bg-gradient-to-t from-red-500 to-rose-500 rounded-t-md min-h-[2px] transition-all"
                    style={{ height: `${expH}%` }}
                    title={`Chi phí: ${formatVnd(m.expense)}`}
                  />
                </div>
                <div className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 text-center">
                  {m.label}
                </div>
                <div className={`text-[9px] font-bold ${isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {isProfit ? '🟢 LÃI' : '🔴 LỖ'}
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex items-center gap-4 text-[11px] mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-gradient-to-t from-emerald-500 to-green-500" />
            <span className="text-gray-700 dark:text-gray-300 font-semibold">Doanh thu</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-gradient-to-t from-red-500 to-rose-500" />
            <span className="text-gray-700 dark:text-gray-300 font-semibold">Chi phí</span>
          </span>
        </div>
      </div>

      {/* 2 column: Expense breakdown + Top receivables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Expense breakdown */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-4 py-2.5 flex items-center justify-between">
            <h3 className="font-bold text-sm">💸 Chi phí theo hạng mục — {currentMonthLabel}</h3>
            <Link href="/admin/tai-chinh/chi-phi" className="text-[11px] bg-white/20 hover:bg-white/30 rounded-full px-2 py-0.5 font-semibold">
              + Thêm chi phí
            </Link>
          </div>
          {categoryBreakdown.length === 0 ? (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400 text-sm">
              Chưa có chi phí trong tháng
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {categoryBreakdown.slice(0, 8).map((c, i) => {
                const totalCat = categoryBreakdown.reduce((s, x) => s + x.amount, 0)
                const pct = totalCat > 0 ? (c.amount / totalCat) * 100 : 0
                const colors = [
                  'bg-amber-500',
                  'bg-orange-500',
                  'bg-red-500',
                  'bg-yellow-500',
                  'bg-pink-500',
                  'bg-fuchsia-500',
                  'bg-purple-500',
                  'bg-rose-500',
                ]
                return (
                  <div key={i} className="px-4 py-2.5">
                    <div className="flex items-center justify-between mb-1 text-sm">
                      <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">{c.name}</span>
                      <span className="font-extrabold tabular-nums text-amber-700 dark:text-amber-400 ml-2 shrink-0">
                        {formatVnd(c.amount)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${colors[i % colors.length]}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 tabular-nums text-right">
                      {pct.toFixed(1)}%
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Top debtors */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-red-600 to-rose-600 text-white px-4 py-2.5 flex items-center justify-between">
            <h3 className="font-bold text-sm">📋 Top khách đang nợ</h3>
            <Link href="/admin/tai-chinh/bao-cao/cong-no" className="text-[11px] bg-white/20 hover:bg-white/30 rounded-full px-2 py-0.5 font-semibold">
              Xem tất cả →
            </Link>
          </div>
          {topReceivables.length === 0 ? (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400 text-sm">
              ✓ Không có khách nào đang nợ
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {topReceivables.map((r) => {
                const isOverdue = r.ordersOverdue > 0
                const isBad = r.oldest_days > 90
                return (
                  <Link
                    key={r.customer_id}
                    href={`/admin/tai-chinh/bao-cao/cong-no/${r.customer_id}`}
                    className={`flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-900/40 transition ${
                      isBad ? 'bg-red-50/40 dark:bg-red-950/20' : ''
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
                      {r.customer_name.split(' ').slice(-1)[0]?.[0] ?? '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate text-sm">{r.customer_name}</div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-2">
                        {r.phone && <span>📞 {r.phone}</span>}
                        <span>·</span>
                        <span>{r.orders} đơn</span>
                        {isOverdue && (
                          <span className={`px-1.5 py-0 rounded font-bold ${isBad ? 'bg-red-200 dark:bg-red-900/60 text-red-800 dark:text-red-300' : 'bg-amber-200 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300'}`}>
                            {r.oldest_days}d
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`font-extrabold tabular-nums text-sm ${isOverdue ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300'}`}>
                        {formatVnd(r.total_due)}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Pending orders summary */}
      {pendingCount > 0 && (
        <div className="bg-gradient-to-r from-blue-50 via-white to-indigo-50 dark:from-blue-950/30 dark:via-gray-800 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-900 rounded-xl p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="text-2xl">⏳</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-widest">
                Đơn đang xử lý
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">
                <b>{pendingCount}</b> đơn (Hỏi mua + Đặt cọc) · Tổng giá trị{' '}
                <b className="text-blue-700 dark:text-blue-400">{formatVnd(pendingTotal)}</b> · Đã thu{' '}
                <b className="text-emerald-700 dark:text-emerald-400">{formatVnd(pendingPaid)}</b> (cọc{' '}
                {formatVnd(pendingDeposit)})
              </div>
            </div>
            <Link
              href="/admin/ban-ra"
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap shrink-0"
            >
              Xem đơn →
            </Link>
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3 uppercase tracking-wider">
          ⚡ Truy cập nhanh
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <ActionCard
            href="/admin/tai-chinh/chi-phi"
            icon="💸"
            title="Chi phí"
            sub="8 hạng mục"
            tint="from-amber-500 to-orange-600"
          />
          <ActionCard
            href="/admin/tai-chinh/bao-cao/pnl"
            icon="📈"
            title="P&L"
            sub="Lãi/lỗ chi tiết"
            tint="from-emerald-500 to-green-600"
          />
          <ActionCard
            href="/admin/tai-chinh/bao-cao/xu-huong"
            icon="📊"
            title="Xu hướng"
            sub="Trend 6 tháng"
            tint="from-blue-500 to-indigo-600"
          />
          <ActionCard
            href="/admin/tai-chinh/bao-cao/gia-von"
            icon="🏷️"
            title="Giá vốn"
            sub="Per chicken"
            tint="from-purple-500 to-fuchsia-600"
          />
          <ActionCard
            href="/admin/tai-chinh/bao-cao/nhap-xuat-ton"
            icon="📋"
            title="Nhập xuất tồn"
            sub="Biến động đàn"
            tint="from-cyan-500 to-blue-600"
          />
          <ActionCard
            href="/admin/tai-chinh/bao-cao/cong-no"
            icon="⚠"
            title="Công nợ"
            sub="Phải thu"
            tint="from-red-500 to-rose-600"
          />
        </div>
      </div>
    </div>
  )
}

function Kpi({
  label,
  value,
  sub,
  tint,
  subTint,
  icon,
}: {
  label: string
  value: string
  sub?: string
  tint: 'blue' | 'emerald' | 'amber' | 'red'
  subTint?: 'emerald' | 'red'
  icon: string
}) {
  const map: Record<string, string> = {
    blue: 'from-blue-500 to-indigo-600',
    emerald: 'from-emerald-500 to-green-600',
    amber: 'from-amber-500 to-orange-600',
    red: 'from-red-500 to-rose-600',
  }
  const subColor =
    subTint === 'emerald'
      ? 'text-emerald-600 dark:text-emerald-400'
      : subTint === 'red'
        ? 'text-red-600 dark:text-red-400'
        : 'text-gray-500 dark:text-gray-400'

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-sm relative overflow-hidden">
      <div className={`absolute top-0 right-0 w-16 h-16 rounded-full bg-gradient-to-br ${map[tint]} opacity-10 -translate-y-4 translate-x-4`} />
      <div className="flex items-start justify-between gap-2 relative">
        <div className="min-w-0">
          <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest truncate">
            {label}
          </div>
          <div className="text-base md:text-xl font-extrabold text-gray-900 dark:text-gray-100 mt-0.5 tabular-nums truncate">
            {value}
          </div>
          {sub && <div className={`text-[10px] truncate mt-0.5 font-semibold ${subColor}`}>{sub}</div>}
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  )
}

function ActionCard({
  href,
  icon,
  title,
  sub,
  tint,
}: {
  href: string
  icon: string
  title: string
  sub: string
  tint: string
}) {
  return (
    <Link
      href={href}
      className="group block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all relative overflow-hidden"
    >
      <div
        className={`absolute -top-4 -right-4 w-16 h-16 rounded-full bg-gradient-to-br ${tint} opacity-10 group-hover:opacity-20 transition`}
      />
      <div className="text-2xl mb-1 relative">{icon}</div>
      <div className="font-bold text-sm text-gray-900 dark:text-gray-100 relative">{title}</div>
      <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate relative">{sub}</div>
    </Link>
  )
}

function TreasuryBanner({ data }: { data: TreasurySummary }) {
  const todayNet = data.todayIn - data.todayOut
  return (
    <Link
      href="/admin/quy"
      className="group relative overflow-hidden block rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 text-white shadow-xl hover:shadow-2xl transition"
    >
      <div className="absolute inset-0 opacity-15 pointer-events-none">
        <span className="absolute -top-2 right-4 text-7xl">💰</span>
        <span className="absolute -bottom-3 left-6 text-5xl">📊</span>
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.18),transparent_60%)]" />
      <div className="relative p-4 md:p-5 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-center">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] uppercase tracking-widest opacity-80 font-semibold">
              💰 Quản lý quỹ
            </span>
            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full">
              MỚI
            </span>
          </div>
          <div className="text-2xl md:text-3xl font-black tabular-nums">
            {formatVnd(data.totalBalance)}
          </div>
          <div className="text-xs opacity-80 mt-1 flex flex-wrap gap-3">
            <span>{data.accountCount} tài khoản</span>
            {data.todayIn > 0 && (
              <span className="text-emerald-200 font-semibold">
                +{formatVnd(data.todayIn)} hôm nay
              </span>
            )}
            {data.todayOut > 0 && (
              <span className="text-rose-200 font-semibold">
                -{formatVnd(data.todayOut)} hôm nay
              </span>
            )}
            {data.todayIn === 0 && data.todayOut === 0 && (
              <span className="opacity-70">Chưa có giao dịch hôm nay</span>
            )}
          </div>
        </div>

        {/* Top accounts mini */}
        <div className="flex items-center gap-2 md:gap-3 flex-wrap justify-end">
          {data.topAccounts.slice(0, 3).map((a) => (
            <div
              key={a.id}
              className="bg-white/15 backdrop-blur rounded-lg px-3 py-2 border border-white/20 min-w-0 max-w-[160px]"
            >
              <div className="text-[10px] opacity-70 truncate flex items-center gap-1">
                <span>{a.icon}</span>
                <span>{a.name}</span>
              </div>
              <div className="text-sm font-bold tabular-nums">
                {formatVnd(a.current_balance)}
              </div>
            </div>
          ))}
          <div className="bg-white/20 hover:bg-white/30 backdrop-blur rounded-xl px-4 py-3 border border-white/30 group-hover:translate-x-0.5 transition flex items-center gap-2 font-bold">
            <span className="hidden md:inline">Quản lý quỹ</span>
            <span>→</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
