import Link from 'next/link'
import { GenerateQrForm } from '@/components/admin/qr/GenerateQrForm'
import { createClient } from '@/lib/supabase/server'

export const revalidate = 0

export default async function GenerateQrPage() {
  const supabase = await createClient()

  const [unusedRes, usedRes, brokenRes, lastRes] = await Promise.all([
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
    supabase
      .from('qr_tags')
      .select('tag_number')
      .order('tag_number', { ascending: false })
      .limit(1),
  ])

  const unused = unusedRes.count ?? 0
  const used = usedRes.count ?? 0
  const broken = brokenRes.count ?? 0
  const total = unused + used + broken
  const lastTag = ((lastRes.data ?? []) as Array<{ tag_number: string }>)[0]?.tag_number
  const lastTagNumber = lastTag ? parseInt(lastTag, 10) || 0 : 0

  return (
    <div>
      <div className="mb-4 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
            🔳 In thẻ QR
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Tạo PDF thẻ QR · Mỗi trang A4 chứa 4×9 = 36 thẻ · In decal kẹp chân gà
          </p>
        </div>
        <Link
          href="/admin/cai-dat/the-qr"
          className="bg-white dark:bg-gray-800 border-2 border-cyan-300 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 rounded-xl px-3 py-2 text-xs font-bold flex items-center gap-1.5 shadow-sm hover:shadow transition self-center print:hidden"
        >
          📖 Tài liệu kỹ thuật
        </Link>
      </div>

      {/* Banner link tài liệu thẻ QR */}
      <Link
        href="/admin/cai-dat/the-qr"
        className="group relative block overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white shadow-md hover:shadow-xl transition mb-4 print:hidden"
      >
        <div className="absolute inset-0 opacity-15 pointer-events-none">
          <span className="absolute -top-2 right-6 text-7xl">🔳</span>
          <span className="absolute -bottom-3 left-1/3 text-5xl">📖</span>
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_left,rgba(255,255,255,0.18),transparent_60%)]" />
        <div className="relative px-4 md:px-5 py-3.5 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-center">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] uppercase tracking-widest opacity-80 font-bold">
                💡 Trước khi in
              </span>
              <span className="text-[10px] bg-white/25 px-1.5 py-0.5 rounded-full">Tài liệu</span>
            </div>
            <div className="text-base md:text-lg font-bold leading-tight">
              Chưa biết chọn vòng & thẻ phù hợp?
            </div>
            <div className="text-xs md:text-sm opacity-90 leading-snug mt-0.5">
              Xem giải pháp đầy đủ: kích thước vòng silicon, chất liệu thẻ PET, chi phí ~3-5k đ/bộ, quy trình đeo, nguồn mua.
            </div>
          </div>
          <div className="bg-white/20 hover:bg-white/30 backdrop-blur rounded-xl px-4 py-2.5 border border-white/30 group-hover:translate-x-0.5 transition flex items-center gap-1.5 font-bold whitespace-nowrap text-sm">
            <span>Mở tài liệu</span>
            <span>→</span>
          </div>
        </div>
      </Link>

      <GenerateQrForm
        stats={{ unused, used, broken, total, lastTagNumber }}
      />
    </div>
  )
}
