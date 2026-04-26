import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const Schema = z.object({
  new_status: z.enum(['hoi_mua', 'dat_coc', 'da_giao', 'huy']),
  deposit_amount: z.number().optional(),
  paid_amount: z.number().optional(),
  delivered_date: z.string().optional(),
  bank_transfer_ref: z.string().optional(),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = Schema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })

  const update: Record<string, unknown> = { status: parsed.data.new_status }
  if (parsed.data.deposit_amount !== undefined) {
    update.deposit_amount = parsed.data.deposit_amount
    update.paid_amount = parsed.data.deposit_amount
    update.deposit_date = new Date().toISOString().split('T')[0]
  }
  if (parsed.data.paid_amount !== undefined) update.paid_amount = parsed.data.paid_amount
  if (parsed.data.delivered_date) update.delivered_date = parsed.data.delivered_date
  if (parsed.data.bank_transfer_ref) update.bank_transfer_ref = parsed.data.bank_transfer_ref

  const { data, error } = await supabase
    .from('sales_orders')
    .update(update as never)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
