import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/multitenancy/super-admin'
import {
  PaymentSettingsUpdateSchema,
  getPaymentSettings,
  updatePaymentSettings,
} from '@/lib/payment/settings'

export async function GET() {
  const auth = await requireSuperAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const data = await getPaymentSettings()
  return NextResponse.json({ data })
}

export async function PATCH(request: Request) {
  const auth = await requireSuperAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const parsed = PaymentSettingsUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }

  try {
    const data = await updatePaymentSettings(parsed.data, auth.user.id)
    return NextResponse.json({ data })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'unknown' },
      { status: 500 }
    )
  }
}
