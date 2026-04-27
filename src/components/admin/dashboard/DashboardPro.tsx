'use client'

import Link from 'next/link'
import { KpiCard, fmtVnd, deltaPct } from './KpiCard'
import {
  RevenueExpenseChart,
  ChickenStatusDonut,
  BreedRevenueDonut,
  TopCustomersBar,
  ExpenseBreakdownChart,
  CashAccountsList,
} from './AdvancedCharts'

export type DashboardProData = {
  user_name: string
  user_role: string | null
  kpis: Record<string, number | Record<string, number> | null | undefined>
  trends_12mo: Array<{
    month: string
    revenue: number | string
    expenses: number | string
    cogs: number | string
    net_profit: number | string
    chickens_sold?: number | string
    chickens_died?: number | string
    new_customers?: number | string
  }>
  top_customers: Array<{
    customer_id: string
    customer_name: string
    tier: string | null
    total_revenue: number
    orders_count: number
    avg_order_value: number
    last_purchase_date: string | null
  }>
  breed_revenue: Array<{
    breed_id: string
    breed_name: string
    chickens_sold: number
    total_revenue: number
  }>
  expense_breakdown: Array<{
    category_code: string
    category_name: string
    total_amount: number
    txn_count: number
  }>
  cash_accounts: Array<{
    id: string
    name: string
    account_type: string
    current_balance: number
    icon: string | null
    color: string | null
  }>
  alerts: Array<{
    id: string
    title: string
    message: string | null
    priority: string | null
    alert_type: string | null
    created_at: string
  }>
  recent_sales: Array<{
    id: string
    order_code: string
    order_date: string
    total_amount: number
    status: string
    customer_name: string | null
  }>
  recent_chickens: Array<{
    id: string
    chicken_code: string
    name: string | null
    breed_name: string | null
    status: string
  }>
}

