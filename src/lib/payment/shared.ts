/* ============================================================
 * Payment helpers — client-safe (KHÔNG có 'server-only').
 *
 * Format helpers, types, status meta. Server module orders.ts
 * re-export lại từ đây để dùng tương thích.
 * ============================================================ */

import { TIER_MONTHLY_PRICE, type Tier } from '@/lib/multitenancy/tiers'

export type SubscriptionOrder = {
  id: string
  farm_id: string
  user_id: string
  tier: 'basic' | 'pro' | 'enterprise'
  months: 1 | 3 | 6 | 12
  amount_vnd: number
  payment_method: 'bank_transfer' | 'momo' | 'vnpay' | 'manual'
  payment_note: string
  status: 'pending' | 'paid' | 'cancelled' | 'expired' | 'refunded'
  expires_at: string
  paid_at: string | null
  cancelled_at: string | null
  confirmed_by: string | null
  cancellation_reason: string | null
  casso_txn_id: string | null
  casso_payload: unknown
  gateway_txn_ref: string | null
  gateway_payload: unknown
  admin_note: string | null
  created_at: string
  updated_at: string
}

export type PaidTier = Exclude<Tier, 'trial'>

/**
 * Discount ladder cho việc đăng ký nhiều tháng:
 *   1 tháng  → 0%
 *   3 tháng  → 5%
 *   6 tháng  → 10%
 *   12 tháng → 17% (≈ 2 tháng free)
 */
export function discountForMonths(months: number): number {
  if (months >= 12) return 0.17
  if (months >= 6) return 0.10
  if (months >= 3) return 0.05
  return 0
}

export function computeAmount(tier: PaidTier, months: number): number {
  const monthly = TIER_MONTHLY_PRICE[tier] ?? 0
  const gross = monthly * months
  const discount = discountForMonths(months)
  // Round to nearest 1.000đ
  return Math.round((gross * (1 - discount)) / 1000) * 1000
}

export function tierLimits(tier: PaidTier): {
  max_chickens: number
  max_users: number
} {
  switch (tier) {
    case 'basic':
      return { max_chickens: 200, max_users: 2 }
    case 'pro':
      return { max_chickens: 1000, max_users: 5 }
    case 'enterprise':
      return { max_chickens: 100000, max_users: 100 }
  }
}

export function formatVnd(n: number): string {
  return n.toLocaleString('vi-VN') + 'đ'
}

export const ORDER_STATUS_META: Record<
  SubscriptionOrder['status'],
  { label: string; cls: string; emoji: string }
> = {
  pending: {
    label: 'Chờ thanh toán',
    cls: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300',
    emoji: '⏳',
  },
  paid: {
    label: 'Đã thanh toán',
    cls: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300',
    emoji: '✅',
  },
  cancelled: {
    label: 'Đã huỷ',
    cls: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/40 dark:text-gray-300',
    emoji: '⚫',
  },
  expired: {
    label: 'Hết hạn',
    cls: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300',
    emoji: '⌛',
  },
  refunded: {
    label: 'Đã hoàn tiền',
    cls: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300',
    emoji: '↩️',
  },
}
