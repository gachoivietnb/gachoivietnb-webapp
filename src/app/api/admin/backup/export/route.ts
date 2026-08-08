import { getFarmContext } from '@/lib/multitenancy/farm-context'
import { createAdminClient } from '@/lib/multitenancy/super-admin'
import { exportFarmBackup, markFarmBackupTaken } from '@/lib/admin/backup'
import { logSystem } from '@/lib/logging/system-logger'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET() {
  const ctx = await getFarmContext()
  if (!ctx) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
  if (ctx.profile.role !== 'chu_trai') {
    return new Response(JSON.stringify({ error: 'only_chu_trai' }), { status: 403 })
  }

  const admin = createAdminClient()
  try {
    const { buffer, filename, manifest } = await exportFarmBackup(admin, ctx.farm.id)
    await markFarmBackupTaken(admin, ctx.farm.id)

    await logSystem({
      level: 'info', category: 'other',
      message: `Backup exported for farm ${manifest.farm_name}`,
      user_id: ctx.user.id, user_email: ctx.user.email, farm_id: ctx.farm.id,
      context: { tables: Object.keys(manifest.tables).length, size_kb: Math.round(buffer.byteLength / 1024) },
    })

    return new Response(buffer as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.byteLength),
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown'
    await logSystem({
      level: 'error', category: 'other',
      message: 'Backup export failed',
      user_id: ctx.user.id, farm_id: ctx.farm.id,
      context: { error: msg },
    })
    return new Response(JSON.stringify({ error: msg }), { status: 500 })
  }
}
