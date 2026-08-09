'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
import { formatVnd } from '@/lib/utils/format'

type Breed = { id: string; code: string; name_vi: string; tier?: string | null }
type Supplier = { id: string; name: string; phone?: string | null }

type Row = {
  id: string
  breed_id: string
  gender: 'trong' | 'mai' | 'chua_xac_dinh'
  unit_price: string
  weight_kg: string
}

const newRow = (breedId: string): Row => ({
  id: Math.random().toString(36).slice(2),
  breed_id: breedId,
  gender: 'trong',
  unit_price: '',
  weight_kg: '',
})

const GENDER_META: Record<
  Row['gender'],
  { label: string; emoji: string; cls: string }
> = {
  trong: {
    label: 'Trống',
    emoji: '🐓',
    cls: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  },
  mai: {
    label: 'Mái',
    emoji: '🐔',
    cls: 'bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300',
  },
  chua_xac_dinh: {
    label: '? Chưa rõ',
    emoji: '❓',
    cls: 'bg-gray-100 text-gray-600 dark:bg-gray-900/60 dark:text-gray-400',
  },
}

const QUICK_PRICES = [500_000, 1_000_000, 2_000_000, 3_000_000, 5_000_000, 10_000_000]
const QUICK_ADDS = [1, 5, 10, 30, 50]

