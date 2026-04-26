import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getFarmContext } from '@/lib/multitenancy/farm-context'
import { createOrder } from '@/lib/payment/orders'
import { getPaymentSettings } from '@/lib/payment/settings'

const Schema = z.object({
  tier: z.enum(['basic', 'pro', 'enterprise']),
  months: z.union([z.literal(1), z.literal(3), z.literal(6), z.literal(12)]),
  payment_method: z.enum(['bank_transfer', 'momo']).default('bank_transfer'),
})

export async function POST(request: Request) {
  const ctx = await getFarmContext()
  if (!ctx) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
  }
  if (ctx.profile.role !== 'chu_trai') {
    return NextResponse.json(
      { error: 'Chỉ chủ trại mới có quyền nâng gói' },
      { status: 403 }
    )
  }

  const body = await request.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }

  // Đảm bảo super-admin đã khai TK trước khi cho user tạo đơn
  const settings = await getPaymentSettings()
  if (parsed.data.payment_method === 'bank_transfer') {
    if (!settings.bank_account_number || !settings.bank_bin) {
      return NextResponse.json(
        {
          error:
            'SaaS owner chưa cấu hình tài khoản ngân hàng. Vui lòng liên hệ hotline để hoàn tất.',
        },
        { status: 503 }
      )
    }
  }
  if (parsed.data.payment_method === 'momo') {
    if (!settings.momo_phone) {
      return NextResponse.json(
        { error: 'SaaS owner chưa cấu hình MoMo. Vui lòng chọn chuyển khoản ngân hàng.' },
        { status: 503 }
      )
    }
  }

  try {
    const order = await createOrder({
      farmId: ctx.farm.id,
      userId: ctx.user.id,
      tier: parsed.data.tier,
      months: parsed.data.months,
      paymentMethod: parsed.data.payment_method,
      notePrefix: settings.payment_note_prefix,
    })
    return NextResponse.json({ ok: true, data: order })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'unknown' },
      { status: 500 }
    )
  }
}
