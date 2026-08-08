import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { listAccounts } from '@/lib/treasury/accounts'
import { getTreasurySummary } from '@/lib/treasury/transactions'
import { getAssetKpi } from '@/lib/assets/queries'

/* ============================================================
 * Aggregator — gom toàn bộ KPI của farm theo khoảng [from, to]
 * Dùng cho: Báo cáo tổng hợp, AI analysis, dashboard...
 * ============================================================ */

export type PeriodAggregates = {
  from: string
  to: string
  // Đàn gà
  chickens_total: number
  chickens_alive: number
  chickens_hatched: number
  chickens_sold: number
  chickens_died: number
  chickens_culled: number
  survival_rate: number
  mortality_rate: number
  // Doanh thu / chi phí
  sales_revenue: number
  sales_count: number
  cogs: number
  expense_total: number
  expense_by_category: Array<{ name: string; code: string; amount: number; pct: number }>
  payroll_total: number
  // Lãi lỗ
  gross_profit: number
  net_profit: number
  net_margin: number
  // Dòng tiền
  cash_in: number
  cash_out: number
  net_cash_flow: number
  // Quỹ
  treasury_balance: number
  treasury_account_count: number
  // Khách hàng / công nợ
  receivable_total: number
  receivable_count: number
  // Kho
  feed_value: number
  medicine_value: number
  medicine_expiring_soon: number  // < 30 ngày
  // Tài sản
  asset_value: number
  asset_count: number
  asset_need_maintenance: number
  asset_broken: number
  // Tiêm phòng
  vaccinations_done: number
  // Sinh sản
  litters: number
  eggs_set: number
  eggs_hatched: number
  hatch_rate: number
}

function fmtDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export async function aggregateForPeriod(from: string, to: string): Promise<PeriodAggregates> {
  const supabase = await createClient()

  const [
    chickensRes,
    salesRes,
    expensesRes,
    payrollRes,
    receivablesRes,
    feedsRes,
    medicinesRes,
    vacsRes,
    littersRes,
    treasuryAccounts,
    treasurySummary,
    assetKpi,
  ] = await Promise.all([
    supabase
      .from('chickens')
      .select('id, status, hatch_date, death_date, sale_date, sale_price, cost_basis')
      .limit(20000),
    supabase
      .from('chickens')
      .select('sale_price, cost_basis, sale_date, status')
      .eq('status', 'da_ban')
      .gte('sale_date', from)
      .lte('sale_date', to),
    supabase
      .from('expenses')
      .select('amount, expense_date, category:expense_categories(name_vi, code)')
      .gte('expense_date', from)
      .lte('expense_date', to),
    supabase
      .from('payroll_payments')
      .select('net_paid, paid_date')
      .gte('paid_date', from)
      .lte('paid_date', to),
    supabase
      .from('customer_receivables')
      .select('amount_due'),
    supabase.from('feeds').select('current_stock, cost_per_unit').eq('is_active', true),
    supabase.from('medicines').select('current_stock, cost_per_unit, expiry_date').eq('is_active', true),
    supabase
      .from('vaccinations')
      .select('id, vaccination_date')
      .gte('vaccination_date', from)
      .lte('vaccination_date', to),
    supabase
      .from('breeding_litters')
      .select('id, set_date, eggs_set, eggs_hatched, hatch_date')
      .gte('set_date', from)
      .lte('set_date', to),
    listAccounts({ activeOnly: true }).catch(() => []),
    getTreasurySummary({ fromDate: from, toDate: to }).catch(() => ({
      totalIn: 0, totalOut: 0, netFlow: 0, txCount: 0, byCategory: [], byDay: [],
    })),
    getAssetKpi().catch(() => null),
  ])

  type Chicken = {
    id: string; status: string
    hatch_date: string | null; death_date: string | null; sale_date: string | null
    sale_price: number | null; cost_basis: number | null
  }
  type Sale = { sale_price: number; cost_basis: number | null; sale_date: string }
  type Expense = { amount: number; expense_date: string; category: { name_vi: string; code: string } | null }
  type Payroll = { net_paid: number; paid_date: string }
  type Recv = { amount_due: number }
  type Feed = { current_stock: number; cost_per_unit: number | null }
  type Medicine = { current_stock: number; cost_per_unit: number | null; expiry_date: string | null }
  type Vac = { id: string; vaccination_date: string }
  type Litter = { id: string; eggs_set: number | null; eggs_hatched: number | null; hatch_date: string | null }

  const chickens = (chickensRes.data as Chicken[] | null) ?? []
  const sales = (salesRes.data as Sale[] | null) ?? []
  const expenses = (expensesRes.data as Expense[] | null) ?? []
  const payrolls = (payrollRes.data as Payroll[] | null) ?? []
  const receivables = (receivablesRes.data as Recv[] | null) ?? []
  const feeds = (feedsRes.data as Feed[] | null) ?? []
  const medicines = (medicinesRes.data as Medicine[] | null) ?? []
  const vaccs = (vacsRes.data as Vac[] | null) ?? []
  const litters = (littersRes.data as Litter[] | null) ?? []

  // ====== Đàn gà ======
  const within = (date: string | null) => date && date >= from && date <= to

  const chickens_total = chickens.length
  const chickens_alive = chickens.filter((c) => c.status === 'dang_nuoi').length
  const chickens_hatched = chickens.filter((c) => within(c.hatch_date)).length
  const chickens_sold = chickens.filter((c) => within(c.sale_date)).length
  const chickens_died = chickens.filter((c) => within(c.death_date) && c.status === 'chet').length
  const chickens_culled = chickens.filter((c) => within(c.death_date) && c.status === 'loai_thai').length

  const begin_alive = chickens.filter((c) => {
    if (!c.hatch_date || c.hatch_date >= from) return false
    if (c.death_date && c.death_date < from) return false
    if (c.sale_date && c.sale_date < from) return false
    return true
  }).length
  const totalAtRisk = begin_alive + chickens_hatched
  const totalLost = chickens_died + chickens_culled
  const survival_rate = totalAtRisk > 0 ? ((totalAtRisk - totalLost) / totalAtRisk) * 100 : 100
  const mortality_rate = totalAtRisk > 0 ? (totalLost / totalAtRisk) * 100 : 0

  // ====== Doanh thu ======
  const sales_revenue = sales.reduce((s, r) => s + Number(r.sale_price ?? 0), 0)
  const sales_count = sales.length
  const cogs = sales.reduce((s, r) => s + Number(r.cost_basis ?? 0), 0)

  // ====== Chi phí ======
  const expense_total = expenses.reduce((s, r) => s + Number(r.amount ?? 0), 0)
  const expCatMap = new Map<string, { name: string; code: string; amount: number }>()
  for (const e of expenses) {
    const code = e.category?.code ?? 'khac'
    const name = e.category?.name_vi ?? 'Khác'
    const cur = expCatMap.get(code) ?? { name, code, amount: 0 }
    cur.amount += Number(e.amount ?? 0)
    expCatMap.set(code, cur)
  }
  const expense_by_category = [...expCatMap.values()]
    .map((c) => ({ ...c, pct: expense_total > 0 ? (c.amount / expense_total) * 100 : 0 }))
    .sort((a, b) => b.amount - a.amount)

  // ====== Payroll ======
  const payroll_total = payrolls.reduce((s, p) => s + Number(p.net_paid ?? 0), 0)

  // ====== P&L ======
  const gross_profit = sales_revenue - cogs
  const net_profit = sales_revenue - cogs - expense_total
  const net_margin = sales_revenue > 0 ? (net_profit / sales_revenue) * 100 : 0

  // ====== Dòng tiền ======
  const cash_in = treasurySummary.totalIn
  const cash_out = treasurySummary.totalOut
  const net_cash_flow = cash_in - cash_out
  const treasury_balance = treasuryAccounts.reduce((s, a) => s + Number(a.current_balance), 0)

  // ====== Khách / nợ ======
  const receivable_total = receivables.reduce((s, r) => s + Number(r.amount_due ?? 0), 0)

  // ====== Kho ======
  const feed_value = feeds.reduce((s, f) => s + Number(f.current_stock) * Number(f.cost_per_unit ?? 0), 0)
  const medicine_value = medicines.reduce(
    (s, m) => s + Number(m.current_stock) * Number(m.cost_per_unit ?? 0),
    0
  )
  const now = Date.now()
  const medicine_expiring_soon = medicines.filter((m) => {
    if (!m.expiry_date) return false
    const days = (new Date(m.expiry_date).getTime() - now) / 86400000
    return days >= 0 && days < 30
  }).length

  // ====== Sinh sản ======
  const eggs_set = litters.reduce((s, l) => s + Number(l.eggs_set ?? 0), 0)
  const eggs_hatched = litters.reduce((s, l) => s + Number(l.eggs_hatched ?? 0), 0)
  const hatch_rate = eggs_set > 0 ? (eggs_hatched / eggs_set) * 100 : 0

  return {
    from, to,
    chickens_total, chickens_alive, chickens_hatched, chickens_sold,
    chickens_died, chickens_culled,
    survival_rate, mortality_rate,
    sales_revenue, sales_count, cogs, expense_total,
    expense_by_category,
    payroll_total,
    gross_profit, net_profit, net_margin,
    cash_in, cash_out, net_cash_flow,
    treasury_balance,
    treasury_account_count: treasuryAccounts.length,
    receivable_total, receivable_count: receivables.length,
    feed_value, medicine_value, medicine_expiring_soon,
    asset_value: assetKpi?.totalValue ?? 0,
    asset_count: assetKpi?.totalCount ?? 0,
    asset_need_maintenance: assetKpi?.needMaintenance ?? 0,
    asset_broken: assetKpi?.brokenCount ?? 0,
    vaccinations_done: vaccs.length,
    litters: litters.length,
    eggs_set, eggs_hatched, hatch_rate,
  }
}

