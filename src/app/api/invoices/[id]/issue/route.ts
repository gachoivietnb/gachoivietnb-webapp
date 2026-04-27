import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/rbac/guard'
import { getProviderAdapter } from '@/lib/invoice-providers/registry'
import type { ProviderConfig, IssueInvoiceInput } from '@/lib/invoice-providers/types'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requirePermission('hoa_don', 'write')
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const { id } = await params
  const supabase = await createClient()

  const { data: inv } = await supabase.from('invoices').select('*').eq('id', id).single()
  if (!inv) return NextResponse.json({ error: 'Không tìm thấy HĐ' }, { status: 404 })

  const invoice = inv as {
    id: string
    status: string
    provider_id: string | null
    buyer_id: string | null
    invoice_form: string | null
    invoice_serial: string | null
    issue_date: string
    payment_method: 'TM' | 'CK' | 'TM_CK'
    currency: string
    exchange_rate: number
    subtotal: number
    tax_amount: number
    total: number
    total_words: string
    notes: string | null
    seller_snapshot: Record<string, unknown> | null
    buyer_snapshot: Record<string, unknown> | null
    internal_no: string
  }

  if (invoice.status === 'da_phat_hanh') {
    return NextResponse.json({ error: 'HĐ đã phát hành rồi' }, { status: 400 })
  }
  if (invoice.status === 'da_huy') {
    return NextResponse.json({ error: 'HĐ đã hủy — không thể phát hành' }, { status: 400 })
  }

  if (!invoice.provider_id) {
    return NextResponse.json({ error: 'Chưa chọn NCC HĐĐT' }, { status: 400 })
  }
  if (!invoice.buyer_id) {
    return NextResponse.json({ error: 'Chưa chọn người mua' }, { status: 400 })
  }

  const { data: provider } = await supabase
    .from('invoice_providers')
    .select('*')
    .eq('id', invoice.provider_id)
    .single()
  if (!provider) return NextResponse.json({ error: 'NCC không tồn tại' }, { status: 404 })

  const { data: buyer } = await supabase.from('invoice_buyers').select('*').eq('id', invoice.buyer_id).single()
  const { data: items } = await supabase
    .from('invoice_items')
    .select('*')
    .eq('invoice_id', id)
    .order('sort_order')
  const itemRows = (items ?? []) as Array<{
    description: string
    unit: string
    quantity: number
    unit_price: number
    discount_pct: number
    tax_rate: number
    product_code: string | null
  }>

  // Set status pending
  await supabase
    .from('invoices')
    .update({ status: 'cho_phat_hanh', cqt_status: 'cho_cap_ma' } as never)
    .eq('id', id)

  // Mark event
  await supabase.from('invoice_events').insert({
    invoice_id: id,
    event_type: 'submitted',
    actor_id: ctx.userId,
    message: `Gửi đến NCC ${(provider as { name: string }).name}`,
  } as never)

  const adapter = getProviderAdapter(provider as unknown as ProviderConfig)
  const sellerSnapshot = (invoice.seller_snapshot ?? {}) as Record<string, string | null>
  const b = (buyer ?? {}) as {
    name: string
    tax_code: string | null
    address: string | null
    email: string | null
    phone: string | null
    buyer_type: 'ca_nhan' | 'doanh_nghiep'
    representative_name: string | null
  }

  const issueInput: IssueInvoiceInput = {
    internal_no: invoice.internal_no,
    issue_date: invoice.issue_date,
    template_code: invoice.invoice_form,
    invoice_serial: invoice.invoice_serial,
    payment_method: invoice.payment_method,
    currency: invoice.currency,
    exchange_rate: invoice.exchange_rate,
    seller: {
      tax_code: sellerSnapshot.tax_code ?? '',
      name: sellerSnapshot.name ?? '',
      address: sellerSnapshot.address,
      phone: sellerSnapshot.phone,
      email: sellerSnapshot.email,
      bank_account: sellerSnapshot.bank_account,
      bank_name: sellerSnapshot.bank_name,
    },
    buyer: {
      name: b.name,
      tax_code: b.tax_code,
      address: b.address,
      email: b.email,
      phone: b.phone,
      buyer_type: b.buyer_type,
      representative_name: b.representative_name,
    },
    items: itemRows.map((it) => ({
      product_code: it.product_code,
      description: it.description,
      unit: it.unit,
      quantity: Number(it.quantity),
      unit_price: Number(it.unit_price),
      discount_pct: Number(it.discount_pct),
      tax_rate: Number(it.tax_rate),
    })),
    subtotal: Number(invoice.subtotal),
    tax_amount: Number(invoice.tax_amount),
    total: Number(invoice.total),
    total_words: invoice.total_words,
    notes: invoice.notes,
  }

  const result = await adapter.issue(issueInput)

  if (!result.ok) {
    await supabase
      .from('invoices')
      .update({ status: 'nhap', cqt_status: 'tu_choi' } as never)
      .eq('id', id)
    await supabase.from('invoice_events').insert({
      invoice_id: id,
      event_type: 'cqt_rejected',
      actor_id: ctx.userId,
      error_message: result.error || 'Phát hành thất bại',
      response_payload: result.response_payload as never,
    } as never)
    return NextResponse.json({ error: result.error || 'Phát hành thất bại' }, { status: 500 })
  }

  // Update invoice với mã CQT
  await supabase
    .from('invoices')
    .update({
      status: 'da_phat_hanh',
      cqt_status: 'da_cap_ma',
      invoice_no: result.invoice_no,
      cqt_code: result.cqt_code,
      cqt_lookup_code: result.cqt_lookup_code,
      signed_at: result.signed_at,
      issued_at: new Date().toISOString(),
    } as never)
    .eq('id', id)

  await supabase.from('invoice_events').insert({
    invoice_id: id,
    event_type: 'issued',
    actor_id: ctx.userId,
    message: `Đã phát hành thành công · Mã CQT: ${result.cqt_code}`,
    response_payload: result.response_payload as never,
  } as never)

  return NextResponse.json({ success: true, invoice_no: result.invoice_no, cqt_code: result.cqt_code })
}
