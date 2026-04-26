'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export type StaffLite = {
  id: string
  full_name: string
  role: string
  avatar_url: string | null
  is_active: boolean
}

export type AttendanceRow = {
  id: string
  staff_id: string
  check_in_time: string | null
  check_out_time: string | null
  total_hours: number | string | null
  attendance_date: string
  notes: string | null
  staff: { id: string; full_name: string; role: string } | null
}

type MonthRow = {
  staff_id: string
  total_hours: number | null
  attendance_date: string
  check_in_time: string | null
  check_out_time: string | null
}

function timeOnly(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function dayName(dateStr: string): string {
  const d = new Date(dateStr)
  return ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][d.getDay()]
}

export function ChamCongClient({
  currentUserId,
  isAdmin,
  staff,
  todayAttendance,
  monthAttendance,
  today,
}: {
  currentUserId: string
  isAdmin: boolean
  staff: StaffLite[]
  todayAttendance: AttendanceRow[]
  monthAttendance: MonthRow[]
  today: string
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const myAttendance = todayAttendance.find((a) => a.staff_id === currentUserId)
  const canCheckIn = !myAttendance?.check_in_time
  const canCheckOut = myAttendance?.check_in_time && !myAttendance?.check_out_time

  async function handleAttendance(action: 'check_in' | 'check_out') {
    setBusy(true)
    setErr(null)
    try {
      const r = await fetch('/api/staff/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const j = (await r.json()) as { ok?: boolean; error?: string }
      if (!r.ok || !j.ok) {
        setErr(j.error ?? 'Lỗi không rõ')
        return
      }
      startTransition(() => router.refresh())
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Lỗi')
    } finally {
      setBusy(false)
    }
  }

  // Today summary
  const todayMap = useMemo(() => {
    const m = new Map<string, AttendanceRow>()
    for (const a of todayAttendance) m.set(a.staff_id, a)
    return m
  }, [todayAttendance])

  const stats = useMemo(() => {
    const total = staff.length
    const checkedIn = todayAttendance.length
    const working = todayAttendance.filter((a) => a.check_in_time && !a.check_out_time).length
    const done = todayAttendance.filter((a) => a.check_out_time).length
    const totalHoursToday = todayAttendance.reduce((s, a) => s + Number(a.total_hours ?? 0), 0)
    return { total, checkedIn, working, done, totalHoursToday }
  }, [staff, todayAttendance])

  // Month grid: each staff × each day
  const monthMap = useMemo(() => {
    const m = new Map<string, Map<string, MonthRow>>()
    for (const r of monthAttendance) {
      if (!m.has(r.staff_id)) m.set(r.staff_id, new Map())
      m.get(r.staff_id)!.set(r.attendance_date, r)
    }
    return m
  }, [monthAttendance])

  const days = useMemo(() => {
    const ds: string[] = []
    const start = today.slice(0, 7) + '-01'
    let d = new Date(start)
    const end = new Date(today)
    while (d <= end) {
      ds.push(d.toISOString().slice(0, 10))
      d.setDate(d.getDate() + 1)
    }
    return ds
  }, [today])

  const staffMonthHours = useMemo(() => {
    const map = new Map<string, { days: number; hours: number }>()
    for (const r of monthAttendance) {
      if (!map.has(r.staff_id)) map.set(r.staff_id, { days: 0, hours: 0 })
      const cur = map.get(r.staff_id)!
      cur.days++
      cur.hours += Number(r.total_hours ?? 0)
    }
    return map
  }, [monthAttendance])

  return (
    <div className="space-y-4">
      {/* Self check-in card */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 text-white p-5 md:p-6 shadow-lg">
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/15 blur-3xl pointer-events-none" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-widest text-white/70 mb-1">
              {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold mb-2">Chấm công của tôi</h2>
            {myAttendance ? (
              <div className="flex flex-wrap gap-2 text-sm">
                {myAttendance.check_in_time && (
                  <span className="bg-white/20 backdrop-blur rounded-lg px-3 py-1.5">
                    🟢 Vào: <b>{timeOnly(myAttendance.check_in_time)}</b>
                  </span>
                )}
                {myAttendance.check_out_time ? (
                  <span className="bg-white/20 backdrop-blur rounded-lg px-3 py-1.5">
                    🔴 Ra: <b>{timeOnly(myAttendance.check_out_time)}</b>
                  </span>
                ) : (
                  <span className="bg-emerald-500/30 backdrop-blur rounded-lg px-3 py-1.5 animate-pulse">
                    🔵 Đang làm việc
                  </span>
                )}
                {myAttendance.total_hours && (
                  <span className="bg-white/20 backdrop-blur rounded-lg px-3 py-1.5">
                    ⏱️ <b>{Number(myAttendance.total_hours).toFixed(1)}h</b>
                  </span>
                )}
              </div>
            ) : (
              <p className="text-white/80 text-sm">Chưa chấm công hôm nay — bấm nút bên phải để bắt đầu ca.</p>
            )}
            {err && (
              <div className="mt-3 bg-rose-500/30 backdrop-blur rounded-lg px-3 py-2 text-sm">⚠️ {err}</div>
            )}
          </div>
          <div className="flex gap-2">
            {canCheckIn && (
              <button
                onClick={() => handleAttendance('check_in')}
                disabled={busy}
                className="bg-white text-emerald-700 hover:bg-emerald-50 rounded-xl px-5 py-3 font-extrabold shadow-lg hover:scale-105 transition disabled:opacity-50"
              >
                {busy ? '⏳ ...' : '🟢 CHECK-IN'}
              </button>
            )}
            {canCheckOut && (
              <button
                onClick={() => handleAttendance('check_out')}
                disabled={busy}
                className="bg-white text-rose-700 hover:bg-rose-50 rounded-xl px-5 py-3 font-extrabold shadow-lg hover:scale-105 transition disabled:opacity-50"
              >
                {busy ? '⏳ ...' : '🔴 CHECK-OUT'}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Stats cards */}
      {isAdmin && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat tone="blue" icon="👥" label="Tổng NV active" value={String(stats.total)} />
          <Stat tone="amber" icon="📅" label="Đã chấm hôm nay" value={`${stats.checkedIn}/${stats.total}`} />
          <Stat tone="emerald" icon="🟢" label="Đang làm việc" value={String(stats.working)} pulse={stats.working > 0} />
          <Stat tone="violet" icon="⏱️" label="Tổng giờ công" value={`${stats.totalHoursToday.toFixed(1)}h`} />
        </div>
      )}

      {/* Today list */}
      {isAdmin && (
        <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />
          <div className="p-4">
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              📋 Chấm công hôm nay
            </h2>
            {staff.length === 0 ? (
              <p className="text-sm text-gray-500 italic text-center py-4">Chưa có nhân viên active.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {staff.map((s) => {
                  const a = todayMap.get(s.id)
                  const status = a?.check_out_time
                    ? { text: 'Đã hoàn tất', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' }
                    : a?.check_in_time
                      ? { text: 'Đang làm', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 animate-pulse' }
                      : { text: 'Chưa chấm', cls: 'bg-gray-100 text-gray-600 dark:bg-gray-900/60 dark:text-gray-400' }
                  return (
                    <div key={s.id} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700">
                      {s.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 text-white text-sm font-bold flex items-center justify-center">
                          {(s.full_name.split(' ').slice(-1)[0] ?? '?')[0]}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{s.full_name}</div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400">
                          {a?.check_in_time && `🟢 ${timeOnly(a.check_in_time)}`}
                          {a?.check_out_time && ` · 🔴 ${timeOnly(a.check_out_time)}`}
                          {a?.total_hours && ` · ${Number(a.total_hours).toFixed(1)}h`}
                        </div>
                      </div>
                      <span className={'text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap ' + status.cls}>
                        {status.text}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Monthly grid */}
      {isAdmin && (
        <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <div className="p-4">
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              🗓️ Bảng công tháng
            </h2>
            <div className="overflow-x-auto">
              <table className="text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 bg-white dark:bg-gray-800 text-left px-2 py-1.5 font-bold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                      Nhân viên
                    </th>
                    {days.map((d) => {
                      const day = new Date(d).getDay()
                      const isWeekend = day === 0 || day === 6
                      const isToday = d === today
                      return (
                        <th
                          key={d}
                          className={
                            'px-1.5 py-1.5 text-center font-semibold border-b border-gray-200 dark:border-gray-700 ' +
                            (isToday ? 'bg-blue-50 dark:bg-blue-950/30 ring-1 ring-blue-300' : isWeekend ? 'bg-rose-50/40 dark:bg-rose-950/10 text-rose-600' : 'text-gray-500')
                          }
                          title={d}
                        >
                          <div>{dayName(d)}</div>
                          <div className="font-bold">{Number(d.slice(-2))}</div>
                        </th>
                      )
                    })}
                    <th className="sticky right-0 z-10 bg-white dark:bg-gray-800 px-2 py-1.5 text-right font-bold text-gray-700 dark:text-gray-300 border-b border-l border-gray-200 dark:border-gray-700">
                      Tổng giờ
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((s) => {
                    const sm = staffMonthHours.get(s.id)
                    return (
                      <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                        <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 px-2 py-1.5 border-b border-gray-100 dark:border-gray-700">
                          <div className="font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                            {s.full_name}
                          </div>
                        </td>
                        {days.map((d) => {
                          const r = monthMap.get(s.id)?.get(d)
                          const has = !!r?.check_in_time
                          const done = !!r?.check_out_time
                          const isToday = d === today
                          return (
                            <td
                              key={d}
                              className={
                                'px-1.5 py-1.5 text-center border-b border-gray-100 dark:border-gray-700 font-mono ' +
                                (isToday ? 'bg-blue-50/50 dark:bg-blue-950/20' : '')
                              }
                              title={d + (r?.total_hours ? ` · ${r.total_hours}h` : '')}
                            >
                              {done ? (
                                <span className="text-emerald-600 dark:text-emerald-400" title={`${r?.total_hours ?? 0}h`}>✓</span>
                              ) : has ? (
                                <span className="text-amber-600 dark:text-amber-400 animate-pulse">●</span>
                              ) : (
                                <span className="text-gray-300 dark:text-gray-700">·</span>
                              )}
                            </td>
                          )
                        })}
                        <td className="sticky right-0 z-10 bg-white dark:bg-gray-800 px-2 py-1.5 text-right font-bold text-gray-900 dark:text-gray-100 border-b border-l border-gray-100 dark:border-gray-700 whitespace-nowrap">
                          <div className="text-emerald-700 dark:text-emerald-400 tabular-nums">
                            {(sm?.hours ?? 0).toFixed(1)}h
                          </div>
                          <div className="text-[10px] text-gray-500 dark:text-gray-400">{sm?.days ?? 0} ngày</div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-3 flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1">
                <span className="text-emerald-600">✓</span> Đã hoàn tất
              </span>
              <span className="flex items-center gap-1">
                <span className="text-amber-600">●</span> Đang làm
              </span>
              <span className="flex items-center gap-1">
                <span className="text-gray-400">·</span> Chưa chấm
              </span>
            </p>
          </div>
        </section>
      )}
    </div>
  )
}

const STAT_TONES: Record<string, { bg: string; ring: string; iconBg: string; iconText: string; valueText: string }> = {
  blue: { bg: 'bg-gradient-to-br from-blue-50 to-indigo-50/40 dark:from-blue-950/40 dark:to-indigo-950/30', ring: 'ring-blue-200 dark:ring-blue-900/60', iconBg: 'bg-blue-500/10', iconText: 'text-blue-600 dark:text-blue-400', valueText: 'text-blue-900 dark:text-blue-100' },
  amber: { bg: 'bg-gradient-to-br from-amber-50 to-orange-50/40 dark:from-amber-950/40 dark:to-orange-950/30', ring: 'ring-amber-200 dark:ring-amber-900/60', iconBg: 'bg-amber-500/10', iconText: 'text-amber-600 dark:text-amber-400', valueText: 'text-amber-900 dark:text-amber-100' },
  emerald: { bg: 'bg-gradient-to-br from-emerald-50 to-teal-50/40 dark:from-emerald-950/40 dark:to-teal-950/30', ring: 'ring-emerald-200 dark:ring-emerald-900/60', iconBg: 'bg-emerald-500/10', iconText: 'text-emerald-600 dark:text-emerald-400', valueText: 'text-emerald-900 dark:text-emerald-100' },
  violet: { bg: 'bg-gradient-to-br from-violet-50 to-purple-50/40 dark:from-violet-950/40 dark:to-purple-950/30', ring: 'ring-violet-200 dark:ring-violet-900/60', iconBg: 'bg-violet-500/10', iconText: 'text-violet-600 dark:text-violet-400', valueText: 'text-violet-900 dark:text-violet-100' },
}

function Stat({ tone, icon, label, value, pulse }: { tone: keyof typeof STAT_TONES; icon: string; label: string; value: string; pulse?: boolean }) {
  const t = STAT_TONES[tone]
  return (
    <div className={'relative overflow-hidden ' + t.bg + ' ring-1 ' + t.ring + ' rounded-2xl p-3 md:p-4'}>
      <div className={'absolute -right-3 -top-3 w-14 h-14 rounded-full ' + t.iconBg + ' blur-xl ' + (pulse ? 'animate-pulse' : '')} />
      <div className="relative">
        <div className={'w-9 h-9 rounded-xl ' + t.iconBg + ' ' + t.iconText + ' flex items-center justify-center text-lg mb-2'}>
          {icon}
        </div>
        <div className={'text-[10px] font-bold uppercase tracking-widest ' + t.iconText + ' opacity-80'}>{label}</div>
        <div className={'text-lg md:text-xl font-bold ' + t.valueText + ' tabular-nums'}>{value}</div>
      </div>
    </div>
  )
}
