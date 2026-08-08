import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { StaffCrudClient, type StaffRow } from '@/components/admin/staff/StaffCrudClient'
import { StaffOverviewClient, type StaffOverviewRow } from '@/components/admin/staff/StaffOverviewClient'

export const revalidate = 0

export default async function NhanSuPage() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  const monthStart = today.slice(0, 7) + '-01'

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('profiles').select('role').eq('id', user.id).single()
    : { data: null }
  const isAdmin = (profile as { role?: string } | null)?.role === 'chu_trai'

  const [profilesRes, monthRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, role, phone, avatar_url, is_active, created_at, base_salary_monthly, standard_work_days')
      .order('created_at', { ascending: false }),
    supabase
      .from('staff_attendance')
      .select('staff_id, total_hours, attendance_date')
      .gte('attendance_date', monthStart)
      .lte('attendance_date', today),
  ])

  const staff = (profilesRes.data ?? []) as StaffRow[]
  const monthAttendance = (monthRes.data ?? []) as Array<{
    staff_id: string
    total_hours: number | null
    attendance_date: string
  }>

  // Aggregate month stats per staff
  const monthMap = new Map<string, { days: number; hours: number }>()
  for (const r of monthAttendance) {
    if (!monthMap.has(r.staff_id)) monthMap.set(r.staff_id, { days: 0, hours: 0 })
    const cur = monthMap.get(r.staff_id)!
    cur.days++
    cur.hours += Number(r.total_hours ?? 0)
  }

  const overviewRows: StaffOverviewRow[] = staff.map((s) => ({
    ...s,
    created_at: (s as { created_at?: string }).created_at ?? '',
    month_days: monthMap.get(s.id)?.days ?? 0,
    month_hours: monthMap.get(s.id)?.hours ?? 0,
  }))

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between flex-wrap gap-3 mb-2">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-950/60 dark:to-indigo-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold uppercase tracking-widest rounded-full px-2.5 py-0.5 mb-1.5 border border-blue-200 dark:border-blue-900">
            👔 Quản lý Nhân sự
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            👤 Nhân sự
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Quản lý đội ngũ · Tạo / sửa / phân quyền · Báo cáo nhân sự xuất Excel/PDF
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link
            href="/admin/nhan-su/cham-cong"
            className="border border-emerald-500 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg px-3 py-2 text-sm font-medium"
          >
            🕐 Chấm công
          </Link>
          <Link
            href="/admin/nhan-su/luong"
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-3 py-2 text-sm font-semibold shadow"
          >
            💰 Tính lương
          </Link>
          {isAdmin && (
            <Link
              href="/admin/nhan-su/phan-quyen"
              className="border border-violet-500 text-violet-700 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30 rounded-lg px-3 py-2 text-sm font-medium"
            >
              🔐 Phân quyền
            </Link>
          )}
        </div>
      </div>

      {isAdmin && (
        <StaffCrudClient currentUserId={user?.id ?? ''} staff={staff} />
      )}

      <StaffOverviewClient rows={overviewRows} isAdmin={isAdmin} />
    </div>
  )
}
