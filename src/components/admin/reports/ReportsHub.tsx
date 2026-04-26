'use client'

import Link from 'next/link'
import { formatVnd } from '@/lib/utils/format'

export type HubKpi = {
  revenue: number
  expense: number
  profit: number
  profitMargin: number
  treasuryBalance: number
  treasuryAccountCount: number
  receivableTotal: number
  receivableCount: number
  monthLabel: string
  changeRevenue: number  // % so tháng trước
  changeProfit: number
}

type ReportCard = {
  id: string
  href: string
  title: string
  desc: string
  emoji: string
  bar: string
  ring: string
  isExternal?: boolean   // route ngoài /admin/tai-chinh/bao-cao
  badge?: string
  hint?: string
  external?: boolean
}

const CARDS_FINANCE: ReportCard[] = [
  {
    id: 'pnl',
    href: '/admin/tai-chinh/bao-cao/pnl',
    title: 'Lãi / Lỗ (P&L)',
    emoji: '💰',
    desc: 'Doanh thu · giá vốn · chi phí · lãi gộp · lãi ròng',
    bar: 'from-emerald-400 to-teal-500',
    ring: 'ring-emerald-400/30',
    hint: 'Chốt sổ đầu tháng',
  },
  {
    id: 'xu-huong',
    href: '/admin/tai-chinh/bao-cao/xu-huong',
    title: 'Xu hướng 6 tháng',
    emoji: '📈',
    desc: 'Doanh thu · chi phí · lãi ròng theo tháng',
    bar: 'from-violet-400 to-purple-500',
    ring: 'ring-violet-400/30',
  },
  {
    id: 'dong-tien',
    href: '/admin/tai-chinh/bao-cao/dong-tien',
    title: 'Dòng tiền',
    emoji: '💸',
    desc: 'Thu / chi thực tế từ quỹ + breakdown',
    bar: 'from-blue-400 via-indigo-500 to-violet-500',
    ring: 'ring-indigo-400/30',
  },
  {
    id: 'chi-phi',
    href: '/admin/tai-chinh/bao-cao/chi-phi',
    title: 'Chi phí 8 hạng mục',
    emoji: '🧾',
    desc: 'Pie chart · drill-down · so sánh tháng trước',
    bar: 'from-rose-400 to-red-500',
    ring: 'ring-rose-400/30',
  },
  {
    id: 'gia-von',
    href: '/admin/tai-chinh/bao-cao/gia-von',
    title: 'Giá vốn từng con gà',
    emoji: '🐓',
    desc: 'Margin lợi nhuận · highlight lỗ nặng',
    bar: 'from-amber-400 to-orange-500',
    ring: 'ring-amber-400/30',
  },
  {
    id: 'cong-no',
    href: '/admin/tai-chinh/bao-cao/cong-no',
    title: 'Công nợ khách hàng',
    emoji: '⚠️',
    desc: 'Khách còn nợ · cảnh báo quá hạn 30 ngày',
    bar: 'from-cyan-400 to-sky-500',
    ring: 'ring-cyan-400/30',
  },
]

const CARDS_OPERATIONS: ReportCard[] = [
  {
    id: 'dan-ga',
    href: '/admin/tai-chinh/bao-cao/dan-ga',
    title: 'Báo cáo về đàn gà',
    emoji: '🐓',
    desc: 'Đầu/cuối kỳ · đẻ · chết · bán · theo giống · theo khu',
    bar: 'from-orange-400 to-red-500',
    ring: 'ring-orange-400/30',
    badge: 'MỚI',
  },
  {
    id: 'nhap-xuat-ton',
    href: '/admin/tai-chinh/bao-cao/nhap-xuat-ton',
    title: 'Nhập xuất tồn gà',
    emoji: '📦',
    desc: 'Đầu kỳ + nhập + xuất + cuối kỳ',
    bar: 'from-blue-400 to-indigo-500',
    ring: 'ring-blue-400/30',
  },
]

const CARDS_INVENTORY: ReportCard[] = [
  {
    id: 'kho-thuc-an',
    href: '/admin/kho-thuc-an/bao-cao',
    title: 'Báo cáo kho thức ăn',
    emoji: '🌾',
    desc: 'Tồn · tiêu thụ · giá trị · đơn vị thiếu',
    bar: 'from-yellow-400 to-amber-500',
    ring: 'ring-amber-400/30',
    isExternal: true,
  },
  {
    id: 'kho-thuoc',
    href: '/admin/kho-thuoc/bao-cao',
    title: 'Báo cáo kho thuốc',
    emoji: '💊',
    desc: 'Tồn · HSD cận date · giá trị',
    bar: 'from-pink-400 to-rose-500',
    ring: 'ring-rose-400/30',
    isExternal: true,
  },
  {
    id: 'mua-vao',
    href: '/admin/mua-vao/bao-cao',
    title: 'Báo cáo nhập hàng',
    emoji: '📥',
    desc: 'Đơn nhập · supplier · giá trị mua',
    bar: 'from-blue-400 to-cyan-500',
    ring: 'ring-blue-400/30',
    isExternal: true,
  },
  {
    id: 'ban-ra',
    href: '/admin/ban-ra/bao-cao',
    title: 'Báo cáo bán hàng',
    emoji: '💵',
    desc: 'Đơn bán · doanh thu · top khách',
    bar: 'from-emerald-400 to-green-500',
    ring: 'ring-emerald-400/30',
    isExternal: true,
  },
]

