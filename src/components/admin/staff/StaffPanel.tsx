'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDate, formatVnd } from '@/lib/utils/format'
import { removeDiacritics } from '@/lib/utils/slugify'

type Profile = {
  id: string
  full_name: string
  role: string
  phone: string | null
  is_active: boolean
  created_at: string
  base_salary_monthly: number | string | null
  standard_work_days: number | null
}
type Attendance = {
  id: string
  staff_id: string
  check_in_time: string | null
  check_out_time: string | null
  total_hours: number | null
  staff: { id: string; full_name: string; role: string } | null
}
type MonthAttendance = {
  staff_id: string
  total_hours: number | null
  attendance_date: string
}

type RoleFilter = '' | 'chu_trai' | 'nhan_vien'
type ActiveFilter = '' | 'on' | 'off'
type TodayFilter = '' | 'in' | 'done' | 'pending'
type SortKey = 'newest' | 'name' | 'role' | 'salary' | 'hours'
type ViewMode = 'grid' | 'list'

const ROLE_META: Record<string, { label: string; emoji: string; cls: string; bar: string }> = {
  chu_trai: {
    label: 'Chủ trại',
    emoji: '👑',
    cls: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
    bar: 'from-amber-400 to-orange-500',
  },
  nhan_vien: {
    label: 'Nhân viên',
    emoji: '👷',
    cls: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900',
    bar: 'from-blue-400 to-indigo-500',
  },
}

function getInitials(name: string): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

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

