'use client'

import { useEffect, useMemo, useState } from 'react'
import { formatVnd } from '@/lib/utils/format'

/* ============================================================
 * StockTransactionModal — modal Nhập/Xuất kho dùng chung cho
 * Kho thức ăn (feed) và Kho thuốc (medicine).
 *
 * Features:
 *  - Toggle Nhập/Xuất với gradient header đổi màu
 *  - Số lượng input lớn với unit suffix
 *  - Preview số tồn sau giao dịch (cảnh báo đỏ nếu âm)
 *  - Quick reasons (lý do) — tự fill notes
 *  - Cost auto-suggest từ cost_per_unit
 *  - Date picker (default today)
 *  - History 5 giao dịch gần nhất (collapsible)
 *  - Empty/error/loading states
 * ============================================================ */

export type StockKind = 'feed' | 'medicine'

export type StockItem = {
  id: string
  code: string
  name_vi: string
  unit: string
  current_stock: number
  cost_per_unit: number | null
  expiry_date?: string | null
  min_stock_alert?: number
}

type Direction = 'nhap' | 'xuat'

type TxRow = {
  id: string
  transaction_type: Direction
  quantity: number
  transaction_date: string
  cost: number | null
  notes: string | null
  created_at: string
}

const QUICK_REASONS: Record<
  StockKind,
  Record<Direction, Array<{ emoji: string; label: string }>>
> = {
  feed: {
    nhap: [
      { emoji: '🏪', label: 'Mua mới' },
      { emoji: '🔄', label: 'Bù tồn (đối soát)' },
      { emoji: '🎁', label: 'Được tặng/cho' },
      { emoji: '📦', label: 'Nhận từ kho khác' },
    ],
    xuat: [
      { emoji: '🐓', label: 'Cho gà ăn' },
      { emoji: '🌡', label: 'Trộn cám' },
      { emoji: '🚮', label: 'Hỏng / loại bỏ' },
      { emoji: '📦', label: 'Chuyển kho khác' },
    ],
  },
  medicine: {
    nhap: [
      { emoji: '🏪', label: 'Mua mới' },
      { emoji: '🔄', label: 'Bù tồn (đối soát)' },
      { emoji: '🎁', label: 'Được tặng/cho' },
      { emoji: '🏥', label: 'Nhập từ thú y' },
    ],
    xuat: [
      { emoji: '💉', label: 'Tiêm phòng' },
      { emoji: '💊', label: 'Pha thuốc uống' },
      { emoji: '🐔', label: 'Điều trị bệnh' },
      { emoji: '🚮', label: 'Hết hạn / hỏng' },
    ],
  },
}

const KIND_META: Record<
  StockKind,
  { emoji: string; title: string; itemNoun: string }
> = {
  feed: { emoji: '🌾', title: 'Kho thức ăn', itemNoun: 'thức ăn' },
  medicine: { emoji: '💊', title: 'Kho thuốc', itemNoun: 'thuốc' },
}

const DIR_META: Record<
  Direction,
  { label: string; emoji: string; bar: string; ringFocus: string; tone: string; bgSoft: string; textTone: string }
> = {
  nhap: {
    label: 'Nhập kho',
    emoji: '📥',
    bar: 'from-emerald-500 to-teal-600',
    ringFocus: 'focus:border-emerald-500 focus:ring-emerald-200 dark:focus:ring-emerald-800',
    tone: 'border-emerald-200 dark:border-emerald-800',
    bgSoft: 'bg-emerald-50 dark:bg-emerald-950/40',
    textTone: 'text-emerald-700 dark:text-emerald-300',
  },
  xuat: {
    label: 'Xuất kho',
    emoji: '📤',
    bar: 'from-rose-500 to-red-600',
    ringFocus: 'focus:border-rose-500 focus:ring-rose-200 dark:focus:ring-rose-800',
    tone: 'border-rose-200 dark:border-rose-800',
    bgSoft: 'bg-rose-50 dark:bg-rose-950/40',
    textTone: 'text-rose-700 dark:text-rose-300',
  },
}

