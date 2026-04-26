import { ExcelImportForm } from '@/components/admin/chickens/ExcelImportForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function ImportExcelPage() {
  return (
    <div>
      <Link
        href="/admin/ho-so-ga"
        className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-3"
      >
        <ArrowLeft className="w-4 h-4" /> Quay lại
      </Link>

      <h1 className="text-2xl font-medium mb-2">Import Excel</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Upload file Excel (.xlsx) với các cột tiếng Việt:
      </p>

      <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-3 text-xs font-mono mb-4 overflow-x-auto">
        Tên | Giống | Giới tính | Ngày sinh | Nguồn | Cân nặng | Giá mua | Màu | Ghi chú
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-950/40 border border-yellow-200 rounded p-3 text-sm mb-4">
        <strong>Lưu ý:</strong> Cột <code>Giống</code> phải là <strong>CODE</strong> in hoa: ASIL, MLAI, PERU, NOI, TRE, TANC, LAIF1.
        Cột <code>Nguồn</code> chỉ nhận "Mua" hoặc "Nở tại trại".
      </div>

      <ExcelImportForm />
    </div>
  )
}
