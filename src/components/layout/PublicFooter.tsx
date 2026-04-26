import Link from 'next/link'
import { SITE_FULL_NAME } from '@/lib/utils/constants'
import { createClient } from '@/lib/supabase/server'

export default async function PublicFooter() {
  const year = new Date().getFullYear()

  const supabase = await createClient()
  const { data: farmRow } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'farm_info')
    .maybeSingle()
  const farm =
    ((farmRow as { value?: Record<string, string> } | null)?.value as Record<string, string>) ?? {}
  const phone = farm.phone ?? '0933.669.639'
  const address = farm.address ?? 'Hoa Lư, Ninh Bình'
  const zalo = farm.zalo ?? phone.replace(/[^0-9]/g, '')
  const facebook = farm.facebook ?? ''
  const email = farm.email_business ?? 'info@gachoivietnb.com'

  return (
    <footer className="relative bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950 text-gray-300 mt-16 overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <span className="absolute top-10 left-10 text-8xl">🐓</span>
        <span className="absolute bottom-8 right-10 text-7xl">🏆</span>
      </div>

      <div className="container mx-auto px-4 py-12 relative">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 text-white flex items-center justify-center font-bold text-lg shadow-md">
                G
              </div>
              <div className="font-bold text-white text-lg leading-tight">
                {SITE_FULL_NAME}
              </div>
            </div>
            <p className="text-sm text-gray-400 dark:text-gray-500 leading-relaxed">
              Trang trại gà chọi thuần chủng Ninh Bình — gia phả minh bạch, tiêm phòng đầy đủ, cam kết
              chất lượng.
            </p>
          </div>

          {/* Nav */}
          <div>
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-3">
              Khám phá
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/ban" className="hover:text-orange-400 transition">
                  🔥 Gà đang bán
                </Link>
              </li>
              <li>
                <Link href="/giong" className="hover:text-orange-400 transition">
                  🧬 Thư viện giống
                </Link>
              </li>
              <li>
                <Link
                  href="/bi-kip-su-ke"
                  className="hover:text-orange-400 transition font-semibold"
                >
                  📚 Bí Kíp Sư Kê
                </Link>
              </li>
              <li>
                <Link
                  href="/phan-mem"
                  className="hover:text-orange-400 transition font-semibold"
                >
                  🚀 Phần mềm quản lý
                </Link>
              </li>
              <li>
                <Link href="/tin-tuc" className="hover:text-orange-400 transition">
                  📰 Tin tức
                </Link>
              </li>
              <li>
                <Link href="/thu-vien" className="hover:text-orange-400 transition">
                  🖼️ Thư viện ảnh/video
                </Link>
              </li>
              <li>
                <Link href="/lien-he" className="hover:text-orange-400 transition">
                  📞 Liên hệ
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-3">
              Liên hệ
            </h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span>📍</span>
                <span>{address}</span>
              </li>
              <li>
                <a href={`tel:${phone.replace(/[^0-9]/g, '')}`} className="hover:text-orange-400 transition flex items-center gap-2">
                  <span>📞</span>
                  <span className="font-semibold text-white">{phone}</span>
                </a>
              </li>
              <li>
                <a
                  href={`https://zalo.me/${zalo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-orange-400 transition flex items-center gap-2"
                >
                  <span>💬</span>
                  <span>Zalo: {phone}</span>
                </a>
              </li>
              {email && (
                <li className="flex items-start gap-2">
                  <span>✉️</span>
                  <a href={`mailto:${email}`} className="hover:text-orange-400 transition">
                    {email}
                  </a>
                </li>
              )}
            </ul>
          </div>

          {/* Social + CTA */}
          <div>
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-3">
              Kết nối
            </h3>
            <div className="flex flex-wrap gap-2 mb-4">
              <a
                href={`https://zalo.me/${zalo}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-lg bg-[#0068FF] hover:bg-[#0055cc] flex items-center justify-center text-white font-bold text-sm transition"
                title="Zalo"
              >
                💬
              </a>
              {facebook && (
                <a
                  href={facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-lg bg-[#1877F2] hover:bg-[#0d5fcc] flex items-center justify-center text-white font-bold text-sm transition"
                  title="Facebook"
                >
                  f
                </a>
              )}
              <a
                href={`tel:${phone.replace(/[^0-9]/g, '')}`}
                className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-600 to-orange-600 flex items-center justify-center text-white text-lg transition hover:scale-105"
                title="Gọi"
              >
                📞
              </a>
            </div>
            <Link
              href="/ban"
              className="inline-block bg-gradient-to-r from-red-600 to-orange-600 text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-md hover:shadow-lg transition"
            >
              🔥 Xem gà bán
            </Link>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
          <div>
            © {year} {SITE_FULL_NAME}. Tất cả quyền được bảo lưu.
          </div>
          <div className="flex items-center gap-4">
            <span>🔒 Bảo mật HTTPS</span>
            <span>·</span>
            <span>gachoivietnb.com</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
