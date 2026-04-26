import { InventoryReport } from '@/components/admin/finance/InventoryReport'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function InventoryPage() {
  return (
    <div>
      <div className="print:hidden">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
          <div>
            <Link
              href="/admin/tai-chinh/bao-cao"
              className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2"
            >
              <ArrowLeft className="w-4 h-4" /> Quay lại 6 báo cáo
            </Link>
            <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
              📋 Nhập xuất tồn gà
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Đầu kỳ + Nhập + Xuất + Cuối kỳ · Chi tiết từng con · Lọc thông minh · Xuất Excel/PDF riêng
            </p>
          </div>
        </div>
      </div>
      <InventoryReport />
    </div>
  )
}
