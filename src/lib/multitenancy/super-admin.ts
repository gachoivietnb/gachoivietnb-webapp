import 'server-only'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { TIER_MONTHLY_PRICE } from './tiers'

/**
 * Super-admin = the SaaS owner (the person running gachoivietnb.com).
 * NOT the same as `chu_trai` — chu_trai owns 1 farm, super-admin sees ALL farms.
 *
 * Identification is by email allowlist via env var:
 *   SUPER_ADMIN_EMAILS=haunau486@gmail.com,partner@example.com
 *
 * No DB schema changes — env-controlled, easy to update without redeploying DB.
 */

function getAllowlist(): string[] {
  const raw = process.env.SUPER_ADMIN_EMAILS ?? ''
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

/**
 * Check if currently authenticated user is a super-admin.
 */
export async function isSuperAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) return false
  return getAllowlist().includes(user.email.toLowerCase())
}

/**
 * Throw / redirect-equivalent guard for super-admin pages.
 * Returns the user object so caller can use it.
 */
export async function requireSuperAdmin(): Promise<{
  ok: true
  user: { id: string; email: string }
} | { ok: false; reason: 'unauthenticated' | 'not_super_admin' }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) return { ok: false, reason: 'unauthenticated' }
  if (!getAllowlist().includes(user.email.toLowerCase())) {
    return { ok: false, reason: 'not_super_admin' }
  }
  return { ok: true, user: { id: user.id, email: user.email } }
}

/**
 * Server-side Supabase client with `service_role` key — BYPASSES RLS.
 * Use for super-admin queries that need to see all farms across tenants.
 *
 * SECURITY: Caller MUST verify super-admin first via requireSuperAdmin().
 * Never expose this client's results to unauthenticated callers.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env'
    )
  }
  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/* ============================================================
 * Pricing / tier constants — client-safe versions ở `./tiers.ts`.
 * Re-export tại đây để giữ tương thích với code cũ import từ
 * '@/lib/multitenancy/super-admin'.
 * ============================================================ */
export { TIER_MONTHLY_PRICE, TIER_LABEL, TIER_COLOR } from './tiers'
export type { Tier } from './tiers'

export type FarmRow = {
  id: string
  slug: string
  name: string
  display_name: string | null
  tier: 'trial' | 'basic' | 'pro' | 'enterprise'
  trial_ends_at: string | null
  subscription_active: boolean
  subscription_expires_at: string | null
  max_chickens: number
  max_users: number
  owner_id: string | null
  phone: string | null
  address: string | null
  created_at: string
}

/**
 * Compute the effective subscription state for UI display.
 */
export function computeFarmStatus(farm: FarmRow): {
  status: 'active' | 'trial' | 'trial_expiring' | 'expired' | 'cancelled'
  daysRemaining: number | null
  monthlyValue: number
} {
  const now = Date.now()
  const monthlyValue = farm.subscription_active
    ? TIER_MONTHLY_PRICE[farm.tier] ?? 0
    : 0

  if (!farm.subscription_active) {
    return { status: 'cancelled', daysRemaining: null, monthlyValue: 0 }
  }

  if (farm.tier === 'trial') {
    if (!farm.trial_ends_at) {
      return { status: 'trial', daysRemaining: null, monthlyValue: 0 }
    }
    const ms = new Date(farm.trial_ends_at).getTime() - now
    const days = Math.ceil(ms / 86400_000)
    if (days < 0) return { status: 'expired', daysRemaining: days, monthlyValue: 0 }
    if (days <= 3)
      return { status: 'trial_expiring', daysRemaining: days, monthlyValue: 0 }
    return { status: 'trial', daysRemaining: days, monthlyValue: 0 }
  }

  if (farm.subscription_expires_at) {
    const ms = new Date(farm.subscription_expires_at).getTime() - now
    const days = Math.ceil(ms / 86400_000)
    if (days < 0)
      return { status: 'expired', daysRemaining: days, monthlyValue: 0 }
    if (days <= 7)
      return { status: 'trial_expiring', daysRemaining: days, monthlyValue }
    return { status: 'active', daysRemaining: days, monthlyValue }
  }

  return { status: 'active', daysRemaining: null, monthlyValue }
}

export const STATUS_META: Record<
  ReturnType<typeof computeFarmStatus>['status'],
  { label: string; emoji: string; cls: string }
> = {
  active: {
    label: 'Đang hoạt động',
    emoji: '🟢',
    cls: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
  },
  trial: {
    label: 'Dùng thử',
    emoji: '🔵',
    cls: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900',
  },
  trial_expiring: {
    label: 'Sắp hết hạn',
    emoji: '⏳',
    cls: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
  },
  expired: {
    label: 'Đã hết hạn',
    emoji: '❌',
    cls: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900',
  },
  cancelled: {
    label: 'Đã huỷ',
    emoji: '⚫',
    cls: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/40 dark:text-gray-300 dark:border-gray-700',
  },
}