function timeOnly(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

export function StaffPanel({
  isAdmin,
  currentUserId,
  profiles,
  todayAttendance,
  monthAttendance,
}: {
  isAdmin: boolean
  currentUserId: string
  profiles: Profile[]
  todayAttendance: Attendance[]
  monthAttendance: MonthAttendance[]
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const [q, setQ] = useState('')
  const [role, setRole] = useState<RoleFilter>('')
  const [active, setActive] = useState<ActiveFilter>('')
  const [today, setToday] = useState<TodayFilter>('')
  const [sortKey, setSortKey] = useState<SortKey>('newest')
  const [view, setView] = useState<ViewMode>('grid')

  const myAttendance = todayAttendance.find((a) => a.staff_id === currentUserId)
  const canCheckIn = !myAttendance
  const canCheckOut = myAttendance && !myAttendance.check_out_time

  async function handleAttendance(action: 'check_in' | 'check_out') {
    setLoading(true)
    setErr(null)
    const res = await fetch('/api/staff/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    const json = await res.json()
    if (!res.ok) {
      setErr(typeof json.error === 'string' ? json.error : 'Lỗi')
      setLoading(false)
      return
    }
    setLoading(false)
    router.refresh()
  }

  const todayMap = useMemo(() => {
    const m = new Map<string, Attendance>()
    for (const a of todayAttendance) m.set(a.staff_id, a)
    return m
  }, [todayAttendance])

  const monthStats = useMemo(() => {
    const map = new Map<string, { days: number; hours: number }>()
    for (const m of monthAttendance) {
      const cur = map.get(m.staff_id) ?? { days: 0, hours: 0 }
      cur.days += 1
      cur.hours += Number(m.total_hours ?? 0)
      map.set(m.staff_id, cur)
    }
    return map
  }, [monthAttendance])

  const qNorm = removeDiacritics(q.trim())

  const filtered = useMemo(() => {
    const out = profiles.filter((p) => {
      if (qNorm) {
        const hay = removeDiacritics(`${p.full_name} ${p.phone ?? ''}`)
        if (!hay.includes(qNorm)) return false
      }
      if (role && p.role !== role) return false
      if (active === 'on' && !p.is_active) return false
      if (active === 'off' && p.is_active) return false
      if (today) {
        const att = todayMap.get(p.id)
        if (today === 'pending' && att) return false
        if (today === 'in' && (!att || att.check_out_time)) return false
        if (today === 'done' && (!att || !att.check_out_time)) return false
      }
      return true
    })
    out.sort((a, b) => {
      if (sortKey === 'name') return a.full_name.localeCompare(b.full_name, 'vi')
      if (sortKey === 'role') {
        // chu_trai first
        if (a.role !== b.role) return a.role === 'chu_trai' ? -1 : 1
        return a.full_name.localeCompare(b.full_name, 'vi')
      }
      if (sortKey === 'salary') {
        return Number(b.base_salary_monthly ?? 0) - Number(a.base_salary_monthly ?? 0)
      }
      if (sortKey === 'hours') {
        const ha = monthStats.get(a.id)?.hours ?? 0
        const hb = monthStats.get(b.id)?.hours ?? 0
        return hb - ha
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
    return out
  }, [profiles, qNorm, role, active, today, sortKey, todayMap, monthStats])

  const stats = useMemo(() => {
    const total = profiles.length
    const activeCount = profiles.filter((p) => p.is_active).length
    const checkedIn = todayAttendance.length
    const online = todayAttendance.filter((a) => !a.check_out_time && a.check_in_time).length
    const totalSalary = profiles
      .filter((p) => p.is_active)
      .reduce((s, p) => s + Number(p.base_salary_monthly ?? 0), 0)
    return { total, activeCount, checkedIn, online, totalSalary }
  }, [profiles, todayAttendance])

  const hasFilter = Boolean(q || role || active || today)
  function resetFilters() {
    setQ('')
    setRole('')
    setActive('')
    setToday('')
    setSortKey('newest')
  }

  return (
    <div className="space-y-4">
      <SelfCheckInCard
        myAttendance={myAttendance}
        canCheckIn={canCheckIn}
        canCheckOut={!!canCheckOut}
        loading={loading}
        err={err}
        onCheckIn={() => handleAttendance('check_in')}
        onCheckOut={() => handleAttendance('check_out')}
      />

      {isAdmin && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <Kpi label="Tổng nhân sự" value={String(stats.total)} icon="👥" tone="from-slate-500 to-slate-600" />
            <Kpi label="Đang hoạt động" value={String(stats.activeCount)} icon="✓" tone="from-emerald-500 to-teal-500" />
            <Kpi label="Chấm công hôm nay" value={`${stats.checkedIn}/${stats.activeCount}`} icon="📅" tone="from-blue-500 to-indigo-500" />
            <Kpi label="Đang làm việc" value={String(stats.online)} icon="🟢" tone="from-amber-500 to-orange-500" pulse={stats.online > 0} />
            <Kpi label="Quỹ lương cơ bản" value={formatVnd(stats.totalSalary)} icon="💰" tone="from-violet-500 to-purple-600" small />
          </div>

          <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="relative flex-1 min-w-0">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Tìm theo tên, số điện thoại…"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as RoleFilter)}
                  className="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2"
                >
                  <option value="">Tất cả vai trò</option>
                  <option value="chu_trai">👑 Chủ trại</option>
                  <option value="nhan_vien">👷 Nhân viên</option>
                </select>
                <select
                  value={active}
                  onChange={(e) => setActive(e.target.value as ActiveFilter)}
                  className="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2"
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="on">✓ Đang hoạt động</option>
                  <option value="off">✗ Đã khóa</option>
                </select>
                <select
                  value={today}
                  onChange={(e) => setToday(e.target.value as TodayFilter)}
                  className="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2"
                >
                  <option value="">Hôm nay: tất cả</option>
                  <option value="in">🟢 Đang làm</option>
                  <option value="done">✅ Đã hoàn tất</option>
                  <option value="pending">⏳ Chưa chấm</option>
                </select>
                {hasFilter && (
                  <button
                    onClick={resetFilters}
                    className="text-sm text-rose-600 dark:text-rose-400 hover:underline px-2"
                  >
                    Bỏ lọc
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
              <div className="flex flex-wrap gap-1.5">
                {[
                  { k: 'newest' as const, label: '🆕 Mới nhất' },
                  { k: 'name' as const, label: '🔤 Tên A→Z' },
                  { k: 'role' as const, label: '⭐ Vai trò' },
                  { k: 'hours' as const, label: '⏱️ Giờ công tháng' },
                  { k: 'salary' as const, label: '💵 Lương cao' },
                ].map((s) => {
                  const active = sortKey === s.k
                  return (
                    <button
                      key={s.k}
                      onClick={() => setSortKey(s.k)}
                      className={
                        'px-3 py-1.5 rounded-full text-xs font-medium border transition ' +
                        (active
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-transparent shadow'
                          : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-400')
                      }
                    >
                      {s.label}
                    </button>
                  )
                })}
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-500 dark:text-gray-400">
                  Hiện <strong className="text-gray-900 dark:text-gray-100">{filtered.length}</strong>/
                  {profiles.length}
                </span>
                <div className="flex border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setView('grid')}
                    className={
                      'px-3 py-1.5 ' +
                      (view === 'grid'
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                        : 'bg-white dark:bg-gray-900 text-gray-500')
                    }
                  >
                    ▦ Lưới
                  </button>
                  <button
                    onClick={() => setView('list')}
                    className={
                      'px-3 py-1.5 ' +
                      (view === 'list'
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                        : 'bg-white dark:bg-gray-900 text-gray-500')
                    }
                  >
                    ☰ Danh sách
                  </button>
                </div>
              </div>
            </div>
          </section>

          {filtered.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 text-center">
              <div className="text-4xl mb-2">🔍</div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                Không có nhân sự nào khớp bộ lọc.
              </p>
              {hasFilter && (
                <button
                  onClick={resetFilters}
                  className="text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2"
                >
                  Bỏ tất cả bộ lọc
                </button>
              )}
            </div>
          ) : view === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filtered.map((p) => (
                <StaffCard
                  key={p.id}
                  profile={p}
                  attendance={todayMap.get(p.id) ?? null}
                  monthDays={monthStats.get(p.id)?.days ?? 0}
                  monthHours={monthStats.get(p.id)?.hours ?? 0}
                  isMe={p.id === currentUserId}
                />
              ))}
            </div>
          ) : (
            <StaffListView
              rows={filtered}
              todayMap={todayMap}
              monthStats={monthStats}
              currentUserId={currentUserId}
            />
          )}

          <TodayAttendanceSection rows={todayAttendance} />
        </>
      )}
    </div>
  )
}

function SelfCheckInCard({
  myAttendance,
  canCheckIn,
  canCheckOut,
  loading,
  err,
  onCheckIn,
  onCheckOut,
}: {
  myAttendance: Attendance | undefined
  canCheckIn: boolean
  canCheckOut: boolean
  loading: boolean
  err: string | null
  onCheckIn: () => void
  onCheckOut: () => void
}) {
  const inTime = myAttendance?.check_in_time
  const outTime = myAttendance?.check_out_time

  let liveHours = 0
  if (inTime && !outTime) {
    liveHours = (Date.now() - new Date(inTime).getTime()) / (1000 * 60 * 60)
  }

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/40 dark:via-indigo-950/40 dark:to-purple-950/40 border border-blue-200 dark:border-blue-900 rounded-xl p-4">
      <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-blue-300/30 blur-3xl" />
      <div className="absolute -left-10 -bottom-10 w-40 h-40 rounded-full bg-purple-300/30 blur-3xl" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">📅</span>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Chấm công hôm nay
          </h2>
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
            {new Date().toLocaleDateString('vi-VN', {
              weekday: 'long',
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })}
          </span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex-1 grid grid-cols-3 gap-2">
            <SelfStat
              label="Check-in"
              value={timeOnly(inTime ?? null)}
              tone={inTime ? 'green' : 'gray'}
            />
            <SelfStat
              label="Check-out"
              value={timeOnly(outTime ?? null)}
              tone={outTime ? 'red' : 'gray'}
            />
            <SelfStat
              label={outTime ? 'Tổng giờ' : 'Đang làm'}
              value={
                outTime
                  ? `${myAttendance?.total_hours ?? 0}h`
                  : inTime
                    ? `${liveHours.toFixed(1)}h`
                    : '—'
              }
              tone={outTime ? 'blue' : inTime ? 'amber' : 'gray'}
              pulse={!!inTime && !outTime}
            />
          </div>

          <div className="flex gap-2">
            {canCheckIn && (
              <button
                onClick={onCheckIn}
                disabled={loading}
                className="bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-lg px-5 py-2.5 font-semibold shadow hover:shadow-lg transition disabled:opacity-50"
              >
                {loading ? '...' : '🟢 Check-in ngay'}
              </button>
            )}
            {canCheckOut && (
              <button
                onClick={onCheckOut}
                disabled={loading}
                className="bg-gradient-to-r from-rose-500 to-red-600 text-white rounded-lg px-5 py-2.5 font-semibold shadow hover:shadow-lg transition disabled:opacity-50"
              >
                {loading ? '...' : '🔴 Check-out'}
              </button>
            )}
            {!canCheckIn && !canCheckOut && myAttendance && (
              <div className="text-sm text-emerald-700 dark:text-emerald-400 font-medium px-3 py-2.5">
                ✓ Hoàn tất ca làm
              </div>
            )}
          </div>
        </div>

        {err && (
          <div className="mt-3 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded px-3 py-2">
            {err}
          </div>
        )}
      </div>
    </section>
  )
}

function SelfStat({
  label,
  value,
  tone,
  pulse,
}: {
  label: string
  value: string
  tone: 'green' | 'red' | 'blue' | 'amber' | 'gray'
  pulse?: boolean
}) {
  const cls: Record<string, string> = {
    green: 'border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300',
    red: 'border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300',
    blue: 'border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300',
    amber: 'border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-300',
    gray: 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400',
  }
  return (
    <div className={`rounded-lg bg-white/70 dark:bg-gray-900/60 border ${cls[tone]} px-3 py-2`}>
      <div className="text-[10.5px] uppercase tracking-wide opacity-70">{label}</div>
      <div className={'text-base font-bold tabular-nums ' + (pulse ? 'animate-pulse' : '')}>
        {value}
      </div>
    </div>
  )
}

function StaffCard({
  profile,
  attendance,
  monthDays,
  monthHours,
  isMe,
}: {
  profile: Profile
  attendance: Attendance | null
  monthDays: number
  monthHours: number
  isMe: boolean
}) {
  const meta = ROLE_META[profile.role] ?? ROLE_META.nhan_vien
  const initials = getInitials(profile.full_name)
  const avatar = avatarColor(profile.id)

  let todayBadge: { text: string; cls: string } | null = null
  if (attendance?.check_out_time) {
    todayBadge = {
      text: `✅ Đã hoàn tất · ${attendance.total_hours ?? 0}h`,
      cls: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
    }
  } else if (attendance?.check_in_time) {
    todayBadge = {
      text: `🟢 Đang làm · từ ${timeOnly(attendance.check_in_time)}`,
      cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 animate-pulse',
    }
  } else if (profile.is_active) {
    todayBadge = {
      text: '⏳ Chưa chấm công',
      cls: 'bg-gray-100 text-gray-600 dark:bg-gray-900/60 dark:text-gray-400',
    }
  }

  return (
    <div
      className={
        'group relative bg-white dark:bg-gray-800 border rounded-xl overflow-hidden hover:shadow-lg transition ' +
        (isMe
          ? 'border-blue-400 dark:border-blue-600 ring-2 ring-blue-200 dark:ring-blue-900'
          : 'border-gray-200 dark:border-gray-700')
      }
    >
      <div className={`h-1.5 bg-gradient-to-r ${meta.bar}`} />
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div
            className={`flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br ${avatar} text-white font-bold flex items-center justify-center text-base shadow`}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                {profile.full_name}
              </h3>
              {isMe && (
                <span className="text-[10px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded">
                  BẠN
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span className={`text-[11px] px-2 py-0.5 rounded-full border ${meta.cls}`}>
                {meta.emoji} {meta.label}
              </span>
              {!profile.is_active && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                  ✗ Đã khóa
                </span>
              )}
            </div>
          </div>
        </div>

        {todayBadge && (
          <div className={`mt-3 text-xs font-medium px-2.5 py-1.5 rounded-lg text-center ${todayBadge.cls}`}>
            {todayBadge.text}
          </div>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-gray-50 dark:bg-gray-900/60 px-2.5 py-1.5">
            <div className="text-[10px] uppercase text-gray-500">Ngày công tháng</div>
            <div className="font-semibold text-gray-900 dark:text-gray-100">
              {monthDays} ngày
            </div>
          </div>
          <div className="rounded-lg bg-gray-50 dark:bg-gray-900/60 px-2.5 py-1.5">
            <div className="text-[10px] uppercase text-gray-500">Giờ công tháng</div>
            <div className="font-semibold text-gray-900 dark:text-gray-100">
              {monthHours.toFixed(1)}h
            </div>
          </div>
        </div>

        <div className="mt-3 space-y-1 text-xs text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-1.5">
            <span>📞</span>
            <span className="truncate">{profile.phone || '—'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>💵</span>
            <span>
              {Number(profile.base_salary_monthly ?? 0) > 0
                ? formatVnd(Number(profile.base_salary_monthly))
                : '— chưa thiết lập'}
              {profile.standard_work_days ? (
                <span className="text-gray-400"> · chuẩn {profile.standard_work_days} ngày</span>
              ) : null}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>📅</span>
            <span>Tham gia {formatDate(profile.created_at)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function StaffListView({
  rows,
  todayMap,
  monthStats,
  currentUserId,
}: {
  rows: Profile[]
  todayMap: Map<string, Attendance>
  monthStats: Map<string, { days: number; hours: number }>
  currentUserId: string
}) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900 text-xs uppercase text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-3 py-2.5 text-left">Nhân sự</th>
              <th className="px-3 py-2.5 text-left">Vai trò</th>
              <th className="px-3 py-2.5 text-left">Hôm nay</th>
              <th className="px-3 py-2.5 text-right">Ngày / Giờ tháng</th>
              <th className="px-3 py-2.5 text-right">Lương cơ bản</th>
              <th className="px-3 py-2.5 text-left">SĐT</th>
              <th className="px-3 py-2.5 text-left">Tham gia</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const meta = ROLE_META[p.role] ?? ROLE_META.nhan_vien
              const att = todayMap.get(p.id)
              const ms = monthStats.get(p.id) ?? { days: 0, hours: 0 }
              return (
                <tr
                  key={p.id}
                  className={
                    'border-t border-gray-100 dark:border-gray-700 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 ' +
                    (p.id === currentUserId ? 'bg-blue-50/60 dark:bg-blue-950/20' : '')
                  }
                >
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarColor(
                          p.id
                        )} text-white text-xs font-bold flex items-center justify-center`}
                      >
                        {getInitials(p.full_name)}
                      </div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {p.full_name}
                        {p.id === currentUserId && (
                          <span className="ml-1.5 text-[10px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded">
                            BẠN
                          </span>
                        )}
                        {!p.is_active && (
                          <span className="ml-1.5 text-[10px] text-rose-600">(khóa)</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <span className={`px-2 py-0.5 rounded-full border ${meta.cls}`}>
                      {meta.emoji} {meta.label}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {att?.check_out_time ? (
                      <span className="text-blue-700 dark:text-blue-300">
                        ✅ {timeOnly(att.check_in_time)} → {timeOnly(att.check_out_time)} ·{' '}
                        {att.total_hours ?? 0}h
                      </span>
                    ) : att?.check_in_time ? (
                      <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                        🟢 Đang làm · từ {timeOnly(att.check_in_time)}
                      </span>
                    ) : p.is_active ? (
                      <span className="text-gray-400">⏳ Chưa chấm</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    <span className="font-semibold">{ms.days}</span>
                    <span className="text-gray-400"> · {ms.hours.toFixed(1)}h</span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-700 dark:text-gray-300">
                    {Number(p.base_salary_monthly ?? 0) > 0
                      ? formatVnd(Number(p.base_salary_monthly))
                      : '—'}
                  </td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{p.phone ?? '—'}</td>
                  <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                    {formatDate(p.created_at)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TodayAttendanceSection({ rows }: { rows: Attendance[] }) {
  if (rows.length === 0) {
    return (
      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 text-center">
        <div className="text-3xl mb-1">🌙</div>
        <p className="text-sm text-gray-500 dark:text-gray-400 italic">
          Chưa có ai check-in hôm nay.
        </p>
      </section>
    )
  }

  const working = rows.filter((a) => a.check_in_time && !a.check_out_time)
  const done = rows.filter((a) => a.check_out_time)

  return (
    <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          📋 Chấm công hôm nay
        </h2>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {rows.length} người · {working.length} đang làm · {done.length} hoàn tất
        </span>
      </div>
      <ul className="space-y-2">
        {rows.map((a) => {
          const meta = ROLE_META[a.staff?.role ?? 'nhan_vien'] ?? ROLE_META.nhan_vien
          const isOut = !!a.check_out_time
          return (
            <li
              key={a.id}
              className={
                'border rounded-lg p-2.5 flex items-center justify-between gap-3 ' +
                (isOut
                  ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900'
                  : 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900')
              }
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarColor(
                    a.staff_id
                  )} text-white text-xs font-bold flex items-center justify-center flex-shrink-0`}
                >
                  {getInitials(a.staff?.full_name ?? '')}
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                    {a.staff?.full_name ?? '—'}
                  </div>
                  <span className={`text-[10.5px] px-1.5 py-0.5 rounded-full border ${meta.cls}`}>
                    {meta.emoji} {meta.label}
                  </span>
                </div>
              </div>
              <div className="text-xs text-right tabular-nums">
                {isOut ? (
                  <>
                    <div className="text-blue-700 dark:text-blue-300 font-semibold">
                      ✅ {a.total_hours ?? 0}h
                    </div>
                    <div className="text-gray-500 dark:text-gray-400">
                      {timeOnly(a.check_in_time)} → {timeOnly(a.check_out_time)}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-emerald-700 dark:text-emerald-300 font-semibold animate-pulse">
                      🟢 Đang làm
                    </div>
                    <div className="text-gray-500 dark:text-gray-400">
                      Từ {timeOnly(a.check_in_time)}
                    </div>
                  </>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function Kpi({
  label,
  value,
  icon,
  tone,
  pulse,
  small,
}: {
  label: string
  value: string
  icon: string
  tone: string
  pulse?: boolean
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
      </div>
    </div>
  )
}
