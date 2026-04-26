import { createClient } from '@/lib/supabase/server'
import { DashboardClient, type DashboardData } from '@/components/admin/dashboard/DashboardClient'
import { BackupReminderBanner } from '@/components/admin/backup/BackupReminderBanner'

export const revalidate = 0

export default async function DashboardPage() {
  const supabase = await createClient()

  // Auth context for greeting
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const profileRes = user
    ? await supabase.from('profiles').select('full_name, role').eq('id', user.id).maybeSingle<{ full_name: string; role: string }>()
    : null

  const today = new Date()
  const todayIso = today.toISOString().slice(0, 10)
  const weekAgo = new Date(today.getTime() - 7 * 86400000).toISOString().slice(0, 10)
  const monthAgo = new Date(today.getTime() - 30 * 86400000).toISOString().slice(0, 10)
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)

  const [
    statsRes,
    alertsRes,
    areaStatsRes,
    trendsRes,
    recentChickensRes,
    recentSalesRes,
    recentPurchasesRes,
    receivablesRes,
    todayVaccinesRes,
  ] = await Promise.all([
    supabase.rpc('dashboard_stats'),
    supabase
      .from('alerts')
      .select('id, title, message, priority, alert_type, entity_type, entity_id, created_at')
      .eq('status', 'chua_doc')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(20),
    supabase.from('area_survival_stats').select('*'),
    supabase.rpc('trends_6_months'),
    supabase
      .from('chickens_with_details')
      .select('id, chicken_code, name, breed_name, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('sales_orders')
      .select('id, order_code, order_date, total_amount, status, customer:customers(name, tier)')
      .order('order_date', { ascending: false })
      .limit(5),
    supabase
      .from('purchases')
      .select('id, purchase_code, purchase_date, total_quantity, total_amount, supplier:suppliers(name)')
      .order('purchase_date', { ascending: false })
      .limit(5),
    supabase
      .from('customer_receivables')
      .select('customer_id, customer_name, phone, amount_due, days_since_order')
      .order('amount_due', { ascending: false })
      .limit(5),
    supabase
      .from('vaccinations_due')
      .select('vaccination_id, scheduled_date, days_overdue', { count: 'exact', head: true })
      .lte('scheduled_date', todayIso),
  ])

  type DashStats = {
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
  const stats = (statsRes.data ?? {}) as DashStats

  type AlertRow = {
    id: string
    title: string
    message: string | null
    priority: string | null
    alert_type: string | null
    entity_type: string | null
    entity_id: string | null
    created_at: string
  }

  type AreaStat = {
    area_code: string | null
    area_name: string | null
    survival_rate_pct: number | null
    chickens_count: number | null
  }

  type Trend = {
    month: string
    revenue: string | number
    expenses: string | number
    net_profit: string | number
  }

  type ChickenRow = {
    id: string
    chicken_code: string
    name: string | null
    breed_name: string | null
    status: string
    created_at: string
  }

  type SaleRow = {
    id: string
    order_code: string
    order_date: string
    total_amount: number
    status: string
    customer: { name: string; tier: string | null } | null
  }

  type PurchaseRow = {
    id: string
    purchase_code: string
    purchase_date: string
    total_quantity: number
    total_amount: number
    supplier: { name: string } | null
  }

  type DebtorRow = {
    customer_id: string
    customer_name: string
    phone: string | null
    amount_due: number
    days_since_order: number
  }

  // Aggregate top debtors per customer
  const debtRows = (receivablesRes.data ?? []) as DebtorRow[]
  const debtorMap = new Map<string, { name: string; phone: string | null; due: number; oldest: number }>()
  for (const r of debtRows) {
    const cur = debtorMap.get(r.customer_id) ?? { name: r.customer_name, phone: r.phone, due: 0, oldest: 0 }
    cur.due += Number(r.amount_due)
    if (r.days_since_order > cur.oldest) cur.oldest = r.days_since_order
    debtorMap.set(r.customer_id, cur)
  }
  const topDebtors = [...debtorMap.entries()]
    .map(([id, v]) => ({ customer_id: id, customer_name: v.name, phone: v.phone, total_due: v.due, oldest_days: v.oldest }))
    .sort((a, b) => b.total_due - a.total_due)
    .slice(0, 5)

  const data: DashboardData = {
    user_name: profileRes?.data?.full_name ?? user?.email?.split('@')[0] ?? 'bạn',
    user_role: profileRes?.data?.role ?? null,
    stats,
    alerts: (alertsRes.data ?? []) as AlertRow[],
    area_stats: (areaStatsRes.data ?? []) as AreaStat[],
    trends: (trendsRes.data ?? []) as Trend[],
    recent_chickens: (recentChickensRes.data ?? []) as ChickenRow[],
    recent_sales: (recentSalesRes.data ?? []) as SaleRow[],
    recent_purchases: (recentPurchasesRes.data ?? []) as PurchaseRow[],
    top_debtors: topDebtors,
    vaccines_due_today: todayVaccinesRes.count ?? 0,
    today_iso: todayIso,
    week_ago: weekAgo,
    month_ago: monthAgo,
    first_of_month: firstOfMonth,
  }

  return (
    <>
      <BackupReminderBanner />
      <DashboardClient data={data} />
    </>
  )
}
