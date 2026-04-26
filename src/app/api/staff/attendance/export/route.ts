import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildExcel, type ReportMeta, type ReportSection, type FarmInfo } from '@/lib/reports/finance-export'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const today = new Date()
  const year = Number(searchParams.get('year')) || today.getFullYear()
  const month = Number(searchParams.get('month')) || today.getMonth() + 1

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: me } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: string }>()
  if (me?.role !== 'chu_trai') return NextResponse.json({ error: 'Chỉ chủ trại' }, { status: 403 })

  const firstDay = `${year}-${String(month).padStart(2, '0')}-01`
  const nextMonthFirst = new Date(year, month, 1).toISOString().slice(0, 10)

  const [{ data: staffRaw }, { data: recordsRaw }, { data: farmRow }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, base_salary_monthly, standard_work_days')
      .eq('role', 'nhan_vien')
      .eq('is_active', true)
      .order('full_name'),
    supabase
      .from('staff_attendance')
      .select('staff_id, attendance_date, check_in_time, check_out_time, total_hours')
      .gte('attendance_date', firstDay)
      .lt('attendance_date', nextMonthFirst),
    supabase.from('system_settings').select('value').eq('key', 'farm_info').maybeSingle(),
  ])

  const farm =
    ((farmRow as { value?: FarmInfo } | null)?.value as FarmInfo) ?? { name: 'Gà Chọi Việt NB' }
  const staff = (staffRaw ?? []) as Array<{
    id: string
    full_name: string
    base_salary_monthly: number | string | null
    standard_work_days: number | null
  }>
  const records = (recordsRaw ?? []) as Array<{
    staff_id: string
    attendance_date: string
    check_in_time: string | null
    check_out_time: string | null
    total_hours: number | string | null
  }>

  const daysInMonth = new Date(year, month, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  // Build: rows = staff, cells = day 1..N, rightmost = total + salary
  const headers = [
    'Nhân viên',
    'Lương cơ bản',
    ...days.map((d) => {
      const dow = new Date(year, month - 1, d).getDay()
      const dayLabel = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][dow]
      return `${d}\n${dayLabel}`
    }),
    'Tổng công',
    'Ngày chuẩn',
    'Lương theo công',
  ]

  const byStaffDay = new Map<string, Map<number, (typeof records)[number]>>()
  for (const r of records) {
    const d = Number(r.attendance_date.slice(8, 10))
    if (!byStaffDay.has(r.staff_id)) byStaffDay.set(r.staff_id, new Map())
    byStaffDay.get(r.staff_id)!.set(d, r)
  }

  const rows: Array<Array<string | number>> = staff.map((s) => {
    const rec = byStaffDay.get(s.id) ?? new Map()
    const worked = Array.from(rec.values()).filter((r) => r.check_in_time).length
    const base = Number(s.base_salary_monthly ?? 0)
    const std = s.standard_work_days ?? 26
    const salary = std > 0 ? Math.round((base * worked) / std) : 0

    const dayCells = days.map((d) => {
      const r = rec.get(d)
      const dow = new Date(year, month - 1, d).getDay()
      if (!r?.check_in_time) return dow === 0 ? '−' : ''
      return r.check_out_time ? '✓' : '½'
    })

    return [s.full_name, base, ...dayCells, worked, std, salary]
  })

  // Footer — tổng theo ngày
  const footer: Array<string | number> = [
    `TỔNG ${staff.length} người`,
    staff.reduce((s, st) => s + Number(st.base_salary_monthly ?? 0), 0),
    ...days.map((d) =>
      staff.filter((s) => byStaffDay.get(s.id)?.get(d)?.check_in_time).length
    ),
    staff.reduce((s, st) => {
      const worked = Array.from((byStaffDay.get(st.id) ?? new Map()).values()).filter(
        (r) => r.check_in_time
      ).length
      return s + worked
    }, 0),
    '',
    staff.reduce((s, st) => {
      const worked = Array.from((byStaffDay.get(st.id) ?? new Map()).values()).filter(
        (r) => r.check_in_time
      ).length
      const base = Number(st.base_salary_monthly ?? 0)
      const std = st.standard_work_days ?? 26
      return s + (std > 0 ? Math.round((base * worked) / std) : 0)
    }, 0),
  ]

  const meta: ReportMeta = {
    title: `BẢNG CÔNG THÁNG ${month}/${year}`,
    subtitle: `${staff.length} nhân viên · ${daysInMonth} ngày`,
  }

  const sections: ReportSection[] = [
    {
      title: `Chi tiết công từng ngày (✓ đi làm · ½ thiếu check-out · − Chủ Nhật · trống = vắng)`,
      headers,
      rows,
      footer,
      rightAlign: [1, ...days.map((_, i) => i + 2), 2 + days.length, 3 + days.length, 4 + days.length],
    },
  ]

  const buf = await buildExcel(meta, sections, farm)
  const filename = `bang-cong-thang-${month}-${year}.xlsx`

  return new NextResponse(buf, {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
