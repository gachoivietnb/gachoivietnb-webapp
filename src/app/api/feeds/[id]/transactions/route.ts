import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePermission } from '@/lib/rbac/guard'

const Schema = z.object({
  transaction_type: z.enum(['nhap', 'xuat']),
  quantity: z.number().positive(),
  cost: z.number().optional(),
  related_area_id: z.string().uuid().optional(),
  notes: z.string().optional(),
  transaction_date: z.string().optional(),
})

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('feed_transactions')
    .select('id, transaction_type, quantity, transaction_date, cost, notes, created_at')
    .eq('feed_id', id)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(20)
  return NextResponse.json({ data: data ?? [] })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const perm = await requirePermission('kho_thuc_an', 'write')
  if ('error' in perm) return NextResponse.json({ error: perm.error }, { status: perm.status })

  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = Schema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })

  if (parsed.data.transaction_type === 'xuat') {
    const { data: feed } = await supabase
      .from('feeds')
      .select('name_vi, current_stock, unit')
      .eq('id', id)
      .single<{ name_vi: string; current_stock: number; unit: string }>()
    if (feed && Number(feed.current_stock) < parsed.data.quantity) {
      return NextResponse.json(
        {
          error: `Không đủ tồn: ${feed.name_vi} còn ${feed.current_stock} ${feed.unit}, yêu cầu xuất ${parsed.data.quantity}`,
        },
        { status: 400 }
      )
    }
  }

  const { data, error } = await supabase
    .from('feed_transactions')
    .insert({ ...parsed.data, feed_id: id, performed_by: user.id } as never)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
