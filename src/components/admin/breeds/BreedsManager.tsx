'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getBreedColor, TIER_LABEL, TIER_COLOR } from '@/lib/utils/breed-colors'
import { removeDiacritics, slugifyVi } from '@/lib/utils/slugify'

type Breed = {
  id: string
  code: string
  name_vi: string
  origin: string | null
  description: string | null
  characteristics: Record<string, unknown> | null
  tier: string
  default_avatar_url: string | null
  is_active: boolean
  display_order: number
  chicken_count?: number
}

type ViewMode = 'grid' | 'list'
type SortKey = 'order' | 'name' | 'count_desc' | 'tier_priority' | 'recent'
type ActiveFilter = '' | 'active' | 'inactive'
type CountFilter = '' | 'has' | 'empty'

const TIER_PRIORITY: Record<string, number> = {
  dac_biet: 1,
  cao_cap: 2,
  trung_cap: 3,
  pho_thong: 4,
}

export function BreedsManager({
  initialBreeds,
  canEdit,
}: {
  initialBreeds: Breed[]
  canEdit: boolean
}) {
  const [breeds, setBreeds] = useState(initialBreeds)
  const [editing, setEditing] = useState<Breed | null>(null)
  const [creating, setCreating] = useState(false)
  const [q, setQ] = useState('')
  const [tier, setTier] = useState('')
  const [active, setActive] = useState<ActiveFilter>('')
  const [countFilter, setCountFilter] = useState<CountFilter>('')
  const [view, setView] = useState<ViewMode>('grid')
  const [sortKey, setSortKey] = useState<SortKey>('order')
  const router = useRouter()

  async function reload() {
    const res = await fetch('/api/breeds')
    const json = await res.json()
    if (json.data) {
      const withCounts = (json.data as Breed[]).map((b) => ({
        ...b,
        chicken_count: breeds.find((x) => x.id === b.id)?.chicken_count ?? 0,
      }))
      setBreeds(withCounts)
    }
    router.refresh()
  }

  const qNorm = removeDiacritics(q.trim())

  const filtered = useMemo(() => {
    const out = breeds.filter((b) => {
      if (qNorm) {
        const hay = removeDiacritics(`${b.code} ${b.name_vi} ${b.origin ?? ''} ${b.description ?? ''}`)
        if (!hay.includes(qNorm)) return false
      }
      if (tier && b.tier !== tier) return false
      if (active === 'active' && !b.is_active) return false
      if (active === 'inactive' && b.is_active) return false
      if (countFilter === 'has' && (b.chicken_count ?? 0) === 0) return false
      if (countFilter === 'empty' && (b.chicken_count ?? 0) > 0) return false
      return true
    })
    const sorted = [...out]
    if (sortKey === 'order')
      sorted.sort((a, b) => a.display_order - b.display_order || a.name_vi.localeCompare(b.name_vi, 'vi'))
    else if (sortKey === 'name') sorted.sort((a, b) => a.name_vi.localeCompare(b.name_vi, 'vi'))
    else if (sortKey === 'count_desc')
      sorted.sort((a, b) => (b.chicken_count ?? 0) - (a.chicken_count ?? 0))
    else if (sortKey === 'tier_priority')
      sorted.sort((a, b) => (TIER_PRIORITY[a.tier] ?? 9) - (TIER_PRIORITY[b.tier] ?? 9) || a.name_vi.localeCompare(b.name_vi, 'vi'))
    else if (sortKey === 'recent') sorted.sort((a, b) => b.id.localeCompare(a.id))
    return sorted
  }, [breeds, qNorm, tier, active, countFilter, sortKey])

  // KPIs
  const total = breeds.length
  const activeCount = breeds.filter((b) => b.is_active).length
  const totalChickens = breeds.reduce((s, b) => s + (b.chicken_count ?? 0), 0)
  const tierCounts: Record<string, number> = {}
  for (const b of breeds) tierCounts[b.tier] = (tierCounts[b.tier] ?? 0) + 1
  const dacBietCount = (tierCounts.dac_biet ?? 0) + (tierCounts.cao_cap ?? 0)
  const topBreed = breeds
    .filter((b) => (b.chicken_count ?? 0) > 0)
    .sort((a, b) => (b.chicken_count ?? 0) - (a.chicken_count ?? 0))[0]

  const hasFilter = !!(q || tier || active || countFilter)
  function clearFilters() {
    setQ('')
    setTier('')
    setActive('')
    setCountFilter('')
  }

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi
          label="Tổng giống"
          value={total.toLocaleString('vi-VN')}
          sub={`${filtered.length} hiển thị`}
          tint="blue"
          icon="🧬"
        />
        <Kpi
          label="Đang hoạt động"
          value={activeCount.toLocaleString('vi-VN')}
          sub={total - activeCount > 0 ? `${total - activeCount} đã ngưng` : 'Tất cả'}
          tint="emerald"
          icon="✓"
        />
        <Kpi
          label="Cao cấp / Đặc biệt"
          value={dacBietCount.toLocaleString('vi-VN')}
          sub={dacBietCount > 0 ? 'Dòng quý' : '—'}
          tint="purple"
          icon="⭐"
        />
        <Kpi
          label="Tổng đàn"
          value={totalChickens.toLocaleString('vi-VN')}
          sub={topBreed ? `${topBreed.name_vi}: ${topBreed.chicken_count} 🥇` : 'Chưa có'}
          tint="amber"
          icon="🐓"
        />
      </div>

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
              placeholder="Tên giống, mã, xuất xứ, mô tả..."
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg pl-9 pr-3 py-2 text-sm outline-none"
            />
          </div>
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">⭐ Mọi tier</option>
            <option value="dac_biet">★ Đặc biệt</option>
            <option value="cao_cap">Cao cấp</option>
            <option value="trung_cap">Trung cấp</option>
            <option value="pho_thong">Phổ thông</option>
          </select>
          <select
            value={active}
            onChange={(e) => setActive(e.target.value as ActiveFilter)}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">🔘 Trạng thái</option>
            <option value="active">✓ Đang hoạt động</option>
            <option value="inactive">○ Đã ngưng</option>
          </select>
          <select
            value={countFilter}
            onChange={(e) => setCountFilter(e.target.value as CountFilter)}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">🐓 Số con</option>
            <option value="has">Có gà ({'>'}0)</option>
            <option value="empty">Chưa có con nào</option>
          </select>
        </div>

        {/* Sort + view + create */}
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sắp xếp:</span>
          {(
            [
              ['order', '🎯 Mặc định'],
              ['count_desc', '🐓 Nhiều con nhất'],
              ['tier_priority', '⭐ Tier cao trước'],
              ['name', '🔤 Tên A→Z'],
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

          <div className="ml-auto flex items-center gap-2 flex-wrap">
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
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
            {canEdit && (
              <button
                onClick={() => setCreating(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-1.5 text-xs font-bold shadow-sm"
              >
                + Thêm giống mới
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Distribution bar (visual breakdown) */}
      {totalChickens > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              📊 Phân bổ đàn theo giống
            </span>
            <span className="font-extrabold text-gray-900 dark:text-gray-100 tabular-nums">
              {totalChickens.toLocaleString('vi-VN')} con
            </span>
          </div>
          <div className="flex h-6 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
            {breeds
              .filter((b) => (b.chicken_count ?? 0) > 0)
              .sort((a, b) => (b.chicken_count ?? 0) - (a.chicken_count ?? 0))
              .map((b) => {
                const color = getBreedColor(b.code)
                const pct = ((b.chicken_count ?? 0) / totalChickens) * 100
                return (
                  <div
                    key={b.id}
                    title={`${b.name_vi}: ${b.chicken_count} con (${pct.toFixed(1)}%)`}
                    className={`${color.bg} flex items-center justify-center text-white text-[10px] font-bold transition-all hover:opacity-90`}
                    style={{ width: `${pct}%`, minWidth: pct > 3 ? '0' : '0' }}
                  >
                    {pct >= 6 ? <span className="px-1 truncate">{b.code}</span> : null}
                  </div>
                )
              })}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] mt-2">
            {breeds
              .filter((b) => (b.chicken_count ?? 0) > 0)
              .sort((a, b) => (b.chicken_count ?? 0) - (a.chicken_count ?? 0))
              .map((b) => {
                const color = getBreedColor(b.code)
                const pct = ((b.chicken_count ?? 0) / totalChickens) * 100
                return (
                  <span key={b.id} className="inline-flex items-center gap-1.5">
                    <span className={`inline-block w-2.5 h-2.5 rounded-full ${color.bg}`} />
                    <span className="text-gray-700 dark:text-gray-300 font-medium">{b.name_vi}:</span>
                    <span className="text-gray-500 dark:text-gray-400 tabular-nums">
                      {b.chicken_count} ({pct.toFixed(1)}%)
                    </span>
                  </span>
                )
              })}
          </div>
        </div>
      )}

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-12 text-center">
          <div className="text-5xl mb-2">🧬</div>
          <p className="text-gray-600 dark:text-gray-400 text-lg font-semibold">
            {breeds.length === 0 ? 'Chưa có giống gà nào' : 'Không có giống nào khớp tiêu chí'}
          </p>
          {hasFilter && breeds.length > 0 && (
            <button
              onClick={clearFilters}
              className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline font-semibold"
            >
              Bỏ tất cả bộ lọc
            </button>
          )}
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((b) => (
            <BreedCard
              key={b.id}
              breed={b}
              totalChickens={totalChickens}
              onEdit={canEdit ? () => setEditing(b) : null}
            />
          ))}
        </div>
      ) : (
        <ListView items={filtered} totalChickens={totalChickens} canEdit={canEdit} onEdit={setEditing} />
      )}

      {(editing || creating) && (
        <BreedFormModal
          breed={editing}
          onClose={() => {
            setEditing(null)
            setCreating(false)
          }}
          onSaved={() => {
            setEditing(null)
            setCreating(false)
            reload()
          }}
        />
      )}
    </div>
  )
}

