import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ChamCongClient, type AttendanceRow, type StaffLite } from '@/components/admin/staff/ChamCongClient'

export const revalidate = 0

export default async function ChamCongPage() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  const monthStart = today.slice(0, 7) + '-01'

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('profiles').select('role').eq('id', user.id).single()
    : { data: null }
  const isAdmin = (profile as { role?: string } | null)?.role === 'chu_trai'

  const [profilesRes, todayRes, monthRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, role, avatar_url, is_active')
      .eq('is_active', true)
      .order('full_name'),
    supabase
      .from('staff_attendance')
      .select('id, staff_id, check_in_time, check_out_time, total_hours, attendance_date, notes, staff:profiles(id, full_name, role)')
      .eq('attendance_date', today)
      .order('check_in_time'),
    supabase
      .from('staff_attendance')
      .select('staff_id, total_hours, attendance_date, check_in_time, check_out_time')
      .gte('attendance_date', monthStart)
      .lte('attendance_date', today),
  ])

  const staff = (profilesRes.data ?? []) as StaffLite[]
  const todayAttendance = (todayRes.data ?? []) as AttendanceRow[]
  const monthAttendance = (monthRes.data ?? []) as Array<{
    staff_id: string
    total_hours: number | null
    attendance_date: string
    check_in_time: string | null
    check_out_time: string | null
  }>

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between flex-wrap gap-3 mb-2">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-950/60 dark:to-teal-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold uppercase tracking-widest rounded-full px-2.5 py-0.5 mb-1.5 border border-emerald-200 dark:border-emerald-900">
            👔 Quản lý Nhân sự
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            🕐 Chấm công
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Check-in / Check-out · Bảng công ngày & tháng · Theo dõi nhân viên đang làm việc
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link
            href="/admin/nhan-su"
            className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-3 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            ← Nhân sự
          </Link>
          <Link
            href="/admin/nhan-su/luong"
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-3 py-2 text-sm font-semibold shadow"
          >
            💰 Tính lương →
          </Link>
        </div>
      </div>

      <ChamCongClient
        currentUserId={user?.id ?? ''}
        isAdmin={isAdmin}
        staff={staff}
        todayAttendance={todayAttendance}
        monthAttendance={monthAttendance}
        today={today}
      />
    </div>
  )
}
