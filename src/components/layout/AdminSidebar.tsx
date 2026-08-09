'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { SITE_NAME } from '@/lib/utils/constants'
import { hasPermission, type PermissionsMap } from '@/lib/rbac/modules'

type NavItem = { href: string; label: string; emoji: string; moduleKey?: string }

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Tổng quan',
    items: [
      { href: '/admin', label: 'Dashboard', emoji: '📊' },
      { href: '/admin/ke-hoach', label: 'Kế hoạch', emoji: '📅' },
      { href: '/admin/nhat-ky-cong-viec', label: 'Nhật ký công việc', emoji: '📔', moduleKey: 'nhat_ky_cong_viec' },
    ],
  },
  {
    title: 'Quản lý đàn',
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
    items: [
      { href: '/admin/tiem-phong', label: 'Tiêm phòng', emoji: '💉', moduleKey: 'tiem_phong' },
      { href: '/admin/kho-thuoc', label: 'Kho thuốc', emoji: '💊', moduleKey: 'kho_thuoc' },
      { href: '/admin/kho-thuc-an', label: 'Kho thức ăn', emoji: '🌾', moduleKey: 'kho_thuc_an' },
      { href: '/admin/van-ga', label: 'Vần gà', emoji: '🥊', moduleKey: 'van_ga' },
    ],
  },
  {
    title: 'Thi đấu & Thành tích',
    items: [
      { href: '/admin/thi-dau', label: 'Trận đấu', emoji: '⚔️', moduleKey: 'thi_dau' },
      { href: '/admin/thi-dau/giai-dau', label: 'Giải đấu', emoji: '🏟', moduleKey: 'giai_dau' },
      { href: '/admin/thi-dau/bang-xep-hang', label: 'BXH gà', emoji: '🥇', moduleKey: 'bxh_thi_dau' },
      { href: '/admin/thi-dau/thong-ke', label: 'Thống kê', emoji: '📊', moduleKey: 'thi_dau' },
    ],
  },
  {
    title: 'Kinh doanh',
    items: [
      { href: '/admin/mua-vao', label: 'Mua vào', emoji: '📥', moduleKey: 'mua_vao' },
      { href: '/admin/ban-ra', label: 'Bán ra', emoji: '💵', moduleKey: 'ban_ra' },
      { href: '/admin/khach-hang', label: 'Khách hàng', emoji: '👥', moduleKey: 'khach_hang' },
      { href: '/admin/nha-cung-cap', label: 'Nhà cung cấp', emoji: '🏭', moduleKey: 'nha_cung_cap' },
    ],
  },
  {
    title: 'Tài chính & Kế toán',
    items: [
      { href: '/admin/quy', label: 'Quản lý quỹ', emoji: '💰', moduleKey: 'quy' },
      { href: '/admin/cong-no', label: 'Công nợ', emoji: '💳', moduleKey: 'cong_no' },
      { href: '/admin/tai-san', label: 'Tài sản / CCDC', emoji: '🛠', moduleKey: 'tai_san' },
      { href: '/admin/hoa-don', label: 'Hóa đơn điện tử', emoji: '🧾', moduleKey: 'hoa_don' },
      { href: '/admin/bao-cao-thue', label: 'Báo cáo thuế', emoji: '📑', moduleKey: 'bao_cao_thue' },
    ],
  },
  {
    title: 'Quản lý Nhân sự',
    items: [
      { href: '/admin/nhan-su', label: 'Nhân sự', emoji: '👤', moduleKey: 'nhan_su' },
      { href: '/admin/nhan-su/cham-cong', label: 'Chấm công', emoji: '🕐', moduleKey: 'nhan_su' },
      { href: '/admin/nhan-su/luong', label: 'Tính lương', emoji: '💰', moduleKey: 'nhan_su' },
      { href: '/admin/nhan-su/phan-quyen', label: 'Phân quyền', emoji: '🔐', moduleKey: 'nhan_su' },
    ],
  },
  {
    title: 'Báo cáo',
    items: [
      { href: '/admin/tai-chinh', label: 'Báo cáo tổng hợp', emoji: '📊', moduleKey: 'tai_chinh' },
      { href: '/admin/tai-chinh/phan-tich-ai', label: 'Phân tích AI', emoji: '🤖', moduleKey: 'tai_chinh' },
    ],
  },
  {
    title: 'Marketing',
    items: [
      { href: '/admin/ai-marketing', label: 'AI Marketing', emoji: '✨', moduleKey: 'ai_marketing' },
      { href: '/admin/tin-tuc', label: 'Tin tức', emoji: '📰', moduleKey: 'ai_marketing' },
      { href: '/admin/bi-kip-su-ke', label: 'Bí Kíp Sư Kê', emoji: '📚', moduleKey: 'ai_marketing' },
      { href: '/admin/thu-vien', label: 'Thư viện', emoji: '🖼️', moduleKey: 'ai_marketing' },
    ],
  },
  {
    title: 'Hệ thống',
    items: [
      { href: '/admin/cai-dat', label: 'Cài đặt', emoji: '⚙️', moduleKey: 'cai_dat' },
      { href: '/admin/sao-luu', label: 'Sao lưu & Khôi phục', emoji: '💾' },
      { href: '/admin/huong-dan', label: 'Hướng dẫn', emoji: '❓' },
      { href: '/admin/nhat-ky', label: 'Nhật ký', emoji: '📝', moduleKey: 'nhat_ky' },
      { href: '/admin/generate-qr', label: 'In thẻ QR', emoji: '🔳', moduleKey: 'generate_qr' },
      { href: '/admin/quet-qr', label: 'Quét QR', emoji: '📷', moduleKey: 'quet_qr' },
    ],
  },
]

