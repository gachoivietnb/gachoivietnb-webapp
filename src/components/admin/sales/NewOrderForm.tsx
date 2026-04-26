'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { formatVnd } from '@/lib/utils/format'
import { removeDiacritics } from '@/lib/utils/slugify'

type Chicken = {
  id: string
  chicken_code: string
  name: string | null
  breed_name: string | null
  listed_price: number | null
  age_months: number | null
}
type Customer = { id: string; name: string; phone: string | null }

type SelectedItem = { unit_price: number }

const QUICK_DISCOUNTS = [0, 5, 10, 15, 20]

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

function getInitials(s: string | null | undefined, fallback: string): string {
  const v = s || fallback
  if (!v) return '?'
  const parts = v.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function NewOrderForm({
  chickens,
  customers,
}: {
  chickens: Chicken[]
  customers: Customer[]
}) {
  const router = useRouter()
  const [customerMode, setCustomerMode] = useState<'existing' | 'new'>(
    customers.length > 0 ? 'existing' : 'new'
  )
  const [customerId, setCustomerId] = useState('')
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' })
  const [selected, setSelected] = useState<Record<string, SelectedItem>>({})
  const [status, setStatus] = useState<'hoi_mua' | 'dat_coc'>('hoi_mua')
  const [depositAmount, setDepositAmount] = useState(0)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [filterBreed, setFilterBreed] = useState('')

  const qNorm = removeDiacritics(q.trim())

  const breeds = useMemo(() => {
    const set = new Set<string>()
    for (const c of chickens) if (c.breed_name) set.add(c.breed_name)
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'))
  }, [chickens])

  const filteredChickens = useMemo(() => {
    return chickens.filter((c) => {
      if (filterBreed && c.breed_name !== filterBreed) return false
      if (qNorm) {
        const hay = removeDiacritics(`${c.chicken_code} ${c.name ?? ''} ${c.breed_name ?? ''}`)
        if (!hay.includes(qNorm)) return false
      }
      return true
    })
  }, [chickens, qNorm, filterBreed])

  const selectedList = useMemo(() => {
    const out: Array<Chicken & { unit_price: number }> = []
    for (const [id, item] of Object.entries(selected)) {
      const c = chickens.find((x) => x.id === id)
      if (c) out.push({ ...c, unit_price: item.unit_price })
    }
    return out
  }, [selected, chickens])

  const total = selectedList.reduce((s, x) => s + x.unit_price, 0)
  const totalListed = selectedList.reduce((s, x) => s + (x.listed_price ?? 0), 0)
  const discount = totalListed > 0 ? totalListed - total : 0
  const discountPct = totalListed > 0 ? (discount / totalListed) * 100 : 0
  const remaining = Math.max(0, total - depositAmount)

  const breedBreakdown = useMemo(() => {
    const m = new Map<string, { count: number; sum: number }>()
    for (const x of selectedList) {
      const key = x.breed_name ?? '— Khác —'
      const cur = m.get(key) ?? { count: 0, sum: 0 }
      cur.count += 1
      cur.sum += x.unit_price
      m.set(key, cur)
    }
    return Array.from(m.entries()).sort((a, b) => b[1].sum - a[1].sum)
  }, [selectedList])

  function toggle(id: string, defaultPrice: number) {
    setSelected((prev) => {
      const next = { ...prev }
      if (id in next) delete next[id]
      else next[id] = { unit_price: defaultPrice }
      return next
    })
  }

  function setItemPrice(id: string, price: number) {
    setSelected((prev) => ({ ...prev, [id]: { unit_price: price } }))
  }

  function applyDiscountToSelected(pct: number) {
    if (selectedList.length === 0) {
      setErr('Chọn gà trước rồi áp giảm giá')
      return
    }
    setErr(null)
    setSelected((prev) => {
      const next: Record<string, SelectedItem> = {}
      for (const x of selectedList) {
        const base = x.listed_price ?? x.unit_price
        const newPrice = Math.round((base * (1 - pct / 100)) / 1000) * 1000
        next[x.id] = { unit_price: newPrice }
      }
      return next
    })
  }

  function resetToListedPrices() {
    setSelected((prev) => {
      const next: Record<string, SelectedItem> = {}
      for (const x of selectedList) {
        next[x.id] = { unit_price: x.listed_price ?? 0 }
      }
      return next
    })
  }

  function clearAllSelected() {
    setSelected({})
  }

  async function submit() {
    if (selectedList.length === 0) return setErr('Chọn ít nhất 1 con gà')
    if (selectedList.some((x) => x.unit_price <= 0))
      return setErr('Có dòng giá ≤ 0 — chỉnh lại trước khi tạo')
    if (customerMode === 'existing' && !customerId)
      return setErr('Chọn khách (hoặc chuyển sang tạo mới)')
    if (customerMode === 'new' && !newCustomer.name.trim())
      return setErr('Nhập tên khách hàng mới')
    if (status === 'dat_coc' && depositAmount <= 0)
      return setErr('Đặt cọc phải có số tiền > 0')

    setLoading(true)
    setErr(null)

    const res = await fetch('/api/sales-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: customerMode === 'existing' ? customerId : undefined,
        customer_name: customerMode === 'new' ? newCustomer.name.trim() : undefined,
        customer_phone:
          customerMode === 'new' ? newCustomer.phone.trim() || undefined : undefined,
        items: selectedList.map((x) => ({ chicken_id: x.id, unit_price: x.unit_price })),
        status,
        deposit_amount: depositAmount,
        notes: notes || undefined,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      setErr(typeof json.error === 'string' ? json.error : JSON.stringify(json.error))
      setLoading(false)
      return
    }
    router.push(`/admin/ban-ra/${json.data.id}`)
    router.refresh()
  }

  const selectedCustomer = customers.find((c) => c.id === customerId)
  const ready =
    selectedList.length > 0 &&
    selectedList.every((x) => x.unit_price > 0) &&
    ((customerMode === 'existing' && !!customerId) ||
      (customerMode === 'new' && newCustomer.name.trim().length > 0)) &&
    (status === 'hoi_mua' || depositAmount > 0)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
      <div className="space-y-4">
        <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <div className="p-4 md:p-5 space-y-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              👤 Khách hàng
            </h2>

            <div className="flex bg-gray-100 dark:bg-gray-900/40 rounded-lg p-1 w-full md:w-fit">
              <button
                type="button"
                onClick={() => {
                  setCustomerMode('existing')
                  setNewCustomer({ name: '', phone: '' })
                }}
                className={
                  'flex-1 md:flex-none px-4 py-1.5 rounded-md text-sm font-semibold transition ' +
                  (customerMode === 'existing'
                    ? 'bg-white dark:bg-gray-800 text-emerald-700 dark:text-emerald-300 shadow'
                    : 'text-gray-600 dark:text-gray-400')
                }
              >
                📋 Khách có sẵn ({customers.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomerMode('new')
                  setCustomerId('')
                }}
                className={
                  'flex-1 md:flex-none px-4 py-1.5 rounded-md text-sm font-semibold transition ' +
                  (customerMode === 'new'
                    ? 'bg-white dark:bg-gray-800 text-emerald-700 dark:text-emerald-300 shadow'
                    : 'text-gray-600 dark:text-gray-400')
                }
              >
                ＋ Khách mới
              </button>
            </div>

            {customerMode === 'existing' ? (
              <Field label="Khách hàng" required>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">— Chọn khách —</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.phone ? ` · ${c.phone}` : ''}
                    </option>
                  ))}
                </select>
              </Field>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Tên khách" required>
                  <input
                    value={newCustomer.name}
                    onChange={(e) =>
                      setNewCustomer({ ...newCustomer, name: e.target.value })
                    }
                    placeholder="VD: Anh Hùng"
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="Điện thoại" hint="Tuỳ chọn nhưng nên có để liên hệ">
                  <input
                    value={newCustomer.phone}
                    onChange={(e) =>
                      setNewCustomer({ ...newCustomer, phone: e.target.value })
                    }
                    placeholder="VD: 0912xxxxxx"
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm font-mono"
                  />
                </Field>
              </div>
            )}
          </div>
        </section>

        <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500" />
          <div className="p-4 md:p-5 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                🐓 Chọn gà bán
                <span
                  className={
                    'text-[11px] px-2 py-0.5 rounded-full border ' +
                    (selectedList.length > 0
                      ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900'
                      : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-700')
                  }
                >
                  {selectedList.length} đã chọn
                </span>
              </h2>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Click dòng để chọn / bỏ chọn
              </div>
            </div>

            {selectedList.length > 0 && (
              <div className="bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-3 space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {selectedList.map((c) => {
                    const listed = c.listed_price ?? 0
                    const diff = c.unit_price - listed
                    return (
                      <div
                        key={c.id}
                        className="bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-800 rounded-lg px-2 py-1 flex items-center gap-1.5 text-xs shadow-sm"
                      >
                        <div
                          className={`w-5 h-5 rounded bg-gradient-to-br ${avatarColor(
                            c.id
                          )} text-white text-[9px] font-bold flex items-center justify-center`}
                        >
                          {getInitials(c.name, c.chicken_code)}
                        </div>
                        <span className="font-mono font-bold">{c.chicken_code}</span>
                        <input
                          type="number"
                          min={0}
                          step={10000}
                          value={c.unit_price}
                          onChange={(e) =>
                            setItemPrice(c.id, parseFloat(e.target.value) || 0)
                          }
                          className="w-24 border border-gray-200 dark:border-gray-700 dark:bg-gray-900 rounded px-1.5 py-0.5 text-xs tabular-nums"
                        />
                        {listed > 0 && diff !== 0 && (
                          <span
                            className={
                              'text-[10px] tabular-nums ' +
                              (diff < 0
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-emerald-600 dark:text-emerald-400')
                            }
                            title={`Listed: ${listed.toLocaleString('vi-VN')}đ`}
                          >
                            {diff > 0 ? '+' : ''}
                            {Math.round((diff / listed) * 100)}%
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => toggle(c.id, 0)}
                          className="text-rose-500 hover:text-rose-700"
                          title="Bỏ chọn"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )
                  })}
                </div>

                <div className="flex flex-wrap gap-1.5 items-center pt-1 border-t border-blue-200/60 dark:border-blue-900/60">
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">
                    Áp nhanh giảm giá:
                  </span>
                  {QUICK_DISCOUNTS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => applyDiscountToSelected(d)}
                      className={
                        'px-2 py-1 text-[11px] rounded border transition ' +
                        (d === 0
                          ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:border-blue-400')
                      }
                    >
                      {d === 0 ? '↺ Giá niêm yết' : `−${d}%`}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={resetToListedPrices}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline px-2"
                  >
                    Reset tất cả về listed
                  </button>
                  <button
                    type="button"
                    onClick={clearAllSelected}
                    className="ml-auto text-[11px] text-rose-600 dark:text-rose-400 hover:underline px-2"
                  >
                    Bỏ chọn tất cả
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-col md:flex-row gap-2">
              <div className="relative flex-1 min-w-0">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  🔍
                </span>
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Tìm theo mã / tên / giống…"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={filterBreed}
                onChange={(e) => setFilterBreed(e.target.value)}
                className="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2"
              >
                <option value="">Tất cả giống ({chickens.length})</option>
                {breeds.map((b) => (
                  <option key={b} value={b}>
                    {b} ({chickens.filter((c) => c.breed_name === b).length})
                  </option>
                ))}
              </select>
              <span className="text-xs text-gray-500 dark:text-gray-400 self-center whitespace-nowrap">
                {filteredChickens.length}/{chickens.length}
              </span>
            </div>

            {filteredChickens.length === 0 ? (
              <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center">
                <div className="text-3xl mb-1">🐓</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {chickens.length === 0
                    ? 'Chưa có gà nào sẵn sàng để bán'
                    : 'Không khớp bộ lọc'}
                </div>
              </div>
            ) : (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <div className="max-h-80 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
                      <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        <th className="px-2 py-2 w-8"></th>
                        <th className="px-2 py-2">Mã / Tên</th>
                        <th className="px-2 py-2">Giống</th>
                        <th className="px-2 py-2">Tuổi</th>
                        <th className="px-2 py-2 text-right">Giá niêm yết</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredChickens.map((c) => {
                        const checked = c.id in selected
                        return (
                          <tr
                            key={c.id}
                            onClick={() => toggle(c.id, c.listed_price ?? 0)}
                            className={
                              'border-t border-gray-100 dark:border-gray-700 cursor-pointer transition ' +
                              (checked
                                ? 'bg-blue-100/60 dark:bg-blue-950/30'
                                : 'hover:bg-blue-50/40 dark:hover:bg-blue-950/15')
                            }
                          >
                            <td className="px-2 py-1.5">
                              <input type="checkbox" checked={checked} readOnly className="w-3.5 h-3.5" />
                            </td>
                            <td className="px-2 py-1.5">
                              <div className="flex items-center gap-1.5">
                                <div
                                  className={`w-6 h-6 rounded bg-gradient-to-br ${avatarColor(
                                    c.id
                                  )} text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0`}
                                >
                                  {getInitials(c.name, c.chicken_code)}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-mono font-bold text-gray-900 dark:text-gray-100">
                                    {c.chicken_code}
                                  </div>
                                  {c.name && (
                                    <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                                      {c.name}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-2 py-1.5 text-gray-600 dark:text-gray-400">
                              {c.breed_name ?? '—'}
                            </td>
                            <td className="px-2 py-1.5 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                              {c.age_months != null ? `${c.age_months}t` : '—'}
                            </td>
                            <td className="px-2 py-1.5 text-right tabular-nums text-emerald-700 dark:text-emerald-300 font-medium">
                              {c.listed_price ? formatVnd(c.listed_price) : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-violet-500 to-purple-500" />
          <div className="p-4 md:p-5 space-y-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              💼 Trạng thái & Thanh toán
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {(
                [
                  {
                    v: 'hoi_mua' as const,
                    title: '💬 Hỏi mua',
                    desc: 'Khách hỏi giá · Chưa giữ chỗ · Con vẫn có thể bán cho người khác',
                    bar: 'from-blue-400 to-cyan-500',
                    cls: 'border-blue-400 bg-blue-50 dark:bg-blue-950/30',
                  },
                  {
                    v: 'dat_coc' as const,
                    title: '🔒 Đặt cọc',
                    desc: 'Khách cọc tiền · Lock con cho khách · Phải chốt hoặc huỷ trong N ngày',
                    bar: 'from-amber-400 to-orange-500',
                    cls: 'border-amber-400 bg-amber-50 dark:bg-amber-950/30',
                  },
                ]
              ).map((s) => {
                const active = status === s.v
                return (
                  <button
                    key={s.v}
                    type="button"
                    onClick={() => setStatus(s.v)}
                    className={
                      'rounded-xl border-2 overflow-hidden text-left transition ' +
                      (active ? s.cls + ' ring-2 ring-offset-1' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300')
                    }
                  >
                    <div className={`h-1 bg-gradient-to-r ${s.bar}`} />
                    <div className="p-3">
                      <div className="font-bold text-gray-900 dark:text-gray-100">{s.title}</div>
                      <div className="text-[11px] text-gray-600 dark:text-gray-300 mt-0.5 leading-snug">
                        {s.desc}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {status === 'dat_coc' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field
                  label="Số tiền đặt cọc *"
                  hint={
                    total > 0
                      ? `Gợi ý: 30% = ${formatVnd(Math.round((total * 0.3) / 1000) * 1000)}`
                      : 'Chọn gà trước để xem gợi ý'
                  }
                >
                  <input
                    type="number"
                    min={0}
                    step={10000}
                    value={depositAmount}
                    onChange={(e) =>
                      setDepositAmount(parseFloat(e.target.value) || 0)
                    }
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm tabular-nums"
                  />
                </Field>
                <div className="flex flex-wrap gap-1.5 items-end pb-1">
                  {[10, 20, 30, 50, 100].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() =>
                        setDepositAmount(Math.round((total * p) / 100 / 1000) * 1000)
                      }
                      disabled={total === 0}
                      className="px-2 py-1 text-[11px] rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-amber-400 disabled:opacity-50"
                    >
                      {p}%
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Field label="Ghi chú" hint="Tuỳ chọn — VD: hẹn 3N giao, miễn phí ship nội thành">
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="VD: hẹn giao thứ 7, giao kèm thẻ chứng nhận giống…"
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
              />
            </Field>
          </div>
        </section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-4 self-start">
        <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-blue-500 to-violet-500" />
          <div className="p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
              📋 Tóm tắt đơn hàng
            </h3>

            <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
              <Kv
                k="👤 Khách"
                v={
                  customerMode === 'existing'
                    ? selectedCustomer
                      ? `${selectedCustomer.name}${selectedCustomer.phone ? ' · ' + selectedCustomer.phone : ''}`
                      : '— Chưa chọn —'
                    : newCustomer.name || '— Chưa nhập —'
                }
              />
              <Kv
                k="📋 Trạng thái"
                v={
                  status === 'hoi_mua' ? '💬 Hỏi mua' : '🔒 Đặt cọc'
                }
              />
              <Kv k="🐓 Số con" v={String(selectedList.length)} />
            </div>

            {breedBreakdown.length > 0 && (
              <div>
                <div className="text-[10.5px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                  Theo giống
                </div>
                <ul className="space-y-1 text-xs">
                  {breedBreakdown.map(([breed, v]) => (
                    <li
                      key={breed}
                      className="flex items-baseline justify-between gap-2 bg-gray-50 dark:bg-gray-900/40 px-2 py-1 rounded"
                    >
                      <span className="text-gray-700 dark:text-gray-300 truncate">
                        {breed}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400 tabular-nums">
                        {v.count} · {formatVnd(v.sum)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-1.5 border-t border-gray-100 dark:border-gray-700 pt-2 text-sm">
              {totalListed > 0 && (
                <Row k="Niêm yết" v={formatVnd(totalListed)} muted />
              )}
              {discount !== 0 && (
                <Row
                  k={`Giảm giá ${discountPct >= 0 ? `(${discountPct.toFixed(1)}%)` : `(↑${(-discountPct).toFixed(1)}%)`}`}
                  v={`${discount >= 0 ? '−' : '+'}${formatVnd(Math.abs(discount))}`}
                  tone={discount >= 0 ? 'rose' : 'emerald'}
                />
              )}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-lg p-3 border border-emerald-200 dark:border-emerald-900">
                <div className="text-[11px] text-emerald-700 dark:text-emerald-300 uppercase tracking-wider font-medium mb-1">
                  Tổng đơn
                </div>
                <div className="text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                  {formatVnd(total)}
                </div>
              </div>
              {status === 'dat_coc' && depositAmount > 0 && (
                <>
                  <Row
                    k="🔒 Đã cọc"
                    v={formatVnd(depositAmount)}
                    tone="amber"
                  />
                  <Row
                    k="💸 Còn lại"
                    v={formatVnd(remaining)}
                    tone="violet"
                  />
                </>
              )}
            </div>

            {err && (
              <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 rounded-lg p-2.5 text-xs">
                ✗ {err}
              </div>
            )}

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={submit}
                disabled={!ready || loading}
                className="bg-gradient-to-r from-emerald-500 via-blue-500 to-violet-500 text-white rounded-lg px-5 py-3 font-semibold shadow hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loading
                  ? '⏳ Đang tạo đơn…'
                  : `💵 Tạo đơn ${selectedList.length || 0} con · ${formatVnd(total)}`}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Huỷ
              </button>
            </div>

            <p className="text-[10.5px] text-gray-500 dark:text-gray-400 leading-relaxed">
              💡 Nếu chọn <strong>Đặt cọc</strong>, các con đã chọn sẽ bị lock — không bán cho
              khách khác cho tới khi chốt hoặc huỷ đơn.
            </p>
          </div>
        </section>
      </aside>
    </div>
  )
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </span>
      {children}
      {hint && (
        <p className="text-[10.5px] text-gray-500 dark:text-gray-400 mt-0.5">{hint}</p>
      )}
    </label>
  )
}

function Kv({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span>{k}</span>
      <span className="text-gray-700 dark:text-gray-300 font-medium truncate max-w-[180px]">
        {v}
      </span>
    </div>
  )
}

function Row({
  k,
  v,
  tone,
  muted,
}: {
  k: string
  v: string
  tone?: 'rose' | 'emerald' | 'amber' | 'violet'
  muted?: boolean
}) {
  const cls = muted
    ? 'text-gray-500 dark:text-gray-400'
    : tone === 'rose'
      ? 'text-rose-700 dark:text-rose-300'
      : tone === 'emerald'
        ? 'text-emerald-700 dark:text-emerald-300'
        : tone === 'amber'
          ? 'text-amber-700 dark:text-amber-300'
          : tone === 'violet'
            ? 'text-violet-700 dark:text-violet-300'
            : 'text-gray-900 dark:text-gray-100'
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-xs text-gray-500 dark:text-gray-400">{k}</span>
      <span className={'tabular-nums font-semibold ' + cls}>{v}</span>
    </div>
  )
}
