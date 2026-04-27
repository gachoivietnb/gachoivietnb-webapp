import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserPermissions } from '@/lib/rbac/guard'
import { VaccinationTabs } from '@/components/admin/vaccinations/VaccinationTabs'
import { BatchesClient } from '@/components/admin/vaccinations/BatchesClient'

export const revalidate = 0

export default async function DotTiemPage() {
  const ctx = await getCurrentUserPermissions()
  if (!ctx) redirect('/auth/login')
  if (!ctx.can('tiem_phong', 'read')) {
    return <div className="text-sm text-gray-500">Không có quyền.</div>
  }
  const supabase = await createClient()
  const [batchesRes, vaccinesRes, chickensRes, areasRes] = await Promise.all([
    supabase.from('vaccination_batches').select('*').order('batch_date', { ascending: false }).limit(100),
    supabase.from('vaccines').select('*').eq('is_active', true).order('display_order'),
    supabase.from('chickens').select('id, chicken_code, name, image_url, birth_date, status, area_id, breed_id').in('status', ['dang_nuoi','dang_cach_ly']).order('chicken_code').limit(2000),
    supabase.from('areas').select('id, code, name_vi').eq('is_active', true).order('display_order'),
  ])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">🎯 Đợt tiêm hàng loạt</h1>
      <p className="text-sm text-gray-500 mb-2">Tạo đợt tiêm cho nhiều con cùng lúc — chọn theo khu, theo tuổi, theo lứa</p>
      <VaccinationTabs />
      <BatchesClient
        batches={(batchesRes.data ?? []) as never}
        vaccines={(vaccinesRes.data ?? []) as never}
        chickens={(chickensRes.data ?? []) as never}
        areas={(areasRes.data ?? []) as never}
        canWrite={ctx.can('tiem_phong', 'write')}
        canDelete={ctx.can('tiem_phong', 'delete')}
      />
    </div>
  )
}
