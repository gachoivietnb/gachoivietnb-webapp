'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { getBreedColor } from '@/lib/utils/breed-colors'
import { MediaApprovalPanel } from './MediaApprovalPanel'

type Summary = {
  id: string
  chicken_code: string
  name: string | null
  breed_code: string | null
  breed_name: string | null
  gender: string
  is_for_sale: boolean
  listed_price: number | null
  main_photo_url: string | null
  age_months: number | null
  media_count: number
  photo_count: number
  video_count: number
  approved_count: number
  published_count: number
  last_uploaded_at: string | null
}

type Breed = { code: string; name_vi: string }

export function MediaHubClient({
  summary,
  breeds,
  filter,
  breedFilter,
  q,
  gender,
  sort,
  stats,
}: {
  summary: Summary[]
  breeds: Breed[]
  filter: string
  breedFilter: string
  q: string
  gender: string
  sort: string
  stats: {
    total: number
    withMedia: number
    withoutMedia: number
    totalMedia: number
    totalApproved: number
    totalPublished: number
  }
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState(q)
  const router = useRouter()
  const searchParams = useSearchParams()

  const selected = summary.find((s) => s.id === selectedId) ?? null

  function pushParams(next: Record<string, string>) {
    const p = new URLSearchParams(searchParams.toString())
    for (const [k, v] of Object.entries(next)) {
      if (v === '' || v == null) p.delete(k)
      else p.set(k, v)
    }
    router.push(`?${p.toString()}`)
  }

  // Debounce search input 350ms
  useEffect(() => {
    if (searchInput === q) return
    const t = setTimeout(() => pushParams({ q: searchInput }), 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  function clearAll() {
    setSearchInput('')
    router.push('?')
  }

  const hasAnyFilter =
    q !== '' || breedFilter !== '' || gender !== '' || filter !== 'all' || sort !== 'recent'

  const filters: Array<{ key: string; label: string }> = [
    { key: 'all', label: `Tất cả (${stats.total})` },
    { key: 'no_media', label: `Chưa có media (${stats.withoutMedia})` },
    { key: 'has_media', label: `Đã có media (${stats.withMedia})` },
    { key: 'need_review', label: `Chờ duyệt render` },
    { key: 'has_approved', label: `Đã duyệt ≥ 1` },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100">
          ✨ AI Marketing — Kho ảnh / video
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Quản lý media theo từng con gà · tick ✓ để chọn file được render video + đăng MXH tự động
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Tổng đàn đang nuôi" value={stats.total} />
        <StatCard
          label="Có media"
          value={stats.withMedia}
          sub={`${stats.withoutMedia} chưa có`}
          subColor="text-red-600 dark:text-red-400"
          accent="emerald"
        />
        <StatCard label="Tổng file media" value={stats.totalMedia} accent="blue" />
        <StatCard
          label="Đã duyệt render"
          value={stats.totalApproved}
          sub={`${stats.totalPublished} đã đăng MXH`}
          accent="amber"
        />
      </div>

      {/* Search + advanced filters */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700 rounded-xl p-3 md:p-4 mb-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none">
              🔍
            </span>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm theo mã gà (GA-ASIL-...) hoặc tên (Hổ Vương, Phượng...)"
              className="w-full pl-9 pr-9 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg text-sm"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 p-1"
                aria-label="Xóa tìm kiếm"
              >
                ✕
              </button>
            )}
          </div>

          <select
            value={breedFilter}
            onChange={(e) => pushParams({ breed: e.target.value })}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Tất cả giống</option>
            {breeds.map((b) => (
              <option key={b.code} value={b.code}>
                {b.name_vi}
              </option>
            ))}
          </select>

          <select
            value={gender}
            onChange={(e) => pushParams({ gender: e.target.value })}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Giới tính</option>
            <option value="trong">Trống</option>
            <option value="mai">Mái</option>
            <option value="chua_xac_dinh">Chưa xác định</option>
          </select>

          <select
            value={sort}
            onChange={(e) => pushParams({ sort: e.target.value })}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg px-3 py-2 text-sm"
          >
            <option value="recent">Mới upload nhất</option>
            <option value="code">Theo mã A→Z</option>
            <option value="most_media">Nhiều media nhất</option>
            <option value="least_media">Ít media nhất</option>
          </select>

          {hasAnyFilter && (
            <button
              onClick={clearAll}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 underline ml-auto"
            >
              Xóa toàn bộ bộ lọc
            </button>
          )}
        </div>

        {/* Tab filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {filters.map((f) => {
            const active = filter === f.key
            return (
              <button
                key={f.key}
                onClick={() => pushParams({ filter: f.key === 'all' ? '' : f.key })}
                className={`px-3 py-1.5 text-xs rounded-lg ${
                  active
                    ? 'bg-blue-600 text-white font-medium'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {f.label}
              </button>
            )
          })}
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-400">
          Kết quả: <strong>{summary.length}</strong> con
          {hasAnyFilter && ' (đang lọc)'}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {summary.map((c) => {
          const color = getBreedColor(c.breed_code)
          const noMedia = Number(c.media_count) === 0
          return (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`group bg-white dark:bg-gray-800 border rounded-xl overflow-hidden text-left transition shadow-sm hover:shadow-md hover:-translate-y-0.5 ${
                noMedia
                  ? 'border-red-300 dark:border-red-900'
                  : 'border-gray-200/80 dark:border-gray-700'
              }`}
            >
              <div
                className={`relative aspect-square ${color.bg} flex items-center justify-center`}
              >
                {c.main_photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.main_photo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-white text-5xl drop-shadow">🐓</div>
                )}
                {noMedia && (
                  <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold rounded-full px-2 py-0.5">
                    Chưa có
                  </span>
                )}
                {Number(c.approved_count) > 0 && (
                  <span className="absolute top-2 right-2 bg-amber-400 text-amber-900 text-[10px] font-bold rounded-full px-2 py-0.5">
                    ✓ {c.approved_count}
                  </span>
                )}
              </div>
              <div className="p-2.5">
                <div className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                  {c.name ?? c.chicken_code}
                </div>
                <div className="text-[11px] font-mono text-gray-500 dark:text-gray-400 truncate">
                  {c.chicken_code}
                </div>
                <div className="flex items-center gap-2 mt-1.5 text-[11px] text-gray-600 dark:text-gray-400">
                  <span>📷 {c.photo_count}</span>
                  <span>🎥 {c.video_count}</span>
                  {Number(c.published_count) > 0 && (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      📤 {c.published_count}
                    </span>
                  )}
                </div>
              </div>
              <div className="px-2.5 pb-2.5">
                {noMedia ? (
                  <Link
                    href={`/admin/quet-qr/upload?chicken_id=${c.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="block text-center bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg py-1.5"
                  >
                    📷 Ra chuồng quay chụp
                  </Link>
                ) : (
                  <span className="block text-center text-xs text-blue-600 dark:text-blue-400 py-1.5">
                    Duyệt media →
                  </span>
                )}
              </div>
            </button>
          )
        })}

        {summary.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
            Không có gà nào khớp bộ lọc
          </div>
        )}
      </div>

      {selected && (
        <MediaApprovalPanel
          chicken={selected}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
  subColor,
  accent,
}: {
  label: string
  value: number | string
  sub?: string
  subColor?: string
  accent?: 'emerald' | 'blue' | 'amber'
}) {
  const accentClass: Record<string, string> = {
    emerald: 'border-l-emerald-500',
    blue: 'border-l-blue-500',
    amber: 'border-l-amber-500',
  }
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200/80 dark:border-gray-700 shadow-sm ${
        accent ? `border-l-4 ${accentClass[accent]}` : ''
      }`}
    >
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        {label}
      </div>
      <div className="text-3xl font-semibold mt-1.5 text-gray-900 dark:text-gray-100 tabular-nums">
        {value}
      </div>
      {sub && (
        <div className={`text-xs mt-1 font-medium ${subColor ?? 'text-gray-500 dark:text-gray-400'}`}>
          {sub}
        </div>
      )}
    </div>
  )
}
