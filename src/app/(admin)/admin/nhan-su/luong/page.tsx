import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PayrollPanel } from '@/components/admin/staff/PayrollPanel'

export const revalidate = 0

export default async function PayrollPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: string }>()

  if (profile?.role !== 'chu_trai') {
    return (
      <div className="bg-amber-50 dark:bg-amber-900/30 p-4 rounded text-sm">
        Chỉ chủ trại được xem bảng lương.
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-2 mb-1">
        <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100">💰 Bảng lương</h1>
        <a
          href="/admin/nhan-su/bang-cong"
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          ← Xem bảng công chi tiết
        </a>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Chốt lương hàng tháng — tự động ghi vào chi phí nhân công để hiển thị trong báo cáo tài chính.
      </p>
      <PayrollPanel />
    </div>
  )
}
