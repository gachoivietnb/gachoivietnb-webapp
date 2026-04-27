import { createClient } from '@/lib/supabase/server'
import { DashboardPro, type DashboardProData } from '@/components/admin/dashboard/DashboardPro'
import { BackupReminderBanner } from '@/components/admin/backup/BackupReminderBanner'
import { StockAlertsBanner } from '@/components/admin/dashboard/StockAlertsBanner'

export const revalidate = 0

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const profileRes = user
    ? await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .maybeSingle<{ full_name: string; role: string }>()
    : null

  const [
    kpiRes,
    trendsRes,
    topCustomersRes,
    breedRevenueRes,
    expenseBreakdownRes,
    cashAccountsRes,
    alertsRes,
    recentSalesRes,
    recentChickensRes,
  ] = (await Promise.all([
    supabase.rpc('dashboard_kpis_v2'),
    supabase.rpc('trends_12_months'),
    supabase.rpc('dashboard_top_customers', { p_limit: 5 }),
    supabase.rpc('dashboard_breed_revenue'),
    supabase.rpc('dashboard_expense_breakdown'),
    supabase
      .from('cash_account_balances')
      .select('id, name, account_type, current_balance, icon, color, display_order')
      .order('display_order'),
    supabase
      .from('alerts')
      .select('id, title, message, priority, alert_type, created_at')
      .eq('status', 'chua_doc')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('sales_orders')
      .select('id, order_code, order_date, total_amount, status, customer:customers(name)')
      .order('order_date', { ascending: false })
      .limit(5),
    supabase
      .from('chickens_with_details')
      .select('id, chicken_code, name, breed_name, status')
      .order('created_at', { ascending: false })
      .limit(5),
  ])) as [
    { data: Record<string, unknown> | null },
    { data: Array<Record<string, unknown>> | null },
    { data: Array<Record<string, unknown>> | null },
    { data: Array<Record<string, unknown>> | null },
    { data: Array<Record<string, unknown>> | null },
    { data: Array<Record<string, unknown>> | null },
    { data: Array<Record<string, unknown>> | null },
    { data: Array<Record<string, unknown>> | null },
    { data: Array<Record<string, unknown>> | null }
  ]

  type RecentSaleRow = {
    id: string
    order_code: string
    order_date: string
    total_amount: number
    status: string
    customer: { name: string } | { name: string }[] | null
  }

  const recentSales = ((recentSalesRes.data ?? []) as unknown as RecentSaleRow[]).map((s) => ({
    id: s.id,
    order_code: s.order_code,
    order_date: s.order_date,
    total_amount: Number(s.total_amount),
    status: s.status,
    customer_name: Array.isArray(s.customer) ? s.customer[0]?.name ?? null : s.customer?.name ?? null,
  }))

  const data: DashboardProData = {
    user_name: profileRes?.data?.full_name ?? user?.email?.split('@')[0] ?? 'bạn',
    user_role: profileRes?.data?.role ?? null,
    kpis: (kpiRes.data ?? {}) as DashboardProData['kpis'],
    trends_12mo: (trendsRes.data ?? []) as DashboardProData['trends_12mo'],
    top_customers: (topCustomersRes.data ?? []) as DashboardProData['top_customers'],
    breed_revenue: (breedRevenueRes.data ?? []) as DashboardProData['breed_revenue'],
    expense_breakdown: (expenseBreakdownRes.data ?? []) as DashboardProData['expense_breakdown'],
    cash_accounts: (cashAccountsRes.data ?? []) as DashboardProData['cash_accounts'],
    alerts: (alertsRes.data ?? []) as DashboardProData['alerts'],
    recent_sales: recentSales,
    recent_chickens: (recentChickensRes.data ?? []) as DashboardProData['recent_chickens'],
  }

  return (
    <>
      <BackupReminderBanner />
      {/* @ts-expect-error Async Server Component */}
      <StockAlertsBanner />
      <DashboardPro data={data} />
    </>
  )
}
