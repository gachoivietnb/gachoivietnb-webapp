import { NextResponse } from 'next/server'
import { requireSuperAdmin, createAdminClient } from '@/lib/multitenancy/super-admin'
import {
  grantDemoAccess,
  revokeDemoAccess,
  reseedDemoFromTemplate,
  initializeMasterDemo,
  MASTER_FARM_ID,
} from '@/lib/admin/farm-data-ops'

export const dynamic = 'force-dynamic'

type Action = 'grant' | 'revoke' | 'reseed' | 'init_master'

export async function POST(request: Request) {
  const auth = await requireSuperAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  let body: { action?: Action; farmId?: string; notes?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const { action, farmId, notes } = body
  if (!action || !['grant', 'revoke', 'reseed', 'init_master'].includes(action)) {
    return NextResponse.json({ error: 'invalid_action' }, { status: 400 })
  }

  const admin = createAdminClient()

  try {
    if (action === 'init_master') {
      await initializeMasterDemo(admin, auth.user.id)
      return NextResponse.json({ ok: true, action })
    }

    if (!farmId || !/^[0-9a-f-]{36}$/.test(farmId)) {
      return NextResponse.json({ error: 'invalid_farm_id' }, { status: 400 })
    }
    if (farmId === MASTER_FARM_ID) {
      return NextResponse.json(
        { error: 'cannot_target_master_farm' },
        { status: 400 }
      )
    }

    const { data: farm } = await admin
      .from('farms')
      .select('owner_id')
      .eq('id', farmId)
      .maybeSingle()
    if (!farm) {
      return NextResponse.json({ error: 'farm_not_found' }, { status: 404 })
    }
    const ownerId = (farm as { owner_id: string | null }).owner_id ?? auth.user.id

    if (action === 'grant') {
      const result = await grantDemoAccess(admin, farmId, ownerId, auth.user.id, notes)
      return NextResponse.json({ ok: true, action, ...result })
    }
    if (action === 'revoke') {
      await revokeDemoAccess(admin, farmId, auth.user.id)
      return NextResponse.json({ ok: true, action })
    }
    if (action === 'reseed') {
      const result = await reseedDemoFromTemplate(admin, farmId, ownerId)
      return NextResponse.json({ ok: true, action, ...result })
    }

    return NextResponse.json({ error: 'invalid_action' }, { status: 400 })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'unknown' },
      { status: 500 }
    )
  }
}
