'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils/format'
import { removeDiacritics } from '@/lib/utils/slugify'
import { getBreedColor } from '@/lib/utils/breed-colors'

export type LitterNode = {
  id: string
  litter_code: string
  paired_date: string
  expected_hatch_date: string | null
  hatched_date: string | null
  eggs_total: number
  eggs_fertile: number
  hatched_count: number
  status: string
  notes: string | null
  female_id: string | null
  female_code: string | null
  female_name: string | null
  breed_code: string | null
  breed_name: string | null
  fertile_rate: number | null
  hatch_rate: number | null
  days_left: number | null
  progress_pct: number
  elapsed_days: number
}

type Breed = { code: string; name_vi: string }
type StatusFilter = '' | 'dang_ap' | 'da_no' | 'that_bai' | 'sap_no' | 'qua_han'
type SortKey = 'paired_desc' | 'paired_asc' | 'hatch_soon' | 'hatch_rate_desc' | 'litter_code'
type ViewMode = 'grid' | 'list'

const STATUS_META: Record<string, { label: string; color: string; gradient: string }> = {
  dang_ap: {
    label: '🥚 Đang ấp',
    color: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300',
    gradient: 'from-yellow-400 to-amber-500',
  },
  da_no: {
    label: '🐣 Đã nở',
    color: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300',
    gradient: 'from-emerald-500 to-green-600',
  },
  that_bai: {
    label: '✗ Thất bại',
    color: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300',
    gradient: 'from-red-500 to-rose-600',
  },
}

