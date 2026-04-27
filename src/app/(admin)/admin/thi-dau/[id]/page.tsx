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
  const [matchRes, roundsRes] = (await Promise.all([
    supabase
      .from('matches')
      .select('*, chicken:chickens(id, chicken_code, name, image_url, breed_id, breeds(name_vi)), tournament:tournaments(id, name, type, venue, location)')
      .eq('id', id)
      .single(),
    supabase
      .from('match_rounds')
      .select('*')
      .eq('match_id', id)
      .order('round_number'),
  ])) as [
    { data: Record<string, unknown> | null },
    { data: Array<Record<string, unknown>> | null }
  ]

  if (!matchRes.data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Không tìm thấy trận đấu.</p>
        <Link href="/admin/thi-dau" className="text-blue-600 hover:underline">← Về danh sách</Link>
      </div>
    )
  }

  return (
    <div>
      <ThiDauTabs />
      <MatchDetailClient
        match={matchRes.data as never}
        rounds={(roundsRes.data ?? []) as never}
        canWrite={ctx.can('thi_dau', 'write')}
        canDelete={ctx.can('thi_dau', 'delete')}
      />
    </div>
  )
}
