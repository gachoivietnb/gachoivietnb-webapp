import { createClient } from '@/lib/supabase/server'

export type ReceivableRow = {
  customer_id: string
  customer_name: string
  phone: string | null
  order_id: string
  order_code: string
  order_date: string
  total_amount: number
  paid_amount: number
  amount_due: number
  status: string
  days_since_order: number
}

export type CustomerAging = {
  customer_id: string
  customer_name: string
  phone: string | null
  tier: string | null
  order_count: number
  total_value: number
  total_paid: number
  total_due: number
  oldest_days: number
  overdue_count: number
  lt30: number
  b30_60: number
  b60_90: number
  gt90: number
}

export async function loadReceivablesSummary(): Promise<{
  rows: ReceivableRow[]
  customers: CustomerAging[]
  grandTotal: number
  farmInfo: Record<string, string>
}> {
  const supabase = await createClient()

  const [{ data: rowsRaw }, { data: custRaw }, { data: settings }] = await Promise.all([
    supabase
      .from('customer_receivables')
      .select('*')
      .order('days_since_order', { ascending: false }),
    supabase.from('customers').select('id, tier'),
    supabase.from('system_settings').select('key, value').eq('key', 'farm_info').maybeSingle(),
  ])

  const rows = (rowsRaw ?? []) as ReceivableRow[]
  const customers = (custRaw ?? []) as Array<{ id: string; tier: string | null }>
  const tierMap = new Map(customers.map((c) => [c.id, c.tier]))

  const today = new Date()
  const by = new Map<string, CustomerAging>()
  for (const r of rows) {
    const a = by.get(r.customer_id) ?? {
      customer_id: r.customer_id,
      customer_name: r.customer_name,
      phone: r.phone,
      tier: tierMap.get(r.customer_id) ?? null,
      order_count: 0,
      total_value: 0,
      total_paid: 0,
      total_due: 0,
      oldest_days: 0,
      overdue_count: 0,
      lt30: 0,
      b30_60: 0,
      b60_90: 0,
      gt90: 0,
    }
    a.order_count += 1
    a.total_value += Number(r.total_amount)
    a.total_paid += Number(r.paid_amount)
    a.total_due += Number(r.amount_due)
    if (r.days_since_order > a.oldest_days) a.oldest_days = r.days_since_order
    if (r.days_since_order > 30) a.overdue_count += 1

    const days = Math.floor(
      (today.getTime() - new Date(r.order_date).getTime()) / (86400 * 1000)
    )
    const due = Number(r.amount_due)
    if (days < 30) a.lt30 += due
    else if (days < 60) a.b30_60 += due
    else if (days < 90) a.b60_90 += due
    else a.gt90 += due

    by.set(r.customer_id, a)
  }

  const customerList = Array.from(by.values()).sort((x, y) => y.total_due - x.total_due)
  const grandTotal = customerList.reduce((s, c) => s + c.total_due, 0)

  const farmInfo =
    ((settings as { value?: Record<string, string> } | null)?.value as Record<string, string>) ?? {}

  return { rows, customers: customerList, grandTotal, farmInfo }
}

export type CustomerLedger = {
  customer: {
    id: string
    name: string
    phone: string | null
    zalo: string | null
    email: string | null
    address: string | null
    tier: string | null
    total_purchased: number
    total_spent: number
  }
  orders: Array<{
    id: string
    order_code: string
    order_date: string
    status: string
    total_amount: number
    paid_amount: number
    deposit_amount: number | null
    deposit_date: string | null
    delivered_date: string | null
    payment_method: string | null
    chicken_names: string
    days_since: number
    amount_due: number
  }>
  payments: Array<{ date: string; amount: number; note: string; orderCode: string }>
  aging: { lt30: number; b30_60: number; b60_90: number; gt90: number }
  totalInvoiced: number
  totalPaid: number
  totalDue: number
  farmInfo: Record<string, string>
}

