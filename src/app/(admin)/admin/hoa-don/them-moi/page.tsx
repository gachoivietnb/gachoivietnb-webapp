import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserPermissions } from '@/lib/rbac/guard'
import { InvoiceTabs } from '@/components/admin/invoices/InvoiceTabs'
import { InvoiceFormClient } from '@/components/admin/invoices/InvoiceFormClient'

export const revalidate = 0

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ from_sale?: string }>
}) {
  const ctx = await getCurrentUserPermissions()
  if (!ctx) redirect('/auth/login')
  if (!ctx.can('hoa_don', 'write')) {
    return <div className="text-sm text-gray-500">Bạn không có quyền tạo HĐ.</div>
  }

  const params = await searchParams
  const fromSaleId = params.from_sale

  const supabase = await createClient()
  const [providersRes, buyersRes] = await Promise.all([
    supabase
      .from('invoice_providers')
      .select('id, name, provider_code, default_template_code, default_invoice_serial, is_default, test_mode')
      .eq('is_active', true)
      .order('is_default', { ascending: false }),
    supabase
      .from('invoice_buyers')
      .select('id, name, tax_code, address, email, phone, buyer_type')
      .order('updated_at', { ascending: false }),
  ])

  let prefill: {
    sales_order_id?: string
    buyer_id?: string
    items?: Array<{ description: string; unit: string; quantity: number; unit_price: number; tax_rate: number }>
    notes?: string
  } | null = null

  if (fromSaleId) {
    const { data: order } = await supabase
      .from('sales_orders')
      .select('id, customer_id, total_amount, notes')
      .eq('id', fromSaleId)
      .single()
    if (order) {
      const o = order as { id: string; customer_id: string | null; total_amount: number; notes: string | null }
      // Lookup or auto-link buyer
      let buyerId: string | undefined
      if (o.customer_id) {
        const { data: buyer } = await supabase
          .from('invoice_buyers')
          .select('id')
          .eq('customer_id', o.customer_id)
          .maybeSingle()
        if (buyer) buyerId = (buyer as { id: string }).id
      }

      const { data: items } = await supabase
        .from('sales_items')
        .select('chicken_id, unit_price, notes, chickens(code, breed)')
        .eq('sales_order_id', fromSaleId)

      type SalesItem = { chicken_id: string; unit_price: number; notes: string | null; chickens: { code: string; breed: string } | null }

      prefill = {
        sales_order_id: o.id,
        buyer_id: buyerId,
        items: ((items ?? []) as SalesItem[]).map((it) => ({
          description: `Gà ${it.chickens?.code || ''} ${it.chickens?.breed || ''}`.trim(),
          unit: 'con',
          quantity: 1,
          unit_price: Number(it.unit_price),
          tax_rate: 0,
        })),
        notes: o.notes ? `Phát hành HĐ cho phiếu bán: ${o.notes}` : '',
      }
    }
  }

  return (
    <div>
      <div className="mb-1">
        <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
          🧾 Tạo hóa đơn điện tử
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {prefill ? 'Đã pre-fill từ phiếu Bán ra — kiểm tra và phát hành.' : 'Lập HĐ nháp, sau đó phát hành để gửi cơ quan thuế.'}
        </p>
      </div>

      <InvoiceTabs />

      <InvoiceFormClient
        providers={providersRes.data ?? []}
        buyers={buyersRes.data ?? []}
        prefill={prefill}
      />
    </div>
  )
}