export function StockTransactionModal({
  kind,
  item,
  onClose,
  onDone,
}: {
  kind: StockKind
  item: StockItem
  onClose: () => void
  onDone: () => void
}) {
  const apiBase = kind === 'feed' ? `/api/feeds/${item.id}/transactions` : `/api/medicines/${item.id}/transactions`

  const [direction, setDirection] = useState<Direction>('nhap')
  const [quantity, setQuantity] = useState<number>(0)
  const [reason, setReason] = useState<string>('')
  const [cost, setCost] = useState<number>(0)
  const [costEdited, setCostEdited] = useState(false)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [history, setHistory] = useState<TxRow[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyOpen, setHistoryOpen] = useState(true)

  // Load history khi mở
  useEffect(() => {
    let cancelled = false
    fetch(apiBase)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return
        setHistory((j.data ?? []) as TxRow[])
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [apiBase])

  // Auto-suggest cost = quantity × cost_per_unit (nếu user chưa edit cost)
  useEffect(() => {
    if (costEdited) return
    if (direction === 'nhap' && item.cost_per_unit && quantity > 0) {
      setCost(Math.round(item.cost_per_unit * quantity))
    } else if (!costEdited) {
      setCost(0)
    }
  }, [quantity, direction, item.cost_per_unit, costEdited])

  // Tổng hợp notes từ reason + ghi chú user
  const finalNotes = useMemo(() => {
    const parts: string[] = []
    if (reason) parts.push(reason)
    if (notes.trim()) parts.push(notes.trim())
    return parts.join(' — ') || undefined
  }, [reason, notes])

  const dirMeta = DIR_META[direction]
  const kindMeta = KIND_META[kind]

  const stockAfter =
    direction === 'nhap'
      ? Number(item.current_stock) + Number(quantity || 0)
      : Number(item.current_stock) - Number(quantity || 0)
  const willNegative = stockAfter < 0
  const willLow = item.min_stock_alert !== undefined && stockAfter > 0 && stockAfter < item.min_stock_alert

  const expiryWarn = useMemo(() => {
    if (!item.expiry_date) return null
    const exp = new Date(item.expiry_date)
    const now = new Date()
    const diffDays = Math.ceil((exp.getTime() - now.getTime()) / 86400000)
    if (diffDays < 0) return { label: 'Đã hết hạn', cls: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' }
    if (diffDays < 30) return { label: `Còn ${diffDays} ngày HSD`, cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' }
    return { label: `HSD: ${exp.toLocaleDateString('vi-VN')}`, cls: 'bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300' }
  }, [item.expiry_date])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (quantity <= 0) {
      setErr('Vui lòng nhập số lượng > 0')
      return
    }
    if (direction === 'xuat' && willNegative) {
      setErr(`Không đủ tồn — chỉ còn ${item.current_stock} ${item.unit}`)
      return
    }
    setLoading(true)
    setErr(null)
    const res = await fetch(apiBase, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transaction_type: direction,
        quantity,
        cost: cost > 0 ? cost : undefined,
        notes: finalNotes,
        transaction_date: date,
      }),
    })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) {
      setErr(typeof json.error === 'string' ? json.error : 'Lỗi không xác định')
      return
    }
    onDone()
  }

  const formatNumber = (v: string): string => {
    const n = Number(v.replace(/[^\d.]/g, ''))
    return Number.isFinite(n) ? String(n) : '0'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-0 md:p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-t-2xl md:rounded-2xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
        {/* HEADER gradient */}
        <div className={`px-5 py-4 bg-gradient-to-r ${dirMeta.bar} text-white`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[10.5px] uppercase tracking-widest opacity-80 mb-0.5">
                {kindMeta.emoji} {kindMeta.title}
              </div>
              <h2 className="text-xl font-bold flex items-center gap-2 mb-0.5">
                <span>{dirMeta.emoji}</span>
                <span>{dirMeta.label}</span>
              </h2>
              <div className="text-sm opacity-90 truncate">
                <span className="font-mono opacity-75">{item.code}</span>
                <span className="mx-1">·</span>
                <span className="font-semibold">{item.name_vi}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              type="button"
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-lg flex-shrink-0"
            >
              ×
            </button>
          </div>

          {/* Stock + expiry pills */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/20 backdrop-blur text-xs font-semibold">
              📦 Tồn: <b className="tabular-nums">{item.current_stock} {item.unit}</b>
            </span>
            {expiryWarn && (
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/20 backdrop-blur text-xs font-semibold`}>
                ⏰ {expiryWarn.label}
              </span>
            )}
            {item.cost_per_unit && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/20 backdrop-blur text-xs">
                💰 Giá đơn vị: <b className="tabular-nums">{formatVnd(item.cost_per_unit)}/{item.unit}</b>
              </span>
            )}
          </div>
        </div>

        {/* BODY */}
        <form onSubmit={submit} className="overflow-y-auto p-5 space-y-4">
          {/* Direction toggle */}
          <div className="grid grid-cols-2 gap-1.5 bg-gray-100 dark:bg-gray-900 p-1 rounded-xl">
            {(['nhap', 'xuat'] as Direction[]).map((d) => {
              const m = DIR_META[d]
              const active = direction === d
              return (
                <button
                  type="button"
                  key={d}
                  onClick={() => {
                    setDirection(d)
                    setReason('')
                    setCostEdited(false)
                  }}
                  className={
                    'py-2.5 rounded-lg text-sm font-bold transition flex items-center justify-center gap-1.5 ' +
                    (active
                      ? `bg-gradient-to-r ${m.bar} text-white shadow`
                      : 'text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800')
                  }
                >
                  <span>{m.emoji}</span>
                  <span>{m.label}</span>
                </button>
              )
            })}
          </div>

          {/* Quantity input lớn */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">
              Số lượng {direction === 'nhap' ? 'nhập' : 'xuất'}
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                value={quantity > 0 ? quantity : ''}
                onChange={(e) => setQuantity(Number(formatNumber(e.target.value)) || 0)}
                placeholder="0"
                autoFocus
                className={
                  `w-full text-3xl font-bold tabular-nums px-4 py-3 rounded-xl border-2 transition focus:outline-none focus:ring-4 ` +
                  dirMeta.tone + ' ' + dirMeta.bgSoft + ' ' + dirMeta.textTone + ' ' + dirMeta.ringFocus
                }
              />
              <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-base font-bold ${dirMeta.textTone}`}>
                {item.unit}
              </span>
            </div>

            {/* Preview after */}
            {quantity > 0 && (
              <div
                className={
                  'mt-2 px-3 py-2 rounded-lg flex items-center justify-between text-sm border ' +
                  (willNegative
                    ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-semibold'
                    : willLow
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                      : 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300')
                }
              >
                <span>
                  {willNegative ? '⚠️ Vượt tồn kho' : willLow ? '⚠️ Sẽ chạm ngưỡng cảnh báo' : '✅ Tồn sau giao dịch'}
                </span>
                <span className="font-extrabold tabular-nums">
                  {item.current_stock} {direction === 'nhap' ? '+' : '−'} {quantity} = {stockAfter} {item.unit}
                </span>
              </div>
            )}
          </div>

          {/* Quick reasons */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">
              Lý do {direction === 'nhap' ? 'nhập' : 'xuất'} <span className="text-gray-400 dark:text-gray-500">(chọn nhanh)</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {QUICK_REASONS[kind][direction].map((r) => {
                const active = reason === r.label
                return (
                  <button
                    type="button"
                    key={r.label}
                    onClick={() => setReason(active ? '' : r.label)}
                    className={
                      'px-2 py-2 rounded-lg text-xs font-semibold transition border ' +
                      (active
                        ? `bg-gradient-to-r ${dirMeta.bar} text-white border-transparent shadow`
                        : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-orange-300')
                    }
                  >
                    <div className="text-base mb-0.5">{r.emoji}</div>
                    <div className="leading-tight">{r.label}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Cost + Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">
                Giá trị {direction === 'nhap' ? 'nhập (chi phí)' : 'xuất (tham khảo)'} <span className="text-gray-400 dark:text-gray-500">(VND)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={cost > 0 ? cost.toLocaleString('vi-VN') : ''}
                  onChange={(e) => {
                    setCost(Number(e.target.value.replace(/[^\d]/g, '')) || 0)
                    setCostEdited(true)
                  }}
                  placeholder="0"
                  className="w-full text-base font-semibold tabular-nums px-3 py-2 pr-9 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:outline-none focus:border-orange-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm font-medium">đ</span>
              </div>
              {item.cost_per_unit && quantity > 0 && !costEdited && (
                <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                  💡 Tự ước tính: {quantity} × {formatVnd(item.cost_per_unit)}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">
                Ngày giao dịch
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">
              Ghi chú thêm <span className="text-gray-400 dark:text-gray-500">(tuỳ chọn)</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              placeholder={
                direction === 'nhap'
                  ? 'VD: Mua từ đại lý ABC, lô 0426'
                  : 'VD: Cấp cho khu A2, dùng cho lứa T4/2026'
              }
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm resize-none"
            />
          </div>

          {/* History collapsible */}
          <details
            open={historyOpen}
            onToggle={(e) => setHistoryOpen((e.target as HTMLDetailsElement).open)}
            className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl"
          >
            <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center justify-between">
              <span>📜 Lịch sử giao dịch gần đây ({history.length})</span>
              <span className="text-gray-400 dark:text-gray-500">{historyOpen ? '▼' : '▶'}</span>
            </summary>
            <div className="px-3 pb-3 max-h-44 overflow-y-auto">
              {historyLoading ? (
                <div className="py-3 text-center text-xs text-gray-500 dark:text-gray-400">Đang tải...</div>
              ) : history.length === 0 ? (
                <div className="py-3 text-center text-xs text-gray-500 dark:text-gray-400">Chưa có giao dịch nào</div>
              ) : (
                <ul className="space-y-1">
                  {history.slice(0, 8).map((t) => {
                    const isIn = t.transaction_type === 'nhap'
                    return (
                      <li
                        key={t.id}
                        className="flex items-center gap-2 text-xs py-1 border-b border-gray-200 dark:border-gray-700 last:border-0"
                      >
                        <span
                          className={
                            'w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ' +
                            (isIn
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300')
                          }
                        >
                          {isIn ? '📥' : '📤'}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400 tabular-nums w-16 flex-shrink-0">
                          {new Date(t.transaction_date).toLocaleDateString('vi-VN')}
                        </span>
                        <span
                          className={
                            'font-bold tabular-nums w-20 flex-shrink-0 ' +
                            (isIn ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')
                          }
                        >
                          {isIn ? '+' : '−'}
                          {t.quantity} {item.unit}
                        </span>
                        <span className="text-gray-700 dark:text-gray-300 truncate flex-1">
                          {t.notes || '—'}
                        </span>
                        {t.cost && (
                          <span className="text-gray-500 dark:text-gray-400 text-[10.5px] flex-shrink-0">
                            {formatVnd(Number(t.cost))}
                          </span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </details>

          {err && (
            <div className="px-3 py-2 rounded-lg text-sm bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300">
              ⚠️ {err}
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
              disabled={loading || quantity <= 0 || (direction === 'xuat' && willNegative)}
              className={
                'flex-1 px-4 py-2.5 rounded-xl text-white font-bold shadow-md hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r ' +
                dirMeta.bar
              }
            >
              {loading
                ? 'Đang lưu...'
                : `${dirMeta.emoji} Lưu ${dirMeta.label.toLowerCase()}${quantity > 0 ? ` ${quantity} ${item.unit}` : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
