import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { getBreedColor, TIER_LABEL, TIER_COLOR } from '@/lib/utils/breed-colors'

export const metadata = { title: 'Thư viện giống gà chọi | Gà Chọi Việt NB' }
export const revalidate = 3600

export default async function GiongPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('public_breed_stats').select('*').order('display_order')
  const breeds = (data ?? []) as Array<{
    id: string
    code: string
    name_vi: string
    origin: string | null
    description: string | null
    tier: string
    current_count: number
    for_sale_count: number
    avg_listed_price: number | null
  }>

  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2 text-gray-900 dark:text-gray-100">
          📚 Thư viện giống gà Việt Nam
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">
          Tìm hiểu {breeds.length} giống gà chọi đang được nuôi tại trại. Mỗi giống có đặc điểm, nguồn gốc và phân khúc giá riêng.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {breeds.map((b) => {
          const color = getBreedColor(b.code)
          return (
            <Link
              key={b.id}
              href={`/ban?breeds=${b.code}`}
              className={`group bg-white dark:bg-gray-800 border ${color.border} rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition`}
            >
              <div className="flex items-start gap-4 p-4">
                <div
                  className={`w-20 h-20 rounded-xl ${color.bg} flex items-center justify-center text-white text-4xl shrink-0 shadow-inner select-none`}
                >
                  🐓
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-0.5">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">
                      {b.name_vi}
                    </h2>
                    <span
                      className={`shrink-0 text-[10px] font-bold tracking-wider rounded px-2 py-0.5 ${
                        TIER_COLOR[b.tier] ?? TIER_COLOR.pho_thong
                      }`}
                    >
                      {TIER_LABEL[b.tier] ?? b.tier.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {b.origin ?? 'Việt Nam'}
                  </div>
                  {b.avg_listed_price && (
                    <div className="text-[13px] font-semibold text-red-600 dark:text-red-400">
                      ~ {Number(b.avg_listed_price / 1000000).toFixed(1)} triệu/con
                    </div>
                  )}
                </div>
              </div>

              {b.description && (
                <p className="text-[13px] text-gray-600 dark:text-gray-400 px-4 pb-3 line-clamp-3 leading-relaxed">
                  {b.description}
                </p>
              )}

              <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/30">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  📦 Đang có: <strong className="text-gray-900 dark:text-gray-100">{b.current_count}</strong> con
                </div>
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  Xem gà {b.name_vi} →
                </span>
              </div>
            </Link>
          )
        })}

        {breeds.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
            Chưa có dữ liệu giống
          </div>
        )}
      </div>
    </div>
  )
}
