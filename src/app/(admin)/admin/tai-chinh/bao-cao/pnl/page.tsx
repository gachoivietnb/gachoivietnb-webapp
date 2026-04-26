import { PnLReport } from '@/components/admin/finance/PnLReport'
import { ExportButtons } from '@/components/admin/reports/ExportButtons'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function PnLPage() {
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
            💰 Báo cáo lãi lỗ (P&amp;L)
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Doanh thu · Giá vốn · Chi phí · Lãi gộp / ròng theo chuẩn kế toán · Chip thời gian thông minh
          </p>
        </div>
        <ExportButtons report="pnl" />
      </div>
      <PnLReport />
    </div>
  )
}
