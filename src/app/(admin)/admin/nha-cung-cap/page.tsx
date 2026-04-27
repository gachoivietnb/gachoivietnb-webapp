import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserPermissions } from '@/lib/rbac/guard'
import { SuppliersClient } from '@/components/admin/suppliers/SuppliersClient'

export const revalidate = 0

export default async function NhaCungCapPage() {
  const ctx = await getCurrentUserPermissions()
  if (!ctx) redirect('/auth/login')
  if (!ctx.can('nha_cung_cap', 'read')) {
    return <div className="text-sm text-gray-500">Không có quyền.</div>
  }
  const supabase = await createClient()
  const [listRes, kpiRes] = await Promise.all([
    supabase.from('supplier_stats').select('*').order('total_amount', { ascending: false }).limit(1000),
    supabase.rpc('supplier_kpis'),
  ])
  return (
    <div>
      <div className="mb-3">
        <h1 className="text-2xl font-bold flex items-center gap-2">🏭 Nhà cung cấp</h1>
        <p className="text-sm text-gray-500 mt-1">Quản lý NCC theo 7 nhóm: gà, thuốc thú y, thức ăn, vật liệu, thiết bị, dịch vụ, khác · Đồng bộ với Mua vào</p>
      </div>
      <SuppliersClient
        suppliers={(listRes.data ?? []) as never}
        kpis={(kpiRes.data ?? {}) as never}
        canWrite={ctx.can('nha_cung_cap', 'write')}
        canDelete={ctx.can('nha_cung_cap', 'delete')}
      />
    </div>
  )
}
