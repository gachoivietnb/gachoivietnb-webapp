import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePermission } from '@/lib/rbac/guard'

const SupplierSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  supplier_category: z.enum(['ga','thuoc_thu_y','thuc_an','vat_lieu','thiet_bi','dich_vu','khac']).nullable().optional(),
  contact_person: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  zalo: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  facebook: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  province: z.string().nullable().optional(),
  map_url: z.string().nullable().optional(),
  tax_code: z.string().nullable().optional(),
  bank_name: z.string().nullable().optional(),
  bank_account: z.string().nullable().optional(),
  bank_branch: z.string().nullable().optional(),
  products_summary: z.string().nullable().optional(),
  payment_terms: z.string().nullable().optional(),
  credit_limit: z.number().default(0),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  tags: z.array(z.string()).default([]),
  avatar_url: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
  notes: z.string().nullable().optional(),
})

export async function GET() {
  const ctx = await requirePermission('nha_cung_cap', 'read')
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('supplier_stats')
    .select('*')
    .order('total_amount', { ascending: false })
    .limit(1000)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ suppliers: data ?? [] })
}

export async function POST(request: Request) {
  const ctx = await requirePermission('nha_cung_cap', 'write')
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const parsed = SupplierSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })

  const supabase = await createClient()
  const body = parsed.data

  if (body.id) {
    const { id, ...patch } = body
    const { data, error } = await supabase
      .from('suppliers')
      .update(patch as never)
      .eq('id', id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ supplier: data })
  }

  const { data, error } = await supabase
    .from('suppliers')
    .insert({ ...body, created_by: ctx.userId } as never)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ supplier: data })
}

export async function DELETE(request: Request) {
  const ctx = await requirePermission('nha_cung_cap', 'delete')
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 })
  const supabase = await createClient()
  // Soft-delete vì có FK từ purchases
  const { error } = await supabase.from('suppliers').update({ is_active: false } as never).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
