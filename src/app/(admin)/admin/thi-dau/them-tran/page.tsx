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

  const [chickensRes, tournamentsRes, editingRes] = (await Promise.all([
    supabase
      .from('chickens')
      .select('id, chicken_code, name, image_url, status, breed_id, breeds(name_vi)')
      .in('status', ['dang_nuoi', 'dang_cach_ly', 'da_ban'])
      .order('chicken_code')
      .limit(1000),
    supabase
      .from('tournaments')
      .select('id, name, type, start_date, status')
      .order('start_date', { ascending: false, nullsFirst: false })
      .limit(100),
    params.match
      ? supabase.from('matches').select('*').eq('id', params.match).single()
      : Promise.resolve({ data: null }),
  ])) as [
    { data: Array<Record<string, unknown>> | null },
    { data: Array<Record<string, unknown>> | null },
    { data: Record<string, unknown> | null }
  ]

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
        chickens={(chickensRes.data ?? []) as never}
        tournaments={(tournamentsRes.data ?? []) as never}
        editing={(editingRes.data ?? null) as never}
        defaultChickenId={params.chicken}
      />
    </div>
  )
}
