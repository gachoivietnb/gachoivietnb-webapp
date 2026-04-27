import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserPermissions } from '@/lib/rbac/guard'
import { VaccinationTabs } from '@/components/admin/vaccinations/VaccinationTabs'
import { RecordVaccinationForm } from '@/components/admin/vaccinations/RecordVaccinationForm'

export const revalidate = 0

export default async function GhiNhanPage({ searchParams }: { searchParams: Promise<{ chicken?: string; vaccination?: string }> }) {
  const ctx = await getCurrentUserPermissions()
  if (!ctx) redirect('/auth/login')
  if (!ctx.can('tiem_phong', 'write')) {
    return <div className="text-sm text-gray-500">Không có quyền.</div>
  }
  const params = await searchParams
  const supabase = await createClient()
  const [vaccinesRes, chickensRes, profilesRes, pendingVac] = await Promise.all([
    supabase.from('vaccines').select('*').eq('is_active', true).order('display_order'),
    supabase.from('chickens').select('id, chicken_code, name, image_url, birth_date, status').in('status', ['dang_nuoi','dang_cach_ly']).order('chicken_code').limit(2000),
    supabase.from('profiles').select('id, full_name').order('full_name'),
    params.vaccination
      ? supabase.from('vaccinations').select('*, vaccine:vaccines(*), chicken:chickens(id, chicken_code, name, birth_date)').eq('id', params.vaccination).single()
      : Promise.resolve({ data: null }),
  ])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">💉 Ghi nhận tiêm phòng</h1>
      <p className="text-sm text-gray-500 mb-2">Cập nhật chi tiết: lô vaccine, hạn dùng, liều, đường tiêm, kết quả, phản ứng</p>
      <VaccinationTabs />
      <RecordVaccinationForm
        vaccines={(vaccinesRes.data ?? []) as never}
        chickens={(chickensRes.data ?? []) as never}
        profiles={(profilesRes.data ?? []) as never}
        pendingVaccination={(pendingVac.data ?? null) as never}
        defaultChickenId={params.chicken}
      />
    </div>
  )
}
