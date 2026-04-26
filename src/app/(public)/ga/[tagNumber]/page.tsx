import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Metadata } from 'next'
import { formatDate, formatVnd, formatAge } from '@/lib/utils/format'
import { PedigreeMiniTree } from '@/components/public/PedigreeMiniTree'
import { ShareButtons } from '@/components/public/ShareButtons'
import { ProtectedMedia } from '@/components/public/ProtectedMedia'
import { SITE_URL } from '@/lib/utils/constants'
import { getBreedColor, TIER_LABEL, TIER_COLOR } from '@/lib/utils/breed-colors'

export const revalidate = 3600

type ChickenBio = {
  id: string
  chicken_code: string
  name: string | null
  breed_code: string | null
  breed_name: string | null
  breed_tier: string | null
  gender: string
  birth_date: string | null
  age_months: number | null
  weight_kg: number | null
  color: string | null
  main_photo_url: string | null
  description: string | null
  is_for_sale: boolean
  listed_price: number | null
  status: string
  sale_date: string | null
  pedigree_depth: number | null
  vaccinations_done: number | null
  training_sessions_count: number | null
  avg_training_score: number | null
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tagNumber: string }>
}): Promise<Metadata> {
  const { tagNumber } = await params
  const supabase = await createClient()
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tagNumber)
  let chickenId: string | null = null
  if (isUuid) {
    chickenId = tagNumber
  } else {
    const { data: tag } = await supabase.from('qr_tags').select('chicken_id').eq('tag_number', tagNumber).maybeSingle()
    chickenId = (tag as { chicken_id: string | null } | null)?.chicken_id ?? null
  }
  if (!chickenId) return { title: `Gà #${tagNumber} | Gà Chọi Việt NB` }

  const { data: c } = await supabase
    .from('public_chickens')
    .select('chicken_code, name, breed_name, age_months, main_photo_url, description')
    .eq('id', chickenId)
    .maybeSingle()

  if (!c) return { title: `Gà #${tagNumber} | Gà Chọi Việt NB` }
  const row = c as {
    chicken_code: string
    name: string | null
    breed_name: string | null
    age_months: number | null
    main_photo_url: string | null
    description: string | null
  }

  const title = `${row.name ?? row.chicken_code} - ${row.breed_name} | Gà Chọi Việt NB`
  const description =
    row.description ?? `Gà ${row.breed_name}${row.age_months ? ` ${row.age_months} tháng tuổi` : ''}, gia phả minh bạch.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: row.main_photo_url ? [{ url: row.main_photo_url, width: 1200, height: 800 }] : [],
      type: 'website',
      url: `${SITE_URL}/ga/${tagNumber}`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: row.main_photo_url ? [row.main_photo_url] : [],
    },
  }
}

export default async function GaBioPage({
  params,
}: {
  params: Promise<{ tagNumber: string }>
}) {
  const { tagNumber } = await params
  const supabase = await createClient()

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tagNumber)
  let chickenId: string | null = null
  let displayTag: string | null = null

  if (isUuid) {
    chickenId = tagNumber
    const { data: tagRow } = await supabase
      .from('qr_tags')
      .select('tag_number')
      .eq('chicken_id', tagNumber)
      .maybeSingle()
    displayTag = (tagRow as { tag_number: string } | null)?.tag_number ?? null
  } else {
    const { data: tag } = await supabase
      .from('qr_tags')
      .select('chicken_id, tag_number')
      .eq('tag_number', tagNumber)
      .maybeSingle()
    if (!tag) {
      return (
        <div className="max-w-md mx-auto p-8 text-center">
          <div className="text-5xl mb-4">❌</div>
          <h1 className="text-xl font-medium">Không tìm thấy</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Mã {tagNumber} không có trong hệ thống.</p>
          <Link href="/ban" className="inline-block mt-6 text-blue-600 dark:text-blue-400 hover:underline">
            ← Xem danh sách gà đang bán
          </Link>
        </div>
      )
    }
    const tr = tag as { chicken_id: string | null; tag_number: string }
    chickenId = tr.chicken_id
    displayTag = tr.tag_number
    if (!chickenId) {
      return (
        <div className="max-w-md mx-auto p-8 text-center">
          <div className="text-5xl mb-4">🏷️</div>
          <h1 className="text-xl font-medium">Thẻ {tagNumber} chưa được kích hoạt</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2 mb-6">
            Thẻ này chưa gắn cho con gà nào. Liên hệ trang trại nếu bạn cần thông tin.
          </p>
          <Link href="/lien-he" className="inline-block bg-blue-600 text-white px-6 py-2 rounded">
            Liên hệ Gà Chọi Việt NB
          </Link>
        </div>
      )
    }
  }

  const { data: bio } = await supabase
    .from('public_chickens')
    .select('*')
    .eq('id', chickenId)
    .maybeSingle()

  const c = bio as ChickenBio | null
  if (!c) {
    return <div className="max-w-md mx-auto p-8 text-center text-gray-500 dark:text-gray-400">Không tìm thấy hồ sơ</div>
  }

  const color = getBreedColor(c.breed_code)

  const [{ data: vaccinations }, { data: media }, { data: farmRow }] = await Promise.all([
    supabase
      .from('vaccinations')
      .select('id, scheduled_date, actual_date, status, vaccines(name_vi)')
      .eq('chicken_id', c.id)
      .order('scheduled_date'),
    supabase
      .from('chicken_media')
      .select('id, drive_url, thumbnail_url, media_type, caption, is_main')
      .eq('chicken_id', c.id)
      .order('is_main', { ascending: false })
      .order('display_order')
      .limit(12),
    supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'farm_info')
      .maybeSingle(),
  ])

  const farmInfo =
    ((farmRow as { value?: Record<string, string> } | null)?.value as Record<string, string>) ?? {}
  const brand = farmInfo.short_name ?? farmInfo.name ?? 'Gà Chọi Việt NB'
  const brandUrl = farmInfo.website ?? 'https://gachoivietnb.com'
  const brandPhone = farmInfo.phone ?? ''
  const brandZalo = (farmInfo.zalo ?? brandPhone).replace(/[^0-9]/g, '')
  const mediaList = (media ?? []) as Array<{
    id: string
    drive_url: string
    thumbnail_url: string | null
    media_type: string
    caption: string | null
    is_main: boolean
  }>

  const currentUrl = `${SITE_URL}/ga/${tagNumber}`
  const shareTitle = `${c.name ?? c.chicken_code} - ${c.breed_name}`
  const tierLabel = c.breed_tier ? TIER_LABEL[c.breed_tier] : null
  const tierColor = c.breed_tier ? TIER_COLOR[c.breed_tier] : null
  const isSelling = c.is_for_sale && c.status === 'dang_nuoi' && c.listed_price

  return (
    <div className="bg-gradient-to-b from-gray-50 via-white to-white dark:from-gray-950 dark:via-gray-900 dark:to-gray-900 min-h-screen pb-32">
      {/* Breadcrumb */}
      <div className="container max-w-4xl mx-auto px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5 flex-wrap">
            <li>
              <Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400 transition">
                Trang chủ
              </Link>
            </li>
            <li>›</li>
            <li>
              <Link href="/ban" className="hover:text-blue-600 dark:hover:text-blue-400 transition">
                Gà đang bán
              </Link>
            </li>
            <li>›</li>
            <li className="font-semibold text-gray-700 dark:text-gray-300 truncate max-w-[200px]">
              {c.name ?? c.chicken_code}
            </li>
          </ol>
        </nav>
      </div>

      <article className={`container max-w-4xl mx-auto px-4 pb-8`}>
        <div
          className={`bg-white dark:bg-gray-800 rounded-3xl shadow-xl shadow-gray-900/5 overflow-hidden ring-1 ${color.border}`}
        >
          {/* HERO with image background */}
          <div className="relative">
            <div className={`relative aspect-[16/10] md:aspect-[16/9] ${color.bg} overflow-hidden`}>
              {c.main_photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.main_photo_url}
                  alt={c.name ?? c.chicken_code}
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-[180px] md:text-[220px] leading-none opacity-40 drop-shadow-2xl select-none">🐓</div>
                </div>
              )}

              {/* Dark gradient overlay for text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/20 pointer-events-none" />

              {/* Top-left: share */}
              <div className="absolute top-4 left-4 flex gap-2">
                <a
                  href={`https://zalo.me/share/link?url=${encodeURIComponent(currentUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white/20 backdrop-blur-md border border-white/30 rounded-full px-3 py-1.5 text-xs text-white font-semibold hover:bg-white/30 transition"
                >
                  📤 Chia sẻ
                </a>
              </div>

              {/* Top-right: QR tag + selling badge */}
              <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
                {displayTag && (
                  <span className="bg-white/95 backdrop-blur-md text-gray-900 dark:text-gray-100 rounded-full px-3 py-1.5 text-xs font-bold font-mono shadow-lg">
                    🏷️ #{displayTag}
                  </span>
                )}
                {isSelling && (
                  <span className="bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-full px-3 py-1.5 text-xs font-bold shadow-lg animate-pulse">
                    🔥 Đang bán
                  </span>
                )}
                {tierLabel && tierColor && (
                  <span className={`${tierColor} rounded-full px-3 py-1.5 text-xs font-bold tracking-wider shadow-md`}>
                    ★ {tierLabel}
                  </span>
                )}
              </div>

              {/* Bottom: title block */}
              <div className="absolute bottom-0 left-0 right-0 p-5 md:p-7">
                <div className="text-[11px] md:text-xs text-white/90 font-mono tracking-wide mb-1">
                  {c.chicken_code}
                </div>
                <h1 className="text-3xl md:text-5xl font-extrabold text-white leading-tight drop-shadow-lg">
                  {c.name ?? c.chicken_code}
                </h1>
                <div className="flex items-center gap-2 flex-wrap mt-2">
                  {c.breed_name && (
                    <span className="bg-white/20 backdrop-blur-md border border-white/30 rounded-full px-3 py-1 text-sm font-semibold text-white">
                      {c.breed_name}
                    </span>
                  )}
                  {c.age_months != null && (
                    <span className="bg-white/20 backdrop-blur-md border border-white/30 rounded-full px-3 py-1 text-sm font-semibold text-white">
                      {c.age_months} tháng tuổi
                    </span>
                  )}
                  <span className="bg-white/20 backdrop-blur-md border border-white/30 rounded-full px-3 py-1 text-sm font-semibold text-white">
                    {c.gender === 'trong' ? '♂ Trống' : c.gender === 'mai' ? '♀ Mái' : '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* TRUST BADGES */}
          <div className={`border-b ${color.border} bg-gradient-to-r from-green-50/50 via-white to-amber-50/50 dark:from-green-950/20 dark:via-gray-800 dark:to-amber-950/20 px-5 md:px-7 py-3`}>
            <div className="flex items-center justify-center md:justify-around gap-3 md:gap-4 flex-wrap text-[11px] md:text-xs font-semibold text-gray-700 dark:text-gray-300">
              <span className="inline-flex items-center gap-1.5"><span className="text-green-600 dark:text-green-400">✓</span> Gia phả minh bạch</span>
              <span className="text-gray-300 dark:text-gray-700 hidden md:inline">·</span>
              <span className="inline-flex items-center gap-1.5"><span className="text-blue-600 dark:text-blue-400">✓</span> QR truy xuất</span>
              <span className="text-gray-300 dark:text-gray-700 hidden md:inline">·</span>
              <span className="inline-flex items-center gap-1.5"><span className="text-purple-600 dark:text-purple-400">✓</span> Tiêm chủng đầy đủ</span>
              <span className="text-gray-300 dark:text-gray-700 hidden md:inline">·</span>
              <span className="inline-flex items-center gap-1.5"><span className="text-amber-600 dark:text-amber-400">✓</span> Sẵn sàng giao</span>
            </div>
          </div>

          {/* KEY FACTS STRIP — 4 stat cards */}
          <div className="p-5 md:p-7 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <StatCard
              icon="📅"
              iconClass="bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400"
              label="Tuổi"
              value={c.birth_date ? formatAge(c.birth_date) : (c.age_months ? `${c.age_months} tháng` : '—')}
            />
            <StatCard
              icon="⚖️"
              iconClass="bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400"
              label="Cân nặng"
              value={c.weight_kg ? `${c.weight_kg} kg` : '—'}
            />
            <StatCard
              icon="💉"
              iconClass="bg-green-100 dark:bg-green-950/60 text-green-600 dark:text-green-400"
              label="Tiêm phòng"
              value={`${c.vaccinations_done ?? 0}/8 mũi`}
            />
            <StatCard
              icon="🌳"
              iconClass="bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400"
              label="Gia phả"
              value={`${c.pedigree_depth ?? 1} đời`}
            />
          </div>

          {/* Training achievements (if any) */}
          {(c.training_sessions_count ?? 0) > 0 && (
            <div className="px-5 md:px-7 -mt-2 pb-4">
              <div className={`rounded-2xl p-4 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30 border border-red-200/50 dark:border-red-900/50`}>
                <div className="flex items-center gap-3">
                  <div className="text-3xl">🥊</div>
                  <div className="flex-1">
                    <div className="text-[10px] font-bold text-red-800 dark:text-red-300 uppercase tracking-widest mb-0.5">
                      Thành tích luyện vần
                    </div>
                    <div className="text-[15px] font-bold text-red-900 dark:text-red-200">
                      {c.training_sessions_count} buổi huấn luyện
                      {c.avg_training_score ? (
                        <span className="ml-2 inline-flex items-center gap-1 bg-white dark:bg-red-950/60 rounded-full px-2.5 py-0.5 text-xs">
                          ⭐ {Number(c.avg_training_score).toFixed(1)}/10
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DESCRIPTION */}
          {c.description && (
            <Section title="Mô tả chi tiết" icon="📝" borderClass={color.border}>
              <p className="text-[15px] text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                {c.description}
              </p>
            </Section>
          )}

          {/* SPECIFICATIONS */}
          <Section title="Thông số kỹ thuật" icon="📋" borderClass={color.border}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Info label="Giống" value={c.breed_name} />
              <Info label="Tier" value={tierLabel?.toLowerCase()} />
              <Info label="Màu lông" value={c.color} />
              <Info label="Giới tính" value={c.gender === 'trong' ? 'Trống' : c.gender === 'mai' ? 'Mái' : '—'} />
              {c.birth_date && <Info label="Ngày sinh" value={formatDate(c.birth_date)} />}
              {c.weight_kg && <Info label="Cân nặng" value={`${c.weight_kg} kg`} />}
            </div>
          </Section>

          {/* PEDIGREE */}
          <Section title="Gia phả" icon="🌳" borderClass={color.border}>
            <PedigreeMiniTree chickenId={c.id} />
          </Section>

          {/* VACCINATIONS */}
          {vaccinations && vaccinations.length > 0 && (
            <Section title="Lịch tiêm phòng" icon="💉" borderClass={color.border}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {(vaccinations as Array<{
                  id: string
                  scheduled_date: string
                  actual_date: string | null
                  status: string
                  vaccines: { name_vi: string } | null
                }>).map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700/60"
                  >
                    <span className="text-gray-700 dark:text-gray-300 font-medium">{v.vaccines?.name_vi ?? 'Vaccine'}</span>
                    {v.status === 'da_tiem' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-950/60 rounded-full px-2 py-0.5">
                        ✓ Đã tiêm
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-full px-2 py-0.5">
                        ○ Chưa
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* MEDIA */}
          <Section title="Hình ảnh & Video" icon="🖼️" borderClass={color.border}>
            {mediaList.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {mediaList.map((m) => (
                  <ProtectedMedia
                    key={m.id}
                    src={m.drive_url}
                    type={m.media_type === 'video' ? 'video' : 'image'}
                    alt={m.caption ?? c.name ?? c.chicken_code}
                    brand={brand}
                    url={brandUrl}
                    phone={brandPhone}
                    className="aspect-square rounded-xl bg-gray-100 dark:bg-gray-700 ring-1 ring-gray-200/50 dark:ring-gray-700/60"
                    videoControls={true}
                    watermarkSize="sm"
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {[color.bg, 'bg-gradient-to-br from-amber-400 to-orange-500', 'bg-gradient-to-br from-indigo-500 to-purple-600'].map((bg, i) => (
                  <div
                    key={i}
                    className={`aspect-square rounded-xl ${bg} flex items-center justify-center text-white text-4xl opacity-70`}
                  >
                    {i === 2 ? '▶' : '🐓'}
                  </div>
                ))}
              </div>
            )}
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-3 text-center italic">
              © {brand}{brandPhone && ` · ☎ ${brandPhone}`} · Cấm sao chép, phát tán khi chưa có sự đồng ý
            </p>
          </Section>

          {/* SHARE */}
          <Section title="Chia sẻ hồ sơ" icon="📤" borderClass={color.border}>
            <ShareButtons url={currentUrl} title={shareTitle} />
          </Section>
        </div>
      </article>

      {/* STICKY CTA — redesigned */}
      {isSelling && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border-t border-gray-200 dark:border-gray-700 shadow-2xl z-30">
          <div className="container max-w-4xl mx-auto px-4 py-3 md:py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-shrink-0">
                <div className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-widest">
                  Giá bán
                </div>
                <div className="text-xl md:text-2xl font-extrabold text-red-600 dark:text-red-400 tabular-nums leading-tight">
                  {formatVnd(c.listed_price!)}
                </div>
              </div>
              <div className="flex gap-2 flex-wrap justify-end">
                {brandZalo && (
                  <a
                    href={`https://zalo.me/${brandZalo}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl px-3 md:px-5 py-2.5 md:py-3 font-bold text-xs md:text-sm shadow-md hover:shadow-lg transition inline-flex items-center gap-1.5 whitespace-nowrap"
                  >
                    💬 <span className="hidden sm:inline">Zalo</span>
                  </a>
                )}
                {brandPhone && (
                  <a
                    href={`tel:${brandPhone.replace(/[^0-9+]/g, '')}`}
                    className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 border-2 border-gray-200 dark:border-gray-600 rounded-xl px-3 md:px-5 py-2.5 md:py-3 font-bold text-xs md:text-sm transition inline-flex items-center gap-1.5 whitespace-nowrap"
                  >
                    📞 <span className="hidden sm:inline">Gọi</span>
                  </a>
                )}
                <Link
                  href={`/lien-he?chicken=${c.id}`}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl px-3 md:px-6 py-2.5 md:py-3 font-bold text-xs md:text-sm shadow-md hover:shadow-lg transition inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  📝 <span className="hidden sm:inline">Liên hệ</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({
  title,
  icon,
  borderClass,
  children,
}: {
  title: string
  icon: string
  borderClass: string
  children: React.ReactNode
}) {
  return (
    <section className={`px-5 md:px-7 py-5 md:py-6 border-t ${borderClass}`}>
      <h2 className="flex items-center gap-2 text-base md:text-lg font-bold text-gray-900 dark:text-gray-100 mb-3 md:mb-4">
        <span className="text-xl">{icon}</span>
        <span>{title}</span>
      </h2>
      {children}
    </section>
  )
}

function StatCard({
  icon,
  iconClass,
  label,
  value,
}: {
  icon: string
  iconClass: string
  label: string
  value: string | number | null | undefined
}) {
  return (
    <div className="bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700/60 rounded-2xl p-3 md:p-4 hover:shadow-md transition">
      <div className={`w-9 h-9 md:w-10 md:h-10 rounded-xl ${iconClass} flex items-center justify-center text-lg md:text-xl mb-2`}>
        {icon}
      </div>
      <div className="text-[10px] md:text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-0.5">
        {label}
      </div>
      <div className="text-[15px] md:text-base font-bold text-gray-900 dark:text-gray-100">
        {value ?? '—'}
      </div>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <div className="text-[10px] md:text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-0.5">
        {label}
      </div>
      <div className="text-[14px] md:text-[15px] font-semibold text-gray-900 dark:text-gray-100">
        {value ?? '—'}
      </div>
    </div>
  )
}
