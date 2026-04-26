'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDate, formatVnd } from '@/lib/utils/format'
import { removeDiacritics } from '@/lib/utils/slugify'

type Category = { id: string; code: string; name_vi: string }
type Expense = {
  id: string
  category_id: string
  amount: number
  expense_date: string
  description: string | null
  category: { code: string; name_vi: string } | null
}

const QUICK_AMOUNTS = [100_000, 200_000, 500_000, 1_000_000, 2_000_000, 5_000_000]

const CATEGORY_META: Record<string, { emoji: string; bar: string; cls: string }> = {
  feed: {
    emoji: '🌾',
    bar: 'from-amber-400 to-orange-500',
    cls: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
  },
  medicine: {
    emoji: '💊',
    bar: 'from-rose-400 to-red-500',
    cls: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900',
  },
  vaccine: {
    emoji: '💉',
    bar: 'from-cyan-400 to-sky-500',
    cls: 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-900',
  },
  labor: {
    emoji: '👷',
    bar: 'from-blue-400 to-indigo-500',
    cls: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900',
  },
  utility: {
    emoji: '💡',
    bar: 'from-yellow-400 to-amber-500',
    cls: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-900',
  },
  facility: {
    emoji: '🏠',
    bar: 'from-emerald-400 to-teal-500',
    cls: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
  },
  marketing: {
    emoji: '📣',
    bar: 'from-violet-400 to-purple-500',
    cls: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900',
  },
  other: {
    emoji: '📦',
    bar: 'from-slate-400 to-gray-500',
    cls: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-700',
  },
}

function metaFor(code?: string | null) {
  if (!code) return CATEGORY_META.other
  const k = code.toLowerCase()
  return CATEGORY_META[k] ?? CATEGORY_META.other
}

