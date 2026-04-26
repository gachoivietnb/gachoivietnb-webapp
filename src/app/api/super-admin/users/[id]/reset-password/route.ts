import { NextResponse } from 'next/server'
import { requireSuperAdmin, createAdminClient } from '@/lib/multitenancy/super-admin'
import { logSystem } from '@/lib/logging/system-logger'

export const dynamic = 'force-dynamic'

/**
 * POST — reset password for a user
 * body: { password }   (min 6 chars)
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await params
  const body = (await request.json().catch(() => null)) as { password?: string } | null
  if (!body?.password) {
    return NextResponse.json({ error: 'missing_password' }, { status: 400 })
  }
  if (body.password.length < 6) {
    return NextResponse.json({ error: 'password_too_short' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.updateUserById(id, { password: body.password })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await logSystem({
    level: 'warn', category: 'auth',
    message: `Super admin reset password for user ${id}`,
    user_id: id,
  })

  return NextResponse.json({ ok: true })
}
