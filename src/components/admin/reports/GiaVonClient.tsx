'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { formatVnd, formatDate } from '@/lib/utils/format'
import { removeDiacritics } from '@/lib/utils/slugify'

export type GiaVonRow = {
  chicken_id: string
  chicken_code: string | null
  breed_id: string | null
  breed_name: string | null
  breed_tier: string | null
  sale_date: string | null
  sale_price: number | null
  cost_basis: number | null
  profit: number | null
  profit_margin_pct: number | null
  price_segment: string | null
  customer_id: string | null
  customer_name: string | null
}

const SEGMENT_META: Record<string, { label: string; cls: string; bar: string }> = {
  cao_cap: {
    label: '👑 Cao cấp',
    cls: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
    bar: 'from-amber-400 to-orange-500',
  },
  pho_thong: {
    label: '⭐ Phổ thông',
    cls: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900',
    bar: 'from-blue-400 to-indigo-500',
  },
  thit: {
    label: '🍗 Gà thịt',
    cls: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
    bar: 'from-emerald-400 to-teal-500',
  },
}

type RangeKey = '' | '7d' | '30d' | '90d' | 'this_month' | 'this_year'
type ProfitFilter = '' | 'profit' | 'loss' | 'breakeven'
type SortKey = 'newest' | 'profit_desc' | 'profit_asc' | 'margin_desc' | 'price_desc' | 'cost_desc'
type ViewMode = 'grid' | 'table' | 'analysis'

function avatarColor(seed: string): string {
  const palette = [
    'from-rose-400 to-pink-500',
    'from-amber-400 to-orange-500',
    'from-emerald-400 to-teal-500',
    'from-sky-400 to-blue-500',
    'from-violet-400 to-purple-500',
    'from-fuchsia-400 to-pink-500',
    'from-lime-400 to-green-500',
    'from-cyan-400 to-sky-500',
  ]
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return palette[h % palette.length]
}

