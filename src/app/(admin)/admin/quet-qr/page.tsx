import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { QrScanner } from '@/components/admin/qr/QrScanner'

export const revalidate = 0

export default async function ScanQrPage() {
  const supabase = await createClient()

  const [unusedRes, usedRes, brokenRes] = await Promise.all([
    supabase
      .from('qr_tags')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'chua_su_dung'),
    supabase
      .from('qr_tags')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'dang_su_dung'),
    supabase
      .from('qr_tags')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'hong_mat'),
  ])

  const unused = unusedRes.count ?? 0
  const used = usedRes.count ?? 0
  const broken = brokenRes.count ?? 0

  return (
    <div>
      {/* Compact header — không chiếm nhiều không gian trên mobile */}
      <div className="mb-3 md:mb-5">
        <h1 className="text-lg md:text-2xl font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
          📷 Quét mã QR
        </h1>
        <p className="hidden md:block text-sm text-gray-500 dark:text-gray-400 mt-1">
          Quét thẻ chân gà để mở hồ sơ · Nhập tay mã 4 số khi thẻ mờ · Lịch sử quét gần đây
        </p>
      </div>

      {/* SCANNER — đẩy lên TOP để mobile thấy ngay khi mở trang */}
      <QrScanner />

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2 mt-4 mb-4">
        <Link
          href="/admin/quet-qr/upload"
          className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg px-4 py-2 text-sm font-semibold shadow hover:shadow-lg transition flex items-center gap-1.5"
        >
          📸 Upload ảnh/video nhanh
        </Link>
        <Link
          href="/admin/generate-qr"
          className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-1.5"
        >
          🔳 In thẻ QR mới
        </Link>
        <Link
          href="/admin/qr-tags"
          className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-1.5"
        >
          📋 Quản lý thẻ
        </Link>
      </div>

      {/* KPI cards — context info, dưới scanner */}
      <div className="grid grid-cols-3 gap-2 md:gap-3 mb-4">
        <Kpi
          label="🟢 Thẻ đang dùng"
          value={String(used)}
          icon="🐓"
          tone="from-blue-500 to-indigo-500"
          sub="Đã gắn vào hồ sơ gà"
        />
        <Kpi
          label="🆕 Còn lại"
          value={String(unused)}
          icon="🔳"
          tone="from-emerald-500 to-teal-500"
          sub="Chưa kẹp vào con nào"
          pulse={unused > 0 && unused < 30}
        />
        <Kpi
          label="🔴 Hỏng / Mất"
          value={String(broken)}
          icon="⚠️"
          tone="from-rose-500 to-red-500"
          sub="Cần thay thế"
        />
      </div>

      {/* Hướng dẫn 3 bước — collapse mặc định trên mobile, mở trên desktop */}
      <details className="group" open={true}>
        <summary className="md:hidden cursor-pointer text-xs text-gray-500 dark:text-gray-400 mb-2 select-none list-none flex items-center gap-1.5 [&::-webkit-details-marker]:hidden">
          <span className="group-open:rotate-90 transition-transform">▶</span>
          Xem hướng dẫn quét
        </summary>
        <section className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-blue-50 to-violet-50 dark:from-emerald-950/30 dark:via-blue-950/30 dark:to-violet-950/30 border border-blue-200 dark:border-blue-900 rounded-xl p-4">
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-blue-300/30 blur-3xl" />
          <div className="absolute -left-10 -bottom-10 w-40 h-40 rounded-full bg-violet-300/30 blur-3xl" />
          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-3">
            <Step n={1} title="Cho phép camera" desc="Lần đầu trình duyệt sẽ hỏi quyền — bấm Allow" />
            <Step n={2} title="Trỏ thẻ vào khung" desc="Giữ thẻ cách camera ~10cm, đủ ánh sáng" />
            <Step
              n={3}
              title="Tự mở hồ sơ"
              desc="Quét xong app điều hướng tới /ga/{4 số} ngay lập tức"
            />
          </div>
        </section>
      </details>
    </div>
  )
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-2.5 bg-white/60 dark:bg-gray-900/50 backdrop-blur-sm rounded-lg p-2.5 border border-white/40 dark:border-gray-700/40">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs font-bold flex items-center justify-center shadow">
        {n}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</div>
        <div className="text-[11px] text-gray-600 dark:text-gray-300 leading-snug">{desc}</div>
      </div>
    </div>
  )
}

function Kpi({
  label,
  value,
  icon,
  tone,
  sub,
  pulse,
}: {
  label: string
  value: string
  icon: string
  tone: string
  sub?: string
  pulse?: boolean
}) {
  return (
    <div className="relative overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3.5">
      <div
        className={`absolute -right-6 -top-6 w-20 h-20 rounded-full bg-gradient-to-br ${tone} opacity-15 blur-xl ${
          pulse ? 'animate-pulse' : ''
        }`}
      />
      <div className="relative">
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <span>{icon}</span>
          <span className="truncate">{label}</span>
        </div>
        <div className="mt-1 text-2xl font-bold tabular-nums text-gray-900 dark:text-gray-100">
          {value}
        </div>
        {sub && (
          <div className="text-[10.5px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
            {sub}
          </div>
        )}
      </div>
    </div>
  )
}
