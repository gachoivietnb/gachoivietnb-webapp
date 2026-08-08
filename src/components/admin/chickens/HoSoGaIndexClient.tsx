'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatVnd } from '@/lib/utils/format'
import { removeDiacritics } from '@/lib/utils/slugify'
import { getBreedColor, TIER_LABEL, TIER_COLOR } from '@/lib/utils/breed-colors'
import { ChickenStatusBadge } from '@/components/admin/chickens/ChickenStatusBadge'

export type ChickenRow = {
  id: string
  chicken_code: string
  name: string | null
  gender: string | null
  status: string
  weight_kg: number | null
  age_months: number | null
  age_days: number | null
  birth_date: string | null
  color: string | null
  listed_price: number | null
  is_for_sale: boolean | null
  main_photo_url: string | null
  tag_number: string | null
  breed_code: string | null
  breed_name: string | null
  breed_tier: string | null
  area_code: string | null
  cage_full_code: string | null
  parent_male_id: string | null
  parent_female_id: string | null
  created_at: string
}

type Breed = { code: string; name_vi: string }
type Area = { code: string; name_vi: string }
type ViewMode = 'grid' | 'list'
type SortKey = 'newest' | 'oldest' | 'code' | 'name' | 'price_desc' | 'age_asc'
type StatusFilter = '' | 'dang_nuoi' | 'dang_cach_ly' | 'da_ban' | 'chet' | 'loai_thai'
type AgeBand = '' | 'baby' | 'tre' | 'truong_thanh' | 'gia'

const PAGE_SIZE = 24