export function SinhSanIndexClient({
  litters,
  breeds,
}: {
  litters: LitterNode[]
  breeds: Breed[]
}) {
  const [q, setQ] = useState('')
  const [breed, setBreed] = useState('')
  const [status, setStatus] = useState<StatusFilter>('')
  const [hatchRateMin, setHatchRateMin] = useState('')
  const [view, setView] = useState<ViewMode>('grid')
  const [sortKey, setSortKey] = useState<SortKey>('paired_desc')

  const qNorm = removeDiacritics(q.trim())

  const filtered = useMemo(() => {
    const out = litters.filter((l) => {
      if (qNorm) {
        const hay = removeDiacritics(
          `${l.litter_code} ${l.female_code ?? ''} ${l.female_name ?? ''} ${l.breed_name ?? ''} ${l.notes ?? ''}`
        )
        if (!hay.includes(qNorm)) return false
      }
      if (breed && l.breed_code !== breed) return false
      if (status === 'dang_ap' && l.status !== 'dang_ap') return false
      if (status === 'da_no' && l.status !== 'da_no') return false
      if (status === 'that_bai' && l.status !== 'that_bai') return false
      if (status === 'sap_no' && (l.status !== 'dang_ap' || l.days_left == null || l.days_left < 0 || l.days_left > 3))
        return false
      if (status === 'qua_han' && (l.status !== 'dang_ap' || l.days_left == null || l.days_left >= 0))
        return false
      if (hatchRateMin && (l.hatch_rate ?? 0) < parseFloat(hatchRateMin)) return false
      return true
    })

    const sorted = [...out]
    if (sortKey === 'paired_desc') sorted.sort((a, b) => b.paired_date.localeCompare(a.paired_date))
    else if (sortKey === 'paired_asc') sorted.sort((a, b) => a.paired_date.localeCompare(b.paired_date))
    else if (sortKey === 'hatch_soon') {
      // Đang ấp gần expected nhất lên trước
      sorted.sort((a, b) => {
        if (a.status !== 'dang_ap' && b.status !== 'dang_ap') return 0
        if (a.status !== 'dang_ap') return 1
        if (b.status !== 'dang_ap') return -1
        return (a.days_left ?? 999) - (b.days_left ?? 999)
      })
    } else if (sortKey === 'hatch_rate_desc')
      sorted.sort((a, b) => (b.hatch_rate ?? -1) - (a.hatch_rate ?? -1))
    else if (sortKey === 'litter_code')
      sorted.sort((a, b) => a.litter_code.localeCompare(b.litter_code))
    return sorted
  }, [litters, qNorm, breed, status, hatchRateMin, sortKey])

  // KPIs (live)
  const total = litters.length
  const incubating = litters.filter((l) => l.status === 'dang_ap').length
  const hatched = litters.filter((l) => l.status === 'da_no').length
  const failed = litters.filter((l) => l.status === 'that_bai').length
  const dueSoon = litters.filter(
    (l) => l.status === 'dang_ap' && l.days_left != null && l.days_left >= 0 && l.days_left <= 3
  ).length
  const overdue = litters.filter(
    (l) => l.status === 'dang_ap' && l.days_left != null && l.days_left < 0
  ).length

  const ratesWithData = litters.filter((l) => l.hatch_rate != null && l.status === 'da_no')
  const avgHatchRate =
    ratesWithData.length > 0
      ? Math.round(
          ratesWithData.reduce((s, l) => s + (l.hatch_rate ?? 0), 0) / ratesWithData.length
        )
      : null
  const totalChicks = litters.reduce((s, l) => s + l.hatched_count, 0)

  const hasFilter = !!(q || breed || status || hatchRateMin)

  function clearFilters() {
    setQ('')
    setBreed('')
    setStatus('')
    setHatchRateMin('')
  }

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Tổng lứa" value={total.toLocaleString('vi-VN')} sub={`${filtered.length} đang hiển thị`} tint="blue" icon="🥚" />
        <Kpi
          label="Đang ấp"
          value={incubating.toLocaleString('vi-VN')}
          sub={dueSoon > 0 ? `${dueSoon} sắp nở (≤3 ngày)` : 'Bình thường'}
          tint="amber"
          icon="🐤"
        />
        <Kpi
          label="Đã nở"
          value={hatched.toLocaleString('vi-VN')}
          sub={`${totalChicks} con đã ra đời`}
          tint="emerald"
          icon="🐣"
        />
        <Kpi
          label="Tỉ lệ nở TB"
          value={avgHatchRate != null ? `${avgHatchRate}%` : '—'}
          sub={failed > 0 ? `${failed} thất bại` : 'Theo lứa đã nở'}
          tint="purple"
          icon="📊"
        />
      </div>

      {/* Quick alert if overdue */}
      {overdue > 0 && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-900 rounded-lg p-3 flex items-center gap-3">
          <span className="text-2xl">🚨</span>
          <div className="flex-1 text-sm">
            <b className="text-red-700 dark:text-red-300">{overdue} lứa</b> đã quá ngày dự kiến nở mà chưa cập nhật.
            <button
              onClick={() => setStatus('qua_han')}
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
            <button onClick={clearFilters} className="text-xs text-red-600 dark:text-red-400 hover:underline font-semibold ml-auto">
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
              placeholder="Mã lứa, mã/tên gà mái, ghi chú..."
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg pl-9 pr-3 py-2 text-sm outline-none"
            />
          </div>
          <select
            value={breed}
            onChange={(e) => setBreed(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">🧬 Mọi giống mái</option>
            {breeds.map((b) => (
              <option key={b.code} value={b.code}>{b.name_vi}</option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">📋 Mọi trạng thái</option>
            <option value="dang_ap">🥚 Đang ấp</option>
            <option value="sap_no">⏰ Sắp nở (≤3 ngày)</option>
            <option value="qua_han">🚨 Quá hạn dự kiến</option>
            <option value="da_no">🐣 Đã nở</option>
            <option value="that_bai">✗ Thất bại</option>
          </select>
          <select
            value={hatchRateMin}
            onChange={(e) => setHatchRateMin(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">📊 Tỉ lệ nở bất kỳ</option>
            <option value="80">≥ 80% (xuất sắc)</option>
            <option value="60">≥ 60% (tốt)</option>
            <option value="40">≥ 40%</option>
            <option value="0.01">{'> 0% (đã nở)'}</option>
          </select>
        </div>

        {/* Sort + view */}
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sắp xếp:</span>
          {(
            [
              ['paired_desc', '🆕 Ghép mới nhất'],
              ['hatch_soon', '⏰ Sắp nở'],
              ['hatch_rate_desc', '⭐ Tỉ lệ nở cao'],
              ['paired_asc', '📅 Ghép cũ nhất'],
              ['litter_code', '🔢 Mã lứa'],
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

          <div className="ml-auto flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
            <button
              onClick={() => setView('grid')}
              className={`text-xs px-2.5 py-1 rounded font-semibold transition ${
                view === 'grid' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              ▦ Lưới
            </button>
            <button
              onClick={() => setView('list')}
              className={`text-xs px-2.5 py-1 rounded font-semibold transition ${
                view === 'list' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              ☰ Bảng
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-12 text-center">
          <div className="text-5xl mb-2">🥚</div>
          <p className="text-gray-600 dark:text-gray-400 text-lg font-semibold">
            {litters.length === 0 ? 'Chưa có lứa nào' : 'Không có lứa nào khớp tiêu chí'}
          </p>
          {hasFilter && litters.length > 0 && (
            <button onClick={clearFilters} className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline font-semibold">
              Bỏ tất cả bộ lọc
            </button>
          )}
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((l) => (
            <LitterCard key={l.id} l={l} />
          ))}
        </div>
      ) : (
        <ListView items={filtered} />
      )}
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
  tint: 'blue' | 'amber' | 'emerald' | 'purple'
  icon: string
}) {
  const map: Record<string, string> = {
    blue: 'from-blue-500 to-indigo-600',
    amber: 'from-amber-500 to-orange-600',
    emerald: 'from-emerald-500 to-green-600',
    purple: 'from-purple-500 to-fuchsia-600',
  }
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-sm relative overflow-hidden">
      <div className={`absolute top-0 right-0 w-14 h-14 rounded-full bg-gradient-to-br ${map[tint]} opacity-10 -translate-y-4 translate-x-4`} />
      <div className="flex items-start justify-between gap-2 relative">
        <div className="min-w-0">
          <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest truncate">{label}</div>
          <div className="text-xl md:text-2xl font-extrabold text-gray-900 dark:text-gray-100 mt-0.5 tabular-nums">{value}</div>
          {sub && <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5">{sub}</div>}
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  )
}

/* ========= GRID CARD ========= */
function LitterCard({ l }: { l: LitterNode }) {
  const meta = STATUS_META[l.status] ?? STATUS_META.dang_ap
  const breedColor = getBreedColor(l.breed_code)
  const isOverdue = l.status === 'dang_ap' && l.days_left != null && l.days_left < 0
  const isDueSoon =
    l.status === 'dang_ap' && l.days_left != null && l.days_left >= 0 && l.days_left <= 3

  let countdownLabel: string | null = null
  let countdownColor = 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
  if (l.status === 'dang_ap' && l.days_left != null) {
    if (l.days_left < 0) {
      countdownLabel = `🚨 Trễ ${-l.days_left} ngày`
      countdownColor = 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
    } else if (l.days_left === 0) {
      countdownLabel = '⏰ Hôm nay'
      countdownColor = 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300'
    } else if (l.days_left <= 3) {
      countdownLabel = `⏰ Còn ${l.days_left} ngày`
      countdownColor = 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300'
    } else {
      countdownLabel = `Còn ${l.days_left} ngày`
    }
  }

  return (
    <Link
      href={`/admin/sinh-san/${l.id}`}
      className={`group block bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border ${
        isOverdue
          ? 'border-red-300 dark:border-red-900 ring-2 ring-red-200 dark:ring-red-900/50'
          : isDueSoon
            ? 'border-amber-300 dark:border-amber-900'
            : 'border-gray-200 dark:border-gray-700'
      } shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all`}
    >
      {/* Header: status gradient bar */}
      <div className={`h-1.5 bg-gradient-to-r ${meta.gradient}`} />

      <div className="p-4">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <div className="font-mono font-bold text-base">{l.litter_code}</div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400">
              Ghép {formatDate(l.paired_date)}
            </div>
          </div>
          <div className="flex flex-col gap-1 items-end shrink-0">
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${meta.color}`}>
              {meta.label}
            </span>
            {countdownLabel && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${countdownColor}`}>
                {countdownLabel}
              </span>
            )}
          </div>
        </div>

        {/* Female info */}
        <div className="flex items-center gap-2 mb-3 bg-pink-50 dark:bg-pink-950/30 rounded-lg p-2 border border-pink-100 dark:border-pink-900/40">
          <div className={`w-8 h-8 ${breedColor.bg} rounded-full flex items-center justify-center text-base shrink-0`}>
            🐓
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-sm truncate">
              <span className="text-pink-600 dark:text-pink-400 mr-1">♀</span>
              {l.female_name ?? l.female_code ?? '—'}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
              {l.female_code && l.female_name && (
                <span className="font-mono">{l.female_code}</span>
              )}
              {l.breed_name && (
                <span className={`px-1.5 py-0.5 rounded-full font-semibold ${breedColor.badge}`}>
                  {l.breed_name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Progress bar (incubation timeline) */}
        {l.status === 'dang_ap' && l.expected_hatch_date && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400 mb-1">
              <span>Tiến độ ấp</span>
              <span className="font-bold tabular-nums">{l.progress_pct}%</span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full ${isOverdue ? 'bg-red-500' : isDueSoon ? 'bg-amber-500' : 'bg-gradient-to-r from-yellow-400 to-amber-500'}`}
                style={{ width: `${Math.min(100, l.progress_pct)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400 mt-1">
              <span>{formatDate(l.paired_date)}</span>
              <span className="font-semibold">→ {formatDate(l.expected_hatch_date)}</span>
            </div>
          </div>
        )}

        {/* Egg flow stats */}
        {(l.eggs_total > 0 || l.hatched_count > 0) && (
          <div className="grid grid-cols-3 gap-1.5 mb-2">
            <FlowBox icon="🥚" label="Trứng" value={l.eggs_total} tint="gray" />
            <FlowBox
              icon="✨"
              label="Có phôi"
              value={l.eggs_fertile}
              sub={l.fertile_rate != null ? `${l.fertile_rate}%` : undefined}
              tint="blue"
            />
            <FlowBox
              icon="🐣"
              label="Đã nở"
              value={l.hatched_count}
              sub={l.hatch_rate != null ? `${l.hatch_rate}%` : undefined}
              tint={l.status === 'da_no' ? 'emerald' : 'amber'}
            />
          </div>
        )}

        {/* Hatched date for completed */}
        {l.status === 'da_no' && l.hatched_date && (
          <div className="text-[11px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 rounded px-2 py-1 mb-2">
            🐣 Nở thực tế: <b>{formatDate(l.hatched_date)}</b>
          </div>
        )}

        {/* Notes preview */}
        {l.notes && (
          <div className="text-[11px] text-gray-600 dark:text-gray-400 italic line-clamp-2 mt-2">
            💬 {l.notes}
          </div>
        )}
      </div>
    </Link>
  )
}

function FlowBox({
  icon,
  label,
  value,
  sub,
  tint,
}: {
  icon: string
  label: string
  value: number
  sub?: string
  tint: 'gray' | 'blue' | 'emerald' | 'amber'
}) {
  const map: Record<string, string> = {
    gray: 'bg-gray-50 dark:bg-gray-900/40 text-gray-700 dark:text-gray-300',
    blue: 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300',
    emerald: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300',
    amber: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300',
  }
  return (
    <div className={`${map[tint]} rounded-lg p-2 text-center`}>
      <div className="text-base leading-none">{icon}</div>
      <div className="text-[9px] font-semibold uppercase tracking-wider mt-0.5 opacity-80">{label}</div>
      <div className="text-base font-extrabold tabular-nums leading-tight mt-0.5">{value}</div>
      {sub && <div className="text-[9px] opacity-80">{sub}</div>}
    </div>
  )
}

/* ========= LIST VIEW ========= */
function ListView({ items }: { items: LitterNode[] }) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-x-auto shadow-sm">
      <table className="w-full text-sm min-w-[1000px]">
        <thead className="bg-gray-50 dark:bg-gray-900/60 text-[11px] uppercase text-gray-500 dark:text-gray-400">
          <tr>
            <th className="px-3 py-2.5 text-left">Mã lứa</th>
            <th className="px-3 py-2.5 text-left">Gà mái</th>
            <th className="px-3 py-2.5 text-left">Giống</th>
            <th className="px-3 py-2.5 text-left">Ngày ghép</th>
            <th className="px-3 py-2.5 text-left">Dự kiến nở</th>
            <th className="px-3 py-2.5 text-center">🥚</th>
            <th className="px-3 py-2.5 text-center">✨ Phôi</th>
            <th className="px-3 py-2.5 text-center">🐣 Nở</th>
            <th className="px-3 py-2.5 text-center">% nở</th>
            <th className="px-3 py-2.5 text-center">Trạng thái</th>
            <th className="px-3 py-2.5"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {items.map((l) => {
            const meta = STATUS_META[l.status] ?? STATUS_META.dang_ap
            const breedColor = getBreedColor(l.breed_code)
            const isOverdue = l.status === 'dang_ap' && l.days_left != null && l.days_left < 0
            return (
              <tr
                key={l.id}
                className={`hover:bg-gray-50/60 dark:hover:bg-gray-900/30 transition ${
                  isOverdue ? 'bg-red-50/60 dark:bg-red-950/20' : ''
                }`}
              >
                <td className="px-3 py-2 font-mono font-bold">{l.litter_code}</td>
                <td className="px-3 py-2">
                  <div className="font-medium truncate">
                    <span className="text-pink-600 dark:text-pink-400 mr-1">♀</span>
                    {l.female_name ?? l.female_code ?? '—'}
                  </div>
                  {l.female_code && l.female_name && (
                    <div className="text-[11px] font-mono text-gray-500 dark:text-gray-400">{l.female_code}</div>
                  )}
                </td>
                <td className="px-3 py-2">
                  {l.breed_name && (
                    <span className={`text-[10.5px] px-2 py-0.5 rounded-full font-semibold ${breedColor.badge}`}>
                      {l.breed_name}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  {formatDate(l.paired_date)}
                </td>
                <td className="px-3 py-2 text-xs whitespace-nowrap">
                  <span className={isOverdue ? 'text-red-700 dark:text-red-300 font-bold' : 'text-gray-700 dark:text-gray-300'}>
                    {l.expected_hatch_date ? formatDate(l.expected_hatch_date) : '—'}
                  </span>
                  {l.status === 'dang_ap' && l.days_left != null && (
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">
                      {l.days_left < 0 ? `Trễ ${-l.days_left}d` : l.days_left === 0 ? 'Hôm nay' : `Còn ${l.days_left}d`}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 text-center tabular-nums">{l.eggs_total || '—'}</td>
                <td className="px-3 py-2 text-center tabular-nums">
                  {l.eggs_fertile || '—'}
                  {l.fertile_rate != null && (
                    <div className="text-[10px] text-gray-400">{l.fertile_rate}%</div>
                  )}
                </td>
                <td className="px-3 py-2 text-center tabular-nums font-semibold">
                  {l.hatched_count || '—'}
                </td>
                <td className="px-3 py-2 text-center">
                  {l.hatch_rate != null ? (
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                        l.hatch_rate >= 80
                          ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300'
                          : l.hatch_rate >= 60
                            ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300'
                            : l.hatch_rate >= 40
                              ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300'
                              : 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300'
                      }`}
                    >
                      {l.hatch_rate}%
                    </span>
                  ) : (
                    <span className="text-gray-400 text-xs">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${meta.color}`}>
                    {meta.label}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  <Link
                    href={`/admin/sinh-san/${l.id}`}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
                  >
                    Chi tiết →
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
