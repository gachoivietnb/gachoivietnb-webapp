import { NextResponse } from 'next/server'
import { getFarmContext } from '@/lib/multitenancy/farm-context'
import { createAdminClient } from '@/lib/multitenancy/super-admin'
import { logSystem } from '@/lib/logging/system-logger'

export const dynamic = 'force-dynamic'

/** PATCH — update profile fields. Only same farm. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getFarmContext()
  if (!ctx) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (ctx.profile.role !== 'chu_trai') {
    return NextResponse.json({ error: 'only_chu_trai' }, { status: 403 })
  }

  const { id } = await params
  const admin = createAdminClient()

  // Verify target staff is in caller's farm
  const { data: target } = await admin
    .from('profiles')
    .select('id, farm_id')
    .eq('id', id)
    .maybeSingle()
  if (!target || (target as { farm_id: string }).farm_id !== ctx.farm.id) {
    return NextResponse.json({ error: 'not_in_your_farm' }, { status: 403 })
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: 'invalid_body' }, { status: 400 })

  const allowed = [
    'full_name', 'phone', 'avatar_url', 'role', 'is_active',
    'base_salary_monthly', 'standard_work_days', 'salary_notes',
    'permissions', 'assigned_areas',
  ] as const
  const patch: Record<string, unknown> = {}
  for (const k of allowed) if (k in body) patch[k] = body[k]
  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: 'no_fields' }, { status: 400 })
  }

  const { error } = await admin.from('profiles').update(patch as never).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logSystem({
    level: 'info', category: 'auth',
    message: `Chu_trai updated staff ${id}`,
    user_id: ctx.user.id, farm_id: ctx.farm.id,
    context: { fields: Object.keys(patch) },
  })

  return NextResponse.json({ ok: true })
}

/** DELETE — remove staff (auth + profile). Only same farm + cannot self-delete. */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getFarmContext()
  if (!ctx) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (ctx.profile.role !== 'chu_trai') {
    return NextResponse.json({ error: 'only_chu_trai' }, { status: 403 })
  }

  const { id } = await params
  if (id === ctx.user.id) {
    return NextResponse.json({ error: 'cannot_delete_self' }, { status: 400 })
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

  await admin.from('profiles').delete().eq('id', id)
  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logSystem({
    level: 'warn', category: 'auth',
    message: `Chu_trai deleted staff ${id}`,
    user_id: ctx.user.id, farm_id: ctx.farm.id,
  })

  return NextResponse.json({ ok: true })
}
