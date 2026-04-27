'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'

const TABS = [
  { href: '/admin/hoa-don', label: 'Danh sách', emoji: '📋', match: 'list' },
  { href: '/admin/hoa-don/them-moi', label: 'Tạo mới', emoji: '➕', match: 'new' },
  { href: '/admin/hoa-don/nguoi-mua', label: 'Người mua', emoji: '👤', match: 'buyers' },
  { href: '/admin/hoa-don/cau-hinh', label: 'Cấu hình NCC', emoji: '⚙️', match: 'config' },
]

export function InvoiceTabs() {
  const pathname = usePathname()

  function isActive(tab: typeof TABS[number]): boolean {
    if (tab.match === 'list') {
      return pathname === '/admin/hoa-don' || /^\/admin\/hoa-don\/[a-f0-9-]{8,}/.test(pathname)
    }
    if (tab.match === 'new') return pathname.startsWith('/admin/hoa-don/them-moi')
    if (tab.match === 'buyers') return pathname.startsWith('/admin/hoa-don/nguoi-mua')
    if (tab.match === 'config') return pathname.startsWith('/admin/hoa-don/cau-hinh')
    return false
  }

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 mb-5 -mt-2">
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
                  ? 'border-amber-500 text-amber-700 dark:text-amber-300 font-semibold'
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
