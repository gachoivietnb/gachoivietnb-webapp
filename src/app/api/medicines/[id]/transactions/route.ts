import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePermission } from '@/lib/rbac/guard'

const Schema = z.object({
  transaction_type: z.enum(['nhap', 'xuat']),
  quantity: z.number().positive(),
  cost: z.number().optional(),
  related_chicken_id: z.string().uuid().optional(),
  notes: z.string().optional(),
  transaction_date: z.string().optional(),
})

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('medicine_transactions')
    .select('*')
    .eq('medicine_id', id)
    .order('transaction_date', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const perm = await requirePermission('kho_thuoc', 'write')
  if ('error' in perm) return NextResponse.json({ error: perm.error }, { status: perm.status })

  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = Schema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })

  if (parsed.data.transaction_type === 'xuat') {
    const { data: med } = await supabase
      .from('medicines')
      .select('name_vi, current_stock, unit')
      .eq('id', id)
      .single<{ name_vi: string; current_stock: number; unit: string }>()
    if (med && Number(med.current_stock) < parsed.data.quantity) {
      return NextResponse.json(
        {
          error: `Không đủ tồn: ${med.name_vi} còn ${med.current_stock} ${med.unit}, yêu cầu xuất ${parsed.data.quantity}`,
        },
        { status: 400 }
      )
    }
  }

  const { data, error } = await supabase
    .from('medicine_transactions')
    .insert({ ...parsed.data, medicine_id: id, performed_by: user.id } as never)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
