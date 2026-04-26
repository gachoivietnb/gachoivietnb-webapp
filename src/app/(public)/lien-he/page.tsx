import { createClient } from '@/lib/supabase/server'
import { ContactForm } from '@/components/public/ContactForm'

export const metadata = { title: 'Liên hệ | Gà Chọi Việt NB' }

export default async function LienHePage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'farm_info')
    .maybeSingle()

  const farm = ((data as { value: Record<string, string> } | null)?.value ?? {}) as {
    name?: string
    address?: string
    phone?: string
    zalo?: string
    facebook?: string
    email_business?: string
    short_name?: string
    map_url?: string
  }

  const name = farm.name || 'Gà Chọi Việt Ninh Bình'
  const phone = farm.phone || '0933.669.639'
  const zalo = farm.zalo || phone.replace(/[^0-9]/g, '')
  const facebook = farm.facebook || ''
  const email = farm.email_business || 'info@gachoivietnb.com'
  const address = farm.address || 'Hoa Lư, Ninh Bình'
  const phoneDigits = phone.replace(/[^0-9]/g, '')

  // Map: prefer admin-provided URL. Embed iframe needs google.com/maps/embed format —
  // if user pasted a shortlink (maps.app.goo.gl) or a place URL, we extract coordinates
  // to build an embed URL, fall back to address-based query, fall back to hardcoded coords.
  const mapUrlRaw = farm.map_url?.trim() || ''
  const coordsMatch = mapUrlRaw.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
  const embedSrc = mapUrlRaw.includes('/maps/embed?')
    ? mapUrlRaw
    : coordsMatch
      ? `https://www.google.com/maps?q=${coordsMatch[1]},${coordsMatch[2]}&z=15&output=embed`
      : address
        ? `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`
        : 'https://www.google.com/maps?q=20.2676067,105.9582372&z=14&output=embed'
  const directionUrl = mapUrlRaw || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`

  return (
    <div className="relative bg-gradient-to-b from-blue-50/50 via-white to-amber-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-900 min-h-screen overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-20 -left-20 w-72 h-72 rounded-full bg-blue-300/20 dark:bg-blue-900/10 blur-3xl pointer-events-none" />
      <div className="absolute top-40 -right-20 w-72 h-72 rounded-full bg-rose-300/15 dark:bg-rose-900/10 blur-3xl pointer-events-none" />

      <div className="relative">
        {/* HERO */}
        <section className="container mx-auto px-4 pt-12 pb-8 text-center max-w-4xl">
          <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-blue-100 to-violet-100 dark:from-blue-950/60 dark:to-violet-950/60 text-blue-700 dark:text-blue-300 text-[11px] font-bold uppercase tracking-widest rounded-full px-3 py-1 mb-3 border border-blue-200 dark:border-blue-900">
            ☎️ Liên hệ trang trại
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold bg-gradient-to-r from-blue-700 via-indigo-600 to-violet-600 bg-clip-text text-transparent mb-3 leading-tight">
            Hãy gọi cho chúng tôi
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-base md:text-lg max-w-2xl mx-auto">
            {name} sẵn sàng tư vấn — chọn kênh tiện nhất với bạn. Phản hồi trong vòng <strong className="text-gray-900 dark:text-gray-100">2 giờ làm việc</strong>.
          </p>
        </section>

        {/* QUICK ACTIONS — 4 channel cards */}
        <section className="container mx-auto px-4 max-w-5xl mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <ChannelCard
              href={`tel:${phoneDigits}`}
              tone="emerald"
              icon="📞"
              label="Gọi điện"
              value={phone}
              hint="Trực 7-21h"
            />
            <ChannelCard
              href={`https://zalo.me/${zalo}`}
              tone="blue"
              icon="💬"
              label="Zalo"
              value="Chat ngay"
              hint="Phản hồi <2h"
              external
            />
            {facebook && (
              <ChannelCard
                href={facebook}
                tone="indigo"
                icon="📘"
                label="Facebook"
                value="Inbox page"
                hint="Xem ảnh trại"
                external
              />
            )}
            <ChannelCard
              href={`mailto:${email}`}
              tone="amber"
              icon="✉️"
              label="Email"
              value={email}
              hint="Yêu cầu báo giá"
            />
          </div>
        </section>

        <div className="container mx-auto px-4 max-w-5xl pb-12 grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* LEFT: Address + Map + Hours (3 cols) */}
          <div className="lg:col-span-3 space-y-4">
            {/* Address card */}
            <section className="relative overflow-hidden bg-white dark:bg-gray-800 ring-1 ring-gray-200 dark:ring-gray-700 rounded-2xl shadow-sm">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
              <div className="p-5">
                <h2 className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-gray-100 mb-3">
                  <span className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-base">📍</span>
                  Địa chỉ
                </h2>
                <p className="text-[15px] text-gray-700 dark:text-gray-300 leading-relaxed">
                  {address}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <a
                    href={directionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-900 transition"
                  >
                    🗺️ Chỉ đường tới đây
                  </a>
                  <a
                    href={`tel:${phoneDigits}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 transition"
                  >
                    📞 Gọi xác nhận trước khi đến
                  </a>
                </div>
              </div>
            </section>

            {/* Map */}
            <section className="relative overflow-hidden bg-white dark:bg-gray-800 ring-1 ring-gray-200 dark:ring-gray-700 rounded-2xl shadow-sm">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
              <div className="p-5 pb-0">
                <h2 className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-gray-100 mb-3">
                  <span className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-base">🗺️</span>
                  Bản đồ
                </h2>
              </div>
              <iframe
                title="Bản đồ trang trại"
                src={embedSrc}
                width="100%"
                height="320"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="block"
              />
            </section>

            {/* Opening hours */}
            <section className="relative overflow-hidden bg-white dark:bg-gray-800 ring-1 ring-gray-200 dark:ring-gray-700 rounded-2xl shadow-sm">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-purple-500" />
              <div className="p-5">
                <h2 className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-gray-100 mb-3">
                  <span className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center text-base">🕒</span>
                  Giờ tiếp khách
                </h2>
                <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1.5">
                  <li className="flex justify-between border-b border-gray-100 dark:border-gray-700 pb-1.5">
                    <span>Thứ 2 — Thứ 7</span>
                    <span className="font-semibold tabular-nums">7:00 — 21:00</span>
                  </li>
                  <li className="flex justify-between border-b border-gray-100 dark:border-gray-700 pb-1.5">
                    <span>Chủ nhật</span>
                    <span className="font-semibold tabular-nums">8:00 — 18:00</span>
                  </li>
                  <li className="flex justify-between text-emerald-700 dark:text-emerald-400 font-semibold">
                    <span>📞 Hotline khẩn</span>
                    <span>24/7</span>
                  </li>
                </ul>
                <p className="mt-3 text-[12px] text-gray-500 dark:text-gray-400 italic">
                  💡 Khuyến nghị gọi xác nhận trước khi đến — trại có thể vắng người vào giờ cho ăn / vần gà.
                </p>
              </div>
            </section>
          </div>

          {/* RIGHT: Form (2 cols) */}
          <div className="lg:col-span-2">
            <section className="relative overflow-hidden bg-white dark:bg-gray-800 ring-1 ring-gray-200 dark:ring-gray-700 rounded-2xl shadow-md sticky top-4">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500" />
              <div className="p-5">
                <h2 className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-gray-100 mb-1">
                  <span className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center text-base">📝</span>
                  Gửi yêu cầu
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  Trại sẽ liên hệ lại trong vòng 2 giờ làm việc
                </p>
                <ContactForm />
              </div>
            </section>
          </div>
        </div>

        {/* TRUST BAR */}
        <section className="container mx-auto px-4 max-w-5xl pb-12">
          <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 rounded-2xl p-6 md:p-8 text-white shadow-lg">
            <div className="text-center mb-5">
              <div className="text-2xl md:text-3xl font-extrabold mb-1">Vì sao chọn {farm.short_name || 'Gà Chọi Việt NB'}?</div>
              <div className="text-white/80 text-sm">Mỗi con gà giao đi kèm 4 cam kết</div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <TrustItem icon="🌳" title="Gia phả minh bạch" desc="3-4 đời, QR truy xuất" />
              <TrustItem icon="💉" title="Tiêm chủng đầy đủ" desc="Newcastle, Gumboro, CRD…" />
              <TrustItem icon="📦" title="Giao toàn quốc" desc="Ship xe khách an toàn" />
              <TrustItem icon="🔄" title="Bảo hành sức khoẻ" desc="Đổi trong 7 ngày nếu lỗi" />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

const TONES: Record<string, { ring: string; bg: string; iconBg: string; iconText: string; valueText: string; hintText: string }> = {
  emerald: {
    ring: 'ring-emerald-200 dark:ring-emerald-900/60 hover:ring-emerald-400 dark:hover:ring-emerald-700',
    bg: 'bg-gradient-to-br from-emerald-50 via-white to-teal-50/40 dark:from-emerald-950/40 dark:via-gray-800 dark:to-teal-950/30',
    iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    iconText: 'text-emerald-600 dark:text-emerald-400',
    valueText: 'text-emerald-900 dark:text-emerald-100',
    hintText: 'text-emerald-700/70 dark:text-emerald-400/70',
  },
  blue: {
    ring: 'ring-blue-200 dark:ring-blue-900/60 hover:ring-blue-400 dark:hover:ring-blue-700',
    bg: 'bg-gradient-to-br from-blue-50 via-white to-indigo-50/40 dark:from-blue-950/40 dark:via-gray-800 dark:to-indigo-950/30',
    iconBg: 'bg-blue-500/10 dark:bg-blue-500/20',
    iconText: 'text-blue-600 dark:text-blue-400',
    valueText: 'text-blue-900 dark:text-blue-100',
    hintText: 'text-blue-700/70 dark:text-blue-400/70',
  },
  indigo: {
    ring: 'ring-indigo-200 dark:ring-indigo-900/60 hover:ring-indigo-400 dark:hover:ring-indigo-700',
    bg: 'bg-gradient-to-br from-indigo-50 via-white to-violet-50/40 dark:from-indigo-950/40 dark:via-gray-800 dark:to-violet-950/30',
    iconBg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
    iconText: 'text-indigo-600 dark:text-indigo-400',
    valueText: 'text-indigo-900 dark:text-indigo-100',
    hintText: 'text-indigo-700/70 dark:text-indigo-400/70',
  },
  amber: {
    ring: 'ring-amber-200 dark:ring-amber-900/60 hover:ring-amber-400 dark:hover:ring-amber-700',
    bg: 'bg-gradient-to-br from-amber-50 via-white to-orange-50/40 dark:from-amber-950/40 dark:via-gray-800 dark:to-orange-950/30',
    iconBg: 'bg-amber-500/10 dark:bg-amber-500/20',
    iconText: 'text-amber-600 dark:text-amber-400',
    valueText: 'text-amber-900 dark:text-amber-100',
    hintText: 'text-amber-700/70 dark:text-amber-400/70',
  },
}

function ChannelCard({
  href,
  tone,
  icon,
  label,
  value,
  hint,
  external,
}: {
  href: string
  tone: keyof typeof TONES
  icon: string
  label: string
  value: string
  hint?: string
  external?: boolean
}) {
  const t = TONES[tone]
  const props = external ? { target: '_blank', rel: 'noopener noreferrer' as const } : {}
  return (
    <a
      href={href}
      {...props}
      className={
        'relative overflow-hidden ' + t.bg + ' ring-1 ' + t.ring +
        ' rounded-2xl p-4 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all block group'
      }
    >
      <div className={'absolute -right-4 -top-4 w-20 h-20 rounded-full ' + t.iconBg + ' blur-2xl opacity-70'} />
      <div className="relative">
        <div className={'w-11 h-11 rounded-xl ' + t.iconBg + ' ' + t.iconText + ' flex items-center justify-center text-2xl mb-2 shadow-sm group-hover:scale-110 transition-transform'}>
          {icon}
        </div>
        <div className={'text-[10px] font-bold uppercase tracking-widest ' + t.hintText}>
          {label}
        </div>
        <div className={'text-sm md:text-[15px] font-bold leading-tight mt-0.5 ' + t.valueText + ' truncate'}>
          {value}
        </div>
        {hint && (
          <div className={'text-[10.5px] mt-1 ' + t.hintText}>{hint}</div>
        )}
      </div>
    </a>
  )
}

function TrustItem({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="bg-white/15 backdrop-blur-md rounded-xl p-3 text-center hover:bg-white/20 transition border border-white/15">
      <div className="text-3xl mb-1.5">{icon}</div>
      <div className="text-sm font-bold mb-0.5">{title}</div>
      <div className="text-[11px] text-white/80">{desc}</div>
    </div>
  )
}
