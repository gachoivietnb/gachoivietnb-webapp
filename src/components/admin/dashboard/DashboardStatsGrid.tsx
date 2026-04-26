import Link from 'next/link'

interface Props {
  stats: {
    total_chickens?: number
    total_chickens_growth_week?: number
    vaccinations_today?: number
    vaccinations_overdue?: number
    ready_to_sell?: number
    revenue_this_month?: number
    revenue_last_month?: number
    orders_pending?: number
    critical_alerts?: number
    medicines_low_stock?: number
    feeds_low_stock?: number
  }
}

export function DashboardStatsGrid({ stats }: Props) {
  const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n)
  const fmtMoney = (n: number) => {
    if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} tỷ`
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}tr`
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`
    return fmt(n)
  }

  const lastMonth = stats.revenue_last_month ?? 0
  const thisMonth = stats.revenue_this_month ?? 0
  const revenueChange = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : 0

  const cards = [
    {
      label: 'Tổng đàn',
      value: fmt(stats.total_chickens ?? 0),
      sub: (stats.total_chickens_growth_week ?? 0) > 0
        ? `+${stats.total_chickens_growth_week} tuần này`
        : 'Không có thay đổi tuần này',
      subColor: (stats.total_chickens_growth_week ?? 0) > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400',
      href: '/admin/ho-so-ga',
    },
    {
      label: 'Tiêm hôm nay',
      value: fmt(stats.vaccinations_today ?? 0),
      sub: (stats.vaccinations_overdue ?? 0) > 0
        ? `${stats.vaccinations_overdue} quá hạn`
        : 'Không có quá hạn',
      subColor: (stats.vaccinations_overdue ?? 0) > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400',
      href: '/admin/tiem-phong',
    },
    {
      label: 'Đến tuổi bán',
      value: fmt(stats.ready_to_sell ?? 0),
      sub: '≥ 12 tháng tuổi',
      subColor: 'text-gray-500 dark:text-gray-400',
      href: '/admin/ho-so-ga',
    },
    {
      label: 'Doanh thu tháng',
      value: fmtMoney(thisMonth),
      sub: lastMonth > 0
        ? `${revenueChange >= 0 ? '+' : ''}${revenueChange}% vs tháng trước`
        : '—',
      subColor: revenueChange > 0 ? 'text-green-600 dark:text-green-400' : revenueChange < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400',
      href: '/admin/tai-chinh',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((c) => (
        <Link
          key={c.label}
          href={c.href}
          className="group bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200/80 dark:border-gray-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-md hover:-translate-y-0.5 transition"
        >
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{c.label}</div>
          <div className="text-3xl font-semibold mt-1.5 text-gray-900 dark:text-gray-100 tabular-nums">{c.value}</div>
          <div className={`text-xs mt-1.5 font-medium ${c.subColor}`}>{c.sub}</div>
        </Link>
      ))}
    </div>
  )
}