export function HoSoGaIndexClient({
  chickens,
  breeds,
  areas,
}: {
  chickens: ChickenRow[]
  breeds: Breed[]
  areas: Area[]
}) {
  const [q, setQ] = useState('')
  const [breed, setBreed] = useState('')
  const [status, setStatus] = useState<StatusFilter>('')
  const [gender, setGender] = useState<'' | 'trong' | 'mai'>('')
  const [areaCode, setAreaCode] = useState('')
  const [tier, setTier] = useState('')
  const [age, setAge] = useState<AgeBand>('')
  const [forSale, setForSale] = useState<'' | 'yes' | 'no'>('')
  const [hasQR, setHasQR] = useState<'' | 'yes' | 'no'>('')
  const [hasPhoto, setHasPhoto] = useState(false)
  const [hasPedigree, setHasPedigree] = useState(false)
  const [view, setView] = useState<ViewMode>('grid')
  const [sortKey, setSortKey] = useState<SortKey>('newest')
  const [page, setPage] = useState(1)
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDelete(c: ChickenRow) {
    if (!window.confirm(`Xóa / loại thải gà "${c.name ?? c.chicken_code}"?\n\nChủ trại: xóa hẳn (nếu không phải bố/mẹ trong gia phả). Nhân viên: đánh dấu "loại thải".`)) return
    setDeletingId(c.id)
    const res = await fetch(`/api/chickens/${c.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string }
      window.alert('Lỗi xóa: ' + (j.error ?? `HTTP ${res.status}`))
      setDeletingId(null)
      return
    }
    setDeletingId(null)
    router.refresh()
  }

  const qNorm = removeDiacritics(q.trim())

  const filtered = useMemo(() => {
    const out = chickens.filter((c) => {
      if (qNorm) {
        const hay = removeDiacritics(
          `${c.chicken_code} ${c.name ?? ''} ${c.breed_name ?? ''} ${c.tag_number ?? ''} ${c.color ?? ''}`
        )
        if (!hay.includes(qNorm)) return false
      }
      if (breed && c.breed_code !== breed) return false
      if (status && c.status !== status) return false
      if (gender && c.gender !== gender) return false
      if (areaCode && c.area_code !== areaCode) return false
      if (tier && c.breed_tier !== tier) return false
      if (age) {
        const m = c.age_months ?? -1
        if (age === 'baby' && (m < 0 || m > 3)) return false
        if (age === 'tre' && (m < 4 || m > 9)) return false
        if (age === 'truong_thanh' && (m < 10 || m > 24)) return false
        if (age === 'gia' && m < 25) return false
      }
      if (forSale === 'yes' && !c.is_for_sale) return false
      if (forSale === 'no' && c.is_for_sale) return false
      if (hasQR === 'yes' && !c.tag_number) return false
      if (hasQR === 'no' && c.tag_number) return false
      if (hasPhoto && !c.main_photo_url) return false
      if (hasPedigree && !(c.parent_male_id || c.parent_female_id)) return false
      return true
    })
    const sorted = [...out]
    if (sortKey === 'newest') sorted.sort((a, b) => b.created_at.localeCompare(a.created_at))
    else if (sortKey === 'oldest') sorted.sort((a, b) => a.created_at.localeCompare(b.created_at))
    else if (sortKey === 'code') sorted.sort((a, b) => a.chicken_code.localeCompare(b.chicken_code))
    else if (sortKey === 'name')
      sorted.sort((a, b) => (a.name ?? a.chicken_code).localeCompare(b.name ?? b.chicken_code, 'vi'))
    else if (sortKey === 'price_desc')
      sorted.sort((a, b) => (b.listed_price ?? -1) - (a.listed_price ?? -1))
    else if (sortKey === 'age_asc')
      sorted.sort((a, b) => (a.age_months ?? 999) - (b.age_months ?? 999))
    return sorted
  }, [chickens, qNorm, breed, status, gender, areaCode, tier, age, forSale, hasQR, hasPhoto, hasPedigree, sortKey])

  // Reset page when filter changes
  useMemoizedReset(filtered.length, () => setPage(1))

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // KPIs
  const total = chickens.length
  const dangNuoi = chickens.filter((c) => c.status === 'dang_nuoi').length
  const dangBan = chickens.filter((c) => c.is_for_sale && c.status === 'dang_nuoi').length
  const cachLy = chickens.filter((c) => c.status === 'dang_cach_ly').length
  const daBan = chickens.filter((c) => c.status === 'da_ban').length
  const chet = chickens.filter((c) => c.status === 'chet' || c.status === 'loai_thai').length
  const totalValue = chickens
    .filter((c) => c.is_for_sale && c.listed_price)
    .reduce((s, c) => s + (c.listed_price ?? 0), 0)

  const hasFilter = !!(
    q ||
    breed ||
    status ||
    gender ||
    areaCode ||
    tier ||
    age ||
    forSale ||
    hasQR ||
    hasPhoto ||
    hasPedigree
  )

  function clearFilters() {
    setQ('')
    setBreed('')
    setStatus('')
    setGender('')
    setAreaCode('')
    setTier('')
    setAge('')
    setForSale('')
    setHasQR('')
    setHasPhoto(false)
    setHasPedigree(false)
    setPage(1)
  }

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Kpi label="Tổng đàn" value={total.toLocaleString('vi-VN')} sub={`${filtered.length} hiển thị`} tint="blue" icon="🐓" />
        <Kpi label="Đang nuôi" value={dangNuoi.toLocaleString('vi-VN')} sub={`${cachLy} cách ly`} tint="emerald" icon="✓" />
        <Kpi label="Đang bán" value={dangBan.toLocaleString('vi-VN')} sub={formatVnd(totalValue)} tint="amber" icon="💰" />
        <Kpi label="Đã bán" value={daBan.toLocaleString('vi-VN')} sub="Lịch sử" tint="purple" icon="💵" />
        <Kpi label="Hao hụt" value={chet.toLocaleString('vi-VN')} sub="Chết + loại thải" tint="red" icon="⚠" />
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

        {/* Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-2 md:gap-3 mb-2">
          <div className="relative md:col-span-2">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">🔍</span>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Mã, tên, giống, tag QR, màu lông..."
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg pl-9 pr-3 py-2 text-sm outline-none"
            />
          </div>
          <select
            value={breed}
            onChange={(e) => setBreed(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">🧬 Mọi giống</option>
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
            <option value="dang_nuoi">Đang nuôi</option>
            <option value="dang_cach_ly">Cách ly</option>
            <option value="da_ban">Đã bán</option>
            <option value="chet">Đã chết</option>
            <option value="loai_thai">Loại thải</option>
          </select>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value as '' | 'trong' | 'mai')}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">⚥ Trống / Mái</option>
            <option value="trong">♂ Trống</option>
            <option value="mai">♀ Mái</option>
          </select>
          <select
            value={age}
            onChange={(e) => setAge(e.target.value as AgeBand)}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">📅 Mọi tuổi</option>
            <option value="baby">Gà con (0-3 tháng)</option>
            <option value="tre">Gà tre (4-9 tháng)</option>
            <option value="truong_thanh">Trưởng thành (10-24t)</option>
            <option value="gia">Gà già (≥ 25 tháng)</option>
          </select>
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-2 md:gap-3">
          <select
            value={areaCode}
            onChange={(e) => setAreaCode(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">🏠 Mọi khu</option>
            {areas.map((a) => (
              <option key={a.code} value={a.code}>
                Khu {a.code} · {a.name_vi}
              </option>
            ))}
          </select>
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
            value={forSale}
            onChange={(e) => setForSale(e.target.value as '' | 'yes' | 'no')}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">💰 Bán?</option>
            <option value="yes">✓ Đang bán</option>
            <option value="no">○ Không bán</option>
          </select>
          <select
            value={hasQR}
            onChange={(e) => setHasQR(e.target.value as '' | 'yes' | 'no')}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">🏷 QR?</option>
            <option value="yes">✓ Có tag QR</option>
            <option value="no">○ Chưa gắn tag</option>
          </select>
          <label className="flex items-center gap-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
            <input
              type="checkbox"
              checked={hasPhoto}
              onChange={(e) => setHasPhoto(e.target.checked)}
              className="w-4 h-4 accent-blue-600"
            />
            <span className="font-medium">📸 Có ảnh</span>
          </label>
          <label className="flex items-center gap-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
            <input
              type="checkbox"
              checked={hasPedigree}
              onChange={(e) => setHasPedigree(e.target.checked)}
              className="w-4 h-4 accent-blue-600"
            />
            <span className="font-medium">🌳 Có phả</span>
          </label>
        </div>

        {/* Sort + view */}
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sắp xếp:</span>
          {(
            [
              ['newest', '🆕 Mới nhất'],
              ['age_asc', '👶 Trẻ trước'],
              ['price_desc', '💰 Giá cao'],
              ['name', '🔤 Tên'],
              ['code', '🔢 Mã'],
              ['oldest', '📅 Cũ nhất'],
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
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 md:p-12 text-center">
          <div className="text-5xl mb-2">🐓</div>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {pageItems.map((c) => (
            <ChickenCard key={c.id} c={c} onDelete={() => handleDelete(c)} deleting={deletingId === c.id} />
          ))}
        </div>
      ) : (
        <ListView items={pageItems} onDelete={handleDelete} deletingId={deletingId} />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 flex-wrap text-sm">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Trang <b>{page}</b>/{totalPages} · Tổng <b>{filtered.length}</b> con
          </div>
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              ← Trước
            </button>
            {pageNumbers(page, totalPages).map((p, i) =>
              p === '...' ? (
                <span key={`gap-${i}`} className="px-2 py-1 text-gray-400">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`px-3 py-1 rounded border ${
                    p === page
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {p}
                </button>
              )
            )}
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Sau →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function pageNumbers(current: number, total: number): Array<number | '...'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const out: Array<number | '...'> = [1]
  if (current > 4) out.push('...')
  for (let p = Math.max(2, current - 2); p <= Math.min(total - 1, current + 2); p++) out.push(p)
  if (current < total - 3) out.push('...')
  out.push(total)
  return out
}

