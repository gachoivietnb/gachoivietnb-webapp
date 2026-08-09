'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { formatVnd } from '@/lib/utils/format'
import { removeDiacritics } from '@/lib/utils/slugify'

export type StmtItem = {
  id: string
  code: string
  date: string // YYYY-MM-DD (ngày nợ phát sinh)
  total: number
  paid: number
  partner_id: string | null
  partner_name: string | null
  kind?: string | null
}
export type StmtPayment = { item_id: string; date: string; amount: number }

type Side = 'receivable' | 'payable'
type Preset = 'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'all' | 'custom'

const KIND_LABEL: Record<string, string> = {
  ga: '🐓 Gà', thuc_an: '🌾 Thức ăn', thuoc: '💊 Thuốc', vat_tu: '📦 Vật tư', khac: '📦 Khác',
}

function pad(n: number) { return String(n).padStart(2, '0') }
function fmt(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }

function periodRange(preset: Preset, cFrom: string, cTo: string): [string, string] {
  const d = new Date()
  const y = d.getFullYear(), m = d.getMonth()
  const lastDay = (yy: number, mm: number) => new Date(yy, mm + 1, 0)
  switch (preset) {
    case 'this_month': return [fmt(new Date(y, m, 1)), fmt(lastDay(y, m))]
    case 'last_month': return [fmt(new Date(y, m - 1, 1)), fmt(lastDay(y, m - 1))]
    case 'this_quarter': { const qs = Math.floor(m / 3) * 3; return [fmt(new Date(y, qs, 1)), fmt(lastDay(y, qs + 2))] }
    case 'this_year': return [fmt(new Date(y, 0, 1)), fmt(new Date(y, 11, 31))]
    case 'all': return ['0000-01-01', '9999-12-31']
    case 'custom': return [cFrom || fmt(new Date(y, m, 1)), cTo || fmt(d)]
  }
}

type Stmt = { opening: number; increase: number; decrease: number; closing: number }

function computeStmt(items: StmtItem[], paysByItem: Map<string, StmtPayment[]>, from: string, to: string): Stmt {
  let opening = 0, increase = 0, decrease = 0
  for (const it of items) {
    const pays = paysByItem.get(it.id) ?? []
    if (it.date < from) {
      // Số dư đầu kỳ: total − đã trả hiện tại + thanh toán từ 'from' trở đi (bền với dữ liệu cũ chưa có ngày)
      const payGeFrom = pays.reduce((s, p) => (p.date >= from ? s + p.amount : s), 0)
      opening += it.total - it.paid + payGeFrom
    }
    if (it.date >= from && it.date <= to) increase += it.total
    decrease += pays.reduce((s, p) => (p.date >= from && p.date <= to ? s + p.amount : s), 0)
  }
  return { opening, increase, decrease, closing: opening + increase - decrease }
}

