import { NextResponse } from 'next/server'
import { getFarmContext } from '@/lib/multitenancy/farm-context'
import { createAdminClient } from '@/lib/multitenancy/super-admin'
import { wipeFarmData } from '@/lib/admin/farm-data-ops'
import { logSystem } from '@/lib/logging/system-logger'

export const dynamic = 'force-dynamic'

/**
 * GET — return current data_mode for the caller's farm.
 */
export async function GET() {
  const ctx = await getFarmContext()
  if (!ctx) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('farms')
    .select('id, data_mode, data_mode_switched_at')
    .eq('id', ctx.farm.id)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    data_mode: (data as { data_mode: string } | null)?.data_mode ?? 'demo',
    data_mode_switched_at: (data as { data_mode_switched_at: string | null } | null)?.data_mode_switched_at ?? null,
  })
}

/**
 * POST — chu_trai chuyển trại từ DEMO → REAL (xoá toàn bộ dữ liệu mẫu).
 *
 * Constraints:
 *  - Chỉ chu_trai của farm thực hiện được
 *  - Chỉ chuyển được khi data_mode hiện tại = 'demo'
 *  - Một farm chỉ được chuyển 1 lần — sau khi đã 'real', KHÔNG được wipe lại
 *  - Body cần xác nhận: { confirm: 'XOA-DEMO' }
 */
export async function POST(request: Request) {
  const ctx = await getFarmContext()
  if (!ctx) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (ctx.profile.role !== 'chu_trai') {
    return NextResponse.json({ error: 'only_chu_trai' }, { status: 403 })
  }

  const body = (await request.json().catch(() => null)) as { confirm?: string } | null
  if (body?.confirm !== 'XOA-DEMO') {
    return NextResponse.json({ error: 'missing_confirmation' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Re-check current mode atomically
  const { data: farmRow, error: farmErr } = await admin
    .from('farms')
    .select('id, name, data_mode, data_mode_switched_at')
    .eq('id', ctx.farm.id)
    .maybeSingle()
  if (farmErr || !farmRow) {
    return NextResponse.json({ error: 'farm_lookup_failed' }, { status: 500 })
  }
  const farm = farmRow as { id: string; name: string; data_mode: string; data_mode_switched_at: string | null }

  if (farm.data_mode === 'real') {
    return NextResponse.json(
      {
        error: 'already_real',
        message: 'Trại đã chuyển sang dữ liệu thật trước đó — không thể wipe lại. Liên hệ hỗ trợ nếu cần reset.',
      },
      { status: 409 }
    )
  }

  try {
    await wipeFarmData(admin, ctx.farm.id)

    const { error: updateErr } = await admin
      .from('farms')
      .update({
        data_mode: 'real',
        data_mode_switched_at: new Date().toISOString(),
      } as never)
      .eq('id', ctx.farm.id)
    if (updateErr) throw updateErr

    await logSystem({
      level: 'warn',
      category: 'other',
      message: `Farm ${farm.name} switched from DEMO to REAL`,
      user_id: ctx.user.id,
      user_email: ctx.user.email,
      farm_id: ctx.farm.id,
    })

    return NextResponse.json({ ok: true, data_mode: 'real' })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown'
    await logSystem({
      level: 'error',
      category: 'other',
      message: 'Farm demo→real switch failed',
      user_id: ctx.user.id,
      farm_id: ctx.farm.id,
      context: { error: msg },
    })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
