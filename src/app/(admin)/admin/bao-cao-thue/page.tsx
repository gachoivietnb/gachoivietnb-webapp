import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserPermissions } from '@/lib/rbac/guard'
import { TaxReportClient } from '@/components/admin/invoices/TaxReportClient'

export const revalidate = 0

export default async function TaxReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const ctx = await getCurrentUserPermissions()
  if (!ctx) redirect('/auth/login')
  if (!ctx.can('bao_cao_thue', 'read')) {
    return <div className="text-sm text-gray-500">Bạn chưa có quyền truy cập module Báo cáo thuế.</div>
  }

  const params = await searchParams
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = (now.getMonth() + 1).toString().padStart(2, '0')
  const lastDay = new Date(yyyy, now.getMonth() + 1, 0).getDate()
  const defaultFrom = `${yyyy}-${mm}-01`
  const defaultTo = `${yyyy}-${mm}-${String(lastDay).padStart(2, '0')}`
  const from = params.from || defaultFrom
  const to = params.to || defaultTo

  const supabase = await createClient()
  const { data: invoices } = await supabase
    .from('invoices_full')
    .select('*')
    .eq('status', 'da_phat_hanh')
    .gte('issue_date', from)
    .lte('issue_date', to)
    .order('issue_date', { ascending: true })

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
          📑 Báo cáo thuế
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Bảng kê hóa đơn bán ra phục vụ kê khai VAT theo mẫu Tổng cục Thuế.
        </p>
      </div>

      <TaxReportClient invoices={(invoices ?? []) as never} from={from} to={to} />
    </div>
  )
}
