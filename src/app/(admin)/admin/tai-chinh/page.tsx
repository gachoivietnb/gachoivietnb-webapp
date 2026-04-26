import { createClient } from '@/lib/supabase/server'
import { ReportsHub, type HubKpi } from '@/components/admin/reports/ReportsHub'
import { listAccounts } from '@/lib/treasury/accounts'

export const revalidate = 0

export default async function ReportsPage() {
  const supabase = await createClient()

  const today = new Date()
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10)
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().slice(0, 10)
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().slice(0, 10)
  const monthLabel = `T${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`

  // Aggregate KPI tháng này + tháng trước để so sánh
  const [
    salesThisRes,
    salesLastRes,
    expensesThisRes,
    expensesLastRes,
    receivablesRes,
    accounts,
  ] = await Promise.all([
    supabase
      .from('chickens')
      .select('sale_price')
      .eq('status', 'da_ban')
      .gte('sale_date', monthStart)
      .lte('sale_date', monthEnd),
    supabase
      .from('chickens')
      .select('sale_price')
      .eq('status', 'da_ban')
      .gte('sale_date', lastMonthStart)
      .lte('sale_date', lastMonthEnd),
    supabase
      .from('expenses')
      .select('amount')
      .gte('expense_date', monthStart)
      .lte('expense_date', monthEnd),
    supabase
      .from('expenses')
      .select('amount')
      .gte('expense_date', lastMonthStart)
      .lte('expense_date', lastMonthEnd),
    supabase
      .from('customer_receivables')
      .select('amount_due'),
    listAccounts({ activeOnly: true }).catch(() => []),
  ])

  type SaleRow = { sale_price: number }
  type AmtRow = { amount: number }
  type DueRow = { amount_due: number }

  const sumPrice = (rows: SaleRow[] | null) =>
    (rows ?? []).reduce((s, r) => s + Number(r.sale_price ?? 0), 0)
  const sumAmt = (rows: AmtRow[] | null) =>
    (rows ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0)

  const revenue = sumPrice(salesThisRes.data as SaleRow[] | null)
  const revenueLast = sumPrice(salesLastRes.data as SaleRow[] | null)
  const expense = sumAmt(expensesThisRes.data as AmtRow[] | null)
  const expenseLast = sumAmt(expensesLastRes.data as AmtRow[] | null)
  const profit = revenue - expense
  const profitLast = revenueLast - expenseLast
  const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0

  const changeRevenue =
    revenueLast > 0 ? ((revenue - revenueLast) / revenueLast) * 100 : 0
  const changeProfit =
    profitLast !== 0
      ? ((profit - profitLast) / Math.abs(profitLast)) * 100
      : 0

  const receivables = (receivablesRes.data as DueRow[] | null) ?? []
  const receivableTotal = receivables.reduce((s, r) => s + Number(r.amount_due ?? 0), 0)

  const treasuryBalance = accounts.reduce((s, a) => s + Number(a.current_balance), 0)

  const kpi: HubKpi = {
    revenue,
    expense,
    profit,
    profitMargin,
    treasuryBalance,
    treasuryAccountCount: accounts.length,
    receivableTotal,
    receivableCount: receivables.length,
    monthLabel,
    changeRevenue,
    changeProfit,
  }

  return <ReportsHub kpi={kpi} />
}
