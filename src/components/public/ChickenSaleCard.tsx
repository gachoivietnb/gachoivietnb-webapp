import Link from 'next/link'
import { formatVnd } from '@/lib/utils/format'
import { getBreedColor, TIER_LABEL, TIER_COLOR } from '@/lib/utils/breed-colors'

export type SaleChicken = {
  id: string
  chicken_code: string
  name: string | null
  tag_number: string | null
  breed_code: string | null
  breed_name: string | null
  breed_tier: string | null
  age_months: number | null
  weight_kg: number | null
  listed_price: number | null
  main_photo_url: string | null
  pedigree_depth: number | null
  vaccinations_done: number | null
  training_sessions_count: number | null
  avg_training_score: number | null
}

export function ChickenSaleCard({ c, highlight }: { c: SaleChicken; highlight?: 'vip' | 'top' | 'sale' | null }) {
  const color = getBreedColor(c.breed_code)
  const href = `/ga/${c.tag_number ?? c.id}`
  const tierLabel = c.breed_tier ? TIER_LABEL[c.breed_tier] : null
  const tierColor = c.breed_tier ? TIER_COLOR[c.breed_tier] : null

  return (
    <Link
      href={href}
      className={`group relative block bg-white dark:bg-gray-800 rounded-2xl overflow-hidden ring-1 ${color.border} ring-transparent shadow-sm hover:shadow-xl hover:-translate-y-1 hover:ring-2 transition-all duration-300`}
      style={{
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)',
      }}
    >
      {/* Cover */}
      <div className={`relative aspect-square ${color.bg} flex items-center justify-center overflow-hidden`}>
        {/* Top-left highlight */}
        {highlight === 'vip' && (
          <span className="absolute top-3 left-3 bg-gradient-to-r from-amber-400 to-yellow-500 text-white rounded-full px-2.5 py-1 text-[11px] font-bold flex items-center gap-1 shadow-md z-10">
            ★ VIP
          </span>
        )}
        {highlight === 'top' && (
          <span className="absolute top-3 left-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-full px-2.5 py-1 text-[11px] font-bold shadow-md z-10">
            ★ TOP
          </span>
        )}
        {highlight === 'sale' && (
          <span className="absolute top-3 left-3 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-full px-2.5 py-1 text-[11px] font-bold shadow-md animate-pulse z-10">
            🔥 SALE
          </span>
        )}

        {/* Top-right QR tag */}
        {c.tag_number && (
          <span className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm text-gray-800 dark:text-gray-200 rounded-full px-2.5 py-1 text-[11px] font-semibold font-mono shadow-md z-10">
            #{c.tag_number}
          </span>
        )}

        {/* Tier badge bottom-left */}
        {tierLabel && tierColor && (
          <span className={`absolute bottom-3 left-3 ${tierColor} rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide shadow-sm z-10`}>
            {tierLabel}
          </span>
        )}

        {/* Image */}
        {c.main_photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={c.main_photo_url}
            alt={c.chicken_code}
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
            className="w-full h-full object-cover pointer-events-none select-none group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="text-white text-[100px] leading-none drop-shadow-lg select-none transition-transform duration-300 group-hover:scale-110">
            🐓
          </div>
        )}

        {/* Gradient overlay at bottom for readability */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/25 to-transparent pointer-events-none" />
      </div>

      {/* Body */}
      <div className="p-4">
        <div className="mb-1">
          <h3 className="text-[15px] font-bold text-gray-900 dark:text-gray-100 truncate leading-tight">
            {c.name ?? c.chicken_code}
          </h3>
          {c.name && (
            <div className="text-[11px] font-mono text-gray-400 dark:text-gray-500 tracking-tight">
              {c.chicken_code}
            </div>
          )}
        </div>

        {/* Breed + age + weight pills */}
        <div className="flex flex-wrap gap-1.5 mb-3 mt-2">
          {c.breed_name && (
            <span className={`text-[10.5px] px-2 py-0.5 rounded-full font-semibold ${color.badge}`}>
              {c.breed_name}
            </span>
          )}
          {c.age_months != null && (
            <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300">
              {c.age_months}th
            </span>
          )}
          {c.weight_kg != null && (
            <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300">
              {Number(c.weight_kg).toFixed(1)}kg
            </span>
          )}
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-2.5 text-[10.5px] text-gray-600 dark:text-gray-400 mb-3 pb-3 border-b border-gray-100 dark:border-gray-700/60">
          <span className="inline-flex items-center gap-0.5">
            <span className="text-green-600 dark:text-green-400">💉</span>
            {c.vaccinations_done ?? 0}/8
          </span>
          {(c.training_sessions_count ?? 0) > 0 && (
            <>
              <span className="text-gray-300 dark:text-gray-600">·</span>
              <span className="inline-flex items-center gap-0.5">
                <span className="text-purple-600 dark:text-purple-400">🥊</span>
                {c.training_sessions_count}
              </span>
            </>
          )}
          {(c.pedigree_depth ?? 0) >= 2 && (
            <>
              <span className="text-gray-300 dark:text-gray-600">·</span>
              <span className="inline-flex items-center gap-0.5">
                <span className="text-amber-600 dark:text-amber-400">🌳</span>
                {c.pedigree_depth} đời
              </span>
            </>
          )}
          {(c.avg_training_score ?? 0) > 0 && (
            <>
              <span className="text-gray-300 dark:text-gray-600">·</span>
              <span className="inline-flex items-center gap-0.5">
                <span className="text-yellow-500">⭐</span>
                {Number(c.avg_training_score).toFixed(1)}
              </span>
            </>
          )}
        </div>

        {/* Price + CTA */}
        <div className="flex items-center justify-between gap-2">
          {c.listed_price ? (
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium tracking-wider uppercase">Giá niêm yết</span>
              <span className="text-red-600 dark:text-red-400 font-extrabold text-[16px] tabular-nums leading-tight">
                {formatVnd(c.listed_price)}
              </span>
            </div>
          ) : (
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 dark:text-gray-500 tracking-wider uppercase">Giá</span>
              <span className="text-gray-500 dark:text-gray-400 text-xs font-semibold">Liên hệ</span>
            </div>
          )}
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 group-hover:from-blue-700 group-hover:to-indigo-700 text-white rounded-xl px-3.5 py-2 text-xs font-bold shadow-sm group-hover:shadow-md transition">
            Xem →
          </span>
        </div>
      </div>
    </Link>
  )
}
