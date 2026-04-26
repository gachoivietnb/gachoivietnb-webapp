import { createClient } from '@/lib/supabase/server'
import { ProtectedMedia } from '@/components/public/ProtectedMedia'
import { FarmGalleryClient } from '@/components/public/FarmGalleryClient'

export const metadata = {
  title: 'Thư viện ảnh & video trang trại | Gà Chọi Việt NB',
  description:
    'Khám phá không gian trang trại Gà Chọi Việt Ninh Bình — chuồng trại, hoạt động, sự kiện, sản phẩm. Ảnh và video thực tế từ trại.',
}

export const revalidate = 600

const CATEGORIES: Array<{ key: string; label: string; emoji: string; gradient: string }> = [
  { key: 'all', label: 'Tất cả', emoji: '🌟', gradient: 'from-orange-500 to-red-500' },
  { key: 'chuong_trai', label: 'Chuồng trại', emoji: '🏠', gradient: 'from-blue-500 to-indigo-600' },
  { key: 'hoat_dong', label: 'Hoạt động', emoji: '👥', gradient: 'from-emerald-500 to-green-600' },
  { key: 'su_kien', label: 'Sự kiện', emoji: '🎉', gradient: 'from-purple-500 to-pink-600' },
  { key: 'san_pham', label: 'Sản phẩm', emoji: '🐓', gradient: 'from-amber-500 to-orange-600' },
  { key: 'khac', label: 'Khác', emoji: '📸', gradient: 'from-gray-500 to-gray-700' },
]

type Item = {
  id: string
  media_type: string
  url: string
  thumbnail_url: string | null
  category: string
  title: string | null
  description: string | null
  is_featured: boolean
  created_at: string
}

export default async function FarmGalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const sp = await searchParams
  const supabase = await createClient()

  const [mediaRes, farmRow] = await Promise.all([
    supabase
      .from('farm_media')
      .select('*')
      .order('is_featured', { ascending: false })
      .order('display_order')
      .order('created_at', { ascending: false })
      .limit(200),
    supabase.from('system_settings').select('value').eq('key', 'farm_info').maybeSingle(),
  ])

  const all = (mediaRes.data ?? []) as Item[]
  const farm =
    ((farmRow as { value?: Record<string, string> } | null)?.value as Record<string, string>) ?? {}
  const brand = farm.short_name ?? farm.name ?? 'Gà Chọi Việt NB'
  const brandUrl = farm.website ?? 'https://gachoivietnb.com'
  const brandPhone = farm.phone ?? ''

  const currentCat = sp.category ?? 'all'
  const items = currentCat === 'all' ? all : all.filter((i) => i.category === currentCat)
  const featured = all.filter((i) => i.is_featured).slice(0, 3)

  const counts: Record<string, number> = {
    all: all.length,
    chuong_trai: all.filter((i) => i.category === 'chuong_trai').length,
    hoat_dong: all.filter((i) => i.category === 'hoat_dong').length,
    su_kien: all.filter((i) => i.category === 'su_kien').length,
    san_pham: all.filter((i) => i.category === 'san_pham').length,
    khac: all.filter((i) => i.category === 'khac').length,
  }

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-purple-50 via-indigo-50 to-pink-50 dark:from-purple-950/40 dark:via-indigo-950/40 dark:to-pink-950/40 py-14 md:py-16">
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10">
          <span className="absolute top-8 left-[10%] text-6xl rotate-[-12deg]">📸</span>
          <span className="absolute top-20 right-[12%] text-5xl rotate-12">🎥</span>
          <span className="absolute bottom-6 left-[30%] text-5xl rotate-6">🏠</span>
        </div>
        <div className="container mx-auto px-4 text-center relative">
          <div className="inline-block text-xs font-bold tracking-widest text-purple-600 dark:text-purple-400 uppercase mb-2">
            🖼️ Thư viện
          </div>
          <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 bg-clip-text text-transparent mb-3">
            Khám phá trang trại
          </h1>
          <p className="text-gray-700 dark:text-gray-300 max-w-2xl mx-auto">
            {all.length > 0
              ? `${all.length} ảnh & video thực tế từ ${brand}. Chuồng trại, hoạt động, sản phẩm — nhìn là biết chất lượng.`
              : 'Thư viện đang được cập nhật...'}
          </p>
        </div>
      </section>

      {/* FEATURED (nếu có ảnh nổi bật) */}
      {featured.length > 0 && currentCat === 'all' && (
        <section className="container mx-auto px-4 py-10">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <span className="text-amber-500">⭐</span> Nổi bật
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {featured.map((item) => (
              <div
                key={item.id}
                className="relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-md hover:shadow-xl transition"
              >
                <ProtectedMedia
                  src={item.url}
                  alt={item.title ?? ''}
                  type={item.media_type === 'video' ? 'video' : 'image'}
                  brand={brand}
                  url={brandUrl}
                  phone={brandPhone}
                  className="aspect-video"
                  watermarkSize="sm"
                />
                {(item.title || item.description) && (
                  <div className="p-3">
                    {item.title && (
                      <div className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                        {item.title}
                      </div>
                    )}
                    {item.description && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CATEGORY TABS */}
      <section className="container mx-auto px-4 pt-4 pb-8">
        <div className="flex items-center gap-2 flex-wrap mb-6 overflow-x-auto">
          {CATEGORIES.map((c) => {
            const active = currentCat === c.key
            const count = counts[c.key] ?? 0
            return (
              <a
                key={c.key}
                href={c.key === 'all' ? '/thu-vien' : `?category=${c.key}`}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition ${
                  active
                    ? `bg-gradient-to-r ${c.gradient} text-white shadow-md`
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {c.emoji} {c.label}
                <span className={`text-[10px] px-1.5 rounded-full ${active ? 'bg-white/25' : 'bg-gray-100 dark:bg-gray-700'}`}>
                  {count}
                </span>
              </a>
            )
          })}
        </div>

        {/* GRID */}
        {items.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-12 text-center">
            <div className="text-6xl mb-3">📭</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Chưa có nội dung
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Danh mục này đang được cập nhật. Quay lại sau nhé!
            </p>
          </div>
        ) : (
          <FarmGalleryClient items={items} brand={brand} brandUrl={brandUrl} brandPhone={brandPhone} />
        )}
      </section>

      {/* CTA cuối */}
      <section className="bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 text-white py-12">
        <div className="container mx-auto px-4 text-center">
          <div className="text-4xl mb-3">🐓</div>
          <h2 className="text-2xl md:text-3xl font-bold mb-2">Muốn tham quan thực tế?</h2>
          <p className="opacity-95 mb-6">
            Đến tận trại xem gà, chọn con ưng ý — miễn phí tư vấn, miễn phí cà phê
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <a
              href={`tel:${brandPhone.replace(/[^0-9]/g, '')}`}
              className="bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 rounded-xl px-6 py-3 font-bold shadow-lg hover:scale-105 transition"
            >
              📞 Gọi {brandPhone}
            </a>
            <a
              href="/lien-he"
              className="bg-white/10 backdrop-blur-sm border-2 border-white text-white rounded-xl px-6 py-3 font-bold hover:bg-white/20 transition"
            >
              📍 Xem địa chỉ
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
