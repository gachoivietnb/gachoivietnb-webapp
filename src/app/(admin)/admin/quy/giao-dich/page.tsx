import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { redirect } from 'next/navigation'
import { getFarmContext } from '@/lib/multitenancy/farm-context'
import { createClient } from '@/lib/supabase/server'
import { listAccounts } from '@/lib/treasury/accounts'
import { TransactionsListClient } from '@/components/admin/treasury/TransactionsListClient'

export const revalidate = 0

type SearchParams = Promise<{ account_id?: string }>

export default async function TransactionsListPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const ctx = await getFarmContext()
  if (!ctx) redirect('/auth/login')

  const sp = await searchParams
  const supabase = await createClient()

  const [accounts, expenseCatsRes] = await Promise.all([
    listAccounts(),
    supabase
      .from('expense_categories')
      .select('id, name_vi, code')
      .order('display_order', { ascending: true }),
  ])

  type ExpCat = { id: string; name_vi: string; code: string }
  const expenseCategories = (expenseCatsRes.data as ExpCat[] | null) ?? []

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <Link
            href="/admin/quy"
            className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-1"
          >
            <ArrowLeft className="w-4 h-4" /> Quản lý quỹ
          </Link>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            🧾 Sổ giao dịch
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Tất cả dòng tiền, lọc theo tài khoản / phân loại / thời gian.
          </p>
        </div>
      </div>

      <TransactionsListClient
        accounts={accounts}
        expenseCategories={expenseCategories}
        initialAccountId={sp.account_id}
      />
    </div>
  )
}
