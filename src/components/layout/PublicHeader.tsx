'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { SITE_NAME } from '@/lib/utils/constants'

const LINKS = [
  { href: '/', label: 'Trang chủ' },
  { href: '/ban', label: 'Gà đang bán' },
  { href: '/giong', label: 'Giống' },
  { href: '/bi-kip-su-ke', label: '📚 Bí Kíp Sư Kê', highlight: true },
  { href: '/thu-vien', label: 'Thư viện' },
  { href: '/tin-tuc', label: 'Tin tức' },
  { href: '/phan-mem', label: '🚀 Phần mềm', highlight: true },
  { href: '/lien-he', label: 'Liên hệ' },
]

export default function PublicHeader() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-700 sticky top-0 z-40 shadow-sm">
      <div className="container mx-auto px-4 flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 text-white flex items-center justify-center font-bold text-lg shadow-md group-hover:scale-105 transition">
            G
          </div>
          <div className="leading-tight">
            <div className="text-sm md:text-base font-semibold text-gray-900 dark:text-gray-100">
              🐓 {SITE_NAME}
            </div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400">gachoivietnb.com</div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1 text-sm">
          {LINKS.map((l) => {
            const active = l.href === '/' ? pathname === '/' : pathname.startsWith(l.href)
            const featured = 'highlight' in l && l.highlight
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  active
                    ? featured
                      ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow'
                      : 'bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300'
                    : featured
                      ? 'text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/30 font-semibold'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {l.label}
              </Link>
            )
          })}
          <a
            href="tel:0933669639"
            className="ml-2 inline-flex items-center gap-1.5 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-lg px-4 py-1.5 font-semibold text-sm shadow-md hover:shadow-lg hover:scale-105 transition"
          >
            📞 0933.669.639
          </a>
        </nav>

        <button
          className="md:hidden p-2 text-gray-700 dark:text-gray-300"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {open && (
        <nav className="md:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          {LINKS.map((l) => {
            const active = l.href === '/' ? pathname === '/' : pathname.startsWith(l.href)
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`block px-4 py-3 border-b border-gray-100 dark:border-gray-800 text-sm ${
                  active
                    ? 'bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 font-semibold'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            )
          })}
          <a
            href="tel:0933669639"
            className="block px-4 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white text-sm font-semibold"
          >
            📞 Gọi ngay: 0933.669.639
          </a>
        </nav>
      )}
    </header>
  )
}
