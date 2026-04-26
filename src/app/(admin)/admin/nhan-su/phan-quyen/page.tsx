import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PermissionsEditor } from '@/components/admin/staff/PermissionsEditor'
import { type PermissionsMap } from '@/lib/rbac/modules'

export const revalidate = 0

type Staff = {
  id: string
  full_name: string
  role: string
  is_active: boolean
  permissions: PermissionsMap | null
}

export default async function PhanQuyenPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: me } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: string }>()

  if (me?.role !== 'chu_trai') {
    return (
      <div className="bg-amber-50 dark:bg-amber-900/30 p-4 rounded text-sm">
        Chỉ chủ trại được cấu hình phân quyền.
      </div>
    )
  }

  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, role, is_active, permissions')
    .eq('role', 'nhan_vien')
    .order('full_name')

  const staff = (data ?? []) as Staff[]

  return (
    <div>
      <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 mb-1">
        🔐 Phân quyền nhân viên
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Chọn một nhân viên → tick các quyền Xem / Thêm-Sửa / Xóa cho từng module. Chủ trại luôn có
        full quyền.
      </p>
      <PermissionsEditor staff={staff} />
    </div>
  )
}
