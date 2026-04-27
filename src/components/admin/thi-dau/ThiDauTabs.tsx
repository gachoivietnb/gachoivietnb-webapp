'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'

const TABS = [
  { href: '/admin/thi-dau', label: 'Trận đấu', emoji: '⚔️', match: 'list' },
  { href: '/admin/thi-dau/them-tran', label: 'Tạo trận', emoji: '➕', match: 'new' },
  { href: '/admin/thi-dau/giai-dau', label: 'Giải đấu', emoji: '🏟', match: 'tournaments' },
  { href: '/admin/thi-dau/bang-xep-hang', label: 'BXH gà', emoji: '🥇', match: 'leaderboard' },
  { href: '/admin/thi-dau/thong-ke', label: 'Thống kê', emoji: '📊', match: 'stats' },
]

export function ThiDauTabs() {
  const pathname = usePathname()

  function isActive(tab: typeof TABS[number]): boolean {
    if (tab.match === 'list') {
      return pathname === '/admin/thi-dau' || /^\/admin\/thi-dau\/[a-f0-9-]{8,}$/.test(pathname)
    }
    if (tab.match === 'new') return pathname.startsWith('/admin/thi-dau/them-tran')
    if (tab.match === 'tournaments') return pathname.startsWith('/admin/thi-dau/giai-dau')
    if (tab.match === 'leaderboard') return pathname.startsWith('/admin/thi-dau/bang-xep-hang')
    if (tab.match === 'stats') return pathname.startsWith('/admin/thi-dau/thong-ke')
    return false
  }

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
      <nav className="flex gap-1 overflow-x-auto -mb-px">
        {TABS.map((tab) => {
          const active = isActive(tab)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2.5 text-sm border-b-2 transition-colors whitespace-nowrap',
                active
                  ? 'border-red-500 text-red-700 dark:text-red-300 font-bold'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:border-gray-300'
              )}
            >
              <span>{tab.emoji}</span>
              {tab.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
