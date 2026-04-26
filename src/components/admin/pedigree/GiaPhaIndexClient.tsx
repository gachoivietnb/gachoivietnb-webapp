'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { removeDiacritics } from '@/lib/utils/slugify'
import { getBreedColor, TIER_LABEL, TIER_COLOR } from '@/lib/utils/breed-colors'

export type ChickenNode = {
  id: string
  chicken_code: string
  name: string | null
  gender: string | null
  status: string
  weight_kg: number | null
  age_months: number | null
  tag_number: string | null
  breed_code: string | null
  breed_name: string | null
  breed_tier: string | null
  parent_male_id: string | null
  parent_male_code: string | null
  parent_male_name: string | null
  parent_female_id: string | null
  parent_female_code: string | null
  parent_female_name: string | null
  pedigree_depth: number
  children_count: number
  has_pedigree: boolean
}

type Breed = { code: string; name_vi: string }
type ViewMode = 'grid' | 'list'
type SortKey = 'depth_desc' | 'children_desc' | 'name' | 'code' | 'recent'

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  dang_nuoi: { label: 'Đang nuôi', color: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300' },
  dang_cach_ly: { label: 'Cách ly', color: 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300' },
  da_ban: { label: 'Đã bán', color: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300' },
  chet: { label: 'Đã chết', color: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300' },
  loai_thai: { label: 'Loại thải', color: 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300' },
}

export function GiaPhaIndexClient({
  chickens,
  breeds,
}: {
  chickens: ChickenNode[]
  breeds: Breed[]
}) {
  const [q, setQ] = useState('')
  const [breedFilter, setBreedFilter] = useState('')
  const [genderFilter, setGenderFilter] = useState<'' | 'trong' | 'mai'>('')
  const [pedigreeFilter, setPedigreeFilter] = useState<'' | 'has' | 'none' | 'depth2' | 'depth3'>('')
  const [statusFilter, setStatusFilter] = useState<'' | 'dang_nuoi' | 'da_ban' | 'chet'>('')
  const [view, setView] = useState<ViewMode>('grid')
  const [sortKey, setSortKey] = useState<SortKey>('depth_desc')

  const qNorm = removeDiacritics(q.trim())

  const filtered = useMemo(() => {
    const list = chickens.filter((c) => {
      if (qNorm) {
        const hay = removeDiacritics(
          `${c.chicken_code} ${c.name ?? ''} ${c.breed_name ?? ''} ${c.tag_number ?? ''} ${c.parent_male_name ?? ''} ${c.parent_female_name ?? ''}`
        )
        if (!hay.includes(qNorm)) return false
      }
      if (breedFilter && c.breed_code !== breedFilter) return false
      if (genderFilter && c.gender !== genderFilter) return false
      if (statusFilter && c.status !== statusFilter) return false
      if (pedigreeFilter === 'has' && !c.has_pedigree) return false
      if (pedigreeFilter === 'none' && c.has_pedigree) return false
      if (pedigreeFilter === 'depth2' && c.pedigree_depth < 2) return false
      if (pedigreeFilter === 'depth3' && c.pedigree_depth < 3) return false
      return true
    })
    // Sort
    const sorted = [...list]
    if (sortKey === 'depth_desc')
      sorted.sort((a, b) => b.pedigree_depth - a.pedigree_depth || b.children_count - a.children_count)
    else if (sortKey === 'children_desc')
      sorted.sort((a, b) => b.children_count - a.children_count || b.pedigree_depth - a.pedigree_depth)
    else if (sortKey === 'name')
      sorted.sort((a, b) => (a.name ?? a.chicken_code).localeCompare(b.name ?? b.chicken_code, 'vi'))
    else if (sortKey === 'code')
      sorted.sort((a, b) => a.chicken_code.localeCompare(b.chicken_code))
    else if (sortKey === 'recent') sorted.sort((a, b) => b.id.localeCompare(a.id))
    return sorted
  }, [chickens, qNorm, breedFilter, genderFilter, statusFilter, pedigreeFilter, sortKey])

  // KPIs (live)
  const totalCount = chickens.length
  const withPed = chickens.filter((c) => c.has_pedigree).length
  const deepPed = chickens.filter((c) => c.pedigree_depth >= 3).length
  const breedersCount = chickens.filter((c) => c.children_count > 0).length

  const hasFilter = !!(q || breedFilter || genderFilter || pedigreeFilter || statusFilter)

  function clearFilters() {
    setQ('')
    setBreedFilter('')
    setGenderFilter('')
    setPedigreeFilter('')
    setStatusFilter('')
  }

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Tổng số gà" value={totalCount.toLocaleString('vi-VN')} sub={`${filtered.length} đang hiển thị`} tint="blue" icon="🐓" />
        <Kpi label="Có gia phả" value={withPed.toLocaleString('vi-VN')} sub={`${totalCount > 0 ? Math.round((withPed / totalCount) * 100) : 0}% / tổng`} tint="emerald" icon="🌳" />
        <Kpi label="Phả ≥ 3 đời" value={deepPed.toLocaleString('vi-VN')} sub="Gen sâu, dòng quý" tint="purple" icon="⭐" />
        <Kpi label="Đã sinh sản" value={breedersCount.toLocaleString('vi-VN')} sub="Có con cháu" tint="amber" icon="👨‍👩‍👧" />
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

        <div className="grid grid-cols-1 md:grid-cols-6 gap-2 md:gap-3">
          {/* Search */}
          <div className="relative md:col-span-2">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">🔍</span>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Mã gà, tên, giống, QR, tên bố/mẹ..."
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg pl-9 pr-3 py-2 text-sm outline-none"
            />
          </div>
          <select
            value={breedFilter}
            onChange={(e) => setBreedFilter(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">🧬 Mọi giống</option>
            {breeds.map((b) => (
              <option key={b.code} value={b.code}>{b.name_vi}</option>
            ))}
          </select>
          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value as '' | 'trong' | 'mai')}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">⚥ Trống / Mái</option>
            <option value="trong">♂ Trống</option>
            <option value="mai">♀ Mái</option>
          </select>
          <select
            value={pedigreeFilter}
            onChange={(e) => setPedigreeFilter(e.target.value as '' | 'has' | 'none' | 'depth2' | 'depth3')}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">🌳 Mọi phả hệ</option>
            <option value="has">✓ Có bố/mẹ</option>
            <option value="depth2">⭐ Phả ≥ 2 đời</option>
            <option value="depth3">⭐⭐ Phả ≥ 3 đời (gen sâu)</option>
            <option value="none">○ Chưa có phả</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as '' | 'dang_nuoi' | 'da_ban' | 'chet')}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">📋 Mọi trạng thái</option>
            <option value="dang_nuoi">Đang nuôi</option>
            <option value="da_ban">Đã bán</option>
            <option value="chet">Đã chết</option>
          </select>
        </div>

        {/* Sort + view toggle */}
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sắp xếp:</span>
          {(
            [
              ['depth_desc', '⭐ Phả sâu nhất'],
              ['children_desc', '👨‍👩‍👧 Nhiều con cháu'],
              ['name', '🔤 Tên A→Z'],
              ['code', '🔢 Mã'],
              ['recent', '🆕 Mới nhất'],
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
              title="Lưới card"
            >
              ▦ Lưới
            </button>
            <button
              onClick={() => setView('list')}
              className={`text-xs px-2.5 py-1 rounded font-semibold transition ${
                view === 'list' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-600 dark:text-gray-400'
              }`}
              title="Bảng"
            >
              ☰ Bảng
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-12 text-center">
          <div className="text-5xl mb-2">🔍</div>
          <p className="text-gray-600 dark:text-gray-400 text-lg font-semibold">
            {chickens.length === 0 ? 'Chưa có gà nào' : 'Không có gà nào khớp tiêu chí'}
          </p>
          {hasFilter && chickens.length > 0 && (
            <button onClick={clearFilters} className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline font-semibold">
              Bỏ tất cả bộ lọc
            </button>
          )}
        </div>
      ) : view === 'grid' ? (
        <GridView items={filtered} />
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
  tint: 'blue' | 'emerald' | 'purple' | 'amber'
  icon: string
}) {
  const map: Record<string, string> = {
    blue: 'from-blue-500 to-indigo-600',
    emerald: 'from-emerald-500 to-green-600',
    purple: 'from-purple-500 to-fuchsia-600',
    amber: 'from-amber-500 to-orange-600',
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

/* ========= GRID VIEW ========= */
function GridView({ items }: { items: ChickenNode[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {items.map((c) => (
        <PedigreeCard key={c.id} c={c} />
      ))}
    </div>
  )
}

function PedigreeCard({ c }: { c: ChickenNode }) {
  const color = getBreedColor(c.breed_code)
  const tierLabel = c.breed_tier ? TIER_LABEL[c.breed_tier] : null
  const tierColor = c.breed_tier ? TIER_COLOR[c.breed_tier] : null
  const status = STATUS_LABEL[c.status]
  const stars = '⭐'.repeat(Math.min(c.pedigree_depth, 5))

  return (
    <Link
      href={`/admin/gia-pha/${c.id}`}
      className={`group block bg-white dark:bg-gray-800 rounded-2xl overflow-hidden ring-1 ring-transparent ${color.border} hover:ring-2 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all`}
    >
      {/* Header gradient by breed */}
      <div className={`relative h-20 ${color.bg} flex items-center justify-center overflow-hidden`}>
        <div className="text-5xl drop-shadow-lg group-hover:scale-110 transition-transform">🐓</div>

        {/* Top-left: depth badge */}
        {c.pedigree_depth > 0 && (
          <div className="absolute top-2 left-2 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sm">
            {stars} <span className="text-gray-700 dark:text-gray-300">{c.pedigree_depth} đời</span>
          </div>
        )}
        {/* Top-right: QR tag */}
        {c.tag_number && (
          <div className="absolute top-2 right-2 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-full px-2 py-0.5 text-[10px] font-mono font-bold shadow-sm">
            #{c.tag_number}
          </div>
        )}
        {/* Bottom-left: tier */}
        {tierLabel && tierColor && (
          <div className={`absolute bottom-2 left-2 ${tierColor} rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wider shadow-sm`}>
            ★ {tierLabel}
          </div>
        )}
        {/* Bottom-right: gender */}
        {c.gender && (
          <div className="absolute bottom-2 right-2 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-sm">
            {c.gender === 'trong' ? '♂' : c.gender === 'mai' ? '♀' : '?'}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="font-bold text-sm truncate">{c.name ?? c.chicken_code}</div>
          {status && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold whitespace-nowrap ${status.color}`}>
              {status.label}
            </span>
          )}
        </div>
        <div className="text-[11px] font-mono text-gray-400 dark:text-gray-500 truncate mb-1.5">{c.chicken_code}</div>

        <div className="flex items-center gap-1.5 flex-wrap mb-2">
          {c.breed_name && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${color.badge}`}>
              {c.breed_name}
            </span>
          )}
          {c.age_months != null && (
            <span className="text-[10px] text-gray-500 dark:text-gray-400">{c.age_months} tháng</span>
          )}
        </div>

        {/* Mini pedigree preview */}
        <div className="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-2 text-[11px] space-y-0.5 border border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center gap-1.5">
            <span className="text-blue-600 dark:text-blue-400 font-bold w-4">♂</span>
            <span className="truncate text-gray-700 dark:text-gray-300">
              {c.parent_male_name ?? c.parent_male_code ?? <span className="text-gray-400 italic">— chưa có —</span>}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-pink-600 dark:text-pink-400 font-bold w-4">♀</span>
            <span className="truncate text-gray-700 dark:text-gray-300">
              {c.parent_female_name ?? c.parent_female_code ?? <span className="text-gray-400 italic">— chưa có —</span>}
            </span>
          </div>
        </div>

        {/* Footer stats */}
        <div className="flex items-center justify-between mt-2 text-[10px] text-gray-500 dark:text-gray-400">
          {c.children_count > 0 ? (
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              👨‍👩‍👧 {c.children_count} con cháu
            </span>
          ) : (
            <span className="text-gray-400 italic">Chưa sinh sản</span>
          )}
          <span className="text-blue-600 dark:text-blue-400 font-semibold opacity-0 group-hover:opacity-100 transition">
            Xem cây →
          </span>
        </div>
      </div>
    </Link>
  )
}

/* ========= LIST VIEW (table) ========= */
function ListView({ items }: { items: ChickenNode[] }) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-x-auto shadow-sm">
      <table className="w-full text-sm min-w-[900px]">
        <thead className="bg-gray-50 dark:bg-gray-900/60 text-[11px] uppercase text-gray-500 dark:text-gray-400">
          <tr>
            <th className="px-3 py-2.5 text-left">Gà</th>
            <th className="px-3 py-2.5 text-left">Giống</th>
            <th className="px-3 py-2.5 text-center">Giới</th>
            <th className="px-3 py-2.5 text-center">Tuổi</th>
            <th className="px-3 py-2.5 text-left">Bố</th>
            <th className="px-3 py-2.5 text-left">Mẹ</th>
            <th className="px-3 py-2.5 text-center">Phả</th>
            <th className="px-3 py-2.5 text-center">Con cháu</th>
            <th className="px-3 py-2.5 text-center">Trạng thái</th>
            <th className="px-3 py-2.5"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {items.map((c) => {
            const color = getBreedColor(c.breed_code)
            const status = STATUS_LABEL[c.status]
            return (
              <tr key={c.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-900/30 transition">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-9 h-9 ${color.bg} rounded-full flex items-center justify-center text-lg flex-shrink-0`}>
                      🐓
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">{c.name ?? c.chicken_code}</div>
                      <div className="text-[11px] font-mono text-gray-400 dark:text-gray-500 truncate">
                        {c.chicken_code}
                        {c.tag_number && <span className="ml-1.5 text-gray-600 dark:text-gray-400">#{c.tag_number}</span>}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2">
                  {c.breed_name && (
                    <span className={`text-[10.5px] px-2 py-0.5 rounded-full font-semibold ${color.badge}`}>
                      {c.breed_name}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-center text-sm font-bold">
                  {c.gender === 'trong' ? <span className="text-blue-600">♂</span> : c.gender === 'mai' ? <span className="text-pink-600">♀</span> : '—'}
                </td>
                <td className="px-3 py-2 text-center text-xs">
                  {c.age_months != null ? `${c.age_months}t` : '—'}
                </td>
                <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300 max-w-[140px] truncate">
                  {c.parent_male_name ?? c.parent_male_code ?? <span className="text-gray-400 italic">—</span>}
                </td>
                <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300 max-w-[140px] truncate">
                  {c.parent_female_name ?? c.parent_female_code ?? <span className="text-gray-400 italic">—</span>}
                </td>
                <td className="px-3 py-2 text-center">
                  {c.pedigree_depth > 0 ? (
                    <span className="inline-block bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 rounded-full px-2 py-0.5 text-xs font-bold">
                      {c.pedigree_depth} đời
                    </span>
                  ) : (
                    <span className="text-gray-400 text-xs italic">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-center text-sm font-semibold">
                  {c.children_count > 0 ? (
                    <span className="text-emerald-600 dark:text-emerald-400">{c.children_count}</span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  {status && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${status.color}`}>
                      {status.label}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  <Link
                    href={`/admin/gia-pha/${c.id}`}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
                  >
                    Xem cây →
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
