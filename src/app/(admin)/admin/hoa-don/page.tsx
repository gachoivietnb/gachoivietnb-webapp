import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserPermissions } from '@/lib/rbac/guard'
import { InvoiceTabs } from '@/components/admin/invoices/InvoiceTabs'
import { InvoicesClient } from '@/components/admin/invoices/InvoicesClient'

export const revalidate = 0

export default async function InvoicesPage() {
  const ctx = await getCurrentUserPermissions()
  if (!ctx) redirect('/auth/login')
  if (!ctx.can('hoa_don', 'read')) {
    return (
      <div className="text-sm text-gray-500">Bạn chưa có quyền truy cập module Hóa đơn.</div>
    )
  }

  const supabase = await createClient()

  const [invoicesRes, providersRes, statsRes] = await Promise.all([
    supabase
      .from('invoices_full')
      .select('*')
      .order('issue_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(2000),
    supabase.from('invoice_providers').select('id, name, provider_code').eq('is_active', true),
    supabase
      .from('invoice_monthly_stats')
      .select('*')
      .order('month', { ascending: false })
      .limit(12),
  ])

  // Provider check — nếu chưa có NCC nào thì show banner
  const hasProvider = (providersRes.data ?? []).length > 0

  return (
    <div>
      <div className="mb-1">
        <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
          🧾 Hóa đơn điện tử
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Phát hành, quản lý, báo cáo HĐ điện tử theo TT 78/2021/TT-BTC. Tích hợp Viettel/VNPT/MISA.
        </p>
      </div>

      <InvoiceTabs />

      {!hasProvider && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-900 rounded-xl p-4 mb-4 flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div className="flex-1">
            <h3 className="font-semibold text-amber-900 dark:text-amber-200">
              Chưa cấu hình NCC HĐĐT
            </h3>
            <p className="text-sm text-amber-800 dark:text-amber-300 mt-0.5">
              Bạn cần thêm ít nhất 1 NCC trước khi phát hành hóa đơn. Có thể bật{' '}
              <b>Test mode</b> để thử ngay.
            </p>
            <Link
              href="/admin/hoa-don/cau-hinh"
              className="inline-block mt-2 text-sm bg-amber-600 hover:bg-amber-700 text-white rounded px-3 py-1.5 font-semibold"
            >
              → Cấu hình NCC ngay
            </Link>
          </div>
        </div>
      )}

      <InvoicesClient
        initial={invoicesRes.data ?? []}
        providers={providersRes.data ?? []}
        monthlyStats={statsRes.data ?? []}
        canWrite={ctx.can('hoa_don', 'write')}
        canDelete={ctx.can('hoa_don', 'delete')}
      />
    </div>
  )
}
