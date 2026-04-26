import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import crypto from 'crypto'

const Schema = z.object({
  sales_order_id: z.string().uuid(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = Schema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })

  const { data: order } = await supabase
    .from('sales_orders')
    .select('id, customer_id, status')
    .eq('id', parsed.data.sales_order_id)
    .maybeSingle()

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  const o = order as { id: string; customer_id: string | null; status: string }
  if (!o.customer_id) return NextResponse.json({ error: 'Đơn chưa có khách' }, { status: 400 })
  if (o.status !== 'da_giao') return NextResponse.json({ error: 'Đơn chưa giao' }, { status: 400 })

  const token = crypto.randomBytes(16).toString('hex')
  const expires = new Date(Date.now() + 30 * 86400000) // 30 ngày

  const { data, error } = await supabase
    .from('customer_reviews')
    .insert({
      customer_id: o.customer_id,
      sales_order_id: o.id,
      review_token: token,
      token_expires_at: expires.toISOString(),
      is_public: true,
    } as never)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const reviewUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/danh-gia/${token}`
  return NextResponse.json({ data, review_url: reviewUrl })
}
