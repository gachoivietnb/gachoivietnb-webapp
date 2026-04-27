import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserPermissions } from '@/lib/rbac/guard'
import { ThiDauTabs } from '@/components/admin/thi-dau/ThiDauTabs'
import { CombatStatsClient } from '@/components/admin/thi-dau/CombatStatsClient'

export const revalidate = 0

export default async function ThongKePage() {
  const ctx = await getCurrentUserPermissions()
  if (!ctx) redirect('/auth/login')
  if (!ctx.can('thi_dau', 'read')) {
    return <div className="text-sm text-gray-500">Không có quyền.</div>
  }

  const supabase = await createClient()
  const [matchesRes, kpiRes] = (await Promise.all([
    supabase
      .from('matches')
      .select('id, match_date, result, rules, total_duration_minutes, prize_money, opponent_name, opponent_owner, opponent_origin, chicken:chickens(chicken_code, name)')
      .order('match_date', { ascending: false })
      .limit(2000),
    supabase.rpc('farm_combat_kpis'),
  ])) as [
    { data: Array<Record<string, unknown>> | null },
    { data: Record<string, unknown> | null }
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">📊 Thống kê thi đấu</h1>
      <p className="text-sm text-gray-500 mb-2">Heatmap calendar · Bảng đối thủ · Rivalry tracker</p>
      <ThiDauTabs />

      <CombatStatsClient
        matches={(matchesRes.data ?? []) as never}
        kpis={(kpiRes.data ?? {}) as never}
      />
    </div>
  )
}
