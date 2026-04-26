'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { formatDate, formatVnd } from '@/lib/utils/format'
import { removeDiacritics } from '@/lib/utils/slugify'

const TIER_META: Record<string, { label: string; bar: string; cls: string }> = {
  trial: {
    label: 'Dùng thử',
    bar: 'from-slate-400 to-gray-500',
    cls: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-700',
  },
  basic: {
    label: 'Cơ bản',
    bar: 'from-blue-500 to-indigo-500',
    cls: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900',
  },
  pro: {
    label: 'Pro',
    bar: 'from-orange-500 via-red-500 to-rose-500',
    cls: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900',
  },
  enterprise: {
    label: 'Enterprise',
    bar: 'from-violet-500 to-purple-600',
    cls: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900',
  },
}

const STATUS_META: Record<string, { label: string; emoji: string; cls: string }> = {
  active: {
    label: 'Đang hoạt động',
    emoji: '🟢',
    cls: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
  },
  trial: {
    label: 'Trial',
    emoji: '🔵',
    cls: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900',
  },
  trial_expiring: {
    label: 'Sắp hết hạn',
    emoji: '⏳',
    cls: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
  },
  expired: {
    label: 'Hết hạn',
    emoji: '❌',
    cls: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900',
  },
  cancelled: {
    label: 'Đã huỷ',
    emoji: '⚫',
    cls: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/40 dark:text-gray-300 dark:border-gray-700',
  },
}

export type FarmCard = {
  id: string
  slug: string
  name: string
  tier: 'trial' | 'basic' | 'pro' | 'enterprise'
  phone: string | null
  address: string | null
  created_at: string
  trial_ends_at: string | null
  subscription_expires_at: string | null
  max_chickens: number
  max_users: number
  users: number
  chickens: number
  status: 'active' | 'trial' | 'trial_expiring' | 'expired' | 'cancelled'
  daysRemaining: number | null
  monthlyValue: number
}

type SortKey = 'created_desc' | 'created_asc' | 'mrr_desc' | 'chickens_desc' | 'name'

