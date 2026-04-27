'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'

const TABS = [
  { href: '/admin/tiem-phong',          label: 'Lịch tới hạn',  emoji: '📅', match: 'list' },
  { href: '/admin/tiem-phong/ghi-nhan', label: 'Ghi nhận tiêm', emoji: '➕', match: 'record' },
  { href: '/admin/tiem-phong/dot-tiem', label: 'Đợt tiêm',      emoji: '🎯', match: 'batches' },
  { href: '/admin/tiem-phong/catalog',  label: 'Catalog',       emoji: '📚', match: 'catalog' },
  { href: '/admin/tiem-phong/lo-trinh', label: 'Lộ trình',      emoji: '🗺',  match: 'roadmap' },
  { href: '/admin/tiem-phong/lich-su',  label: 'Lịch sử',       emoji: '📊', match: 'history' },
]

export function VaccinationTabs() {
  const pathname = usePathname()
  function isActive(t: typeof TABS[number]): boolean {
    if (t.match === 'list') {
      const sub = ['/ghi-nhan','/dot-tiem','/catalog','/lo-trinh','/lich-su']
      return pathname === '/admin/tiem-phong' && !sub.some((s) => pathname.includes(s))
    }
    return pathname.startsWith(t.href) && t.match !== 'list'
  }
  return (
    <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
      <nav className="flex gap-1 overflow-x-auto -mb-px">
        {TABS.map((t) => {
          const active = isActive(t)
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2.5 text-sm border-b-2 transition-colors whitespace-nowrap',
                active
                  ? 'border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 hover:border-gray-300'
              )}
            >
              <span>{t.emoji}</span>
              {t.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
