'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Bird, Scan, Receipt, Menu } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useState } from 'react'
import { hasPermission, type PermissionsMap } from '@/lib/rbac/modules'

type Profile = {
  full_name: string
  role: string
  avatar_url: string | null
  permissions?: PermissionsMap | null
}

type Tab = {
  href: string
  label: string
  icon: typeof Home
  exact?: boolean
  highlight?: boolean
  moduleKey?: string
}

const TABS: Tab[] = [
  { href: '/admin', label: 'Home', icon: Home, exact: true },
  { href: '/admin/ho-so-ga', label: 'Gà', icon: Bird, moduleKey: 'ho_so_ga' },
  { href: '/admin/quet-qr', label: 'Quét QR', icon: Scan, highlight: true, moduleKey: 'quet_qr' },
  { href: '/admin/ban-ra', label: 'Bán', icon: Receipt, moduleKey: 'ban_ra' },
]

type NavItem = { href: string; label: string; emoji: string; moduleKey?: string }

const MORE_GROUPS: { title: string; emoji: string; items: NavItem[] }[] = [
  {
    title: 'Tổng quan',
    emoji: '📊',
    items: [
      { href: '/admin', label: 'Dashboard', emoji: '📊' },
      { href: '/admin/ke-hoach', label: 'Kế hoạch', emoji: '📅' },
      { href: '/admin/nhat-ky-cong-viec', label: 'Nhật ký CV', emoji: '📔', moduleKey: 'nhat_ky_cong_viec' },
    ],
  },
  {
    title: 'Quản lý đàn',
    emoji: '🐓',
    items: [
      { href: '/admin/ho-so-ga', label: 'Hồ sơ gà', emoji: '🐓', moduleKey: 'ho_so_ga' },
      { href: '/admin/chuong-trai', label: 'Chuồng trại', emoji: '🏠', moduleKey: 'chuong_trai' },
      { href: '/admin/gia-pha', label: 'Gia phả', emoji: '🌳', moduleKey: 'gia_pha' },
      { href: '/admin/sinh-san', label: 'Sinh sản', emoji: '🥚', moduleKey: 'sinh_san' },
      { href: '/admin/giong', label: 'Thư viện giống', emoji: '📚', moduleKey: 'giong' },
    ],
  },
  {
    title: 'Sức khỏe',
    emoji: '💉',
    items: [
      { href: '/admin/tiem-phong', label: 'Tiêm phòng', emoji: '💉', moduleKey: 'tiem_phong' },
      { href: '/admin/kho-thuoc', label: 'Kho thuốc', emoji: '💊', moduleKey: 'kho_thuoc' },
      { href: '/admin/kho-thuc-an', label: 'Kho thức ăn', emoji: '🌾', moduleKey: 'kho_thuc_an' },
      { href: '/admin/van-ga', label: 'Vần gà', emoji: '🥊', moduleKey: 'van_ga' },
    ],
  },
  {
    title: 'Thi đấu & Thành tích',
    emoji: '🏆',
    items: [
      { href: '/admin/thi-dau', label: 'Trận đấu', emoji: '⚔️', moduleKey: 'thi_dau' },
      { href: '/admin/thi-dau/giai-dau', label: 'Giải đấu', emoji: '🏟', moduleKey: 'giai_dau' },
      { href: '/admin/thi-dau/bang-xep-hang', label: 'BXH gà', emoji: '🥇', moduleKey: 'bxh_thi_dau' },
      { href: '/admin/thi-dau/thong-ke', label: 'Thống kê thi đấu', emoji: '📊', moduleKey: 'thi_dau' },
    ],
  },
  {
    title: 'Kinh doanh',
    emoji: '💵',
    items: [
      { href: '/admin/mua-vao', label: 'Mua vào', emoji: '📥', moduleKey: 'mua_vao' },
      { href: '/admin/ban-ra', label: 'Bán ra', emoji: '💵', moduleKey: 'ban_ra' },
      { href: '/admin/khach-hang', label: 'Khách hàng', emoji: '👥', moduleKey: 'khach_hang' },
      { href: '/admin/nha-cung-cap', label: 'Nhà cung cấp', emoji: '🏭', moduleKey: 'nha_cung_cap' },
    ],
  },
  {
    title: 'Tài chính & Kế toán',
    emoji: '💰',
    items: [
      { href: '/admin/quy', label: 'Quản lý quỹ', emoji: '💰', moduleKey: 'quy' },
      { href: '/admin/tai-san', label: 'Tài sản / CCDC', emoji: '🛠', moduleKey: 'tai_san' },
      { href: '/admin/hoa-don', label: 'Hóa đơn ĐT', emoji: '🧾', moduleKey: 'hoa_don' },
      { href: '/admin/bao-cao-thue', label: 'Báo cáo thuế', emoji: '📑', moduleKey: 'bao_cao_thue' },
    ],
  },
  {
    title: 'Quản lý Nhân sự',
    emoji: '👤',
    items: [
      { href: '/admin/nhan-su', label: 'Nhân sự', emoji: '👤', moduleKey: 'nhan_su' },
      { href: '/admin/nhan-su/cham-cong', label: 'Chấm công', emoji: '🕐', moduleKey: 'nhan_su' },
      { href: '/admin/nhan-su/luong', label: 'Tính lương', emoji: '💰', moduleKey: 'nhan_su' },
      { href: '/admin/nhan-su/phan-quyen', label: 'Phân quyền', emoji: '🔐', moduleKey: 'nhan_su' },
    ],
  },
  {
    title: 'Báo cáo',
    emoji: '📊',
    items: [
      { href: '/admin/tai-chinh', label: 'Báo cáo TC', emoji: '📊', moduleKey: 'tai_chinh' },
      { href: '/admin/tai-chinh/phan-tich-ai', label: 'Phân tích AI', emoji: '🤖', moduleKey: 'tai_chinh' },
    ],
  },
  {
    title: 'Marketing',
    emoji: '✨',
    items: [
      { href: '/admin/ai-marketing', label: 'AI Marketing', emoji: '✨', moduleKey: 'ai_marketing' },
      { href: '/admin/tin-tuc', label: 'Tin tức', emoji: '📰', moduleKey: 'ai_marketing' },
      { href: '/admin/bi-kip-su-ke', label: 'Bí Kíp Sư Kê', emoji: '📚', moduleKey: 'ai_marketing' },
      { href: '/admin/thu-vien', label: 'Thư viện', emoji: '🖼️', moduleKey: 'ai_marketing' },
    ],
  },
  {
    title: 'Hệ thống',
    emoji: '⚙️',
    items: [
      { href: '/admin/cai-dat', label: 'Cài đặt', emoji: '⚙️', moduleKey: 'cai_dat' },
      { href: '/admin/sao-luu', label: 'Sao lưu', emoji: '💾' },
      { href: '/admin/huong-dan', label: 'Hướng dẫn', emoji: '❓' },
      { href: '/admin/nhat-ky', label: 'Nhật ký hệ thống', emoji: '📝', moduleKey: 'nhat_ky' },
      { href: '/admin/generate-qr', label: 'In thẻ QR', emoji: '🔳', moduleKey: 'generate_qr' },
      { href: '/admin/quet-qr', label: 'Quét QR', emoji: '📷', moduleKey: 'quet_qr' },
    ],
  },
]

