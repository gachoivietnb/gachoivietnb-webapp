import { NextResponse } from 'next/server'
import { requireSuperAdmin, createAdminClient } from '@/lib/multitenancy/super-admin'
import { logSystem } from '@/lib/logging/system-logger'

export const dynamic = 'force-dynamic'

/**
 * PATCH — update profile fields (role, farm_id, is_active, full_name, phone, permissions)
 * body: any subset of those fields
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await params
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: 'invalid_body' }, { status: 400 })

  const allowed = ['full_name', 'phone', 'role', 'is_active', 'farm_id', 'permissions', 'assigned_areas'] as const
  const patch: Record<string, unknown> = {}
  for (const k of allowed) {
    if (k in body) patch[k] = body[k]
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'no_fields_to_update' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin.from('profiles').update(patch as never).eq('id', id)
  if (error) {
    await logSystem({
      level: 'error', category: 'auth',
      message: 'Super admin profile update failed',
      user_id: id, context: { error: error.message, patch },
    })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await logSystem({
    level: 'info', category: 'auth',
    message: `Super admin updated profile ${id}`,
    user_id: id, context: { fields: Object.keys(patch) },
  })

  return NextResponse.json({ ok: true })
}

/**
 * DELETE — remove user entirely (auth + profile)
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await params
  if (id === auth.user.id) {
    return NextResponse.json({ error: 'cannot_delete_self' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Delete profile first to satisfy any FK checks; auth.users is the source of truth
  await admin.from('profiles').delete().eq('id', id)
  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await logSystem({
    level: 'warn', category: 'auth',
    message: `Super admin deleted user ${id}`,
    user_id: id,
  })

  return NextResponse.json({ ok: true })
}
