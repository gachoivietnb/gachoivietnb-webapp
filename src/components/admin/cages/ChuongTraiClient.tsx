'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { removeDiacritics } from '@/lib/utils/slugify'

export type CageNode = {
  id: string
  row_id: string
  code: string
  full_code: string
  capacity: number
  status: string
  occupancy: number
  computed_status: 'trong' | 'co_ga' | 'day' | 'bao_tri'
}

export type RowNode = {
  id: string
  area_id: string
  code: string
  name_vi: string | null
  cages: CageNode[]
  total_capacity: number
  total_occupancy: number
  occupancy_pct: number
}

export type AreaNode = {
  id: string
  code: string
  name_vi: string
  type: string
  rows: RowNode[]
  cages: CageNode[]
  total_capacity: number
  total_occupancy: number
  occupancy_pct: number
}

const AREA_TYPE_META: Record<string, { label: string; gradient: string; bg: string; ring: string }> = {
  trong: {
    label: 'Trống',
    gradient: 'from-sky-500 to-blue-600',
    bg: 'bg-sky-50 dark:bg-sky-950/30',
    ring: 'ring-sky-200 dark:ring-sky-900',
  },
  mai: {
    label: 'Mái',
    gradient: 'from-pink-500 to-rose-600',
    bg: 'bg-pink-50 dark:bg-pink-950/30',
    ring: 'ring-pink-200 dark:ring-pink-900',
  },
  duc: {
    label: 'Đực',
    gradient: 'from-blue-600 to-indigo-700',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    ring: 'ring-blue-200 dark:ring-blue-900',
  },
  ghep_doi: {
    label: 'Ghép đôi',
    gradient: 'from-purple-500 to-fuchsia-600',
    bg: 'bg-purple-50 dark:bg-purple-950/30',
    ring: 'ring-purple-200 dark:ring-purple-900',
  },
  cach_ly: {
    label: 'Cách ly',
    gradient: 'from-amber-500 to-orange-600',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    ring: 'ring-amber-200 dark:ring-amber-900',
  },
  gia_pho_tong: {
    label: 'Gia phả tổng',
    gradient: 'from-emerald-500 to-green-600',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    ring: 'ring-emerald-200 dark:ring-emerald-900',
  },
}

const CAGE_STATUS_META: Record<
  CageNode['computed_status'],
  { label: string; cellClass: string; dotClass: string }
> = {
  trong: {
    label: 'Trống',
    cellClass:
      'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600',
    dotClass: 'bg-gray-400',
  },
  co_ga: {
    label: 'Có gà',
    cellClass:
      'bg-emerald-200 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-100 hover:bg-emerald-300 dark:hover:bg-emerald-800',
    dotClass: 'bg-emerald-500',
  },
  day: {
    label: 'Đầy',
    cellClass:
      'bg-emerald-500 dark:bg-emerald-700 text-white hover:bg-emerald-600 dark:hover:bg-emerald-600',
    dotClass: 'bg-emerald-700',
  },
  bao_tri: {
    label: 'Bảo trì',
    cellClass:
      'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/60',
    dotClass: 'bg-red-500',
  },
}

type StatusFilter = '' | 'trong' | 'co_ga' | 'day' | 'bao_tri'

