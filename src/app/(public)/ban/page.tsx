import { createClient } from '@/lib/supabase/server'
import { BanSearchClient } from '@/components/public/BanSearchClient'
import { formatVnd } from '@/lib/utils/format'

export const metadata = {
  title: 'Gà chọi đang bán | Gà Chọi Việt NB',
  description: 'Danh sách gà chọi giống đang có sẵn tại trang trại Gà Chọi Việt Ninh Bình. Asil, Mã Lai, Peru, Nòi với gia phả minh bạch.',
}

export default async function BanPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const supabase = await createClient()

  const [breedsRes, statsRes] = await Promise.all([
    supabase
      .from('breeds')
      .select('code, name_vi')
      .eq('is_active', true)
      .order('display_order'),
    supabase
      .from('public_chickens')
      .select('id, breed_code, listed_price')
      .eq('is_for_sale', true)
      .eq('status', 'dang_nuoi'),
  ])

  const breeds = breedsRes.data ?? []
  const allSale = (statsRes.data ?? []) as Array<{ id: string; breed_code: string | null; listed_price: number | null }>
  const totalCount = allSale.length
  const breedCount = new Set(allSale.map((c) => c.breed_code).filter(Boolean)).size
  const priceList = allSale.map((c) => c.listed_price).filter((p): p is number => typeof p === 'number' && p > 0)
  const minPrice = priceList.length ? Math.min(...priceList) : null

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/40 via-white to-white dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-800 dark:via-indigo-800 dark:to-purple-900">
        {/* Decorative blobs */}
        <div aria-hidden className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4" />
        <div aria-hidden className="absolute bottom-0 left-0 w-72 h-72 bg-amber-300/15 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />

        <div className="relative container mx-auto px-4 py-10 md:py-14">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-xs text-white font-semibold tracking-wide uppercase mb-4">
              🐓 Trang trại uy tín · Gia phả minh bạch
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-3 leading-tight">
              Gà chọi đang bán
            </h1>
            <p className="text-base md:text-lg text-white/90 max-w-2xl leading-relaxed">
              Mỗi chiến kê đều có <b className="text-white">mã QR truy xuất</b>, gia phả rõ ràng, tiêm chủng đầy đủ và lịch sử luyện vần chi tiết.
            </p>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 md:gap-4 mt-6 max-w-xl">
              <div className="bg-white/15 backdrop-blur-md border border-white/20 rounded-2xl p-3 md:p-4 text-center hover:bg-white/20 transition">
                <div className="text-2xl md:text-3xl font-extrabold text-white tabular-nums">{totalCount}</div>
                <div className="text-[11px] md:text-xs text-white/80 font-medium mt-0.5">Gà đang bán</div>
              </div>
              <div className="bg-white/15 backdrop-blur-md border border-white/20 rounded-2xl p-3 md:p-4 text-center hover:bg-white/20 transition">
                <div className="text-2xl md:text-3xl font-extrabold text-white tabular-nums">{breedCount}</div>
                <div className="text-[11px] md:text-xs text-white/80 font-medium mt-0.5">Giống nổi bật</div>
              </div>
              <div className="bg-white/15 backdrop-blur-md border border-white/20 rounded-2xl p-3 md:p-4 text-center hover:bg-white/20 transition">
                <div className="text-lg md:text-2xl font-extrabold text-white tabular-nums">
                  {minPrice ? formatVnd(minPrice) : '—'}
                </div>
                <div className="text-[11px] md:text-xs text-white/80 font-medium mt-0.5">Giá chỉ từ</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom wave */}
        <svg
          aria-hidden
          className="absolute bottom-0 left-0 right-0 w-full text-blue-50/40 dark:text-gray-900"
          viewBox="0 0 1440 64"
          preserveAspectRatio="none"
          style={{ height: '32px' }}
        >
          <path d="M0,32 C360,64 720,0 1080,32 L1440,32 L1440,64 L0,64 Z" fill="currentColor" />
        </svg>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6 md:py-8">
        <BanSearchClient
          initialQuery={sp.q ?? ''}
          initialBreeds={sp.breeds?.split(',') ?? []}
          breeds={breeds as never}
        />
      </div>
    </div>
  )
}
