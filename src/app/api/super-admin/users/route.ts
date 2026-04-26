import { NextResponse } from 'next/server'
import { requireSuperAdmin, createAdminClient } from '@/lib/multitenancy/super-admin'
import { logSystem } from '@/lib/logging/system-logger'

export const dynamic = 'force-dynamic'

/**
 * GET — list all users (across farms) with farm name + auth meta
 */
export async function GET() {
  const auth = await requireSuperAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const admin = createAdminClient()

  // Profiles + farm name (LEFT JOIN)
  const { data: profiles, error: pErr } = await admin
    .from('profiles')
    .select('id, full_name, phone, role, is_active, farm_id, created_at, updated_at, farm:farms(name, slug)')
    .order('created_at', { ascending: false })
    .limit(500)

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })

  // Auth metadata (email, last sign-in)
  const { data: authList } = await admin.auth.admin.listUsers({ page: 1, perPage: 500 })
  const byId = new Map<string, { email: string | undefined; last_sign_in_at: string | null }>()
  for (const u of authList?.users ?? []) {
    byId.set(u.id, { email: u.email, last_sign_in_at: u.last_sign_in_at ?? null })
  }

  const users = (profiles ?? []).map((p) => {
    const meta = byId.get(p.id as string)
    return {
      ...p,
      email: meta?.email ?? null,
      last_sign_in_at: meta?.last_sign_in_at ?? null,
    }
  })

  return NextResponse.json({ users })
}

/**
 * POST — create new user (auth + profile)
 * body: { email, password, full_name, role, farm_id, phone?, is_active? }
 */
export async function POST(request: Request) {
  const auth = await requireSuperAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const body = (await request.json().catch(() => null)) as {
    email?: string
    password?: string
    full_name?: string
    role?: 'chu_trai' | 'nhan_vien' | 'khach'
    farm_id?: string
    phone?: string
    is_active?: boolean
  } | null

  if (!body) return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  const { email, password, full_name, role = 'nhan_vien', farm_id, phone, is_active = true } = body

  if (!email || !password || !full_name || !farm_id) {
    return NextResponse.json({ error: 'missing_required_fields' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'password_too_short' }, { status: 400 })
  }
  if (!['chu_trai', 'nhan_vien', 'khach'].includes(role)) {
    return NextResponse.json({ error: 'invalid_role' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Check farm exists
  const { data: farm } = await admin.from('farms').select('id, name').eq('id', farm_id).maybeSingle()
  if (!farm) return NextResponse.json({ error: 'farm_not_found' }, { status: 404 })

  // Create auth user
  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, farm_id },
  })
  if (authErr || !created.user) {
    await logSystem({
      level: 'error', category: 'auth',
      message: 'Super admin user create failed',
      user_email: email, context: { error: authErr?.message },
    })
    return NextResponse.json({ error: authErr?.message ?? 'auth_create_failed' }, { status: 400 })
  }
  const userId = created.user.id

  // Profile may already be auto-created by trigger handle_new_user → use upsert
  const { error: pErr } = await admin
    .from('profiles')
    .upsert(
      { id: userId, full_name, phone: phone ?? null, role, is_active, farm_id } as never,
      { onConflict: 'id' }
    )

  if (pErr) {
    // Rollback auth user
    await admin.auth.admin.deleteUser(userId).catch(() => {})
    return NextResponse.json({ error: 'profile_upsert_failed: ' + pErr.message }, { status: 500 })
  }

  await logSystem({
    level: 'info', category: 'auth',
    message: `Super admin created user ${email} (role=${role}, farm=${farm.name})`,
    user_id: userId, user_email: email, farm_id,
  })

  return NextResponse.json({ ok: true, user_id: userId })
}
