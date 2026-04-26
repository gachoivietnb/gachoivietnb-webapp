'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { formatVnd, formatDate } from '@/lib/utils/format'
import { ChickenStatusBadge } from '@/components/admin/chickens/ChickenStatusBadge'

const SurvivalChart = dynamic(() => import('./SurvivalChart'), { ssr: false })
const RevenueChart = dynamic(() => import('./RevenueChart'), { ssr: false })

export type DashboardData = {
  user_name: string
  user_role: string | null
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
  alerts: Array<{
    id: string
    title: string
    message: string | null
    priority: string | null
    alert_type: string | null
    entity_type: string | null
    entity_id: string | null
    created_at: string
  }>
  area_stats: Array<{
    area_code: string | null
    area_name: string | null
    survival_rate_pct: number | null
    chickens_count?: number | null
  }>
  trends: Array<{
    month: string
    revenue: string | number
    expenses: string | number
    net_profit: string | number
  }>
  recent_chickens: Array<{
    id: string
    chicken_code: string
    name: string | null
    breed_name: string | null
    status: string
    created_at: string
  }>
  recent_sales: Array<{
    id: string
    order_code: string
    order_date: string
    total_amount: number
    status: string
    customer: { name: string; tier: string | null } | null
  }>
  recent_purchases: Array<{
    id: string
    purchase_code: string
    purchase_date: string
    total_quantity: number
    total_amount: number
    supplier: { name: string } | null
  }>
  top_debtors: Array<{
    customer_id: string
    customer_name: string
    phone: string | null
    total_due: number
    oldest_days: number
  }>
  vaccines_due_today: number
  today_iso: string
  week_ago: string
  month_ago: string
  first_of_month: string
}

type ActivityFeed = 'all' | 'sales' | 'purchases' | 'chickens'
type AlertPriority = '' | 'khan_cap' | 'cao' | 'trung_binh' | 'thap'

const PRIORITY_META: Record<
  string,
  { label: string; gradient: string; pill: string; emoji: string; rank: number }
> = {
  khan_cap: {
    label: 'Khẩn cấp',
    gradient: 'from-red-600 to-rose-700',
    pill: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300',
    emoji: '🚨',
    rank: 1,
  },
  cao: {
    label: 'Cao',
    gradient: 'from-orange-500 to-red-500',
    pill: 'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300',
    emoji: '⚠',
    rank: 2,
  },
  trung_binh: {
    label: 'Trung bình',
    gradient: 'from-amber-500 to-orange-500',
    pill: 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300',
    emoji: '⚡',
    rank: 3,
  },
  thap: {
    label: 'Thấp',
    gradient: 'from-blue-500 to-indigo-500',
    pill: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300',
    emoji: 'ℹ',
    rank: 4,
  },
}

function greet(): string {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return '🌅 Chào buổi sáng'
  if (h >= 12 && h < 14) return '☀️ Chào buổi trưa'
  if (h >= 14 && h < 18) return '🌤 Chào buổi chiều'
  if (h >= 18 && h < 22) return '🌆 Chào buổi tối'
  return '🌙 Chào đêm muộn'
}

