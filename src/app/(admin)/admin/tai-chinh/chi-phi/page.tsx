import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ExpenseManager } from '@/components/admin/finance/ExpenseManager'

export const revalidate = 0

export default async function ChiPhiPage() {
  const supabase = await createClient()

  const today = new Date()
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .split('T')[0]
  const firstOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    .toISOString()
    .split('T')[0]

  const [catRes, thisMonthRes, lastMonthRes] = await Promise.all([
    supabase
      .from('expense_categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order'),
    supabase
      .from('expenses')
      .select('*, category:expense_categories(code, name_vi)')
      .gte('expense_date', firstOfMonth)
      .order('expense_date', { ascending: false })
      .limit(500),
    supabase
      .from('expenses')
      .select('amount')
      .gte('expense_date', firstOfLastMonth)
      .lt('expense_date', firstOfMonth),
  ])

  const lastMonthTotal = (lastMonthRes.data ?? []).reduce(
    (s: number, r) => s + Number((r as { amount: number }).amount ?? 0),
    0
  )

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
        <div>
          <Link
            href="/admin/tai-chinh"
            className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại Tài chính
          </Link>
          <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
            💸 Chi phí
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Ghi nhận chi phí hàng ngày · Phân bổ theo 8 hạng mục · So sánh tháng trước
          </p>
        </div>
        <Link
          href="/admin/tai-chinh/bao-cao/chi-phi"
          className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-semibold shadow hover:shadow-lg transition flex items-center gap-1.5"
        >
          📊 Báo cáo chi phí →
        </Link>
      </div>

      <ExpenseManager
        categories={(catRes.data ?? []) as never}
        expenses={(thisMonthRes.data ?? []) as never}
        lastMonthTotal={lastMonthTotal}
      />
    </div>
  )
}
