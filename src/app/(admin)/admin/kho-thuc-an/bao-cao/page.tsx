import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { StockReport } from '@/components/admin/health/StockReport'

export default function KhoThucAnBaoCaoPage() {
  return (
    <div>
      <div className="print:hidden">
        <Link
          href="/admin/kho-thuc-an"
          className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-3"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại kho thức ăn
        </Link>
        <h1 className="text-2xl font-medium mb-1">📊 Báo cáo nhập xuất tồn kho thức ăn</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Tổng hợp + chi tiết từng giao dịch · Lọc/tìm kiếm thông minh · In và xuất Excel/PDF
        </p>
      </div>
      <StockReport kind="feed" />
    </div>
  )
}
