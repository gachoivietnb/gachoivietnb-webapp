'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatVnd } from '@/lib/utils/format'
import { ChickenSaleCard, type SaleChicken } from './ChickenSaleCard'
import { getBreedColor } from '@/lib/utils/breed-colors'

type Breed = { code: string; name_vi: string }

type PublicChicken = SaleChicken & {
  color?: string | null
}

export function BanSearchClient({
  initialQuery,
  initialBreeds,
  breeds,
}: {
  initialQuery: string
  initialBreeds: string[]
  breeds: Breed[]
}) {
  const [query, setQuery] = useState(initialQuery)
  const [selectedBreeds, setSelectedBreeds] = useState<string[]>(initialBreeds)
  const [results, setResults] = useState<PublicChicken[]>([])
  const [loading, setLoading] = useState(true)
  const [parsed, setParsed] = useState<{ cleanText: string; smartFilters: Record<string, unknown> } | null>(null)
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set())

  async function doSearch() {
    setLoading(true)
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (selectedBreeds.length > 0) params.set('breeds', selectedBreeds.join(','))
    const res = await fetch(`/api/public/chickens/search?${params}`)
    const json = await res.json()
    setResults((json.data ?? []) as PublicChicken[])
    setParsed(json.parsed ?? null)
    setLoading(false)
  }

  useEffect(() => {
    doSearch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toggleBreed(code: string) {
    setSelectedBreeds((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]))
  }

  function toggleCompare(id: string) {
    setCompareIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (next.size < 3) next.add(id)
      return next
    })
  }

  const comparedChickens = results.filter((r) => compareIds.has(r.id))

  return (
    <>
      {/* Search form — glassmorphism style */}
      <form
        onSubmit={(e) => { e.preventDefault(); doSearch() }}
        className="bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700 rounded-2xl shadow-sm p-4 md:p-5 mb-6 space-y-4"
      >
        <div className="relative flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-lg pointer-events-none">
              🔍
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='Tìm kiếm thông minh — ví dụ: "Asil vần 5 buổi" hoặc "gia phả 3 đời"'
              className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl pl-11 pr-4 py-3 text-sm outline-none transition"
            />
          </div>
          <button
            type="submit"
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl px-5 md:px-6 py-3 text-sm font-bold shadow-sm hover:shadow-md transition whitespace-nowrap"
          >
            Tìm
          </button>
        </div>

        {/* Breed pills with color-coded active state */}
        {breeds.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider self-center mr-1">
              Giống:
            </span>
            {breeds.map((b) => {
              const bc = getBreedColor(b.code)
              const isActive = selectedBreeds.includes(b.code)
              return (
                <button
                  key={b.code}
                  type="button"
                  onClick={() => toggleBreed(b.code)}
                  className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-all ${
                    isActive
                      ? `${bc.bg} text-white shadow-sm ring-2 ring-offset-1 ring-offset-white dark:ring-offset-gray-800`
                      : `${bc.badge} hover:opacity-80`
                  }`}
                >
                  {b.name_vi}
                </button>
              )
            })}
            {selectedBreeds.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedBreeds([])}
                className="text-xs text-red-600 dark:text-red-400 hover:underline font-medium"
              >
                ✕ Bỏ lọc
              </button>
            )}
          </div>
        )}

        {parsed && Object.keys(parsed.smartFilters).length > 0 && (
          <div className="text-xs bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded-lg p-3 border border-blue-200/50 dark:border-blue-900/50">
            <span className="font-bold">💡 AI Phát hiện:</span> {Object.entries(parsed.smartFilters).map(([k, v]) => (
              <span key={k} className="inline-block bg-blue-100 dark:bg-blue-900/60 rounded px-2 py-0.5 ml-1.5 font-medium">
                {k}={String(v)}
              </span>
            ))}
            {parsed.cleanText && parsed.cleanText !== query && (
              <span className="text-blue-600/70 dark:text-blue-400/70 ml-2">· Text: "{parsed.cleanText}"</span>
            )}
          </div>
        )}
      </form>

      {/* Stats bar */}
      {!loading && results.length > 0 && (
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Tìm thấy <span className="font-bold text-gray-900 dark:text-gray-100">{results.length}</span> con gà phù hợp
          </div>
          {compareIds.size > 0 && (
            <div className="text-sm text-blue-600 dark:text-blue-400 font-semibold">
              🔎 {compareIds.size} đang so sánh
            </div>
          )}
        </div>
      )}

      {loading ? (
        <SkeletonGrid />
      ) : results.length === 0 ? (
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-12 text-center">
          <div className="text-6xl mb-3">🔍</div>
          <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">Không tìm thấy gà nào phù hợp</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Thử nới rộng tiêu chí, bỏ bớt filter, hoặc{' '}
            <button
              onClick={() => { setQuery(''); setSelectedBreeds([]); setTimeout(doSearch, 0) }}
              className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
            >
              xem tất cả gà
            </button>
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5 mb-24">
          {results.map((c, i) => {
            const highlight = c.breed_tier === 'cao_cap' || c.breed_tier === 'dac_biet'
              ? 'vip'
              : (c.avg_training_score ?? 0) >= 8.5
                ? 'top'
                : i === 5 || i === 11
                  ? 'sale'
                  : null
            return (
              <div key={c.id} className="relative">
                <ChickenSaleCard c={c} highlight={highlight as 'vip' | 'top' | 'sale' | null} />
                <button
                  onClick={(e) => { e.preventDefault(); toggleCompare(c.id) }}
                  className={`absolute top-3 right-3 text-[10px] font-bold px-2.5 py-1 rounded-full transition-all shadow-sm z-20 ${
                    compareIds.has(c.id)
                      ? 'bg-blue-600 text-white scale-105'
                      : 'bg-white/95 backdrop-blur-sm text-gray-700 hover:bg-white hover:scale-105 border border-gray-200/80'
                  }`}
                  style={{ top: 'calc(3rem + 4px)' }}
                >
                  {compareIds.has(c.id) ? '✓ So sánh' : '+ So sánh'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {comparedChickens.length > 0 && (
        <ComparisonDrawer chickens={comparedChickens} onClear={() => setCompareIds(new Set())} />
      )}
    </>
  )
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden ring-1 ring-gray-100 dark:ring-gray-700/50 shadow-sm"
        >
          <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 animate-pulse" />
          <div className="p-4 space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse" />
            <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2 animate-pulse" />
            <div className="flex gap-1.5 pt-2">
              <div className="h-5 bg-gray-100 dark:bg-gray-700 rounded-full w-12 animate-pulse" />
              <div className="h-5 bg-gray-100 dark:bg-gray-700 rounded-full w-10 animate-pulse" />
            </div>
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-2/3 animate-pulse mt-3" />
          </div>
        </div>
      ))}
    </div>
  )
}

function ComparisonDrawer({ chickens, onClear }: { chickens: PublicChicken[]; onClear: () => void }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border-t border-gray-200 dark:border-gray-700 shadow-2xl p-4 z-30 max-h-[60vh] overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-base flex items-center gap-2">
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              🔎 So sánh {chickens.length}/3 con
            </span>
          </h3>
          <button
            onClick={onClear}
            className="text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg px-3 py-1.5 font-semibold transition"
          >
            ✕ Xóa tất cả
          </button>
        </div>
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${chickens.length}, minmax(0, 1fr))` }}>
          {chickens.map((c) => {
            const bc = getBreedColor(c.breed_code)
            return (
              <div
                key={c.id}
                className={`border-2 ${bc.border} bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3 text-xs space-y-1.5`}
              >
                <div className="font-bold truncate text-sm">{c.name ?? c.chicken_code}</div>
                <div className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold ${bc.badge}`}>
                  {c.breed_name}
                </div>
                <div className="pt-1 space-y-0.5 text-gray-600 dark:text-gray-400">
                  <div>Tuổi: <b className="text-gray-900 dark:text-gray-200">{c.age_months ?? '—'}th</b></div>
                  <div>Giá: <b className="text-red-600 dark:text-red-400">{c.listed_price ? formatVnd(c.listed_price) : '—'}</b></div>
                  <div>Gia phả: <b className="text-gray-900 dark:text-gray-200">{c.pedigree_depth ?? 1} đời</b></div>
                  <div>Vần: <b className="text-gray-900 dark:text-gray-200">{c.training_sessions_count ?? 0}b</b> {c.avg_training_score ? `(${c.avg_training_score}/10)` : ''}</div>
                  <div>Tiêm: <b className="text-gray-900 dark:text-gray-200">{c.vaccinations_done ?? 0}/8</b></div>
                </div>
                {c.tag_number && (
                  <Link
                    href={`/ga/${c.tag_number}`}
                    className="block text-center text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-900 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg mt-2 py-1.5 text-[11px] font-bold transition"
                  >
                    Xem chi tiết →
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
