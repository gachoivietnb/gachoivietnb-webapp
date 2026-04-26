'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  type CashAccountBalance,
  type Direction,
  type TransactionCategory,
  CATEGORY_META,
  formatVnd,
  formatVndShort,
  DIRECTION_META,
} from '@/lib/treasury/types'
import { TransactionFormModal } from './TransactionFormModal'
import { TransferModal } from './TransferModal'

type ExpenseCat = { id: string; name_vi: string; code: string }

type TxRow = {
  id: string
  account_id: string
  direction: Direction
  amount: number
  transaction_date: string
  category: TransactionCategory
  description: string | null
  reconciled: boolean
  ref_type: string | null
  account_name?: string | null
  account_icon?: string | null
  account_color?: string | null
  expense_category_name?: string | null
}

const PRESETS = [
  { key: 'this_month', label: 'Tháng này' },
  { key: 'last_month', label: 'Tháng trước' },
  { key: 'last_30', label: '30 ngày' },
  { key: 'last_90', label: '90 ngày' },
  { key: 'this_year', label: 'Năm nay' },
  { key: 'all', label: 'Tất cả' },
] as const

type PresetKey = (typeof PRESETS)[number]['key']

function computeRange(p: PresetKey): { from?: string; to?: string } {
  const today = new Date()
  const yyyymmdd = (d: Date) => d.toISOString().slice(0, 10)
  if (p === 'this_month') {
    return {
      from: yyyymmdd(new Date(today.getFullYear(), today.getMonth(), 1)),
      to: yyyymmdd(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
    }
  }
  if (p === 'last_month') {
    return {
      from: yyyymmdd(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
      to: yyyymmdd(new Date(today.getFullYear(), today.getMonth(), 0)),
    }
  }
  if (p === 'last_30') {
    const d = new Date()
    d.setDate(d.getDate() - 29)
    return { from: yyyymmdd(d), to: yyyymmdd(today) }
  }
  if (p === 'last_90') {
    const d = new Date()
    d.setDate(d.getDate() - 89)
    return { from: yyyymmdd(d), to: yyyymmdd(today) }
  }
  if (p === 'this_year') {
    return { from: yyyymmdd(new Date(today.getFullYear(), 0, 1)), to: yyyymmdd(today) }
  }
  return {}
}

export function TransactionsListClient({
  accounts,
  expenseCategories,
  initialAccountId,
}: {
  accounts: CashAccountBalance[]
  expenseCategories: ExpenseCat[]
  initialAccountId?: string
}) {
  const router = useRouter()
  const [txs, setTxs] = useState<TxRow[]>([])
  const [loading, setLoading] = useState(true)
  const [accountId, setAccountId] = useState<string>(initialAccountId ?? '')
  const [direction, setDirection] = useState<Direction | ''>('')
  const [category, setCategory] = useState<TransactionCategory | ''>('')
  const [preset, setPreset] = useState<PresetKey>('this_month')
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalDirection, setModalDirection] = useState<Direction>('in')
  const [transferOpen, setTransferOpen] = useState(false)

  async function load() {
    setLoading(true)
    const range = computeRange(preset)
    const params = new URLSearchParams()
    if (accountId) params.set('account_id', accountId)
    if (direction) params.set('direction', direction)
    if (category) params.set('category', category)
    if (range.from) params.set('from', range.from)
    if (range.to) params.set('to', range.to)
    if (search) params.set('q', search)
    params.set('limit', '300')

    const res = await fetch(`/api/treasury/transactions?${params.toString()}`)
    if (res.ok) {
      const j = await res.json()
      setTxs((j.data ?? []) as TxRow[])
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, direction, category, preset])

  // Search debounce
  useEffect(() => {
    const t = setTimeout(load, 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const stats = useMemo(() => {
    let totalIn = 0
    let totalOut = 0
    for (const t of txs) {
      if (t.direction === 'in') totalIn += t.amount
      else totalOut += t.amount
    }
    return { totalIn, totalOut, net: totalIn - totalOut, count: txs.length }
  }, [txs])

  async function handleDelete(id: string) {
    if (!confirm('Xoá giao dịch này? Hành động không thể hoàn tác.')) return
    const res = await fetch(`/api/treasury/transactions/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const j = await res.json()
      alert('Lỗi: ' + (typeof j.error === 'string' ? j.error : 'unknown'))
      return
    }
    load()
    router.refresh()
  }

  function openModal(d: Direction) {
    setModalDirection(d)
    setModalOpen(true)
  }

  function onSaved() {
    setModalOpen(false)
    setTransferOpen(false)
    load()
    router.refresh()
  }

  // Group transactions by date
  const groupedByDate = useMemo(() => {
    const m = new Map<string, TxRow[]>()
    for (const t of txs) {
      const arr = m.get(t.transaction_date) ?? []
      arr.push(t)
      m.set(t.transaction_date, arr)
    }
    return [...m.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [txs])

  return (
    <div className="space-y-4">
      {/* KPI mini */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <KpiMini emoji="📥" label="Tiền vào" value={formatVndShort(stats.totalIn)} tone="from-emerald-500 to-teal-500" />
        <KpiMini emoji="📤" label="Tiền ra" value={formatVndShort(stats.totalOut)} tone="from-rose-500 to-red-500" />
        <KpiMini
          emoji={stats.net >= 0 ? '📈' : '📉'}
          label="Dòng tiền ròng"
          value={(stats.net >= 0 ? '+' : '') + formatVndShort(stats.net)}
          tone={stats.net >= 0 ? 'from-blue-500 to-indigo-500' : 'from-amber-500 to-orange-500'}
        />
      </div>

      {/* Filter bar */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-3 space-y-3">
        {/* Preset chips */}
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPreset(p.key)}
              className={
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition ' +
                (preset === p.key
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600')
              }
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
          >
            <option value="">Tất cả tài khoản</option>
            {accounts.map((a) => (
              <option key={a.account_id} value={a.account_id}>
                {a.icon} {a.name}
              </option>
            ))}
          </select>

          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as Direction | '')}
            className="px-3 py-1.5 rounded-lg text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
          >
            <option value="">Vào / Ra</option>
            <option value="in">📥 Tiền vào</option>
            <option value="out">📤 Tiền ra</option>
          </select>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as TransactionCategory | '')}
            className="px-3 py-1.5 rounded-lg text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
          >
            <option value="">Tất cả phân loại</option>
            {Object.entries(CATEGORY_META).map(([k, m]) => (
              <option key={k} value={k}>
                {m.emoji} {m.label}
              </option>
            ))}
          </select>

          <input
            type="search"
            placeholder="Tìm trong ghi chú..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[160px] px-3 py-1.5 rounded-lg text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
          />

          <div className="ml-auto flex gap-1.5">
            <button
              onClick={() => openModal('in')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3 py-1.5 text-xs font-semibold"
            >
              📥 Thu
            </button>
            <button
              onClick={() => openModal('out')}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-lg px-3 py-1.5 text-xs font-semibold"
            >
              📤 Chi
            </button>
            <button
              onClick={() => setTransferOpen(true)}
              className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg px-3 py-1.5 text-xs font-semibold"
            >
              🔄 Chuyển
            </button>
          </div>
        </div>
      </div>

      {/* Transactions grouped by date */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-gray-500 dark:text-gray-400">Đang tải...</div>
        ) : txs.length === 0 ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">
            <div className="text-5xl mb-2">📭</div>
            <div className="text-sm">Không có giao dịch nào trong khoảng đã chọn</div>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {groupedByDate.map(([date, dayTxs]) => {
              const dayIn = dayTxs.filter((t) => t.direction === 'in').reduce((s, t) => s + t.amount, 0)
              const dayOut = dayTxs.filter((t) => t.direction === 'out').reduce((s, t) => s + t.amount, 0)
              return (
                <div key={date}>
                  {/* Date header */}
                  <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-900/40 sticky top-0 z-[1]">
                    <div className="text-xs font-bold text-gray-700 dark:text-gray-300">
                      📅 {new Date(date).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </div>
                    <div className="text-[11px] flex gap-2">
                      {dayIn > 0 && <span className="text-emerald-600 font-bold">+{formatVndShort(dayIn)}</span>}
                      {dayOut > 0 && <span className="text-rose-600 font-bold">-{formatVndShort(dayOut)}</span>}
                    </div>
                  </div>
                  {/* Transactions */}
                  <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                    {dayTxs.map((t) => (
                      <TxRowDetail key={t.id} tx={t} onDelete={() => handleDelete(t.id)} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <TransactionFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={onSaved}
        accounts={accounts}
        expenseCategories={expenseCategories}
        initialDirection={modalDirection}
        initialAccountId={accountId || undefined}
      />
      <TransferModal
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        onSaved={onSaved}
        accounts={accounts}
      />
    </div>
  )
}

function KpiMini({ emoji, label, value, tone }: { emoji: string; label: string; value: string; tone: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 flex items-center gap-2">
      <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${tone} text-white flex items-center justify-center text-base shadow shrink-0`}>
        {emoji}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate">{label}</div>
        <div className="text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100 tabular-nums">{value}</div>
      </div>
    </div>
  )
}

function TxRowDetail({ tx, onDelete }: { tx: TxRow; onDelete: () => void }) {
  const meta = CATEGORY_META[tx.category]
  const isIn = tx.direction === 'in'
  const dMeta = DIRECTION_META[tx.direction]
  const isTransfer = tx.ref_type === 'cash_transfer'
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 group">
      <div
        className={
          'w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ' +
          (isIn
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
            : 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300')
        }
      >
        {meta.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {tx.description || meta.label}
          </span>
          <span className={'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ' + dMeta.cls}>
            {meta.label}
          </span>
          {tx.expense_category_name && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
              {tx.expense_category_name}
            </span>
          )}
        </div>
        <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1.5 truncate">
          <span>{tx.account_icon} {tx.account_name}</span>
          {isTransfer && <span className="text-violet-600">· Bút toán chuyển khoản</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div
          className={
            'text-base font-extrabold tabular-nums ' +
            (isIn ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')
          }
        >
          {isIn ? '+' : '-'}
          {formatVnd(tx.amount)}
        </div>
        {!isTransfer && (
          <button
            onClick={onDelete}
            title="Xoá giao dịch"
            className="opacity-0 group-hover:opacity-100 transition w-7 h-7 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center"
          >
            🗑
          </button>
        )}
      </div>
    </div>
  )
}