export function NewPurchaseForm({
  breeds,
  suppliers,
  defaultSupplierId,
}: {
  breeds: Breed[]
  suppliers: Supplier[]
  defaultSupplierId?: string
}) {
  const router = useRouter()
  const today = new Date().toISOString().split('T')[0]
  const [supplierMode, setSupplierMode] = useState<'existing' | 'new'>(
    suppliers.length > 0 ? 'existing' : 'new'
  )
  const [supplierId, setSupplierId] = useState(defaultSupplierId ?? '')
  const [newSupplierName, setNewSupplierName] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(today)
  const [defaultBreed, setDefaultBreed] = useState(breeds[0]?.id ?? '')
  const [defaultGender, setDefaultGender] = useState<Row['gender']>('trong')
  const [defaultPrice, setDefaultPrice] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [notes, setNotes] = useState('')
  const [paidNow, setPaidNow] = useState('')
  const [payMethod, setPayMethod] = useState('tien_mat')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const total = rows.reduce((s, r) => s + (parseFloat(r.unit_price) || 0), 0)
  const totalWeight = rows.reduce((s, r) => s + (parseFloat(r.weight_kg) || 0), 0)
  const counts = useMemo(() => {
    const c = { trong: 0, mai: 0, chua_xac_dinh: 0 }
    for (const r of rows) c[r.gender] += 1
    return c
  }, [rows])
  const breedCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of rows) m.set(r.breed_id, (m.get(r.breed_id) ?? 0) + 1)
    return m
  }, [rows])
  const filledPriceCount = rows.filter((r) => parseFloat(r.unit_price) > 0).length
  const avgPrice = filledPriceCount > 0 ? total / filledPriceCount : 0

  function addRows(n: number) {
    if (!defaultBreed) {
      setErr('Chọn giống mặc định trước khi thêm dòng')
      return
    }
    setErr(null)
    const fresh = Array.from({ length: n }, () => {
      const r = newRow(defaultBreed)
      r.gender = defaultGender
      if (defaultPrice && parseFloat(defaultPrice) > 0) r.unit_price = defaultPrice
      return r
    })
    setRows([...rows, ...fresh])
  }

  function updateRow(id: string, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  function removeRow(id: string) {
    setRows((rs) => rs.filter((r) => r.id !== id))
    setSelected((s) => {
      const next = new Set(s)
      next.delete(id)
      return next
    })
  }

  function toggleSelect(id: string) {
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    setSelected((s) => (s.size === rows.length ? new Set() : new Set(rows.map((r) => r.id))))
  }

  function applyToSelected(patch: Partial<Row>) {
    if (selected.size === 0) {
      setErr('Tick checkbox các dòng cần áp dụng trước')
      return
    }
    setErr(null)
    setRows((rs) => rs.map((r) => (selected.has(r.id) ? { ...r, ...patch } : r)))
  }

  function applyPriceToAll(price: string) {
    setRows((rs) => rs.map((r) => ({ ...r, unit_price: price })))
  }

  function clearAllRows() {
    setRows([])
    setSelected(new Set())
  }

  async function submit() {
    if (rows.length === 0) {
      setErr('Thêm ít nhất 1 con gà')
      return
    }
    if (rows.some((r) => !r.unit_price || parseFloat(r.unit_price) <= 0)) {
      setErr('Điền giá > 0 cho mọi con')
      return
    }
    if (supplierMode === 'new' && !newSupplierName.trim()) {
      setErr('Nhập tên nhà cung cấp mới (hoặc chọn NCC có sẵn)')
      return
    }
    if (supplierMode === 'existing' && !supplierId) {
      setErr('Chọn nhà cung cấp (hoặc chuyển sang tạo mới)')
      return
    }
    setLoading(true)
    setErr(null)

    const items = rows.map((r) => ({
      breed_id: r.breed_id,
      gender: r.gender,
      unit_price: parseFloat(r.unit_price),
      weight_kg: r.weight_kg ? parseFloat(r.weight_kg) : undefined,
    }))

    const res = await fetch('/api/purchases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplier_id: supplierMode === 'existing' ? supplierId : undefined,
        supplier_name: supplierMode === 'new' ? newSupplierName.trim() : undefined,
        purchase_date: purchaseDate,
        items,
        paid_amount: Math.round(Number(paidNow) || 0),
        payment_method: payMethod,
        notes: notes || undefined,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      setErr(typeof json.error === 'string' ? json.error : JSON.stringify(json.error))
      setLoading(false)
      return
    }
    router.push('/admin/mua-vao')
    router.refresh()
  }

  const selectedSupplier = suppliers.find((s) => s.id === supplierId)
  const ready =
    rows.length > 0 &&
    rows.every((r) => parseFloat(r.unit_price) > 0) &&
    ((supplierMode === 'existing' && !!supplierId) ||
      (supplierMode === 'new' && newSupplierName.trim().length > 0))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
      <div className="space-y-4">
        <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <div className="p-4 md:p-5 space-y-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              🏷 Nhà cung cấp & Ngày nhập
            </h2>

            <div className="flex bg-gray-100 dark:bg-gray-900/40 rounded-lg p-1 w-full md:w-fit">
              <button
                type="button"
                onClick={() => {
                  setSupplierMode('existing')
                  setNewSupplierName('')
                }}
                className={
                  'flex-1 md:flex-none px-4 py-1.5 rounded-md text-sm font-semibold transition ' +
                  (supplierMode === 'existing'
                    ? 'bg-white dark:bg-gray-800 text-emerald-700 dark:text-emerald-300 shadow'
                    : 'text-gray-600 dark:text-gray-400')
                }
              >
                📋 NCC có sẵn ({suppliers.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setSupplierMode('new')
                  setSupplierId('')
                }}
                className={
                  'flex-1 md:flex-none px-4 py-1.5 rounded-md text-sm font-semibold transition ' +
                  (supplierMode === 'new'
                    ? 'bg-white dark:bg-gray-800 text-emerald-700 dark:text-emerald-300 shadow'
                    : 'text-gray-600 dark:text-gray-400')
                }
              >
                ＋ Tạo NCC mới
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {supplierMode === 'existing' ? (
                <Field label="Nhà cung cấp" required>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">— Chọn NCC —</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                        {s.phone ? ` · ${s.phone}` : ''}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : (
                <Field label="Tên nhà cung cấp mới" required hint="Sẽ tạo bản ghi NCC mới">
                  <input
                    value={newSupplierName}
                    onChange={(e) => setNewSupplierName(e.target.value)}
                    placeholder="VD: Trang trại Anh Ba"
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
                  />
                </Field>
              )}
              <Field label="Ngày nhập" required>
                <input
                  type="date"
                  required
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
                />
              </Field>
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500" />
          <div className="p-4 md:p-5 space-y-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              ⚙️ Cài đặt nhanh cho dòng mới
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="Giống mặc định" required>
                <select
                  value={defaultBreed}
                  onChange={(e) => setDefaultBreed(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">— Chọn —</option>
                  {breeds.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name_vi}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Giới tính mặc định">
                <div className="flex gap-1.5">
                  {(['trong', 'mai', 'chua_xac_dinh'] as const).map((g) => {
                    const meta = GENDER_META[g]
                    const active = defaultGender === g
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setDefaultGender(g)}
                        className={
                          'flex-1 px-2 py-2 rounded-lg text-xs font-medium border transition ' +
                          (active
                            ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-transparent shadow'
                            : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-400')
                        }
                      >
                        {meta.emoji} {meta.label}
                      </button>
                    )
                  })}
                </div>
              </Field>
              <Field label="Giá mặc định (VND)" hint="Áp dụng cho dòng mới được thêm">
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={defaultPrice}
                  onChange={(e) => setDefaultPrice(e.target.value)}
                  placeholder="VD: 1500000"
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm tabular-nums"
                />
              </Field>
            </div>

            <div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                ＋ Thêm nhanh số con
              </div>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_ADDS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => addRows(n)}
                    disabled={!defaultBreed}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 disabled:opacity-50 disabled:cursor-not-allowed transition inline-flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> {n} con
                  </button>
                ))}
                {rows.length > 0 && (
                  <button
                    type="button"
                    onClick={clearAllRows}
                    className="ml-auto text-[11px] text-rose-600 dark:text-rose-400 hover:underline px-2"
                  >
                    Xoá hết {rows.length} dòng
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {rows.length > 0 && (
          <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-violet-500 to-purple-500" />
            <div className="p-4 md:p-5 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  🐓 Danh sách gà
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 border border-violet-200 dark:border-violet-900">
                    {rows.length} con
                  </span>
                </h2>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Tick chọn rồi áp dụng hàng loạt bên dưới
                </div>
              </div>

              {/* Bulk action toolbar */}
              <div className="bg-violet-50/60 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-900 rounded-lg p-3 space-y-2">
                <div className="flex items-baseline justify-between flex-wrap gap-2">
                  <div className="text-xs text-violet-800 dark:text-violet-200">
                    <strong>{selected.size}</strong> dòng đã tick
                    {selected.size === 0 && (
                      <span className="opacity-70 ml-1">— click checkbox cột đầu</span>
                    )}
                  </div>
                  {filledPriceCount > 0 && (
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">
                      Giá TB: {formatVnd(avgPrice)}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">Áp giới tính:</span>
                  {(['trong', 'mai', 'chua_xac_dinh'] as const).map((g) => {
                    const meta = GENDER_META[g]
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => applyToSelected({ gender: g })}
                        disabled={selected.size === 0}
                        className="px-2 py-1 text-[11px] rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-violet-400 disabled:opacity-50"
                      >
                        {meta.emoji} {meta.label}
                      </button>
                    )
                  })}
                </div>

                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">Áp giống:</span>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        applyToSelected({ breed_id: e.target.value })
                        e.target.value = ''
                      }
                    }}
                    disabled={selected.size === 0}
                    className="text-[11px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded px-2 py-1 disabled:opacity-50"
                  >
                    <option value="">— Chọn giống —</option>
                    {breeds.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name_vi}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">Áp giá:</span>
                  {QUICK_PRICES.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => applyToSelected({ unit_price: String(p) })}
                      disabled={selected.size === 0}
                      className="px-2 py-1 text-[11px] rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-violet-400 disabled:opacity-50 tabular-nums"
                    >
                      {(p / 1000).toLocaleString('vi-VN')}k
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      if (defaultPrice) applyPriceToAll(defaultPrice)
                    }}
                    disabled={!defaultPrice}
                    className="px-2 py-1 text-[11px] rounded border border-amber-300 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 hover:bg-amber-100 disabled:opacity-50"
                    title="Áp giá mặc định cho TẤT CẢ dòng"
                  >
                    💰 Áp giá mặc định cho TẤT CẢ
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto -mx-4 md:-mx-5">
                <table className="w-full text-sm min-w-[720px]">
                  <thead className="bg-gray-50 dark:bg-gray-900 text-xs uppercase text-gray-500 dark:text-gray-400 border-y border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="px-3 py-2 w-10">
                        <input
                          type="checkbox"
                          checked={selected.size === rows.length && rows.length > 0}
                          onChange={toggleSelectAll}
                          className="w-4 h-4"
                        />
                      </th>
                      <th className="px-2 py-2 w-10">#</th>
                      <th className="px-2 py-2 text-left">Giống</th>
                      <th className="px-2 py-2 text-left w-36">Giới tính</th>
                      <th className="px-2 py-2 text-left w-24">Cân (kg)</th>
                      <th className="px-2 py-2 text-left w-40">Đơn giá (đ)</th>
                      <th className="px-2 py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => {
                      const checked = selected.has(r.id)
                      const priceMissing = !r.unit_price || parseFloat(r.unit_price) <= 0
                      return (
                        <tr
                          key={r.id}
                          className={
                            'border-t border-gray-100 dark:border-gray-700 ' +
                            (checked
                              ? 'bg-violet-50/60 dark:bg-violet-950/20'
                              : priceMissing
                                ? 'bg-rose-50/40 dark:bg-rose-950/10'
                                : '')
                          }
                        >
                          <td className="px-3 py-1.5 text-center">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleSelect(r.id)}
                              className="w-4 h-4"
                            />
                          </td>
                          <td className="px-2 py-1.5 text-gray-400 dark:text-gray-500 text-center font-mono text-xs">
                            {String(i + 1).padStart(2, '0')}
                          </td>
                          <td className="px-2 py-1.5">
                            <select
                              value={r.breed_id}
                              onChange={(e) => updateRow(r.id, { breed_id: e.target.value })}
                              className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-900 rounded px-2 py-1 text-sm"
                            >
                              {breeds.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.name_vi}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-2 py-1.5">
                            <select
                              value={r.gender}
                              onChange={(e) =>
                                updateRow(r.id, { gender: e.target.value as Row['gender'] })
                              }
                              className={
                                'w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-900 rounded px-2 py-1 text-sm font-medium ' +
                                GENDER_META[r.gender].cls
                              }
                            >
                              <option value="trong">🐓 Trống</option>
                              <option value="mai">🐔 Mái</option>
                              <option value="chua_xac_dinh">❓ Chưa rõ</option>
                            </select>
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="number"
                              step="0.1"
                              min={0}
                              value={r.weight_kg}
                              onChange={(e) => updateRow(r.id, { weight_kg: e.target.value })}
                              placeholder="—"
                              className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-900 rounded px-2 py-1 text-sm tabular-nums"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="number"
                              min={0}
                              step={1}
                              value={r.unit_price}
                              onChange={(e) => updateRow(r.id, { unit_price: e.target.value })}
                              placeholder="bắt buộc"
                              className={
                                'w-full border rounded px-2 py-1 text-sm tabular-nums dark:bg-gray-900 ' +
                                (priceMissing
                                  ? 'border-rose-300 dark:border-rose-800'
                                  : 'border-gray-200 dark:border-gray-700')
                              }
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <button
                              type="button"
                              onClick={() => removeRow(r.id)}
                              title="Xoá dòng"
                              className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 md:p-5">
          <Field label="Ghi chú" hint="Tuỳ chọn — VD: vận chuyển bao gồm, gà giống cùng đàn…">
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="VD: NCC giao kèm thuốc úm, hẹn 7N sau giao tiếp 50 con…"
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
            />
          </Field>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 items-start border-t border-gray-100 dark:border-gray-700 pt-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Trả ngay (đ)</label>
              <input
                type="number"
                step={1}
                min="0"
                inputMode="numeric"
                value={paidNow}
                onChange={(e) => setPaidNow(e.target.value)}
                placeholder="0"
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm text-right"
              />
              <button
                type="button"
                onClick={() => setPaidNow(String(Math.round(total)))}
                className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                Trả đủ {formatVnd(total)}
              </button>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Hình thức</label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
              >
                <option value="tien_mat">Tiền mặt</option>
                <option value="chuyen_khoan">Chuyển khoản</option>
              </select>
            </div>
            <div className="text-right">
              <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Còn nợ NCC</div>
              {(() => {
                const paidVal = Math.min(Number(paidNow) || 0, total)
                const debt = total - paidVal
                return (
                  <div className={`text-lg font-bold ${debt > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {formatVnd(Math.max(0, debt))}
                  </div>
                )
              })()}
            </div>
          </div>
        </section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-4 self-start">
        <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-blue-500 to-violet-500" />
          <div className="p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
              📋 Tóm tắt phiếu nhập
            </h3>

            <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
              <Kv
                k="🏷 NCC"
                v={
                  supplierMode === 'existing'
                    ? selectedSupplier?.name ?? '— Chưa chọn —'
                    : newSupplierName || '— Chưa nhập —'
                }
              />
              <Kv k="📅 Ngày" v={new Date(purchaseDate).toLocaleDateString('vi-VN')} />
            </div>

            <div className="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-2.5">
              <div className="grid grid-cols-3 gap-1 text-center">
                <Stat label="Trống" value={counts.trong} icon="🐓" tone="text-blue-600 dark:text-blue-400" />
                <Stat label="Mái" value={counts.mai} icon="🐔" tone="text-pink-600 dark:text-pink-400" />
                <Stat
                  label="Chưa rõ"
                  value={counts.chua_xac_dinh}
                  icon="❓"
                  tone="text-gray-500"
                />
              </div>
              {totalWeight > 0 && (
                <div className="text-[11px] text-center text-gray-500 dark:text-gray-400 mt-1.5 pt-1.5 border-t border-gray-200 dark:border-gray-700">
                  ⚖️ Tổng cân: <strong>{totalWeight.toFixed(1)} kg</strong>
                </div>
              )}
            </div>

            {breedCounts.size > 0 && (
              <div>
                <div className="text-[10.5px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                  Theo giống
                </div>
                <ul className="space-y-1 text-xs">
                  {Array.from(breedCounts.entries())
                    .sort((a, b) => b[1] - a[1])
                    .map(([bid, c]) => {
                      const b = breeds.find((x) => x.id === bid)
                      return (
                        <li
                          key={bid}
                          className="flex items-baseline justify-between gap-2 bg-gray-50 dark:bg-gray-900/40 px-2 py-1 rounded"
                        >
                          <span className="text-gray-700 dark:text-gray-300 truncate">
                            {b?.name_vi ?? '?'}
                          </span>
                          <span className="font-bold tabular-nums text-gray-900 dark:text-gray-100">
                            {c}
                          </span>
                        </li>
                      )
                    })}
                </ul>
              </div>
            )}

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg p-3 border border-blue-200 dark:border-blue-900">
              <div className="text-[11px] text-blue-700 dark:text-blue-300 uppercase tracking-wider font-medium mb-1">
                Tổng giá trị phiếu
              </div>
              <div className="text-2xl font-bold tabular-nums text-blue-700 dark:text-blue-300">
                {formatVnd(total)}
              </div>
              {filledPriceCount < rows.length && rows.length > 0 && (
                <div className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">
                  ⚠️ Còn {rows.length - filledPriceCount} dòng chưa có giá
                </div>
              )}
              {avgPrice > 0 && (
                <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  TB {formatVnd(avgPrice)}/con
                </div>
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
                  ? '⏳ Đang tạo phiếu…'
                  : `📥 Tạo phiếu nhập ${rows.length || 0} con`}
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
              💡 Mỗi con sẽ tạo hồ sơ riêng + tự xếp vào khu cách ly E. Có thể chỉnh code/QR sau khi
              tạo xong.
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

function Stat({
  label,
  value,
  icon,
  tone,
}: {
  label: string
  value: number
  icon: string
  tone: string
}) {
  return (
    <div>
      <div className="text-base">{icon}</div>
      <div className={'text-lg font-bold tabular-nums ' + tone}>{value}</div>
      <div className="text-[10px] text-gray-500 dark:text-gray-400">{label}</div>
    </div>
  )
}
