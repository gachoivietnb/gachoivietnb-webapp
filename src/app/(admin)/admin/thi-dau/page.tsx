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
  const [matchesRes, kpiRes, tournamentsRes] = await Promise.all([
    supabase
      .from('matches')
      .select(
        'id, match_code, match_date, match_time, chicken_id, tournament_id, opponent_name, opponent_breed, opponent_owner, opponent_origin, opponent_weight_kg, opponent_photo_url, self_weight_kg, rules, spurs_type, rounds_planned, rounds_actual, total_duration_minutes, result, result_method, result_round, prize_money, photo_urls, video_url, match_quality, is_pinned, is_public, created_at'
      )
      .order('match_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(500),
    supabase.rpc('farm_combat_kpis'),
    supabase.from('tournaments').select('id, name, type').order('start_date', { ascending: false }).limit(50),
  ])

  type MatchRow = {
    id: string
    chicken_id: string
    tournament_id: string | null
    [key: string]: unknown
  }

  const rawMatches = (matchesRes.data ?? []) as unknown as MatchRow[]

  // Fetch chickens + tournaments lookup separately (avoid PostgREST embed issues)
  const chickenIds = Array.from(new Set(rawMatches.map((m) => m.chicken_id).filter(Boolean)))
  const tournamentIds = Array.from(new Set(rawMatches.map((m) => m.tournament_id).filter(Boolean) as string[]))

  const [chickensRes, tournamentsLookupRes] = await Promise.all([
    chickenIds.length > 0
      ? supabase
          .from('chickens')
          .select('id, chicken_code, name, image_url, breed_id, breeds(name_vi)')
          .in('id', chickenIds)
      : Promise.resolve({ data: [] }),
    tournamentIds.length > 0
      ? supabase.from('tournaments').select('id, name, type').in('id', tournamentIds)
      : Promise.resolve({ data: [] }),
  ])

  type ChickenRow = {
    id: string
    chicken_code: string
    name: string | null
    image_url: string | null
    breed_id: string | null
    breeds: { name_vi: string } | { name_vi: string }[] | null
  }
  type TournamentRow = { id: string; name: string; type: string }

  const chickenMap = new Map<string, ChickenRow>(
    ((chickensRes.data as unknown as ChickenRow[]) ?? []).map((c) => [c.id, c])
  )
  const tournamentMap = new Map<string, TournamentRow>(
    ((tournamentsLookupRes.data as unknown as TournamentRow[]) ?? []).map((t) => [t.id, t])
  )

  const matches = rawMatches.map((m) => ({
    ...m,
    chicken: chickenMap.get(m.chicken_id) ?? null,
    tournament: m.tournament_id ? tournamentMap.get(m.tournament_id) ?? null : null,
  }))

  return (
    <MatchesClient
      matches={matches as never}
      kpis={(kpiRes.data ?? {}) as never}
      tournaments={(tournamentsRes.data ?? []) as never}
      canWrite={ctx.can('thi_dau', 'write')}
      canDelete={ctx.can('thi_dau', 'delete')}
    />
  )
}