function useMemoizedReset(key: number, cb: () => void) {
  // Reset page when filter result count changes (mounting useEffect-free pattern)
  // This pattern works because React reuses state across renders; we trigger on stable change
  const [last, setLast] = useState(key)
  if (key !== last) {
    setLast(key)
    cb()
  }
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
  tint: 'blue' | 'emerald' | 'amber' | 'purple' | 'red'
  icon: string
}) {
  const map: Record<string, string> = {
    blue: 'from-blue-500 to-indigo-600',
    emerald: 'from-emerald-500 to-green-600',
    amber: 'from-amber-500 to-orange-600',
    purple: 'from-purple-500 to-fuchsia-600',
    red: 'from-red-500 to-rose-600',
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

/* ========= CARD ========= */
function ChickenCard({ c, onDelete, deleting }: { c: ChickenRow; onDelete: () => void; deleting: boolean }) {
  const color = getBreedColor(c.breed_code)
  const tierLabel = c.breed_tier ? TIER_LABEL[c.breed_tier] : null
  const tierColor = c.breed_tier ? TIER_COLOR[c.breed_tier] : null
  const hasPedigree = !!(c.parent_male_id || c.parent_female_id)

  return (
    <div
      className={`group bg-white dark:bg-gray-800 rounded-2xl overflow-hidden ring-1 ring-transparent ${color.border} hover:ring-2 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all`}
    >
      <Link href={`/admin/ho-so-ga/${c.id}`} className="block">
      {/* Cover */}
      <div className={`relative aspect-square ${color.bg} flex items-center justify-center overflow-hidden`}>
        {c.main_photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={c.main_photo_url}
            alt={c.chicken_code}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="text-7xl drop-shadow-lg group-hover:scale-110 transition-transform">🐓</div>
        )}

        {/* Top-left: tier */}
        {tierLabel && tierColor && (
          <span className={`absolute top-2 left-2 ${tierColor} rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wider shadow`}>
            ★ {tierLabel}
          </span>
        )}
        {/* Top-right: QR */}
        {c.tag_number && (
          <span className="absolute top-2 right-2 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-full px-2 py-0.5 text-[10px] font-mono font-bold shadow">
            #{c.tag_number}
          </span>
        )}
        {/* Bottom-left: status */}
        <div className="absolute bottom-2 left-2">
          <ChickenStatusBadge status={c.status} />
        </div>
        {/* Bottom-right: gender */}
        {c.gender && (
          <span className="absolute bottom-2 right-2 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold shadow">
            {c.gender === 'trong' ? '♂' : c.gender === 'mai' ? '♀' : '?'}
          </span>
        )}

        {/* For-sale ribbon */}
        {c.is_for_sale && c.status === 'dang_nuoi' && (
          <div className="absolute top-1/2 right-0 -translate-y-1/2 bg-gradient-to-r from-red-500 to-rose-600 text-white text-[10px] font-bold px-3 py-0.5 shadow-md transform translate-x-2 group-hover:translate-x-0 transition">
            🔥 ĐANG BÁN
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
      </div>

      {/* Body */}
      <div className="p-3">
        <div className="font-bold text-sm truncate">{c.name ?? c.chicken_code}</div>
        <div className="text-[11px] font-mono text-gray-400 dark:text-gray-500 truncate mb-1.5">
          {c.chicken_code}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap mb-2">
          {c.breed_name && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${color.badge}`}>
              {c.breed_name}
            </span>
          )}
          {c.age_months != null && (
            <span className="text-[10px] text-gray-500 dark:text-gray-400">{c.age_months}t</span>
          )}
          {c.weight_kg != null && (
            <span className="text-[10px] text-gray-500 dark:text-gray-400">{Number(c.weight_kg).toFixed(1)}kg</span>
          )}
        </div>

        {/* Stats footer */}
        <div className="flex items-center justify-between text-[10.5px] pt-2 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            {c.cage_full_code && (
              <span className="inline-flex items-center gap-0.5" title="Chuồng">
                🏠 {c.cage_full_code}
              </span>
            )}
            {hasPedigree && (
              <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400" title="Có gia phả">
                🌳
              </span>
            )}
          </div>
          {c.is_for_sale && c.listed_price ? (
            <span className="font-bold text-red-600 dark:text-red-400 tabular-nums text-[11px]">
              {formatVnd(c.listed_price)}
            </span>
          ) : (
            <span className="text-blue-600 dark:text-blue-400 font-semibold opacity-0 group-hover:opacity-100 transition">
              Xem →
            </span>
          )}
        </div>
      </div>
      </Link>
      <div className="flex border-t border-gray-100 dark:border-gray-700 divide-x divide-gray-100 dark:divide-gray-700">
        <Link
          href={`/admin/ho-so-ga/${c.id}/sua`}
          className="flex-1 text-center py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          ✏️ Sửa
        </Link>
        <button
          onClick={onDelete}
          disabled={deleting}
          className="flex-1 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-50"
        >
          {deleting ? '⏳ Đang xóa…' : '🗑️ Xóa'}
        </button>
      </div>
    </div>
  )
}

/* ========= LIST VIEW ========= */
function ListView({
  items,
  onDelete,
  deletingId,
}: {
  items: ChickenRow[]
  onDelete: (c: ChickenRow) => void
  deletingId: string | null
}) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-x-auto shadow-sm">
      <table className="w-full text-sm min-w-[1000px]">
        <thead className="bg-gray-50 dark:bg-gray-900/60 text-[11px] uppercase text-gray-500 dark:text-gray-400">
          <tr>
            <th className="px-3 py-2.5 text-left">Gà</th>
            <th className="px-3 py-2.5 text-left">Giống</th>
            <th className="px-3 py-2.5 text-center">Giới</th>
            <th className="px-3 py-2.5 text-center">Tuổi</th>
            <th className="px-3 py-2.5 text-center">Cân</th>
            <th className="px-3 py-2.5 text-left">Chuồng</th>
            <th className="px-3 py-2.5 text-center">QR</th>
            <th className="px-3 py-2.5 text-center">Trạng thái</th>
            <th className="px-3 py-2.5 text-right">Giá bán</th>
            <th className="px-3 py-2.5 text-center">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {items.map((c) => {
            const color = getBreedColor(c.breed_code)
            return (
              <tr key={c.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-900/30 transition">
                <td className="px-3 py-2">
                  <Link href={`/admin/ho-so-ga/${c.id}`} className="flex items-center gap-2 group">
                    {c.main_photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.main_photo_url} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className={`w-9 h-9 rounded-full ${color.bg} flex items-center justify-center text-base flex-shrink-0`}>
                        🐓
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                        {c.name ?? c.chicken_code}
                      </div>
                      <div className="text-[11px] font-mono text-gray-400 dark:text-gray-500 truncate">
                        {c.chicken_code}
                      </div>
                    </div>
                  </Link>
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
                <td className="px-3 py-2 text-center text-xs tabular-nums">
                  {c.weight_kg != null ? `${Number(c.weight_kg).toFixed(1)}kg` : '—'}
                </td>
                <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300">
                  {c.cage_full_code ?? '—'}
                </td>
                <td className="px-3 py-2 text-center text-xs font-mono">
                  {c.tag_number ? <span className="bg-gray-100 dark:bg-gray-700 rounded px-1.5 py-0.5">#{c.tag_number}</span> : '—'}
                </td>
                <td className="px-3 py-2 text-center">
                  <ChickenStatusBadge status={c.status} />
                </td>
                <td className="px-3 py-2 text-right">
                  {c.is_for_sale && c.listed_price ? (
                    <span className="font-bold text-red-600 dark:text-red-400 tabular-nums">{formatVnd(c.listed_price)}</span>
                  ) : (
                    <span className="text-gray-400 text-xs italic">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-center whitespace-nowrap">
                  <div className="flex items-center justify-center gap-1.5">
                    <Link
                      href={`/admin/ho-so-ga/${c.id}/sua`}
                      title="Sửa"
                      className="text-xs px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-semibold"
                    >
                      ✏️
                    </Link>
                    <button
                      onClick={() => onDelete(c)}
                      disabled={deletingId === c.id}
                      title="Xóa"
                      className="text-xs px-2 py-1 rounded-lg border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-50 font-semibold"
                    >
                      {deletingId === c.id ? '⏳' : '🗑️'}
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
