'use client'

import { useState } from 'react'

export function SalesReceiptActions({
  orderId,
  orderCode,
}: {
  orderId: string
  orderCode: string
}) {
  const [downloading, setDownloading] = useState<'excel' | 'pdf' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function download(format: 'excel' | 'pdf') {
    setDownloading(format)
    setError(null)
    try {
      const res = await fetch(`/api/sales/${orderId}/export?format=${format}`)
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(typeof j.error === 'string' ? j.error : `HTTP ${res.status}`)
      }
      const blob = await res.blob()
      const href = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = href
      a.download = `hoa-don_${orderCode}.${format === 'pdf' ? 'pdf' : 'xlsx'}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(href)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {error && (
        <span className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 rounded px-2 py-1">
          ⚠ {error}
        </span>
      )}
      <button
        onClick={() => window.print()}
        className="inline-flex items-center gap-1.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-3 py-2 text-sm font-semibold shadow-sm transition"
        title="In hoá đơn (Ctrl/Cmd + P)"
      >
        🖨 In hoá đơn
      </button>
      <button
        onClick={() => download('excel')}
        disabled={!!downloading}
        className="inline-flex items-center gap-1.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg px-3 py-2 text-sm font-bold shadow-sm disabled:opacity-50 transition"
      >
        {downloading === 'excel' ? '⏳' : '📥'} Excel
      </button>
      <button
        onClick={() => download('pdf')}
        disabled={!!downloading}
        className="inline-flex items-center gap-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-lg px-3 py-2 text-sm font-bold shadow-sm disabled:opacity-50 transition"
      >
        {downloading === 'pdf' ? '⏳' : '📄'} PDF
      </button>
    </div>
  )
}
