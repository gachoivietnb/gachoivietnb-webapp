import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePermission } from '@/lib/rbac/guard'

const Schema = z.object({ amount: z.number().int().min(1) })

// Thu tiền khách cho 1 đơn bán: tăng paid_amount → trigger sync_sales_to_cash
// tự tạo cash 'in' (category 'sale', delta idempotent). KHÔNG tạo cash tay để tránh trùng.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requirePermission('ban_ra', 'write')
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const { id } = await params
  const parsed = Schema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })

  const supabase = await createClient()
  const { data: order } = await supabase
    .from('sales_orders')
    .select('total_amount, paid_amount, status')
    .eq('id', id)
    .maybeSingle()
  const o = order as { total_amount: number; paid_amount: number | null; status: string } | null
  if (!o) return NextResponse.json({ error: 'Không tìm thấy đơn' }, { status: 404 })
  if (o.status === 'huy') return NextResponse.json({ error: 'Đơn đã hủy' }, { status: 400 })

  const total = Number(o.total_amount)
  const paid = Number(o.paid_amount ?? 0)
  const remaining = total - paid
  if (parsed.data.amount > remaining) {
    return NextResponse.json(
      { error: `Số tiền vượt công nợ còn lại (${remaining.toLocaleString('vi-VN')}đ)` },
      { status: 400 }
    )
  }

  const newPaid = paid + parsed.data.amount
  const { error } = await supabase
    .from('sales_orders')
    .update({ paid_amount: newPaid } as never)
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, paid_amount: newPaid, remaining: total - newPaid })
}