const CARDS_ASSETS: ReportCard[] = [
  {
    id: 'tai-san',
    href: '/admin/tai-chinh/bao-cao/tai-san',
    title: 'Báo cáo TSCĐ + CCDC',
    emoji: '🛠',
    desc: 'Giá trị · khấu hao · bảo trì · hỏng',
    bar: 'from-slate-400 to-gray-500',
    ring: 'ring-slate-400/30',
    badge: 'MỚI',
  },
]

export function ReportsHub({ kpi }: { kpi: HubKpi }) {
  return (
    <div className="space-y-5">
      {/* HERO */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 text-white shadow-xl">
        <div className="absolute inset-0 opacity-15 pointer-events-none">
          <span className="absolute top-3 right-6 text-7xl">📊</span>
          <span className="absolute bottom-2 left-8 text-5xl">📈</span>
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.18),transparent_60%)]" />
        <div className="relative p-6 md:p-7">
          <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
            <div>
              <div className="text-xs uppercase tracking-widest opacity-80">Trung tâm báo cáo quản trị</div>
              <h1 className="text-2xl md:text-3xl font-black mt-1">Báo cáo {kpi.monthLabel}</h1>
              <p className="text-sm opacity-85 mt-1">
                Tổng hợp tất cả mảng hoạt động · Print · Export Excel · PDF
              </p>
            </div>
            <Link
              href="/admin/tai-chinh/phan-tich-ai"
              className="bg-white/15 hover:bg-white/25 backdrop-blur text-white rounded-xl px-4 py-2.5 font-bold border border-white/30 shadow flex items-center gap-1.5"
            >
              🤖 Phân tích AI
            </Link>
          </div>

          {/* 4 KPI hero strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mt-4">
            <HeroKpi
              label="Doanh thu"
              value={formatVndShort(kpi.revenue)}
              sub={
                kpi.changeRevenue !== 0
                  ? `${kpi.changeRevenue >= 0 ? '↑' : '↓'} ${Math.abs(kpi.changeRevenue).toFixed(1)}% so T trước`
                  : undefined
              }
              tone={kpi.changeRevenue >= 0 ? 'text-emerald-200' : 'text-rose-200'}
              emoji="💵"
            />
            <HeroKpi
              label="Chi phí"
              value={formatVndShort(kpi.expense)}
              tone="text-amber-200"
              emoji="🧾"
            />
            <HeroKpi
              label="Lợi nhuận ròng"
              value={(kpi.profit >= 0 ? '+' : '') + formatVndShort(kpi.profit)}
              sub={`Biên ${kpi.profitMargin.toFixed(1)}%`}
              tone={kpi.profit >= 0 ? 'text-emerald-200' : 'text-rose-200'}
              emoji={kpi.profit >= 0 ? '📈' : '📉'}
              big
            />
            <HeroKpi
              label="Tổng quỹ"
              value={formatVndShort(kpi.treasuryBalance)}
              sub={`${kpi.treasuryAccountCount} tài khoản`}
              tone="text-blue-100"
              emoji="💰"
            />
          </div>
        </div>
      </div>

      {/* AI ANALYSIS BANNER */}
      <Link
        href="/admin/tai-chinh/phan-tich-ai"
        className="group relative block overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 text-white shadow-xl hover:shadow-2xl transition"
      >
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <span className="absolute -top-4 right-8 text-9xl">🤖</span>
          <span className="absolute -bottom-3 left-1/3 text-6xl">✨</span>
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_left,rgba(255,255,255,0.18),transparent_60%)]" />
        <div className="relative p-5 md:p-6 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-center">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase tracking-widest opacity-80 font-bold">
                ✨ Trợ lý AI
              </span>
              <span className="text-[10px] bg-white/25 px-1.5 py-0.5 rounded-full">MỚI</span>
            </div>
            <div className="text-xl md:text-2xl font-black mb-1">Phân tích báo cáo tự động bằng AI</div>
            <div className="text-sm opacity-90 leading-relaxed">
              Như chuyên gia tài chính gà chọi đọc số liệu của bạn → đánh giá điểm tốt, điểm yếu, gợi ý hành động cần làm tháng tới
            </div>
          </div>
          <div className="bg-white/20 hover:bg-white/30 backdrop-blur rounded-xl px-5 py-3 border border-white/30 group-hover:translate-x-0.5 transition flex items-center gap-2 font-bold whitespace-nowrap self-center">
            <span>Xem ngay</span>
            <span>→</span>
          </div>
        </div>
      </Link>

      {/* GROUPED REPORT CARDS */}
      <Section title="💰 Báo cáo tài chính" emoji="" cards={CARDS_FINANCE} />
      <Section title="🐓 Hoạt động chăn nuôi" emoji="" cards={CARDS_OPERATIONS} />
      <Section title="📦 Kho hàng & nhập xuất" emoji="" cards={CARDS_INVENTORY} />
      <Section title="🛠 Tài sản" emoji="" cards={CARDS_ASSETS} />

      {/* Quick info widgets */}
      {(kpi.receivableCount > 0 || kpi.treasuryBalance > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {kpi.receivableCount > 0 && (
            <Link
              href="/admin/tai-chinh/bao-cao/cong-no"
              className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-cyan-300 transition flex items-center gap-3"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-sky-500 text-white flex items-center justify-center text-2xl shadow shrink-0">
                ⚠️
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Công nợ phải thu</div>
                <div className="text-xl font-extrabold tabular-nums text-cyan-700 dark:text-cyan-300">
                  {formatVnd(kpi.receivableTotal)}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {kpi.receivableCount} khoản · Cần thu hồi
                </div>
              </div>
              <span className="text-cyan-500 group-hover:translate-x-0.5 transition text-xl">→</span>
            </Link>
          )}
          <Link
            href="/admin/quy"
            className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-blue-300 transition flex items-center gap-3"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-2xl shadow shrink-0">
              💰
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Tổng quỹ hiện tại</div>
              <div className="text-xl font-extrabold tabular-nums text-blue-700 dark:text-blue-300">
                {formatVnd(kpi.treasuryBalance)}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {kpi.treasuryAccountCount} tài khoản · Vào module Quản lý quỹ
              </div>
            </div>
            <span className="text-blue-500 group-hover:translate-x-0.5 transition text-xl">→</span>
          </Link>
        </div>
      )}
    </div>
  )
}