type Props = {
  profile: {
    full_name: string
    role: string
    avatar_url: string | null
    permissions?: PermissionsMap | null
  }
  isSuperAdmin?: boolean
}

export default function AdminSidebar({ profile, isSuperAdmin }: Props) {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex md:flex-col fixed top-0 left-0 h-screen w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto z-20">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
        <Link href="/admin" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            G
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
              {SITE_NAME}
            </div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
              gachoivietnb.com · Admin
            </div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-5">
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter((item) =>
            !item.moduleKey ? true : hasPermission(profile.role, profile.permissions ?? {}, item.moduleKey, 'read')
          )
          if (visibleItems.length === 0) return null
          return (
          <div key={group.title}>
            <div className="px-2 text-[10.5px] font-semibold uppercase text-gray-400 dark:text-gray-500 tracking-[0.12em] mb-2">
              {group.title}
            </div>
            <ul className="space-y-0.5">
              {visibleItems.map((item) => {
                const active =
                  item.href === '/admin'
                    ? pathname === '/admin'
                    : pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13.5px] transition-colors',
                        active
                          ? 'bg-blue-50 text-blue-700 font-semibold dark:bg-blue-950/50 dark:text-blue-300'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60'
                      )}
                    >
                      <span className="text-base leading-none">{item.emoji}</span>
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        )
        })}

        {isSuperAdmin && (
          <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="px-2 text-[10.5px] font-semibold uppercase text-violet-500 dark:text-violet-400 tracking-[0.12em] mb-2 flex items-center gap-1">
              <span>👑</span> SaaS Owner
            </div>
            <ul className="space-y-0.5">
              <li>
                <Link
                  href="/admin/super-admin"
                  className={cn(
                    'flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13.5px] transition-colors',
                    pathname === '/admin/super-admin'
                      ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-semibold shadow'
                      : 'text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/30'
                  )}
                >
                  <span className="text-base leading-none">🌐</span>
                  <span className="truncate">Super Admin</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/super-admin/farms"
                  className={cn(
                    'flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13.5px] transition-colors',
                    pathname.startsWith('/admin/super-admin/farms')
                      ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-semibold shadow'
                      : 'text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/30'
                  )}
                >
                  <span className="text-base leading-none">🏠</span>
                  <span className="truncate">Tất cả Farms</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/super-admin/landing"
                  className={cn(
                    'flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13.5px] transition-colors',
                    pathname.startsWith('/admin/super-admin/landing')
                      ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-semibold shadow'
                      : 'text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/30'
                  )}
                >
                  <span className="text-base leading-none">✏️</span>
                  <span className="truncate">Landing /phan-mem</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/super-admin/payments"
                  className={cn(
                    'flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13.5px] transition-colors',
                    pathname.startsWith('/admin/super-admin/payments')
                      ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-semibold shadow'
                      : 'text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/30'
                  )}
                >
                  <span className="text-base leading-none">💳</span>
                  <span className="truncate">Thanh toán (TK nhận)</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/super-admin/orders"
                  className={cn(
                    'flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13.5px] transition-colors',
                    pathname.startsWith('/admin/super-admin/orders')
                      ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-semibold shadow'
                      : 'text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/30'
                  )}
                >
                  <span className="text-base leading-none">📥</span>
                  <span className="truncate">Đơn hàng SaaS</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/super-admin/users"
                  className={cn(
                    'flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13.5px] transition-colors',
                    pathname.startsWith('/admin/super-admin/users')
                      ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-semibold shadow'
                      : 'text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/30'
                  )}
                >
                  <span className="text-base leading-none">👥</span>
                  <span className="truncate">Người dùng</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/super-admin/data"
                  className={cn(
                    'flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13.5px] transition-colors',
                    pathname.startsWith('/admin/super-admin/data')
                      ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-semibold shadow'
                      : 'text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/30'
                  )}
                >
                  <span className="text-base leading-none">🗄️</span>
                  <span className="truncate">Dữ liệu trại</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/super-admin/logs"
                  className={cn(
                    'flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13.5px] transition-colors',
                    pathname.startsWith('/admin/super-admin/logs')
                      ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-semibold shadow'
                      : 'text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/30'
                  )}
                >
                  <span className="text-base leading-none">🩺</span>
                  <span className="truncate">Nhật ký lỗi</span>
                </Link>
              </li>
            </ul>
          </div>
        )}
      </nav>

      <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
              {profile.full_name}
            </div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400">
              {profile.role === 'chu_trai' ? 'Chủ trại' : 'Nhân viên'}
            </div>
          </div>
          <form action="/auth/logout" method="POST">
            <button
              type="submit"
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
            >
              Đăng xuất
            </button>
          </form>
        </div>
      </div>
    </aside>
  )
}