/* ========= BREED CARD ========= */
function BreedCard({
  breed: b,
  totalChickens,
  onEdit,
}: {
  breed: Breed
  totalChickens: number
  onEdit: (() => void) | null
}) {
  const color = getBreedColor(b.code)
  const tierLabel = TIER_LABEL[b.tier] ?? b.tier
  const tierColor = TIER_COLOR[b.tier] ?? TIER_COLOR.pho_thong
  const sharePct = totalChickens > 0 ? ((b.chicken_count ?? 0) / totalChickens) * 100 : 0

  return (
    <div
      className={`group relative bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border ${
        b.is_active ? 'border-gray-200 dark:border-gray-700' : 'border-gray-200 dark:border-gray-700 opacity-60'
      } shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all`}
    >
      {/* Gradient header with avatar */}
      <div className={`relative h-28 ${color.bg} overflow-hidden`}>
        {b.default_avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={b.default_avatar_url}
            alt={b.name_vi}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-7xl drop-shadow-lg group-hover:scale-110 transition">
            🐓
          </div>
        )}

        {/* Tier badge */}
        <span
          className={`absolute top-3 left-3 ${tierColor} rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider shadow`}
        >
          ★ {tierLabel}
        </span>

        {/* Code badge */}
        <span className="absolute top-3 right-3 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold shadow">
          {b.code.toUpperCase()}
        </span>

        {/* Inactive overlay */}
        {!b.is_active && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-red-600 text-white rounded-full px-3 py-1 text-xs font-bold">⏸ Đã ngưng</span>
          </div>
        )}

        {/* Bottom gradient overlay for readability */}
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/30 to-transparent" />
      </div>

      {/* Body */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="text-lg font-extrabold text-gray-900 dark:text-gray-100 truncate leading-tight">
            {b.name_vi}
          </h3>
          {onEdit && (
            <button
              onClick={onEdit}
              className="shrink-0 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded px-2 py-0.5 font-semibold"
            >
              ✎ Sửa
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="truncate">📍 {b.origin || 'Chưa rõ xuất xứ'}</span>
        </div>

        {b.description && (
          <p className="text-[12.5px] text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed mb-3">
            {b.description}
          </p>
        )}

        {/* Stats: chicken count + share % */}
        <div className="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-3 mt-2 border border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
              Đàn hiện có
            </span>
            <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 tabular-nums">
              {sharePct.toFixed(1)}% / tổng đàn
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 tabular-nums">
              {b.chicken_count ?? 0}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">con</span>
            <Link
              href={`/admin/ho-so-ga?breed=${b.code}`}
              className="ml-auto text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-semibold opacity-0 group-hover:opacity-100 transition"
            >
              Xem đàn →
            </Link>
          </div>
          {sharePct > 0 && (
            <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className={`h-full ${color.bg}`} style={{ width: `${Math.min(100, sharePct)}%` }} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ========= LIST VIEW ========= */
function ListView({
  items,
  totalChickens,
  canEdit,
  onEdit,
}: {
  items: Breed[]
  totalChickens: number
  canEdit: boolean
  onEdit: (b: Breed) => void
}) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-x-auto shadow-sm">
      <table className="w-full text-sm min-w-[800px]">
        <thead className="bg-gray-50 dark:bg-gray-900/60 text-[11px] uppercase text-gray-500 dark:text-gray-400">
          <tr>
            <th className="px-3 py-2.5 text-left">Giống</th>
            <th className="px-3 py-2.5 text-left">Mã</th>
            <th className="px-3 py-2.5 text-left">Tier</th>
            <th className="px-3 py-2.5 text-left">Xuất xứ</th>
            <th className="px-3 py-2.5 text-right">Đàn</th>
            <th className="px-3 py-2.5 text-left w-32">% / tổng</th>
            <th className="px-3 py-2.5 text-center">Active</th>
            <th className="px-3 py-2.5"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {items.map((b) => {
            const color = getBreedColor(b.code)
            const sharePct = totalChickens > 0 ? ((b.chicken_count ?? 0) / totalChickens) * 100 : 0
            const tierLabel = TIER_LABEL[b.tier] ?? b.tier
            const tierColor = TIER_COLOR[b.tier] ?? TIER_COLOR.pho_thong
            return (
              <tr key={b.id} className={`hover:bg-gray-50/60 dark:hover:bg-gray-900/30 transition ${!b.is_active ? 'opacity-60' : ''}`}>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-9 h-9 rounded-lg ${color.bg} flex items-center justify-center text-base shadow-sm overflow-hidden`}>
                      {b.default_avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={b.default_avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        '🐓'
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{b.name_vi}</div>
                      {b.description && (
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                          {b.description}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 font-mono text-xs">{b.code}</td>
                <td className="px-3 py-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wider ${tierColor}`}>
                    {tierLabel}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400">{b.origin ?? '—'}</td>
                <td className="px-3 py-2 text-right">
                  <Link
                    href={`/admin/ho-so-ga?breed=${b.code}`}
                    className="font-bold text-emerald-700 dark:text-emerald-400 hover:underline tabular-nums"
                  >
                    {b.chicken_count ?? 0}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  {sharePct > 0 ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className={`h-full ${color.bg}`} style={{ width: `${Math.min(100, sharePct)}%` }} />
                      </div>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 tabular-nums w-10 text-right">
                        {sharePct.toFixed(1)}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-xs">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  {b.is_active ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-bold">
                      ✓ Active
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 font-bold">
                      ⏸ Tắt
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {canEdit && (
                    <button
                      onClick={() => onEdit(b)}
                      className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
                    >
                      ✎ Sửa
                    </button>
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

/* ========= KPI ========= */
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

/* ========= MODAL (preserved from original) ========= */
const TIER_OPTIONS: Array<{
  value: 'dac_biet' | 'cao_cap' | 'trung_cap' | 'pho_thong'
  label: string
  emoji: string
  desc: string
  bar: string
  cls: string
}> = [
  {
    value: 'dac_biet',
    label: 'Đặc biệt',
    emoji: '👑',
    desc: 'Hiếm · giá cao nhất',
    bar: 'from-purple-500 to-fuchsia-500',
    cls: 'border-purple-400 bg-purple-50 dark:bg-purple-950/30 ring-purple-200 dark:ring-purple-900',
  },
  {
    value: 'cao_cap',
    label: 'Cao cấp',
    emoji: '⭐',
    desc: '≥ 5tr · giống tốt',
    bar: 'from-amber-500 to-orange-500',
    cls: 'border-amber-400 bg-amber-50 dark:bg-amber-950/30 ring-amber-200 dark:ring-amber-900',
  },
  {
    value: 'trung_cap',
    label: 'Trung cấp',
    emoji: '🥈',
    desc: '2–5tr · phổ biến',
    bar: 'from-blue-500 to-indigo-500',
    cls: 'border-blue-400 bg-blue-50 dark:bg-blue-950/30 ring-blue-200 dark:ring-blue-900',
  },
  {
    value: 'pho_thong',
    label: 'Phổ thông',
    emoji: '🐔',
    desc: '< 2tr · đại trà',
    bar: 'from-slate-400 to-gray-500',
    cls: 'border-slate-400 bg-slate-50 dark:bg-slate-900/40 ring-slate-200 dark:ring-slate-700',
  },
]

function BreedFormModal({
  breed,
  onClose,
  onSaved,
}: {
  breed: Breed | null
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = !!breed
  const [form, setForm] = useState({
    code: breed?.code ?? '',
    name_vi: breed?.name_vi ?? '',
    origin: breed?.origin ?? '',
    description: breed?.description ?? '',
    tier: breed?.tier ?? 'pho_thong',
    default_avatar_url: breed?.default_avatar_url ?? '',
    is_active: breed?.is_active ?? true,
    display_order: breed?.display_order ?? 0,
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [codeTouched, setCodeTouched] = useState(isEdit)
  const [imgError, setImgError] = useState(false)

  // Auto-suggest code from name (only when adding new and user hasn't manually typed code)
  function onNameChange(v: string) {
    setForm((f) => {
      const next = { ...f, name_vi: v }
      if (!codeTouched && !isEdit) {
        next.code = slugifyVi(v).replace(/-/g, '_').slice(0, 24)
      }
      return next
    })
  }

  async function save() {
    if (!form.code.trim()) {
      setErr('Mã giống không được trống')
      return
    }
    if (!form.name_vi.trim()) {
      setErr('Tên tiếng Việt không được trống')
      return
    }
    setSaving(true)
    setErr(null)
    try {
      const url = breed ? `/api/breeds/${breed.id}` : '/api/breeds'
      const method = breed ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const j = await res.json()
      if (!res.ok) {
        setErr(typeof j.error === 'string' ? j.error : JSON.stringify(j.error))
        return
      }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!breed) return
    setSaving(true)
    setErr(null)
    try {
      const res = await fetch(`/api/breeds/${breed.id}`, { method: 'DELETE' })
      const j = await res.json()
      if (!res.ok) {
        setErr(typeof j.error === 'string' ? j.error : 'Lỗi xóa')
        setConfirmDelete(false)
        return
      }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  const previewColor = getBreedColor(form.code || form.name_vi)
  const previewInitial = (form.name_vi || form.code || '?')
    .trim()
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
  const tier = TIER_OPTIONS.find((t) => t.value === form.tier) ?? TIER_OPTIONS[3]
  const showImg = !!form.default_avatar_url && !imgError

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col"
      >
        <div className={`h-1.5 bg-gradient-to-r ${tier.bar}`} />

        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`flex-shrink-0 w-12 h-12 rounded-xl ${previewColor.bg} text-white text-base font-extrabold flex items-center justify-center shadow overflow-hidden`}
            >
              {showImg ? (
                <img
                  src={form.default_avatar_url}
                  alt=""
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{previewInitial || '?'}</span>
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                {breed ? `Sửa giống · ${breed.name_vi}` : '🧬 Thêm giống gà mới'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {breed
                  ? 'Chỉnh thông tin · ảnh · phân khúc · trạng thái'
                  : 'Code → Tên → Phân khúc → Ảnh → Mô tả · Auto-slug code từ tên'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 text-2xl leading-none px-2"
            title="Đóng"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          <section>
            <SectionTitle icon="📌" title="Thông tin cơ bản" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Tên tiếng Việt" required hint="Hiển thị mọi nơi trong app">
                <input
                  type="text"
                  value={form.name_vi}
                  onChange={(e) => onNameChange(e.target.value)}
                  placeholder="VD: Gà Asil"
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
                />
              </Field>
              <Field
                label="Mã giống"
                required
                hint={isEdit ? 'Đổi mã có thể ảnh hưởng URL' : 'Auto-suggest từ tên'}
              >
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => {
                    setCodeTouched(true)
                    setForm({ ...form, code: e.target.value })
                  }}
                  placeholder="vd: asil, ma_lai"
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm font-mono"
                />
              </Field>
              <Field label="Xuất xứ" hint="Quốc gia / vùng" className="md:col-span-2">
                <input
                  type="text"
                  value={form.origin}
                  onChange={(e) => setForm({ ...form, origin: e.target.value })}
                  placeholder="VD: Ấn Độ, Peru, Việt Nam"
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
                />
              </Field>
            </div>
          </section>

          <section>
            <SectionTitle icon="💎" title="Phân khúc giá" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {TIER_OPTIONS.map((opt) => {
                const active = form.tier === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm({ ...form, tier: opt.value })}
                    className={
                      'rounded-xl border-2 overflow-hidden text-left transition ' +
                      (active
                        ? `${opt.cls} ring-2`
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300')
                    }
                  >
                    <div className={`h-1 bg-gradient-to-r ${opt.bar}`} />
                    <div className="p-2.5">
                      <div className="text-base font-bold text-gray-900 dark:text-gray-100">
                        {opt.emoji} {opt.label}
                      </div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                        {opt.desc}
                      </div>
                      {active && (
                        <div className="mt-1.5 inline-flex items-center gap-1 text-[10.5px] font-semibold text-emerald-700 dark:text-emerald-300">
                          ✓ Đã chọn
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          <section>
            <SectionTitle icon="🖼" title="Ảnh đại diện" />
            <div className="grid grid-cols-1 md:grid-cols-[1fr_120px] gap-3 items-start">
              <Field label="URL ảnh" hint="Public URL · jpg/png/webp">
                <input
                  type="url"
                  value={form.default_avatar_url}
                  onChange={(e) => {
                    setImgError(false)
                    setForm({ ...form, default_avatar_url: e.target.value })
                  }}
                  placeholder="https://… (để trống → dùng chữ cái + màu giống)"
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm font-mono"
                />
                {imgError && form.default_avatar_url && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">
                    ⚠️ Không tải được ảnh. Kiểm tra URL.
                  </p>
                )}
              </Field>
              <div className="flex items-center justify-center">
                <div
                  className={`w-24 h-24 rounded-2xl ${previewColor.bg} text-white text-2xl font-extrabold flex items-center justify-center shadow-lg ring-4 ring-white dark:ring-gray-800 overflow-hidden`}
                >
                  {showImg ? (
                    <img
                      src={form.default_avatar_url}
                      alt=""
                      onError={() => setImgError(true)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{previewInitial || '?'}</span>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section>
            <SectionTitle icon="📝" title="Mô tả" />
            <Field label="Mô tả ngắn" hint="Hiển thị ở public /giong & dropdown chọn giống">
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                placeholder="VD: Giống gà chọi nổi tiếng từ Ấn Độ, đòn cân khoẻ, sức bền cao…"
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
              />
            </Field>
          </section>

          <section>
            <SectionTitle icon="⚙️" title="Hiển thị" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
              <Field label="Thứ tự hiển thị" hint="Số nhỏ lên trước">
                <input
                  type="number"
                  value={form.display_order}
                  onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) || 0 })}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm tabular-nums"
                />
              </Field>
              <label
                className={
                  'flex items-center justify-between gap-3 px-3 py-2 rounded-lg border cursor-pointer transition ' +
                  (form.is_active
                    ? 'bg-emerald-50 border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-800'
                    : 'bg-gray-50 border-gray-300 dark:bg-gray-900/40 dark:border-gray-700')
                }
              >
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {form.is_active ? '✓ Đang hoạt động' : '✗ Đã tắt'}
                </span>
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="w-5 h-5 accent-emerald-500"
                />
              </label>
            </div>
            {!form.is_active && (
              <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded px-2 py-1.5">
                ⚠️ Khi tắt, giống sẽ không hiện ở dropdown khi tạo gà mới và không hiển thị trên public /giong.
              </p>
            )}
          </section>
        </div>

        {err && (
          <div className="mx-6 mb-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 rounded-lg px-3 py-2 text-sm">
            ✗ {err}
          </div>
        )}

        <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between gap-2 bg-gray-50/60 dark:bg-gray-900/40">
          {breed ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              disabled={saving}
              className="text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg px-3 py-2 font-semibold disabled:opacity-50"
            >
              🗑 Xóa giống
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 rounded-lg px-4 py-2 text-sm"
            >
              Huỷ
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving || !form.code || !form.name_vi}
              className={
                'rounded-lg px-5 py-2 text-sm font-semibold text-white shadow disabled:opacity-50 disabled:cursor-not-allowed transition ' +
                `bg-gradient-to-r ${tier.bar} hover:shadow-lg`
              }
            >
              {saving ? '⏳ Đang lưu…' : breed ? '💾 Lưu thay đổi' : '＋ Tạo giống'}
            </button>
          </div>
        </div>
      </div>

      {confirmDelete && breed && (
        <div
          className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4"
          onClick={() => setConfirmDelete(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="h-1.5 bg-gradient-to-r from-rose-500 to-red-500" />
            <div className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center text-xl">
                  ⚠️
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    Xóa giống &quot;{breed.name_vi}&quot;?
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Chỉ xóa được khi không còn gà nào thuộc giống này. Nếu vẫn còn gà thì hãy
                    tắt is_active thay vì xóa.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50"
                >
                  Huỷ
                </button>
                <button
                  type="button"
                  onClick={remove}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-rose-500 to-red-600 hover:shadow-md rounded-lg disabled:opacity-50"
                >
                  {saving ? 'Đang xóa…' : '🗑 Xác nhận xóa'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SectionTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <h3 className="text-[11px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
      <span>{icon}</span>
      <span>{title}</span>
    </h3>
  )
}

function Field({
  label,
  required,
  children,
  hint,
  className,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
  hint?: string
  className?: string
}) {
  return (
    <div className={className}>
      <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && (
        <p className="text-[10.5px] text-gray-500 dark:text-gray-400 mt-0.5">{hint}</p>
      )}
    </div>
  )
}