export function DebtStatementClient({
  side,
  items,
  payments,
  partners,
}: {
  side: Side
  items: StmtItem[]
  payments: StmtPayment[]
  partners: Array<{ id: string; name: string }>
}) {
  const isRec = side === 'receivable'
  const partnerLabel = isRec ? 'Khách hàng' : 'Nhà cung cấp'
  const incLabel = isRec ? 'Bán chịu (nợ tăng)' : 'Mua chịu (nợ tăng)'
  const decLabel = isRec ? 'Đã thu' : 'Đã trả'
  const tone = isRec ? 'emerald' : 'red'
  const kinds = isRec ? [] : Array.from(new Set(items.map((i) => i.kind ?? 'ga')))

  const [preset, setPreset] = useState<Preset>('this_month')
  const [cFrom, setCFrom] = useState('')
  const [cTo, setCTo] = useState('')
  const [partnerId, setPartnerId] = useState('')
  const [kind, setKind] = useState('')
  const [q, setQ] = useState('')

  const [from, to] = periodRange(preset, cFrom, cTo)
  const qn = removeDiacritics(q.trim())

  const paysByItem = useMemo(() => {
    const m = new Map<string, StmtPayment[]>()
    for (const p of payments) {
      const arr = m.get(p.item_id) ?? []
      arr.push(p)
      m.set(p.item_id, arr)
    }
    return m
  }, [payments])

  // Lọc theo NCC/khách + loại + tìm kiếm
  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      if (partnerId && it.partner_id !== partnerId) return false
      if (kind && (it.kind ?? 'ga') !== kind) return false
      if (qn) {
        const hay = removeDiacritics(`${it.code} ${it.partner_name ?? ''}`)
        if (!hay.includes(qn)) return false
      }
      return true
    })
  }, [items, partnerId, kind, qn])

  const total = useMemo(() => computeStmt(filteredItems, paysByItem, from, to), [filteredItems, paysByItem, from, to])

  // Bảng kê theo đối tác
  const byPartner = useMemo(() => {
    const groups = new Map<string, StmtItem[]>()
    for (const it of filteredItems) {
      const key = it.partner_id ?? '—'
      const arr = groups.get(key) ?? []
      arr.push(it)
      groups.set(key, arr)
    }
    const rows = [...groups.entries()].map(([pid, its]) => {
      const st = computeStmt(its, paysByItem, from, to)
      return { partner_id: pid, partner_name: its[0]?.partner_name ?? '— Không rõ —', ...st }
    })
    return rows
      .filter((r) => r.opening !== 0 || r.increase !== 0 || r.decrease !== 0 || r.closing !== 0)
      .sort((a, b) => b.closing - a.closing)
  }, [filteredItems, paysByItem, from, to])

  const toneText = tone === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
  const selCls = 'border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm'
  const PRESETS: Array<[Preset, string]> = [
    ['this_month', 'Tháng này'], ['last_month', 'Tháng trước'], ['this_quarter', 'Quý này'],
    ['this_year', 'Năm nay'], ['all', 'Toàn bộ'], ['custom', 'Tùy chọn'],
  ]

  return (
    <div className="space-y-4">
      {/* Bộ lọc thông minh */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">📅 Kỳ:</span>
          {PRESETS.map(([k, l]) => (
            <button
              key={k}
              onClick={() => setPreset(k)}
              className={`text-xs px-2.5 py-1 rounded-full font-semibold transition ${
                preset === k ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              {l}
            </button>
          ))}
          {preset === 'custom' && (
            <span className="flex items-center gap-1.5">
              <input type="date" value={cFrom} onChange={(e) => setCFrom(e.target.value)} className={selCls} />
              <span className="text-gray-400 text-xs">→</span>
              <input type="date" value={cTo} onChange={(e) => setCTo(e.target.value)} className={selCls} />
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-sm">🔍</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Mã / tên ${partnerLabel.toLowerCase()}...`} className={`${selCls} w-full pl-8`} />
          </div>
          <select value={partnerId} onChange={(e) => setPartnerId(e.target.value)} className={selCls}>
            <option value="">Tất cả {partnerLabel.toLowerCase()}</option>
            {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {!isRec && (
            <select value={kind} onChange={(e) => setKind(e.target.value)} className={selCls}>
              <option value="">Mọi loại</option>
              {kinds.map((k) => <option key={k} value={k}>{KIND_LABEL[k] ?? k}</option>)}
            </select>
          )}
        </div>
        <p className="text-[11px] text-gray-400">
          Kỳ: <b>{from === '0000-01-01' ? 'từ đầu' : from.split('-').reverse().join('/')}</b> → <b>{to === '9999-12-31' ? 'nay' : to.split('-').reverse().join('/')}</b>
        </p>
      </div>

      {/* 4 chỉ số kỳ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Số dư đầu kỳ" value={total.opening} tone="gray" />
        <Stat label={`Phát sinh tăng · ${incLabel}`} value={total.increase} tone={tone} sign="+" />
        <Stat label={`Phát sinh giảm · ${decLabel}`} value={total.decrease} tone="blue" sign="−" />
        <Stat label="Số dư cuối kỳ" value={total.closing} tone={tone} strong />
      </div>

      {/* Bảng kê theo đối tác */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
          <h3 className="font-bold text-sm">Bảng kê theo {partnerLabel.toLowerCase()} ({byPartner.length})</h3>
        </div>
        {byPartner.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-400">Không có phát sinh công nợ trong kỳ.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="text-[11px] uppercase text-gray-500 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="text-left p-2.5">{partnerLabel}</th>
                  <th className="text-right p-2.5">Đầu kỳ</th>
                  <th className="text-right p-2.5">Tăng</th>
                  <th className="text-right p-2.5">Giảm</th>
                  <th className="text-right p-2.5">Cuối kỳ</th>
                </tr>
              </thead>
              <tbody>
                {byPartner.map((r) => {
                  const base = isRec ? '/admin/khach-hang' : '/admin/nha-cung-cap'
                  return (
                    <tr key={r.partner_id} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/30">
                      <td className="p-2.5 font-medium">
                        {isRec || r.partner_id === '—' ? (
                          r.partner_name
                        ) : (
                          <Link href={`${base}/${r.partner_id}`} className="text-blue-600 dark:text-blue-400 hover:underline">{r.partner_name}</Link>
                        )}
                      </td>
                      <td className="p-2.5 text-right tabular-nums text-gray-600 dark:text-gray-400">{formatVnd(r.opening)}</td>
                      <td className="p-2.5 text-right tabular-nums text-emerald-600 dark:text-emerald-400">{formatVnd(r.increase)}</td>
                      <td className="p-2.5 text-right tabular-nums text-blue-600 dark:text-blue-400">{formatVnd(r.decrease)}</td>
                      <td className={`p-2.5 text-right tabular-nums font-bold ${toneText}`}>{formatVnd(r.closing)}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="bg-gray-50 dark:bg-gray-900/40 font-bold border-t-2 border-gray-200 dark:border-gray-700">
                <tr>
                  <td className="p-2.5">TỔNG CỘNG</td>
                  <td className="p-2.5 text-right tabular-nums">{formatVnd(total.opening)}</td>
                  <td className="p-2.5 text-right tabular-nums text-emerald-600 dark:text-emerald-400">{formatVnd(total.increase)}</td>
                  <td className="p-2.5 text-right tabular-nums text-blue-600 dark:text-blue-400">{formatVnd(total.decrease)}</td>
                  <td className={`p-2.5 text-right tabular-nums ${toneText}`}>{formatVnd(total.closing)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <p className="text-[11px] text-gray-400">
        Cân đối: Cuối kỳ = Đầu kỳ + Tăng − Giảm. Ngày nợ tính theo ngày {isRec ? 'đơn bán' : 'phiếu mua'}; đã thu/trả theo ngày thanh toán.
      </p>
    </div>
  )
}

function Stat({ label, value, tone, sign, strong }: { label: string; value: number; tone: string; sign?: string; strong?: boolean }) {
  const map: Record<string, string> = {
    gray: 'text-gray-900 dark:text-gray-100',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    red: 'text-red-600 dark:text-red-400',
    blue: 'text-blue-600 dark:text-blue-400',
  }
  return (
    <div className={`bg-white dark:bg-gray-800 border rounded-xl p-3 ${strong ? 'border-gray-300 dark:border-gray-600 ring-1 ring-gray-200 dark:ring-gray-700' : 'border-gray-200 dark:border-gray-700'}`}>
      <div className="text-[10.5px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide leading-tight">{label}</div>
      <div className={`text-lg md:text-xl font-extrabold tabular-nums mt-1 ${map[tone]}`}>
        {sign ?? ''}{formatVnd(value)}đ
      </div>
    </div>
  )
}
