'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { STATUS_META, RESULT_META, type VaccinationStatus, type VaccinationResult } from '@/lib/vaccinations/types'

type Record = {
  id: string
  chicken_id: string
  vaccine_id: string
  scheduled_date: string
  actual_date: string | null
  status: VaccinationStatus
  result: VaccinationResult | null
  vaccine_lot_number: string | null
  side_effects: string | null
  performed_by: string | null
  cost: number
}
type Vaccine = { id: string; code: string; name_vi: string; target_disease: string | null; emoji: string | null; color_hex: string | null }
type Chicken = { id: string; chicken_code: string; name: string | null }
type Profile = { id: string; full_name: string }

const fmtVnd = (n: number) => Number(n || 0).toLocaleString('vi-VN')

export function HistoryClient({
  records, vaccines, chickens, profiles,
}: { records: Record[]; vaccines: Vaccine[]; chickens: Chicken[]; profiles: Profile[] }) {
  const vacMap = new Map(vaccines.map((v) => [v.id, v]))
  const chickMap = new Map(chickens.map((c) => [c.id, c]))
  const profMap = new Map(profiles.map((p) => [p.id, p]))

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | VaccinationStatus>('all')
  const [resultFilter, setResultFilter] = useState<'all' | VaccinationResult>('all')
  const [vaccineFilter, setVaccineFilter] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return records.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      if (resultFilter !== 'all' && r.result !== resultFilter) return false
      if (vaccineFilter !== 'all' && r.vaccine_id !== vaccineFilter) return false
      const date = r.actual_date || r.scheduled_date
      if (from && date < from) return false
      if (to && date > to) return false
      if (q) {
        const c = chickMap.get(r.chicken_id)
        const v = vacMap.get(r.vaccine_id)
        const hay = `${c?.chicken_code ?? ''} ${c?.name ?? ''} ${v?.code ?? ''} ${v?.name_vi ?? ''} ${r.vaccine_lot_number ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [records, search, statusFilter, resultFilter, vaccineFilter, from, to, chickMap, vacMap])

  const totalCost = filtered.reduce((s, r) => s + Number(r.cost || 0), 0)

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-2">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Tìm gà / lô" className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-900" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | VaccinationStatus)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-900">
            <option value="all">Tất cả trạng thái</option>
            {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
          </select>
          <select value={resultFilter} onChange={(e) => setResultFilter(e.target.value as 'all' | VaccinationResult)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-900">
            <option value="all">Tất cả kết quả</option>
            {Object.entries(RESULT_META).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
          </select>
          <select value={vaccineFilter} onChange={(e) => setVaccineFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-900">
            <option value="all">Tất cả vaccine</option>
            {vaccines.map((v) => <option key={v.id} value={v.id}>{v.emoji} {v.name_vi}</option>)}
          </select>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-900" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-900" />
        </div>
        <div className="flex justify-between text-xs text-gray-600">
          <span>{filtered.length} bản ghi · Tổng chi phí: <b className="text-amber-700">{fmtVnd(totalCost)}đ</b></span>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900/40 text-[11px] uppercase text-gray-500">
            <tr>
              <th className="text-left p-2">Ngày</th>
              <th className="text-left p-2">Gà</th>
              <th className="text-left p-2">Vaccine</th>
              <th className="text-left p-2">Trạng thái</th>
              <th className="text-left p-2">Kết quả</th>
              <th className="text-left p-2">Lô</th>
              <th className="text-left p-2">Người tiêm</th>
              <th className="text-right p-2">Chi phí</th>
              <th className="text-left p-2">Phản ứng</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-12 text-gray-400 text-xs">Không có bản ghi nào</td></tr>
            ) : filtered.map((r) => {
              const c = chickMap.get(r.chicken_id)
              const v = vacMap.get(r.vaccine_id)
              const stat = STATUS_META[r.status]
              const res = r.result ? RESULT_META[r.result] : null
              const prof = r.performed_by ? profMap.get(r.performed_by) : null
              return (
                <tr key={r.id} className="border-t border-gray-100 dark:border-gray-700 hover:bg-emerald-50/30">
                  <td className="p-2 whitespace-nowrap text-xs">{(r.actual_date || r.scheduled_date).split('-').reverse().join('/')}</td>
                  <td className="p-2">
                    <Link href={`/admin/ho-so-ga/${r.chicken_id}`} className="font-mono text-xs text-blue-600 hover:underline">{c?.chicken_code}</Link>
                    {c?.name && <div className="text-xs text-gray-500">{c.name}</div>}
                  </td>
                  <td className="p-2 text-xs">
                    <span style={{ color: v?.color_hex || undefined }}>{v?.emoji}</span> {v?.name_vi}
                  </td>
                  <td className="p-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${stat.cls}`}>{stat.emoji} {stat.label}</span>
                  </td>
                  <td className="p-2">
                    {res && <span className={`text-[10px] px-1.5 py-0.5 rounded ${res.cls}`}>{res.emoji} {res.label}</span>}
                  </td>
                  <td className="p-2 font-mono text-xs">{r.vaccine_lot_number || '—'}</td>
                  <td className="p-2 text-xs">{prof?.full_name || '—'}</td>
                  <td className="p-2 text-right font-mono text-xs">{r.cost > 0 ? fmtVnd(r.cost) : '—'}</td>
                  <td className="p-2 text-xs text-orange-600">{r.side_effects ? r.side_effects.slice(0, 50) : ''}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
