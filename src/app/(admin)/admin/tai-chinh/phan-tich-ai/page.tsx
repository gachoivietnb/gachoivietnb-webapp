import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { redirect } from 'next/navigation'
import { getFarmContext } from '@/lib/multitenancy/farm-context'
import { aggregateForPeriod, getPeriodPair } from '@/lib/reports/aggregate'
import { AiAnalysisClient } from '@/components/admin/reports/AiAnalysisClient'

export const revalidate = 0

export default async function AiAnalysisPage() {
  const ctx = await getFarmContext()
  if (!ctx) redirect('/auth/login')

  // Pre-fetch dữ liệu tháng này + tháng trước để client render KPI ngay
  const range = getPeriodPair('this_month')
  const [current, previous] = await Promise.all([
    aggregateForPeriod(range.current.from, range.current.to),
    aggregateForPeriod(range.previous.from, range.previous.to),
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
          <h1 className="text-2xl md:text-3xl font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
            🤖 Phân tích báo cáo bằng AI
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Trợ lý chuyên gia tài chính gà chọi · So sánh kỳ này vs kỳ trước · Đánh giá điểm mạnh/yếu · Gợi ý hành động
          </p>
        </div>
      </div>

      <AiAnalysisClient
        initialData={{
          preset: 'this_month',
          current_period: range.current,
          previous_period: range.previous,
          current_data: current,
          previous_data: previous,
          analysis: null,
        }}
      />
    </div>
  )
}
