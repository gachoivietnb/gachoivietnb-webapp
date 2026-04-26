import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const ItemSchema = z.object({
  chicken_id: z.string().uuid(),
  unit_price: z.number().positive(),
  notes: z.string().optional(),
})

const OrderSchema = z.object({
  customer_id: z.string().uuid().optional(),
  customer_name: z.string().optional(),
  customer_phone: z.string().optional(),
  order_date: z.string().optional(),
  items: z.array(ItemSchema).min(1),
  status: z.enum(['hoi_mua', 'dat_coc', 'da_giao', 'huy']).default('hoi_mua'),
  deposit_amount: z.number().default(0),
  payment_method: z.string().optional(),
  notes: z.string().optional(),
})

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const page = parseInt(searchParams.get('page') ?? '1')
  const pageSize = 20

  const supabase = await createClient()
  let query = supabase
    .from('sales_orders')
    .select('*, customer:customers(id, name, phone), sales_items(count)', { count: 'exact' })
    .order('order_date', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (status) query = query.eq('status', status)

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, count })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = OrderSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })

  const { customer_id, customer_name, customer_phone, items, ...rest } = parsed.data

  const chickenIds = items.map((i) => i.chicken_id)
  const { data: chickens } = await supabase
    .from('chickens')
    .select('id, chicken_code, status, is_reserved')
    .in('id', chickenIds)

  const chickenRows = (chickens ?? []) as Array<{
    id: string
    chicken_code: string
    status: string
    is_reserved: boolean
  }>
  const invalid = chickenRows.filter((c) => c.status !== 'dang_nuoi' || c.is_reserved)
  if (invalid.length > 0) {
    return NextResponse.json(
      { error: `Một số gà không thể bán: ${invalid.map((c) => c.chicken_code).join(', ')}` },
      { status: 400 }
    )
  }

  let finalCustomerId = customer_id
  if (!finalCustomerId && customer_name) {
    const { data: newCustomer } = await supabase
      .from('customers')
      .insert({ name: customer_name, phone: customer_phone ?? null, source: 'truc_tiep' } as never)
      .select('id')
      .single()
    finalCustomerId = (newCustomer as { id: string } | null)?.id
  }

  const totalAmount = items.reduce((sum, i) => sum + i.unit_price, 0)

  const { data: order, error: orderError } = await supabase
    .from('sales_orders')
    .insert({
      customer_id: finalCustomerId ?? null,
      total_amount: totalAmount,
      performed_by: user.id,
      ...rest,
    } as never)
    .select()
    .single()

  if (orderError) return NextResponse.json({ error: orderError.message }, { status: 500 })
  const orderRow = order as { id: string; status: string }

  const salesItems = items.map((i) => ({
    sales_order_id: orderRow.id,
    chicken_id: i.chicken_id,
    unit_price: i.unit_price,
    notes: i.notes ?? null,
  }))
  const { error: itemsError } = await supabase.from('sales_items').insert(salesItems as never)

  if (itemsError) {
    // Rollback: xóa order vừa tạo để tránh orphan
    await supabase.from('sales_orders').delete().eq('id', orderRow.id)
    return NextResponse.json(
      { error: `Lỗi tạo chi tiết đơn: ${itemsError.message}` },
      { status: 500 }
    )
  }

  // Re-trigger sync nếu status = dat_coc ngay
  if (orderRow.status === 'dat_coc') {
    await supabase
      .from('sales_orders')
      .update({ status: 'dat_coc' } as never)
      .eq('id', orderRow.id)
  }

  return NextResponse.json({ data: order })
}
