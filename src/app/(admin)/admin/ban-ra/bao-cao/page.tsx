import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { SalesReportClient } from '@/components/admin/sales/SalesReportClient'

export default async function BaoCaoBanRaPage() {
  const supabase = await createClient()
  const [customersRes, breedsRes] = await Promise.all([
    supabase.from('customers').select('id, name, tier').order('name').limit(500),
    supabase.from('breeds').select('code, name_vi').eq('is_active', true).order('display_order'),
  ])

  return (
    <div>
      <Link
        href="/admin/ban-ra"
        className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-3"
      >
        <ArrowLeft className="w-4 h-4" /> Quay lại
      </Link>
      <h1 className="text-2xl font-medium mb-1">📊 Báo cáo bán ra</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Lọc theo thời gian, khách hàng, giống, trạng thái · Xuất Excel / PDF format chuyên nghiệp
      </p>
      <SalesReportClient
        customers={(customersRes.data ?? []) as never}
        breeds={(breedsRes.data ?? []) as never}
      />
    </div>
  )
}
