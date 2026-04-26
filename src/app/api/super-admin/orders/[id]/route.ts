import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSuperAdmin } from '@/lib/multitenancy/super-admin'
import { confirmOrder, cancelOrder } from '@/lib/payment/orders'

const ActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('confirm'),
    admin_note: z.string().max(500).optional(),
  }),
  z.object({
    action: z.literal('cancel'),
    reason: z.string().max(500).optional(),
  }),
])

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await ctx.params
  const body = await request.json()
  const parsed = ActionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }

  try {
    if (parsed.data.action === 'confirm') {
      const order = await confirmOrder({
        orderId: id,
        confirmedBy: auth.user.id,
        adminNote: parsed.data.admin_note,
      })
      return NextResponse.json({ ok: true, data: order })
    } else {
      const order = await cancelOrder({
        orderId: id,
        reason: parsed.data.reason,
        by: auth.user.id,
      })
      return NextResponse.json({ ok: true, data: order })
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'unknown' },
      { status: 500 }
    )
  }
}
