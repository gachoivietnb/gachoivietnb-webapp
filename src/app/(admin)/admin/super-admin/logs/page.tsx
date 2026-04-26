import { requireSuperAdmin, createAdminClient } from '@/lib/multitenancy/super-admin'
import { LogsClient } from '@/components/admin/super-admin/LogsClient'

export const revalidate = 0

type LogRow = {
  id: string
  level: string
  category: string
  message: string
  context: Record<string, unknown>
  user_email: string | null
  ip_address: string | null
  user_agent: string | null
  path: string | null
  http_status: number | null
  resolved_at: string | null
  created_at: string
}

export default async function LogsPage() {
  const auth = await requireSuperAdmin()
  if (!auth.ok) {
    return (
      <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl p-8 text-center max-w-lg mx-auto mt-10">
        <div className="text-5xl mb-3">🚫</div>
        <h1 className="text-lg font-bold text-rose-900 dark:text-rose-200 mb-1">Không có quyền</h1>
      </div>
    )
  }

  const admin = createAdminClient()

  // Stats: counts by level (unresolved, last 30 days)
  const cutoff30 = new Date(Date.now() - 30 * 86400000).toISOString()
  const cutoff24h = new Date(Date.now() - 24 * 3600000).toISOString()

  const [levelCountsRes, recent24hRes, totalUnresolvedRes, recentRes] = await Promise.all([
    admin
      .from('system_logs')
      .select('level', { count: 'exact' })
      .gte('created_at', cutoff30)
      .is('resolved_at', null),
    admin
      .from('system_logs')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', cutoff24h),
    admin
      .from('system_logs')
      .select('id', { count: 'exact', head: true })
      .is('resolved_at', null),
    admin
      .from('system_logs')
      .select('*')
      .is('resolved_at', null)
      .gte('created_at', cutoff30)
      .order('created_at', { ascending: false })
      .limit(200),
  ])

  const levelCountsRows = (levelCountsRes.data ?? []) as Array<{ level: string }>
  const stats: Record<string, number> = {}
  for (const r of levelCountsRows) {
    stats[r.level] = (stats[r.level] ?? 0) + 1
  }
  const totalUnresolved = totalUnresolvedRes.count ?? 0
  const recent24h = recent24hRes.count ?? 0
  const recent = (recentRes.data ?? []) as LogRow[]

  return (
    <div>
      <div className="mb-5">
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-full px-2.5 py-0.5 mb-2">
          👑 Super Admin
        </div>
        <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
          🩺 Nhật ký lỗi hệ thống
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Auth fail · API error · Security event · DDoS · Push fail · DB error · ... — review hằng ngày
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-4">
        <Stat label="24h qua" value={recent24h} icon="⏱" tone="from-blue-500 to-indigo-500" />
        <Stat label="Chưa xử lý" value={totalUnresolved} icon="📌" tone="from-amber-500 to-orange-500" pulse={totalUnresolved > 0} />
        <Stat label="Critical" value={stats.critical ?? 0} icon="🚨" tone="from-rose-600 to-red-600" pulse={(stats.critical ?? 0) > 0} />
        <Stat label="Error" value={stats.error ?? 0} icon="❌" tone="from-rose-500 to-pink-500" />
        <Stat label="Warn" value={stats.warn ?? 0} icon="⚠️" tone="from-amber-500 to-yellow-500" />
        <Stat label="Info" value={stats.info ?? 0} icon="ℹ️" tone="from-slate-400 to-gray-500" />
      </div>

      <LogsClient initialLogs={recent} />
    </div>
  )
}

function Stat({
  label,
  value,
  icon,
  tone,
  pulse,
}: {
  label: string
  value: number
  icon: string
  tone: string
  pulse?: boolean
}) {
  return (
    <div className="relative overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3">
      <div
        className={`absolute -right-4 -top-4 w-16 h-16 rounded-full bg-gradient-to-br ${tone} opacity-15 blur-xl ${
          pulse ? 'animate-pulse' : ''
        }`}
      />
      <div className="relative">
        <div className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
          <span>{icon}</span>
          <span className="truncate">{label}</span>
        </div>
        <div className="mt-0.5 text-xl font-bold tabular-nums text-gray-900 dark:text-gray-100">
          {value}
        </div>
      </div>
    </div>
  )
}
