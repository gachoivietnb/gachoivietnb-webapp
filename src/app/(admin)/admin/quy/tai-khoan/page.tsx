import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { redirect } from 'next/navigation'
import { getFarmContext } from '@/lib/multitenancy/farm-context'
import { listAccounts } from '@/lib/treasury/accounts'
import { AccountsCrudClient } from '@/components/admin/treasury/AccountsCrudClient'

export const revalidate = 0

export default async function AccountsCrudPage() {
  const ctx = await getFarmContext()
  if (!ctx) redirect('/auth/login')

  const accounts = await listAccounts()

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
            🏦 Tài khoản quỹ
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Quản lý tiền mặt, ngân hàng, ví điện tử của trại. Đặt 1 tài khoản làm mặc định để thu chi nhanh.
          </p>
        </div>
      </div>

      <AccountsCrudClient initialAccounts={accounts} />
    </div>
  )
}
