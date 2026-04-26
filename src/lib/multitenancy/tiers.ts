/* ============================================================
 * Tier constants — client-safe (KHÔNG có 'server-only').
 * Import file này từ client components.
 *
 * Các module server-only (super-admin.ts, orders.ts) re-export
 * lại từ đây để giữ tương thích.
 * ============================================================ */

export type Tier = 'trial' | 'basic' | 'pro' | 'enterprise'

export const TIER_MONTHLY_PRICE: Record<Tier, number> = {
  trial: 0,
  basic: 199_000,
  pro: 499_000,
  enterprise: 1_499_000,
}

export const TIER_LABEL: Record<Tier, string> = {
  trial: 'Dùng thử',
  basic: 'Cơ bản',
  pro: 'Pro',
  enterprise: 'Enterprise',
}

export const TIER_COLOR: Record<Tier, { bar: string; cls: string }> = {
  trial: {
    bar: 'from-slate-400 to-gray-500',
    cls: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-700',
  },
  basic: {
    bar: 'from-blue-500 to-indigo-500',
    cls: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900',
  },
  pro: {
    bar: 'from-orange-500 via-red-500 to-rose-500',
    cls: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900',
  },
  enterprise: {
    bar: 'from-violet-500 to-purple-600',
    cls: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900',
  },
}
