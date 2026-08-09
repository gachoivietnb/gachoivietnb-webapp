'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatVnd } from '@/lib/utils/format'
import { removeDiacritics } from '@/lib/utils/slugify'

type Row = {
  staff_id: string
  full_name: string
  role: string
  base_salary: string | number
  standard_days: number
  days_worked: string | number
  computed_base: string | number
  already_paid: boolean
  existing_payment_id: string | null
}

type EditState = {
  bonus: number
  deduction: number
  notes: string
}

type Confirm = {
  title: string
  message: string
  onConfirm: () => Promise<void> | void
  tone?: 'rose' | 'blue'
} | null

const QUICK_BONUS = [50_000, 100_000, 200_000, 500_000, 1_000_000]
const QUICK_DEDUCTION = [50_000, 100_000, 200_000, 500_000]

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

function getInitials(name: string): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function PayrollPanel() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [edits, setEdits] = useState<Record<string, EditState>>({})
  const [configOpen, setConfigOpen] = useState<Row | null>(null)
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
  const [q, setQ] = useState('')
  const [filterStatus, setFilterStatus] = useState<'' | 'paid' | 'pending'>('')
  const [confirm, setConfirm] = useState<Confirm>(null)
  const router = useRouter()

  async function load() {
    setLoading(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/staff/payroll?year=${year}&month=${month}`)
      const j = await res.json()
      setRows((j.data ?? []) as Row[])
      setEdits({})
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month])

  function edit(id: string, patch: Partial<EditState>) {
    setEdits((prev) => {
      const cur: EditState = prev[id] ?? { bonus: 0, deduction: 0, notes: '' }
      return { ...prev, [id]: { ...cur, ...patch } }
    })
  }

  async function doFinalize(r: Row, e: EditState): Promise<void> {
    setSavingId(r.staff_id)
    try {
      const res = await fetch('/api/staff/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: r.staff_id,
          period_year: year,
          period_month: month,
          base_salary: Number(r.base_salary),
          standard_days: r.standard_days,
          days_worked: Number(r.days_worked),
          bonus: Number(e.bonus) || 0,
          deduction: Number(e.deduction) || 0,
          notes: e.notes || null,
        }),
      })
      const j = await res.json()
      if (!res.ok) {
        setMsg({ tone: 'err', text: `Lỗi: ${j.error ?? 'không rõ'}` })
      } else {
        setMsg({
          tone: 'ok',
          text: `✓ Đã chốt lương ${formatVnd(j.net_paid)} cho ${r.full_name}`,
        })
        await load()
        router.refresh()
      }
    } finally {
      setSavingId(null)
    }
  }

  function askFinalize(r: Row) {
    const e = edits[r.staff_id] ?? { bonus: 0, deduction: 0, notes: '' }
    const net = Math.max(0, Number(r.computed_base) + (e.bonus || 0) - (e.deduction || 0))
    setConfirm({
      title: `Chốt lương cho ${r.full_name}?`,
      message: `Tháng ${month}/${year} · Thực lĩnh ${formatVnd(net)}. Sẽ tự ghi 1 khoản chi phí "Nhân công" vào báo cáo.`,
      tone: 'blue',
      onConfirm: () => doFinalize(r, e),
    })
  }

  async function doRemove(r: Row): Promise<void> {
    if (!r.existing_payment_id) return
    setSavingId(r.staff_id)
    try {
      const res = await fetch(`/api/staff/payroll?id=${r.existing_payment_id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setMsg({ tone: 'ok', text: '✓ Đã huỷ chốt lương' })
        await load()
        router.refresh()
      } else {
        setMsg({ tone: 'err', text: 'Không huỷ được' })
      }
    } finally {
      setSavingId(null)
    }
  }

  function askRemove(r: Row) {
    setConfirm({
      title: `Huỷ chốt lương ${r.full_name}?`,
      message: `Tháng ${month}/${year}. Khoản chi phí "Nhân công" tương ứng cũng sẽ bị xoá khỏi báo cáo.`,
      tone: 'rose',
      onConfirm: () => doRemove(r),
    })
  }

  const qNorm = removeDiacritics(q.trim())

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (qNorm && !removeDiacritics(r.full_name).includes(qNorm)) return false
      if (filterStatus === 'paid' && !r.already_paid) return false
      if (filterStatus === 'pending' && r.already_paid) return false
      return true
    })
  }, [rows, qNorm, filterStatus])

  const stats = useMemo(() => {
    let totalNet = 0,
      paidNet = 0,
      pendingNet = 0,
      totalBonus = 0,
      totalDeduction = 0,
      pendingCount = 0,
      paidCount = 0,
      missingSalary = 0
    for (const r of rows) {
      const e = edits[r.staff_id] ?? { bonus: 0, deduction: 0, notes: '' }
      const net = Math.max(0, Number(r.computed_base) + (e.bonus || 0) - (e.deduction || 0))
      totalNet += net
      if (r.already_paid) {
        paidNet += net
        paidCount += 1
      } else {
        pendingNet += net
        pendingCount += 1
        totalBonus += e.bonus || 0
        totalDeduction += e.deduction || 0
      }
      if (Number(r.base_salary) === 0) missingSalary += 1
    }
    return {
      totalNet,
      paidNet,
      pendingNet,
      totalBonus,
      totalDeduction,
      pendingCount,
      paidCount,
      missingSalary,
    }
  }, [rows, edits])

  const monthName = `Tháng ${month}/${year}`
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1

  function shiftMonth(delta: number) {
    let m = month + delta
    let y = year
    if (m < 1) {
      m = 12
      y -= 1
    } else if (m > 12) {
      m = 1
      y += 1
    }
    setMonth(m)
    setYear(y)
  }

  function jumpToCurrent() {
    setMonth(today.getMonth() + 1)
    setYear(today.getFullYear())
  }

  return (
    <div className="space-y-4">
      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500" />
        <div className="p-4 flex flex-col md:flex-row gap-3 items-start md:items-center">
          <div className="flex items-center gap-1">
            <button
              onClick={() => shiftMonth(-1)}
              className="p-1.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
              title="Tháng trước"
            >
              ◀
            </button>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-1.5 text-sm font-semibold"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  Tháng {m}
                </option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-1.5 text-sm font-semibold tabular-nums"
            >
              {[today.getFullYear() - 2, today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1].map(
                (y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                )
              )}
            </select>
            <button
              onClick={() => shiftMonth(1)}
              className="p-1.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
              title="Tháng sau"
            >
              ▶
            </button>
            {!isCurrentMonth && (
              <button
                onClick={jumpToCurrent}
                className="ml-1 text-[11px] px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-950/50 font-medium"
              >
                ↻ Tháng hiện tại
              </button>
            )}
          </div>

          <div className="flex-1 flex flex-col sm:flex-row gap-2 md:ml-auto w-full md:w-auto">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Tìm tên nhân viên…"
                className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {[
                { v: '' as const, label: '🌐 Tất cả', count: rows.length },
                { v: 'pending' as const, label: '⏳ Chưa chốt', count: stats.pendingCount },
                { v: 'paid' as const, label: '✓ Đã chốt', count: stats.paidCount },
              ].map((s) => {
                const active = filterStatus === s.v
                return (
                  <button
                    key={s.v || 'all'}
                    onClick={() => setFilterStatus(s.v)}
                    className={
                      'px-3 py-1.5 rounded-full text-xs font-medium border transition ' +
                      (active
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-transparent shadow'
                        : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-400')
                    }
                  >
                    {s.label} <span className="opacity-70">({s.count})</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Kpi
          label={`Tổng kỳ ${monthName}`}
          value={formatVnd(stats.totalNet)}
          icon="💰"
          tone="from-blue-500 to-indigo-500"
          small
        />
        <Kpi
          label="Đã chốt"
          value={formatVnd(stats.paidNet)}
          icon="✓"
          tone="from-emerald-500 to-teal-500"
          small
          sub={`${stats.paidCount} người`}
        />
        <Kpi
          label="Chờ chốt"
          value={formatVnd(stats.pendingNet)}
          icon="⏳"
          tone="from-amber-500 to-orange-500"
          small
          sub={`${stats.pendingCount} người`}
          pulse={stats.pendingCount > 0}
        />
        <Kpi
          label="Tổng thưởng (chờ)"
          value={formatVnd(stats.totalBonus)}
          icon="🎁"
          tone="from-violet-500 to-purple-500"
          small
        />
        <Kpi
          label="Tổng phạt (chờ)"
          value={formatVnd(stats.totalDeduction)}
          icon="⚠️"
          tone="from-rose-500 to-red-500"
          small
        />
      </div>

      {stats.missingSalary > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-3 text-sm text-amber-800 dark:text-amber-300 flex items-start gap-2">
          <span>⚠️</span>
          <div>
            Có <strong>{stats.missingSalary}</strong> nhân viên chưa khai báo lương cơ bản — không
            chốt được lương cho tới khi điền. Click <strong>📝 Khai báo</strong> ở mỗi card.
          </div>
        </div>
      )}

      {msg && (
        <div
          className={
            'rounded-lg p-3 text-sm border ' +
            (msg.tone === 'ok'
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300')
          }
        >
          {msg.text}
        </div>
      )}

      {loading ? (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 md:p-12 text-center text-gray-500 dark:text-gray-400">
          ⏳ Đang tải dữ liệu chấm công…
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-10 text-center">
          <div className="text-5xl mb-2">👥</div>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {rows.length === 0
              ? 'Chưa có nhân viên hoạt động'
              : 'Không khớp bộ lọc — bỏ filter hoặc đổi từ khoá'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filteredRows.map((r) => {
            const e = edits[r.staff_id] ?? { bonus: 0, deduction: 0, notes: '' }
            const computedBase = Number(r.computed_base)
            const net = Math.max(0, computedBase + (e.bonus || 0) - (e.deduction || 0))
            const daysPct = r.standard_days > 0 ? (Number(r.days_worked) / r.standard_days) * 100 : 0
            const daysCapped = Math.min(100, daysPct)
            const noSalary = Number(r.base_salary) === 0
            const overDeducted = computedBase + (e.bonus || 0) - (e.deduction || 0) < 0
            return (
              <article
                key={r.staff_id}
                className={
                  'bg-white dark:bg-gray-800 border rounded-xl overflow-hidden transition ' +
                  (r.already_paid
                    ? 'border-emerald-300 dark:border-emerald-800'
                    : noSalary
                      ? 'border-amber-300 dark:border-amber-800'
                      : 'border-gray-200 dark:border-gray-700')
                }
              >
                <div
                  className={
                    'h-1.5 bg-gradient-to-r ' +
                    (r.already_paid
                      ? 'from-emerald-400 to-teal-500'
                      : noSalary
                        ? 'from-amber-400 to-orange-500'
                        : 'from-blue-400 to-indigo-500')
                  }
                />
                <div className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br ${avatarColor(
                        r.staff_id
                      )} text-white text-base font-extrabold flex items-center justify-center shadow`}
                    >
                      {getInitials(r.full_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {r.full_name}
                        </h3>
                        <span
                          className={
                            'text-[10.5px] px-1.5 py-0.5 rounded-full ' +
                            (r.role === 'chu_trai'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300')
                          }
                        >
                          {r.role === 'chu_trai' ? '👑 Chủ trại' : '👷 Nhân viên'}
                        </span>
                        {r.already_paid && (
                          <span className="text-[10.5px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 font-semibold">
                            ✓ Đã chốt
                          </span>
                        )}
                        {!r.already_paid && noSalary && (
                          <span className="text-[10.5px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-900 font-semibold">
                            ⚠️ Chưa khai lương
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Lương cơ bản{' '}
                        <strong className="text-gray-700 dark:text-gray-300">
                          {Number(r.base_salary) > 0 ? formatVnd(Number(r.base_salary)) : '— chưa đặt'}
                        </strong>
                        {r.standard_days > 0 && (
                          <span> · chuẩn {r.standard_days} ngày</span>
                        )}
                        <button
                          onClick={() => setConfigOpen(r)}
                          className="ml-1.5 text-blue-600 dark:text-blue-400 hover:underline font-medium"
                        >
                          {Number(r.base_salary) > 0 ? '✎ Sửa' : '📝 Khai báo'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-gray-500 dark:text-gray-400">⏱ Ngày công tháng</span>
                      <span className="tabular-nums font-semibold">
                        {Number(r.days_worked).toFixed(1)}/{r.standard_days} ngày ·{' '}
                        <strong
                          className={
                            daysPct >= 100
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : daysPct >= 80
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-amber-600 dark:text-amber-400'
                          }
                        >
                          {daysPct.toFixed(0)}%
                        </strong>
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-900/60 overflow-hidden">
                      <div
                        className={
                          'h-full bg-gradient-to-r ' +
                          (daysPct >= 100
                            ? 'from-emerald-400 to-teal-500'
                            : daysPct >= 80
                              ? 'from-blue-400 to-indigo-500'
                              : 'from-amber-400 to-orange-500')
                        }
                        style={{ width: `${daysCapped}%` }}
                      />
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-2.5">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-gray-500 dark:text-gray-400">
                        💼 Lương theo công
                      </span>
                      <span className="font-bold tabular-nums text-gray-900 dark:text-gray-100">
                        {formatVnd(computedBase)}
                      </span>
                    </div>
                  </div>

                  {!r.already_paid && (
                    <>
                      <div>
                        <div className="flex items-baseline justify-between mb-1">
                          <label className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                            🎁 Thưởng (+)
                          </label>
                          <span className="text-[10.5px] tabular-nums text-emerald-700 dark:text-emerald-300">
                            {(e.bonus || 0) > 0 ? `+${formatVnd(e.bonus)}` : '—'}
                          </span>
                        </div>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={e.bonus || ''}
                          onChange={(ev) =>
                            edit(r.staff_id, { bonus: Number(ev.target.value) || 0 })
                          }
                          placeholder="0"
                          className="w-full border border-emerald-300 dark:border-emerald-800 dark:bg-gray-900 rounded-lg px-3 py-1.5 text-sm tabular-nums"
                        />
                        <div className="flex flex-wrap gap-1 mt-1">
                          {QUICK_BONUS.map((b) => (
                            <button
                              key={b}
                              onClick={() => edit(r.staff_id, { bonus: b })}
                              className="text-[10.5px] px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-900 bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 tabular-nums"
                            >
                              +{(b / 1000).toLocaleString('vi-VN')}k
                            </button>
                          ))}
                          {(e.bonus || 0) > 0 && (
                            <button
                              onClick={() => edit(r.staff_id, { bonus: 0 })}
                              className="text-[10.5px] text-rose-600 dark:text-rose-400 hover:underline px-1"
                            >
                              ✕ Xoá
                            </button>
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-baseline justify-between mb-1">
                          <label className="text-[11px] font-medium text-rose-700 dark:text-rose-300">
                            ⚠️ Trừ (−)
                          </label>
                          <span className="text-[10.5px] tabular-nums text-rose-700 dark:text-rose-300">
                            {(e.deduction || 0) > 0 ? `−${formatVnd(e.deduction)}` : '—'}
                          </span>
                        </div>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={e.deduction || ''}
                          onChange={(ev) =>
                            edit(r.staff_id, { deduction: Number(ev.target.value) || 0 })
                          }
                          placeholder="0"
                          className="w-full border border-rose-300 dark:border-rose-800 dark:bg-gray-900 rounded-lg px-3 py-1.5 text-sm tabular-nums"
                        />
                        <div className="flex flex-wrap gap-1 mt-1">
                          {QUICK_DEDUCTION.map((d) => (
                            <button
                              key={d}
                              onClick={() => edit(r.staff_id, { deduction: d })}
                              className="text-[10.5px] px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-900 bg-rose-50/60 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/40 tabular-nums"
                            >
                              −{(d / 1000).toLocaleString('vi-VN')}k
                            </button>
                          ))}
                          {(e.deduction || 0) > 0 && (
                            <button
                              onClick={() => edit(r.staff_id, { deduction: 0 })}
                              className="text-[10.5px] text-rose-600 dark:text-rose-400 hover:underline px-1"
                            >
                              ✕ Xoá
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  <div
                    className={
                      'rounded-lg p-3 border ' +
                      (r.already_paid
                        ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900'
                        : 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-900')
                    }
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        💵 Thực lĩnh
                      </span>
                      <span
                        className={
                          'text-2xl font-bold tabular-nums ' +
                          (r.already_paid
                            ? 'text-emerald-700 dark:text-emerald-300'
                            : 'text-blue-700 dark:text-blue-300')
                        }
                      >
                        {formatVnd(net)}
                      </span>
                    </div>
                    {overDeducted && !r.already_paid && (
                      <div className="text-[10.5px] text-rose-600 dark:text-rose-400 mt-1">
                        ⚠️ Phạt vượt lương — net = 0
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end">
                    {r.already_paid ? (
                      <button
                        onClick={() => askRemove(r)}
                        disabled={savingId === r.staff_id}
                        className="text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg px-3 py-1.5 font-semibold disabled:opacity-50"
                      >
                        ↺ Huỷ chốt
                      </button>
                    ) : (
                      <button
                        onClick={() => askFinalize(r)}
                        disabled={savingId === r.staff_id || noSalary}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-semibold shadow hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        {savingId === r.staff_id ? '⏳ Đang chốt…' : '🔒 Chốt lương'}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl p-3 text-xs text-blue-800 dark:text-blue-200 flex items-start gap-2">
        <span>💡</span>
        <div>
          Khi chốt lương, hệ thống <strong>tự tạo</strong> 1 khoản chi phí "Nhân công" trong tháng
          tương ứng → hiển thị ngay trong Báo cáo P&amp;L, Chi phí 8 hạng mục, Xu hướng 6 tháng.
          Huỷ chốt sẽ xoá luôn khoản chi phí đó.
        </div>
      </div>

      {configOpen && (
        <SalaryConfigModal
          staff={configOpen}
          onClose={() => setConfigOpen(null)}
          onSaved={() => {
            setConfigOpen(null)
            load()
          }}
        />
      )}

      {confirm && (
        <ConfirmModal
          title={confirm.title}
          message={confirm.message}
          tone={confirm.tone}
          loading={!!savingId}
          onConfirm={async () => {
            await confirm.onConfirm()
            setConfirm(null)
          }}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  )
}

function ConfirmModal({
  title,
  message,
  tone = 'blue',
  loading,
  onConfirm,
  onClose,
}: {
  title: string
  message: string
  tone?: 'rose' | 'blue'
  loading: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div
          className={
            'h-1.5 bg-gradient-to-r ' +
            (tone === 'rose' ? 'from-rose-500 to-red-500' : 'from-blue-500 to-indigo-500')
          }
        />
        <div className="p-6">
          <div className="flex items-start gap-3 mb-4">
            <div
              className={
                'w-10 h-10 rounded-full flex items-center justify-center text-xl ' +
                (tone === 'rose'
                  ? 'bg-rose-100 dark:bg-rose-900/40'
                  : 'bg-blue-100 dark:bg-blue-900/40')
              }
            >
              {tone === 'rose' ? '⚠️' : '💼'}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{message}</p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50"
            >
              Huỷ
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={
                'px-5 py-2 text-sm font-bold text-white rounded-lg shadow hover:shadow-md disabled:opacity-50 transition bg-gradient-to-r ' +
                (tone === 'rose'
                  ? 'from-rose-500 to-red-600'
                  : 'from-blue-600 to-indigo-600')
              }
            >
              {loading ? 'Đang xử lý…' : 'Xác nhận'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SalaryConfigModal({
  staff,
  onClose,
  onSaved,
}: {
  staff: Row
  onClose: () => void
  onSaved: () => void
}) {
  const [base, setBase] = useState(Number(staff.base_salary) || 0)
  const [std, setStd] = useState(staff.standard_days || 26)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const perDay = std > 0 ? base / std : 0

  async function save() {
    if (base < 0) {
      setErr('Lương không được âm')
      return
    }
    if (std < 1 || std > 31) {
      setErr('Số ngày chuẩn phải trong 1-31')
      return
    }
    setSaving(true)
    setErr(null)
    try {
      const res = await fetch('/api/staff/salary-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: staff.staff_id,
          base_salary_monthly: base,
          standard_work_days: std,
        }),
      })
      const j = await res.json()
      if (!res.ok) {
        setErr(j.error ?? 'Lỗi lưu')
        return
      }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
      >
        <div className="h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500" />
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br ${avatarColor(
                staff.staff_id
              )} text-white text-base font-extrabold flex items-center justify-center shadow`}
            >
              {getInitials(staff.full_name)}
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                Khai báo lương
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {staff.full_name}
              </p>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-3 text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            Công thức:{' '}
            <code className="bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded font-mono text-[11px]">
              base × (ngày công ÷ ngày chuẩn)
            </code>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
              Lương cơ bản tháng (VND)
            </label>
            <input
              type="number"
              min={0}
              step={1}
              value={base}
              onChange={(e) => setBase(Number(e.target.value) || 0)}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-base font-semibold tabular-nums"
              placeholder="VD: 7000000"
            />
            <div className="flex flex-wrap gap-1 mt-1">
              {[3_000_000, 5_000_000, 7_000_000, 10_000_000, 15_000_000].map((p) => (
                <button
                  key={p}
                  onClick={() => setBase(p)}
                  className="text-[11px] px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:border-blue-400 tabular-nums"
                >
                  {(p / 1_000_000).toLocaleString('vi-VN')}M
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
              Số ngày công chuẩn / tháng
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[22, 24, 26, 28, 30].map((n) => {
                const active = std === n
                return (
                  <button
                    key={n}
                    onClick={() => setStd(n)}
                    className={
                      'px-3 py-1.5 rounded-full text-xs font-semibold border transition ' +
                      (active
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-transparent shadow'
                        : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-400')
                    }
                  >
                    {n} ngày
                  </button>
                )
              })}
              <input
                type="number"
                min={1}
                max={31}
                value={std}
                onChange={(e) => setStd(Number(e.target.value) || 26)}
                className="w-20 border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-full px-3 py-1.5 text-xs tabular-nums"
              />
            </div>
          </div>

          {base > 0 && std > 0 && (
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-3">
              <div className="text-[11px] uppercase tracking-wider text-blue-700 dark:text-blue-300 font-semibold mb-1">
                Lương 1 ngày công
              </div>
              <div className="text-xl font-bold tabular-nums text-blue-700 dark:text-blue-300">
                {formatVnd(Math.round(perDay))}
              </div>
            </div>
          )}

          {err && (
            <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 rounded-lg px-3 py-2 text-sm">
              ✗ {err}
            </div>
          )}

          <div className="flex gap-2 justify-end pt-2 border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={onClose}
              disabled={saving}
              className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg px-4 py-2 text-sm"
            >
              Huỷ
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-5 py-2 text-sm font-semibold shadow hover:shadow-lg disabled:opacity-50 transition"
            >
              {saving ? '⏳ Đang lưu…' : '💾 Lưu cấu hình'}
            </button>
          </div>
        </div>
      </div>
    </div>
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