function Section({ title, cards }: { title: string; emoji: string; cards: ReportCard[] }) {
  return (
    <section>
      <h2 className="text-base md:text-lg font-bold text-gray-900 dark:text-gray-100 mb-2.5">
        {title}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {cards.map((c) => (
          <ReportCardLink key={c.id} card={c} />
        ))}
      </div>
    </section>
  )
}

function ReportCardLink({ card }: { card: ReportCard }) {
  return (
    <Link
      href={card.href}
      className={
        'group relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all overflow-hidden ' +
        card.ring +
        ' hover:ring-2'
      }
    >
      <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full bg-gradient-to-br ${card.bar} opacity-15 group-hover:opacity-25 transition`} />
      <div className={`h-1 -mx-4 -mt-4 mb-3 bg-gradient-to-r ${card.bar} rounded-t-2xl`} />
      <div className="flex items-start gap-2 mb-1.5 relative">
        <div className="text-3xl">{card.emoji}</div>
        {card.badge && (
          <span className="ml-auto text-[10px] font-bold bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full px-2 py-0.5 shadow">
            {card.badge}
          </span>
        )}
        {card.isExternal && (
          <span className="ml-auto text-[10px] font-semibold text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-900 rounded-full px-2 py-0.5">
            ↗ liên kết
          </span>
        )}
      </div>
      <div className="font-bold text-sm text-gray-900 dark:text-gray-100 leading-tight relative">{card.title}</div>
      <div className="text-[11.5px] text-gray-500 dark:text-gray-400 mt-1 leading-snug relative">
        {card.desc}
      </div>
      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-[11px] relative">
        <span className="text-gray-500 dark:text-gray-400">📥 Excel · 📄 PDF · 🖨 In</span>
        <span className="text-orange-500 group-hover:translate-x-0.5 transition font-bold">Mở →</span>
      </div>
    </Link>
  )
}

function HeroKpi({
  label,
  value,
  sub,
  tone,
  emoji,
  big,
}: {
  label: string
  value: string
  sub?: string
  tone: string
  emoji: string
  big?: boolean
}) {
  return (
    <div className={'bg-white/10 backdrop-blur rounded-xl p-3 border border-white/20 ' + (big ? 'ring-2 ring-white/40' : '')}>
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[10px] uppercase tracking-wider opacity-80">{label}</span>
        <span className="text-base">{emoji}</span>
      </div>
      <div className={`font-bold tabular-nums ${tone} ${big ? 'text-xl md:text-2xl' : 'text-base md:text-lg'}`}>
        {value}đ
      </div>
      {sub && <div className="text-[10px] opacity-75">{sub}</div>}
    </div>
  )
}

function formatVndShort(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'tỷ'
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'tr'
  if (abs >= 1_000) return (n / 1_000).toFixed(0) + 'k'
  return n.toLocaleString('vi-VN')
}
