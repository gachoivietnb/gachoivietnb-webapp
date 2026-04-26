import Link from 'next/link'
import {
  requireSuperAdmin,
  createAdminClient,
  computeFarmStatus,
  TIER_MONTHLY_PRICE,
  TIER_LABEL,
  TIER_COLOR,
  STATUS_META,
  type FarmRow,
} from '@/lib/multitenancy/super-admin'
import { formatVnd, formatDateTime } from '@/lib/utils/format'

export const revalidate = 0

export default async function SuperAdminDashboard() {
  const auth = await requireSuperAdmin()
  if (!auth.ok) return <AccessDenied reason={auth.reason} />

  const admin = createAdminClient()

  const now = new Date()
  const last30 = new Date(now.getTime() - 30 * 86400_000).toISOString()
  const last7 = new Date(now.getTime() - 7 * 86400_000).toISOString()
  const next7 = new Date(now.getTime() + 7 * 86400_000).toISOString()

  const [farmsRes, profilesRes, chickensCountRes, signups30Res, signups7Res] =
    await Promise.all([
      admin
        .from('farms')
        .select('*')
        .order('created_at', { ascending: false }),
      admin.from('profiles').select('id, farm_id, role, is_active'),
      admin
        .from('chickens')
        .select('farm_id, status', { count: 'exact', head: false })
        .limit(100000),
      admin
        .from('farms')
        .select('id, name, tier, created_at, trial_ends_at')
        .gte('created_at', last30)
        .order('created_at', { ascending: false }),
      admin
        .from('farms')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', last7),
    ])

  const farms = (farmsRes.data ?? []) as FarmRow[]
  const profiles = (profilesRes.data ?? []) as Array<{
    id: string
    farm_id: string
    role: string
    is_active: boolean
  }>
  const chickens = (chickensCountRes.data ?? []) as Array<{
    farm_id: string
    status: string
  }>

  // Counts by farm
  const usersByFarm = new Map<string, number>()
  for (const p of profiles) {
    if (p.is_active) usersByFarm.set(p.farm_id, (usersByFarm.get(p.farm_id) ?? 0) + 1)
  }
  const chickensByFarm = new Map<string, number>()
  for (const c of chickens) {
    if (c.status === 'dang_nuoi' || c.status === 'dang_cach_ly') {
      chickensByFarm.set(c.farm_id, (chickensByFarm.get(c.farm_id) ?? 0) + 1)
    }
  }

  // Status compute
  const withStatus = farms.map((f) => ({
    farm: f,
    ...computeFarmStatus(f),
    users: usersByFarm.get(f.id) ?? 0,
    chickens: chickensByFarm.get(f.id) ?? 0,
  }))

  // KPIs
  const totalFarms = farms.length
  const active = withStatus.filter((x) => x.status === 'active').length
  const trial = withStatus.filter(
    (x) => x.status === 'trial' || x.status === 'trial_expiring'
  ).length
  const expired = withStatus.filter((x) => x.status === 'expired').length
  const cancelled = withStatus.filter((x) => x.status === 'cancelled').length

  const mrr = withStatus.reduce((s, x) => s + x.monthlyValue, 0)
  const arr = mrr * 12

  const expiredLast30 = farms.filter((f) => {
    const exp = f.subscription_expires_at ?? f.trial_ends_at
    if (!exp) return false
    const t = new Date(exp).getTime()
    return t < now.getTime() && t > now.getTime() - 30 * 86400_000
  }).length

  const churnDenominator = Math.max(1, active + trial + expiredLast30)
  const churnRate = (expiredLast30 / churnDenominator) * 100

  const newSignups30 = signups30Res.data?.length ?? 0
  const newSignups7 = signups7Res.count ?? 0

  // Tier distribution
  const tierCounts = farms.reduce<Record<string, number>>((acc, f) => {
    acc[f.tier] = (acc[f.tier] ?? 0) + 1
    return acc
  }, {})

  // Expiring next 7 days
  const expiringSoon = withStatus
    .filter((x) => {
      const expDate = x.farm.subscription_expires_at ?? x.farm.trial_ends_at
      if (!expDate) return false
      const t = new Date(expDate).getTime()
      return t > now.getTime() && t < new Date(next7).getTime()
    })
    .sort((a, b) => {
      const ea = a.farm.subscription_expires_at ?? a.farm.trial_ends_at ?? ''
      const eb = b.farm.subscription_expires_at ?? b.farm.trial_ends_at ?? ''
      return ea.localeCompare(eb)
    })
    .slice(0, 10)

  // Top farms by chickens
  const topFarms = [...withStatus].sort((a, b) => b.chickens - a.chickens).slice(0, 5)

  // Recent signups
  const recentSignups = (signups30Res.data ?? []).slice(0, 8)

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
        <div>
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-full px-2.5 py-0.5 mb-2">
            👑 Super Admin · Owner View
          </div>
          <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
            🌐 Dashboard SaaS toàn hệ thống
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Đăng nhập với quyền chủ sở hữu phần mềm · {auth.user.email}
          </p>
        </div>
        <Link
          href="/admin/super-admin/farms"
          className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-lg px-4 py-2 text-sm font-semibold shadow hover:shadow-lg transition flex items-center gap-1.5"
        >
          📋 Tất cả {totalFarms} farms →
        </Link>
      </div>

      {/* KPI ROW 1 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        <Kpi
          label="Tổng farm"
          value={String(totalFarms)}
          icon="🏠"
          tone="from-slate-500 to-slate-600"
          sub={`${active} active · ${trial} trial`}
        />
        <Kpi
          label="MRR"
          value={formatVnd(mrr)}
          icon="💰"
          tone="from-emerald-500 to-teal-500"
          sub={`ARR ~${(arr / 1_000_000).toFixed(0)}M`}
          small
        />
        <Kpi
          label="Đang trả phí"
          value={String(active)}
          icon="✓"
          tone="from-blue-500 to-indigo-500"
          sub={`${((active / Math.max(1, totalFarms)) * 100).toFixed(0)}% conversion`}
        />
        <Kpi
          label="Trial active"
          value={String(trial)}
          icon="🔵"
          tone="from-cyan-500 to-sky-500"
          sub="Cần upsell"
        />
        <Kpi
          label="Churn 30N"
          value={`${churnRate.toFixed(1)}%`}
          icon="📉"
          tone={
            churnRate > 10
              ? 'from-rose-500 to-red-500'
              : 'from-amber-500 to-orange-500'
          }
          sub={`${expiredLast30} hết hạn`}
          pulse={churnRate > 10}
        />
        <Kpi
          label="Đăng ký 30N"
          value={String(newSignups30)}
          icon="🚀"
          tone="from-violet-500 to-purple-500"
          sub={`${newSignups7} tuần này`}
          pulse={newSignups7 > 0}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* TIER DISTRIBUTION */}
        <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-violet-500 to-fuchsia-500" />
          <div className="p-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              📊 Phân bổ theo gói
            </h2>

            {/* Stacked bar */}
            <div className="h-3 rounded-full bg-gray-100 dark:bg-gray-900/60 overflow-hidden flex mb-3">
              {(['trial', 'basic', 'pro', 'enterprise'] as const).map((tier) => {
                const c = tierCounts[tier] ?? 0
                if (!c) return null
                const pct = (c / Math.max(1, totalFarms)) * 100
                const color = TIER_COLOR[tier]
                return (
                  <div
                    key={tier}
                    className={`h-full bg-gradient-to-r ${color.bar}`}
                    style={{ width: `${pct}%` }}
                    title={`${tier}: ${c} (${pct.toFixed(0)}%)`}
                  />
                )
              })}
            </div>

            <ul className="space-y-2">
              {(['enterprise', 'pro', 'basic', 'trial'] as const).map((tier) => {
                const c = tierCounts[tier] ?? 0
                const meta = TIER_COLOR[tier]
                const pct = (c / Math.max(1, totalFarms)) * 100
                const value = c * (TIER_MONTHLY_PRICE[tier] ?? 0)
                return (
                  <li
                    key={tier}
                    className="bg-gray-50/60 dark:bg-gray-900/40 rounded-lg p-2.5"
                  >
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${meta.cls}`}
                      >
                        {TIER_LABEL[tier]}
                      </span>
                      <div className="text-right">
                        <span className="text-base font-bold tabular-nums text-gray-900 dark:text-gray-100">
                          {c} farm
                        </span>
                        <span className="text-[10.5px] text-gray-500 dark:text-gray-400 ml-1">
                          · {pct.toFixed(0)}% · {formatVnd(value)}/th
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-200/60 dark:bg-gray-700/60 overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${meta.bar}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </section>

        {/* EXPIRING SOON */}
        <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-amber-500 to-orange-500" />
          <div className="p-4">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                ⏰ Sắp hết hạn (7 ngày tới)
              </h2>
              <span className="text-[10.5px] text-gray-500 dark:text-gray-400">
                {expiringSoon.length} farm
              </span>
            </div>
            {expiringSoon.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 italic text-center py-6">
                ✓ Không có farm nào sắp hết hạn
              </p>
            ) : (
              <ul className="space-y-2">
                {expiringSoon.map((x) => {
                  const tierC = TIER_COLOR[x.farm.tier]
                  const status = STATUS_META[x.status]
                  return (
                    <li key={x.farm.id}>
                      <Link
                        href={`/admin/super-admin/farms/${x.farm.id}`}
                        className="flex items-center gap-2 bg-amber-50/60 dark:bg-amber-950/20 hover:bg-amber-100 dark:hover:bg-amber-950/40 rounded-lg p-2.5 transition border border-amber-200 dark:border-amber-900"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {x.farm.name}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-full border ${tierC.cls}`}
                            >
                              {TIER_LABEL[x.farm.tier]}
                            </span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-full border ${status.cls}`}
                            >
                              {status.emoji} {status.label}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-base font-bold text-amber-700 dark:text-amber-300 tabular-nums">
                            {x.daysRemaining}
                          </div>
                          <div className="text-[9px] text-gray-500">ngày</div>
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* RECENT SIGNUPS */}
        <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <div className="p-4">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                🚀 Đăng ký mới (30 ngày)
              </h2>
              <span className="text-[10.5px] text-gray-500 dark:text-gray-400">
                {newSignups30} farm
              </span>
            </div>
            {recentSignups.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 italic text-center py-6">
                Chưa có farm mới — chia sẻ landing page /phan-mem để có khách
              </p>
            ) : (
              <ul className="space-y-1.5">
                {recentSignups.map((s) => {
                  const tierC = TIER_COLOR[s.tier as keyof typeof TIER_COLOR]
                  return (
                    <li
                      key={s.id}
                      className="flex items-center gap-2 bg-gray-50/60 dark:bg-gray-900/40 rounded-lg p-2"
                    >
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/admin/super-admin/farms/${s.id}`}
                          className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:underline truncate block"
                        >
                          {s.name}
                        </Link>
                        <div className="text-[10.5px] text-gray-500 dark:text-gray-400">
                          {formatDateTime(s.created_at)}
                        </div>
                      </div>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full border ${tierC.cls}`}
                      >
                        {TIER_LABEL[s.tier as keyof typeof TIER_LABEL]}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </section>

        {/* TOP FARMS */}
        <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500" />
          <div className="p-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              🏆 Top farm theo quy mô đàn
            </h2>
            {topFarms.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 italic text-center py-6">
                Chưa có farm nào
              </p>
            ) : (
              <ul className="space-y-1.5">
                {topFarms.map((x, i) => {
                  const tierC = TIER_COLOR[x.farm.tier]
                  return (
                    <li
                      key={x.farm.id}
                      className="flex items-center gap-2 bg-gray-50/60 dark:bg-gray-900/40 rounded-lg p-2"
                    >
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white text-xs font-bold flex items-center justify-center shadow">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/admin/super-admin/farms/${x.farm.id}`}
                          className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:underline truncate block"
                        >
                          {x.farm.name}
                        </Link>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full border ${tierC.cls}`}
                          >
                            {TIER_LABEL[x.farm.tier]}
                          </span>
                          <span className="text-[10.5px] text-gray-500 dark:text-gray-400">
                            👤 {x.users}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-bold text-blue-700 dark:text-blue-300 tabular-nums">
                          {x.chickens}
                        </div>
                        <div className="text-[9px] text-gray-500">🐓 con</div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </section>
      </div>

      {/* STATUS BREAKDOWN */}
      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-slate-400 to-gray-500" />
        <div className="p-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
            📌 Trạng thái subscription
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatusCard
              label="Active"
              value={active}
              total={totalFarms}
              tone="emerald"
              emoji="🟢"
            />
            <StatusCard label="Trial" value={trial} total={totalFarms} tone="blue" emoji="🔵" />
            <StatusCard
              label="Expired"
              value={expired}
              total={totalFarms}
              tone="rose"
              emoji="❌"
            />
            <StatusCard
              label="Cancelled"
              value={cancelled}
              total={totalFarms}
              tone="gray"
              emoji="⚫"
            />
            <StatusCard
              label="MRR"
              value={mrr}
              isMoney
              tone="violet"
              emoji="💰"
            />
          </div>
        </div>
      </section>
    </div>
  )
}

function AccessDenied({ reason }: { reason: string }) {
  return (
    <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl p-8 text-center max-w-lg mx-auto mt-10">
      <div className="text-5xl mb-3">🚫</div>
      <h1 className="text-lg font-bold text-rose-900 dark:text-rose-200 mb-1">
        Không có quyền truy cập
      </h1>
      <p className="text-sm text-rose-800 dark:text-rose-300">
        {reason === 'unauthenticated'
          ? 'Vui lòng đăng nhập trước.'
          : 'Trang này chỉ dành cho chủ sở hữu phần mềm. Email của bạn không nằm trong allowlist SUPER_ADMIN_EMAILS.'}
      </p>
    </div>
  )
}

function Kpi({
  label,
  value,
  icon,
  tone,
  pulse,
  sub,
  small,
}: {
  label: string
  value: string
  icon: string
  tone: string
  pulse?: boolean
  sub?: string
  small?: boolean
}) {
  return (
    <div className="relative overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3.5">
      <div
        className={`absolute -right-6 -top-6 w-20 h-20 rounded-full bg-gradient-to-br ${tone} opacity-15 blur-xl ${
          pulse ? 'animate-pulse' : ''
        }`}
      />
      <div className="relative">
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <span>{icon}</span>
          <span className="truncate">{label}</span>
        </div>
        <div
          className={
            'mt-1 font-bold tabular-nums text-gray-900 dark:text-gray-100 ' +
            (small ? 'text-base' : 'text-2xl')
          }
        >
          {value}
        </div>
        {sub && (
          <div className="text-[10.5px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
            {sub}
          </div>
        )}
      </div>
    </div>
  )
}

function StatusCard({
  label,
  value,
  total,
  tone,
  emoji,
  isMoney,
}: {
  label: string
  value: number
  total?: number
  tone: 'emerald' | 'blue' | 'rose' | 'gray' | 'violet'
  emoji: string
  isMoney?: boolean
}) {
  const cls = {
    emerald: 'from-emerald-500 to-teal-500',
    blue: 'from-blue-500 to-indigo-500',
    rose: 'from-rose-500 to-red-500',
    gray: 'from-slate-500 to-gray-500',
    violet: 'from-violet-500 to-purple-500',
  }[tone]
  const pct = total ? (value / total) * 100 : 0
  return (
    <div className="bg-gray-50/60 dark:bg-gray-900/40 rounded-lg p-3 text-center">
      <div className="text-2xl mb-1">{emoji}</div>
      <div
        className={'text-xl font-bold tabular-nums bg-gradient-to-br ' + cls + ' bg-clip-text text-transparent'}
      >
        {isMoney ? formatVnd(value) : value}
      </div>
      <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
        {label}
        {total !== undefined && total > 0 && !isMoney && ` · ${pct.toFixed(0)}%`}
      </div>
    </div>
  )
}
