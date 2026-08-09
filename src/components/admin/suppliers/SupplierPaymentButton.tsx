'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Wallet } from 'lucide-react'

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function SupplierPaymentButton({
  purchaseId,
  purchaseCode,
  remaining,
}: {
  purchaseId: string
  purchaseCode: string
  remaining: number
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState(String(Math.round(remaining)))
  const [date, setDate] = useState(todayISO())
  const [method, setMethod] = useState('tien_mat')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (remaining <= 0) {
    return <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">✓ Đã trả</span>
  }

  async function submit() {
    setError(null)
    const amt = Math.round(Number(amount) || 0)
    if (amt <= 0) return setError('Số tiền phải > 0')
    if (amt > remaining) return setError(`Tối đa ${remaining.toLocaleString('vi-VN')}đ`)
    setLoading(true)
    try {
      const res = await fetch(`/api/purchases/${purchaseId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt, payment_date: date, payment_method: method, notes: notes.trim() || undefined }),
      })
      const json = await res.json()
      if (!res.ok) {
        setLoading(false)
        return setError(typeof json.error === 'string' ? json.error : 'Lỗi ghi thanh toán')
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
    'w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none'

  return (
    <>
      <button
        onClick={() => {
          setAmount(String(Math.round(remaining)))
          setError(null)
          setOpen(true)
        }}
        className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded px-2.5 py-1"
      >
        <Wallet className="w-3.5 h-3.5" /> Trả
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !loading && setOpen(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Trả NCC — phiếu {purchaseCode}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Công nợ còn lại: <b className="text-red-600 dark:text-red-400">{remaining.toLocaleString('vi-VN')}đ</b>
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Số tiền trả (đ)</label>
                <input
                  type="number"
                  step={1}
                  min="0"
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={`${inputCls} text-right`}
                />
                <div className="mt-1 flex gap-2">
                  <button type="button" onClick={() => setAmount(String(Math.round(remaining)))} className="text-xs text-amber-600 dark:text-amber-400 hover:underline">
                    Trả hết
                  </button>
                  <button type="button" onClick={() => setAmount(String(Math.round(remaining / 2)))} className="text-xs text-gray-500 hover:underline">
                    Một nửa
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Ngày trả</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Hình thức</label>
                  <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputCls}>
                    <option value="tien_mat">Tiền mặt</option>
                    <option value="chuyen_khoan">Chuyển khoản</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Ghi chú</label>
                <input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} placeholder="Tuỳ chọn" />
              </div>
            </div>

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <div className="flex items-center justify-end gap-3 pt-1">
              <button onClick={() => setOpen(false)} disabled={loading} className="text-sm text-gray-500 hover:underline">
                Hủy
              </button>
              <button
                onClick={submit}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold px-4 py-2 text-sm disabled:opacity-60"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                Ghi trả
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
