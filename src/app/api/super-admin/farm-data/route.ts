import { NextResponse } from 'next/server'
import { requireSuperAdmin, createAdminClient } from '@/lib/multitenancy/super-admin'
import { wipeFarmData, seedDemoData } from '@/lib/admin/farm-data-ops'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const auth = await requireSuperAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  let body: { action?: 'wipe' | 'seed'; farmId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const action = body.action
  const farmId = body.farmId
  if (!farmId || !/^[0-9a-f-]{36}$/.test(farmId)) {
    return NextResponse.json({ error: 'invalid_farm_id' }, { status: 400 })
  }
  if (action !== 'wipe' && action !== 'seed') {
    return NextResponse.json({ error: 'invalid_action' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Find owner of the farm to use as `created_by` for seeded rows
  const { data: farm } = await admin
    .from('farms')
    .select('owner_id')
    .eq('id', farmId)
    .maybeSingle()
  if (!farm) {
    return NextResponse.json({ error: 'farm_not_found' }, { status: 404 })
  }

  try {
    if (action === 'wipe') {
      await wipeFarmData(admin, farmId)
      return NextResponse.json({ ok: true, action: 'wipe' })
    }
    // action === 'seed'
    const ownerId = (farm as { owner_id: string | null }).owner_id ?? auth.user.id
    await seedDemoData(admin, farmId, ownerId)
    return NextResponse.json({ ok: true, action: 'seed' })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'unknown' },
      { status: 500 }
    )
  }
}
