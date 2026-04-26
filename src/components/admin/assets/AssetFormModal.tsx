'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  type AssetKind,
  type AssetStatus,
  KIND_META,
  STATUS_META,
  ASSET_CATEGORIES,
  categoryMeta,
} from '@/lib/assets/types'

type Profile = { id: string; full_name: string }
type Area = { id: string; code: string; name: string }

const FormSchema = (() => null)() // placeholder

type FormState = {
  kind: AssetKind
  code: string
  name: string
  category: string
  quantity: number
  unit: string
  area_id: string
  responsible_user_id: string
  location_note: string
  purchase_date: string
  purchase_price: number
  supplier_name: string
  invoice_number: string
  warranty_until: string
  useful_life_months: number
  salvage_value: number
  brand: string
  model: string
  serial_number: string
  status: AssetStatus
  next_maintenance_date: string
  maintenance_interval_months: number
  notes: string
}

const EMPTY: FormState = {
  kind: 'tscd',
  code: '',
  name: '',
  category: '',
  quantity: 1,
  unit: 'cái',
  area_id: '',
  responsible_user_id: '',
  location_note: '',
  purchase_date: new Date().toISOString().slice(0, 10),
  purchase_price: 0,
  supplier_name: '',
  invoice_number: '',
  warranty_until: '',
  useful_life_months: 0,
  salvage_value: 0,
  brand: '',
  model: '',
  serial_number: '',
  status: 'dang_dung',
  next_maintenance_date: '',
  maintenance_interval_months: 0,
  notes: '',
}

