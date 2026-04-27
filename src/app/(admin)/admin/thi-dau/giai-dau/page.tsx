import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserPermissions } from '@/lib/rbac/guard'
import { ThiDauTabs } from '@/components/admin/thi-dau/ThiDauTabs'
import { TournamentsClient } from '@/components/admin/thi-dau/TournamentsClient'

export const revalidate = 0

export default async function GiaiDauPage() {
  const ctx = await getCurrentUserPermissions()
  if (!ctx) redirect('/auth/login')
  if (!ctx.can('giai_dau', 'read')) {
    return <div className="text-sm text-gray-500">Không có quyền.</div>
  }

  const supabase = await createClient()
  const { data } = await supabase
    .from('tournaments')
    .select('*, matches:matches(count)')
    .order('start_date', { ascending: false, nullsFirst: false })
    .limit(200)

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">🏟 Quản lý giải đấu</h1>
      <p className="text-sm text-gray-500 mb-2">5 cấp độ: Vần trại → Hội xóm → Giải tỉnh → Khu vực → Quốc gia/QT</p>
      <ThiDauTabs />
      <TournamentsClient
        initial={(data ?? []) as never}
        canWrite={ctx.can('giai_dau', 'write')}
        canDelete={ctx.can('giai_dau', 'delete')}
      />
    </div>
  )
}
