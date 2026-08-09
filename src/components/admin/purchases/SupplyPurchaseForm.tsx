'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Loader2 } from 'lucide-react'

type Supplier = { id: string; name: string; phone: string | null; supplier_category: string | null; code: string | null }
type StockItem = { id: string; name_vi: string; unit: string | null; current_stock: number | null; cost_per_unit: number | null }
type Kind = 'thuc_an' | 'thuoc' | 'vat_tu'

type Row = { ref_id: string; item_name: string; quantity: string; unit_price: string }

const KIND_META: Record<Kind, { title: string; emoji: string; itemLabel: string; noun: string }> = {
  thuc_an: { title: 'Phiếu nhập thức ăn (cám)', emoji: '🌾', itemLabel: 'Loại cám', noun: 'cám' },
  thuoc: { title: 'Phiếu nhập thuốc', emoji: '💊', itemLabel: 'Loại thuốc', noun: 'thuốc' },
  vat_tu: { title: 'Phiếu nhập vật tư / khác', emoji: '📦', itemLabel: 'Tên vật tư', noun: 'vật tư' },
}

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function SupplyPurchaseForm({
  kind,
  suppliers,
  stockItems,
  defaultSupplierId,
}: {
  kind: Kind
  suppliers: Supplier[]
  stockItems: StockItem[]
  defaultSupplierId?: string
}) {
  const router = useRouter()
  const meta = KIND_META[kind]
  const fromStock = kind === 'thuc_an' || kind === 'thuoc'

  const [supplierId, setSupplierId] = useState(defaultSupplierId ?? '')
  const [purchaseDate, setPurchaseDate] = useState(todayISO())
  const [notes, setNotes] = useState('')
  const [paidNow, setPaidNow] = useState('')
  const [payMethod, setPayMethod] = useState('tien_mat')
  const [rows, setRows] = useState<Row[]>([{ ref_id: '', item_name: '', quantity: '', unit_price: '' }])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const total = useMemo(
    () => rows.reduce((s, r) => s + (Number(r.quantity) || 0) * (Number(r.unit_price) || 0), 0),
    [rows]
  )

  function updateRow(i: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }
  function pickStock(i: number, refId: string) {
    const it = stockItems.find((s) => s.id === refId)
    updateRow(i, {
      ref_id: refId,
      item_name: it?.name_vi ?? '',
      // Gợi ý đơn giá theo giá vốn hiện tại nếu chưa nhập
      unit_price: it?.cost_per_unit ? String(it.cost_per_unit) : rows[i].unit_price,
    })
  }
  const addRow = () => setRows((p) => [...p, { ref_id: '', item_name: '', quantity: '', unit_price: '' }])
  const removeRow = (i: number) => setRows((p) => (p.length > 1 ? p.filter((_, idx) => idx !== i) : p))

  async function submit() {
    setError(null)
    if (!supplierId) return setError('Vui lòng chọn nhà cung cấp')
    const clean = rows
      .map((r) => ({
        item_type: kind === 'vat_tu' ? 'khac' : kind,
        feed_id: kind === 'thuc_an' ? r.ref_id || undefined : undefined,
        medicine_id: kind === 'thuoc' ? r.ref_id || undefined : undefined,
        item_name: r.item_name.trim() || undefined,
        quantity: Number(r.quantity),
        unit_price: Number(r.unit_price),
      }))
      .filter((r) => r.quantity > 0 && r.unit_price >= 0 && (fromStock ? (r.feed_id || r.medicine_id) : r.item_name))

    if (clean.length === 0) {
      return setError(fromStock ? `Chọn ít nhất 1 ${meta.noun} + số lượng` : 'Nhập ít nhất 1 dòng vật tư có tên + số lượng')
    }

    setLoading(true)
    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          supplier_id: supplierId,
          purchase_date: purchaseDate,
          supply_items: clean,
          paid_amount: Math.round(Number(paidNow) || 0),
          payment_method: payMethod,
          notes: notes.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setLoading(false)
        return setError(typeof json.error === 'string' ? json.error : 'Lỗi tạo phiếu nhập')
      }
      router.push('/admin/mua-vao')
      router.refresh()
    } catch {
      setLoading(false)
      setError('Lỗi kết nối, thử lại')
    }
  }

  const inputCls =
    'w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none'

  return (
    <div className="max-w-4xl space-y-5">
      {/* Header phiếu */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Nhà cung cấp *</label>
          <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={inputCls}>
            <option value="">— Chọn NCC —</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.phone ? ` · ${s.phone}` : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Ngày nhập</label>
          <input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} className={inputCls} />
        </div>
      </div>

      {/* Dòng hàng */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">{meta.emoji} Chi tiết hàng nhập</h3>
          <button onClick={addRow} type="button" className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
            <Plus className="w-4 h-4" /> Thêm dòng
          </button>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {rows.map((r, i) => {
            const it = stockItems.find((s) => s.id === r.ref_id)
            const lineTotal = (Number(r.quantity) || 0) * (Number(r.unit_price) || 0)
            return (
              <div key={i} className="p-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                {/* Chọn hàng */}
                <div className="md:col-span-5">
                  <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {meta.itemLabel} {fromStock ? '*' : '*'}
                  </label>
                  {fromStock ? (
                    <select value={r.ref_id} onChange={(e) => pickStock(i, e.target.value)} className={inputCls}>
                      <option value="">— Chọn {meta.noun} từ kho —</option>
                      {stockItems.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name_vi} (tồn: {Number(s.current_stock ?? 0)} {s.unit ?? ''})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={r.item_name}
                      onChange={(e) => updateRow(i, { item_name: e.target.value })}
                      placeholder="VD: Máng ăn, khay úm…"
                      className={inputCls}
                    />
                  )}
                </div>
                {/* Số lượng */}
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                    SL {it?.unit ? `(${it.unit})` : ''}
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    inputMode="decimal"
                    value={r.quantity}
                    onChange={(e) => updateRow(i, { quantity: e.target.value })}
                    className={`${inputCls} text-right`}
                  />
                </div>
                {/* Đơn giá */}
                <div className="md:col-span-3">
                  <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">Đơn giá (đ)</label>
                  <input
                    type="number"
                    step={1}
                    min="0"
                    inputMode="numeric"
                    value={r.unit_price}
                    onChange={(e) => updateRow(i, { unit_price: e.target.value })}
                    className={`${inputCls} text-right`}
                  />
                </div>
                {/* Thành tiền + xóa */}
                <div className="md:col-span-2 flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                    {lineTotal.toLocaleString('vi-VN')}đ
                  </span>
                  <button
                    onClick={() => removeRow(i)}
                    type="button"
                    disabled={rows.length === 1}
                    className="text-gray-400 hover:text-red-500 disabled:opacity-30"
                    aria-label="Xóa dòng"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
        <div className="px-4 py-3 bg-amber-50 dark:bg-amber-950/30 flex items-center justify-between">
          <span className="text-sm font-bold uppercase tracking-wide text-amber-900 dark:text-amber-300">Tổng cộng</span>
          <span className="text-lg font-bold tabular-nums text-amber-900 dark:text-amber-300">{total.toLocaleString('vi-VN')}đ</span>
        </div>
      </div>

      {/* Thanh toán / công nợ */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Trả ngay (đ)</label>
          <input
            type="number"
            step={1}
            min="0"
            inputMode="numeric"
            value={paidNow}
            onChange={(e) => setPaidNow(e.target.value)}
            placeholder="0"
            className={`${inputCls} text-right`}
          />
          <button
            type="button"
            onClick={() => setPaidNow(String(Math.round(total)))}
            className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            Trả đủ {total.toLocaleString('vi-VN')}đ
          </button>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Hình thức</label>
          <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)} className={inputCls}>
            <option value="tien_mat">Tiền mặt</option>
            <option value="chuyen_khoan">Chuyển khoản</option>
          </select>
        </div>
        <div className="text-right">
          <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Còn nợ NCC</div>
          {(() => {
            const paidVal = Math.min(Number(paidNow) || 0, total)
            const debt = total - paidVal
            return (
              <div className={`text-xl font-bold tabular-nums ${debt > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {Math.max(0, debt).toLocaleString('vi-VN')}đ
              </div>
            )
          })()}
        </div>
      </div>

      {/* Ghi chú */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Ghi chú</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputCls} placeholder="Số hóa đơn, ghi chú giao hàng…" />
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">{error}</p>}

      {fromStock ? (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          ✅ Khi lưu, tồn kho {meta.noun} sẽ <b>tự động tăng</b> theo số lượng nhập.
        </p>
      ) : (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          ✅ Khi lưu, phiếu này được ghi vào <b>chi phí (hạng mục Dự phòng)</b> để lên báo cáo lãi lỗ.
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={submit}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2.5 text-sm disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Lưu phiếu nhập
        </button>
        <button onClick={() => router.back()} type="button" className="text-sm text-gray-500 dark:text-gray-400 hover:underline">
          Hủy
        </button>
      </div>
    </div>
  )
}
