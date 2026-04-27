import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserPermissions } from '@/lib/rbac/guard'
import { InvoiceTabs } from '@/components/admin/invoices/InvoiceTabs'
import { InvoiceDetailClient } from '@/components/admin/invoices/InvoiceDetailClient'

export const revalidate = 0

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const ctx = await getCurrentUserPermissions()
  if (!ctx) redirect('/auth/login')
  if (!ctx.can('hoa_don', 'read')) {
    return <div className="text-sm text-gray-500">Bạn chưa có quyền truy cập module Hóa đơn.</div>
  }

  const supabase = await createClient()

  const [invRes, itemsRes, eventsRes] = (await Promise.all([
    supabase.from('invoices_full').select('*').eq('id', id).single(),
    supabase.from('invoice_items').select('*').eq('invoice_id', id).order('sort_order'),
    supabase
      .from('invoice_events')
      .select('id, event_type, actor_id, actor_name, message, error_message, created_at')
      .eq('invoice_id', id)
      .order('created_at', { ascending: false }),
  ])) as [
    { data: Record<string, unknown> | null },
    { data: Array<Record<string, unknown>> | null },
    { data: Array<Record<string, unknown>> | null }
  ]

  if (!invRes.data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Không tìm thấy HĐ.</p>
      </div>
    )
  }

  return (
    <div>
      <InvoiceTabs />
      <InvoiceDetailClient
        invoice={invRes.data as never}
        items={(itemsRes.data ?? []) as never}
        events={(eventsRes.data ?? []) as never}
        canWrite={ctx.can('hoa_don', 'write')}
        canDelete={ctx.can('hoa_don', 'delete')}
      />
    </div>
  )
}
