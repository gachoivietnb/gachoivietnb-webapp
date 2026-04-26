import { NextResponse } from 'next/server'
import { getFarmContext } from '@/lib/multitenancy/farm-context'
import { createAdminClient } from '@/lib/multitenancy/super-admin'
import { restoreFarmBackup } from '@/lib/admin/backup'
import { logSystem } from '@/lib/logging/system-logger'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function POST(request: Request) {
  const ctx = await getFarmContext()
  if (!ctx) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (ctx.profile.role !== 'chu_trai') {
    return NextResponse.json({ error: 'only_chu_trai' }, { status: 403 })
  }

  const formData = await request.formData()
  const file = formData.get('file')
  const confirm = formData.get('confirm')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'missing_file' }, { status: 400 })
  }
  if (confirm !== 'KHOI-PHUC') {
    return NextResponse.json({ error: 'missing_confirmation' }, { status: 400 })
  }
  if (file.size > 50 * 1024 * 1024) {
    return NextResponse.json({ error: 'file_too_large_max_50mb' }, { status: 400 })
  }
  if (!/\.zip$/i.test(file.name)) {
    return NextResponse.json({ error: 'must_be_zip' }, { status: 400 })
  }

  const admin = createAdminClient()
  const buffer = await file.arrayBuffer()

  try {
    const result = await restoreFarmBackup(admin, ctx.farm.id, buffer)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    await logSystem({
      level: 'warn', category: 'other',
      message: `Farm ${ctx.farm.id} restored from backup ${file.name}`,
      user_id: ctx.user.id, user_email: ctx.user.email, farm_id: ctx.farm.id,
      context: { restored: result.restored, file_size_kb: Math.round(file.size / 1024) },
    })

    return NextResponse.json({ ok: true, restored: result.restored })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown'
    await logSystem({
      level: 'error', category: 'other',
      message: 'Backup restore failed',
      user_id: ctx.user.id, farm_id: ctx.farm.id,
      context: { error: msg },
    })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
