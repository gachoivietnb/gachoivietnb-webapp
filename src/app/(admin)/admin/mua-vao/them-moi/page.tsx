import { createClient } from '@/lib/supabase/server'
import { NewPurchaseForm } from '@/components/admin/purchases/NewPurchaseForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const revalidate = 0

export default async function NewPurchasePage() {
  const supabase = await createClient()
  const [breedsRes, suppliersRes] = await Promise.all([
    supabase.from('breeds').select('id, code, name_vi, tier').eq('is_active', true).order('display_order'),
    supabase
      .from('suppliers')
      .select('id, name, phone')
      .eq('is_active', true)
      .order('name'),
  ])

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
        <div>
          <Link
            href="/admin/mua-vao"
            className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại Mua vào
          </Link>
          <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
            📥 Phiếu nhập mới
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Mỗi con gà tạo hồ sơ riêng · Tự xếp vào khu cách ly E · Bulk-edit giá / giới tính / cân nặng
          </p>
        </div>
      </div>

      <NewPurchaseForm
        breeds={(breedsRes.data ?? []) as never}
        suppliers={(suppliersRes.data ?? []) as never}
      />
    </div>
  )
}
