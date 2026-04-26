'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatVnd } from '@/lib/utils/format'
import { removeDiacritics } from '@/lib/utils/slugify'

type Staff = {
  id: string
  full_name: string
  role: string
  base_salary_monthly: number | string | null
  standard_work_days: number | null
  is_active: boolean
}

type AttendanceRecord = {
  staff_id: string
  attendance_date: string
  check_in_time: string | null
  check_out_time: string | null
  total_hours: number | string | null
}

type SortKey = 'name' | 'days_desc' | 'days_asc' | 'salary_desc'

const DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

function avatarColor(seed: string): string {
  const palette = [
    'from-rose-400 to-pink-500',
    'from-amber-400 to-orange-500',
    'from-emerald-400 to-teal-500',
    'from-sky-400 to-blue-500',
    'from-violet-400 to-purple-500',
    'from-fuchsia-400 to-pink-500',
    'from-lime-400 to-green-500',
    'from-cyan-400 to-sky-500',
  ]
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return palette[h % palette.length]
}

function getInitials(name: string): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function MonthlyAttendanceGrid({
  year,
  month,
  staff,
  records,
}: {
  year: number
  month: number
  staff: Staff[]
  records: AttendanceRecord[]
}) {
  const router = useRouter()
  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month
  const todayDay = isCurrentMonth ? today.getDate() : -1
  const todayStart = new Date(today)
  todayStart.setHours(0, 0, 0, 0)

  const [q, setQ] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('name')

  const daysInMonth = new Date(year, month, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const totalWorkingDays = days.filter(
    (d) => new Date(year, month - 1, d).getDay() !== 0
  ).length

  const byStaff = useMemo(() => {
    const m = new Map<string, Map<number, AttendanceRecord>>()
    for (const r of records) {
      const d = Number(r.attendance_date.slice(8, 10))
      if (!m.has(r.staff_id)) m.set(r.staff_id, new Map())
      m.get(r.staff_id)!.set(d, r)
    }
    return m
  }, [records])

  const staffList = useMemo(() => {
    const onlyEmployees = staff.filter((s) => s.role === 'nhan_vien')
    const qNorm = removeDiacritics(q.trim())
    let out = qNorm
      ? onlyEmployees.filter((s) => removeDiacritics(s.full_name).includes(qNorm))
      : onlyEmployees
    out = [...out]
    if (sortKey === 'name') out.sort((a, b) => a.full_name.localeCompare(b.full_name, 'vi'))
    else if (sortKey === 'days_desc' || sortKey === 'days_asc') {
      const dir = sortKey === 'days_desc' ? -1 : 1
      out.sort((a, b) => {
        const wa = Array.from(byStaff.get(a.id)?.values() ?? []).filter(
          (r) => r.check_in_time
        ).length
        const wb = Array.from(byStaff.get(b.id)?.values() ?? []).filter(
          (r) => r.check_in_time
        ).length
        return (wa - wb) * dir
      })
    } else if (sortKey === 'salary_desc')
      out.sort(
        (a, b) =>
          Number(b.base_salary_monthly ?? 0) - Number(a.base_salary_monthly ?? 0)
      )
    return out
  }, [staff, q, sortKey, byStaff])

  const stats = useMemo(() => {
    let totalDays = 0
    let totalHours = 0
    let totalSalary = 0
    let halfDays = 0
    let absentDays = 0
    for (const s of staff.filter((x) => x.role === 'nhan_vien')) {
      const rec = byStaff.get(s.id) ?? new Map<number, AttendanceRecord>()
      const recs = Array.from(rec.values())
      const worked = recs.filter((r) => r.check_in_time).length
      totalDays += worked
      halfDays += recs.filter((r) => r.check_in_time && !r.check_out_time).length
      for (const r of recs) totalHours += Number(r.total_hours ?? 0)
      const base = Number(s.base_salary_monthly ?? 0)
      const std = s.standard_work_days ?? 26
      totalSalary += std > 0 ? Math.round((base * worked) / std) : 0
      // Count absent (past non-Sunday days without check_in)
      for (const d of days) {
        const date = new Date(year, month - 1, d)
        const dow = date.getDay()
        if (dow === 0) continue
        if (date >= todayStart) continue
        const r = rec.get(d)
        if (!r?.check_in_time) absentDays += 1
      }
    }
    const employeesCount = staff.filter((x) => x.role === 'nhan_vien').length
    const expectedDays = employeesCount * totalWorkingDays
    const attendancePct =
      expectedDays > 0 ? (totalDays / expectedDays) * 100 : 0
    return { totalDays, totalHours, totalSalary, halfDays, absentDays, attendancePct, employeesCount }
  }, [byStaff, staff, days, year, month, totalWorkingDays, todayStart])

  function navMonth(delta: number) {
    let m = month + delta
    let y = year
    if (m < 1) {
      m = 12
      y -= 1
    } else if (m > 12) {
      m = 1
      y += 1
    }
    router.push(`?year=${y}&month=${m}`)
  }

  function exportExcel() {
    const url = `/api/staff/attendance/export?year=${year}&month=${month}`
    window.open(url, '_blank')
  }

  return (
    <div className="space-y-4">
      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-blue-500 to-violet-500" />
        <div className="p-3 flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <button
              onClick={() => navMonth(-1)}
              className="p-1.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
              title="Tháng trước"
            >
              ◀
            </button>
            <div className="text-base md:text-lg font-bold text-gray-900 dark:text-gray-100 px-2 tabular-nums">
              📅 Tháng {month}/{year}
            </div>
            <button
              onClick={() => navMonth(1)}
              className="p-1.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
              title="Tháng sau"
            >
              ▶
            </button>
            {!isCurrentMonth && (
              <button
                onClick={() =>
                  router.push(`?year=${today.getFullYear()}&month=${today.getMonth() + 1}`)
                }
                className="ml-1 text-[11px] px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 font-medium"
              >
                ↻ Tháng hiện tại
              </button>
            )}
          </div>

          <div className="flex-1 flex flex-col sm:flex-row gap-2 md:ml-auto w-full md:w-auto">
            <div className="relative flex-1 min-w-0">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Tìm tên nhân viên…"
                className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-1.5"
            >
              <option value="name">🔤 Tên A→Z</option>
              <option value="days_desc">⏱ Công nhiều</option>
              <option value="days_asc">⚠️ Công ít</option>
              <option value="salary_desc">💰 Lương cao</option>
            </select>
          </div>

          <div className="flex gap-2 ml-auto">
            <Link
              href={`/admin/nhan-su/luong?year=${year}&month=${month}`}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-3 py-1.5 text-sm font-semibold shadow hover:shadow-md flex items-center gap-1"
            >
              💰 Chốt lương →
            </Link>
            <button
              onClick={exportExcel}
              className="border border-emerald-500 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg px-3 py-1.5 text-sm font-medium"
            >
              📊 Excel
            </button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Kpi
          label="Nhân viên"
          value={String(stats.employeesCount)}
          icon="👥"
          tone="from-slate-500 to-slate-600"
        />
        <Kpi
          label="Tổng ngày công"
          value={String(stats.totalDays)}
          icon="✓"
          tone="from-emerald-500 to-teal-500"
          sub={`/ ${stats.employeesCount * totalWorkingDays} dự kiến`}
        />
        <Kpi
          label="Tỷ lệ đi làm"
          value={`${stats.attendancePct.toFixed(0)}%`}
          icon="📊"
          tone={
            stats.attendancePct >= 90
              ? 'from-emerald-500 to-teal-500'
              : stats.attendancePct >= 70
                ? 'from-blue-500 to-indigo-500'
                : 'from-amber-500 to-orange-500'
          }
        />
        <Kpi
          label="Tổng giờ thực"
          value={`${stats.totalHours.toFixed(1)}h`}
          icon="⏱"
          tone="from-blue-500 to-indigo-500"
        />
        <Kpi
          label="Vắng (đã qua)"
          value={String(stats.absentDays)}
          icon="✗"
          tone="from-rose-500 to-red-500"
          pulse={stats.absentDays > 0}
        />
        <Kpi
          label="Quỹ lương theo công"
          value={formatVnd(stats.totalSalary)}
          icon="💰"
          tone="from-violet-500 to-purple-500"
          small
        />
      </div>

      <div className="bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-600 dark:text-gray-400">
        <span className="font-medium text-gray-700 dark:text-gray-300">Chú thích:</span>
        <LegendDot color="bg-emerald-500 text-white" symbol="✓" label="Đi làm đầy đủ" />
        <LegendDot
          color="bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400"
          symbol="½"
          label="Thiếu check-out"
        />
        <LegendDot
          color="bg-gray-200 dark:bg-gray-700 text-gray-500"
          symbol="−"
          label="CN nghỉ"
        />
        <LegendDot
          color="bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400"
          symbol="×"
          label="Vắng"
        />
        <LegendDot
          color="bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300"
          symbol="●"
          label="Hôm nay"
        />
        <span className="ml-auto text-[11px]">
          💡 Hover vào ô để xem giờ vào / ra chi tiết
        </span>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700 rounded-xl shadow-sm overflow-x-auto">
        <table className="text-sm w-full border-collapse">
          <thead className="bg-gray-50 dark:bg-gray-900/40">
            <tr>
              <th className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700 min-w-[200px]">
                Nhân viên · % chấm công
              </th>
              {days.map((d) => {
                const dow = new Date(year, month - 1, d).getDay()
                const isSunday = dow === 0
                const isToday = d === todayDay
                return (
                  <th
                    key={d}
                    className={
                      'px-0.5 py-2 text-[10px] font-semibold w-[28px] min-w-[28px] text-center border-t-[3px] ' +
                      (isToday
                        ? 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-500 ring-2 ring-blue-300 dark:ring-blue-800'
                        : isSunday
                          ? 'text-rose-700 dark:text-rose-300 bg-rose-100/60 dark:bg-rose-950/30 border-rose-400 dark:border-rose-700'
                          : 'text-gray-700 dark:text-gray-300 border-transparent')
                    }
                  >
                    <div className="tabular-nums">{d}</div>
                    <div
                      className={
                        'text-[9px] ' +
                        (isToday
                          ? 'font-bold'
                          : isSunday
                            ? 'text-rose-600 dark:text-rose-400 font-bold'
                            : 'opacity-70')
                      }
                    >
                      {DAY_LABELS[dow]}
                    </div>
                  </th>
                )
              })}
              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 border-l border-gray-200 dark:border-gray-700 min-w-[80px]">
                Công
              </th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 min-w-[120px]">
                Lương
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {staffList.map((s) => {
              const rec = byStaff.get(s.id) ?? new Map<number, AttendanceRecord>()
              const recArr = Array.from(rec.values())
              const workedDays = recArr.filter((r) => r.check_in_time).length
              const totalH = recArr.reduce(
                (sum, r) => sum + Number(r.total_hours ?? 0),
                0
              )
              const base = Number(s.base_salary_monthly ?? 0)
              const std = s.standard_work_days ?? 26
              const salary = std > 0 ? Math.round((base * workedDays) / std) : 0
              const pct = std > 0 ? (workedDays / std) * 100 : 0
              const pctCapped = Math.min(100, pct)

              return (
                <tr
                  key={s.id}
                  className="hover:bg-blue-50/30 dark:hover:bg-blue-950/15"
                >
                  <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 px-3 py-2 border-r border-gray-200 dark:border-gray-700">
                    <div className="flex items-start gap-2">
                      <div
                        className={`flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br ${avatarColor(
                          s.id
                        )} text-white flex items-center justify-center text-[11px] font-bold shadow`}
                      >
                        {getInitials(s.full_name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {s.full_name}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-900/60 overflow-hidden">
                            <div
                              className={
                                'h-full bg-gradient-to-r ' +
                                (pct >= 100
                                  ? 'from-emerald-400 to-teal-500'
                                  : pct >= 80
                                    ? 'from-blue-400 to-indigo-500'
                                    : 'from-amber-400 to-orange-500')
                              }
                              style={{ width: `${pctCapped}%` }}
                            />
                          </div>
                          <span
                            className={
                              'text-[10px] font-semibold tabular-nums whitespace-nowrap ' +
                              (pct >= 100
                                ? 'text-emerald-700 dark:text-emerald-300'
                                : pct >= 80
                                  ? 'text-blue-700 dark:text-blue-300'
                                  : 'text-amber-700 dark:text-amber-300')
                            }
                          >
                            {pct.toFixed(0)}%
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                          {totalH > 0 ? `${totalH.toFixed(1)}h thực` : ''}
                          {base > 0
                            ? `${totalH > 0 ? ' · ' : ''}${formatVnd(base)}/th`
                            : ''}
                        </div>
                      </div>
                    </div>
                  </td>

                  {days.map((d) => {
                    const r = rec.get(d)
                    const date = new Date(year, month - 1, d)
                    const dow = date.getDay()
                    const isSunday = dow === 0
                    const isToday = d === todayDay
                    const isPast = date < todayStart

                    let cell: React.ReactNode = ''
                    let cellClass = ''
                    if (r?.check_in_time) {
                      const noCheckout = !r.check_out_time
                      cell = noCheckout ? '½' : '✓'
                      cellClass = noCheckout
                        ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 font-bold'
                        : 'bg-emerald-500 text-white font-bold'
                    } else if (isSunday) {
                      cell = '−'
                      cellClass = 'text-gray-400 dark:text-gray-600'
                    } else if (isPast) {
                      cell = '×'
                      cellClass = 'text-rose-500 dark:text-rose-400 font-bold bg-rose-50/40 dark:bg-rose-950/15'
                    } else if (isToday && !r?.check_in_time) {
                      cell = ''
                      cellClass = 'bg-blue-50/40 dark:bg-blue-950/15'
                    }

                    const hours = r?.total_hours ? Number(r.total_hours).toFixed(1) : null
                    const tooltip = r?.check_in_time
                      ? `${r.check_in_time.slice(11, 16)}${
                          r.check_out_time ? ' → ' + r.check_out_time.slice(11, 16) : ' (thiếu check-out)'
                        }${hours ? ` · ${hours}h` : ''}`
                      : isSunday
                        ? 'Chủ Nhật'
                        : isPast
                          ? 'Vắng (không chấm công)'
                          : isToday
                            ? 'Hôm nay'
                            : ''

                    return (
                      <td
                        key={d}
                        title={tooltip}
                        className={
                          'text-center text-xs border-l border-gray-100 dark:border-gray-700 ' +
                          cellClass +
                          (isToday && r?.check_in_time
                            ? ' ring-2 ring-blue-400 dark:ring-blue-700'
                            : '')
                        }
                        style={{ width: 28, minWidth: 28, padding: '4px 0' }}
                      >
                        {cell}
                      </td>
                    )
                  })}

                  <td className="px-3 py-2 text-center font-semibold tabular-nums text-gray-900 dark:text-gray-100 border-l border-gray-200 dark:border-gray-700">
                    <span className="text-emerald-600 dark:text-emerald-400 text-base">
                      {workedDays}
                    </span>
                    <span className="text-gray-400 dark:text-gray-500 text-xs"> / {std}</span>
                  </td>
                  <td className="px-3 py-2 text-right font-bold tabular-nums whitespace-nowrap">
                    {base > 0 ? (
                      <span className="text-gray-900 dark:text-gray-100">
                        {formatVnd(salary)}
                      </span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400 text-[10.5px]">
                        Chưa khai
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
            {staffList.length === 0 && (
              <tr>
                <td
                  colSpan={days.length + 3}
                  className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                >
                  {q ? '🔍 Không khớp từ khoá' : '👥 Chưa có nhân viên hoạt động.'}
                </td>
              </tr>
            )}
            {staffList.length > 0 && (
              <tr className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 font-semibold border-t-2 border-blue-300 dark:border-blue-800">
                <td className="sticky left-0 bg-blue-50 dark:bg-blue-950/40 px-3 py-2 text-xs text-blue-900 dark:text-blue-200 border-r border-gray-200 dark:border-gray-700">
                  📊 TỔNG · {staffList.length} người
                </td>
                {days.map((d) => {
                  const dow = new Date(year, month - 1, d).getDay()
                  const isSunday = dow === 0
                  const isToday = d === todayDay
                  const attendedCount = staffList.filter((s) => {
                    const r = byStaff.get(s.id)?.get(d)
                    return r?.check_in_time
                  }).length
                  const pct = staffList.length > 0 ? attendedCount / staffList.length : 0
                  return (
                    <td
                      key={d}
                      className={
                        'text-center text-[10px] border-l border-gray-100 dark:border-gray-700 tabular-nums ' +
                        (isSunday
                          ? 'bg-rose-100/60 dark:bg-rose-950/30 text-rose-400 dark:text-rose-500'
                          : isToday
                            ? 'bg-blue-200/60 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-bold'
                            : pct >= 0.8
                              ? 'text-emerald-700 dark:text-emerald-300'
                              : pct >= 0.5
                                ? 'text-blue-700 dark:text-blue-300'
                                : 'text-gray-700 dark:text-gray-300')
                      }
                      style={{ width: 28, minWidth: 28, padding: '4px 0' }}
                    >
                      {attendedCount || '—'}
                    </td>
                  )
                })}
                <td className="px-3 py-2 text-center border-l border-gray-200 dark:border-gray-700 text-emerald-700 dark:text-emerald-300 tabular-nums text-base">
                  {stats.totalDays}
                </td>
                <td className="px-3 py-2 text-right text-blue-700 dark:text-blue-300 tabular-nums whitespace-nowrap text-base">
                  {formatVnd(stats.totalSalary)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 flex-wrap gap-2">
        <div>
          📅 Tháng có <strong>{daysInMonth}</strong> ngày ·{' '}
          <strong className="text-gray-700 dark:text-gray-300">{totalWorkingDays}</strong> ngày
          thường ·{' '}
          <strong className="text-rose-600 dark:text-rose-400">
            {daysInMonth - totalWorkingDays}
          </strong>{' '}
          Chủ Nhật
          {stats.halfDays > 0 && (
            <>
              {' · '}
              <strong className="text-amber-600 dark:text-amber-400">{stats.halfDays}</strong> nửa
              ngày (thiếu check-out)
            </>
          )}
        </div>
        <Link
          href={`/admin/nhan-su/luong?year=${year}&month=${month}`}
          className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
        >
          → Sang trang Chốt lương
        </Link>
      </div>
    </div>
  )
}

function LegendDot({
  color,
  symbol,
  label,
}: {
  color: string
  symbol: string
  label: string
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold ${color}`}
      >
        {symbol}
      </span>
      <span>{label}</span>
    </span>
  )
}

function Kpi({
  label,
  value,
  icon,
  tone,
  pulse,
  sub,
  small,
}: {
  label: string
  value: string
  icon: string
  tone: string
  pulse?: boolean
  sub?: string
  small?: boolean
}) {
  return (
    <div className="relative overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3.5">
      <div
        className={`absolute -right-6 -top-6 w-20 h-20 rounded-full bg-gradient-to-br ${tone} opacity-15 blur-xl ${
          pulse ? 'animate-pulse' : ''
        }`}
      />
      <div className="relative">
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <span>{icon}</span>
          <span className="truncate">{label}</span>
        </div>
        <div
          className={
            'mt-1 font-bold tabular-nums text-gray-900 dark:text-gray-100 ' +
            (small ? 'text-base' : 'text-2xl')
          }
        >
          {value}
        </div>
        {sub && (
          <div className="text-[10.5px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
            {sub}
          </div>
        )}
      </div>
    </div>
  )
}
