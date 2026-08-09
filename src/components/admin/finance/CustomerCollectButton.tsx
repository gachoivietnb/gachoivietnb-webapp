'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, HandCoins } from 'lucide-react'

export function CustomerCollectButton({
  orderId,
  orderCode,
  remaining,
}: {
  orderId: string
  orderCode: string
  remaining: number
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState(String(Math.round(remaining)))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (remaining <= 0) {
    return <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">✓ Đã thu đủ</span>
  }

  async function submit() {
    setError(null)
    const amt = Math.round(Number(amount) || 0)
    if (amt <= 0) return setError('Số tiền phải > 0')
    if (amt > remaining) return setError(`Tối đa ${remaining.toLocaleString('vi-VN')}đ`)
    setLoading(true)
    try {
      const res = await fetch(`/api/sales-orders/${orderId}/collect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt }),
      })
      const json = await res.json()
      if (!res.ok) {
        setLoading(false)
        return setError(typeof json.error === 'string' ? json.error : 'Lỗi ghi thu tiền')
      }
      setOpen(false)
      setLoading(false)
      router.refresh()
    } catch {
      setLoading(false)
      setError('Lỗi kết nối, thử lại')
    }
  }

  const inputCls =
    'w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none'

  return (
    <>
      <button
        onClick={() => {
          setAmount(String(Math.round(remaining)))
          setError(null)
          setOpen(true)
        }}
        className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white rounded px-2.5 py-1"
      >
        <HandCoins className="w-3.5 h-3.5" /> Thu
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !loading && setOpen(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Thu tiền — đơn {orderCode}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Khách còn nợ: <b className="text-red-600 dark:text-red-400">{remaining.toLocaleString('vi-VN')}đ</b>
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Số tiền thu (đ)</label>
              <input type="number" step={1} min="0" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} className={`${inputCls} text-right`} />
              <div className="mt-1 flex gap-2">
                <button type="button" onClick={() => setAmount(String(Math.round(remaining)))} className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline">
                  Thu hết
                </button>
                <button type="button" onClick={() => setAmount(String(Math.round(remaining / 2)))} className="text-xs text-gray-500 hover:underline">
                  Một nửa
                </button>
              </div>
            </div>

            <p className="text-[11px] text-gray-400">Tiền thu tự động ghi vào quỹ (thu bán hàng).</p>
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <div className="flex items-center justify-end gap-3 pt-1">
              <button onClick={() => setOpen(false)} disabled={loading} className="text-sm text-gray-500 hover:underline">
                Hủy
              </button>
              <button
                onClick={submit}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 text-sm disabled:opacity-60"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <HandCoins className="w-4 h-4" />}
                Ghi thu
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