export function ExpenseManager({
  categories,
  expenses,
  lastMonthTotal,
}: {
  categories: Category[]
  expenses: Expense[]
  lastMonthTotal: number
}) {
  const router = useRouter()
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    category_id: '',
    amount: 0,
    expense_date: today,
    description: '',
  })
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const [q, setQ] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [sortKey, setSortKey] = useState<'newest' | 'amount_desc'>('newest')

  const qNorm = removeDiacritics(q.trim())

  const filtered = useMemo(() => {
    const out = expenses.filter((e) => {
      if (filterCat && e.category_id !== filterCat) return false
      if (qNorm) {
        const hay = removeDiacritics(`${e.description ?? ''} ${e.category?.name_vi ?? ''}`)
        if (!hay.includes(qNorm)) return false
      }
      return true
    })
    out.sort((a, b) => {
      if (sortKey === 'amount_desc') return Number(b.amount) - Number(a.amount)
      return (
        new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime() ||
        Number(b.amount) - Number(a.amount)
      )
    })
    return out
  }, [expenses, qNorm, filterCat, sortKey])

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0)
  const totalFiltered = filtered.reduce((s, e) => s + Number(e.amount), 0)

  // By category aggregation (full month, not filtered)
  const byCategory = useMemo(() => {
    const m = new Map<string, { count: number; amount: number; cat: Category | null }>()
    for (const e of expenses) {
      const key = e.category_id
      const cur = m.get(key) ?? {
        count: 0,
        amount: 0,
        cat: categories.find((c) => c.id === key) ?? null,
      }
      cur.count += 1
      cur.amount += Number(e.amount)
      m.set(key, cur)
    }
    return Array.from(m.entries()).sort((a, b) => b[1].amount - a[1].amount)
  }, [expenses, categories])

  // Stats
  const dayOfMonth = new Date().getDate()
  const avgPerDay = dayOfMonth > 0 ? total / dayOfMonth : 0
  const monthChange =
    lastMonthTotal > 0 ? ((total - lastMonthTotal) / lastMonthTotal) * 100 : 0
  const top = byCategory[0]
  const monthLabel = `Tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setMsg(null)
    if (!form.category_id) return setErr('Chọn hạng mục chi phí')
    if (form.amount <= 0) return setErr('Số tiền phải > 0')
    setLoading(true)
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) {
        setErr(typeof json.error === 'string' ? json.error : JSON.stringify(json.error))
        return
      }
      setMsg(`✓ Đã ghi ${formatVnd(form.amount)}`)
      setForm({ category_id: '', amount: 0, expense_date: today, description: '' })
      router.refresh()
      setTimeout(() => setMsg(null), 3000)
    } finally {
      setLoading(false)
    }
  }

  const hasFilter = !!q || !!filterCat

  return (
    <div className="space-y-4">
      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Kpi
          label={`Tổng ${monthLabel}`}
          value={formatVnd(total)}
          icon="💸"
          tone="from-rose-500 to-red-500"
          small
        />
        <Kpi
          label={`So tháng trước`}
          value={
            lastMonthTotal === 0 && total === 0
              ? '—'
              : `${monthChange >= 0 ? '+' : ''}${monthChange.toFixed(1)}%`
          }
          icon={monthChange > 0 ? '📈' : monthChange < 0 ? '📉' : '➖'}
          tone={
            monthChange > 5
              ? 'from-rose-500 to-red-500'
              : monthChange < -5
                ? 'from-emerald-500 to-teal-500'
                : 'from-slate-500 to-gray-500'
          }
          sub={`Trước: ${formatVnd(lastMonthTotal)}`}
          pulse={monthChange > 20}
        />
        <Kpi
          label="Trung bình / ngày"
          value={formatVnd(avgPerDay)}
          icon="📅"
          tone="from-amber-500 to-orange-500"
          sub={`${dayOfMonth} ngày qua`}
          small
        />
        <Kpi
          label="Hạng mục lớn nhất"
          value={top?.[1].cat?.name_vi ?? '—'}
          icon={top ? metaFor(top[1].cat?.code).emoji : '🏆'}
          tone="from-violet-500 to-purple-500"
          sub={top ? formatVnd(top[1].amount) : ''}
          small
        />
      </div>

      {/* ADD FORM */}
      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500" />
        <form onSubmit={submit} className="p-4 md:p-5 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              ➕ Ghi chi phí mới
            </h2>
            <span className="text-[11px] text-gray-500 dark:text-gray-400">
              Chọn hạng mục → nhập số tiền → click ghi nhận
            </span>
          </div>

          <div>
            <Label>Hạng mục *</Label>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((c) => {
                const active = form.category_id === c.id
                const meta = metaFor(c.code)
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setForm({ ...form, category_id: c.id })}
                    className={
                      'px-3 py-1.5 rounded-full text-xs font-medium border transition ' +
                      (active
                        ? `bg-gradient-to-r ${meta.bar} text-white border-transparent shadow`
                        : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-400')
                    }
                  >
                    {meta.emoji} {c.name_vi}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Số tiền (VND) *</Label>
              <input
                type="number"
                min={0}
                step={10000}
                value={form.amount || ''}
                onChange={(e) =>
                  setForm({ ...form, amount: parseFloat(e.target.value) || 0 })
                }
                placeholder="0"
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-base font-bold tabular-nums"
              />
              <div className="flex flex-wrap gap-1 mt-1">
                {QUICK_AMOUNTS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setForm({ ...form, amount: a })}
                    className="text-[10.5px] px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:border-rose-400 tabular-nums"
                  >
                    {a >= 1_000_000
                      ? `${a / 1_000_000}M`
                      : `${(a / 1000).toLocaleString('vi-VN')}k`}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Ngày *</Label>
              <input
                type="date"
                value={form.expense_date}
                onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
              />
              <div className="flex flex-wrap gap-1 mt-1">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, expense_date: today })}
                  className="text-[10.5px] px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:border-rose-400"
                >
                  Hôm nay
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date()
                    d.setDate(d.getDate() - 1)
                    setForm({ ...form, expense_date: d.toISOString().split('T')[0] })
                  }}
                  className="text-[10.5px] px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:border-rose-400"
                >
                  Hôm qua
                </button>
              </div>
            </div>
            <div>
              <Label>Mô tả (tuỳ chọn)</Label>
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="VD: Mua 50kg cám gà giống ABC"
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          {err && (
            <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 rounded-lg px-3 py-2 text-sm">
              ✗ {err}
            </div>
          )}
          {msg && (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 rounded-lg px-3 py-2 text-sm">
              {msg}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading || !form.category_id || form.amount <= 0}
              className="bg-gradient-to-r from-rose-500 to-orange-600 text-white rounded-lg px-5 py-2.5 text-sm font-semibold shadow hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? '⏳ Đang ghi…' : `+ Ghi ${form.amount > 0 ? formatVnd(form.amount) : 'chi phí'}`}
            </button>
          </div>
        </form>
      </section>

      {/* DISTRIBUTION */}
      {byCategory.length > 0 && (
        <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-violet-500 to-purple-500" />
          <div className="p-4 md:p-5 space-y-3">
            <div className="flex items-baseline justify-between flex-wrap gap-2">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                📊 Phân bổ theo hạng mục — {monthLabel}
              </h2>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Tổng <strong className="text-gray-900 dark:text-gray-100">{formatVnd(total)}</strong>
              </span>
            </div>

            {/* Stacked overview bar */}
            <div className="h-3 rounded-full bg-gray-100 dark:bg-gray-900/60 overflow-hidden flex">
              {byCategory.map(([cid, v]) => {
                const meta = metaFor(v.cat?.code)
                const pct = total > 0 ? (v.amount / total) * 100 : 0
                if (pct === 0) return null
                return (
                  <div
                    key={cid}
                    className={`h-full bg-gradient-to-r ${meta.bar}`}
                    style={{ width: `${pct}%` }}
                    title={`${v.cat?.name_vi}: ${pct.toFixed(0)}%`}
                  />
                )
              })}
            </div>

            <ul className="space-y-2 mt-2">
              {byCategory.map(([cid, v]) => {
                const meta = metaFor(v.cat?.code)
                const pct = total > 0 ? (v.amount / total) * 100 : 0
                const avg = v.count > 0 ? v.amount / v.count : 0
                return (
                  <li
                    key={cid}
                    className="bg-gray-50/60 dark:bg-gray-900/40 rounded-lg p-3"
                  >
                    <div className="flex items-baseline justify-between gap-2 flex-wrap mb-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-full border ${meta.cls}`}
                        >
                          {meta.emoji} {v.cat?.name_vi ?? '—'}
                        </span>
                        <span className="text-[10.5px] text-gray-500 dark:text-gray-400">
                          {v.count} giao dịch · TB {formatVnd(avg)}/lần
                        </span>
                      </div>
                      <span className="text-sm font-bold tabular-nums text-rose-700 dark:text-rose-300">
                        {formatVnd(v.amount)}{' '}
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 font-normal">
                          · {pct.toFixed(1)}%
                        </span>
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-200/60 dark:bg-gray-700/60 overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${meta.bar} transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </section>
      )}

      {/* LIST FILTER + TABLE */}
      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500" />
        <div className="p-4 md:p-5 space-y-3">
          <div className="flex items-baseline justify-between flex-wrap gap-2">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              📋 Chi phí gần đây — {monthLabel}
            </h2>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {filtered.length}/{expenses.length} giao dịch ·{' '}
              {hasFilter && (
                <strong className="text-gray-900 dark:text-gray-100">
                  Đã lọc {formatVnd(totalFiltered)}
                </strong>
              )}
            </span>
          </div>

          <div className="flex flex-col md:flex-row gap-2">
            <div className="relative flex-1 min-w-0">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Tìm theo mô tả / hạng mục…"
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={filterCat}
              onChange={(e) => setFilterCat(e.target.value)}
              className="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2"
            >
              <option value="">Tất cả hạng mục</option>
              {categories.map((c) => {
                const meta = metaFor(c.code)
                return (
                  <option key={c.id} value={c.id}>
                    {meta.emoji} {c.name_vi}
                  </option>
                )
              })}
            </select>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as 'newest' | 'amount_desc')}
              className="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2"
            >
              <option value="newest">🆕 Mới nhất</option>
              <option value="amount_desc">💰 Tiền cao</option>
            </select>
            {hasFilter && (
              <button
                onClick={() => {
                  setQ('')
                  setFilterCat('')
                }}
                className="text-sm text-rose-600 dark:text-rose-400 hover:underline px-2"
              >
                Bỏ lọc
              </button>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center">
              <div className="text-4xl mb-1">💸</div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {expenses.length === 0
                  ? 'Chưa có chi phí tháng này — ghi giao dịch đầu tiên ở form trên.'
                  : 'Không khớp bộ lọc'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 md:-mx-5">
              <table className="w-full text-sm min-w-[600px]">
                <thead className="bg-gray-50 dark:bg-gray-900 text-xs uppercase text-gray-500 dark:text-gray-400 border-y border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-3 py-2 text-left w-28">Ngày</th>
                    <th className="px-3 py-2 text-left">Hạng mục</th>
                    <th className="px-3 py-2 text-left">Mô tả</th>
                    <th className="px-3 py-2 text-right w-32">Số tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e) => {
                    const meta = metaFor(e.category?.code)
                    return (
                      <tr
                        key={e.id}
                        className="border-t border-gray-100 dark:border-gray-700 hover:bg-blue-50/30 dark:hover:bg-blue-950/15"
                      >
                        <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {formatDate(e.expense_date)}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded-full border ${meta.cls}`}
                          >
                            {meta.emoji} {e.category?.name_vi ?? '—'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300">
                          {e.description ?? (
                            <span className="text-gray-400 italic">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-bold tabular-nums text-rose-700 dark:text-rose-300 whitespace-nowrap">
                          {formatVnd(e.amount)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                {filtered.length > 1 && (
                  <tfoot className="bg-gray-50 dark:bg-gray-900 border-t-2 border-gray-200 dark:border-gray-700">
                    <tr>
                      <td colSpan={3} className="px-3 py-2 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 text-right font-semibold">
                        Tổng {hasFilter ? 'đã lọc' : 'tháng'}
                      </td>
                      <td className="px-3 py-2 text-right font-bold tabular-nums text-rose-700 dark:text-rose-300">
                        {formatVnd(totalFiltered)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>
      </section>

      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
        💡 Chi phí lương nhân công sẽ được{' '}
        <strong className="text-gray-700 dark:text-gray-300">tự ghi vào đây</strong> khi chốt
        lương ở Nhân sự → Bảng lương. Thuốc và thức ăn cũng tự cộng khi nhập kho.
      </p>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
      {children}
    </span>
  )
}

function Kpi({
  label,
  value,
  icon,
  tone,
  pulse,
  sub,
  small,
}: {
  label: string
  value: string
  icon: string
  tone: string
  pulse?: boolean
  sub?: string
  small?: boolean
}) {
  return (
    <div className="relative overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3.5">
      <div
        className={`absolute -right-6 -top-6 w-20 h-20 rounded-full bg-gradient-to-br ${tone} opacity-15 blur-xl ${
          pulse ? 'animate-pulse' : ''
        }`}
      />
      <div className="relative">
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <span>{icon}</span>
          <span className="truncate">{label}</span>
        </div>
        <div
          className={
            'mt-1 font-bold tabular-nums text-gray-900 dark:text-gray-100 ' +
            (small ? 'text-base' : 'text-2xl')
          }
        >
          {value}
        </div>
        {sub && (
          <div className="text-[10.5px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
            {sub}
          </div>
        )}
      </div>
    </div>
  )
}
