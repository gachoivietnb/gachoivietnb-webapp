import { NextResponse } from 'next/server'
import { requireSuperAdmin, createAdminClient } from '@/lib/multitenancy/super-admin'
import { logSystem } from '@/lib/logging/system-logger'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const auth = await requireSuperAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const url = new URL(request.url)
  const level = url.searchParams.get('level') ?? ''
  const category = url.searchParams.get('category') ?? ''
  const fromDays = parseInt(url.searchParams.get('fromDays') ?? '30', 10)
  const showResolved = url.searchParams.get('showResolved') === '1'
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '200', 10), 500)

  const admin = createAdminClient()
  let q = admin
    .from('system_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (level) q = q.eq('level', level)
  if (category) q = q.eq('category', category)
  if (!showResolved) q = q.is('resolved_at', null)
  if (fromDays > 0) {
    const cutoff = new Date(Date.now() - fromDays * 86400000).toISOString()
    q = q.gte('created_at', cutoff)
  }

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ logs: data ?? [] })
}

/** PATCH — mark as resolved */
export async function PATCH(request: Request) {
  const auth = await requireSuperAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const body = (await request.json().catch(() => null)) as
    | { id?: string; ids?: string[]; note?: string }
    | null
  if (!body) return NextResponse.json({ error: 'invalid_body' }, { status: 400 })

  const ids = body.ids ?? (body.id ? [body.id] : [])
  if (!ids.length) return NextResponse.json({ error: 'no_ids' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('system_logs')
    .update({
      resolved_at: new Date().toISOString(),
      resolved_by: auth.user.id,
      resolved_note: body.note ?? null,
    })
    .in('id', ids)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, count: ids.length })
}

/** POST — create test log (admin debug) */
export async function POST(request: Request) {
  const auth = await requireSuperAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  await logSystem({
    level: 'info',
    category: 'other',
    message: 'Test log created from Super Admin dashboard',
    user_id: auth.user.id,
    user_email: auth.user.email,
    context: { manual: true, timestamp: new Date().toISOString() },
  })
  return NextResponse.json({ ok: true })
}

/** DELETE — purge logs (super-admin housekeeping) */
export async function DELETE(request: Request) {
  const auth = await requireSuperAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const url = new URL(request.url)
  const olderThanDays = parseInt(url.searchParams.get('olderThanDays') ?? '90', 10)
  const onlyResolved = url.searchParams.get('onlyResolved') !== '0'

  const admin = createAdminClient()
  let q = admin.from('system_logs').delete()
  if (olderThanDays > 0) {
    const cutoff = new Date(Date.now() - olderThanDays * 86400000).toISOString()
    q = q.lt('created_at', cutoff)
  }
  if (onlyResolved) q = q.not('resolved_at', 'is', null)
  const { error, count } = await q.select('id', { count: 'exact', head: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, deleted: count ?? 0 })
}
