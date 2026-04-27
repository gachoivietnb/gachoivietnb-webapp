import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePermission } from '@/lib/rbac/guard'

const Schema = z.object({
  customer_id: z.string().uuid(),
  buyer_type: z.enum(['ca_nhan', 'doanh_nghiep']).optional(),
  tax_code: z.string().optional(),
  address: z.string().optional(),
})

export async function POST(request: Request) {
  const ctx = await requirePermission('hoa_don', 'write')
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const parsed = Schema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })

  const supabase = await createClient()

  // Check existing
  const { data: existing } = await supabase
    .from('invoice_buyers')
    .select('id')
    .eq('customer_id', parsed.data.customer_id)
    .maybeSingle()
  if (existing) {
    return NextResponse.json({ buyer_id: (existing as { id: string }).id, already_exists: true })
  }

  const { data: customer } = await supabase
    .from('customers')
    .select('id, name, phone, email, address')
    .eq('id', parsed.data.customer_id)
    .single<{ id: string; name: string; phone: string | null; email: string | null; address: string | null }>()
  if (!customer) return NextResponse.json({ error: 'Khách hàng không tồn tại' }, { status: 404 })

  const { data, error } = await supabase
    .from('invoice_buyers')
    .insert({
      customer_id: customer.id,
      buyer_type: parsed.data.buyer_type ?? (parsed.data.tax_code ? 'doanh_nghiep' : 'ca_nhan'),
      name: customer.name,
      tax_code: parsed.data.tax_code ?? null,
      phone: customer.phone,
      email: customer.email,
      address: parsed.data.address ?? customer.address,
    } as never)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ buyer: data, already_exists: false })
}
