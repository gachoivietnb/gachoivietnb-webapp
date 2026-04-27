'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Bird, Scan, Receipt, Menu } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useState } from 'react'

const TABS = [
  { href: '/admin', label: 'Home', icon: Home, exact: true },
  { href: '/admin/ho-so-ga', label: 'Gà', icon: Bird },
  { href: '/admin/quet-qr', label: 'Quét QR', icon: Scan, highlight: true },
  { href: '/admin/ban-ra', label: 'Bán', icon: Receipt },
]

const MORE_LINKS = [
  { href: '/admin/chuong-trai', label: 'Chuồng trại' },
  { href: '/admin/gia-pha', label: 'Gia phả' },
  { href: '/admin/sinh-san', label: 'Sinh sản' },
  { href: '/admin/tiem-phong', label: 'Tiêm phòng' },
  { href: '/admin/kho-thuoc', label: 'Kho thuốc' },
  { href: '/admin/kho-thuc-an', label: 'Kho thức ăn' },
  { href: '/admin/van-ga', label: 'Vần gà' },
  { href: '/admin/mua-vao', label: 'Mua vào' },
  { href: '/admin/khach-hang', label: 'Khách hàng' },
  { href: '/admin/quy', label: 'Quản lý quỹ' },
  { href: '/admin/tai-san', label: 'Tài sản / CCDC' },
  { href: '/admin/hoa-don', label: 'Hóa đơn ĐT' },
  { href: '/admin/bao-cao-thue', label: 'Báo cáo thuế' },
  { href: '/admin/tai-chinh', label: 'Báo cáo TC' },
  { href: '/admin/nhan-su', label: 'Nhân sự' },
  { href: '/admin/ai-marketing', label: 'AI Marketing' },
  { href: '/admin/cai-dat', label: 'Cài đặt' },
  { href: '/admin/huong-dan', label: 'Hướng dẫn' },
]

export default function AdminBottomNav() {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-30">
        <div className="flex items-stretch">
          {TABS.map((tab) => {
            const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href)
            const Icon = tab.icon
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'flex-1 flex flex-col items-center gap-0.5 py-2 text-xs',
                  active ? 'text-blue-600' : 'text-gray-600',
                  tab.highlight && 'relative'
                )}
              >
                <div
                  className={cn(
                    'flex items-center justify-center',
                    tab.highlight &&
                      '-mt-5 w-12 h-12 rounded-full bg-blue-600 text-white shadow-md'
                  )}
                >
                  <Icon className={cn(tab.highlight ? 'w-6 h-6' : 'w-5 h-5')} />
                </div>
                <span className={cn(tab.highlight && 'mt-0')}>{tab.label}</span>
              </Link>
            )
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="flex-1 flex flex-col items-center gap-0.5 py-2 text-xs text-gray-600 dark:text-gray-400"
          >
            <Menu className="w-5 h-5" />
            <span>Thêm</span>
          </button>
        </div>
      </nav>

      {moreOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-2xl p-4 max-h-[75vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-medium">Tất cả module</h2>
              <button onClick={() => setMoreOpen(false)} className="text-gray-500 dark:text-gray-400">
                ✕
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {MORE_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMoreOpen(false)}
                  className="border border-gray-200 dark:border-gray-700 rounded p-3 text-center text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <form action="/auth/logout" method="POST" className="mt-3">
              <button
                type="submit"
                className="w-full border border-red-200 text-red-600 dark:text-red-400 rounded py-2 text-sm"
              >
                Đăng xuất
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