export function ChuongTraiClient({ tree }: { tree: AreaNode[] }) {
  const [q, setQ] = useState('')
  const [areaTypeFilter, setAreaTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('')
  const [occFilter, setOccFilter] = useState<'' | 'empty' | 'low' | 'high' | 'full'>('')

  const qNorm = removeDiacritics(q.trim())

  // Filter cages
  const matchedCageIds = useMemo(() => {
    const set = new Set<string>()
    for (const a of tree) {
      if (areaTypeFilter && a.type !== areaTypeFilter) continue
      for (const r of a.rows) {
        for (const c of r.cages) {
          if (qNorm) {
            const hay = removeDiacritics(`${c.full_code} ${c.code} ${a.code} ${a.name_vi} ${r.code} ${r.name_vi ?? ''}`)
            if (!hay.includes(qNorm)) continue
          }
          if (statusFilter && c.computed_status !== statusFilter) continue
          if (occFilter) {
            const pct = c.capacity > 0 ? c.occupancy / c.capacity : 0
            if (occFilter === 'empty' && c.occupancy > 0) continue
            if (occFilter === 'low' && (c.occupancy === 0 || pct >= 0.5)) continue
            if (occFilter === 'high' && (pct < 0.5 || pct >= 1)) continue
            if (occFilter === 'full' && pct < 1) continue
          }
          set.add(c.id)
        }
      }
    }
    return set
  }, [tree, qNorm, areaTypeFilter, statusFilter, occFilter])

  // Aggregate filtered tree (only show areas/rows that have at least 1 matching cage)
  const visibleTree = useMemo(() => {
    return tree
      .map((a) => {
        const filteredRows = a.rows
          .map((r) => {
            const cages = r.cages.filter((c) => matchedCageIds.has(c.id))
            return { ...r, cages }
          })
          .filter((r) => r.cages.length > 0)
        return { ...a, rows: filteredRows }
      })
      .filter((a) => (areaTypeFilter ? a.type === areaTypeFilter : true) && a.rows.length > 0)
  }, [tree, matchedCageIds, areaTypeFilter])

  // KPIs (live)
  const allCages = tree.flatMap((a) => a.cages)
  const totalCages = allCages.length
  const occCages = allCages.filter((c) => c.computed_status === 'co_ga' || c.computed_status === 'day').length
  const fullCages = allCages.filter((c) => c.computed_status === 'day').length
  const maintCages = allCages.filter((c) => c.computed_status === 'bao_tri').length
  const emptyCages = allCages.filter((c) => c.computed_status === 'trong').length
  const totalCap = allCages.reduce((s, c) => s + c.capacity, 0)
  const totalOcc = allCages.reduce((s, c) => s + c.occupancy, 0)
  const fillRate = totalCap > 0 ? Math.round((totalOcc / totalCap) * 100) : 0

  const visibleCount = visibleTree.reduce((s, a) => s + a.rows.reduce((s2, r) => s2 + r.cages.length, 0), 0)
  const hasFilter = !!(q || areaTypeFilter || statusFilter || occFilter)

  function clearFilters() {
    setQ('')
    setAreaTypeFilter('')
    setStatusFilter('')
    setOccFilter('')
  }

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Kpi label="Tổng chuồng" value={totalCages.toLocaleString('vi-VN')} sub={`${visibleCount} hiển thị`} tint="blue" icon="🏠" />
        <Kpi label="Đang có gà" value={occCages.toLocaleString('vi-VN')} sub={`${fullCages} đã đầy`} tint="emerald" icon="🐓" />
        <Kpi label="Còn trống" value={emptyCages.toLocaleString('vi-VN')} sub="Sẵn cho gà mới" tint="amber" icon="🟢" />
        <Kpi label="Bảo trì" value={maintCages.toLocaleString('vi-VN')} sub={maintCages > 0 ? '⚠ Cần xử lý' : 'Tốt'} tint="red" icon="🔧" />
        <Kpi label="Tỉ lệ lấp đầy" value={`${fillRate}%`} sub={`${totalOcc}/${totalCap} con`} tint="purple" icon="📊" />
      </div>

      {/* Fill-rate bar */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
            🐓 Tỉ lệ lấp đầy toàn trại
          </span>
          <span className="font-extrabold text-gray-900 dark:text-gray-100 tabular-nums">
            {totalOcc.toLocaleString('vi-VN')} / {totalCap.toLocaleString('vi-VN')} con · {fillRate}%
          </span>
        </div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              fillRate >= 90
                ? 'bg-gradient-to-r from-red-500 to-rose-600'
                : fillRate >= 70
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                  : 'bg-gradient-to-r from-emerald-500 to-green-600'
            }`}
            style={{ width: `${Math.min(100, fillRate)}%` }}
          />
        </div>
      </div>

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

        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-3">
          <div className="relative md:col-span-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">🔍</span>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Mã chuồng/dãy/khu..."
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg pl-9 pr-3 py-2 text-sm outline-none"
            />
          </div>
          <select
            value={areaTypeFilter}
            onChange={(e) => setAreaTypeFilter(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">🏠 Mọi loại khu</option>
            <option value="trong">Trống chung</option>
            <option value="mai">Khu mái</option>
            <option value="duc">Khu đực</option>
            <option value="ghep_doi">Khu ghép đôi</option>
            <option value="cach_ly">Khu cách ly</option>
            <option value="gia_pho_tong">Gia phả tổng</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">🔘 Mọi trạng thái</option>
            <option value="trong">⬜ Trống</option>
            <option value="co_ga">🟢 Có gà (chưa đầy)</option>
            <option value="day">🟩 Đã đầy</option>
            <option value="bao_tri">🔴 Bảo trì</option>
          </select>
          <select
            value={occFilter}
            onChange={(e) => setOccFilter(e.target.value as '' | 'empty' | 'low' | 'high' | 'full')}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">📊 Mức lấp đầy</option>
            <option value="empty">Hoàn toàn trống</option>
            <option value="low">Lấp {'<'} 50%</option>
            <option value="high">Lấp 50-99%</option>
            <option value="full">Đã đầy 100%</option>
          </select>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-2 text-[11px] mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <span className="font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mr-1">Chú thích:</span>
          {(['trong', 'co_ga', 'day', 'bao_tri'] as const).map((k) => {
            const m = CAGE_STATUS_META[k]
            return (
              <span key={k} className="inline-flex items-center gap-1.5">
                <span className={`inline-block w-3 h-3 rounded ${m.dotClass}`} />
                <span className="text-gray-700 dark:text-gray-300">{m.label}</span>
              </span>
            )
          })}
        </div>
      </div>

      {/* Tree visualization */}
      {visibleTree.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-12 text-center">
          <div className="text-5xl mb-2">🏠</div>
          <p className="text-gray-600 dark:text-gray-400 text-lg font-semibold">
            {tree.length === 0 ? 'Chưa có khu nào' : 'Không có chuồng nào khớp tiêu chí'}
          </p>
          {hasFilter && tree.length > 0 && (
            <button onClick={clearFilters} className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline font-semibold">
              Bỏ tất cả bộ lọc
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {visibleTree.map((area) => (
            <AreaSection key={area.id} area={area} />
          ))}
        </div>
      )}
    </div>
  )
}

function AreaSection({ area }: { area: AreaNode }) {
  const meta = AREA_TYPE_META[area.type] ?? AREA_TYPE_META.trong
  const totalCagesArea = area.rows.reduce((s, r) => s + r.cages.length, 0)

  return (
    <section className={`rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm`}>
      {/* Area header */}
      <div className={`bg-gradient-to-r ${meta.gradient} text-white px-5 py-3.5 flex items-center justify-between gap-3 flex-wrap`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-xl font-extrabold">
            {area.code}
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-base truncate">{area.name_vi}</h2>
            <div className="text-xs opacity-90">
              <span className="bg-white/20 rounded-full px-2 py-0.5 mr-1">{meta.label}</span>
              {area.rows.length} dãy · {totalCagesArea} chuồng
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[10px] opacity-90 uppercase tracking-widest font-semibold">Lấp đầy</div>
          <div className="text-2xl font-extrabold tabular-nums">{area.occupancy_pct}%</div>
          <div className="text-[10px] opacity-90 tabular-nums">
            {area.total_occupancy}/{area.total_capacity} con
          </div>
        </div>
      </div>

      {/* Area body — rows */}
      <div className={`${meta.bg} p-4 space-y-3`}>
        {area.rows.map((row) => (
          <RowSection key={row.id} row={row} />
        ))}
      </div>
    </section>
  )
}

function RowSection({ row }: { row: RowNode }) {
  const cages = row.cages

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/40">
        <div className="flex items-center gap-2 min-w-0">
          <span className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg px-2 py-0.5 text-xs font-bold font-mono">
            Dãy {row.code}
          </span>
          {row.name_vi && (
            <span className="text-sm font-semibold truncate">{row.name_vi}</span>
          )}
          <span className="text-xs text-gray-500 dark:text-gray-400">({cages.length} chuồng)</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
            {row.total_occupancy}/{row.total_capacity}
          </span>
          <div className="w-24 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${
                row.occupancy_pct >= 90
                  ? 'bg-red-500'
                  : row.occupancy_pct >= 70
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, row.occupancy_pct)}%` }}
            />
          </div>
          <span className="text-xs font-bold text-gray-700 dark:text-gray-300 tabular-nums w-10 text-right">
            {row.occupancy_pct}%
          </span>
        </div>
      </div>

      {/* Cage heatmap */}
      <div className="p-3">
        {cages.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500 italic text-center py-2">
            Không có chuồng nào khớp lọc trong dãy này
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {cages.map((cg) => (
              <CageCell key={cg.id} c={cg} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function CageCell({ c }: { c: CageNode }) {
  const meta = CAGE_STATUS_META[c.computed_status]
  const occText =
    c.capacity > 1 ? `${c.occupancy}/${c.capacity}` : c.occupancy > 0 ? '✓' : ''
  return (
    <Link
      href={`/admin/chuong-trai/${c.id}`}
      title={`${c.full_code} · ${meta.label} · ${c.occupancy}/${c.capacity} con`}
      className={`relative inline-flex flex-col items-center justify-center min-w-[44px] h-12 rounded-lg text-[10px] font-bold transition shadow-sm ${meta.cellClass}`}
    >
      <span className="text-xs font-mono">{c.code}</span>
      {occText && (
        <span className="text-[9px] font-semibold opacity-80 leading-none mt-0.5">{occText}</span>
      )}
    </Link>
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
  tint: 'blue' | 'emerald' | 'amber' | 'red' | 'purple'
  icon: string
}) {
  const map: Record<string, string> = {
    blue: 'from-blue-500 to-indigo-600',
    emerald: 'from-emerald-500 to-green-600',
    amber: 'from-amber-500 to-orange-600',
    red: 'from-red-500 to-rose-600',
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
