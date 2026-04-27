import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserPermissions } from '@/lib/rbac/guard'
import { MatchesClient } from '@/components/admin/thi-dau/MatchesClient'

export const revalidate = 0

export default async function ThiDauPage() {
  const ctx = await getCurrentUserPermissions()
  if (!ctx) redirect('/auth/login')
  if (!ctx.can('thi_dau', 'read')) {
    return <div className="text-sm text-gray-500">Bạn chưa có quyền truy cập module Thi đấu.</div>
  }

  const supabase = await createClient()
  const [matchesRes, kpiRes, tournamentsRes] = (await Promise.all([
    supabase
      .from('matches')
      .select(
        'id, match_code, match_date, match_time, chicken_id, opponent_name, opponent_breed, opponent_owner, opponent_origin, opponent_weight_kg, opponent_photo_url, self_weight_kg, rules, spurs_type, rounds_planned, rounds_actual, total_duration_minutes, result, result_method, result_round, prize_money, photo_urls, video_url, match_quality, is_pinned, is_public, created_at, chicken:chickens(id, chicken_code, name, image_url, breeds(name_vi)), tournament:tournaments(id, name, type)'
      )
      .order('match_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(500),
    supabase.rpc('farm_combat_kpis'),
    supabase.from('tournaments').select('id, name, type').order('start_date', { ascending: false }).limit(50),
  ])) as [
    { data: Array<Record<string, unknown>> | null },
    { data: Record<string, unknown> | null },
    { data: Array<Record<string, unknown>> | null }
  ]

  return (
    <MatchesClient
      matches={(matchesRes.data ?? []) as never}
      kpis={(kpiRes.data ?? {}) as never}
      tournaments={(tournamentsRes.data ?? []) as never}
      canWrite={ctx.can('thi_dau', 'write')}
      canDelete={ctx.can('thi_dau', 'delete')}
    />
  )
}
