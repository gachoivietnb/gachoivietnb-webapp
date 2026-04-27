import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getCurrentUserPermissions } from '@/lib/rbac/guard'
import { BuyersClient } from '@/components/admin/invoices/BuyersClient'
import { InvoiceTabs } from '@/components/admin/invoices/InvoiceTabs'

export const revalidate = 0

export default async function InvoiceBuyersPage() {
  const ctx = await getCurrentUserPermissions()
  if (!ctx) redirect('/auth/login')
  if (!ctx.can('hoa_don', 'read')) {
    return <div className="text-sm text-gray-500">Bạn chưa có quyền truy cập module Hóa đơn.</div>
  }

  const supabase = await createClient()

  const [buyersRes, customersRes] = await Promise.all([
    supabase
      .from('invoice_buyers')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(2000),
    supabase
      .from('customers')
      .select('id, name, phone, email, address')
      .order('total_spent', { ascending: false })
      .limit(2000),
  ])

  return (
    <div>
      <div className="mb-1">
        <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
          🧾 Hóa đơn điện tử
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Người mua hàng — đồng bộ 2 chiều với module Khách hàng. Có thể nhập từ KH có sẵn hoặc tạo mới + tra cứu MST tự động.
        </p>
      </div>

      <InvoiceTabs />

      <BuyersClient
        initialBuyers={buyersRes.data ?? []}
        customers={customersRes.data ?? []}
        canWrite={ctx.can('hoa_don', 'write')}
        canDelete={ctx.can('hoa_don', 'delete')}
      />
    </div>
  )
}
