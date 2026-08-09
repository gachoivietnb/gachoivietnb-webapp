import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatVnd } from '@/lib/utils/format'

export const revalidate = 0

type Trend = {
  month: string
  revenue: number | string
  expenses: number | string
  cogs: number | string
  net_profit: number | string
}

type ReportMeta = {
  id: string
  title: string
  description: string
  href: string
  icon: string
  group: 'Lãi lỗ' | 'Chi tiết' | 'Khách hàng' | 'Nhà cung cấp'
  bar: string
  ring: string
  hint?: string
}

const REPORTS: ReportMeta[] = [
  {
    id: 'pnl',
    title: 'Báo cáo lãi lỗ (P&L)',
    description: 'Doanh thu · giá vốn · chi phí · lãi gộp · lãi ròng theo chuẩn kế toán',
    href: '/admin/tai-chinh/bao-cao/pnl',
    icon: '💰',
    group: 'Lãi lỗ',
    bar: 'from-emerald-400 to-teal-500',
    ring: 'ring-emerald-400/30',
    hint: 'Mở mỗi đầu tháng để chốt sổ',
  },
  {
    id: 'xu-huong',
    title: 'Xu hướng 6 tháng',
    description: 'Composed chart doanh thu / chi phí / lãi ròng + bảng số liệu theo tháng',
    href: '/admin/tai-chinh/bao-cao/xu-huong',
    icon: '📈',
    group: 'Lãi lỗ',
    bar: 'from-violet-400 to-purple-500',
    ring: 'ring-violet-400/30',
    hint: 'Theo dõi đà tăng trưởng',
  },
  {
    id: 'dong-tien',
    title: 'Dòng tiền (Cash Flow)',
    description: 'Thu / chi thực tế từ quỹ · phân tích theo phân loại · theo tài khoản · theo thời gian',
    href: '/admin/tai-chinh/bao-cao/dong-tien',
    icon: '💸',
    group: 'Lãi lỗ',
    bar: 'from-blue-400 via-indigo-500 to-violet-500',
    ring: 'ring-indigo-400/30',
    hint: 'Theo dõi tiền vào ra thực tế',
  },
  {
    id: 'chi-phi',
    title: 'Chi phí 8 hạng mục',
    description: 'Tỷ trọng pie chart · drill-down từng hạng mục · so sánh với tháng trước',
    href: '/admin/tai-chinh/bao-cao/chi-phi',
    icon: '💸',
    group: 'Chi tiết',
    bar: 'from-rose-400 to-red-500',
    ring: 'ring-rose-400/30',
    hint: 'Phát hiện chi phí bất thường',
  },
  {
    id: 'gia-von',
    title: 'Giá vốn từng con',
    description: 'List chi tiết giá vốn · biên lợi nhuận · highlight lỗ nặng / lãi cao',
    href: '/admin/tai-chinh/bao-cao/gia-von',
    icon: '🐓',
    group: 'Chi tiết',
    bar: 'from-amber-400 to-orange-500',
    ring: 'ring-amber-400/30',
    hint: 'Định giá bán & đánh giá hiệu quả',
  },
  {
    id: 'nhap-xuat-ton',
    title: 'Nhập xuất tồn gà',
    description: 'Đầu kỳ + nhập + xuất + cuối kỳ · tỷ lệ chết / bán · chi tiết từng con',
    href: '/admin/tai-chinh/bao-cao/nhap-xuat-ton',
    icon: '📋',
    group: 'Chi tiết',
    bar: 'from-blue-400 to-indigo-500',
    ring: 'ring-blue-400/30',
    hint: 'Đối chiếu thực tế đàn',
  },
  {
    id: 'cong-no',
    title: 'Công nợ khách hàng',
    description: 'Khách còn nợ · cảnh báo quá hạn 30 ngày · tổng tuổi nợ · drill-down từng đơn',
    href: '/admin/tai-chinh/bao-cao/cong-no',
    icon: '⚠️',
    group: 'Khách hàng',
    bar: 'from-cyan-400 to-sky-500',
    ring: 'ring-cyan-400/30',
    hint: 'Đôn đốc thu hồi',
  },
  {
    id: 'cong-no-ncc',
    title: 'Công nợ phải trả NCC',
    description: 'NCC còn nợ · tổng phải trả · tuổi nợ · ghi trả từng phiếu (giảm nợ + chi quỹ)',
    href: '/admin/tai-chinh/bao-cao/cong-no-ncc',
    icon: '💸',
    group: 'Nhà cung cấp',
    bar: 'from-red-400 to-rose-500',
    ring: 'ring-red-400/30',
    hint: 'Chủ động thanh toán đúng hạn',
  },
]

