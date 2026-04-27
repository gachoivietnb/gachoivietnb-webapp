import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserPermissions } from '@/lib/rbac/guard'
import { ThiDauTabs } from '@/components/admin/thi-dau/ThiDauTabs'
import { MatchDetailClient } from '@/components/admin/thi-dau/MatchDetailClient'

export const revalidate = 0

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const ctx = await getCurrentUserPermissions()
  if (!ctx) redirect('/auth/login')
  if (!ctx.can('thi_dau', 'read')) {
    return <div className="text-sm text-gray-500">Không có quyền truy cập.</div>
  }

  const supabase = await createClient()
  const matchRes = await supabase.from('matches').select('*').eq('id', id).single() as {
    data: Record<string, unknown> | null
  }

  if (!matchRes.data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Không tìm thấy trận đấu.</p>
        <Link href="/admin/thi-dau" className="text-blue-600 hover:underline">← Về danh sách</Link>
      </div>
    )
  }

  const m = matchRes.data as { chicken_id: string; tournament_id: string | null }

  // Fetch chicken + tournament + rounds separately
  const [chickenRes, tournamentRes, roundsRes] = await Promise.all([
    supabase
      .from('chickens')
      .select('id, chicken_code, name, image_url, breed_id, breeds(name_vi)')
      .eq('id', m.chicken_id)
      .single(),
    m.tournament_id
      ? supabase
          .from('tournaments')
          .select('id, name, type, venue, location')
          .eq('id', m.tournament_id)
          .single()
      : Promise.resolve({ data: null }),
    supabase.from('match_rounds').select('*').eq('match_id', id).order('round_number'),
  ])

  const matchWithJoins = {
    ...matchRes.data,
    chicken: chickenRes.data ?? null,
    tournament: tournamentRes.data ?? null,
  }

  return (
    <div>
      <ThiDauTabs />
      <MatchDetailClient
        match={matchWithJoins as never}
        rounds={(roundsRes.data ?? []) as never}
        canWrite={ctx.can('thi_dau', 'write')}
        canDelete={ctx.can('thi_dau', 'delete')}
      />
    </div>
  )
}