export function SuperFarmsClient({ farms }: { farms: FarmCard[] }) {
  const [q, setQ] = useState('')
  const [filterTier, setFilterTier] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [sortKey, setSortKey] = useState<SortKey>('created_desc')

  const qNorm = removeDiacritics(q.trim())

  const filtered = useMemo(() => {
    const out = farms.filter((f) => {
      if (filterTier && f.tier !== filterTier) return false
      if (filterStatus && f.status !== filterStatus) return false
      if (qNorm) {
        const hay = removeDiacritics(`${f.name} ${f.slug} ${f.phone ?? ''} ${f.address ?? ''}`)
        if (!hay.includes(qNorm)) return false
      }
      return true
    })
    out.sort((a, b) => {
      if (sortKey === 'created_asc')
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      if (sortKey === 'mrr_desc') return b.monthlyValue - a.monthlyValue
      if (sortKey === 'chickens_desc') return b.chickens - a.chickens
      if (sortKey === 'name') return a.name.localeCompare(b.name, 'vi')
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
    return out
  }, [farms, qNorm, filterTier, filterStatus, sortKey])

  const totalMrr = filtered.reduce((s, f) => s + f.monthlyValue, 0)
  const hasFilter = !!q || !!filterTier || !!filterStatus

  function reset() {
    setQ('')
    setFilterTier('')
    setFilterStatus('')
  }

  return (
    <div className="space-y-4">
      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm theo tên / slug / SĐT / địa chỉ…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2"
          >
            <option value="created_desc">🆕 Đăng ký mới nhất</option>
            <option value="created_asc">📜 Đăng ký lâu nhất</option>
            <option value="mrr_desc">💰 MRR cao</option>
            <option value="chickens_desc">🐓 Đàn lớn nhất</option>
            <option value="name">🔤 Tên A→Z</option>
          </select>
          {hasFilter && (
            <button
              onClick={reset}
              className="text-sm text-rose-600 dark:text-rose-400 hover:underline px-2"
            >
              Bỏ lọc
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <span className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 self-center mr-1">
            Tier:
          </span>
          <button
            onClick={() => setFilterTier('')}
            className={
              'px-3 py-1 rounded-full text-xs font-medium border transition ' +
              (!filterTier
                ? 'bg-violet-500 text-white border-transparent shadow'
                : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-violet-400')
            }
          >
            Tất cả
          </button>
          {(['trial', 'basic', 'pro', 'enterprise'] as const).map((t) => {
            const active = filterTier === t
            const meta = TIER_META[t]
            return (
              <button
                key={t}
                onClick={() => setFilterTier(t)}
                className={
                  'px-3 py-1 rounded-full text-xs font-medium border transition ' +
                  (active
                    ? `bg-gradient-to-r ${meta.bar} text-white border-transparent shadow`
                    : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-violet-400')
                }
              >
                {meta.label}
              </button>
            )
          })}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <span className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 self-center mr-1">
            Status:
          </span>
          <button
            onClick={() => setFilterStatus('')}
            className={
              'px-3 py-1 rounded-full text-xs font-medium border transition ' +
              (!filterStatus
                ? 'bg-violet-500 text-white border-transparent shadow'
                : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-violet-400')
            }
          >
            Tất cả
          </button>
          {(['active', 'trial', 'trial_expiring', 'expired', 'cancelled'] as const).map((s) => {
            const active = filterStatus === s
            const meta = STATUS_META[s]
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={
                  'px-3 py-1 rounded-full text-xs font-medium border transition ' +
                  (active
                    ? 'bg-violet-500 text-white border-transparent shadow'
                    : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-violet-400')
                }
              >
                {meta.emoji} {meta.label}
              </button>
            )
          })}
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-700">
          <span>
            Hiện <strong className="text-gray-900 dark:text-gray-100">{filtered.length}</strong>/
            {farms.length} farm
          </span>
          <span>
            MRR đã lọc:{' '}
            <strong className="text-emerald-700 dark:text-emerald-300">{formatVnd(totalMrr)}</strong>
          </span>
        </div>
      </section>

      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-10 text-center">
          <div className="text-5xl mb-2">🏠</div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {farms.length === 0
              ? 'Chưa có farm nào — share /phan-mem để có khách'
              : 'Không khớp bộ lọc'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 text-xs uppercase text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-3 py-2.5 text-left">Farm</th>
                  <th className="px-3 py-2.5 text-left">Tier</th>
                  <th className="px-3 py-2.5 text-left">Status</th>
                  <th className="px-3 py-2.5 text-right">Quy mô</th>
                  <th className="px-3 py-2.5 text-right">MRR</th>
                  <th className="px-3 py-2.5 text-left">Đăng ký</th>
                  <th className="px-3 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((f) => {
                  const tier = TIER_META[f.tier]
                  const st = STATUS_META[f.status]
                  return (
                    <tr
                      key={f.id}
                      className="border-t border-gray-100 dark:border-gray-700 hover:bg-violet-50/40 dark:hover:bg-violet-950/15"
                    >
                      <td className="px-3 py-2.5">
                        <Link
                          href={`/admin/super-admin/farms/${f.id}`}
                          className="block"
                        >
                          <div className="font-semibold text-gray-900 dark:text-gray-100 hover:text-violet-700 dark:hover:text-violet-300">
                            {f.name}
                          </div>
                          <div className="text-[10.5px] text-gray-500 font-mono">/{f.slug}</div>
                          {f.phone && (
                            <div className="text-[10.5px] text-gray-500 mt-0.5">📞 {f.phone}</div>
                          )}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full border ${tier.cls}`}>
                          {tier.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full border ${st.cls}`}>
                          {st.emoji} {st.label}
                        </span>
                        {f.daysRemaining !== null && f.daysRemaining >= 0 && (
                          <div className="text-[10px] text-gray-500 mt-0.5 tabular-nums">
                            còn {f.daysRemaining} ngày
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="text-sm font-bold tabular-nums text-blue-700 dark:text-blue-300">
                          🐓 {f.chickens}
                        </div>
                        <div className="text-[10px] text-gray-500 tabular-nums">
                          /{f.max_chickens} · 👤 {f.users}/{f.max_users}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div
                          className={
                            'text-sm font-bold tabular-nums ' +
                            (f.monthlyValue > 0
                              ? 'text-emerald-700 dark:text-emerald-300'
                              : 'text-gray-400')
                          }
                        >
                          {f.monthlyValue > 0 ? formatVnd(f.monthlyValue) : '—'}
                        </div>
                        <div className="text-[10px] text-gray-500">/tháng</div>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {formatDate(f.created_at)}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Link
                          href={`/admin/super-admin/farms/${f.id}`}
                          className="text-xs text-violet-700 dark:text-violet-300 hover:underline font-semibold"
                        >
                          Chi tiết →
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
