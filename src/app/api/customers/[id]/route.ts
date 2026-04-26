import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const PatchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().optional().nullable(),
  zalo: z.string().optional().nullable(),
  facebook: z.string().optional().nullable(),
  email: z.string().email().optional().or(z.literal('')).nullable(),
  address: z.string().optional().nullable(),
  tier: z.enum(['thuong', 'vip']).optional(),
  source: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ data })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = PatchSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })

  const updates: Record<string, unknown> = { ...parsed.data, updated_at: new Date().toISOString() }

  const { data, error } = await supabase
    .from('customers')
    .update(updates as never)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: string }>()

  if (profile?.role !== 'chu_trai') {
    return NextResponse.json({ error: 'Chỉ chủ trại được xóa khách hàng' }, { status: 403 })
  }

  // Chặn xóa nếu còn đơn hàng / gà đã giao
  const { count: orderCount } = await supabase
    .from('sales_orders')
    .select('id', { count: 'exact', head: true })
    .eq('customer_id', id)

  if ((orderCount ?? 0) > 0) {
    return NextResponse.json(
      {
        error: `Không thể xóa: còn ${orderCount} đơn hàng liên quan. Có thể ẩn bằng cách xóa thông tin liên hệ thay vì xóa hẳn.`,
      },
      { status: 400 }
    )
  }

  const { error } = await supabase.from('customers').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
