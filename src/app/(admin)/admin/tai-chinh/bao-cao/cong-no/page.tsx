import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ReceivablesClient, type AggCustomer } from '@/components/admin/finance/ReceivablesClient'

export const revalidate = 0

type Row = {
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

export default async function ReceivablesPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('customer_receivables')
    .select('*')
    .order('days_since_order', { ascending: false })

  const rows = (data ?? []) as Row[]

  const byCustomer = new Map<string, AggCustomer>()
  for (const r of rows) {
    const a = byCustomer.get(r.customer_id) ?? {
      customer_id: r.customer_id,
      customer_name: r.customer_name,
      phone: r.phone,
      total_due: 0,
      total_value: 0,
      total_paid: 0,
      order_count: 0,
      overdue_count: 0,
      oldest_days: 0,
    }
    a.total_due += Number(r.amount_due)
    a.total_value += Number(r.total_amount)
    a.total_paid += Number(r.paid_amount)
    a.order_count += 1
    if (r.days_since_order > 30) a.overdue_count += 1
    if (r.days_since_order > a.oldest_days) a.oldest_days = r.days_since_order
    byCustomer.set(r.customer_id, a)
  }

  const customers = Array.from(byCustomer.values()).sort((x, y) => y.total_due - x.total_due)

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
        <div>
          <Link
            href="/admin/tai-chinh/bao-cao"
            className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại 6 báo cáo
          </Link>
          <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
            ⚠️ Công nợ khách hàng
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {customers.length} khách còn nợ · Lọc thông minh theo tên, SĐT, mức nợ, tuổi nợ · Cảnh báo quá hạn 30/60/90 ngày
          </p>
        </div>
        {customers.length > 0 && (
          <div className="flex gap-2">
            <a
              href="/api/finance/reports/receivables-summary/export?format=excel"
              className="border border-emerald-500 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-1"
            >
              📊 Xuất Excel
            </a>
            <a
              href="/api/finance/reports/receivables-summary/export?format=pdf"
              className="border border-red-500 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-1"
            >
              📄 Xuất PDF
            </a>
          </div>
        )}
      </div>

      <ReceivablesClient customers={customers} />
    </div>
  )
}
