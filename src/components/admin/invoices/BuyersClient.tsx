'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type Buyer = {
  id: string
  customer_id: string | null
  buyer_type: 'ca_nhan' | 'doanh_nghiep'
  name: string
  tax_code: string | null
  address: string | null
  email: string | null
  phone: string | null
  bank_account: string | null
  bank_name: string | null
  representative_name: string | null
  buyer_code: string | null
  notes: string | null
  updated_at: string
}

type Customer = {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
}

export function BuyersClient({
  initialBuyers,
  customers,
  canWrite,
  canDelete,
}: {
  initialBuyers: Buyer[]
  customers: Customer[]
  canWrite: boolean
  canDelete: boolean
}) {
  const router = useRouter()
  const [buyers, setBuyers] = useState(initialBuyers)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'ca_nhan' | 'doanh_nghiep'>('all')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Buyer | null>(null)
  const [importingFromCustomers, setImportingFromCustomers] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return buyers.filter((b) => {
      if (filterType !== 'all' && b.buyer_type !== filterType) return false
      if (!q) return true
      return (
        b.name.toLowerCase().includes(q) ||
        (b.tax_code ?? '').toLowerCase().includes(q) ||
        (b.phone ?? '').toLowerCase().includes(q) ||
        (b.email ?? '').toLowerCase().includes(q)
      )
    })
  }, [buyers, search, filterType])

  async function reload() {
    const res = await fetch('/api/invoices/buyers')
    const json = await res.json()
    setBuyers(json.buyers || [])
  }

  async function handleDelete(id: string) {
    if (!confirm('Xoá người mua này?')) return
    const res = await fetch(`/api/invoices/buyers?id=${id}`, { method: 'DELETE' })
    if (!res.ok) {
      alert(await res.text())
      return
    }
    setBuyers(buyers.filter((b) => b.id !== id))
    router.refresh()
  }

  function openNew() {
    setEditing(null)
    setShowForm(true)
  }

  function openEdit(b: Buyer) {
    setEditing(b)
    setShowForm(true)
  }

  function pickCustomer(c: Customer) {
    setEditing({
      id: '',
      customer_id: c.id,
      buyer_type: 'ca_nhan',
      name: c.name,
      tax_code: null,
      address: c.address,
      email: c.email,
      phone: c.phone,
      bank_account: null,
      bank_name: null,
      representative_name: null,
      buyer_code: null,
      notes: null,
      updated_at: '',
    } as Buyer)
    setImportingFromCustomers(false)
    setShowForm(true)
  }

  if (showForm) {
    return (
      <BuyerForm
        initial={editing}
        onCancel={() => {
          setShowForm(false)
          setEditing(null)
        }}
        onSaved={async () => {
          setShowForm(false)
          setEditing(null)
          await reload()
          router.refresh()
        }}
      />
    )
  }

  if (importingFromCustomers) {
    const existingCustomerIds = new Set(buyers.map((b) => b.customer_id).filter(Boolean))
    const availableCustomers = customers.filter((c) => !existingCustomerIds.has(c.id))
    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 shadow-sm">
        <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">
            Chọn khách hàng để chuyển sang người mua HĐ
          </h2>
          <button
            onClick={() => setImportingFromCustomers(false)}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            ✕
          </button>
        </div>
        <div className="p-5">
          {availableCustomers.length === 0 ? (
            <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
              Tất cả khách hàng đã có hồ sơ người mua HĐ.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {availableCustomers.map((c) => (
                <button
                  key={c.id}
                  onClick={() => pickCustomer(c)}
                  className="text-left border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition"
                >
                  <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">{c.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {c.phone || '—'} · {c.email || 'không email'}
                  </div>
                  {c.address && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                      📍 {c.address}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[260px]">
          <div className="relative flex-1 max-w-md">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên / MST / SĐT / email"
              className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg text-sm"
            />
          </div>
        </div>

        <div className="flex gap-1 flex-wrap">
          {(['all', 'ca_nhan', 'doanh_nghiep'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`text-xs px-3 py-1.5 rounded-full border ${
                filterType === t
                  ? 'bg-amber-500 text-white border-amber-500 font-semibold'
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
              }`}
            >
              {t === 'all' ? 'Tất cả' : t === 'ca_nhan' ? 'Cá nhân' : 'Doanh nghiệp'}
            </button>
          ))}
        </div>

        {canWrite && (
          <div className="flex gap-2">
            <button
              onClick={() => setImportingFromCustomers(true)}
              className="bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded-lg px-3 py-2 text-sm font-semibold hover:bg-blue-50 dark:hover:bg-blue-950/30"
            >
              📥 Lấy từ Khách hàng
            </button>
            <button
              onClick={openNew}
              className="bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg px-4 py-2 text-sm font-semibold shadow"
            >
              + Tạo người mua
            </button>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-10 text-center">
          <div className="text-4xl mb-2">👤</div>
          <p className="text-gray-500 text-sm">
            {buyers.length === 0
              ? 'Chưa có người mua HĐ nào — tạo mới hoặc lấy từ Khách hàng.'
              : 'Không khớp filter — thử đổi từ khoá.'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left p-3">Tên</th>
                  <th className="text-left p-3">Loại</th>
                  <th className="text-left p-3">MST</th>
                  <th className="text-left p-3">SĐT / Email</th>
                  <th className="text-left p-3">Địa chỉ</th>
                  <th className="text-left p-3">Đồng bộ KH</th>
                  <th className="text-right p-3">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr
                    key={b.id}
                    className="border-t border-gray-100 dark:border-gray-700 hover:bg-amber-50/30 dark:hover:bg-amber-950/10"
                  >
                    <td className="p-3 font-medium text-gray-900 dark:text-gray-100">{b.name}</td>
                    <td className="p-3">
                      {b.buyer_type === 'doanh_nghiep' ? (
                        <span className="text-[11px] bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded">
                          🏢 DN
                        </span>
                      ) : (
                        <span className="text-[11px] bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-1.5 py-0.5 rounded">
                          👤 Cá nhân
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-mono text-xs">{b.tax_code || '—'}</td>
                    <td className="p-3 text-xs">
                      {b.phone && <div>{b.phone}</div>}
                      {b.email && <div className="text-gray-500">{b.email}</div>}
                    </td>
                    <td className="p-3 text-xs text-gray-600 dark:text-gray-400 max-w-xs truncate">
                      {b.address || '—'}
                    </td>
                    <td className="p-3 text-xs">
                      {b.customer_id ? (
                        <span className="text-emerald-600 dark:text-emerald-400">✓ Có</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      {canWrite && (
                        <button
                          onClick={() => openEdit(b)}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline mr-2"
                        >
                          Sửa
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(b.id)}
                          className="text-xs text-red-600 dark:text-red-400 hover:underline"
                        >
                          Xoá
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function BuyerForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial: Buyer | null
  onCancel: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    id: initial?.id || undefined,
    customer_id: initial?.customer_id ?? null,
    buyer_type: initial?.buyer_type ?? ('ca_nhan' as const),
    name: initial?.name ?? '',
    tax_code: initial?.tax_code ?? '',
    address: initial?.address ?? '',
    email: initial?.email ?? '',
    phone: initial?.phone ?? '',
    bank_account: initial?.bank_account ?? '',
    bank_name: initial?.bank_name ?? '',
    representative_name: initial?.representative_name ?? '',
    buyer_code: initial?.buyer_code ?? '',
    notes: initial?.notes ?? '',
    sync_to_customers: !initial?.customer_id,
  })
  const [saving, setSaving] = useState(false)
  const [lookingUp, setLookingUp] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lookupMsg, setLookupMsg] = useState<string | null>(null)

  async function lookupTaxCode() {
    if (!form.tax_code.trim()) {
      setError('Nhập MST trước khi tra cứu')
      return
    }
    setLookingUp(true)
    setLookupMsg(null)
    setError(null)
    const res = await fetch('/api/invoices/tax-lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tax_code: form.tax_code.trim() }),
    })
    const json = await res.json()
    if (json.found) {
      setForm({
        ...form,
        name: form.name || json.name,
        address: form.address || json.address || '',
        representative_name: form.representative_name || json.representative_name || '',
        buyer_type: 'doanh_nghiep',
      })
      setLookupMsg('✓ Đã điền tự động từ MST. Kiểm tra lại trước khi lưu.')
    } else {
      setLookupMsg('⚠ ' + (json.message || 'Không tra được — vui lòng nhập tay.'))
    }
    setLookingUp(false)
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setError('Nhập tên người mua')
      return
    }
    setSaving(true)
    setError(null)
    const res = await fetch('/api/invoices/buyers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        tax_code: form.tax_code.trim() || null,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(typeof json.error === 'string' ? json.error : JSON.stringify(json.error))
      setSaving(false)
      return
    }
    onSaved()
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 shadow-sm">
      <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">
          {initial?.id ? '✏️ Sửa người mua' : '➕ Tạo người mua'}
        </h2>
        <button onClick={onCancel} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">✕</button>
      </div>

      <div className="p-5 space-y-4">
        {/* Loại */}
        <div>
          <label className="text-xs block mb-1.5 text-gray-700 dark:text-gray-300 font-medium">Loại người mua</label>
          <div className="flex gap-2">
            {(['ca_nhan', 'doanh_nghiep'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setForm({ ...form, buyer_type: t })}
                className={`flex-1 border-2 rounded-lg p-3 text-left transition-all ${
                  form.buyer_type === t
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-amber-300'
                }`}
              >
                <div className="font-semibold text-sm">{t === 'ca_nhan' ? '👤 Cá nhân' : '🏢 Doanh nghiệp'}</div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400">
                  {t === 'ca_nhan' ? 'Người mua không có MST' : 'Có MST — bắt buộc khai trên HĐ'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* MST + tra cứu */}
        {form.buyer_type === 'doanh_nghiep' && (
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-3">
            <label className="text-xs block mb-1.5 text-blue-900 dark:text-blue-300 font-semibold">
              🔍 Mã số thuế — tra cứu tự động
            </label>
            <div className="flex gap-2">
              <input
                value={form.tax_code}
                onChange={(e) => setForm({ ...form, tax_code: e.target.value.replace(/\s/g, '') })}
                placeholder="0301234567"
                className="flex-1 border border-blue-300 dark:border-blue-700 bg-white dark:bg-gray-800 rounded px-3 py-2 text-sm"
              />
              <button
                onClick={lookupTaxCode}
                disabled={lookingUp || !form.tax_code.trim()}
                className="bg-blue-600 text-white rounded px-4 text-sm font-semibold whitespace-nowrap disabled:opacity-50"
              >
                {lookingUp ? '⏳' : '🔍 Tra cứu'}
              </button>
            </div>
            {lookupMsg && (
              <p className="text-xs mt-2 text-blue-900 dark:text-blue-300">{lookupMsg}</p>
            )}
            <p className="text-[11px] text-blue-700 dark:text-blue-400 mt-1">
              Nhập MST → bấm Tra cứu để tự điền tên DN, địa chỉ, người đại diện.
            </p>
          </div>
        )}

        {/* Form chính */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field
            label={form.buyer_type === 'doanh_nghiep' ? 'Tên doanh nghiệp' : 'Tên người mua'}
            value={form.name}
            onChange={(v) => setForm({ ...form, name: v })}
            required
          />
          <Field
            label="Địa chỉ"
            value={form.address}
            onChange={(v) => setForm({ ...form, address: v })}
          />
          <Field
            label="SĐT"
            value={form.phone}
            onChange={(v) => setForm({ ...form, phone: v })}
          />
          <Field
            label="Email"
            value={form.email}
            onChange={(v) => setForm({ ...form, email: v })}
            type="email"
            help="Dùng để gửi HĐ điện tử cho khách"
          />
          {form.buyer_type === 'doanh_nghiep' && (
            <Field
              label="Người đại diện"
              value={form.representative_name}
              onChange={(v) => setForm({ ...form, representative_name: v })}
            />
          )}
          <Field
            label="Mã KH nội bộ (tuỳ chọn)"
            value={form.buyer_code}
            onChange={(v) => setForm({ ...form, buyer_code: v })}
            placeholder="VD: KH001"
          />
          <Field
            label="Tên ngân hàng"
            value={form.bank_name}
            onChange={(v) => setForm({ ...form, bank_name: v })}
          />
          <Field
            label="Số tài khoản"
            value={form.bank_account}
            onChange={(v) => setForm({ ...form, bank_account: v.replace(/\s/g, '') })}
          />
        </div>

        <div>
          <label className="text-xs block mb-1 text-gray-700 dark:text-gray-300">Ghi chú</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded px-3 py-2 text-sm"
          />
        </div>

        {!initial?.customer_id && (
          <label className="flex items-start gap-2 cursor-pointer bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-lg p-3">
            <input
              type="checkbox"
              checked={form.sync_to_customers}
              onChange={(e) => setForm({ ...form, sync_to_customers: e.target.checked })}
              className="mt-0.5"
            />
            <span>
              <span className="text-sm text-emerald-900 dark:text-emerald-300 font-semibold">
                🔄 Đồng bộ vào module Khách hàng
              </span>
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block">
                Tạo / liên kết với hồ sơ trong /admin/khach-hang để dùng chung dữ liệu.
              </span>
            </span>
          </label>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 rounded-lg p-3 text-sm">
            ⚠ {error}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg px-5 py-2 text-sm font-semibold shadow disabled:opacity-50"
          >
            {saving ? 'Đang lưu...' : initial?.id ? 'Cập nhật' : 'Tạo người mua'}
          </button>
          <button
            onClick={onCancel}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-5 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Huỷ
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  help,
  required,
  type,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  help?: string
  required?: boolean
  type?: string
}) {
  return (
    <label className="block">
      <span className="text-xs block mb-1 text-gray-700 dark:text-gray-300">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      <input
        type={type ?? 'text'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded px-3 py-2 text-sm"
      />
      {help && <span className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 block">{help}</span>}
    </label>
  )
}
