import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const ItemSchema = z.object({
  unit_price: z.number().positive(),
  breed_id: z.string().uuid(),
  gender: z.enum(['trong', 'mai', 'chua_xac_dinh']).default('chua_xac_dinh'),
  qr_tag_id: z.string().uuid().optional(),
  birth_date: z.string().optional(),
  weight_kg: z.number().optional(),
  color: z.string().optional(),
  name: z.string().optional(),
})

const PurchaseSchema = z.object({
  supplier_id: z.string().uuid().optional(),
  supplier_name: z.string().optional(),
  purchase_date: z.string(),
  items: z.array(ItemSchema).min(1).max(200),
  notes: z.string().optional(),
})

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') ?? '1')
  const pageSize = 20

  const supabase = await createClient()
  const { data, count, error } = await supabase
    .from('purchases')
    .select('*, supplier:suppliers(id, name), purchase_items(count)', { count: 'exact' })
    .order('purchase_date', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, count })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = PurchaseSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })

  const { supplier_id, supplier_name, purchase_date, items, notes } = parsed.data

  let finalSupplierId = supplier_id
  if (!finalSupplierId && supplier_name) {
    const { data: newSupplier } = await supabase
      .from('suppliers')
      .insert({ name: supplier_name, supplier_type: 'ga_giong' } as never)
      .select('id')
      .single()
    finalSupplierId = (newSupplier as { id: string } | null)?.id
  }

  const totalAmount = items.reduce((sum, i) => sum + i.unit_price, 0)

  const { data: purchase, error: purchaseError } = await supabase
    .from('purchases')
    .insert({
      supplier_id: finalSupplierId,
      purchase_date,
      total_quantity: items.length,
      total_amount: totalAmount,
      notes: notes ?? null,
      performed_by: user.id,
    } as never)
    .select()
    .single()

  if (purchaseError) return NextResponse.json({ error: purchaseError.message }, { status: 500 })
  const purchaseRow = purchase as { id: string }

  const { data: cageId } = await supabase.rpc('find_available_cage' as never, { p_area_type: 'cach_ly' } as never)

  const chickensToInsert = items.map((item) => ({
    breed_id: item.breed_id,
    qr_tag_id: item.qr_tag_id ?? null,
    cage_id: cageId ?? null,
    gender: item.gender,
    birth_date: item.birth_date ?? null,
    weight_kg: item.weight_kg ?? null,
    color: item.color ?? null,
    name: item.name ?? null,
    source: 'mua' as const,
    cost_purchase: item.unit_price,
    status: 'dang_cach_ly' as const,
    created_by: user.id,
  }))

  const { data: createdChickens, error: chickensError } = await supabase
    .from('chickens')
    .insert(chickensToInsert as never)
    .select('id')

  if (chickensError) {
    await supabase.from('purchases').delete().eq('id', purchaseRow.id)
    return NextResponse.json({ error: chickensError.message }, { status: 500 })
  }

  if (createdChickens && createdChickens.length > 0) {
    const purchaseItems = (createdChickens as Array<{ id: string }>).map((c, i) => ({
      purchase_id: purchaseRow.id,
      chicken_id: c.id,
      unit_price: items[i].unit_price,
    }))
    const { error: itemsError } = await supabase
      .from('purchase_items')
      .insert(purchaseItems as never)
    if (itemsError) {
      // Rollback: xóa chickens + purchase vừa tạo
      await supabase
        .from('chickens')
        .delete()
        .in('id', (createdChickens as Array<{ id: string }>).map((c) => c.id))
      await supabase.from('purchases').delete().eq('id', purchaseRow.id)
      return NextResponse.json(
        { error: `Lỗi tạo chi tiết nhập: ${itemsError.message}` },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({
    data: { ...(purchase as object), items: createdChickens },
    count: createdChickens?.length ?? 0,
  })
}
