import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { revalidatePublicChickens } from '@/lib/cache/revalidate-public'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: order } = await supabase
    .from('sales_orders')
    .select('*, customer:customers(*)')
    .eq('id', id)
    .maybeSingle()

  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: items } = await supabase
    .from('sales_items')
    .select('*, chicken:chickens(id, chicken_code, name, status, breeds(name_vi))')
    .eq('sales_order_id', id)

  return NextResponse.json({ data: { ...(order as object), items: items ?? [] } })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json()) as Record<string, unknown>
  const ALLOWED = new Set([
    'status',
    'customer_id',
    'deposit_amount',
    'paid_amount',
    'delivered_date',
    'payment_method',
    'bank_transfer_ref',
    'deposit_date',
    'notes',
  ])
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const [k, v] of Object.entries(body)) if (ALLOWED.has(k)) updates[k] = v

  const { data, error } = await supabase
    .from('sales_orders')
    .update(updates as never)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  revalidatePublicChickens()
  return NextResponse.json({ data })
}
