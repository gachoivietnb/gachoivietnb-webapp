import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { StaffPanel } from '@/components/admin/staff/StaffPanel'

export const revalidate = 0

export default async function NhanSuPage() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  const monthStart = today.slice(0, 7) + '-01'

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user ? await supabase.from('profiles').select('role').eq('id', user.id).single() : { data: null }
  const isAdmin = (profile as { role?: string } | null)?.role === 'chu_trai'

  const [profilesRes, todayRes, monthRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, role, phone, is_active, created_at, base_salary_monthly, standard_work_days')
      .order('created_at', { ascending: false }),
    supabase
      .from('staff_attendance')
      .select('id, staff_id, check_in_time, check_out_time, total_hours, staff:profiles(id, full_name, role)')
      .eq('attendance_date', today)
      .order('check_in_time'),
    supabase
      .from('staff_attendance')
      .select('staff_id, total_hours, attendance_date')
      .gte('attendance_date', monthStart)
      .lte('attendance_date', today),
  ])

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
            👔 Nhân sự & Chấm công
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Quản lý đội ngũ · Chấm công · Bảng công · Lương · Phân quyền
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2 flex-wrap">
            <Link
              href="/admin/nhan-su/phan-quyen"
              className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              🔐 Phân quyền
            </Link>
            <Link
              href="/admin/nhan-su/bang-cong"
              className="border border-emerald-500 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg px-4 py-2 text-sm font-medium"
            >
              🗓️ Bảng công tháng
            </Link>
            <Link
              href="/admin/nhan-su/luong"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-semibold shadow hover:shadow-lg transition"
            >
              💰 Chốt lương tháng
            </Link>
          </div>
        )}
      </div>
      <StaffPanel
        isAdmin={isAdmin}
        currentUserId={user?.id ?? ''}
        profiles={(profilesRes.data ?? []) as never}
        todayAttendance={(todayRes.data ?? []) as never}
        monthAttendance={(monthRes.data ?? []) as never}
      />
    </div>
  )
}
