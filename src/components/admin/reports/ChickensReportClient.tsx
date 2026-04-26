'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { formatVnd } from '@/lib/utils/format'

export type ChickenReportData = {
  fromDate: string
  toDate: string
  beginCount: number
  hatched: number
  sold: number
  died: number
  endCount: number
  revenue: number
  cogs: number
  profit: number
  margin: number
  survivalRate: number
  mortalityRate: number
  byBreed: Array<{ id: string; name: string; count: number; sold: number; died: number; revenue: number }>
  byArea: Array<{ id: string; name: string; count: number; sold: number; died: number; revenue: number }>
  byStatus: Record<string, number>
  totalChickens: number
}

const STATUS_LABELS: Record<string, { label: string; emoji: string; tone: string }> = {
  dang_nuoi: { label: 'Đang nuôi', emoji: '🐓', tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' },
  dang_cach_ly: { label: 'Cách ly', emoji: '⛔', tone: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' },
  da_ban: { label: 'Đã bán', emoji: '💵', tone: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' },
  chet: { label: 'Đã chết', emoji: '💀', tone: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' },
  loai_thai: { label: 'Loại thải', emoji: '🚮', tone: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
}

const PRESETS = [
  { key: 'this_month', label: 'Tháng này' },
  { key: 'last_month', label: 'Tháng trước' },
  { key: 'last_30', label: '30 ngày' },
  { key: 'last_90', label: '90 ngày' },
  { key: 'this_year', label: 'Năm nay' },
] as const

function presetRange(p: string): { from: string; to: string } {
  const today = new Date()
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  if (p === 'this_month')
    return { from: fmt(new Date(today.getFullYear(), today.getMonth(), 1)), to: fmt(new Date(today.getFullYear(), today.getMonth() + 1, 0)) }
  if (p === 'last_month')
    return { from: fmt(new Date(today.getFullYear(), today.getMonth() - 1, 1)), to: fmt(new Date(today.getFullYear(), today.getMonth(), 0)) }
  if (p === 'last_30') {
    const d = new Date(); d.setDate(d.getDate() - 29)
    return { from: fmt(d), to: fmt(today) }
  }
  if (p === 'last_90') {
    const d = new Date(); d.setDate(d.getDate() - 89)
    return { from: fmt(d), to: fmt(today) }
  }
  return { from: fmt(new Date(today.getFullYear(), 0, 1)), to: fmt(today) }
}

export function ChickensReportClient({ data }: { data: ChickenReportData }) {
  const router = useRouter()
  const sp = useSearchParams()
  const [from, setFrom] = useState(data.fromDate)
  const [to, setTo] = useState(data.toDate)

  function applyPreset(p: string) {
    const r = presetRange(p)
    router.push(`?from=${r.from}&to=${r.to}`)
  }
  function applyCustom() {
    if (!from || !to) return
    router.push(`?from=${from}&to=${to}`)
  }

  function exportCsv() {
    const rows: string[][] = []
    rows.push(['BÁO CÁO ĐÀN GÀ'])
    rows.push([`Từ ngày`, data.fromDate, `Đến ngày`, data.toDate])
    rows.push([])
    rows.push(['Chỉ tiêu', 'Giá trị'])
    rows.push(['Đầu kỳ', String(data.beginCount)])
    rows.push(['Sinh trong kỳ (nở)', String(data.hatched)])
    rows.push(['Bán trong kỳ', String(data.sold)])
    rows.push(['Chết trong kỳ', String(data.died)])
    rows.push(['Cuối kỳ', String(data.endCount)])
    rows.push(['Tỷ lệ sống (%)', data.survivalRate.toFixed(1)])
    rows.push(['Tỷ lệ chết (%)', data.mortalityRate.toFixed(1)])
    rows.push(['Doanh thu', String(data.revenue)])
    rows.push(['Giá vốn', String(data.cogs)])
    rows.push(['Lợi nhuận', String(data.profit)])
    rows.push(['Biên LN (%)', data.margin.toFixed(1)])
    rows.push([])
    rows.push(['THEO GIỐNG'])
    rows.push(['Giống', 'Đang nuôi', 'Đã bán kỳ', 'Chết kỳ', 'Doanh thu kỳ'])
    for (const b of data.byBreed) {
      rows.push([b.name, String(b.count), String(b.sold), String(b.died), String(b.revenue)])
    }
    rows.push([])
    rows.push(['THEO KHU'])
    rows.push(['Khu', 'Đang nuôi'])
    for (const a of data.byArea) rows.push([a.name, String(a.count)])

    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n')
    const bom = '﻿'
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bao-cao-dan-ga_${data.fromDate}_${data.toDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalChange = data.endCount - data.beginCount
  const totalChangePct = data.beginCount > 0 ? (totalChange / data.beginCount) * 100 : 0

  return (
    <div className="space-y-4">
      {/* FILTER + ACTIONS */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 flex flex-wrap gap-2 items-center print:hidden">
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5 flex-wrap">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => applyPreset(p.key)}
              className="text-xs px-3 py-1.5 rounded font-semibold text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800"
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900" />
          <span className="text-xs text-gray-500 dark:text-gray-400">→</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900" />
          <button onClick={applyCustom} className="text-xs bg-orange-500 hover:bg-orange-600 text-white rounded px-3 py-1 font-semibold">Áp dụng</button>
        </div>
        <div className="ml-auto flex gap-1.5">
          <button onClick={exportCsv} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3 py-1.5 text-xs font-semibold">📊 Xuất CSV</button>
          <button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-1.5 text-xs font-semibold">🖨 In</button>
        </div>
      </div>

      {/* KPI lớn — flow 5 step */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm">
        <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3">📊 Tổng hợp đàn gà trong kỳ</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3">
          <FlowKpi emoji="📦" label="Đầu kỳ" value={data.beginCount} tone="from-blue-500 to-indigo-500" />
          <FlowKpi emoji="🥚" label="Sinh / Nở" value={`+${data.hatched}`} tone="from-emerald-500 to-green-500" sign="add" />
          <FlowKpi emoji="💵" label="Bán" value={`-${data.sold}`} tone="from-amber-500 to-orange-500" sign="subtract" />
          <FlowKpi emoji="💀" label="Chết / loại" value={`-${data.died}`} tone="from-rose-500 to-red-500" sign="subtract" />
          <FlowKpi
            emoji="🐓"
            label="Cuối kỳ"
            value={data.endCount}
            tone={totalChange >= 0 ? 'from-blue-500 to-indigo-500' : 'from-amber-500 to-orange-500'}
            highlight
            sub={
              totalChange !== 0
                ? `${totalChange >= 0 ? '↑' : '↓'} ${Math.abs(totalChange)} (${totalChangePct >= 0 ? '+' : ''}${totalChangePct.toFixed(1)}%)`
                : 'Không đổi'
            }
          />
        </div>

        {/* Tỷ lệ sống / chết */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <RatioBar label="Tỷ lệ sống" value={data.survivalRate} good />
          <RatioBar label="Tỷ lệ chết / loại" value={data.mortalityRate} />
        </div>
      </div>

      {/* Doanh thu / lợi nhuận */}
      <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-blue-50 dark:from-emerald-950/30 dark:via-teal-950/30 dark:to-blue-950/30 border border-emerald-200 dark:border-emerald-900 rounded-2xl p-5">
        <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3">💰 Tài chính từ bán gà trong kỳ</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <FinKpi label="Doanh thu" value={data.revenue} tone="text-emerald-700 dark:text-emerald-300" />
          <FinKpi label="Giá vốn" value={data.cogs} tone="text-amber-700 dark:text-amber-300" />
          <FinKpi label="Lợi nhuận" value={data.profit} tone={data.profit >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-rose-700 dark:text-rose-300'} highlight />
          <FinKpi label="Biên LN" value={`${data.margin.toFixed(1)}%`} tone={data.margin >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-rose-700 dark:text-rose-300'} isText />
        </div>
      </div>

      {/* Snapshot trạng thái + Theo giống */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Snapshot status */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3">
            🎯 Snapshot tổng đàn ({data.totalChickens})
          </h2>
          <div className="space-y-2">
            {Object.entries(data.byStatus)
              .sort((a, b) => b[1] - a[1])
              .map(([status, count]) => {
                const meta = STATUS_LABELS[status] ?? { label: status, emoji: '❔', tone: 'bg-gray-100' }
                const pct = data.totalChickens > 0 ? (count / data.totalChickens) * 100 : 0
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${meta.tone}`}>
                        {meta.emoji} {meta.label}
                      </span>
                      <span className="font-bold tabular-nums">{count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-orange-400 to-red-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
          </div>
        </div>

        {/* By breed */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 text-white">
            <h2 className="text-sm font-bold">🧬 Theo giống gà</h2>
          </div>
          {data.byBreed.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">Chưa có dữ liệu</div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs uppercase text-gray-600 dark:text-gray-400">
                <tr>
                  <th className="px-3 py-2 text-left">Giống</th>
                  <th className="px-3 py-2 text-right">Đang nuôi</th>
                  <th className="px-3 py-2 text-right">Bán kỳ</th>
                  <th className="px-3 py-2 text-right">Chết kỳ</th>
                  <th className="px-3 py-2 text-right">DT bán</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {data.byBreed.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-3 py-2 font-medium">{b.name}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-bold">{b.count}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-emerald-600">{b.sold > 0 ? b.sold : '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-rose-600">{b.died > 0 ? b.died : '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-emerald-700 dark:text-emerald-300">
                      {b.revenue > 0 ? formatVnd(b.revenue) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </div>

      {/* By area */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
          <h2 className="text-sm font-bold">📍 Theo khu vực (đang nuôi)</h2>
        </div>
        {data.byArea.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">Chưa có dữ liệu</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 p-3">
            {data.byArea.map((a) => (
              <div
                key={a.id}
                className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-900 rounded-xl p-3 text-center"
              >
                <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 truncate">{a.name}</div>
                <div className="text-xl font-extrabold text-gray-900 dark:text-gray-100 tabular-nums mt-1">{a.count}</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400">đang nuôi</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function FlowKpi({
  emoji,
  label,
  value,
  tone,
  highlight,
  sub,
  sign,
}: {
  emoji: string
  label: string
  value: string | number
  tone: string
  highlight?: boolean
  sub?: string
  sign?: 'add' | 'subtract'
}) {
  return (
    <div
      className={
        'rounded-xl p-3 border ' +
        (highlight
          ? 'border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-950/30 ring-2 ring-orange-200 dark:ring-orange-800'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900')
      }
    >
      <div className="flex items-center gap-2">
        <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${tone} text-white flex items-center justify-center text-base shadow shrink-0`}>
          {emoji}
        </div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate">{label}</div>
          <div
            className={
              'text-lg md:text-xl font-extrabold tabular-nums ' +
              (sign === 'add'
                ? 'text-emerald-600 dark:text-emerald-400'
                : sign === 'subtract'
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-gray-900 dark:text-gray-100')
            }
          >
            {value}
          </div>
        </div>
      </div>
      {sub && <div className="text-[10.5px] text-gray-500 dark:text-gray-400 mt-1">{sub}</div>}
    </div>
  )
}

function FinKpi({
  label,
  value,
  tone,
  highlight,
  isText,
}: {
  label: string
  value: number | string
  tone: string
  highlight?: boolean
  isText?: boolean
}) {
  return (
    <div className={highlight ? 'ring-2 ring-blue-300 dark:ring-blue-700 rounded-xl bg-white dark:bg-gray-900 p-3' : 'rounded-xl bg-white dark:bg-gray-900 p-3 border border-gray-200 dark:border-gray-700'}>
      <div className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</div>
      <div className={`text-lg md:text-xl font-extrabold tabular-nums ${tone}`}>
        {isText ? value : formatVnd(value as number)}
      </div>
    </div>
  )
}

function RatioBar({ label, value, good }: { label: string; value: number; good?: boolean }) {
  const barTone = good
    ? value >= 90
      ? 'from-emerald-500 to-teal-500'
      : value >= 75
        ? 'from-amber-500 to-orange-500'
        : 'from-rose-500 to-red-500'
    : value < 5
      ? 'from-emerald-500 to-teal-500'
      : value < 15
        ? 'from-amber-500 to-orange-500'
        : 'from-rose-500 to-red-500'
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{label}</span>
        <span className="text-base font-extrabold tabular-nums">{value.toFixed(1)}%</span>
      </div>
      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${barTone} rounded-full transition-all`}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  )
}