function getInitials(s: string | null | undefined): string {
  if (!s) return '?'
  const parts = s.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function GiaVonClient({ rows: allRows }: { rows: GiaVonRow[] }) {
  const [q, setQ] = useState('')
  const [segment, setSegment] = useState<string>('')
  const [breedId, setBreedId] = useState<string>('')
  const [profitFilter, setProfitFilter] = useState<ProfitFilter>('')
  const [range, setRange] = useState<RangeKey>('')
  const [from, setFrom] = useState<string>('')
  const [to, setTo] = useState<string>('')
  const [minMargin, setMinMargin] = useState<string>('')
  const [sortKey, setSortKey] = useState<SortKey>('newest')
  const [view, setView] = useState<ViewMode>('grid')

  const breeds = useMemo(() => {
    const map = new Map<string, string>()
    for (const r of allRows) {
      if (r.breed_id && r.breed_name) map.set(r.breed_id, r.breed_name)
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1], 'vi'))
  }, [allRows])

  const qNorm = removeDiacritics(q.trim())

  const filtered = useMemo(() => {
    let cutoff = 0
    if (range === '7d') cutoff = Date.now() - 7 * 86400_000
    else if (range === '30d') cutoff = Date.now() - 30 * 86400_000
    else if (range === '90d') cutoff = Date.now() - 90 * 86400_000
    else if (range === 'this_month') {
      const d = new Date()
      cutoff = new Date(d.getFullYear(), d.getMonth(), 1).getTime()
    } else if (range === 'this_year') {
      const d = new Date()
      cutoff = new Date(d.getFullYear(), 0, 1).getTime()
    }
    const fromTs = from ? new Date(from + 'T00:00:00').getTime() : 0
    const toTs = to ? new Date(to + 'T23:59:59').getTime() : 0
    const minM = minMargin ? Number(minMargin) : NaN

    const out = allRows.filter((r) => {
      if (segment && r.price_segment !== segment) return false
      if (breedId && r.breed_id !== breedId) return false
      const profit = Number(r.profit ?? 0)
      if (profitFilter === 'profit' && profit <= 0) return false
      if (profitFilter === 'loss' && profit >= 0) return false
      if (profitFilter === 'breakeven' && profit !== 0) return false
      if (!Number.isNaN(minM)) {
        const m = Number(r.profit_margin_pct ?? 0)
        if (m < minM) return false
      }
      const t = r.sale_date ? new Date(r.sale_date).getTime() : 0
      if (cutoff && t < cutoff) return false
      if (fromTs && t < fromTs) return false
      if (toTs && t > toTs) return false
      if (qNorm) {
        const hay = removeDiacritics(
          `${r.chicken_code ?? ''} ${r.breed_name ?? ''} ${r.customer_name ?? ''}`
        )
        if (!hay.includes(qNorm)) return false
      }
      return true
    })

    out.sort((a, b) => {
      const pa = Number(a.profit ?? 0)
      const pb = Number(b.profit ?? 0)
      const ma = Number(a.profit_margin_pct ?? 0)
      const mb = Number(b.profit_margin_pct ?? 0)
      const sa = Number(a.sale_price ?? 0)
      const sb = Number(b.sale_price ?? 0)
      const ca = Number(a.cost_basis ?? 0)
      const cb = Number(b.cost_basis ?? 0)
      if (sortKey === 'profit_desc') return pb - pa
      if (sortKey === 'profit_asc') return pa - pb
      if (sortKey === 'margin_desc') return mb - ma
      if (sortKey === 'price_desc') return sb - sa
      if (sortKey === 'cost_desc') return cb - ca
      const da = a.sale_date ? new Date(a.sale_date).getTime() : 0
      const db = b.sale_date ? new Date(b.sale_date).getTime() : 0
      return db - da
    })

    return out
  }, [allRows, qNorm, segment, breedId, profitFilter, range, from, to, minMargin, sortKey])

  const stats = useMemo(() => {
    const total = filtered.length
    const totalRevenue = filtered.reduce((s, r) => s + Number(r.sale_price ?? 0), 0)
    const totalCost = filtered.reduce((s, r) => s + Number(r.cost_basis ?? 0), 0)
    const totalProfit = filtered.reduce((s, r) => s + Number(r.profit ?? 0), 0)
    const avgMargin = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0
    const profitable = filtered.filter((r) => Number(r.profit ?? 0) > 0).length
    const lossCount = filtered.filter((r) => Number(r.profit ?? 0) < 0).length
    let topProfit: GiaVonRow | null = null
    let worstLoss: GiaVonRow | null = null
    for (const r of filtered) {
      const p = Number(r.profit ?? 0)
      if (!topProfit || p > Number(topProfit.profit ?? 0)) topProfit = r
      if (!worstLoss || p < Number(worstLoss.profit ?? 0)) worstLoss = r
    }
    return {
      total,
      totalRevenue,
      totalCost,
      totalProfit,
      avgMargin,
      profitable,
      lossCount,
      topProfit,
      worstLoss,
    }
  }, [filtered])

  const breakdownBySegment = useMemo(() => {
    const m = new Map<string, { count: number; profit: number; revenue: number }>()
    for (const r of filtered) {
      const key = r.price_segment ?? 'other'
      const cur = m.get(key) ?? { count: 0, profit: 0, revenue: 0 }
      cur.count += 1
      cur.profit += Number(r.profit ?? 0)
      cur.revenue += Number(r.sale_price ?? 0)
      m.set(key, cur)
    }
    return Array.from(m.entries())
  }, [filtered])

  const breakdownByBreed = useMemo(() => {
    const m = new Map<string, { name: string; count: number; profit: number; revenue: number }>()
    for (const r of filtered) {
      const key = r.breed_id ?? '_'
      const cur = m.get(key) ?? {
        name: r.breed_name ?? '— Khác —',
        count: 0,
        profit: 0,
        revenue: 0,
      }
      cur.count += 1
      cur.profit += Number(r.profit ?? 0)
      cur.revenue += Number(r.sale_price ?? 0)
      m.set(key, cur)
    }
    return Array.from(m.values()).sort((a, b) => b.profit - a.profit)
  }, [filtered])

  const hasFilter = Boolean(
    q || segment || breedId || profitFilter || range || from || to || minMargin
  )
  function reset() {
    setQ('')
    setSegment('')
    setBreedId('')
    setProfitFilter('')
    setRange('')
    setFrom('')
    setTo('')
    setMinMargin('')
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Kpi label="Số con bán" value={String(stats.total)} icon="🐓" tone="from-slate-500 to-slate-600" />
        <Kpi label="Doanh thu" value={formatVnd(stats.totalRevenue)} icon="💵" tone="from-blue-500 to-indigo-500" small />
        <Kpi label="Giá vốn" value={formatVnd(stats.totalCost)} icon="💲" tone="from-rose-500 to-red-500" small />
        <Kpi
          label="Lãi ròng"
          value={formatVnd(stats.totalProfit)}
          icon={stats.totalProfit >= 0 ? '📈' : '📉'}
          tone={stats.totalProfit >= 0 ? 'from-emerald-500 to-teal-500' : 'from-rose-500 to-red-600'}
          pulse={stats.totalProfit < 0}
          small
        />
        <Kpi
          label="Biên LN TB"
          value={`${stats.avgMargin.toFixed(1)}%`}
          icon="📊"
          tone={stats.avgMargin >= 0 ? 'from-violet-500 to-purple-600' : 'from-rose-500 to-red-500'}
        />
        <Kpi
          label="Lãi / Lỗ"
          value={`${stats.profitable} / ${stats.lossCount}`}
          icon="⚖️"
          tone="from-amber-500 to-orange-500"
        />
      </div>

      {(stats.topProfit || stats.worstLoss) && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {stats.topProfit && (
            <HighlightCard
              title="🏆 Lãi cao nhất"
              row={stats.topProfit}
              tone="emerald"
            />
          )}
          {stats.worstLoss && Number(stats.worstLoss.profit ?? 0) < 0 && (
            <HighlightCard
              title="⚠️ Lỗ nặng nhất"
              row={stats.worstLoss}
              tone="rose"
            />
          )}
        </div>
      )}

      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1 min-w-0">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm theo mã gà, giống, khách hàng…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={segment}
              onChange={(e) => setSegment(e.target.value)}
              className="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2"
            >
              <option value="">Tất cả phân khúc</option>
              <option value="cao_cap">👑 Cao cấp (≥ 5tr)</option>
              <option value="pho_thong">⭐ Phổ thông (2–5tr)</option>
              <option value="thit">🍗 Gà thịt (&lt; 2tr)</option>
            </select>
            <select
              value={breedId}
              onChange={(e) => setBreedId(e.target.value)}
              className="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2"
            >
              <option value="">Tất cả giống</option>
              {breeds.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
            <select
              value={profitFilter}
              onChange={(e) => setProfitFilter(e.target.value as ProfitFilter)}
              className="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2"
            >
              <option value="">Tất cả P&amp;L</option>
              <option value="profit">📈 Có lãi</option>
              <option value="loss">📉 Lỗ</option>
              <option value="breakeven">⚖️ Hoà vốn</option>
            </select>
            <input
              type="number"
              value={minMargin}
              onChange={(e) => setMinMargin(e.target.value)}
              placeholder="Biên ≥ %"
              className="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 w-24"
            />
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2"
            />
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2"
            />
            {hasFilter && (
              <button
                onClick={reset}
                className="text-sm text-rose-600 dark:text-rose-400 hover:underline px-2"
              >
                Bỏ lọc
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
          <div className="flex flex-wrap gap-1.5">
            {[
              { k: '' as const, label: '🌐 Mọi lúc' },
              { k: '7d' as const, label: '⏱️ 7N' },
              { k: '30d' as const, label: '📅 30N' },
              { k: '90d' as const, label: '🗓️ 90N' },
              { k: 'this_month' as const, label: '📆 Tháng này' },
              { k: 'this_year' as const, label: '🗓 Năm nay' },
            ].map((r) => {
              const active = range === r.k
              return (
                <button
                  key={r.k || 'all'}
                  onClick={() => setRange(r.k)}
                  className={
                    'px-3 py-1.5 rounded-full text-xs font-medium border transition ' +
                    (active
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-transparent shadow'
                      : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-400')
                  }
                >
                  {r.label}
                </button>
              )
            })}
            <span className="w-px bg-gray-200 dark:bg-gray-700 mx-1" />
            {[
              { k: 'newest' as const, label: '🆕 Mới bán' },
              { k: 'profit_desc' as const, label: '💰 Lãi cao' },
              { k: 'profit_asc' as const, label: '📉 Lãi thấp' },
              { k: 'margin_desc' as const, label: '📈 Biên cao' },
              { k: 'price_desc' as const, label: '💵 Giá bán cao' },
              { k: 'cost_desc' as const, label: '💲 Giá vốn cao' },
            ].map((s) => {
              const active = sortKey === s.k
              return (
                <button
                  key={s.k}
                  onClick={() => setSortKey(s.k)}
                  className={
                    'px-3 py-1.5 rounded-full text-xs font-medium border transition ' +
                    (active
                      ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white border-transparent shadow'
                      : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-violet-400')
                  }
                >
                  {s.label}
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500 dark:text-gray-400">
              Hiện <strong className="text-gray-900 dark:text-gray-100">{stats.total}</strong>/
              {allRows.length}
            </span>
            <div className="flex border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              {(['grid', 'table', 'analysis'] as const).map((m) => {
                const labelMap = { grid: '▦ Lưới', table: '📋 Bảng', analysis: '📊 Phân tích' }
                return (
                  <button
                    key={m}
                    onClick={() => setView(m)}
                    className={
                      'px-3 py-1.5 ' +
                      (view === m
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                        : 'bg-white dark:bg-gray-900 text-gray-500')
                    }
                  >
                    {labelMap[m]}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-10 text-center">
          <div className="text-5xl mb-2">🐓</div>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
            Không có gà bán nào khớp bộ lọc.
          </p>
          {hasFilter && (
            <button
              onClick={reset}
              className="text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2"
            >
              Bỏ tất cả bộ lọc
            </button>
          )}
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((r) => (
            <GiaVonCard key={r.chicken_id} row={r} />
          ))}
        </div>
      ) : view === 'table' ? (
        <TableView rows={filtered} />
      ) : (
        <AnalysisView
          totalProfit={stats.totalProfit}
          totalRevenue={stats.totalRevenue}
          bySegment={breakdownBySegment}
          byBreed={breakdownByBreed}
        />
      )}
    </div>
  )
}

function HighlightCard({
  title,
  row,
  tone,
}: {
  title: string
  row: GiaVonRow
  tone: 'emerald' | 'rose'
}) {
  const isProfit = tone === 'emerald'
  const tonecls = isProfit
    ? 'from-emerald-500 to-teal-500 border-emerald-200 dark:border-emerald-900 bg-emerald-50/60 dark:bg-emerald-950/30'
    : 'from-rose-500 to-red-500 border-rose-200 dark:border-rose-900 bg-rose-50/60 dark:bg-rose-950/30'
  const profit = Number(row.profit ?? 0)
  return (
    <div className={`relative overflow-hidden rounded-xl border ${tonecls} p-4`}>
      <div
        className={`absolute -right-10 -top-10 w-40 h-40 rounded-full bg-gradient-to-br ${
          isProfit ? 'from-emerald-300 to-teal-400' : 'from-rose-300 to-red-400'
        } opacity-25 blur-3xl`}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div
            className={`text-xs font-semibold ${
              isProfit ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
            } mb-1`}
          >
            {title}
          </div>
          <div className="font-mono text-sm text-gray-700 dark:text-gray-300">
            {row.chicken_code ?? '—'} ·{' '}
            <span className="font-sans">{row.breed_name ?? '—'}</span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            👥 {row.customer_name ?? '—'} · {formatDate(row.sale_date)}
          </div>
        </div>
        <div className="text-right whitespace-nowrap">
          <div
            className={`text-2xl font-bold tabular-nums ${
              isProfit
                ? 'text-emerald-700 dark:text-emerald-300'
                : 'text-rose-700 dark:text-rose-300'
            }`}
          >
            {profit >= 0 ? '+' : ''}
            {formatVnd(profit)}
          </div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400">
            Biên {row.profit_margin_pct ?? 0}% · Bán {formatVnd(row.sale_price)}
          </div>
        </div>
      </div>
    </div>
  )
}

function GiaVonCard({ row }: { row: GiaVonRow }) {
  const profit = Number(row.profit ?? 0)
  const margin = Number(row.profit_margin_pct ?? 0)
  const segment = row.price_segment ?? 'thit'
  const seg = SEGMENT_META[segment] ?? SEGMENT_META.thit
  const isProfit = profit > 0
  const isLoss = profit < 0
  const breedSeed = row.breed_id ?? row.breed_name ?? '?'
  const initials = getInitials(row.breed_name)

  // Margin bar (-100..+100% normalized to 0..100%)
  const barPct = Math.max(0, Math.min(100, (margin + 100) / 2))
  return (
    <Link
      href={row.chicken_id ? `/admin/ho-so-ga/${row.chicken_id}` : '#'}
      className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:shadow-lg hover:border-blue-300 transition block"
    >
      <div className={`h-1.5 bg-gradient-to-r ${seg.bar}`} />
      <div className="p-4">
        <div className="flex items-start gap-2.5">
          <div
            className={`flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br ${avatarColor(
              breedSeed
            )} text-white font-bold flex items-center justify-center text-sm shadow`}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
              {row.chicken_code ?? '—'}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
              {row.breed_name ?? '— Không rõ giống —'}
            </div>
          </div>
          <span className={`text-[10.5px] px-2 py-0.5 rounded-full border whitespace-nowrap ${seg.cls}`}>
            {seg.label}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 px-2.5 py-1.5">
            <div className="text-[10px] uppercase text-blue-600 dark:text-blue-400">Giá bán</div>
            <div className="font-bold text-blue-700 dark:text-blue-300 tabular-nums">
              {formatVnd(row.sale_price)}
            </div>
          </div>
          <div className="rounded-lg bg-rose-50/60 dark:bg-rose-950/20 px-2.5 py-1.5">
            <div className="text-[10px] uppercase text-rose-600 dark:text-rose-400">Giá vốn</div>
            <div className="font-bold text-rose-700 dark:text-rose-300 tabular-nums">
              {formatVnd(row.cost_basis)}
            </div>
          </div>
          <div
            className={
              'rounded-lg px-2.5 py-1.5 ' +
              (isProfit
                ? 'bg-emerald-50 dark:bg-emerald-950/30'
                : isLoss
                  ? 'bg-rose-100/70 dark:bg-rose-950/40 ring-1 ring-rose-300/50'
                  : 'bg-gray-50 dark:bg-gray-900/40')
            }
          >
            <div
              className={
                'text-[10px] uppercase ' +
                (isProfit
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : isLoss
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-gray-500')
              }
            >
              Lãi
            </div>
            <div
              className={
                'font-bold tabular-nums ' +
                (isProfit
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : isLoss
                    ? 'text-rose-700 dark:text-rose-300'
                    : 'text-gray-700 dark:text-gray-300')
              }
            >
              {profit >= 0 ? '+' : ''}
              {formatVnd(profit)}
            </div>
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-gray-500 dark:text-gray-400">Biên lợi nhuận</span>
            <span
              className={
                'font-bold tabular-nums ' +
                (margin > 0
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : margin < 0
                    ? 'text-rose-700 dark:text-rose-300'
                    : 'text-gray-500')
              }
            >
              {margin > 0 ? '+' : ''}
              {margin}%
            </span>
          </div>
          <div className="relative h-1.5 rounded-full bg-gray-100 dark:bg-gray-900/60 overflow-hidden">
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-300 dark:bg-gray-600" />
            <div
              className={
                'absolute top-0 bottom-0 ' +
                (margin >= 0
                  ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
                  : 'bg-gradient-to-r from-rose-400 to-red-500')
              }
              style={{
                left: margin >= 0 ? '50%' : `${barPct}%`,
                width: `${Math.abs(barPct - 50)}%`,
              }}
            />
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
          <span className="truncate">👥 {row.customer_name ?? '— Khách lẻ —'}</span>
          <span className="whitespace-nowrap">📅 {formatDate(row.sale_date)}</span>
        </div>
      </div>
    </Link>
  )
}

function TableView({ rows }: { rows: GiaVonRow[] }) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900 text-xs uppercase text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-3 py-2.5 text-left">Mã</th>
              <th className="px-3 py-2.5 text-left">Giống</th>
              <th className="px-3 py-2.5 text-left">Phân khúc</th>
              <th className="px-3 py-2.5 text-left">Khách</th>
              <th className="px-3 py-2.5 text-left">Ngày bán</th>
              <th className="px-3 py-2.5 text-right">Giá bán</th>
              <th className="px-3 py-2.5 text-right">Giá vốn</th>
              <th className="px-3 py-2.5 text-right">Lãi</th>
              <th className="px-3 py-2.5 text-right">Biên %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const profit = Number(r.profit ?? 0)
              const seg = SEGMENT_META[r.price_segment ?? 'thit'] ?? SEGMENT_META.thit
              return (
                <tr
                  key={r.chicken_id}
                  className={
                    'border-t border-gray-100 dark:border-gray-700 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 ' +
                    (profit < 0
                      ? 'bg-rose-50/40 dark:bg-rose-950/10'
                      : profit > 0
                        ? ''
                        : '')
                  }
                >
                  <td className="px-3 py-2 font-mono text-xs">
                    <Link
                      href={`/admin/ho-so-ga/${r.chicken_id}`}
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {r.chicken_code ?? '—'}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{r.breed_name ?? '—'}</td>
                  <td className="px-3 py-2">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border ${seg.cls}`}>
                      {seg.label}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400 truncate max-w-[160px]">
                    {r.customer_name ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {formatDate(r.sale_date)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-blue-700 dark:text-blue-300 font-medium">
                    {formatVnd(r.sale_price)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-600 dark:text-gray-400">
                    {formatVnd(r.cost_basis)}
                  </td>
                  <td
                    className={
                      'px-3 py-2 text-right tabular-nums font-bold ' +
                      (profit > 0
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : profit < 0
                          ? 'text-rose-700 dark:text-rose-300'
                          : 'text-gray-500')
                    }
                  >
                    {profit >= 0 ? '+' : ''}
                    {formatVnd(profit)}
                  </td>
                  <td
                    className={
                      'px-3 py-2 text-right tabular-nums ' +
                      (Number(r.profit_margin_pct ?? 0) >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400')
                    }
                  >
                    {r.profit_margin_pct ?? 0}%
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AnalysisView({
  totalProfit,
  totalRevenue,
  bySegment,
  byBreed,
}: {
  totalProfit: number
  totalRevenue: number
  bySegment: [string, { count: number; profit: number; revenue: number }][]
  byBreed: { name: string; count: number; profit: number; revenue: number }[]
}) {
  const maxBreedRev = Math.max(1, ...byBreed.map((b) => b.revenue))
  const topSegmentKey = [...bySegment].sort((a, b) => b[1].revenue - a[1].revenue)[0]?.[0]
  const topSegmentLabel =
    topSegmentKey === 'cao_cap'
      ? 'Cao cấp'
      : topSegmentKey === 'pho_thong'
        ? 'Phổ thông'
        : topSegmentKey === 'thit'
          ? 'Gà thịt'
          : '—'
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
          <span>🎯</span> Phân khúc giá
        </h3>
        <div className="space-y-2">
          {bySegment.map(([key, v]) => {
            const meta = SEGMENT_META[key] ?? {
              label: '— Khác —',
              cls: '',
              bar: 'from-gray-400 to-gray-500',
            }
            const pct = totalRevenue > 0 ? (v.revenue / totalRevenue) * 100 : 0
            const profitable = v.profit >= 0
            return (
              <div key={key}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-gray-700 dark:text-gray-300">{meta.label}</span>
                  <span className="text-gray-500 dark:text-gray-400 tabular-nums">
                    {v.count} con · {formatVnd(v.revenue)} ·{' '}
                    <strong
                      className={
                        profitable
                          ? 'text-emerald-700 dark:text-emerald-300'
                          : 'text-rose-700 dark:text-rose-300'
                      }
                    >
                      {v.profit >= 0 ? '+' : ''}
                      {formatVnd(v.profit)}
                    </strong>
                  </span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-900/60 overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${meta.bar}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
          {bySegment.length === 0 && (
            <p className="text-xs text-gray-500 italic">Chưa có dữ liệu</p>
          )}
        </div>
      </section>

      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
          <span>🧬</span> Top giống theo doanh thu
        </h3>
        <div className="space-y-2">
          {byBreed.slice(0, 12).map((b) => {
            const pct = (b.revenue / maxBreedRev) * 100
            const profitable = b.profit >= 0
            return (
              <div key={b.name}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-gray-700 dark:text-gray-300 truncate flex-1 min-w-0">
                    {b.name} <span className="text-gray-400">· {b.count} con</span>
                  </span>
                  <span
                    className={
                      'tabular-nums whitespace-nowrap ml-2 ' +
                      (profitable
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : 'text-rose-700 dark:text-rose-300')
                    }
                  >
                    {b.profit >= 0 ? '+' : ''}
                    {formatVnd(b.profit)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-900/60 overflow-hidden">
                  <div
                    className={
                      'h-full bg-gradient-to-r ' +
                      (profitable ? 'from-emerald-400 to-teal-500' : 'from-rose-400 to-red-500')
                    }
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
          {byBreed.length === 0 && <p className="text-xs text-gray-500 italic">Chưa có dữ liệu</p>}
        </div>
      </section>

      <section className="lg:col-span-2 bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50 dark:from-indigo-950/30 dark:via-blue-950/30 dark:to-cyan-950/30 border border-blue-200 dark:border-blue-900 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
          <span>💡</span> Tổng kết hiệu quả kinh doanh
        </h3>
        <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
          Tổng doanh thu <strong>{formatVnd(totalRevenue)}</strong>, lãi ròng{' '}
          <strong
            className={
              totalProfit >= 0
                ? 'text-emerald-700 dark:text-emerald-300'
                : 'text-rose-700 dark:text-rose-300'
            }
          >
            {totalProfit >= 0 ? '+' : ''}
            {formatVnd(totalProfit)}
          </strong>
          . Phân khúc đóng góp lớn nhất: <strong>{topSegmentLabel}</strong>.
        </p>
      </section>
    </div>
  )
}

function Kpi({
  label,
  value,
  icon,
  tone,
  pulse,
  small,
}: {
  label: string
  value: string
  icon: string
  tone: string
  pulse?: boolean
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
      </div>
    </div>
  )
}
