import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ExportButtons } from '@/components/admin/reports/ExportButtons'
import { GiaVonClient, type GiaVonRow } from '@/components/admin/reports/GiaVonClient'

export const revalidate = 0

export default async function GiaVonReport() {
  const supabase = await createClient()

  const { data, count } = await supabase
    .from('sales_performance')
    .select('*', { count: 'exact' })
    .order('sale_date', { ascending: false })
    .limit(2000)

  const rows = (data ?? []) as GiaVonRow[]

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
            🐓 Báo cáo giá vốn từng con
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {count ?? 0} con đã bán · Lọc thông minh theo phân khúc, giống, P&amp;L, biên LN, thời gian
          </p>
        </div>
        <ExportButtons report="gia_von" />
      </div>

      <GiaVonClient rows={rows} />
    </div>
  )
}
