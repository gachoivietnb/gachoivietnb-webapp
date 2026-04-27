import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserPermissions } from '@/lib/rbac/guard'
import { VaccinationTabs } from '@/components/admin/vaccinations/VaccinationTabs'
import { HistoryClient } from '@/components/admin/vaccinations/HistoryClient'

export const revalidate = 0

export default async function LichSuPage() {
  const ctx = await getCurrentUserPermissions()
  if (!ctx) redirect('/auth/login')
  if (!ctx.can('tiem_phong', 'read')) {
    return <div className="text-sm text-gray-500">Không có quyền.</div>
  }
  const supabase = await createClient()
  const [vacRes, vaccinesRes, profilesRes] = await Promise.all([
    supabase
      .from('vaccinations')
      .select('id, chicken_id, vaccine_id, scheduled_date, actual_date, status, result, vaccine_lot_number, side_effects, performed_by, cost')
      .order('actual_date', { ascending: false, nullsFirst: false })
      .limit(2000),
    supabase.from('vaccines').select('id, code, name_vi, target_disease, emoji, color_hex'),
    supabase.from('profiles').select('id, full_name'),
  ])

  // Fetch chicken codes
  const recs = (vacRes.data ?? []) as Array<{ chicken_id: string; vaccine_id: string; performed_by: string | null; [k: string]: unknown }>
  const chickenIds = Array.from(new Set(recs.map((r) => r.chicken_id)))
  const { data: chickensData } = chickenIds.length > 0
    ? await supabase.from('chickens').select('id, chicken_code, name').in('id', chickenIds)
    : { data: [] }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">📊 Lịch sử tiêm phòng</h1>
      <p className="text-sm text-gray-500 mb-2">Toàn bộ bản ghi tiêm — filter theo gà / vaccine / kết quả / thời gian</p>
      <VaccinationTabs />
      <HistoryClient
        records={recs as never}
        vaccines={(vaccinesRes.data ?? []) as never}
        chickens={((chickensData ?? []) as never)}
        profiles={(profilesRes.data ?? []) as never}
      />
    </div>
  )
}
