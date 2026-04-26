import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { redirect } from 'next/navigation'
import { getFarmContext } from '@/lib/multitenancy/farm-context'
import { getAssetKpi, listAssets } from '@/lib/assets/queries'
import { AssetsReportClient } from '@/components/admin/reports/AssetsReportClient'

export const revalidate = 0

export default async function AssetsReportPage() {
  const ctx = await getFarmContext()
  if (!ctx) redirect('/auth/login')

  const [assets, kpi] = await Promise.all([
    listAssets({ limit: 1000 }),
    getAssetKpi(),
  ])

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-3 mb-4 print:hidden">
        <div>
          <Link
            href="/admin/tai-chinh"
            className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Báo cáo tổng hợp
          </Link>
          <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
            🛠 Báo cáo TSCĐ + CCDC
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Tổng giá trị · khấu hao · trạng thái · bảo trì · breakdown theo phân loại / khu
          </p>
        </div>
      </div>

      <AssetsReportClient assets={assets} kpi={kpi} />
    </div>
  )
}
