import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ExportButtons } from '@/components/admin/reports/ExportButtons'
import { ChiPhiClient, type ExpenseRow } from '@/components/admin/reports/ChiPhiClient'

export const revalidate = 0

export default async function ChiPhiReport({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const sp = await searchParams
  const supabase = await createClient()
  const today = new Date()
  const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
  const defaultTo = today.toISOString().slice(0, 10)

  const from = sp.from || defaultFrom
  const to = sp.to || defaultTo

  const { data, error } = await (supabase.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>
  ) => Promise<{ data: ExpenseRow[] | null; error: { message: string } | null }>)(
    'expenses_summary',
    { p_from_date: from, p_to_date: to }
  )

  const rows = data ?? []

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
            💸 Chi phí 8 hạng mục
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Kỳ {from} → {to} · {rows.length} hạng mục · Pie chart + bảng chi tiết với progress bar
          </p>
        </div>
        <ExportButtons report="expenses" from={from} to={to} />
      </div>

      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 p-3 rounded-lg mb-4 text-sm">
          {error.message}
        </div>
      )}

      <ChiPhiClient rows={rows} from={from} to={to} initialRange="custom" />
    </div>
  )
}
