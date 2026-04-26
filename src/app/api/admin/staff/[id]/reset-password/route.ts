import { NextResponse } from 'next/server'
import { getFarmContext } from '@/lib/multitenancy/farm-context'
import { createAdminClient } from '@/lib/multitenancy/super-admin'
import { logSystem } from '@/lib/logging/system-logger'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getFarmContext()
  if (!ctx) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (ctx.profile.role !== 'chu_trai') {
    return NextResponse.json({ error: 'only_chu_trai' }, { status: 403 })
  }

  const { id } = await params
  const body = (await request.json().catch(() => null)) as { password?: string } | null
  if (!body?.password) return NextResponse.json({ error: 'missing_password' }, { status: 400 })
  if (body.password.length < 6) {
    return NextResponse.json({ error: 'password_too_short' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: target } = await admin
    .from('profiles')
    .select('id, farm_id')
    .eq('id', id)
    .maybeSingle()
  if (!target || (target as { farm_id: string }).farm_id !== ctx.farm.id) {
    return NextResponse.json({ error: 'not_in_your_farm' }, { status: 403 })
  }

  const { error } = await admin.auth.admin.updateUserById(id, { password: body.password })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logSystem({
    level: 'warn', category: 'auth',
    message: `Chu_trai reset password for staff ${id}`,
    user_id: ctx.user.id, farm_id: ctx.farm.id,
  })

  return NextResponse.json({ ok: true })
}