export function getPeriodPair(preset: 'this_month' | 'last_month' | 'this_quarter' | 'this_year'): {
  current: { from: string; to: string; label: string }
  previous: { from: string; to: string; label: string }
} {
  const today = new Date()

  if (preset === 'this_month') {
    const cFrom = new Date(today.getFullYear(), today.getMonth(), 1)
    const cTo = today
    const pFrom = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const pTo = new Date(today.getFullYear(), today.getMonth(), 0)
    return {
      current: { from: fmtDate(cFrom), to: fmtDate(cTo), label: `T${today.getMonth() + 1}/${today.getFullYear()}` },
      previous: { from: fmtDate(pFrom), to: fmtDate(pTo), label: `T${pFrom.getMonth() + 1}/${pFrom.getFullYear()}` },
    }
  }
  if (preset === 'last_month') {
    const cFrom = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const cTo = new Date(today.getFullYear(), today.getMonth(), 0)
    const pFrom = new Date(today.getFullYear(), today.getMonth() - 2, 1)
    const pTo = new Date(today.getFullYear(), today.getMonth() - 1, 0)
    return {
      current: { from: fmtDate(cFrom), to: fmtDate(cTo), label: `T${cFrom.getMonth() + 1}/${cFrom.getFullYear()}` },
      previous: { from: fmtDate(pFrom), to: fmtDate(pTo), label: `T${pFrom.getMonth() + 1}/${pFrom.getFullYear()}` },
    }
  }
  if (preset === 'this_quarter') {
    const q = Math.floor(today.getMonth() / 3)
    const cFrom = new Date(today.getFullYear(), q * 3, 1)
    const cTo = today
    const pFrom = new Date(today.getFullYear(), (q - 1) * 3, 1)
    const pTo = new Date(today.getFullYear(), q * 3, 0)
    return {
      current: { from: fmtDate(cFrom), to: fmtDate(cTo), label: `Q${q + 1}/${today.getFullYear()}` },
      previous: { from: fmtDate(pFrom), to: fmtDate(pTo), label: `Q${q}/${pFrom.getFullYear()}` },
    }
  }
  // this_year
  const cFrom = new Date(today.getFullYear(), 0, 1)
  const cTo = today
  const pFrom = new Date(today.getFullYear() - 1, 0, 1)
  const pTo = new Date(today.getFullYear() - 1, 11, 31)
  return {
    current: { from: fmtDate(cFrom), to: fmtDate(cTo), label: `Năm ${today.getFullYear()}` },
    previous: { from: fmtDate(pFrom), to: fmtDate(pTo), label: `Năm ${today.getFullYear() - 1}` },
  }
}