export async function loadCustomerLedger(customerId: string): Promise<CustomerLedger | null> {
  const supabase = await createClient()

  const [{ data: c }, { data: ordersRaw }, { data: settings }] = await Promise.all([
    supabase.from('customers').select('*').eq('id', customerId).maybeSingle(),
    supabase
      .from('sales_orders')
      .select(
        'id, order_code, order_date, status, total_amount, paid_amount, deposit_amount, deposit_date, delivered_date, payment_method, sales_items(chicken:chickens(chicken_code, name))'
      )
      .eq('customer_id', customerId)
      .order('order_date', { ascending: false }),
    supabase.from('system_settings').select('value').eq('key', 'farm_info').maybeSingle(),
  ])

  if (!c) return null

  const farmInfo =
    ((settings as { value?: Record<string, string> } | null)?.value as Record<string, string>) ?? {}

  const today = new Date()
  const orders = ((ordersRaw ?? []) as Array<{
    id: string
    order_code: string
    order_date: string
    status: string
    total_amount: number
    paid_amount: number
    deposit_amount: number | null
    deposit_date: string | null
    delivered_date: string | null
    payment_method: string | null
    sales_items: Array<{ chicken: { chicken_code: string | null; name: string | null } | null }> | null
  }>).map((o) => {
    const days = Math.floor(
      (today.getTime() - new Date(o.order_date).getTime()) / (86400 * 1000)
    )
    const chicken_names = (o.sales_items ?? [])
      .map((si) => si.chicken?.name ?? si.chicken?.chicken_code ?? '—')
      .join(', ')
    return {
      id: o.id,
      order_code: o.order_code,
      order_date: o.order_date,
      status: o.status,
      total_amount: Number(o.total_amount),
      paid_amount: Number(o.paid_amount ?? 0),
      deposit_amount: o.deposit_amount ? Number(o.deposit_amount) : null,
      deposit_date: o.deposit_date,
      delivered_date: o.delivered_date,
      payment_method: o.payment_method,
      chicken_names,
      days_since: days,
      amount_due: Number(o.total_amount) - Number(o.paid_amount ?? 0),
    }
  })

  const activeOrders = orders.filter((o) => o.status !== 'huy')
  const totalInvoiced = activeOrders.reduce((s, o) => s + o.total_amount, 0)
  const totalPaid = activeOrders.reduce((s, o) => s + o.paid_amount, 0)
  const totalDue = totalInvoiced - totalPaid

  const aging = { lt30: 0, b30_60: 0, b60_90: 0, gt90: 0 }
  for (const o of activeOrders) {
    if (o.amount_due <= 0) continue
    if (o.days_since < 30) aging.lt30 += o.amount_due
    else if (o.days_since < 60) aging.b30_60 += o.amount_due
    else if (o.days_since < 90) aging.b60_90 += o.amount_due
    else aging.gt90 += o.amount_due
  }

  const payments: CustomerLedger['payments'] = []
  for (const o of activeOrders) {
    if (o.deposit_amount && o.deposit_amount > 0 && o.deposit_date) {
      payments.push({
        date: o.deposit_date,
        amount: o.deposit_amount,
        note: 'Đặt cọc',
        orderCode: o.order_code,
      })
    }
    const settled = o.paid_amount - (o.deposit_amount ?? 0)
    if (settled > 0 && o.delivered_date) {
      payments.push({
        date: o.delivered_date,
        amount: settled,
        note: 'Thanh toán khi giao',
        orderCode: o.order_code,
      })
    }
  }
  payments.sort((a, b) => (a.date < b.date ? 1 : -1))

  return {
    customer: c as CustomerLedger['customer'],
    orders,
    payments,
    aging,
    totalInvoiced,
    totalPaid,
    totalDue,
    farmInfo,
  }
}

export const ORDER_STATUS_LABEL: Record<string, string> = {
  hoi_mua: 'Hỏi mua',
  dat_coc: 'Đặt cọc',
  da_giao: 'Đã giao',
  huy: 'Đã hủy',
}

export function fmtVnd(n: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(n))
}

export function fmtDate(s: string | null | undefined): string {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('vi-VN')
}
