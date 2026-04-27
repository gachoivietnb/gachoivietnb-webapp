import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserPermissions } from '@/lib/rbac/guard'
import { ThiDauTabs } from '@/components/admin/thi-dau/ThiDauTabs'
import { MatchFormClient } from '@/components/admin/thi-dau/MatchFormClient'

export const revalidate = 0

export default async function NewMatchPage({
  searchParams,
}: {
  searchParams: Promise<{ chicken?: string; match?: string }>
}) {
  const ctx = await getCurrentUserPermissions()
  if (!ctx) redirect('/auth/login')
  if (!ctx.can('thi_dau', 'write')) {
    return <div className="text-sm text-gray-500">Bạn không có quyền tạo trận đấu.</div>
  }

  const params = await searchParams
  const supabase = await createClient()

  const [chickensRes, tournamentsRes, editingRes, statsRes, recentRes] = (await Promise.all([
    supabase
      .from('chickens')
      .select('id, chicken_code, name, image_url, status, gender, birth_date, weight_kg, breed_id, breeds(name_vi), area:areas(code, name_vi), combat_tier_manual')
      .in('status', ['dang_nuoi', 'dang_cach_ly', 'da_ban'])
      .order('chicken_code')
      .limit(2000),
    supabase
      .from('tournaments')
      .select('id, name, type, start_date, status')
      .order('start_date', { ascending: false, nullsFirst: false })
      .limit(100),
    params.match
      ? supabase.from('matches').select('*').eq('id', params.match).single()
      : Promise.resolve({ data: null }),
    supabase
      .from('chicken_combat_stats')
      .select('chicken_id, combat_tier, stars, total_matches, wins, current_win_streak'),
    supabase
      .from('matches')
      .select('chicken_id, match_date')
      .order('match_date', { ascending: false })
      .limit(20),
  ])) as [
    { data: Array<Record<string, unknown>> | null },
    { data: Array<Record<string, unknown>> | null },
    { data: Record<string, unknown> | null },
    { data: Array<Record<string, unknown>> | null },
    { data: Array<{ chicken_id: string; match_date: string }> | null }
  ]

  // Build stats map
  const statsMap: Record<string, { combat_tier: string; stars: number; total_matches: number; wins: number; current_win_streak: number }> = {}
  for (const s of (statsRes.data ?? []) as Array<{ chicken_id: string; combat_tier: string; stars: number; total_matches: number; wins: number; current_win_streak: number }>) {
    statsMap[s.chicken_id] = s
  }

  // Recently used (5 chicken IDs distinct, mới nhất)
  const recentIds: string[] = []
  for (const r of (recentRes.data ?? [])) {
    if (!recentIds.includes(r.chicken_id)) recentIds.push(r.chicken_id)
    if (recentIds.length >= 5) break
  }

  // Inject stats vào chickens
  const enriched = ((chickensRes.data ?? []) as Array<Record<string, unknown>>).map((c) => ({
    ...c,
    stats: statsMap[c.id as string] ?? null,
  }))

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-2">
        ⚔️ {params.match ? 'Sửa trận' : 'Ghi nhận trận đấu mới'}
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
        Wizard 4 bước · Lưu được nháp giữa chừng · Auto cập nhật cấp độ chiến đấu của gà.
      </p>

      <ThiDauTabs />

      <MatchFormClient
        chickens={enriched as never}
        tournaments={(tournamentsRes.data ?? []) as never}
        editing={(editingRes.data ?? null) as never}
        defaultChickenId={params.chicken}
        recentChickenIds={recentIds}
      />
    </div>
  )
}
