import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getFarmContext } from '@/lib/multitenancy/farm-context'
import { cancelOrder, getOrder } from '@/lib/payment/orders'

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const farmCtx = await getFarmContext()
  if (!farmCtx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  const order = await getOrder(id)
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (order.farm_id !== farmCtx.farm.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return NextResponse.json({ data: order })
}

const ActionSchema = z.object({
  action: z.literal('cancel'),
  reason: z.string().max(500).optional(),
})

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const farmCtx = await getFarmContext()
  if (!farmCtx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  const body = await request.json()
  const parsed = ActionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }

  // Verify order thuộc farm của user
  const order = await getOrder(id)
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (order.farm_id !== farmCtx.farm.id || order.user_id !== farmCtx.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const updated = await cancelOrder({
      orderId: id,
      reason: parsed.data.reason,
      by: farmCtx.user.id,
    })
    return NextResponse.json({ ok: true, data: updated })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'unknown' },
      { status: 500 }
    )
  }
}
