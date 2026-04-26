import 'server-only'
import { createClient } from '@/lib/supabase/server'

export type FarmContext = {
  user: { id: string; email?: string }
  profile: {
    id: string
    full_name: string
    role: 'chu_trai' | 'nhan_vien'
    farm_id: string
  }
  farm: {
    id: string
    slug: string
    name: string
    tier: 'trial' | 'basic' | 'pro' | 'enterprise'
    trial_ends_at: string | null
    subscription_active: boolean
    subscription_expires_at: string | null
    max_chickens: number
    max_users: number
    owner_id: string | null
  }
}

/**
 * Resolve the authenticated user's farm context (profile + farm row).
 * Returns null if not authenticated or no farm linked.
 *
 * Use this in server components / API routes to:
 *   - Display farm name / tier
 *   - Gate features by tier
 *   - Inject farm_id explicitly when service_role bypasses RLS
 */
export async function getFarmContext(): Promise<FarmContext | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, role, farm_id')
    .eq('id', user.id)
    .maybeSingle<FarmContext['profile']>()
  if (!profile?.farm_id) return null

  const { data: farm } = await supabase
    .from('farms')
    .select(
      'id, slug, name, tier, trial_ends_at, subscription_active, subscription_expires_at, max_chickens, max_users, owner_id'
    )
    .eq('id', profile.farm_id)
    .maybeSingle<FarmContext['farm']>()
  if (!farm) return null

  return {
    user: { id: user.id, email: user.email },
    profile,
    farm,
  }
}

/**
 * Convenience: just the farm_id, throws if not authenticated.
 * Use sparingly — prefer getFarmContext() for richer info.
 */
export async function requireFarmId(): Promise<string> {
  const ctx = await getFarmContext()
  if (!ctx) throw new Error('Unauthorized: no farm context')
  return ctx.farm.id
}

/**
 * Check if the farm's subscription is currently valid (not expired).
 * Trial farms: valid until trial_ends_at.
 * Paid farms: valid if subscription_active = true and not expired.
 */
export function isSubscriptionActive(farm: FarmContext['farm']): boolean {
  const now = Date.now()
  if (farm.tier === 'trial') {
    return farm.trial_ends_at ? new Date(farm.trial_ends_at).getTime() > now : false
  }
  if (!farm.subscription_active) return false
  if (farm.subscription_expires_at) {
    return new Date(farm.subscription_expires_at).getTime() > now
  }
  return true
}

/**
 * Feature gates per tier — single source of truth.
 * Higher tiers inherit everything from lower.
 */
export const TIER_FEATURES: Record<
  FarmContext['farm']['tier'],
  {
    aiMarketing: boolean
    biKip: boolean
    advancedReports: boolean
    apiAccess: boolean
    whiteLabel: boolean
    maxChickens: number
    maxUsers: number
  }
> = {
  trial: {
    aiMarketing: true,
    biKip: true,
    advancedReports: true,
    apiAccess: false,
    whiteLabel: false,
    maxChickens: 50,
    maxUsers: 1,
  },
  basic: {
    aiMarketing: false,
    biKip: false,
    advancedReports: false,
    apiAccess: false,
    whiteLabel: false,
    maxChickens: 200,
    maxUsers: 2,
  },
  pro: {
    aiMarketing: true,
    biKip: true,
    advancedReports: true,
    apiAccess: false,
    whiteLabel: false,
    maxChickens: 1000,
    maxUsers: 5,
  },
  enterprise: {
    aiMarketing: true,
    biKip: true,
    advancedReports: true,
    apiAccess: true,
    whiteLabel: true,
    maxChickens: 1_000_000,
    maxUsers: 1000,
  },
}

export function hasFeature(
  farm: FarmContext['farm'],
  feature: keyof (typeof TIER_FEATURES)['trial']
): boolean {
  if (!isSubscriptionActive(farm)) return false
  const features = TIER_FEATURES[farm.tier]
  return Boolean(features[feature])
}
