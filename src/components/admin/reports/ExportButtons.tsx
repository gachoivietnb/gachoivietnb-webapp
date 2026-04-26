export function ExportButtons({
  report,
  from,
  to,
}: {
  report: 'pnl' | 'expenses' | 'trends' | 'gia_von' | 'inventory'
  from?: string
  to?: string
}) {
  const params = new URLSearchParams({ report })
  if (from) params.set('from', from)
  if (to) params.set('to', to)

  return (
    <div className="flex gap-2">
      <a
        href={`/api/finance/reports/export?${params.toString()}&format=excel`}
        className="border border-emerald-500 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-1"
      >
        📊 Xuất Excel
      </a>
      <a
        href={`/api/finance/reports/export?${params.toString()}&format=pdf`}
        className="border border-red-500 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-1"
      >
        📄 Xuất PDF
      </a>
    </div>
  )
}
