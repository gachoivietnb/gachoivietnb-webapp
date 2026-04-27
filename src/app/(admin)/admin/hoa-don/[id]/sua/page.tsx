import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserPermissions } from '@/lib/rbac/guard'
import { InvoiceTabs } from '@/components/admin/invoices/InvoiceTabs'
import { InvoiceFormClient } from '@/components/admin/invoices/InvoiceFormClient'

export const revalidate = 0

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const ctx = await getCurrentUserPermissions()
  if (!ctx) redirect('/auth/login')
  if (!ctx.can('hoa_don', 'write')) {
    return <div className="text-sm text-gray-500">Bạn không có quyền sửa HĐ.</div>
  }

  const supabase = await createClient()
  const [invRes, itemsRes, providersRes, buyersRes] = (await Promise.all([
    supabase.from('invoices').select('*').eq('id', id).single(),
    supabase.from('invoice_items').select('*').eq('invoice_id', id).order('sort_order'),
    supabase
      .from('invoice_providers')
      .select('id, name, provider_code, default_template_code, default_invoice_serial, is_default, test_mode')
      .eq('is_active', true)
      .order('is_default', { ascending: false }),
    supabase
      .from('invoice_buyers')
      .select('id, name, tax_code, address, email, phone, buyer_type')
      .order('updated_at', { ascending: false }),
  ])) as [
    { data: Record<string, unknown> | null },
    { data: Array<Record<string, unknown>> | null },
    { data: Array<Record<string, unknown>> | null },
    { data: Array<Record<string, unknown>> | null }
  ]

  if (!invRes.data) {
    return <div className="text-center py-12 text-gray-500">Không tìm thấy HĐ.</div>
  }
  const inv = invRes.data as {
    id: string
    status: string
    provider_id: string | null
    buyer_id: string | null
    issue_date: string
    payment_method: 'TM' | 'CK' | 'TM_CK'
    notes: string | null
  }
  if (inv.status === 'da_phat_hanh') {
    redirect(`/admin/hoa-don/${id}`)
  }

  const items = (itemsRes.data ?? []) as Array<{
    description: string
    unit: string
    quantity: number
    unit_price: number
    tax_rate: number
  }>

  return (
    <div>
      <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
        ✏️ Sửa HĐ nháp
      </h1>
      <InvoiceTabs />
      <InvoiceFormClient
        invoiceId={inv.id}
        providers={(providersRes.data ?? []) as never}
        buyers={(buyersRes.data ?? []) as never}
        prefill={{
          buyer_id: inv.buyer_id ?? undefined,
          items: items.map((it) => ({
            description: it.description,
            unit: it.unit,
            quantity: Number(it.quantity),
            unit_price: Number(it.unit_price),
            tax_rate: Number(it.tax_rate),
          })),
          notes: inv.notes ?? '',
        }}
      />
    </div>
  )
}