export function AssetFormModal({
  onClose,
  onSaved,
  profiles,
  areas,
}: {
  onClose: () => void
  onSaved: () => void
  profiles: Profile[]
  areas: Area[]
}) {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // Filter categories theo kind
  const availableCategories = useMemo(
    () => ASSET_CATEGORIES.filter((c) => c.kinds.includes(form.kind)),
    [form.kind]
  )

  // Auto-set useful_life from category default
  useEffect(() => {
    if (form.category) {
      const cm = categoryMeta(form.category)
      if (cm.defaultLifeMonths && form.useful_life_months === 0) {
        setForm((f) => ({ ...f, useful_life_months: cm.defaultLifeMonths! }))
      }
    }
  }, [form.category])

  function update<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      setErr('Vui lòng nhập tên tài sản')
      return
    }
    setSaving(true)
    setErr(null)
    const body = {
      kind: form.kind,
      code: form.code.trim() || undefined,  // server tự gen nếu trống
      name: form.name.trim(),
      category: form.category || null,
      quantity: form.quantity,
      unit: form.unit.trim() || 'cái',
      area_id: form.area_id || null,
      responsible_user_id: form.responsible_user_id || null,
      location_note: form.location_note.trim() || null,
      purchase_date: form.purchase_date || null,
      purchase_price: form.purchase_price,
      supplier_name: form.supplier_name.trim() || null,
      invoice_number: form.invoice_number.trim() || null,
      warranty_until: form.warranty_until || null,
      useful_life_months: form.useful_life_months > 0 ? form.useful_life_months : null,
      salvage_value: form.salvage_value,
      brand: form.brand.trim() || null,
      model: form.model.trim() || null,
      serial_number: form.serial_number.trim() || null,
      status: form.status,
      next_maintenance_date: form.next_maintenance_date || null,
      maintenance_interval_months:
        form.maintenance_interval_months > 0 ? form.maintenance_interval_months : null,
      notes: form.notes.trim() || null,
    }
    const res = await fetch('/api/assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const j = await res.json()
    setSaving(false)
    if (!res.ok) {
      setErr(typeof j.error === 'string' ? j.error : 'Lỗi tạo tài sản')
      return
    }
    onSaved()
  }

  const km = KIND_META[form.kind]

  function parseAmt(s: string): number {
    return Number(s.replace(/[^\d]/g, '')) || 0
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-0 md:p-4">
      <div className="w-full max-w-3xl bg-white dark:bg-gray-800 rounded-t-2xl md:rounded-2xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
        {/* HEADER */}
        <div className={`px-5 py-4 bg-gradient-to-r ${km.bar} text-white flex items-center justify-between`}>
          <div>
            <div className="text-xs uppercase tracking-widest opacity-80">Thêm mới</div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span>{km.emoji}</span> {km.label === 'TSCĐ' ? 'Tài sản cố định' : 'Công cụ dụng cụ'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-lg"
          >
            ×
          </button>
        </div>

        <form onSubmit={submit} className="overflow-y-auto p-5 space-y-5">
          {/* KIND TOGGLE */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
              Loại tài sản
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(KIND_META) as AssetKind[]).map((k) => {
                const m = KIND_META[k]
                const active = form.kind === k
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => update('kind', k)}
                    className={
                      'p-3 rounded-xl border-2 text-left transition ' +
                      (active
                        ? `border-orange-500 ring-2 ring-offset-2 dark:ring-offset-gray-800 ring-orange-300 shadow`
                        : 'border-gray-200 dark:border-gray-700 hover:border-orange-300')
                    }
                  >
                    <div className={`h-1 -mx-3 -mt-3 mb-2 rounded-t-xl bg-gradient-to-r ${m.bar}`} />
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">{m.emoji}</span>
                      <span className="font-bold">{m.label} — {k === 'tscd' ? 'Tài sản cố định' : 'Công cụ dụng cụ'}</span>
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400">{m.description}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* THÔNG TIN CƠ BẢN */}
          <Section title="📋 Thông tin cơ bản">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <Field label="Mã tài sản" hint="Tự sinh nếu để trống" className="md:col-span-3">
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => update('code', e.target.value.toUpperCase())}
                  placeholder={form.kind === 'tscd' ? 'TSCD-001' : 'CCDC-001'}
                  className="input-cls font-mono uppercase"
                />
              </Field>
              <Field label="Tên tài sản" required className="md:col-span-9">
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  placeholder="VD: Máy ấp trứng GreenTech 200"
                  className="input-cls"
                />
              </Field>
              <Field label="Phân loại" className="md:col-span-6">
                <select
                  value={form.category}
                  onChange={(e) => update('category', e.target.value)}
                  className="input-cls"
                >
                  <option value="">-- Chọn phân loại --</option>
                  {availableCategories.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.emoji} {c.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Số lượng" className="md:col-span-3">
                <input
                  type="number"
                  min={0}
                  value={form.quantity}
                  onChange={(e) => update('quantity', Number(e.target.value))}
                  className="input-cls"
                />
              </Field>
              <Field label="Đơn vị" className="md:col-span-3">
                <input
                  type="text"
                  value={form.unit}
                  onChange={(e) => update('unit', e.target.value)}
                  className="input-cls"
                  placeholder="cái, bộ, chiếc..."
                />
              </Field>
            </div>
          </Section>

          {/* MUA SẮM */}
          <Section title="💰 Mua sắm & giá trị">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <Field label="Ngày mua" className="md:col-span-3">
                <input
                  type="date"
                  value={form.purchase_date}
                  onChange={(e) => update('purchase_date', e.target.value)}
                  className="input-cls"
                />
              </Field>
              <Field label="Giá mua" required className="md:col-span-3">
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.purchase_price > 0 ? form.purchase_price.toLocaleString('vi-VN') : ''}
                    onChange={(e) => update('purchase_price', parseAmt(e.target.value))}
                    placeholder="0"
                    className="input-cls pr-7 text-right tabular-nums font-semibold"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-xs">đ</span>
                </div>
              </Field>
              <Field label="Nhà cung cấp" className="md:col-span-6">
                <input
                  type="text"
                  value={form.supplier_name}
                  onChange={(e) => update('supplier_name', e.target.value)}
                  className="input-cls"
                  placeholder="VD: Công ty TNHH ABC"
                />
              </Field>
              <Field label="Số hóa đơn" className="md:col-span-4">
                <input
                  type="text"
                  value={form.invoice_number}
                  onChange={(e) => update('invoice_number', e.target.value)}
                  className="input-cls font-mono"
                />
              </Field>
              <Field label="Bảo hành đến" className="md:col-span-4">
                <input
                  type="date"
                  value={form.warranty_until}
                  onChange={(e) => update('warranty_until', e.target.value)}
                  className="input-cls"
                />
              </Field>
              <Field label="Giá trị thu hồi cuối kỳ" hint="Phần dự kiến còn sau khấu hao" className="md:col-span-4">
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.salvage_value > 0 ? form.salvage_value.toLocaleString('vi-VN') : ''}
                    onChange={(e) => update('salvage_value', parseAmt(e.target.value))}
                    placeholder="0"
                    className="input-cls pr-7 text-right tabular-nums"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-xs">đ</span>
                </div>
              </Field>
              <Field
                label={form.kind === 'tscd' ? 'Khấu hao (tháng)' : 'Phân bổ (tháng)'}
                hint={form.category ? `Gợi ý: ${categoryMeta(form.category).defaultLifeMonths ?? '—'} tháng` : 'Để 0 nếu không khấu hao'}
                className="md:col-span-12"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={form.useful_life_months}
                    onChange={(e) => update('useful_life_months', Number(e.target.value))}
                    className="input-cls flex-1"
                  />
                  <div className="flex gap-1">
                    {[12, 24, 36, 60, 84, 120].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => update('useful_life_months', m)}
                        className={
                          'px-2 py-1 rounded text-[11px] font-semibold ' +
                          (form.useful_life_months === m
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200')
                        }
                      >
                        {m}t
                      </button>
                    ))}
                  </div>
                </div>
              </Field>
            </div>
          </Section>

          {/* VỊ TRÍ */}
          <Section title="📍 Vị trí & người phụ trách">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <Field label="Khu / vị trí" className="md:col-span-4">
                <select
                  value={form.area_id}
                  onChange={(e) => update('area_id', e.target.value)}
                  className="input-cls"
                >
                  <option value="">-- Không gắn khu --</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.code} · {a.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Người phụ trách" className="md:col-span-4">
                <select
                  value={form.responsible_user_id}
                  onChange={(e) => update('responsible_user_id', e.target.value)}
                  className="input-cls"
                >
                  <option value="">-- Không gắn người --</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Vị trí cụ thể" hint="Ghi chú thêm" className="md:col-span-4">
                <input
                  type="text"
                  value={form.location_note}
                  onChange={(e) => update('location_note', e.target.value)}
                  placeholder="VD: Kệ 3, góc phải"
                  className="input-cls"
                />
              </Field>
            </div>
          </Section>

          {/* THÔNG SỐ */}
          <Section title="🔧 Thông số kỹ thuật">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <Field label="Hãng" className="md:col-span-4">
                <input
                  type="text"
                  value={form.brand}
                  onChange={(e) => update('brand', e.target.value)}
                  className="input-cls"
                  placeholder="VD: Honda, Samsung..."
                />
              </Field>
              <Field label="Model" className="md:col-span-4">
                <input
                  type="text"
                  value={form.model}
                  onChange={(e) => update('model', e.target.value)}
                  className="input-cls"
                />
              </Field>
              <Field label="Serial number" className="md:col-span-4">
                <input
                  type="text"
                  value={form.serial_number}
                  onChange={(e) => update('serial_number', e.target.value)}
                  className="input-cls font-mono"
                />
              </Field>
            </div>
          </Section>

          {/* BẢO TRÌ */}
          <Section title="🔧 Bảo trì">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <Field label="Lần bảo trì kế tiếp" className="md:col-span-6">
                <input
                  type="date"
                  value={form.next_maintenance_date}
                  onChange={(e) => update('next_maintenance_date', e.target.value)}
                  className="input-cls"
                />
              </Field>
              <Field label="Chu kỳ bảo trì (tháng)" className="md:col-span-6">
                <input
                  type="number"
                  min={0}
                  value={form.maintenance_interval_months}
                  onChange={(e) => update('maintenance_interval_months', Number(e.target.value))}
                  className="input-cls"
                  placeholder="VD: 6 = 6 tháng/lần"
                />
              </Field>
              <Field label="Trạng thái" className="md:col-span-12">
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(STATUS_META) as AssetStatus[]).map((s) => {
                    const m = STATUS_META[s]
                    const active = form.status === s
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => update('status', s)}
                        className={
                          'px-3 py-1.5 rounded-lg text-xs font-semibold transition border ' +
                          (active ? m.cls + ' ring-2 ring-orange-400' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300')
                        }
                      >
                        {m.emoji} {m.label}
                      </button>
                    )
                  })}
                </div>
              </Field>
              <Field label="Ghi chú" className="md:col-span-12">
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => update('notes', e.target.value)}
                  className="input-cls resize-none"
                  placeholder="Ghi chú bổ sung..."
                />
              </Field>
            </div>
          </Section>

          {err && (
            <div className="px-3 py-2 rounded-lg text-sm bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300">
              ⚠️ {err}
            </div>
          )}

          <div className="flex gap-2 pt-2 sticky bottom-0 bg-white dark:bg-gray-800 -mx-5 px-5 py-3 -mb-5 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700/50"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={saving}
              className={
                'flex-1 px-4 py-2.5 rounded-xl text-white font-bold shadow-md disabled:opacity-50 bg-gradient-to-r ' +
                km.bar
              }
            >
              {saving ? 'Đang lưu...' : `+ Tạo ${km.label}`}
            </button>
          </div>
        </form>

        <style jsx global>{`
          .input-cls {
            width: 100%;
            padding: 0.5rem 0.75rem;
            border-radius: 0.5rem;
            border: 1px solid rgb(209 213 219);
            background: white;
            font-size: 0.875rem;
            color: rgb(17 24 39);
          }
          .input-cls:focus {
            outline: none;
            border-color: rgb(249 115 22);
            box-shadow: 0 0 0 3px rgb(254 215 170 / 0.5);
          }
          .dark .input-cls {
            background: rgb(31 41 55);
            border-color: rgb(75 85 99);
            color: rgb(243 244 246);
          }
        `}</style>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{title}</h3>
      {children}
    </div>
  )
}

function Field({
  label,
  required,
  hint,
  className,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={className}>
      <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-[10.5px] text-gray-500 dark:text-gray-400">{hint}</p>}
    </div>
  )
}
