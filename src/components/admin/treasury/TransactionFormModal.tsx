'use client'

import { useEffect, useState } from 'react'
import {
  type CashAccountBalance,
  type Direction,
  type TransactionCategory,
  QUICK_INCOME_CATEGORIES,
  QUICK_EXPENSE_CATEGORIES,
  formatVnd,
  DIRECTION_META,
} from '@/lib/treasury/types'

type ExpenseCat = { id: string; name_vi: string; code: string }

export function TransactionFormModal({
  open,
  onClose,
  onSaved,
  accounts,
  expenseCategories,
  initialDirection = 'in',
  initialAccountId,
}: {
  open: boolean
  onClose: () => void
  onSaved: () => void
  accounts: CashAccountBalance[]
  expenseCategories: ExpenseCat[]
  initialDirection?: Direction
  initialAccountId?: string
}) {
  const [direction, setDirection] = useState<Direction>(initialDirection)
  const [amountStr, setAmountStr] = useState('')
  const [accountId, setAccountId] = useState<string>('')
  const [category, setCategory] = useState<TransactionCategory>('other')
  const [expenseCategoryId, setExpenseCategoryId] = useState<string>('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setDirection(initialDirection)
    setAmountStr('')
    setAccountId(initialAccountId ?? accounts.find((a) => a.is_default)?.account_id ?? accounts[0]?.account_id ?? '')
    setCategory(initialDirection === 'in' ? 'sale' : 'expense')
    setExpenseCategoryId('')
    setDate(new Date().toISOString().slice(0, 10))
    setDescription('')
    setError(null)
  }, [open, initialDirection, initialAccountId, accounts])

  const quickPicks = direction === 'in' ? QUICK_INCOME_CATEGORIES : QUICK_EXPENSE_CATEGORIES
  const showExpenseCatPicker = direction === 'out' && (category === 'expense' || category === 'payroll')

  function parseAmount(s: string): number {
    return Number(s.replace(/[^\d]/g, ''))
  }

  function handleAmountChange(v: string) {
    const num = parseAmount(v)
    setAmountStr(num > 0 ? num.toLocaleString('vi-VN') : '')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const amount = parseAmount(amountStr)
    if (amount <= 0) {
      setError('Vui lòng nhập số tiền')
      return
    }
    if (!accountId) {
      setError('Vui lòng chọn tài khoản')
      return
    }
    setSubmitting(true)
    const res = await fetch('/api/treasury/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        account_id: accountId,
        direction,
        amount,
        transaction_date: date,
        category,
        expense_category_id: expenseCategoryId || null,
        description: description || null,
      }),
    })
    setSubmitting(false)
    if (!res.ok) {
      const j = await res.json()
      setError(typeof j.error === 'string' ? j.error : 'Lỗi tạo giao dịch')
      return
    }
    onSaved()
  }

  if (!open) return null

  const dMeta = DIRECTION_META[direction]
  const selectedAccount = accounts.find((a) => a.account_id === accountId)

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-0 md:p-4">
      <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-t-2xl md:rounded-2xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
        {/* Header gradient */}
        <div className={`px-5 py-4 bg-gradient-to-r ${dMeta.bar} text-white flex items-center justify-between`}>
          <div>
            <div className="text-xs uppercase tracking-wider opacity-80">Ghi nhận giao dịch</div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span>{dMeta.emoji}</span> {direction === 'in' ? 'Thu tiền' : 'Chi tiền'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-lg"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-4">
          {/* Direction toggle */}
          <div className="grid grid-cols-2 gap-2 bg-gray-100 dark:bg-gray-900 p-1 rounded-xl">
            {(['in', 'out'] as Direction[]).map((d) => {
              const m = DIRECTION_META[d]
              const active = direction === d
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setDirection(d)
                    setCategory(d === 'in' ? 'sale' : 'expense')
                  }}
                  className={
                    'py-2.5 rounded-lg text-sm font-bold transition ' +
                    (active
                      ? `bg-gradient-to-r ${m.bar} text-white shadow`
                      : 'text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800')
                  }
                >
                  {m.emoji} {m.label}
                </button>
              )
            })}
          </div>

          {/* Amount input lớn */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
              Số tiền
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={amountStr}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0"
                className={
                  'w-full text-3xl font-bold tabular-nums px-4 py-3 rounded-xl border-2 transition ' +
                  (direction === 'in'
                    ? 'border-emerald-200 dark:border-emerald-800 focus:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                    : 'border-rose-200 dark:border-rose-800 focus:border-rose-500 bg-rose-50/50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300') +
                  ' focus:outline-none'
                }
                autoFocus
              />
              <span
                className={
                  'absolute right-4 top-1/2 -translate-y-1/2 text-lg font-bold ' +
                  (direction === 'in'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400')
                }
              >
                đ
              </span>
            </div>
          </div>

          {/* Account picker */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">
              Vào / Từ tài khoản
            </label>
            <div className="grid grid-cols-2 gap-2">
              {accounts
                .filter((a) => a.is_active)
                .map((a) => {
                  const active = a.account_id === accountId
                  return (
                    <button
                      key={a.account_id}
                      type="button"
                      onClick={() => setAccountId(a.account_id)}
                      className={
                        'p-2.5 rounded-lg border-2 text-left transition ' +
                        (active
                          ? 'border-orange-500 shadow ring-2 ring-orange-200 dark:ring-orange-800'
                          : 'border-gray-200 dark:border-gray-700 hover:border-orange-300')
                      }
                    >
                      <div
                        className={`w-7 h-7 rounded-md bg-gradient-to-br ${a.color} text-white flex items-center justify-center text-sm shadow-sm mb-1`}
                      >
                        {a.icon}
                      </div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {a.name}
                      </div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400 tabular-nums">
                        {formatVnd(a.current_balance)}
                      </div>
                    </button>
                  )
                })}
            </div>
            {selectedAccount && direction === 'out' && amountStr && (
              <div className="mt-1.5 text-xs text-gray-600 dark:text-gray-400">
                Sau giao dịch:{' '}
                <span
                  className={
                    selectedAccount.current_balance - parseAmount(amountStr) < 0
                      ? 'font-bold text-rose-600'
                      : 'font-bold text-gray-900 dark:text-gray-100'
                  }
                >
                  {formatVnd(selectedAccount.current_balance - parseAmount(amountStr))}
                </span>
              </div>
            )}
          </div>

          {/* Category quick-pick */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">
              Phân loại
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
              {quickPicks.map((c) => {
                const active = category === c.value
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCategory(c.value)}
                    className={
                      'px-2 py-2 rounded-lg text-xs font-semibold transition border ' +
                      (active
                        ? 'bg-orange-500 text-white border-orange-500 shadow'
                        : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-orange-300')
                    }
                  >
                    <div className="text-base mb-0.5">{c.emoji}</div>
                    <div className="leading-tight">{c.label}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Hạng mục chi tiết (nếu chi phí) */}
          {showExpenseCatPicker && expenseCategories.length > 0 && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">
                Hạng mục chi phí (link với báo cáo)
              </label>
              <select
                value={expenseCategoryId}
                onChange={(e) => setExpenseCategoryId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
              >
                <option value="">-- Không phân loại --</option>
                {expenseCategories.map((ec) => (
                  <option key={ec.id} value={ec.id}>
                    {ec.name_vi}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date + description */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">
                Ngày
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
              Ghi chú (tuỳ chọn)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={500}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
              placeholder="VD: Tiền điện tháng 4, mua thuốc thú y..."
            />
          </div>

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
              className={
                'flex-1 px-4 py-2.5 rounded-xl text-white font-bold shadow-md hover:shadow-lg transition disabled:opacity-50 bg-gradient-to-r ' +
                dMeta.bar
              }
            >
              {submitting ? 'Đang lưu...' : `${dMeta.emoji} Lưu giao dịch`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
