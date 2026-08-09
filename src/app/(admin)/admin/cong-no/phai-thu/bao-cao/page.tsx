import { createClient } from '@/lib/supabase/server'
import { getCurrentUserPermissions } from '@/lib/rbac/guard'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { DebtStatementClient, type StmtItem, type StmtPayment } from '@/components/admin/finance/DebtStatementClient'

export const revalidate = 0

export default async function ReceivablesStatementPage() {
  const ctx = await getCurrentUserPermissions()
  if (!ctx) redirect('/auth/login')
  if (!ctx.can('cong_no', 'read')) {
    return <div className="text-sm text-gray-500 dark:text-gray-400">Không có quyền xem công nợ.</div>
  }

  const supabase = await createClient()
  const [ordersRes, paysRes] = await Promise.all([
    supabase
      .from('sales_orders')
      .select('id, order_code, order_date, total_amount, paid_amount, customer:customers(id, name)')
      .in('status', ['dat_coc', 'da_giao'])
      .order('order_date', { ascending: false })
      .limit(5000),
    supabase
      .from('cash_transactions')
      .select('ref_id, transaction_date, amount')
      .eq('ref_type', 'sales_order')
      .eq('direction', 'in')
      .in('category', ['sale', 'deposit'])
      .limit(10000),
  ])

  type OrderRow = {
    id: string
    order_code: string
    order_date: string
    total_amount: number
    paid_amount: number | null
    customer: { id: string; name: string } | { id: string; name: string }[] | null
  }
  const orders = (ordersRes.data ?? []) as OrderRow[]
  const items: StmtItem[] = orders.map((o) => {
    const c = Array.isArray(o.customer) ? o.customer[0] : o.customer
    return {
      id: o.id,
      code: o.order_code,
      date: o.order_date,
      total: Number(o.total_amount),
      paid: Number(o.paid_amount ?? 0),
      partner_id: c?.id ?? null,
      partner_name: c?.name ?? null,
    }
  })

  const payments: StmtPayment[] = (
    (paysRes.data ?? []) as Array<{ ref_id: string; transaction_date: string; amount: number }>
  ).map((p) => ({ item_id: p.ref_id, date: p.transaction_date, amount: Number(p.amount) }))

  const pMap = new Map<string, string>()
  for (const it of items) if (it.partner_id && it.partner_name) pMap.set(it.partner_id, it.partner_name)
  const partners = [...pMap.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div>
      <div className="mb-5">
        <Link href="/admin/cong-no/phai-thu" className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2">
          <ArrowLeft className="w-4 h-4" /> Danh sách phải thu
        </Link>
        <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">📊 Báo cáo công nợ phải thu</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Số dư đầu kỳ · phát sinh tăng/giảm · số dư cuối kỳ · lọc theo kỳ & khách hàng
        </p>
      </div>
      <DebtStatementClient side="receivable" items={items} payments={payments} partners={partners} />
    </div>
  )
}
