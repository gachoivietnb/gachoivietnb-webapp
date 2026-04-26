'use client'

import { useMemo, useState } from 'react'
import {
  type CashAccountBalance,
  type Direction,
  type TransactionCategory,
  CATEGORY_META,
  formatVnd,
  formatVndShort,
} from '@/lib/treasury/types'

export type CashFlowTx = {
  id: string
  account_id: string
  direction: Direction
  amount: number
  transaction_date: string
  category: TransactionCategory
  description: string | null
  account_name: string | null
  account_icon: string | null
  account_color: string | null
}

type Bucket = { key: string; label: string; in: number; out: number; net: number; running: number }

export function CashFlowReport({
  txs,
  accounts,
  fromDate,
  toDate,
  preset,
  openingBalance,
}: {
  txs: CashFlowTx[]
  accounts: CashAccountBalance[]
  fromDate: string
  toDate: string
  preset: string
  openingBalance: number
}) {
  const [bucketMode, setBucketMode] = useState<'auto' | 'day' | 'week' | 'month'>('auto')

  // ====== Tính toán ======
  const stats = useMemo(() => {
    let totalIn = 0
    let totalOut = 0
    const byCat = new Map<
      string,
      { category: TransactionCategory; direction: Direction; amount: number; count: number }
    >()
    const byAccount = new Map<string, { id: string; in: number; out: number; count: number }>()

    for (const t of txs) {
      const amt = Number(t.amount)
      if (t.direction === 'in') totalIn += amt
      else totalOut += amt

      const ck = `${t.direction}-${t.category}`
      const cur = byCat.get(ck) ?? {
        category: t.category,
        direction: t.direction,
        amount: 0,
        count: 0,
      }
      cur.amount += amt
      cur.count += 1
      byCat.set(ck, cur)

      const ac = byAccount.get(t.account_id) ?? { id: t.account_id, in: 0, out: 0, count: 0 }
      if (t.direction === 'in') ac.in += amt
      else ac.out += amt
      ac.count += 1
      byAccount.set(t.account_id, ac)
    }

    return {
      totalIn,
      totalOut,
      net: totalIn - totalOut,
      txCount: txs.length,
      byCat: [...byCat.values()],
      byAccount: [...byAccount.values()],
      avgPerDay: txs.length > 0 ? totalIn / Math.max(1, daysBetween(fromDate, toDate)) : 0,
    }
  }, [txs, fromDate, toDate])

  // ====== Buckets cho chart ======
  const days = daysBetween(fromDate, toDate)
  const effectiveMode =
    bucketMode === 'auto' ? (days <= 45 ? 'day' : days <= 180 ? 'week' : 'month') : bucketMode

  const buckets = useMemo<Bucket[]>(() => {
    const map = new Map<string, { in: number; out: number }>()
    for (const t of txs) {
      const k = bucketKey(t.transaction_date, effectiveMode)
      const cur = map.get(k) ?? { in: 0, out: 0 }
      if (t.direction === 'in') cur.in += t.amount
      else cur.out += t.amount
      map.set(k, cur)
    }
    // Fill empty buckets in range
    const ranges = enumerateBuckets(fromDate, toDate, effectiveMode)
    let running = openingBalance
    return ranges.map((b) => {
      const v = map.get(b.key) ?? { in: 0, out: 0 }
      const net = v.in - v.out
      running += net
      return { key: b.key, label: b.label, in: v.in, out: v.out, net, running }
    })
  }, [txs, fromDate, toDate, effectiveMode, openingBalance])

  const closingBalance = openingBalance + stats.net

  return (
    <div className="space-y-4 print:space-y-3">
      {/* ====== KPI ====== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi
          label="Tổng tiền vào"
          value={formatVnd(stats.totalIn)}
          sub={`${stats.byCat.filter((c) => c.direction === 'in').reduce((s, c) => s + c.count, 0)} giao dịch`}
          icon="📥"
          tone="from-emerald-500 to-teal-500"
        />
        <Kpi
          label="Tổng tiền ra"
          value={formatVnd(stats.totalOut)}
          sub={`${stats.byCat.filter((c) => c.direction === 'out').reduce((s, c) => s + c.count, 0)} giao dịch`}
          icon="📤"
          tone="from-rose-500 to-red-500"
        />
        <Kpi
          label="Dòng tiền ròng"
          value={(stats.net >= 0 ? '+' : '') + formatVnd(stats.net)}
          sub={
            stats.totalIn > 0
              ? `Tỷ lệ chi/thu: ${((stats.totalOut / stats.totalIn) * 100).toFixed(1)}%`
              : '—'
          }
          icon={stats.net >= 0 ? '📈' : '📉'}
          tone={stats.net >= 0 ? 'from-blue-500 to-indigo-500' : 'from-amber-500 to-orange-500'}
          pulse={stats.net < 0}
        />
        <Kpi
          label="Số dư cuối kỳ"
          value={formatVnd(closingBalance)}
          sub={`Đầu kỳ: ${formatVndShort(openingBalance)}`}
          icon="💰"
          tone="from-violet-500 to-purple-600"
        />
      </div>

      {/* ====== Chart ====== */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            📊 Dòng tiền theo {effectiveMode === 'day' ? 'ngày' : effectiveMode === 'week' ? 'tuần' : 'tháng'}
          </h2>
          <div className="flex items-center gap-3">
            <div className="text-[11px] flex gap-3">
              <Legend dot="bg-emerald-500" label="Thu" />
              <Legend dot="bg-rose-500" label="Chi" />
              <Legend dot="bg-violet-500" label="Số dư" line />
            </div>
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5 print:hidden">
              {(['auto', 'day', 'week', 'month'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setBucketMode(m)}
                  className={
                    'text-[11px] px-2.5 py-1 rounded font-semibold transition ' +
                    (bucketMode === m
                      ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400')
                  }
                >
                  {m === 'auto' ? 'Tự' : m === 'day' ? 'Ngày' : m === 'week' ? 'Tuần' : 'Tháng'}
                </button>
              ))}
            </div>
          </div>
        </div>
        <CashFlowChart buckets={buckets} />
      </div>

      {/* ====== Breakdown row ====== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* By category */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2.5">
            <h3 className="font-bold text-sm">🏷 Theo phân loại</h3>
          </div>
          <CategoryTable
            items={stats.byCat.sort((a, b) => b.amount - a.amount)}
          />
        </div>

        {/* By account */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white px-4 py-2.5">
            <h3 className="font-bold text-sm">🏦 Theo tài khoản quỹ</h3>
          </div>
          <AccountTable
            items={stats.byAccount}
            accounts={accounts}
          />
        </div>
      </div>

      {/* ====== Top transactions ====== */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-4 py-2.5 flex items-center justify-between">
          <h3 className="font-bold text-sm">🔥 Giao dịch lớn nhất kỳ</h3>
          <span className="text-[11px] bg-white/20 rounded-full px-2 py-0.5">{stats.txCount} tổng</span>
        </div>
        <TopTransactions txs={txs} />
      </div>

      {/* Footer summary cho print */}
      <div className="hidden print:block bg-gray-50 border border-gray-300 rounded-lg p-4 text-sm">
        <div className="font-bold mb-2">Tóm tắt báo cáo</div>
        <div className="grid grid-cols-2 gap-2">
          <div>Khoảng thời gian: <b>{fromDate} → {toDate}</b></div>
          <div>Preset: <b>{preset}</b></div>
          <div>Số dư đầu kỳ: <b>{formatVnd(openingBalance)}</b></div>
          <div>Số dư cuối kỳ: <b>{formatVnd(closingBalance)}</b></div>
          <div>Tổng thu: <b>{formatVnd(stats.totalIn)}</b></div>
          <div>Tổng chi: <b>{formatVnd(stats.totalOut)}</b></div>
          <div className="col-span-2">Dòng tiền ròng: <b>{(stats.net >= 0 ? '+' : '') + formatVnd(stats.net)}</b></div>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
 * Helpers
 * ============================================================ */

function daysBetween(from: string, to: string): number {
  const a = new Date(from)
  const b = new Date(to)
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86400000) + 1)
}

function bucketKey(date: string, mode: 'day' | 'week' | 'month'): string {
  if (mode === 'day') return date
  if (mode === 'month') return date.slice(0, 7)
  // week — ISO Monday-based YYYY-Www
  const d = new Date(date)
  const day = d.getDay() || 7
  d.setDate(d.getDate() + 4 - day)
  const yearStart = new Date(d.getFullYear(), 0, 1)
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`
}

function enumerateBuckets(
  from: string,
  to: string,
  mode: 'day' | 'week' | 'month'
): Array<{ key: string; label: string }> {
  const a = new Date(from)
  const b = new Date(to)
  const out: Array<{ key: string; label: string }> = []

  if (mode === 'day') {
    const cur = new Date(a)
    while (cur <= b) {
      const key = cur.toISOString().slice(0, 10)
      out.push({
        key,
        label: `${String(cur.getDate()).padStart(2, '0')}/${String(cur.getMonth() + 1).padStart(2, '0')}`,
      })
      cur.setDate(cur.getDate() + 1)
    }
  } else if (mode === 'month') {
    const cur = new Date(a.getFullYear(), a.getMonth(), 1)
    while (cur <= b) {
      const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`
      out.push({ key, label: `T${String(cur.getMonth() + 1).padStart(2, '0')}/${cur.getFullYear()}` })
      cur.setMonth(cur.getMonth() + 1)
    }
  } else {
    // week
    const cur = new Date(a)
    while (cur <= b) {
      const key = bucketKey(cur.toISOString().slice(0, 10), 'week')
      if (!out.find((x) => x.key === key)) {
        out.push({ key, label: key.replace(/^\d{4}-W/, 'T') })
      }
      cur.setDate(cur.getDate() + 1)
    }
  }
  return out
}

/* ============================================================
 * Sub-components
 * ============================================================ */

function Kpi({
  label,
  value,
  sub,
  icon,
  tone,
  pulse,
}: {
  label: string
  value: string
  sub?: string
  icon: string
  tone: string
  pulse?: boolean
}) {
  return (
    <div className="relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 overflow-hidden shadow-sm">
      <div className={`absolute -top-2 -right-2 w-16 h-16 rounded-full bg-gradient-to-br ${tone} opacity-15`} />
      <div className="relative flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${tone} text-white flex items-center justify-center text-lg shadow shrink-0 ${pulse ? 'animate-pulse' : ''}`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 truncate">{label}</div>
          <div className="text-xl md:text-2xl font-extrabold text-gray-900 dark:text-gray-100 tabular-nums">
            {value}
          </div>
          {sub && (
            <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">{sub}</div>
          )}
        </div>
      </div>
    </div>
  )
}

function Legend({ dot, label, line }: { dot: string; label: string; line?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 text-gray-700 dark:text-gray-300">
      {line ? (
        <span className={`w-3 h-0.5 ${dot}`} />
      ) : (
        <span className={`w-2.5 h-2.5 rounded-sm ${dot}`} />
      )}
      <span className="font-semibold">{label}</span>
    </span>
  )
}

function CashFlowChart({ buckets }: { buckets: Bucket[] }) {
  if (buckets.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-gray-500 dark:text-gray-400">
        Chưa có dữ liệu trong khoảng đã chọn
      </div>
    )
  }

  const maxBar = Math.max(1, ...buckets.map((b) => Math.max(b.in, b.out)))
  const balances = buckets.map((b) => b.running)
  const minBal = Math.min(...balances, 0)
  const maxBal = Math.max(...balances, 1)
  const balRange = Math.max(1, maxBal - minBal)

  // Path for line (running balance)
  const N = buckets.length
  const linePoints = buckets.map((b, i) => {
    const x = N > 1 ? (i / (N - 1)) * 100 : 50
    const y = 100 - ((b.running - minBal) / balRange) * 100
    return { x, y }
  })
  const linePath = linePoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(' ')

  return (
    <div className="relative">
      {/* Bar chart */}
      <div className="relative flex items-end gap-1 h-48">
        {buckets.map((b) => {
          const inH = (b.in / maxBar) * 100
          const outH = (b.out / maxBar) * 100
          return (
            <div key={b.key} className="flex-1 flex flex-col gap-0.5 items-stretch group min-w-0 relative">
              {/* tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-20 pointer-events-none">
                <div className="bg-gray-900 text-white text-[10.5px] rounded px-2 py-1.5 shadow-lg whitespace-nowrap">
                  <div className="font-semibold border-b border-gray-700 pb-1 mb-1">{b.label}</div>
                  <div className="text-emerald-300">+ {formatVnd(b.in)}</div>
                  <div className="text-rose-300">- {formatVnd(b.out)}</div>
                  <div className={b.net >= 0 ? 'text-blue-300' : 'text-amber-300'}>
                    Net: {(b.net >= 0 ? '+' : '') + formatVnd(b.net)}
                  </div>
                  <div className="text-violet-300 mt-1 pt-1 border-t border-gray-700">
                    Số dư: {formatVnd(b.running)}
                  </div>
                </div>
              </div>

              {/* IN bar */}
              <div
                className="bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t-sm hover:from-emerald-600 hover:to-emerald-500 transition"
                style={{ height: `${inH}%`, minHeight: b.in > 0 ? '2px' : '0' }}
              />
              {/* OUT bar */}
              <div
                className="bg-gradient-to-t from-rose-500 to-rose-400 rounded-t-sm hover:from-rose-600 hover:to-rose-500 transition"
                style={{ height: `${outH}%`, minHeight: b.out > 0 ? '2px' : '0' }}
              />
            </div>
          )
        })}

        {/* Line overlay (running balance) — SVG with fixed 100x100 viewBox */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
        >
          <defs>
            <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(139 92 246)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="rgb(139 92 246)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d={`${linePath} L 100 100 L 0 100 Z`}
            fill="url(#balanceGrad)"
          />
          <path
            d={linePath}
            fill="none"
            stroke="rgb(139 92 246)"
            strokeWidth="0.6"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {linePoints.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="0.7" fill="rgb(139 92 246)" />
          ))}
        </svg>
      </div>

      {/* X axis labels */}
      <div className="flex gap-1 mt-1.5 px-0.5">
        {buckets.map((b, i) => {
          const showLabel =
            buckets.length <= 14
              ? true
              : i === 0 || i === buckets.length - 1 || i % Math.ceil(buckets.length / 8) === 0
          return (
            <div key={b.key} className="flex-1 text-center text-[9.5px] text-gray-500 dark:text-gray-400 truncate">
              {showLabel ? b.label : ''}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CategoryTable({
  items,
}: {
  items: Array<{ category: TransactionCategory; direction: Direction; amount: number; count: number }>
}) {
  if (items.length === 0) {
    return <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">Chưa có dữ liệu</div>
  }
  const max = Math.max(...items.map((i) => i.amount), 1)
  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-700">
      {items.map((it) => {
        const meta = CATEGORY_META[it.category]
        const pct = (it.amount / max) * 100
        return (
          <div key={`${it.direction}-${it.category}`} className="px-4 py-2.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate flex items-center gap-1.5">
                <span>{meta.emoji}</span>
                <span>{meta.label}</span>
                <span
                  className={
                    'text-[10px] font-bold px-1.5 py-0.5 rounded ' +
                    (it.direction === 'in'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300')
                  }
                >
                  {it.direction === 'in' ? 'Thu' : 'Chi'}
                </span>
              </span>
              <span
                className={
                  'font-extrabold tabular-nums shrink-0 ml-2 ' +
                  (it.direction === 'in'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400')
                }
              >
                {it.direction === 'in' ? '+' : '-'}
                {formatVnd(it.amount)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={
                    'h-full rounded-full ' +
                    (it.direction === 'in'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                      : 'bg-gradient-to-r from-rose-500 to-red-500')
                  }
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-[11px] text-gray-500 dark:text-gray-400 shrink-0">{it.count}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function AccountTable({
  items,
  accounts,
}: {
  items: Array<{ id: string; in: number; out: number; count: number }>
  accounts: CashAccountBalance[]
}) {
  const accMap = new Map(accounts.map((a) => [a.account_id, a]))
  if (items.length === 0) {
    return <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">Chưa có dữ liệu</div>
  }
  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-700">
      {items
        .sort((a, b) => b.in + b.out - (a.in + a.out))
        .map((it) => {
          const acc = accMap.get(it.id)
          if (!acc) return null
          const net = it.in - it.out
          return (
            <div key={it.id} className="px-4 py-3 flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${acc.color} text-white flex items-center justify-center text-base shadow shrink-0`}
              >
                {acc.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{acc.name}</div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400">
                  {it.count} giao dịch · Số dư hiện tại: <b className="tabular-nums">{formatVnd(acc.current_balance)}</b>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">
                  +{formatVndShort(it.in)}
                </div>
                <div className="text-xs text-rose-600 dark:text-rose-400 font-bold tabular-nums">
                  -{formatVndShort(it.out)}
                </div>
                <div
                  className={
                    'text-sm font-extrabold tabular-nums mt-0.5 ' +
                    (net >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400')
                  }
                >
                  {(net >= 0 ? '+' : '') + formatVndShort(net)}
                </div>
              </div>
            </div>
          )
        })}
    </div>
  )
}

function TopTransactions({ txs }: { txs: CashFlowTx[] }) {
  const top = useMemo(() => [...txs].sort((a, b) => b.amount - a.amount).slice(0, 10), [txs])
  if (top.length === 0) {
    return <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">Chưa có giao dịch</div>
  }
  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-700">
      {top.map((t, i) => {
        const meta = CATEGORY_META[t.category]
        const isIn = t.direction === 'in'
        return (
          <div key={t.id} className="px-4 py-2.5 flex items-center gap-3">
            <div className="w-6 text-center text-xs font-bold text-gray-400 dark:text-gray-500 shrink-0">#{i + 1}</div>
            <div
              className={
                'w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0 ' +
                (isIn
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300')
              }
            >
              {meta.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {t.description || meta.label}
              </div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1.5 truncate">
                <span>{t.account_icon} {t.account_name}</span>
                <span>·</span>
                <span>{new Date(t.transaction_date).toLocaleDateString('vi-VN')}</span>
              </div>
            </div>
            <div
              className={
                'text-sm font-bold tabular-nums shrink-0 ' +
                (isIn ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')
              }
            >
              {isIn ? '+' : '-'}
              {formatVnd(t.amount)}
            </div>
          </div>
        )
      })}
    </div>
  )
}
