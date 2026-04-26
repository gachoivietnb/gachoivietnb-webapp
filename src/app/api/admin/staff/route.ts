import { NextResponse } from 'next/server'
import { getFarmContext } from '@/lib/multitenancy/farm-context'
import { createAdminClient } from '@/lib/multitenancy/super-admin'
import { logSystem } from '@/lib/logging/system-logger'

export const dynamic = 'force-dynamic'

/**
 * POST — chu_trai tạo nhân viên mới TRONG farm của họ.
 * body: { email, password, full_name, phone?, role?, base_salary_monthly?, standard_work_days? }
 */
export async function POST(request: Request) {
  const ctx = await getFarmContext()
  if (!ctx) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (ctx.profile.role !== 'chu_trai') {
    return NextResponse.json({ error: 'only_chu_trai' }, { status: 403 })
  }

  const body = (await request.json().catch(() => null)) as {
    email?: string
    password?: string
    full_name?: string
    phone?: string
    role?: 'nhan_vien' | 'chu_trai' | 'khach'
    base_salary_monthly?: number
    standard_work_days?: number
    avatar_url?: string
  } | null
  if (!body) return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  const { email, password, full_name } = body
  if (!email || !password || !full_name) {
    return NextResponse.json({ error: 'missing_required_fields' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'password_too_short' }, { status: 400 })
  }

  const role = (body.role ?? 'nhan_vien') as 'nhan_vien' | 'chu_trai' | 'khach'
  if (!['nhan_vien', 'chu_trai', 'khach'].includes(role)) {
    return NextResponse.json({ error: 'invalid_role' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Create auth user with farm_id meta so handle_new_user trigger uses it
  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, farm_id: ctx.farm.id },
  })
  if (authErr || !created.user) {
    return NextResponse.json({ error: authErr?.message ?? 'auth_create_failed' }, { status: 400 })
  }
  const userId = created.user.id

  // Upsert profile with desired role + salary fields
  const { error: pErr } = await admin
    .from('profiles')
    .upsert(
      {
        id: userId,
        full_name,
        phone: body.phone ?? null,
        avatar_url: body.avatar_url ?? null,
        role,
        is_active: true,
        farm_id: ctx.farm.id,
        base_salary_monthly: body.base_salary_monthly ?? null,
        standard_work_days: body.standard_work_days ?? null,
      } as never,
      { onConflict: 'id' }
    )
  if (pErr) {
    await admin.auth.admin.deleteUser(userId).catch(() => {})
    return NextResponse.json({ error: 'profile_upsert_failed: ' + pErr.message }, { status: 500 })
  }

  await logSystem({
    level: 'info', category: 'auth',
    message: `Chu_trai created staff ${email} (role=${role})`,
    user_id: userId, user_email: email, farm_id: ctx.farm.id,
  })

  return NextResponse.json({ ok: true, user_id: userId })
}
