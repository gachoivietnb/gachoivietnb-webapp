import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserPermissions } from '@/lib/rbac/guard'
import { VaccinationTabs } from '@/components/admin/vaccinations/VaccinationTabs'
import { CatalogClient } from '@/components/admin/vaccinations/CatalogClient'

export const revalidate = 0

export default async function CatalogPage() {
  const ctx = await getCurrentUserPermissions()
  if (!ctx) redirect('/auth/login')
  if (!ctx.can('tiem_phong', 'read')) {
    return <div className="text-sm text-gray-500">Không có quyền.</div>
  }
  const supabase = await createClient()
  const { data } = await supabase.from('vaccines').select('*').order('display_order')
  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">📚 Catalog Vaccine</h1>
      <p className="text-sm text-gray-500 mb-2">Danh mục 14 vaccine + thuốc phòng chuẩn cho gà chọi VN</p>
      <VaccinationTabs />
      <CatalogClient
        initial={(data ?? []) as never}
        canWrite={ctx.can('tiem_phong', 'write')}
        canDelete={ctx.can('tiem_phong', 'delete')}
      />
    </div>
  )
}
