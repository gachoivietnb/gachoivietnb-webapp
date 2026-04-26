import { createClient } from '@/lib/supabase/server'
import { CustomersClient, type CustomerRow } from '@/components/admin/customers/CustomersClient'
import { getCurrentUserPermissions } from '@/lib/rbac/guard'

export const revalidate = 0

export default async function KhachHangPage() {
  const supabase = await createClient()

  const [customersRes, receivablesRes] = await Promise.all([
    supabase.from('customers').select('*').order('total_spent', { ascending: false }).limit(2000),
    supabase
      .from('customer_receivables')
      .select('customer_id, amount_due, days_since_order, total_amount'),
  ])

  type RawCustomer = {
    id: string
    name: string
    phone: string | null
    zalo: string | null
    facebook: string | null
    email: string | null
    address: string | null
    tier: string
    notes: string | null
    total_purchased: number
    total_spent: number
    last_purchase_date: string | null
    source: string | null
    created_at: string
  }

  const rawCustomers = (customersRes.data ?? []) as RawCustomer[]
  type RecRow = { customer_id: string; amount_due: number; days_since_order: number; total_amount: number }
  const recs = (receivablesRes.data ?? []) as RecRow[]

  // Aggregate receivables per customer
  const recAgg = new Map<string, { totalDue: number; oldestDays: number; ordersOverdue: number }>()
  for (const r of recs) {
    const cur = recAgg.get(r.customer_id) ?? { totalDue: 0, oldestDays: 0, ordersOverdue: 0 }
    cur.totalDue += Number(r.amount_due)
    if (r.days_since_order > cur.oldestDays) cur.oldestDays = r.days_since_order
    if (r.days_since_order > 30) cur.ordersOverdue += 1
    recAgg.set(r.customer_id, cur)
  }

  const today = new Date()
  function daysSinceLast(date: string | null): number | null {
    if (!date) return null
    return Math.floor((today.getTime() - new Date(date).getTime()) / 86400000)
  }

  const customers: CustomerRow[] = rawCustomers.map((c) => {
    const r = recAgg.get(c.id)
    const lastDays = daysSinceLast(c.last_purchase_date)
    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      zalo: c.zalo,
      facebook: c.facebook,
      email: c.email,
      address: c.address,
      tier: c.tier,
      notes: c.notes,
      source: c.source,
      total_purchased: c.total_purchased,
      total_spent: Number(c.total_spent),
      last_purchase_date: c.last_purchase_date,
      days_since_last: lastDays,
      total_due: r?.totalDue ?? 0,
      oldest_due_days: r?.oldestDays ?? 0,
      orders_overdue: r?.ordersOverdue ?? 0,
      created_at: c.created_at,
    }
  })

  const ctx = await getCurrentUserPermissions()
  const canWrite = ctx?.can('khach_hang', 'write') ?? false
  const canDelete = ctx?.can('khach_hang', 'delete') ?? false

  return (
    <CustomersClient customers={customers} canWrite={canWrite} canDelete={canDelete} />
  )
}
