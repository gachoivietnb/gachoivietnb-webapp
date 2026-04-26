import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ExportButtons } from '@/components/admin/reports/ExportButtons'
import { XuHuongClient, type TrendRow } from '@/components/admin/reports/XuHuongClient'

export const revalidate = 0

export default async function XuHuongReport() {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('trends_6_months')
  const rows = (data ?? []) as TrendRow[]

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
        <div>
          <Link
            href="/admin/tai-chinh/bao-cao"
            className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại 6 báo cáo
          </Link>
          <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
            📈 Xu hướng 6 tháng gần nhất
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Doanh thu · Giá vốn · Chi phí · Lãi ròng theo tháng · Tăng trưởng % · Tháng tốt nhất / lỗ
          </p>
        </div>
        <ExportButtons report="trends" />
      </div>

      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 p-3 rounded-lg mb-4 text-sm">
          {error.message}
        </div>
      )}

      <XuHuongClient rows={rows} />
    </div>
  )
}