export default async function ReportsIndexPage() {
  const supabase = await createClient()

  const today = new Date()
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
  const monthEnd = today.toISOString().slice(0, 10)

  const [trendsRes, recRes, expRes, salesRes] = await Promise.all([
    supabase.rpc('trends_6_months'),
    supabase.from('customer_receivables').select('amount_due, days_since_order'),
    supabase
      .from('expenses')
      .select('amount')
      .gte('expense_date', monthStart)
      .lte('expense_date', monthEnd),
    supabase
      .from('sales_orders')
      .select('total_amount, paid_amount, order_date')
      .gte('order_date', monthStart)
      .lte('order_date', monthEnd),
  ])

  const trends = (trendsRes.data ?? []) as Trend[]
  const lastTrend = trends.length > 0 ? trends[trends.length - 1] : null
  const monthRevenue =
    (salesRes.data ?? []).reduce((s: number, r) => s + Number((r as { total_amount: number }).total_amount ?? 0), 0)
  const monthExpenses =
    (expRes.data ?? []).reduce((s: number, r) => s + Number((r as { amount: number }).amount ?? 0), 0)
  const monthNetEst = monthRevenue - monthExpenses

  const receivables = (recRes.data ?? []) as Array<{ amount_due: number; days_since_order: number }>
  const totalReceivable = receivables.reduce((s, r) => s + Number(r.amount_due ?? 0), 0)
  const overdueReceivable = receivables
    .filter((r) => Number(r.days_since_order) > 30)
    .reduce((s, r) => s + Number(r.amount_due ?? 0), 0)

  const groups = ['Lãi lỗ', 'Chi tiết', 'Khách hàng', 'Nhà cung cấp'] as const

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
          📊 Báo cáo tài chính
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          7 báo cáo theo chuẩn kế toán · Bộ lọc thông minh · Xuất Excel / PDF
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <Kpi
          label="Doanh thu tháng này"
          value={formatVnd(monthRevenue)}
          icon="💵"
          tone="from-blue-500 to-indigo-500"
          small
        />
        <Kpi
          label="Chi phí tháng này"
          value={formatVnd(monthExpenses)}
          icon="💸"
          tone="from-rose-500 to-red-500"
          small
        />
        <Kpi
          label="Lãi ước tính"
          value={formatVnd(monthNetEst)}
          icon={monthNetEst >= 0 ? '📈' : '📉'}
          tone={monthNetEst >= 0 ? 'from-emerald-500 to-teal-500' : 'from-rose-500 to-red-600'}
          pulse={monthNetEst < 0}
          small
        />
        <Kpi
          label="Công nợ"
          value={formatVnd(totalReceivable)}
          icon="⚠️"
          tone={overdueReceivable > 0 ? 'from-amber-500 to-orange-500' : 'from-cyan-500 to-sky-500'}
          sub={
            overdueReceivable > 0 ? `Quá hạn ${formatVnd(overdueReceivable)}` : 'Chưa có quá hạn'
          }
          small
          pulse={overdueReceivable > 0}
        />
      </div>

      {lastTrend && (
        <div className="mb-5 bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50 dark:from-indigo-950/40 dark:via-blue-950/40 dark:to-cyan-950/40 border border-blue-200 dark:border-blue-900 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 text-sm mb-0.5">
                Tháng gần nhất ({lastTrend.month})
              </h3>
              <p className="text-xs text-gray-700 dark:text-gray-300">
                Doanh thu <strong>{formatVnd(Number(lastTrend.revenue))}</strong> · Chi phí{' '}
                <strong>{formatVnd(Number(lastTrend.expenses))}</strong> · Giá vốn{' '}
                <strong>{formatVnd(Number(lastTrend.cogs))}</strong> · Lãi ròng{' '}
                <strong
                  className={
                    Number(lastTrend.net_profit) >= 0
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : 'text-rose-700 dark:text-rose-300'
                  }
                >
                  {formatVnd(Number(lastTrend.net_profit))}
                </strong>
                . Mở 6 báo cáo bên dưới để phân tích sâu.
              </p>
            </div>
          </div>
        </div>
      )}

      {groups.map((g) => {
        const items = REPORTS.filter((r) => r.group === g)
        return (
          <section key={g} className="mb-5">
            <div className="flex items-center gap-2 mb-2.5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {g}
              </h2>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                {items.length}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {items.map((r) => (
                <ReportCard key={r.id} report={r} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function ReportCard({ report }: { report: ReportMeta }) {
  return (
    <Link
      href={report.href}
      className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 transition block"
    >
      <div className={`h-1.5 bg-gradient-to-r ${report.bar}`} />
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div
            className={`flex-shrink-0 w-12 h-12 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-2xl ring-2 ${report.ring}`}
          >
            {report.icon}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition">
              {report.title}
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
              {report.description}
            </p>
            {report.hint && (
              <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400 italic">
                💡 {report.hint}
              </p>
            )}
          </div>
        </div>
        <div className="mt-3 flex items-center justify-end text-xs text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform">
          Mở báo cáo →
        </div>
      </div>
    </Link>
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