const SUPER_ADMIN_ITEMS: NavItem[] = [
  { href: '/admin/super-admin', label: 'Super Admin', emoji: '🌐' },
  { href: '/admin/super-admin/farms', label: 'Tất cả Farms', emoji: '🏠' },
  { href: '/admin/super-admin/landing', label: 'Landing /phan-mem', emoji: '✏️' },
  { href: '/admin/super-admin/payments', label: 'Thanh toán', emoji: '💳' },
  { href: '/admin/super-admin/orders', label: 'Đơn hàng SaaS', emoji: '📥' },
  { href: '/admin/super-admin/users', label: 'Người dùng', emoji: '👥' },
  { href: '/admin/super-admin/data', label: 'Dữ liệu trại', emoji: '🗄️' },
  { href: '/admin/super-admin/logs', label: 'Nhật ký lỗi', emoji: '🩺' },
]

export default function AdminBottomNav({
  profile,
  isSuperAdmin,
}: {
  profile?: Profile
  isSuperAdmin?: boolean
}) {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)
  const [search, setSearch] = useState('')

  function canSee(item: NavItem): boolean {
    if (!item.moduleKey) return true
    if (!profile) return true
    return hasPermission(profile.role, profile.permissions ?? {}, item.moduleKey, 'read')
  }

  // Filter visible groups based on permissions
  const visibleGroups = MORE_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter(canSee),
  })).filter((g) => g.items.length > 0)

  const q = search.trim().toLowerCase()
  const matchesSearch = (item: NavItem) =>
    !q || item.label.toLowerCase().includes(q) || item.href.toLowerCase().includes(q)

  // Apply search filter
  const displayGroups = q
    ? visibleGroups
        .map((g) => ({ ...g, items: g.items.filter(matchesSearch) }))
        .filter((g) => g.items.length > 0)
    : visibleGroups

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
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-3xl max-h-[88vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-2 sticky top-0 bg-white dark:bg-gray-800 z-10">
              <h2 className="font-bold text-base text-gray-900 dark:text-gray-100">📦 Tất cả module</h2>
              <button
                onClick={() => setMoreOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center text-gray-500"
              >
                ✕
              </button>
            </div>

            {/* Search */}
            <div className="px-4 pb-2">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm module..."
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
            </div>

            {/* Body */}
            <div className="overflow-y-auto px-4 pb-4 space-y-3">
              {displayGroups.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-500">
                  Không tìm thấy module nào khớp &quot;{search}&quot;
                </div>
              ) : (
                displayGroups.map((g) => (
                  <section key={g.title}>
                    <div className="flex items-center gap-1.5 px-1 mb-1.5">
                      <span className="text-sm">{g.emoji}</span>
                      <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                        {g.title}
                      </h3>
                      <div className="flex-1 h-px bg-gradient-to-r from-gray-200 dark:from-gray-700 to-transparent" />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {g.items.map((item) => {
                        const active =
                          item.href === '/admin'
                            ? pathname === '/admin'
                            : pathname === item.href || pathname.startsWith(item.href + '/')
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMoreOpen(false)}
                            className={cn(
                              'border rounded-xl p-2.5 text-center transition-colors min-h-[68px] flex flex-col items-center justify-center gap-1',
                              active
                                ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-semibold'
                                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                            )}
                          >
                            <span className="text-xl leading-none">{item.emoji}</span>
                            <span className="text-[11px] leading-tight">{item.label}</span>
                          </Link>
                        )
                      })}
                    </div>
                  </section>
                ))
              )}

              {/* Super Admin section */}
              {isSuperAdmin && !q && (
                <section className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-1.5 px-1 mb-1.5">
                    <span className="text-sm">👑</span>
                    <h3 className="text-[11px] font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400">
                      SaaS Owner
                    </h3>
                    <div className="flex-1 h-px bg-gradient-to-r from-violet-200 dark:from-violet-800 to-transparent" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {SUPER_ADMIN_ITEMS.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMoreOpen(false)}
                        className="border border-violet-200 dark:border-violet-800 rounded-xl p-2.5 text-center min-h-[68px] flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-950/30 dark:to-fuchsia-950/30 text-violet-700 dark:text-violet-300"
                      >
                        <span className="text-xl leading-none">{item.emoji}</span>
                        <span className="text-[11px] leading-tight font-semibold">{item.label}</span>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* Logout */}
              <form action="/auth/logout" method="POST" className="pt-2">
                <button
                  type="submit"
                  className="w-full border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 rounded-xl py-2.5 text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  🚪 Đăng xuất
                </button>
              </form>

              {profile && (
                <div className="text-center text-[11px] text-gray-400 pb-2">
                  Đăng nhập: <b>{profile.full_name}</b> ·{' '}
                  {profile.role === 'chu_trai' ? 'Chủ trại' : 'Nhân viên'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
