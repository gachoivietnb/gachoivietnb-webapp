'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import {
  type AssetWithValue,
  KIND_META,
  STATUS_META,
  ASSET_CATEGORIES,
  categoryMeta,
  formatVnd,
  formatVndShort,
} from '@/lib/assets/types'
import type { AssetKpi } from '@/lib/assets/queries'

export function AssetsReportClient({
  assets,
  kpi,
}: {
  assets: AssetWithValue[]
  kpi: AssetKpi
}) {
  const active = assets.filter((a) => a.status !== 'da_thanh_ly')
  const tscd = active.filter((a) => a.kind === 'tscd')
  const ccdc = active.filter((a) => a.kind === 'ccdc')

  const tscdValue = tscd.reduce((s, a) => s + Number(a.current_value), 0)
  const ccdcValue = ccdc.reduce((s, a) => s + Number(a.current_value), 0)
  const totalAcquired = active.reduce((s, a) => s + Number(a.purchase_price), 0)
  const totalDepreciation = active.reduce((s, a) => s + Number(a.accumulated_depreciation), 0)

  const needMaintenance = active.filter(
    (a) => a.maintenance_status === 'overdue' || a.maintenance_status === 'due_soon'
  )
  const broken = active.filter((a) => a.status === 'hong')
  const repairing = active.filter((a) => a.status === 'cho_sua')

  // Category map
  const byCat = useMemo(() => {
    const m = new Map<string | null, { count: number; current: number; acquired: number }>()
    for (const a of active) {
      const cur = m.get(a.category) ?? { count: 0, current: 0, acquired: 0 }
      cur.count++
      cur.current += Number(a.current_value)
      cur.acquired += Number(a.purchase_price)
      m.set(a.category, cur)
    }
    return [...m.entries()]
      .map(([cat, v]) => ({ category: cat, label: categoryMeta(cat).label, emoji: categoryMeta(cat).emoji, ...v }))
      .sort((a, b) => b.current - a.current)
  }, [active])

  // Status breakdown
  const byStatus = useMemo(() => {
    const m: Record<string, number> = {}
    for (const a of assets) m[a.status] = (m[a.status] ?? 0) + 1
    return m
  }, [assets])

  function exportCsv() {
    const rows: string[][] = []
    rows.push(['BÁO CÁO TÀI SẢN & CCDC'])
    rows.push([`Ngày`, new Date().toLocaleDateString('vi-VN')])
    rows.push([])
    rows.push(['Tổng giá trị còn lại', String(kpi.totalValue)])
    rows.push(['Tổng giá mua', String(totalAcquired)])
    rows.push(['Khấu hao luỹ kế', String(totalDepreciation)])
    rows.push(['TSCĐ giá trị', String(tscdValue)])
    rows.push(['CCDC giá trị', String(ccdcValue)])
    rows.push(['Cần bảo trì', String(kpi.needMaintenance)])
    rows.push(['Hỏng', String(kpi.brokenCount)])
    rows.push([])
    rows.push(['DANH SÁCH'])
    rows.push(['Mã', 'Tên', 'Loại', 'Phân loại', 'SL', 'ĐV', 'Trạng thái', 'Khu', 'Phụ trách', 'Ngày mua', 'Giá mua', 'Khấu hao tích luỹ', 'Còn lại', 'Tháng dùng', 'KH (tháng)'])
    for (const a of assets) {
      rows.push([
        a.code, a.name,
        KIND_META[a.kind].label, categoryMeta(a.category).label,
        String(a.quantity), a.unit, STATUS_META[a.status].label,
        a.area_name ?? '', a.responsible_name ?? '',
        a.purchase_date ?? '', String(a.purchase_price),
        String(a.accumulated_depreciation), String(a.current_value),
        String(a.months_used), String(a.useful_life_months ?? ''),
      ])
    }

    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bao-cao-tai-san_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {kpi.totalCount} tài sản đang quản lý · Đã thanh lý: {kpi.liquidatedCount}
        </div>
        <div className="flex gap-1.5">
          <button onClick={exportCsv} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3 py-1.5 text-xs font-semibold">📊 Xuất CSV</button>
          <button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-1.5 text-xs font-semibold">🖨 In</button>
          <Link href="/admin/tai-san" className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg px-3 py-1.5 text-xs font-semibold">→ Quản lý chi tiết</Link>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi
          label="Tổng giá trị còn lại"
          value={formatVnd(kpi.totalValue)}
          sub={`Mua ${formatVndShort(totalAcquired)} · KH ${formatVndShort(totalDepreciation)}`}
          icon="💎"
          tone="from-emerald-500 to-teal-500"
        />
        <Kpi
          label="🏭 TSCĐ"
          value={formatVnd(tscdValue)}
          sub={`${tscd.length} tài sản`}
          icon="🏭"
          tone="from-blue-500 to-indigo-500"
        />
        <Kpi
          label="🛠 CCDC"
          value={formatVnd(ccdcValue)}
          sub={`${ccdc.length} công cụ`}
          icon="🛠"
          tone="from-amber-500 to-orange-500"
        />
        <Kpi
          label="Cần xử lý"
          value={`${needMaintenance.length + broken.length + repairing.length}`}
          sub={`Bảo trì ${needMaintenance.length} · Hỏng ${broken.length} · Đang sửa ${repairing.length}`}
          icon="⚠️"
          tone={needMaintenance.length + broken.length > 0 ? 'from-rose-500 to-red-500' : 'from-gray-400 to-gray-500'}
          alert={needMaintenance.length + broken.length > 0}
        />
      </div>

      {/* By category */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
          <h2 className="text-sm font-bold">📂 Theo phân loại</h2>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs uppercase text-gray-600 dark:text-gray-400">
            <tr>
              <th className="px-3 py-2 text-left">Phân loại</th>
              <th className="px-3 py-2 text-right">SL</th>
              <th className="px-3 py-2 text-right">Đã mua</th>
              <th className="px-3 py-2 text-right">Còn lại</th>
              <th className="px-3 py-2 text-right">Khấu hao</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {byCat.map((c) => (
              <tr key={c.category ?? 'null'} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                <td className="px-3 py-2 font-medium">
                  <span className="mr-1.5">{c.emoji}</span>
                  {c.label}
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-bold">{c.count}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatVndShort(c.acquired)}</td>
                <td className="px-3 py-2 text-right tabular-nums font-bold text-emerald-700 dark:text-emerald-300">{formatVndShort(c.current)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-amber-700 dark:text-amber-300">{formatVndShort(c.acquired - c.current)}</td>
              </tr>
            ))}
            <tr className="bg-blue-50 dark:bg-blue-950/40 font-extrabold">
              <td className="px-3 py-2.5">TỔNG CỘNG</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{kpi.totalCount}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{formatVndShort(totalAcquired)}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-emerald-700 dark:text-emerald-300">{formatVndShort(kpi.totalValue)}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-amber-700 dark:text-amber-300">{formatVndShort(totalDepreciation)}</td>
            </tr>
          </tbody>
        </table>
        </div>
      </div>

      {/* Status breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 py-2.5 bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white">
            <h2 className="text-sm font-bold">🎯 Theo trạng thái</h2>
          </div>
          <div className="p-4 space-y-2">
            {Object.entries(byStatus)
              .sort((a, b) => b[1] - a[1])
              .map(([s, count]) => {
                const meta = STATUS_META[s as keyof typeof STATUS_META] ?? { label: s, emoji: '❔', cls: 'bg-gray-100' }
                const pct = assets.length > 0 ? (count / assets.length) * 100 : 0
                return (
                  <div key={s}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold border ${meta.cls}`}>
                        {meta.emoji} {meta.label}
                      </span>
                      <span className="font-bold tabular-nums">{count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
          </div>
        </div>

        {/* Cảnh báo bảo trì */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 py-2.5 bg-gradient-to-r from-rose-500 to-red-600 text-white">
            <h2 className="text-sm font-bold">⚠️ Cần lưu ý ({needMaintenance.length + broken.length + repairing.length})</h2>
          </div>
          <div className="p-4">
            {needMaintenance.length + broken.length + repairing.length === 0 ? (
              <div className="text-center py-6 text-sm text-gray-500 dark:text-gray-400">✅ Không có vấn đề</div>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {[...broken, ...repairing, ...needMaintenance].map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/admin/tai-san/${a.id}`}
                      className="flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-900 rounded px-2 py-1.5"
                    >
                      <span className="text-base">{categoryMeta(a.category).emoji}</span>
                      <span className="font-mono text-xs text-gray-500 dark:text-gray-400 w-16 flex-shrink-0">{a.code}</span>
                      <span className="flex-1 truncate text-sm">{a.name}</span>
                      <span
                        className={
                          'text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ' +
                          (a.status === 'hong'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                            : a.status === 'cho_sua'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                              : a.maintenance_status === 'overdue'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300')
                        }
                      >
                        {a.status === 'hong' ? '❌ Hỏng' :
                          a.status === 'cho_sua' ? '🔧 Đang sửa' :
                          a.maintenance_status === 'overdue' ? '⏰ Quá hạn BT' : '🔔 Sắp BT'}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Full asset table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-4 py-2.5 bg-gradient-to-r from-slate-600 to-gray-700 text-white">
          <h2 className="text-sm font-bold">📋 Danh sách đầy đủ ({assets.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-[10px] uppercase text-gray-600 dark:text-gray-400">
              <tr>
                <th className="px-2 py-2 text-left">Mã</th>
                <th className="px-2 py-2 text-left">Tên</th>
                <th className="px-2 py-2 text-center">Loại</th>
                <th className="px-2 py-2 text-center">Trạng thái</th>
                <th className="px-2 py-2 text-right">Giá mua</th>
                <th className="px-2 py-2 text-right">Khấu hao</th>
                <th className="px-2 py-2 text-right">Còn lại</th>
                <th className="px-2 py-2 text-left">Khu / phụ trách</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {assets.map((a) => {
                const km = KIND_META[a.kind]
                const sm = STATUS_META[a.status]
                return (
                  <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-2 py-1.5 font-mono">
                      <Link href={`/admin/tai-san/${a.id}`} className="text-blue-600 dark:text-blue-400 hover:underline">{a.code}</Link>
                    </td>
                    <td className="px-2 py-1.5">
                      <span className="mr-1">{categoryMeta(a.category).emoji}</span>{a.name}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <span className={'text-[9px] font-bold px-1 py-0.5 rounded border ' + km.cls}>{km.label}</span>
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <span className={'text-[9px] font-semibold px-1 py-0.5 rounded border ' + sm.cls}>{sm.emoji}</span>
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{formatVndShort(a.purchase_price)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-amber-700 dark:text-amber-300">{formatVndShort(a.accumulated_depreciation)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums font-bold text-emerald-700 dark:text-emerald-300">{formatVndShort(a.current_value)}</td>
                    <td className="px-2 py-1.5 text-[10px] text-gray-600 dark:text-gray-400">
                      <div className="truncate">{a.area_name ?? '—'}</div>
                      <div className="truncate text-gray-500 dark:text-gray-400">{a.responsible_name ?? '—'}</div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Kpi({
  label, value, sub, icon, tone, alert,
}: {
  label: string
  value: string
  sub?: string
  icon: string
  tone: string
  alert?: boolean
}) {
  return (
    <div className={'relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 overflow-hidden shadow-sm ' + (alert ? 'ring-2 ring-rose-300 animate-pulse' : '')}>
      <div className={`absolute -top-2 -right-2 w-16 h-16 rounded-full bg-gradient-to-br ${tone} opacity-15`} />
      <div className="relative flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${tone} text-white flex items-center justify-center text-lg shadow shrink-0`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 truncate">{label}</div>
          <div className="text-base md:text-lg font-extrabold text-gray-900 dark:text-gray-100 tabular-nums truncate">{value}</div>
          {sub && <div className="text-[10.5px] text-gray-500 dark:text-gray-400 truncate mt-0.5">{sub}</div>}
        </div>
      </div>
    </div>
  )
}
