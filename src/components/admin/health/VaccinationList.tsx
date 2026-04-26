'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils/format'

type VacItem = {
  vaccination_id: string
  scheduled_date: string
  chicken_id: string
  chicken_code: string
  chicken_name: string | null
  cage_code: string | null
  area_name: string | null
  vaccine_code: string
  vaccine_name: string
  is_required: boolean
  days_overdue: number
}

export function VaccinationList({ items }: { items: VacItem[] }) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [batch, setBatch] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === items.length) setSelected(new Set())
    else setSelected(new Set(items.map((i) => i.vaccination_id)))
  }

  async function confirm() {
    if (selected.size === 0) return
    setLoading(true)
    setErr(null)
    const res = await fetch('/api/vaccinations/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vaccination_ids: Array.from(selected),
        batch_number: batch || undefined,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      setErr(typeof json.error === 'string' ? json.error : 'Lỗi')
      setLoading(false)
      return
    }
    setSelected(new Set())
    setLoading(false)
    router.refresh()
  }

  if (items.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
        <div className="text-4xl mb-2">🎉</div>
        <p className="text-gray-600 dark:text-gray-400">Không có mũi tiêm nào cần xử lý trong khoảng này</p>
      </div>
    )
  }

  return (
    <>
      <div className="mb-2 flex items-center gap-3 text-sm">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={selected.size === items.length}
            onChange={toggleAll}
          />
          Chọn tất cả ({items.length})
        </label>
        <div className="text-gray-500 dark:text-gray-400">Đã chọn: <strong>{selected.size}</strong></div>
      </div>

      <div className="space-y-2 mb-20">
        {items.map((v) => (
          <label
            key={v.vaccination_id}
            className={`bg-white border border-gray-200 rounded-lg p-3 flex gap-3 items-start cursor-pointer hover:bg-gray-50 ${
              selected.has(v.vaccination_id) ? 'ring-2 ring-blue-300' : ''
            }`}
          >
            <input
              type="checkbox"
              checked={selected.has(v.vaccination_id)}
              onChange={() => toggle(v.vaccination_id)}
              className="mt-1"
            />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <Link
                    href={`/admin/ho-so-ga/${v.chicken_id}`}
                    className="font-medium text-blue-600 dark:text-blue-400 hover:underline text-sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {v.chicken_name ?? v.chicken_code}
                  </Link>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {v.chicken_code}
                    {v.cage_code ? ` · ${v.cage_code}` : ''}
                    {v.area_name ? ` · ${v.area_name}` : ''}
                  </div>
                </div>
                {v.days_overdue > 0 && (
                  <span className="text-xs px-2 py-1 rounded bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 whitespace-nowrap">
                    Quá {v.days_overdue} ngày
                  </span>
                )}
              </div>
              <div className="text-sm mt-1">
                💉 <strong>{v.vaccine_name}</strong>
                {v.is_required && (
                  <span className="text-xs text-red-600 dark:text-red-400 ml-2">(bắt buộc)</span>
                )}
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                  Lịch: {formatDate(v.scheduled_date)}
                </span>
              </div>
            </div>
          </label>
        ))}
      </div>

      {selected.size > 0 && (
        <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-96 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 shadow-lg rounded-lg p-3 z-30">
          <div className="text-sm font-medium mb-2">
            ✓ Xác nhận tiêm <strong>{selected.size}</strong> con
          </div>
          <input
            type="text"
            placeholder="Số lô vaccine (tuỳ chọn)"
            value={batch}
            onChange={(e) => setBatch(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm mb-2"
          />
          {err && <div className="text-xs text-red-600 dark:text-red-400 mb-2">{err}</div>}
          <button
            onClick={confirm}
            disabled={loading}
            className="w-full bg-green-600 text-white rounded py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Đang xác nhận...' : 'Xác nhận đã tiêm tất cả'}
          </button>
        </div>
      )}
    </>
  )
}
