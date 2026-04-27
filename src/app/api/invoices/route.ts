import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePermission } from '@/lib/rbac/guard'
import { moneyToVietnameseWords } from '@/lib/invoice-providers/money-words'

const ItemSchema = z.object({
  id: z.string().uuid().optional(),
  sort_order: z.number().int().optional(),
  product_code: z.string().nullable().optional(),
  description: z.string().min(1),
  unit: z.string().default('cái'),
  quantity: z.number().nonnegative(),
  unit_price: z.number().nonnegative(),
  discount_pct: z.number().min(0).max(100).default(0),
  tax_rate: z.number().default(0),
  tax_rate_label: z.string().nullable().optional(),
  ref_type: z.string().nullable().optional(),
  ref_id: z.string().uuid().nullable().optional(),
  notes: z.string().nullable().optional(),
})

const InvoiceSchema = z.object({
  id: z.string().uuid().optional(),
  provider_id: z.string().uuid().nullable().optional(),
  buyer_id: z.string().uuid().nullable().optional(),
  sales_order_id: z.string().uuid().nullable().optional(),
  invoice_form: z.string().nullable().optional(),
  invoice_serial: z.string().nullable().optional(),
  issue_date: z.string(),
  payment_method: z.enum(['TM', 'CK', 'TM_CK']).default('TM_CK'),
  currency: z.string().default('VND'),
  exchange_rate: z.number().default(1),
  notes: z.string().nullable().optional(),
  items: z.array(ItemSchema).min(1, 'Cần ít nhất 1 dòng hàng hóa'),
})

function computeItemAmounts(item: z.infer<typeof ItemSchema>) {
  const gross = Number(item.quantity) * Number(item.unit_price)
  const discount = (gross * Number(item.discount_pct || 0)) / 100
  const lineSubtotal = +(gross - discount).toFixed(2)
  const taxRate = Number(item.tax_rate)
  const lineTax = taxRate > 0 ? +((lineSubtotal * taxRate) / 100).toFixed(2) : 0
  const lineTotal = +(lineSubtotal + lineTax).toFixed(2)
  return { lineSubtotal, lineTax, lineTotal, discountAmount: +discount.toFixed(2) }
}

