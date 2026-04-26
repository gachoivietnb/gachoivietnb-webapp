'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import type { CashAccountBalance } from '@/lib/treasury/types'
import { ExportTreasuryModal } from '@/components/admin/treasury/ExportTreasuryModal'

const PRESETS = [
  { key: 'this_month', label: 'Tháng này' },
  { key: 'last_month', label: 'Tháng trước' },
  { key: 'last_30', label: '30 ngày' },
  { key: 'last_90', label: '90 ngày' },
  { key: 'this_quarter', label: 'Quý này' },
  { key: 'this_year', label: 'Năm nay' },
  { key: 'all', label: 'Toàn bộ' },
] as const

export function CashFlowReportFilter({
  preset,
  from,
  to,
  accounts,
  fromDate,
  toDate,
}: {
  preset: string
  from?: string
  to?: string
  accounts?: CashAccountBalance[]
  fromDate?: string
  toDate?: string
}) {
  const router = useRouter()
  const sp = useSearchParams()
  const [customOpen, setCustomOpen] = useState(preset === 'custom')
  const [customFrom, setCustomFrom] = useState(from ?? '')
  const [customTo, setCustomTo] = useState(to ?? '')
  const [exportOpen, setExportOpen] = useState(false)

  function setPreset(p: string) {
    const params = new URLSearchParams(sp.toString())
    params.set('preset', p)
    params.delete('from')
    params.delete('to')
    router.push('?' + params.toString())
    setCustomOpen(false)
  }

  function applyCustom() {
    if (!customFrom || !customTo) return
    const params = new URLSearchParams()
    params.set('preset', 'custom')
    params.set('from', customFrom)
    params.set('to', customTo)
    router.push('?' + params.toString())
  }

  return (
    <div className="flex flex-col gap-2 items-end">
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5 flex-wrap">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPreset(p.key)}
            className={
              'text-xs px-3 py-1.5 rounded font-semibold transition ' +
              (preset === p.key
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400')
            }
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => setCustomOpen((v) => !v)}
          className={
            'text-xs px-3 py-1.5 rounded font-semibold transition ' +
            (preset === 'custom' || customOpen
              ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-600 dark:text-gray-400')
          }
        >
          📅 Tuỳ chọn
        </button>
        <button
          onClick={() => window.print()}
          className="text-xs px-3 py-1.5 rounded font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40"
          title="In nhanh trang này"
        >
          🖨 In
        </button>
      </div>

      {accounts && accounts.length > 0 && (
        <button
          onClick={() => setExportOpen(true)}
          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg px-4 py-2 text-xs font-bold shadow flex items-center gap-1.5"
        >
          📥 Xuất sổ quỹ / Nhật ký (Excel · PDF)
        </button>
      )}

      {customOpen && (
        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2 shadow-sm">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
          />
          <span className="text-xs text-gray-500">→</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
          />
          <button
            onClick={applyCustom}
            disabled={!customFrom || !customTo}
            className="text-xs bg-orange-500 hover:bg-orange-600 text-white rounded px-3 py-1 font-semibold disabled:opacity-50"
          >
            Áp dụng
          </button>
        </div>
      )}

      {accounts && (
        <ExportTreasuryModal
          open={exportOpen}
          onClose={() => setExportOpen(false)}
          accounts={accounts}
          defaultFrom={fromDate}
          defaultTo={toDate}
        />
      )}
    </div>
  )
}
