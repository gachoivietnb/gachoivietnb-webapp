import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PurchaseReportClient } from '@/components/admin/purchases/PurchaseReportClient'

export default async function BaoCaoMuaVaoPage() {
  const supabase = await createClient()
  const [suppliersRes, breedsRes] = await Promise.all([
    supabase.from('suppliers').select('id, name').order('name').limit(200),
    supabase.from('breeds').select('code, name_vi').eq('is_active', true).order('display_order'),
  ])

  return (
    <div>
      <Link
        href="/admin/mua-vao"
        className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-3"
      >
        <ArrowLeft className="w-4 h-4" /> Quay lại
      </Link>
      <h1 className="text-2xl font-medium mb-1">📊 Báo cáo mua vào</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Lọc theo khoảng thời gian, nhà cung cấp, giống gà · Xuất Excel / PDF format chuyên nghiệp
      </p>
      <PurchaseReportClient
        suppliers={(suppliersRes.data ?? []) as never}
        breeds={(breedsRes.data ?? []) as never}
      />
    </div>
  )
}
