'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils/format'
import { removeDiacritics } from '@/lib/utils/slugify'

export type VacItem = {
  vaccination_id: string
  scheduled_date: string
  chicken_id: string
  chicken_code: string
  chicken_name: string | null
  cage_code: string | null
  area_name: string | null
  vaccine_code: string
  vaccine_name: string
  is_required: boolean
  days_overdue: number
}

type Area = { code: string; name_vi: string }
type RangeFilter = '' | 'overdue' | 'today' | 'week' | 'next_30'
type SortKey = 'date_asc' | 'date_desc' | 'overdue_desc' | 'vaccine' | 'chicken'
type GroupBy = 'none' | 'vaccine' | 'date'

export function VaccinationsClient({
  items,
  areas,
  todayIso,
}: {
  items: VacItem[]
  areas: Area[]
  todayIso: string
}) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [range, setRange] = useState<RangeFilter>('')
  const [vaccineFilter, setVaccineFilter] = useState('')
  const [areaFilter, setAreaFilter] = useState('')
  const [requiredOnly, setRequiredOnly] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('date_asc')
  const [groupBy, setGroupBy] = useState<GroupBy>('none')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [batch, setBatch] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const today = todayIso
  const week = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

  const qNorm = removeDiacritics(q.trim())

  const filtered = useMemo(() => {
    const out = items.filter((v) => {
      if (qNorm) {
        const hay = removeDiacritics(
          `${v.chicken_code} ${v.chicken_name ?? ''} ${v.vaccine_code} ${v.vaccine_name} ${v.area_name ?? ''} ${v.cage_code ?? ''}`
        )
        if (!hay.includes(qNorm)) return false
      }
      if (range === 'overdue' && v.days_overdue <= 0) return false
      if (range === 'today' && v.scheduled_date !== today) return false
      if (range === 'week' && v.scheduled_date > week) return false
      if (range === 'next_30' && v.scheduled_date <= today) return false
      if (vaccineFilter && v.vaccine_code !== vaccineFilter) return false
      if (areaFilter && v.area_name !== areaFilter) return false
      if (requiredOnly && !v.is_required) return false
      return true
    })

    const sorted = [...out]
    if (sortKey === 'date_asc') sorted.sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
    else if (sortKey === 'date_desc') sorted.sort((a, b) => b.scheduled_date.localeCompare(a.scheduled_date))
    else if (sortKey === 'overdue_desc') sorted.sort((a, b) => b.days_overdue - a.days_overdue)
    else if (sortKey === 'vaccine') sorted.sort((a, b) => a.vaccine_name.localeCompare(b.vaccine_name, 'vi'))
    else if (sortKey === 'chicken')
      sorted.sort((a, b) => (a.chicken_name ?? a.chicken_code).localeCompare(b.chicken_name ?? b.chicken_code, 'vi'))
    return sorted
  }, [items, qNorm, range, vaccineFilter, areaFilter, requiredOnly, sortKey, today, week])

  // Distinct vaccines for filter dropdown
  const vaccineOptions = useMemo(() => {
    const m = new Map<string, string>()
    for (const v of items) m.set(v.vaccine_code, v.vaccine_name)
    return [...m.entries()].sort(([, a], [, b]) => a.localeCompare(b, 'vi'))
  }, [items])

  // KPIs (live from filtered)
  const total = items.length
  const overdueCount = items.filter((v) => v.days_overdue > 0).length
  const todayCount = items.filter((v) => v.scheduled_date === today).length
  const weekCount = items.filter((v) => v.scheduled_date >= today && v.scheduled_date <= week).length
  const requiredCount = items.filter((v) => v.is_required && v.days_overdue >= 0).length

  const hasFilter = !!(q || range || vaccineFilter || areaFilter || requiredOnly)

  function clearFilters() {
    setQ('')
    setRange('')
    setVaccineFilter('')
    setAreaFilter('')
    setRequiredOnly(false)
  }

  function toggle(id: string) {
    setSelected((p) => {
      const n = new Set(p)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  function toggleAllVisible() {
    const visibleIds = filtered.map((v) => v.vaccination_id)
    const allSelected = visibleIds.every((id) => selected.has(id))
    setSelected((p) => {
      const n = new Set(p)
      if (allSelected) visibleIds.forEach((id) => n.delete(id))
      else visibleIds.forEach((id) => n.add(id))
      return n
    })
  }

  async function confirm() {
    if (selected.size === 0) return
    setConfirming(true)
    setErr(null)
    const res = await fetch('/api/vaccinations/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vaccination_ids: Array.from(selected),
        batch_number: batch || undefined,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      setErr(typeof json.error === 'string' ? json.error : 'Lỗi xác nhận')
      setConfirming(false)
      return
    }
    setSelected(new Set())
    setBatch('')
    setConfirming(false)
    router.refresh()
  }

  // Grouped data for grouped views
  const groupedByVaccine = useMemo(() => {
    if (groupBy !== 'vaccine') return null
    const m = new Map<string, { code: string; name: string; items: VacItem[] }>()
    for (const v of filtered) {
      const cur = m.get(v.vaccine_code) ?? { code: v.vaccine_code, name: v.vaccine_name, items: [] }
      cur.items.push(v)
      m.set(v.vaccine_code, cur)
    }
    return [...m.values()].sort((a, b) => b.items.length - a.items.length)
  }, [filtered, groupBy])

  const groupedByDate = useMemo(() => {
    if (groupBy !== 'date') return null
    const m = new Map<string, VacItem[]>()
    for (const v of filtered) {
      const arr = m.get(v.scheduled_date) ?? []
      arr.push(v)
      m.set(v.scheduled_date, arr)
    }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [filtered, groupBy])

  return (
    <div className="space-y-4">
      {/* KPI hiển thị ở VaccinationHero (page level) — không lặp ở đây */}

      {/* Alert overdue */}
      {overdueCount > 0 && range !== 'overdue' && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-900 rounded-lg p-3 flex items-center gap-3">
          <span className="text-2xl">🚨</span>
          <div className="flex-1 text-sm">
            <b className="text-red-700 dark:text-red-300">{overdueCount} mũi tiêm</b> đã quá hạn — cần xử lý gấp để tránh ảnh hưởng sức khỏe đàn.
            <button
              onClick={() => setRange('overdue')}
              className="ml-2 text-red-700 dark:text-red-300 underline font-semibold"
            >
              Xem ngay →
            </button>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">🔍 Lọc thông minh</h2>
          {hasFilter && (
            <button
              onClick={clearFilters}
              className="text-xs text-red-600 dark:text-red-400 hover:underline font-semibold ml-auto"
            >
              ✕ Xóa lọc
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 md:gap-3">
          <div className="relative md:col-span-2">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">🔍</span>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tên/mã gà, vaccine, khu, chuồng..."
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg pl-9 pr-3 py-2 text-sm outline-none"
            />
          </div>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as RangeFilter)}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">📅 Mọi mốc</option>
            <option value="overdue">🚨 Quá hạn</option>
            <option value="today">📌 Hôm nay</option>
            <option value="week">📆 Trong tuần</option>
            <option value="next_30">⏰ 30 ngày tới</option>
          </select>
          <select
            value={vaccineFilter}
            onChange={(e) => setVaccineFilter(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">💉 Mọi vaccine</option>
            {vaccineOptions.map(([code, name]) => (
              <option key={code} value={code}>{name}</option>
            ))}
          </select>
          <select
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">🏠 Mọi khu</option>
            {areas.map((a) => (
              <option key={a.code} value={a.name_vi}>
                Khu {a.code} · {a.name_vi}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={requiredOnly}
              onChange={(e) => setRequiredOnly(e.target.checked)}
              className="w-4 h-4 accent-red-600"
            />
            <span className="font-semibold text-gray-700 dark:text-gray-300">⭐ Chỉ vaccine bắt buộc</span>
          </label>

          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-auto">
            Sắp xếp:
          </span>
          {(
            [
              ['date_asc', '📅 Sớm nhất'],
              ['overdue_desc', '🚨 Quá hạn nhiều nhất'],
              ['vaccine', '💉 Theo vaccine'],
              ['chicken', '🐓 Theo gà'],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setSortKey(k)}
              className={`text-xs px-2.5 py-1 rounded-full font-semibold transition ${
                sortKey === k
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-2 flex-wrap pt-3 border-t border-gray-100 dark:border-gray-700">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Nhóm:
          </span>
          {(
            [
              ['none', '📋 Liệt kê phẳng'],
              ['vaccine', '💉 Gom theo vaccine'],
              ['date', '📅 Gom theo ngày'],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setGroupBy(k)}
              className={`text-xs px-2.5 py-1 rounded-full font-semibold transition ${
                groupBy === k
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              {l}
            </button>
          ))}
          <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
            <b className="text-gray-900 dark:text-gray-100">{filtered.length}</b> mũi · Đã chọn{' '}
            <b className="text-blue-600 dark:text-blue-400">{selected.size}</b>
          </span>
        </div>
      </div>

      {/* Action bar */}
      {filtered.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 shadow-sm flex items-center gap-3 flex-wrap">
          <button
            onClick={toggleAllVisible}
            className="text-xs px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/60 font-semibold"
          >
            {filtered.every((v) => selected.has(v.vaccination_id)) ? '☐ Bỏ chọn hiển thị' : `☑ Chọn tất cả (${filtered.length})`}
          </button>
          {selected.size > 0 && (
            <button
              onClick={() => setSelected(new Set())}
              className="text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 font-semibold"
            >
              ✕ Bỏ chọn tất
            </button>
          )}
        </div>
      )}

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 md:p-12 text-center">
          <div className="text-5xl mb-2">🎉</div>
          <p className="text-gray-600 dark:text-gray-400 text-lg font-semibold">
            {items.length === 0 ? 'Không có mũi tiêm nào trong 30 ngày tới' : 'Không có mũi tiêm nào khớp tiêu chí'}
          </p>
          {hasFilter && items.length > 0 && (
            <button
              onClick={clearFilters}
              className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline font-semibold"
            >
              Bỏ tất cả bộ lọc
            </button>
          )}
        </div>
      ) : groupBy === 'vaccine' && groupedByVaccine ? (
        <div className="space-y-3">
          {groupedByVaccine.map((g) => (
            <GroupCard
              key={g.code}
              title={`💉 ${g.name}`}
              code={g.code}
              count={g.items.length}
              tint="purple"
            >
              <ItemsTable items={g.items} selected={selected} onToggle={toggle} />
            </GroupCard>
          ))}
        </div>
      ) : groupBy === 'date' && groupedByDate ? (
        <div className="space-y-3">
          {groupedByDate.map(([date, arr]) => {
            const isToday = date === today
            const isOverdue = date < today
            const dateLabel = isToday
              ? '📌 Hôm nay'
              : isOverdue
                ? `🚨 ${formatDate(date)} (quá hạn)`
                : `📅 ${formatDate(date)}`
            return (
              <GroupCard
                key={date}
                title={dateLabel}
                count={arr.length}
                tint={isOverdue ? 'red' : isToday ? 'amber' : 'blue'}
              >
                <ItemsTable items={arr} selected={selected} onToggle={toggle} />
              </GroupCard>
            )
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
          <ItemsTable items={filtered} selected={selected} onToggle={toggle} />
        </div>
      )}

      {/* Confirm dock */}
      {selected.size > 0 && (
        <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-96 bg-white dark:bg-gray-800 border-2 border-blue-500 dark:border-blue-600 shadow-2xl rounded-xl p-4 z-30">
          <div className="text-sm font-bold mb-2 flex items-center gap-2">
            <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
              {selected.size}
            </span>
            <span>mũi tiêm sẽ được xác nhận</span>
          </div>
          <input
            type="text"
            placeholder="Số lô vaccine (tuỳ chọn)"
            value={batch}
            onChange={(e) => setBatch(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm mb-2"
          />
          {err && <div className="text-xs text-red-600 dark:text-red-400 mb-2">⚠ {err}</div>}
          <div className="flex gap-2">
            <button
              onClick={confirm}
              disabled={confirming}
              className="flex-1 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-lg py-2 text-sm font-bold disabled:opacity-50"
            >
              {confirming ? 'Đang xác nhận...' : '✓ Xác nhận tiêm'}
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 text-sm"
            >
              Hủy
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function GroupCard({
  title,
  code,
  count,
  tint,
  children,
}: {
  title: string
  code?: string
  count: number
  tint: 'red' | 'amber' | 'blue' | 'purple'
  children: React.ReactNode
}) {
  const map: Record<string, string> = {
    red: 'from-red-600 to-rose-600',
    amber: 'from-amber-500 to-orange-600',
    blue: 'from-blue-600 to-indigo-600',
    purple: 'from-purple-600 to-fuchsia-600',
  }
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
      <div className={`bg-gradient-to-r ${map[tint]} text-white px-4 py-2.5 flex items-center justify-between gap-2`}>
        <h3 className="font-bold text-sm">
          {title}
          {code && <span className="ml-2 text-[10px] font-mono opacity-80">[{code}]</span>}
        </h3>
        <span className="bg-white/20 rounded-full px-2.5 py-0.5 text-xs font-bold">{count} mũi</span>
      </div>
      {children}
    </div>
  )
}

function ItemsTable({
  items,
  selected,
  onToggle,
}: {
  items: VacItem[]
  selected: Set<string>
  onToggle: (id: string) => void
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[800px]">
        <thead className="bg-gray-50 dark:bg-gray-900/60 text-[11px] uppercase text-gray-500 dark:text-gray-400">
          <tr>
            <th className="px-3 py-2.5 w-10"></th>
            <th className="px-3 py-2.5 text-left">Gà</th>
            <th className="px-3 py-2.5 text-left">Vị trí</th>
            <th className="px-3 py-2.5 text-left">Vaccine</th>
            <th className="px-3 py-2.5 text-left">Lịch tiêm</th>
            <th className="px-3 py-2.5 text-center">Trạng thái</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {items.map((v) => {
            const isSelected = selected.has(v.vaccination_id)
            const isOverdue = v.days_overdue > 0
            const isToday = v.days_overdue === 0
            return (
              <tr
                key={v.vaccination_id}
                onClick={() => onToggle(v.vaccination_id)}
                className={`cursor-pointer transition ${
                  isSelected
                    ? 'bg-blue-50 dark:bg-blue-950/40'
                    : isOverdue
                      ? 'bg-red-50/40 dark:bg-red-950/20 hover:bg-red-50 dark:hover:bg-red-950/30'
                      : isToday
                        ? 'bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                        : 'hover:bg-gray-50/60 dark:hover:bg-gray-900/30'
                }`}
              >
                <td className="px-3 py-2 w-10">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      e.stopPropagation()
                      onToggle(v.vaccination_id)
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 accent-blue-600"
                  />
                </td>
                <td className="px-3 py-2">
                  <Link
                    href={`/admin/ho-so-ga/${v.chicken_id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {v.chicken_name ?? v.chicken_code}
                  </Link>
                  <div className="text-[11px] font-mono text-gray-400 dark:text-gray-500">
                    {v.chicken_code}
                  </div>
                </td>
                <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400">
                  {v.area_name && <div>🏠 {v.area_name}</div>}
                  {v.cage_code && <div className="font-mono">📦 {v.cage_code}</div>}
                  {!v.area_name && !v.cage_code && '—'}
                </td>
                <td className="px-3 py-2">
                  <div className="font-medium flex items-center gap-1.5">
                    <span>💉</span>
                    <span>{v.vaccine_name}</span>
                    {v.is_required && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 font-bold">
                        ★ BẮT BUỘC
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-gray-400 dark:text-gray-500">
                    {v.vaccine_code}
                  </div>
                </td>
                <td className="px-3 py-2 text-xs whitespace-nowrap">
                  <span
                    className={
                      isOverdue
                        ? 'font-bold text-red-700 dark:text-red-300'
                        : isToday
                          ? 'font-bold text-amber-700 dark:text-amber-300'
                          : 'text-gray-700 dark:text-gray-300'
                    }
                  >
                    {formatDate(v.scheduled_date)}
                  </span>
                </td>
                <td className="px-3 py-2 text-center">
                  {isOverdue ? (
                    <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 font-bold">
                      🚨 Trễ {v.days_overdue} ngày
                    </span>
                  ) : isToday ? (
                    <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-bold">
                      ⏰ Hôm nay
                    </span>
                  ) : (
                    <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold">
                      Còn {-v.days_overdue} ngày
                    </span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function Kpi({
  label,
  value,
  sub,
  tint,
  icon,
}: {
  label: string
  value: string
  sub?: string
  tint: 'blue' | 'red' | 'amber' | 'purple'
  icon: string
}) {
  const map: Record<string, string> = {
    blue: 'from-blue-500 to-indigo-600',
    red: 'from-red-500 to-rose-600',
    amber: 'from-amber-500 to-orange-600',
    purple: 'from-purple-500 to-fuchsia-600',
  }
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-sm relative overflow-hidden">
      <div className={`absolute top-0 right-0 w-14 h-14 rounded-full bg-gradient-to-br ${map[tint]} opacity-10 -translate-y-4 translate-x-4`} />
      <div className="flex items-start justify-between gap-2 relative">
        <div className="min-w-0">
          <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest truncate">
            {label}
          </div>
          <div className="text-xl md:text-2xl font-extrabold text-gray-900 dark:text-gray-100 mt-0.5 tabular-nums">
            {value}
          </div>
          {sub && <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5">{sub}</div>}
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  )
}
