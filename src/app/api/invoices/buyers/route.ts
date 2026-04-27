import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePermission } from '@/lib/rbac/guard'

const BuyerSchema = z.object({
  id: z.string().uuid().optional(),
  customer_id: z.string().uuid().nullable().optional(),
  buyer_type: z.enum(['ca_nhan', 'doanh_nghiep']).optional(),
  name: z.string().min(1),
  tax_code: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  bank_account: z.string().nullable().optional(),
  bank_name: z.string().nullable().optional(),
  representative_name: z.string().nullable().optional(),
  buyer_code: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  // Cờ đồng bộ với customers
  sync_to_customers: z.boolean().optional(),
})

export async function GET(request: Request) {
  const ctx = await requirePermission('hoa_don', 'read')
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const url = new URL(request.url)
  const search = url.searchParams.get('search')?.trim()

  const supabase = await createClient()
  let q = supabase
    .from('invoice_buyers')
    .select('*')
    .order('name', { ascending: true })
    .limit(500)
  if (search) {
    q = q.or(`name.ilike.%${search}%,tax_code.ilike.%${search}%,phone.ilike.%${search}%`)
  }
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ buyers: data ?? [] })
}

export async function POST(request: Request) {
  const ctx = await requirePermission('hoa_don', 'write')
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const parsed = BuyerSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })

  const supabase = await createClient()
  const body = parsed.data
  const taxCode = body.tax_code?.trim() || null
  const buyerType = body.buyer_type ?? (taxCode ? 'doanh_nghiep' : 'ca_nhan')

  let customerId = body.customer_id ?? null

  // Đồng bộ với customers nếu cờ bật và chưa có customer_id
  if (body.sync_to_customers && !customerId) {
    // Tìm customer trùng tên hoặc phone
    const { data: existing } = await supabase
      .from('customers')
      .select('id')
      .or(
        body.phone
          ? `name.eq.${body.name},phone.eq.${body.phone}`
          : `name.eq.${body.name}`
      )
      .limit(1)
      .maybeSingle()
    if (existing) {
      customerId = (existing as { id: string }).id
    } else {
      const { data: created } = await supabase
        .from('customers')
        .insert({
          name: body.name,
          phone: body.phone,
          email: body.email,
          address: body.address,
          source: 'hoa_don',
        } as never)
        .select('id')
        .single<{ id: string }>()
      if (created) customerId = created.id
    }
  }

  const baseData = {
    customer_id: customerId,
    buyer_type: buyerType,
    name: body.name,
    tax_code: taxCode,
    address: body.address ?? null,
    email: body.email ?? null,
    phone: body.phone ?? null,
    bank_account: body.bank_account ?? null,
    bank_name: body.bank_name ?? null,
    representative_name: body.representative_name ?? null,
    buyer_code: body.buyer_code ?? null,
    notes: body.notes ?? null,
  }

  if (body.id) {
    const { data, error } = await supabase
      .from('invoice_buyers')
      .update(baseData as never)
      .eq('id', body.id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ buyer: data })
  }

  const { data, error } = await supabase
    .from('invoice_buyers')
    .insert(baseData as never)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ buyer: data })
}

export async function DELETE(request: Request) {
  const ctx = await requirePermission('hoa_don', 'delete')
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 })

  const supabase = await createClient()
  const { error } = await supabase.from('invoice_buyers').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
