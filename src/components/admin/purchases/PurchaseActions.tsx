'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function PurchaseActions({
  purchaseId,
  purchaseCode,
  purchaseDate,
  notes,
}: {
  purchaseId: string
  purchaseCode: string
  purchaseDate: string
  notes: string | null
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ purchase_date: purchaseDate, notes: notes ?? '' })
  const [err, setErr] = useState<string | null>(null)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    const res = await fetch(`/api/purchases/${purchaseId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ purchase_date: form.purchase_date, notes: form.notes || null }),
    })
    const j = (await res.json().catch(() => ({}))) as { error?: string }
    setBusy(false)
    if (!res.ok) {
      setErr(typeof j.error === 'string' ? j.error : 'Lỗi cập nhật')
      return
    }
    setEditing(false)
    router.refresh()
  }

  async function del() {
    if (!window.confirm(
      `Xóa đơn nhập ${purchaseCode}?\n\n⚠️ Toàn bộ gà được TẠO từ đơn này cũng sẽ bị xóa (chỉ khi chưa bán). Không thể hoàn tác.`
    )) return
    setBusy(true)
    const res = await fetch(`/api/purchases/${purchaseId}`, { method: 'DELETE' })
    const j = (await res.json().catch(() => ({}))) as { error?: string; deleted_chickens?: number }
    setBusy(false)
    if (!res.ok) {
      window.alert(j.error ?? `Lỗi xóa (HTTP ${res.status})`)
      return
    }
    window.alert(`Đã xóa đơn ${purchaseCode}${j.deleted_chickens ? ` và ${j.deleted_chickens} gà liên quan` : ''}.`)
    router.push('/admin/mua-vao')
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button
        onClick={() => { setErr(null); setEditing(true) }}
        className="inline-flex items-center gap-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 px-3 py-1.5 font-medium"
      >
        ✏️ Sửa
      </button>
      <button
        onClick={del}
        disabled={busy}
        className="inline-flex items-center gap-1 text-sm rounded-lg border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-50 px-3 py-1.5 font-medium"
      >
        🗑️ Xóa đơn
      </button>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setEditing(false)}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={save}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full"
          >
            <div className="h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500" />
            <div className="p-4 md:p-5 space-y-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                ✏️ Sửa đơn nhập — {purchaseCode}
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Chỉ sửa ngày &amp; ghi chú của đơn. Muốn đổi thông tin từng con gà, sửa trong hồ sơ gà.
              </p>

              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block">
                Ngày nhập
                <input
                  type="date"
                  value={form.purchase_date}
                  onChange={(e) => setForm({ ...form, purchase_date: e.target.value })}
                  className="mt-1 w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block">
                Ghi chú
                <textarea
                  value={form.notes}
                  rows={3}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="mt-1 w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
                />
              </label>

              {err && (
                <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 rounded-lg px-3 py-2 text-sm">
                  ✗ {err}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 border-t border-gray-100 dark:border-gray-700 pt-4">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg px-4 py-2 text-sm"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-5 py-2 text-sm font-semibold shadow hover:shadow-lg disabled:opacity-50 transition"
                >
                  {busy ? '⏳ Đang lưu…' : '💾 Cập nhật'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