export function DashboardClient({ data }: { data: DashboardData }) {
  const [priorityFilter, setPriorityFilter] = useState<AlertPriority>('')
  const [feedFilter, setFeedFilter] = useState<ActivityFeed>('all')

  const filteredAlerts = useMemo(() => {
    if (!priorityFilter) return data.alerts
    return data.alerts.filter((a) => a.priority === priorityFilter)
  }, [data.alerts, priorityFilter])

  // Build unified activity feed
  const activities = useMemo(() => {
    type Activity = {
      id: string
      type: 'sale' | 'purchase' | 'chicken'
      date: string
      title: string
      sub: string
      amount?: number
      href: string
      tint: string
      icon: string
    }
    const out: Activity[] = []

    for (const s of data.recent_sales) {
      out.push({
        id: `s-${s.id}`,
        type: 'sale',
        date: s.order_date,
        title: `Đơn bán ${s.order_code}`,
        sub: `${s.customer?.name ?? 'Khách lẻ'}${s.customer?.tier === 'vip' ? ' ★' : ''}`,
        amount: s.total_amount,
        href: `/admin/ban-ra/${s.id}`,
        tint: 'emerald',
        icon: '💵',
      })
    }
    for (const p of data.recent_purchases) {
      out.push({
        id: `p-${p.id}`,
        type: 'purchase',
        date: p.purchase_date,
        title: `Phiếu nhập ${p.purchase_code}`,
        sub: `${p.supplier?.name ?? 'NCC ?'} · ${p.total_quantity} con`,
        amount: -p.total_amount,
        href: `/admin/mua-vao/${p.id}`,
        tint: 'red',
        icon: '📥',
      })
    }
    for (const c of data.recent_chickens) {
      out.push({
        id: `c-${c.id}`,
        type: 'chicken',
        date: c.created_at.slice(0, 10),
        title: c.name ?? c.chicken_code,
        sub: `${c.breed_name ?? '—'} · ${c.chicken_code}`,
        href: `/admin/ho-so-ga/${c.id}`,
        tint: 'blue',
        icon: '🐓',
      })
    }
    out.sort((a, b) => b.date.localeCompare(a.date))
    if (feedFilter !== 'all') {
      const map = { sales: 'sale', purchases: 'purchase', chickens: 'chicken' } as const
      return out.filter((a) => a.type === map[feedFilter])
    }
    return out
  }, [data.recent_sales, data.recent_purchases, data.recent_chickens, feedFilter])

  const revThisMonth = data.stats.revenue_this_month ?? 0
  const revLastMonth = data.stats.revenue_last_month ?? 0
  const revChange = revLastMonth > 0 ? ((revThisMonth - revLastMonth) / revLastMonth) * 100 : 0
  const totalChickens = data.stats.total_chickens ?? 0
  const growthWeek = data.stats.total_chickens_growth_week ?? 0
  const stockAlerts = (data.stats.medicines_low_stock ?? 0) + (data.stats.feeds_low_stock ?? 0)
  const overdueVaccines = data.stats.vaccinations_overdue ?? 0
  const todayVaccines = data.stats.vaccinations_today ?? 0
  const totalDebt = data.top_debtors.reduce((s, d) => s + d.total_due, 0)

  // Critical action count for today
  const todayActions =
    overdueVaccines + (overdueVaccines > 0 ? 0 : todayVaccines) + stockAlerts

  return (
    <div className="space-y-5">
      {/* Greeting header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-700 dark:via-indigo-700 dark:to-purple-700 rounded-2xl p-5 md:p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/10 blur-2xl -translate-y-12 translate-x-12" />
        <div className="absolute bottom-0 left-0 w-28 h-28 rounded-full bg-white/10 blur-2xl translate-y-8 -translate-x-8" />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-widest opacity-80 font-semibold">
              {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold mt-1">
              {greet()}, <span className="text-amber-200">{data.user_name}</span>!
            </h1>
            <p className="text-sm opacity-95 mt-1.5 max-w-xl">
              {todayActions > 0
                ? `Bạn có ${todayActions} việc cần xử lý hôm nay 👇`
                : 'Mọi thứ đều ổn — chúc một ngày làm việc tốt lành! 🌿'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/admin/ho-so-ga/them-moi"
              className="bg-white/15 backdrop-blur-sm hover:bg-white/25 text-white rounded-lg px-3 py-2 text-xs font-bold transition border border-white/20"
            >
              + Thêm gà
            </Link>
            <Link
              href="/admin/ban-ra/them-moi"
              className="bg-white text-blue-700 hover:bg-blue-50 rounded-lg px-3 py-2 text-xs font-bold transition shadow-sm"
            >
              💵 Tạo đơn
            </Link>
          </div>
        </div>

        {/* Today's tasks pills */}
        {todayActions > 0 && (
          <div className="relative mt-4 flex flex-wrap gap-2">
            {overdueVaccines > 0 && (
              <Link
                href="/admin/tiem-phong"
                className="bg-red-500/30 hover:bg-red-500/40 backdrop-blur-sm border border-red-300/30 text-white rounded-full px-3 py-1 text-xs font-semibold transition"
              >
                🚨 {overdueVaccines} mũi tiêm quá hạn
              </Link>
            )}
            {todayVaccines > 0 && overdueVaccines === 0 && (
              <Link
                href="/admin/tiem-phong"
                className="bg-amber-500/30 hover:bg-amber-500/40 backdrop-blur-sm border border-amber-300/30 text-white rounded-full px-3 py-1 text-xs font-semibold transition"
              >
                ⏰ {todayVaccines} mũi tiêm hôm nay
              </Link>
            )}
            {(data.stats.medicines_low_stock ?? 0) > 0 && (
              <Link
                href="/admin/kho-thuoc"
                className="bg-orange-500/30 hover:bg-orange-500/40 backdrop-blur-sm border border-orange-300/30 text-white rounded-full px-3 py-1 text-xs font-semibold transition"
              >
                💊 {data.stats.medicines_low_stock} thuốc sắp hết
              </Link>
            )}
            {(data.stats.feeds_low_stock ?? 0) > 0 && (
              <Link
                href="/admin/kho-thuc-an"
                className="bg-orange-500/30 hover:bg-orange-500/40 backdrop-blur-sm border border-orange-300/30 text-white rounded-full px-3 py-1 text-xs font-semibold transition"
              >
                🌾 {data.stats.feeds_low_stock} thức ăn sắp hết
              </Link>
            )}
            {(data.stats.orders_pending ?? 0) > 0 && (
              <Link
                href="/admin/ban-ra"
                className="bg-blue-500/30 hover:bg-blue-500/40 backdrop-blur-sm border border-blue-300/30 text-white rounded-full px-3 py-1 text-xs font-semibold transition"
              >
                ⏳ {data.stats.orders_pending} đơn chờ xử lý
              </Link>
            )}
          </div>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi
          label="Tổng đàn"
          value={totalChickens.toLocaleString('vi-VN')}
          sub={
            growthWeek > 0
              ? `↑ +${growthWeek} so với tuần trước`
              : growthWeek < 0
                ? `↓ ${growthWeek}`
                : 'Không đổi'
          }
          subTint={growthWeek >= 0 ? 'emerald' : 'red'}
          tint="blue"
          icon="🐓"
          href="/admin/ho-so-ga"
        />
        <Kpi
          label="Doanh thu tháng"
          value={formatVnd(revThisMonth)}
          sub={
            revLastMonth > 0
              ? revChange >= 0
                ? `↑ ${revChange.toFixed(1)}% vs tháng trước`
                : `↓ ${Math.abs(revChange).toFixed(1)}%`
              : 'Tháng trước: —'
          }
          subTint={revChange >= 0 ? 'emerald' : 'red'}
          tint="emerald"
          icon="💰"
          href="/admin/tai-chinh/bao-cao/pnl"
        />
        <Kpi
          label="Sẵn sàng bán"
          value={(data.stats.ready_to_sell ?? 0).toLocaleString('vi-VN')}
          sub="Gà đến tuổi ra trường"
          tint="amber"
          icon="🥇"
          href="/admin/ho-so-ga?status=dang_nuoi"
        />
        <Kpi
          label="Công nợ"
          value={formatVnd(totalDebt)}
          sub={
            data.top_debtors.filter((d) => d.oldest_days > 30).length > 0
              ? `⚠ ${data.top_debtors.filter((d) => d.oldest_days > 30).length} khách quá hạn`
              : `${data.top_debtors.length} khách đang nợ`
          }
          tint="red"
          icon="📋"
          href="/admin/tai-chinh/bao-cao/cong-no"
        />
      </div>

      {/* 2-col main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Alerts (2/3 width) */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-red-600 to-rose-600 text-white px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-bold text-sm flex items-center gap-1.5">
              🔔 Cảnh báo &amp; thông báo
              {data.alerts.length > 0 && (
                <span className="bg-white/20 rounded-full px-2 py-0.5 text-[11px] tabular-nums">{data.alerts.length}</span>
              )}
            </h3>
            <div className="flex gap-1 flex-wrap">
              {(['', 'khan_cap', 'cao', 'trung_binh', 'thap'] as const).map((p) => (
                <button
                  key={p || 'all'}
                  onClick={() => setPriorityFilter(p)}
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition ${
                    priorityFilter === p
                      ? 'bg-white text-red-700 shadow-sm'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  {p === '' ? `Tất cả (${data.alerts.length})` : `${PRIORITY_META[p]?.emoji ?? ''} ${PRIORITY_META[p]?.label}`}
                </button>
              ))}
            </div>
          </div>
          {filteredAlerts.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-4xl mb-2">🎉</div>
              <p className="text-gray-600 dark:text-gray-400 font-semibold">
                Không có cảnh báo nào{priorityFilter ? ' cho mức này' : ''}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[500px] overflow-y-auto">
              {filteredAlerts.map((a) => {
                const meta = a.priority ? PRIORITY_META[a.priority] : null
                return (
                  <div key={a.id} className="px-4 py-3 hover:bg-gray-50/60 dark:hover:bg-gray-900/30 transition">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-9 h-9 rounded-lg bg-gradient-to-br ${meta?.gradient ?? 'from-gray-400 to-gray-500'} text-white flex items-center justify-center text-sm shrink-0`}
                      >
                        {meta?.emoji ?? '📌'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-sm truncate">{a.title}</h4>
                          {meta && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap ${meta.pill}`}>
                              {meta.label}
                            </span>
                          )}
                        </div>
                        {a.message && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">{a.message}</p>
                        )}
                        <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                          {new Date(a.created_at).toLocaleString('vi-VN')}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Top debtors (1/3 width) */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-4 py-2.5 flex items-center justify-between">
            <h3 className="font-bold text-sm">📋 Top khách nợ</h3>
            <Link href="/admin/tai-chinh/bao-cao/cong-no" className="text-[10px] bg-white/20 hover:bg-white/30 rounded-full px-2 py-0.5 font-semibold">
              Tất cả →
            </Link>
          </div>
          {data.top_debtors.length === 0 ? (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400 text-sm">
              ✓ Không có khách nào đang nợ
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {data.top_debtors.map((d) => {
                const isOverdue = d.oldest_days > 30
                return (
                  <Link
                    key={d.customer_id}
                    href={`/admin/tai-chinh/bao-cao/cong-no/${d.customer_id}`}
                    className="flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-900/40 transition"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                      {d.customer_name.split(' ').slice(-1)[0]?.[0] ?? '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-xs truncate">{d.customer_name}</div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400">
                        {d.oldest_days}d {isOverdue && '⚠'}
                      </div>
                    </div>
                    <div className={`text-xs font-extrabold tabular-nums ${isOverdue ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300'}`}>
                      {formatVnd(d.total_due)}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Activity feed + charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Activity feed (1/3) */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-bold text-sm">📡 Hoạt động gần đây</h3>
            <div className="flex gap-1 flex-wrap">
              {(
                [
                  ['all', 'Tất cả'],
                  ['sales', '💵 Bán'],
                  ['purchases', '📥 Nhập'],
                  ['chickens', '🐓 Gà'],
                ] as const
              ).map(([k, l]) => (
                <button
                  key={k}
                  onClick={() => setFeedFilter(k)}
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition ${
                    feedFilter === k
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          {activities.length === 0 ? (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400 text-sm">
              Chưa có hoạt động nào
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[420px] overflow-y-auto">
              {activities.map((a) => (
                <Link
                  key={a.id}
                  href={a.href}
                  className="flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-900/40 transition"
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0 ${
                      a.tint === 'emerald'
                        ? 'bg-emerald-100 dark:bg-emerald-900/40'
                        : a.tint === 'red'
                          ? 'bg-red-100 dark:bg-red-900/40'
                          : 'bg-blue-100 dark:bg-blue-900/40'
                    }`}
                  >
                    {a.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-xs truncate">{a.title}</div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                      {a.sub} · {formatDate(a.date)}
                    </div>
                  </div>
                  {a.amount != null && (
                    <div
                      className={`text-xs font-extrabold tabular-nums shrink-0 ${
                        a.amount > 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'
                      }`}
                    >
                      {a.amount > 0 ? '+' : ''}
                      {formatVnd(a.amount)}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Charts (2/3) */}
        <div className="lg:col-span-2 grid grid-cols-1 gap-4">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h3 className="font-bold text-sm">📊 Doanh thu vs Chi phí (6 tháng)</h3>
              <Link href="/admin/tai-chinh" className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-semibold">
                Tài chính →
              </Link>
            </div>
            <RevenueChart data={data.trends} />
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h3 className="font-bold text-sm">🏠 Tỷ lệ sống theo khu</h3>
              <Link href="/admin/chuong-trai" className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-semibold">
                Chuồng trại →
              </Link>
            </div>
            <SurvivalChart data={data.area_stats} />
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3 uppercase tracking-wider">
          ⚡ Truy cập nhanh
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
          <ActionMini href="/admin/ho-so-ga" icon="🐓" label="Hồ sơ gà" tint="blue" />
          <ActionMini href="/admin/ban-ra" icon="💵" label="Bán ra" tint="emerald" />
          <ActionMini href="/admin/mua-vao" icon="📥" label="Mua vào" tint="amber" />
          <ActionMini href="/admin/khach-hang" icon="👥" label="Khách hàng" tint="purple" />
          <ActionMini href="/admin/tiem-phong" icon="💉" label="Tiêm phòng" tint="red" />
          <ActionMini href="/admin/van-ga" icon="🥊" label="Vần gà" tint="orange" />
          <ActionMini href="/admin/sinh-san" icon="🥚" label="Sinh sản" tint="yellow" />
          <ActionMini href="/admin/tai-chinh" icon="💼" label="Tài chính" tint="indigo" />
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
  href,
}: {
  label: string
  value: string
  sub?: string
  tint: 'blue' | 'emerald' | 'amber' | 'red'
  subTint?: 'emerald' | 'red'
  icon: string
  href?: string
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

  const inner = (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-sm relative overflow-hidden hover:shadow-md transition group">
      <div className={`absolute top-0 right-0 w-16 h-16 rounded-full bg-gradient-to-br ${map[tint]} opacity-10 -translate-y-4 translate-x-4 group-hover:opacity-20 transition`} />
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
  return href ? <Link href={href}>{inner}</Link> : inner
}

function ActionMini({
  href,
  icon,
  label,
  tint,
}: {
  href: string
  icon: string
  label: string
  tint: 'blue' | 'emerald' | 'amber' | 'purple' | 'red' | 'orange' | 'yellow' | 'indigo'
}) {
  const map: Record<string, string> = {
    blue: 'from-blue-500 to-indigo-600',
    emerald: 'from-emerald-500 to-green-600',
    amber: 'from-amber-500 to-orange-600',
    purple: 'from-purple-500 to-fuchsia-600',
    red: 'from-red-500 to-rose-600',
    orange: 'from-orange-500 to-red-600',
    yellow: 'from-yellow-500 to-amber-600',
    indigo: 'from-indigo-500 to-blue-600',
  }
  return (
    <Link
      href={href}
      className="group block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all relative overflow-hidden"
    >
      <div className={`absolute -top-3 -right-3 w-12 h-12 rounded-full bg-gradient-to-br ${map[tint]} opacity-10 group-hover:opacity-20 transition`} />
      <div className="text-2xl mb-1 relative">{icon}</div>
      <div className="font-bold text-xs text-gray-900 dark:text-gray-100 relative truncate">{label}</div>
    </Link>
  )
}
