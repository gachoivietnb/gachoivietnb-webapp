'use client'

import { useEffect, useState } from 'react'
import { type CashAccountBalance, formatVnd } from '@/lib/treasury/types'

export function TransferModal({
  open,
  onClose,
  onSaved,
  accounts,
}: {
  open: boolean
  onClose: () => void
  onSaved: () => void
  accounts: CashAccountBalance[]
}) {
  const [fromId, setFromId] = useState<string>('')
  const [toId, setToId] = useState<string>('')
  const [amountStr, setAmountStr] = useState('')
  const [feeStr, setFeeStr] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const active = accounts.filter((a) => a.is_active)
    setFromId(active[0]?.account_id ?? '')
    setToId(active[1]?.account_id ?? '')
    setAmountStr('')
    setFeeStr('')
    setDate(new Date().toISOString().slice(0, 10))
    setDescription('')
    setError(null)
  }, [open, accounts])

  function parseAmount(s: string): number {
    return Number(s.replace(/[^\d]/g, ''))
  }

  function setNumeric(v: string, set: (s: string) => void) {
    const n = parseAmount(v)
    set(n > 0 ? n.toLocaleString('vi-VN') : '')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const amount = parseAmount(amountStr)
    const fee = parseAmount(feeStr)
    if (amount <= 0) {
      setError('Vui lòng nhập số tiền')
      return
    }
    if (!fromId || !toId) {
      setError('Vui lòng chọn cả 2 tài khoản')
      return
    }
    if (fromId === toId) {
      setError('Tài khoản nguồn và đích phải khác nhau')
      return
    }
    setSubmitting(true)
    const res = await fetch('/api/treasury/transfers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from_account_id: fromId,
        to_account_id: toId,
        amount,
        fee,
        transfer_date: date,
        description: description || null,
      }),
    })
    setSubmitting(false)
    if (!res.ok) {
      const j = await res.json()
      setError(typeof j.error === 'string' ? j.error : 'Lỗi tạo chuyển khoản')
      return
    }
    onSaved()
  }

  if (!open) return null

  const from = accounts.find((a) => a.account_id === fromId)
  const to = accounts.find((a) => a.account_id === toId)
  const amount = parseAmount(amountStr)
  const fee = parseAmount(feeStr)

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-0 md:p-4">
      <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-t-2xl md:rounded-2xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
        <div className="px-5 py-4 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider opacity-80">Bút toán nội bộ</div>
            <h2 className="text-lg font-bold">🔄 Chuyển khoản giữa tài khoản</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-lg"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-4">
          {/* From / To accounts visualized */}
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-2 sm:gap-3 items-center">
            <AccountPicker
              label="Từ tài khoản"
              accounts={accounts.filter((a) => a.is_active && a.account_id !== toId)}
              value={fromId}
              onChange={setFromId}
            />
            <div className="text-3xl text-gray-400 dark:text-gray-500 text-center select-none">→</div>
            <AccountPicker
              label="Đến tài khoản"
              accounts={accounts.filter((a) => a.is_active && a.account_id !== fromId)}
              value={toId}
              onChange={setToId}
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">
              Số tiền chuyển
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={amountStr}
                onChange={(e) => setNumeric(e.target.value, setAmountStr)}
                placeholder="0"
                className="w-full text-2xl font-bold tabular-nums px-4 py-3 rounded-xl border-2 border-violet-200 dark:border-violet-800 focus:border-violet-500 bg-violet-50/50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300 focus:outline-none"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-violet-600 font-bold">đ</span>
            </div>
          </div>

          {/* Fee */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">
              Phí chuyển khoản (nếu có)
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={feeStr}
                onChange={(e) => setNumeric(e.target.value, setFeeStr)}
                placeholder="0"
                className="w-full text-base tabular-nums px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:outline-none focus:border-violet-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">đ</span>
            </div>
          </div>

          {/* Date + desc */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">
                Ngày chuyển
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">
              Ghi chú
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={500}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
              placeholder="VD: Rút tiền mặt từ ngân hàng..."
            />
          </div>

          {/* Summary */}
          {from && to && amount > 0 && (
            <div className="bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-900 rounded-xl p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-700 dark:text-gray-300">{from.icon} {from.name} sau:</span>
                <span className={'font-bold tabular-nums ' + (from.current_balance - amount - fee < 0 ? 'text-rose-600' : 'text-gray-900 dark:text-gray-100')}>
                  {formatVnd(from.current_balance - amount - fee)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700 dark:text-gray-300">{to.icon} {to.name} sau:</span>
                <span className="font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                  {formatVnd(to.current_balance + amount)}
                </span>
              </div>
              {fee > 0 && (
                <div className="flex justify-between text-xs pt-1 border-t border-violet-200 dark:border-violet-800">
                  <span className="text-gray-500 dark:text-gray-400">Phí ({from.name}):</span>
                  <span className="text-rose-600 font-semibold">- {formatVnd(fee)}</span>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="text-sm text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg px-3 py-2">
              ⚠️ {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700/50"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2.5 rounded-xl text-white font-bold shadow-md bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:shadow-lg disabled:opacity-50"
            >
              {submitting ? 'Đang chuyển...' : '🔄 Thực hiện chuyển khoản'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AccountPicker({
  label,
  accounts,
  value,
  onChange,
}: {
  label: string
  accounts: CashAccountBalance[]
  value: string
  onChange: (v: string) => void
}) {
  const sel = accounts.find((a) => a.account_id === value)
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
      >
        {accounts.map((a) => (
          <option key={a.account_id} value={a.account_id}>
            {a.icon} {a.name} ({formatVnd(a.current_balance)})
          </option>
        ))}
      </select>
      {sel && (
        <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
          Số dư: <b className="tabular-nums">{formatVnd(sel.current_balance)}</b>
        </div>
      )}
    </div>
  )
}