export function DashboardPro({ data }: { data: DashboardProData }) {
  const k = data.kpis
  const num = (key: string): number => Number((k[key] as number) ?? 0)

  // Hero metrics
  const totalChickens = num('total_chickens')
  const chickens30dAgo = num('total_chickens_30d_ago')
  const revMtd = num('revenue_mtd')
  const revLast = num('revenue_last_month')
  const expMtd = num('expenses_mtd')
  const expLast = num('expenses_last_month')
  const profitMtd = revMtd - expMtd
  const profitLast = revLast - expLast
  const cashTotal = num('cash_total')
  const profitMargin = revMtd > 0 ? (profitMtd / revMtd) * 100 : 0

  const conv30dDelivered = num('conversion_30d_delivered')
  const conv30dTotal = num('conversion_30d_total')
  const conversionRate = conv30dTotal > 0 ? (conv30dDelivered / conv30dTotal) * 100 : 0

  const mortRate = totalChickens > 0
    ? (num('mortality_30d') / (totalChickens + num('mortality_30d'))) * 100
    : 0

  const cagesUtil = num('cages_total') > 0
    ? (num('cages_in_use') / num('cages_total')) * 100
    : 0

  const hatchSuccess = (num('breeding_hatched_mtd') + num('breeding_failed_mtd')) > 0
    ? (num('breeding_hatched_mtd') / (num('breeding_hatched_mtd') + num('breeding_failed_mtd'))) * 100
    : 0

  const greet = greeting()

  return (
    <div className="space-y-5">
      {/* === Header === */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-gray-100">
            {greet} <span className="text-amber-600">{data.user_name}</span> 👋
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {nowVN()} · Tổng quan trang trại — cập nhật real-time
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          <Link href="/admin/ke-hoach" className="px-3 py-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 font-semibold hover:bg-violet-200">
            📅 Kế hoạch
          </Link>
          <Link href="/admin/tai-chinh" className="px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-semibold hover:bg-emerald-200">
            💰 Báo cáo TC
          </Link>
          <Link href="/admin/hoa-don" className="px-3 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-semibold hover:bg-amber-200">
            🧾 Hóa đơn
          </Link>
        </div>
      </header>

      {/* === HERO KPIs (4 large cards) === */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          emoji="🐓"
          label="Tổng đàn"
          value={totalChickens.toLocaleString('vi-VN')}
          subtitle={`+ ${num('total_chickens') - chickens30dAgo} con trong 30 ngày`}
          delta={chickens30dAgo > 0 ? { value: deltaPct(totalChickens, chickens30dAgo) } : undefined}
          tone="amber"
          size="lg"
          href="/admin/ho-so-ga"
        />
        <KpiCard
          emoji="💵"
          label="Doanh thu tháng"
          value={fmtVnd(revMtd, true) + 'đ'}
          subtitle={`Tháng trước: ${fmtVnd(revLast, true)}đ`}
          delta={revLast > 0 ? { value: deltaPct(revMtd, revLast) } : undefined}
          tone="emerald"
          size="lg"
          href="/admin/tai-chinh"
        />
        <KpiCard
          emoji="📈"
          label="Lợi nhuận tháng"
          value={fmtVnd(profitMtd, true) + 'đ'}
          subtitle={`Biên LN: ${profitMargin.toFixed(1)}%`}
          delta={profitLast !== 0 ? { value: deltaPct(profitMtd, profitLast) } : undefined}
          tone={profitMtd >= 0 ? 'teal' : 'rose'}
          size="lg"
          href="/admin/tai-chinh/pnl"
        />
        <KpiCard
          emoji="💰"
          label="Số dư quỹ"
          value={fmtVnd(cashTotal, true) + 'đ'}
          subtitle={`${num('cash_accounts_count')} tài khoản`}
          tone="violet"
          size="lg"
          href="/admin/quy"
        />
      </div>

      {/* === Operational KPIs row === */}
      <div>
        <SectionTitle emoji="🏭" title="Hoạt động sản xuất" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <KpiCard
            emoji="🛒"
            label="Sẵn sàng bán"
            value={num('ready_to_sell').toLocaleString('vi-VN')}
            subtitle="Trên 12 tháng tuổi"
            tone="orange"
            size="sm"
            href="/admin/ho-so-ga?status=dang_nuoi&ready=true"
          />
          <KpiCard
            emoji="🏥"
            label="Đang cách ly"
            value={num('chickens_quarantine').toLocaleString('vi-VN')}
            tone={num('chickens_quarantine') > 0 ? 'rose' : 'gray'}
            size="sm"
            href="/admin/ho-so-ga?status=dang_cach_ly"
          />
          <KpiCard
            emoji="⚰️"
            label="Hao hụt 30 ngày"
            value={`${num('mortality_30d')} (${mortRate.toFixed(1)}%)`}
            subtitle={`Trước: ${num('mortality_30d_prev')} con`}
            delta={
              num('mortality_30d_prev') > 0
                ? { value: deltaPct(num('mortality_30d'), num('mortality_30d_prev')), better: 'down' }
                : undefined
            }
            tone={mortRate > 5 ? 'red' : mortRate > 2 ? 'orange' : 'green'}
            size="sm"
          />
          <KpiCard
            emoji="🏠"
            label="Sử dụng chuồng"
            value={`${cagesUtil.toFixed(0)}%`}
            subtitle={`${num('cages_in_use')}/${num('cages_total')} chuồng có gà`}
            tone="cyan"
            size="sm"
            href="/admin/chuong-trai"
          />
        </div>
      </div>

      {/* === Sales / Customer KPIs === */}
      <div>
        <SectionTitle emoji="🛍" title="Kinh doanh & khách hàng" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <KpiCard
            emoji="🛒"
            label="Đơn tháng này"
            value={`${num('orders_total_mtd')}`}
            subtitle={`${num('orders_delivered_mtd')} đã giao · ${num('orders_pending')} hỏi mua`}
            tone="blue"
            size="sm"
            href="/admin/ban-ra"
          />
          <KpiCard
            emoji="🎯"
            label="Tỷ lệ chốt đơn"
            value={`${conversionRate.toFixed(0)}%`}
            subtitle="30 ngày qua"
            tone={conversionRate > 70 ? 'green' : conversionRate > 40 ? 'amber' : 'rose'}
            size="sm"
          />
          <KpiCard
            emoji="👥"
            label="KH mới tháng"
            value={num('customers_new_mtd').toString()}
            subtitle={`Tổng ${num('customers_total')} KH · ${num('customers_vip')} VIP`}
            tone="indigo"
            size="sm"
            href="/admin/khach-hang"
          />
          <KpiCard
            emoji="💸"
            label="Công nợ quá hạn"
            value={fmtVnd(num('receivables_overdue'), true) + 'đ'}
            subtitle={`${num('receivables_overdue_count')} KH > 30 ngày`}
            tone={num('receivables_overdue') > 0 ? 'red' : 'green'}
            size="sm"
            href="/admin/khach-hang?filter=overdue"
          />
        </div>
      </div>

      {/* === Alerts & Activity KPIs === */}
      <div>
        <SectionTitle emoji="🔔" title="Cảnh báo & nhắc việc" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <KpiCard
            emoji="💉"
            label="Tiêm phòng cần làm"
            value={num('vaccinations_this_week').toString()}
            subtitle={`Hôm nay: ${num('vaccinations_today')} · Quá hạn: ${num('vaccinations_overdue')}`}
            tone={num('vaccinations_overdue') > 0 ? 'red' : 'amber'}
            size="sm"
            href="/admin/tiem-phong"
          />
          <KpiCard
            emoji="📔"
            label="Việc cần nhắc"
            value={num('diary_plans_pending').toString()}
            subtitle={`Hôm nay: ${num('diary_plans_today')} việc`}
            tone="violet"
            size="sm"
            href="/admin/ke-hoach"
          />
          <KpiCard
            emoji="📦"
            label="Cảnh báo kho"
            value={`${num('medicines_low_stock') + num('feeds_low_stock')}`}
            subtitle={`Thuốc: ${num('medicines_low_stock')} · Cám: ${num('feeds_low_stock')}`}
            tone={(num('medicines_low_stock') + num('feeds_low_stock')) > 0 ? 'orange' : 'green'}
            size="sm"
          />
          <KpiCard
            emoji="🛠"
            label="Bảo trì TS"
            value={num('assets_maint_overdue').toString()}
            subtitle={`Hỏng/quá hạn bảo trì`}
            tone={num('assets_maint_overdue') > 0 ? 'red' : 'gray'}
            size="sm"
            href="/admin/tai-san"
          />
        </div>
      </div>

      {/* === BIG CHART: Revenue/Expense 12 months === */}
      <RevenueExpenseChart data={data.trends_12mo as never} />

      {/* === Charts row 1: Status donut + Cash accounts === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChickenStatusDonut byStatus={k.chickens_by_status as Record<string, number>} />
        <CashAccountsList rows={data.cash_accounts} />
      </div>

      {/* === Charts row 2: Top customers + Breed revenue === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopCustomersBar rows={data.top_customers} />
        <BreedRevenueDonut rows={data.breed_revenue} />
      </div>

      {/* === Charts row 3: Expenses + KPIs nâng cao === */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ExpenseBreakdownChart rows={data.expense_breakdown} />
        </div>
        <div className="space-y-3">
          <SmallStat
            emoji="🥚"
            title="Ấp tháng này"
            value={`${num('breeding_hatched_mtd')} thành công`}
            subtitle={`${num('breeding_failed_mtd')} thất bại · Tỷ lệ ${hatchSuccess.toFixed(0)}%`}
            href="/admin/sinh-san"
            tone="green"
          />
          <SmallStat
            emoji="💎"
            title="Giá bán TB / con"
            value={`${fmtVnd(num('avg_sale_price_mtd'), true)}đ`}
            subtitle={`${num('sold_count_mtd')} con đã bán tháng này`}
            tone="amber"
          />
          <SmallStat
            emoji="🧾"
            title="Hóa đơn ĐT"
            value={`${num('invoices_issued_mtd')}`}
            subtitle={`Tháng này · ${num('invoices_pending')} đang chờ phát hành`}
            href="/admin/hoa-don"
            tone="blue"
          />
        </div>
      </div>

      {/* === Alerts panel + Recent activity === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AlertsPanel alerts={data.alerts} />
        <RecentActivityPanel sales={data.recent_sales} chickens={data.recent_chickens} />
      </div>
    </div>
  )
}

// ============= Subcomponents =============

function SectionTitle({ emoji, title }: { emoji: string; title: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-2">
      <span className="text-base">{emoji}</span>
      <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
        {title}
      </h2>
      <div className="flex-1 h-px bg-gradient-to-r from-gray-200 dark:from-gray-700 to-transparent" />
    </div>
  )
}

function SmallStat({
  emoji,
  title,
  value,
  subtitle,
  href,
  tone = 'gray',
}: {
  emoji: string
  title: string
  value: string
  subtitle?: string
  href?: string
  tone?: 'amber' | 'emerald' | 'green' | 'blue' | 'violet' | 'rose' | 'gray' | 'orange'
}) {
  const TONE_BAR: Record<string, string> = {
    amber: 'from-amber-400 to-orange-500',
    emerald: 'from-emerald-400 to-teal-500',
    green: 'from-green-400 to-emerald-500',
    blue: 'from-blue-400 to-indigo-500',
    violet: 'from-violet-400 to-fuchsia-500',
    rose: 'from-rose-400 to-pink-500',
    gray: 'from-gray-400 to-gray-500',
    orange: 'from-orange-400 to-red-500',
  }
  const W: React.ElementType = href ? 'a' : 'div'
  return (
    <W
      href={href}
      className={`block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-3 ${
        href ? 'hover:shadow-md hover:border-gray-300 transition' : ''
      }`}
    >
      <div className={`w-8 h-1 rounded-full bg-gradient-to-r ${TONE_BAR[tone]} mb-2`} />
      <div className="flex items-start gap-2">
        <span className="text-xl">{emoji}</span>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold">
            {title}
          </div>
          <div className="font-bold text-gray-900 dark:text-gray-100">{value}</div>
          {subtitle && <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</div>}
        </div>
      </div>
    </W>
  )
}

function AlertsPanel({ alerts }: { alerts: DashboardProData['alerts'] }) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold flex items-center gap-1.5">🚨 Cảnh báo gần đây</h3>
        <span className="text-[10px] uppercase tracking-wide text-gray-500">
          {alerts.length} chưa xử lý
        </span>
      </div>
      {alerts.length === 0 ? (
        <div className="h-32 flex flex-col items-center justify-center text-xs text-gray-400 gap-1">
          <span className="text-2xl">✅</span>
          <span>Mọi thứ đều ổn</span>
        </div>
      ) : (
        <ul className="space-y-2 max-h-80 overflow-y-auto">
          {alerts.slice(0, 8).map((a) => {
            const pTone =
              a.priority === 'khan_cap'
                ? 'border-l-red-500 bg-red-50 dark:bg-red-950/30'
                : a.priority === 'cao'
                ? 'border-l-orange-500 bg-orange-50 dark:bg-orange-950/30'
                : 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/30'
            return (
              <li key={a.id} className={`border-l-4 ${pTone} rounded-r-lg p-2`}>
                <div className="text-xs font-semibold text-gray-900 dark:text-gray-100">{a.title}</div>
                {a.message && (
                  <div className="text-[11px] text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
                    {a.message}
                  </div>
                )}
                <div className="text-[10px] text-gray-400 mt-0.5">
                  {new Date(a.created_at).toLocaleString('vi-VN')}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function RecentActivityPanel({
  sales,
  chickens,
}: {
  sales: DashboardProData['recent_sales']
  chickens: DashboardProData['recent_chickens']
}) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4">
      <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5">⚡ Hoạt động gần đây</h3>

      <div className="space-y-3">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-1">
            🛒 5 đơn mới nhất
          </div>
          {sales.length === 0 ? (
            <div className="text-xs text-gray-400">Chưa có đơn</div>
          ) : (
            <ul className="space-y-1">
              {sales.slice(0, 5).map((s) => (
                <li key={s.id} className="flex items-center gap-2 text-xs">
                  <Link href={`/admin/ban-ra/${s.id}`} className="font-mono text-blue-600 hover:underline">
                    {s.order_code}
                  </Link>
                  <span className="text-gray-600 dark:text-gray-400 flex-1 truncate">
                    {s.customer_name || '—'}
                  </span>
                  <span className="font-semibold tabular-nums">{fmtVnd(s.total_amount, true)}đ</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-1">
            🐓 5 gà mới nhập
          </div>
          {chickens.length === 0 ? (
            <div className="text-xs text-gray-400">Chưa có gà mới</div>
          ) : (
            <ul className="space-y-1">
              {chickens.slice(0, 5).map((c) => (
                <li key={c.id} className="flex items-center gap-2 text-xs">
                  <Link href={`/admin/ho-so-ga/${c.id}`} className="font-mono text-amber-700 hover:underline">
                    {c.chicken_code}
                  </Link>
                  <span className="text-gray-700 dark:text-gray-300 flex-1 truncate">{c.name || '—'}</span>
                  <span className="text-[10px] text-gray-500">{c.breed_name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function greeting(): string {
  const h = new Date().getHours()
  if (h < 5) return '🌙 Khuya rồi,'
  if (h < 11) return '☀️ Chào buổi sáng,'
  if (h < 13) return '🍚 Trưa rồi,'
  if (h < 18) return '☕ Chào buổi chiều,'
  return '🌆 Chào buổi tối,'
}

function nowVN(): string {
  const d = new Date()
  return d.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
}
