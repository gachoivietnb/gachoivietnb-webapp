import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { MonthlyAttendanceGrid } from '@/components/admin/staff/MonthlyAttendanceGrid'

export const revalidate = 0

export default async function BangCongPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>
}) {
  const sp = await searchParams
  const today = new Date()
  const year = Number(sp.year) || today.getFullYear()
  const month = Number(sp.month) || today.getMonth() + 1

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
        Chỉ chủ trại được xem bảng công tổng hợp.
      </div>
    )
  }

  const firstDay = `${year}-${String(month).padStart(2, '0')}-01`
  const nextMonthFirst = new Date(year, month, 1).toISOString().slice(0, 10)

  const [profilesRes, attendanceRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, role, base_salary_monthly, standard_work_days, is_active')
      .eq('is_active', true)
      .order('role', { ascending: false })
      .order('full_name'),
    supabase
      .from('staff_attendance')
      .select('staff_id, attendance_date, check_in_time, check_out_time, total_hours')
      .gte('attendance_date', firstDay)
      .lt('attendance_date', nextMonthFirst),
  ])

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div>
          <Link
            href="/admin/nhan-su"
            className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại nhân sự
          </Link>
          <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100">
            🗓️ Bảng công tháng
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Tổng hợp chấm công toàn bộ nhân viên trong tháng — cơ sở để chốt lương
          </p>
        </div>
        <Link
          href={`/admin/nhan-su/luong?year=${year}&month=${month}`}
          className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700"
        >
          💰 Chốt lương tháng →
        </Link>
      </div>

      <MonthlyAttendanceGrid
        year={year}
        month={month}
        staff={(profilesRes.data ?? []) as never}
        records={(attendanceRes.data ?? []) as never}
      />
    </div>
  )
}
