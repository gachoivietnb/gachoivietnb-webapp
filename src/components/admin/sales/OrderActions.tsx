'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function OrderActions({
  orderId, orderCode, status, totalAmount, paidAmount,
}: {
  orderId: string
  orderCode: string
  status: string
  totalAmount: number
  paidAmount: number
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function changeStatus(payload: Record<string, unknown>) {
    setLoading(true); setErr(null)
    const res = await fetch(`/api/sales-orders/${orderId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    if (!res.ok) { setErr(typeof json.error === 'string' ? json.error : JSON.stringify(json.error)); setLoading(false); return }
    setLoading(false)
    router.refresh()
  }

  async function askDeposit() {
    const input = prompt('Số tiền đặt cọc (VND):', '0')
    if (input == null) return
    const amount = parseFloat(input) || 0
    if (amount <= 0) return
    await changeStatus({ new_status: 'dat_coc', deposit_amount: amount })
  }

  async function askDeliver() {
    const due = totalAmount - paidAmount
    const input = prompt(`Số tiền thanh toán cuối (còn nợ ${due.toLocaleString('vi-VN')}):`, String(due))
    if (input == null) return
    const paid = parseFloat(input) || 0
    await changeStatus({
      new_status: 'da_giao',
      paid_amount: paidAmount + paid,
      delivered_date: new Date().toISOString().split('T')[0],
    })
  }

  return (
    <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
      <h3 className="text-sm font-semibold">Hành động</h3>

      <div className="flex flex-wrap gap-2">
        {status === 'hoi_mua' && (
          <>
            <button onClick={askDeposit} disabled={loading} className="bg-amber-500 text-white rounded px-3 py-2 text-sm font-medium hover:bg-amber-600 disabled:opacity-50">
              🪙 Khách đặt cọc
            </button>
            <button onClick={() => changeStatus({ new_status: 'huy' })} disabled={loading} className="border border-red-300 text-red-600 dark:text-red-400 rounded px-3 py-2 text-sm hover:bg-red-50 disabled:opacity-50">
              ❌ Hủy đơn
            </button>
          </>
        )}
        {status === 'dat_coc' && (
          <>
            <button onClick={askDeliver} disabled={loading} className="bg-green-600 text-white rounded px-3 py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50">
              ✅ Giao hàng (thanh toán nốt)
            </button>
            <button onClick={() => changeStatus({ new_status: 'huy' })} disabled={loading} className="border border-red-300 text-red-600 dark:text-red-400 rounded px-3 py-2 text-sm hover:bg-red-50 disabled:opacity-50">
              ❌ Hủy đơn
            </button>
          </>
        )}
        {(status === 'da_giao' || status === 'dat_coc') && (
          <a href={`/api/sales-orders/${orderId}/invoice`} target="_blank" rel="noreferrer" className="border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
            📄 In biên lai PDF
          </a>
        )}
        {status === 'da_giao' && <GenerateReviewButton orderId={orderId} />}
        {status === 'huy' && (
          <div className="text-sm text-gray-500 dark:text-gray-400">Đơn đã hủy, không có hành động.</div>
        )}
      </div>

      {err && <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 text-red-800 dark:text-red-300 rounded p-2 text-xs">{err}</div>}
    </section>
  )
}

function GenerateReviewButton({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(false)
  const [url, setUrl] = useState<string | null>(null)

  async function generate() {
    setLoading(true)
    const res = await fetch('/api/reviews/generate-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sales_order_id: orderId }),
    })
    const json = await res.json()
    setLoading(false)
    if (res.ok && json.review_url) {
      setUrl(json.review_url)
      navigator.clipboard.writeText(json.review_url)
    } else {
      alert(typeof json.error === 'string' ? json.error : 'Lỗi')
    }
  }

  if (url) {
    return (
      <div className="border border-green-200 bg-green-50 dark:bg-green-950/40 rounded px-3 py-2 text-xs text-green-800 dark:text-green-300 w-full">
        ✓ Đã copy link đánh giá vào clipboard. Gửi cho khách:
        <div className="font-mono mt-1 break-all">{url}</div>
      </div>
    )
  }

  return (
    <button
      onClick={generate}
      disabled={loading}
      className="border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
    >
      {loading ? '...' : '⭐ Tạo link đánh giá'}
    </button>
  )
}