export async function POST(request: Request) {
  const ctx = await requirePermission('hoa_don', 'write')
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const body = await request.json()
  const parsed = InvoiceSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })

  const supabase = await createClient()
  const data = parsed.data

  // Snapshot buyer + seller
  let buyerSnapshot: Record<string, unknown> | null = null
  if (data.buyer_id) {
    const { data: b } = await supabase.from('invoice_buyers').select('*').eq('id', data.buyer_id).single()
    buyerSnapshot = b as Record<string, unknown> | null
  }

  let sellerSnapshot: Record<string, unknown> | null = null
  let providerForm = data.invoice_form ?? null
  let providerSerial = data.invoice_serial ?? null
  if (data.provider_id) {
    const { data: p } = await supabase.from('invoice_providers').select('*').eq('id', data.provider_id).single()
    if (p) {
      const prov = p as {
        seller_tax_code: string
        seller_name: string
        seller_address: string | null
        seller_phone: string | null
        seller_email: string | null
        seller_bank_account: string | null
        seller_bank_name: string | null
        default_template_code: string | null
        default_invoice_serial: string | null
      }
      sellerSnapshot = {
        tax_code: prov.seller_tax_code,
        name: prov.seller_name,
        address: prov.seller_address,
        phone: prov.seller_phone,
        email: prov.seller_email,
        bank_account: prov.seller_bank_account,
        bank_name: prov.seller_bank_name,
      }
      if (!providerForm) providerForm = prov.default_template_code
      if (!providerSerial) providerSerial = prov.default_invoice_serial
    }
  }

  // Compute totals
  let subtotal = 0
  let taxAmount = 0
  let total = 0
  const itemsToInsert = data.items.map((item, idx) => {
    const { lineSubtotal, lineTax, lineTotal, discountAmount } = computeItemAmounts(item)
    subtotal += lineSubtotal
    taxAmount += lineTax
    total += lineTotal
    return {
      sort_order: item.sort_order ?? idx,
      product_code: item.product_code ?? null,
      description: item.description,
      unit: item.unit,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount_pct: item.discount_pct,
      discount_amount: discountAmount,
      tax_rate: item.tax_rate,
      tax_rate_label: item.tax_rate_label ?? `${item.tax_rate}%`,
      line_subtotal: lineSubtotal,
      line_tax: lineTax,
      line_total: lineTotal,
      ref_type: item.ref_type ?? null,
      ref_id: item.ref_id ?? null,
      notes: item.notes ?? null,
    }
  })
  subtotal = +subtotal.toFixed(2)
  taxAmount = +taxAmount.toFixed(2)
  total = +total.toFixed(2)
  const totalWords = moneyToVietnameseWords(total)

  if (data.id) {
    // UPDATE: chỉ cho HĐ chưa phát hành
    const { data: existing } = await supabase.from('invoices').select('status').eq('id', data.id).single()
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy HĐ' }, { status: 404 })
    if ((existing as { status: string }).status === 'da_phat_hanh') {
      return NextResponse.json({ error: 'HĐ đã phát hành — không thể sửa. Hãy dùng Điều chỉnh hoặc Thay thế.' }, { status: 400 })
    }
    await supabase
      .from('invoices')
      .update({
        provider_id: data.provider_id ?? null,
        buyer_id: data.buyer_id ?? null,
        buyer_snapshot: buyerSnapshot,
        seller_snapshot: sellerSnapshot,
        sales_order_id: data.sales_order_id ?? null,
        invoice_form: providerForm,
        invoice_serial: providerSerial,
        issue_date: data.issue_date,
        payment_method: data.payment_method,
        currency: data.currency,
        exchange_rate: data.exchange_rate,
        subtotal,
        tax_amount: taxAmount,
        total,
        total_words: totalWords,
        notes: data.notes ?? null,
      } as never)
      .eq('id', data.id)

    // Replace items
    await supabase.from('invoice_items').delete().eq('invoice_id', data.id)
    if (itemsToInsert.length > 0) {
      await supabase
        .from('invoice_items')
        .insert(itemsToInsert.map((i) => ({ ...i, invoice_id: data.id })) as never)
    }

    await supabase.from('invoice_events').insert({
      invoice_id: data.id,
      event_type: 'updated',
      actor_id: ctx.userId,
      message: 'Cập nhật nháp HĐ',
    } as never)

    return NextResponse.json({ id: data.id })
  }

  // CREATE
  const { data: created, error } = await supabase
    .from('invoices')
    .insert({
      provider_id: data.provider_id ?? null,
      buyer_id: data.buyer_id ?? null,
      buyer_snapshot: buyerSnapshot,
      seller_snapshot: sellerSnapshot,
      sales_order_id: data.sales_order_id ?? null,
      invoice_form: providerForm,
      invoice_serial: providerSerial,
      issue_date: data.issue_date,
      payment_method: data.payment_method,
      currency: data.currency,
      exchange_rate: data.exchange_rate,
      subtotal,
      tax_amount: taxAmount,
      total,
      total_words: totalWords,
      notes: data.notes ?? null,
      status: 'nhap',
      created_by: ctx.userId,
    } as never)
    .select('id')
    .single<{ id: string }>()
  if (error || !created) return NextResponse.json({ error: error?.message || 'Lỗi tạo HĐ' }, { status: 500 })

  if (itemsToInsert.length > 0) {
    await supabase
      .from('invoice_items')
      .insert(itemsToInsert.map((i) => ({ ...i, invoice_id: created.id })) as never)
  }

  await supabase.from('invoice_events').insert({
    invoice_id: created.id,
    event_type: 'created',
    actor_id: ctx.userId,
    message: 'Tạo nháp HĐ',
  } as never)

  return NextResponse.json({ id: created.id })
}

export async function DELETE(request: Request) {
  const ctx = await requirePermission('hoa_don', 'delete')
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 })

  const supabase = await createClient()
  const { data: existing } = await supabase.from('invoices').select('status').eq('id', id).single()
  if (!existing) return NextResponse.json({ error: 'Không tìm thấy HĐ' }, { status: 404 })
  if ((existing as { status: string }).status === 'da_phat_hanh') {
    return NextResponse.json({ error: 'HĐ đã phát hành — không thể xóa. Hãy dùng Hủy.' }, { status: 400 })
  }

  const { error } = await supabase.from('invoices').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
