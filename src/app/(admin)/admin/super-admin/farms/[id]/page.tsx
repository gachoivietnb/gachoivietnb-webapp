import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { notFound } from 'next/navigation'
import {
  requireSuperAdmin,
  createAdminClient,
  computeFarmStatus,
  STATUS_META,
  TIER_LABEL,
  TIER_COLOR,
  TIER_MONTHLY_PRICE,
  type FarmRow,
} from '@/lib/multitenancy/super-admin'
import { formatVnd, formatDate, formatDateTime } from '@/lib/utils/format'
import { FarmActionsClient } from '@/components/admin/super-admin/FarmActionsClient'

export const revalidate = 0

export default async function FarmDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const auth = await requireSuperAdmin()
  if (!auth.ok) {
    return (
      <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl p-8 text-center max-w-lg mx-auto mt-10">
        <div className="text-5xl mb-3">🚫</div>
        <p className="text-rose-800 dark:text-rose-300">Không có quyền truy cập.</p>
      </div>
    )
  }

  const { id } = await params
  const admin = createAdminClient()

  const farmRes = await admin.from('farms').select('*').eq('id', id).maybeSingle()
  if (!farmRes.data) notFound()
  const farm = farmRes.data as FarmRow

  const [profilesRes, chickensRes, salesRes, expensesRes, ownerRes] =
    await Promise.all([
      admin
        .from('profiles')
        .select('id, full_name, role, is_active, created_at')
        .eq('farm_id', id),
      admin.from('chickens').select('status').eq('farm_id', id),
      admin
        .from('sales_orders')
        .select('total_amount, paid_amount, status, order_date')
        .eq('farm_id', id),
      admin.from('expenses').select('amount, expense_date').eq('farm_id', id),
      farm.owner_id
        ? admin.from('profiles').select('id, full_name').eq('id', farm.owner_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ])

  const profiles = (profilesRes.data ?? []) as Array<{
    id: string
    full_name: string
    role: string
    is_active: boolean
    created_at: string
  }>
  const chickens = (chickensRes.data ?? []) as Array<{ status: string }>
  const sales = (salesRes.data ?? []) as Array<{
    total_amount: number
    paid_amount: number
    status: string
    order_date: string
  }>
  const expenses = (expensesRes.data ?? []) as Array<{
    amount: number
    expense_date: string
  }>
  const owner = (ownerRes.data ?? null) as { id: string; full_name: string } | null

  const status = computeFarmStatus(farm)
  const tierMeta = TIER_COLOR[farm.tier]
  const statusMeta = STATUS_META[status.status]

  // Usage stats
  const aliveChickens = chickens.filter(
    (c) => c.status === 'dang_nuoi' || c.status === 'dang_cach_ly'
  ).length
  const soldChickens = chickens.filter((c) => c.status === 'da_ban').length
  const deadChickens = chickens.filter((c) => c.status === 'chet').length

  const last30 = Date.now() - 30 * 86400_000
  const sales30 = sales.filter(
    (s) => new Date(s.order_date).getTime() > last30
  )
  const revenue30 = sales30.reduce((s, x) => s + Number(x.total_amount), 0)
  const expenses30 = expenses
    .filter((e) => new Date(e.expense_date).getTime() > last30)
    .reduce((s, x) => s + Number(x.amount), 0)

  const usagePct = (aliveChickens / Math.max(1, farm.max_chickens)) * 100

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
        <div>
          <Link
            href="/admin/super-admin/farms"
            className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
          </Link>
          <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2 flex-wrap">
            🏠 {farm.name}
            <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${tierMeta.cls}`}>
              {TIER_LABEL[farm.tier]}
            </span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${statusMeta.cls}`}>
              {statusMeta.emoji} {statusMeta.label}
            </span>
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-mono">/{farm.slug}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
        <div className="space-y-4">
          {/* Farm info */}
          <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className={`h-1.5 bg-gradient-to-r ${tierMeta.bar}`} />
            <div className="p-4 space-y-2">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                📋 Thông tin trại
              </h2>
              <Kv k="Tên đầy đủ" v={farm.name} />
              <Kv k="Slug" v={`/${farm.slug}`} mono />
              <Kv k="ID" v={farm.id} mono small />
              <Kv k="Chủ trại" v={owner?.full_name ?? '—'} />
              <Kv k="Điện thoại" v={farm.phone ?? '—'} />
              <Kv k="Địa chỉ" v={farm.address ?? '—'} />
              <Kv k="Tạo lúc" v={formatDateTime(farm.created_at)} />
            </div>
          </section>

          {/* Usage */}
          <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500" />
            <div className="p-4 space-y-3">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                📊 Sử dụng
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Stat label="Đàn hiện tại" value={String(aliveChickens)} icon="🐓" tone="from-blue-500 to-indigo-500" />
                <Stat label="Đã bán" value={String(soldChickens)} icon="💵" tone="from-emerald-500 to-teal-500" />
                <Stat label="Đã chết" value={String(deadChickens)} icon="✗" tone="from-rose-500 to-red-500" />
                <Stat
                  label="Người dùng"
                  value={`${profiles.filter((p) => p.is_active).length}/${farm.max_users}`}
                  icon="👤"
                  tone="from-violet-500 to-purple-500"
                />
              </div>

              <div>
                <div className="flex items-baseline justify-between text-[11px] mb-1">
                  <span className="text-gray-500 dark:text-gray-400">
                    Đàn / Limit {TIER_LABEL[farm.tier]}
                  </span>
                  <span className="tabular-nums font-semibold">
                    {aliveChickens} / {farm.max_chickens} ·{' '}
                    <strong
                      className={
                        usagePct > 90
                          ? 'text-rose-700 dark:text-rose-300'
                          : usagePct > 70
                            ? 'text-amber-700 dark:text-amber-300'
                            : 'text-emerald-700 dark:text-emerald-300'
                      }
                    >
                      {usagePct.toFixed(0)}%
                    </strong>
                  </span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-900/60 overflow-hidden">
                  <div
                    className={
                      'h-full bg-gradient-to-r ' +
                      (usagePct > 90
                        ? 'from-rose-400 to-red-500'
                        : usagePct > 70
                          ? 'from-amber-400 to-orange-500'
                          : 'from-emerald-400 to-teal-500')
                    }
                    style={{ width: `${Math.min(100, usagePct)}%` }}
                  />
                </div>
                {usagePct > 90 && (
                  <p className="text-[10.5px] text-rose-700 dark:text-rose-300 mt-1.5">
                    ⚠️ Sắp hết quota — gợi ý upsell lên gói cao hơn
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Financials 30N */}
          <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <div className="p-4 space-y-2">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                💰 Hoạt động 30 ngày
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Kpi label="Doanh thu 30N" value={formatVnd(revenue30)} tone="text-blue-700 dark:text-blue-300" />
                <Kpi label="Chi phí 30N" value={formatVnd(expenses30)} tone="text-rose-700 dark:text-rose-300" />
                <Kpi
                  label="Lãi tạm 30N"
                  value={formatVnd(revenue30 - expenses30)}
                  tone={
                    revenue30 - expenses30 >= 0
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : 'text-rose-700 dark:text-rose-300'
                  }
                />
              </div>
              <p className="text-[10.5px] text-gray-500 dark:text-gray-400 mt-1">
                Số liệu tham khảo từ DB của farm — phục vụ đánh giá hoạt động trại đó.
              </p>
            </div>
          </section>

          {/* Users list */}
          <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-violet-500 to-purple-500" />
            <div className="p-4">
              <div className="flex items-baseline justify-between mb-2">
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  👥 Nhân sự ({profiles.length})
                </h2>
                <span className="text-[10.5px] text-gray-500 dark:text-gray-400">
                  {profiles.filter((p) => p.is_active).length} hoạt động
                </span>
              </div>
              {profiles.length === 0 ? (
                <p className="text-xs text-gray-500 dark:text-gray-400 italic text-center py-4">
                  Chưa có user nào
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {profiles.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center gap-2 bg-gray-50/60 dark:bg-gray-900/40 rounded-lg p-2"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {p.full_name}
                          {!p.is_active && (
                            <span className="ml-1 text-[10px] text-rose-600 dark:text-rose-400">
                              (khoá)
                            </span>
                          )}
                        </div>
                        <div className="text-[10.5px] text-gray-500 dark:text-gray-400">
                          {formatDate(p.created_at)}
                        </div>
                      </div>
                      <span
                        className={
                          'text-[10px] px-2 py-0.5 rounded-full ' +
                          (p.role === 'chu_trai'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300')
                        }
                      >
                        {p.role === 'chu_trai' ? '👑 Chủ trại' : '👷 Nhân viên'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          {/* Subscription card */}
          <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className={`h-1.5 bg-gradient-to-r ${tierMeta.bar}`} />
            <div className="p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                💎 Subscription
              </h3>
              <div className="space-y-1.5 text-xs">
                <Kv k="Gói hiện tại" v={TIER_LABEL[farm.tier]} />
                <Kv k="Trạng thái" v={`${statusMeta.emoji} ${statusMeta.label}`} />
                <Kv
                  k="MRR đóng góp"
                  v={formatVnd(status.monthlyValue)}
                  tone={
                    status.monthlyValue > 0
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : 'text-gray-500'
                  }
                />
                {farm.trial_ends_at && (
                  <Kv k="Trial hết hạn" v={formatDate(farm.trial_ends_at)} />
                )}
                {farm.subscription_expires_at && (
                  <Kv k="Sub hết hạn" v={formatDate(farm.subscription_expires_at)} />
                )}
                {status.daysRemaining !== null && (
                  <div className="text-center bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-2 mt-1">
                    <div className="text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-300 font-semibold">
                      Còn lại
                    </div>
                    <div className="text-2xl font-bold tabular-nums text-amber-700 dark:text-amber-300">
                      {Math.max(0, status.daysRemaining)} ngày
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Manual actions */}
          <FarmActionsClient
            farmId={farm.id}
            currentTier={farm.tier}
            currentTrialEnd={farm.trial_ends_at}
            currentExpiresAt={farm.subscription_expires_at}
            currentActive={farm.subscription_active}
          />
        </aside>
      </div>
    </div>
  )
}

function Kv({
  k,
  v,
  mono,
  small,
  tone,
}: {
  k: string
  v: string
  mono?: boolean
  small?: boolean
  tone?: string
}) {
  return (
    <div className="flex items-baseline justify-between gap-2 bg-gray-50/60 dark:bg-gray-900/40 rounded px-2 py-1">
      <span className="text-gray-500 dark:text-gray-400 text-[11px] whitespace-nowrap">{k}</span>
      <span
        className={
          'font-medium truncate text-right ' +
          (tone ?? 'text-gray-700 dark:text-gray-300') +
          ' ' +
          (mono ? 'font-mono ' : '') +
          (small ? 'text-[10.5px]' : 'text-xs')
        }
      >
        {v}
      </span>
    </div>
  )
}

function Stat({
  label,
  value,
  icon,
  tone,
}: {
  label: string
  value: string
  icon: string
  tone: string
}) {
  return (
    <div className="relative overflow-hidden bg-gray-50/60 dark:bg-gray-900/40 rounded-lg p-2.5">
      <div
        className={`absolute -right-4 -top-4 w-12 h-12 rounded-full bg-gradient-to-br ${tone} opacity-15 blur-xl`}
      />
      <div className="relative">
        <div className="flex items-center gap-1 text-[10.5px] text-gray-500 dark:text-gray-400">
          <span>{icon}</span>
          <span className="truncate">{label}</span>
        </div>
        <div className="mt-0.5 text-lg font-bold tabular-nums text-gray-900 dark:text-gray-100">
          {value}
        </div>
      </div>
    </div>
  )
}

function Kpi({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="bg-gray-50/60 dark:bg-gray-900/40 rounded-lg p-3">
      <div className="text-[11px] text-gray-500 dark:text-gray-400 mb-0.5">{label}</div>
      <div className={'text-base font-bold tabular-nums ' + tone}>{value}</div>
    </div>
  )
}
