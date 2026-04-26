import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSuperAdmin, createAdminClient } from '@/lib/multitenancy/super-admin'

const PatchSchema = z.object({
  action: z.enum([
    'set_tier',
    'extend_trial',
    'extend_subscription',
    'cancel',
    'reactivate',
  ]),
  tier: z.enum(['trial', 'basic', 'pro', 'enterprise']).optional(),
  days: z.number().int().min(1).max(3650).optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params
  const body = await request.json()
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: farm } = await admin.from('farms').select('*').eq('id', id).maybeSingle()
  if (!farm) return NextResponse.json({ error: 'Farm không tồn tại' }, { status: 404 })

  const f = farm as {
    tier: string
    trial_ends_at: string | null
    subscription_expires_at: string | null
    subscription_active: boolean
  }

  const TIER_DEFAULTS: Record<string, { max_chickens: number; max_users: number }> = {
    trial: { max_chickens: 50, max_users: 1 },
    basic: { max_chickens: 200, max_users: 2 },
    pro: { max_chickens: 1000, max_users: 5 },
    enterprise: { max_chickens: 1_000_000, max_users: 1000 },
  }

  let update: Record<string, unknown> = {}

  if (parsed.data.action === 'set_tier') {
    if (!parsed.data.tier) {
      return NextResponse.json({ error: 'Thiếu tier' }, { status: 400 })
    }
    update = {
      tier: parsed.data.tier,
      max_chickens: TIER_DEFAULTS[parsed.data.tier].max_chickens,
      max_users: TIER_DEFAULTS[parsed.data.tier].max_users,
      subscription_active: true,
    }
    // For paid tiers, extend subscription 30 days from now or from existing expiry
    if (parsed.data.tier !== 'trial') {
      const baseTime = f.subscription_expires_at
        ? Math.max(Date.now(), new Date(f.subscription_expires_at).getTime())
        : Date.now()
      update.subscription_expires_at = new Date(baseTime + 30 * 86400_000).toISOString()
      update.trial_ends_at = null
    } else {
      // Reset trial 14 days
      update.trial_ends_at = new Date(Date.now() + 14 * 86400_000).toISOString()
      update.subscription_expires_at = null
    }
  } else if (parsed.data.action === 'extend_trial') {
    const days = parsed.data.days ?? 14
    const baseTime = f.trial_ends_at
      ? Math.max(Date.now(), new Date(f.trial_ends_at).getTime())
      : Date.now()
    update = {
      trial_ends_at: new Date(baseTime + days * 86400_000).toISOString(),
      subscription_active: true,
    }
  } else if (parsed.data.action === 'extend_subscription') {
    const days = parsed.data.days ?? 30
    const baseTime = f.subscription_expires_at
      ? Math.max(Date.now(), new Date(f.subscription_expires_at).getTime())
      : Date.now()
    update = {
      subscription_expires_at: new Date(baseTime + days * 86400_000).toISOString(),
      subscription_active: true,
    }
  } else if (parsed.data.action === 'cancel') {
    update = { subscription_active: false }
  } else if (parsed.data.action === 'reactivate') {
    update = { subscription_active: true }
  }

  const { data, error } = await admin
    .from('farms')
    .update(update as never)
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params

  // Safety: prevent deleting the default farm
  if (id === '00000000-0000-0000-0000-000000000001') {
    return NextResponse.json(
      { error: 'Không thể xoá default farm gốc' },
      { status: 400 }
    )
  }

  const admin = createAdminClient()
  const { error } = await admin.from('farms').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
