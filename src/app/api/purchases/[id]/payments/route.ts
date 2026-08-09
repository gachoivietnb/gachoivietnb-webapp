import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePermission } from '@/lib/rbac/guard'
import { recordSupplierPayment } from '@/lib/purchases/payments'

const PaymentSchema = z.object({
  amount: z.number().int().min(1),
  payment_date: z.string().optional(),
  payment_method: z.string().optional(),
  notes: z.string().optional(),
})

// Lịch sử chi trả của 1 phiếu
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('supplier_payments')
    .select('id, amount, payment_date, payment_method, notes, created_at')
    .eq('purchase_id', id)
    .order('payment_date', { ascending: false })
    .order('created_at', { ascending: false })
  return NextResponse.json({ data: data ?? [] })
}

// Ghi 1 lần trả NCC cho phiếu (giảm công nợ + chi quỹ)
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requirePermission('mua_vao', 'write')
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const { id } = await params
  const parsed = PaymentSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })

  const now = new Date()
  const fallbackDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`

  try {
    const result = await recordSupplierPayment({
      purchaseId: id,
      amount: parsed.data.amount,
      paymentDate: parsed.data.payment_date || fallbackDate,
      paymentMethod: parsed.data.payment_method,
      notes: parsed.data.notes,
      userId: ctx.userId,
    })
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Lỗi ghi thanh toán' },
      { status: 400 }
    )
  }
}
