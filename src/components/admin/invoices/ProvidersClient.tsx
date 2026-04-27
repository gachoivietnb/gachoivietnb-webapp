'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PROVIDER_OPTIONS } from '@/lib/invoice-providers/registry'
import type { InvoiceProviderCode } from '@/lib/invoice-providers/types'

type Provider = {
  id: string
  provider_code: InvoiceProviderCode
  name: string
  api_url: string | null
  api_username: string | null
  api_token: string | null
  api_password_encrypted: string | null
  seller_tax_code: string
  seller_name: string
  seller_address: string | null
  seller_phone: string | null
  seller_email: string | null
  seller_bank_account: string | null
  seller_bank_name: string | null
  default_template_code: string | null
  default_invoice_serial: string | null
  signing_serial: string | null
  signing_cert_alias: string | null
  is_default: boolean
  is_active: boolean
  test_mode: boolean
  notes: string | null
}

type Defaults = {
  tax_code: string
  name: string
  address: string
  phone: string
  email: string
  bank_account: string
  bank_name: string
}

export function ProvidersClient({
  initial,
  sellerDefaults,
  canWrite,
  canDelete,
}: {
  initial: Provider[]
  sellerDefaults: Defaults
  canWrite: boolean
  canDelete: boolean
}) {
  const router = useRouter()
  const [providers, setProviders] = useState<Provider[]>(initial)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Provider | null>(null)
  const [testResult, setTestResult] = useState<Record<string, { ok: boolean; message: string }>>({})

  function openNew() {
    setEditing(null)
    setShowForm(true)
  }

  function openEdit(p: Provider) {
    setEditing(p)
    setShowForm(true)
  }

  async function handleSaved(p: Provider) {
    setShowForm(false)
    setEditing(null)
    // Reload list
    const res = await fetch('/api/invoices/providers')
    const json = await res.json()
    setProviders(json.providers || [])
    router.refresh()
  }

  async function handleDelete(id: string) {
    if (!confirm('Xoá NCC này? Các HĐ đã link sẽ giữ nguyên nhưng không thể phát hành mới.')) return
    const res = await fetch(`/api/invoices/providers?id=${id}`, { method: 'DELETE' })
    if (!res.ok) {
      alert('Lỗi: ' + (await res.text()))
      return
    }
    setProviders(providers.filter((p) => p.id !== id))
    router.refresh()
  }

  async function handleTest(id: string) {
    setTestResult({ ...testResult, [id]: { ok: false, message: 'Đang test...' } })
    const res = await fetch('/api/invoices/providers/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    const json = await res.json()
    setTestResult({ ...testResult, [id]: json })
  }

  if (showForm) {
    return (
      <ProviderForm
        initial={editing}
        sellerDefaults={sellerDefaults}
        onCancel={() => {
          setShowForm(false)
          setEditing(null)
        }}
        onSaved={handleSaved}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm text-gray-700 dark:text-gray-300">
            {providers.length === 0
              ? 'Chưa có NCC HĐĐT nào — thêm NCC đầu tiên để bắt đầu phát hành hóa đơn.'
              : `Đã cấu hình ${providers.length} NCC. NCC mặc định sẽ được dùng khi tạo HĐ mới.`}
          </div>
        </div>
        {canWrite && (
          <button
            onClick={openNew}
            className="bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg px-4 py-2 text-sm font-semibold shadow hover:opacity-95"
          >
            + Thêm NCC HĐĐT
          </button>
        )}
      </div>

      {providers.length === 0 ? (
        <EmptyState canWrite={canWrite} onAdd={openNew} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {providers.map((p) => {
            const opt = PROVIDER_OPTIONS.find((o) => o.code === p.provider_code)
            const tr = testResult[p.id]
            return (
              <div
                key={p.id}
                className={`relative border rounded-xl p-4 bg-white dark:bg-gray-800 shadow-sm ${
                  p.is_default ? 'border-amber-400 ring-2 ring-amber-200/50' : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                {p.is_default && (
                  <span className="absolute -top-2 left-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded">
                    ⭐ Mặc định
                  </span>
                )}
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100">{p.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {opt?.label || p.provider_code}
                      {' · '}
                      {p.test_mode ? (
                        <span className="text-blue-600 dark:text-blue-400">🧪 Test mode</span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400">✅ Production</span>
                      )}
                      {!p.is_active && <span className="text-red-600 ml-1">· ⏸ Tắt</span>}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-700 dark:text-gray-300 space-y-0.5 mb-3">
                  <div>
                    <span className="text-gray-500">MST bên bán:</span>{' '}
                    <span className="font-mono">{p.seller_tax_code || '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Tên:</span> {p.seller_name}
                  </div>
                  {p.default_invoice_serial && (
                    <div>
                      <span className="text-gray-500">Ký hiệu:</span>{' '}
                      <span className="font-mono">{p.default_invoice_serial}</span>
                      {p.default_template_code && (
                        <span className="ml-1 font-mono text-gray-500">/ Mẫu {p.default_template_code}</span>
                      )}
                    </div>
                  )}
                </div>

                {tr && (
                  <div
                    className={`text-xs rounded p-2 mb-2 ${
                      tr.ok
                        ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                        : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                    }`}
                  >
                    {tr.message}
                  </div>
                )}

                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => handleTest(p.id)}
                    className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2.5 py-1 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    🔌 Test
                  </button>
                  {canWrite && (
                    <button
                      onClick={() => openEdit(p)}
                      className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2.5 py-1 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      ✏️ Sửa
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="text-xs border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 rounded px-2.5 py-1 hover:bg-red-50 dark:hover:bg-red-950/50"
                    >
                      🗑 Xoá
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function EmptyState({ canWrite, onAdd }: { canWrite: boolean; onAdd: () => void }) {
  return (
    <div className="border-2 border-dashed border-amber-200 dark:border-amber-900 rounded-xl p-8 text-center bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
      <div className="text-5xl mb-3">🧾</div>
      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
        Chưa cấu hình NCC HĐĐT nào
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 max-w-md mx-auto">
        Để bắt đầu phát hành hóa đơn điện tử, hãy thêm 1 nhà cung cấp HĐĐT mà trại của bạn đang
        sử dụng (Viettel, VNPT, MISA…). Có thể bật <b>Test mode</b> để thử trước khi có credential thật.
      </p>
      <div className="flex justify-center gap-2 flex-wrap mb-4">
        {PROVIDER_OPTIONS.map((o) => (
          <span key={o.code} className="text-xs bg-white dark:bg-gray-800 border border-amber-300 dark:border-amber-800 rounded-full px-3 py-1 text-amber-800 dark:text-amber-300">
            {o.label}
          </span>
        ))}
      </div>
      {canWrite && (
        <button
          onClick={onAdd}
          className="bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg px-5 py-2.5 text-sm font-semibold shadow"
        >
          + Thêm NCC đầu tiên
        </button>
      )}
    </div>
  )
}

function ProviderForm({
  initial,
  sellerDefaults,
  onCancel,
  onSaved,
}: {
  initial: Provider | null
  sellerDefaults: Defaults
  onCancel: () => void
  onSaved: (p: Provider) => void
}) {
  const isEdit = Boolean(initial)
  const [form, setForm] = useState({
    id: initial?.id,
    provider_code: initial?.provider_code ?? ('viettel' as InvoiceProviderCode),
    name: initial?.name ?? '',
    api_url: initial?.api_url ?? '',
    api_username: initial?.api_username ?? '',
    api_password: '',
    api_token: initial?.api_token ?? '',
    seller_tax_code: initial?.seller_tax_code ?? sellerDefaults.tax_code,
    seller_name: initial?.seller_name ?? sellerDefaults.name,
    seller_address: initial?.seller_address ?? sellerDefaults.address,
    seller_phone: initial?.seller_phone ?? sellerDefaults.phone,
    seller_email: initial?.seller_email ?? sellerDefaults.email,
    seller_bank_account: initial?.seller_bank_account ?? sellerDefaults.bank_account,
    seller_bank_name: initial?.seller_bank_name ?? sellerDefaults.bank_name,
    default_template_code: initial?.default_template_code ?? '1',
    default_invoice_serial: initial?.default_invoice_serial ?? '',
    signing_serial: initial?.signing_serial ?? '',
    signing_cert_alias: initial?.signing_cert_alias ?? '',
    is_default: initial?.is_default ?? false,
    is_active: initial?.is_active ?? true,
    test_mode: initial?.test_mode ?? true,
    notes: initial?.notes ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const opt = PROVIDER_OPTIONS.find((o) => o.code === form.provider_code)

  async function handleSave() {
    if (!form.seller_tax_code.trim()) {
      setError('Vui lòng nhập MST bên bán')
      return
    }
    if (!form.seller_name.trim()) {
      setError('Vui lòng nhập tên bên bán')
      return
    }
    setSaving(true)
    setError(null)
    const res = await fetch('/api/invoices/providers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        api_password: form.api_password || null,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(typeof json.error === 'string' ? json.error : JSON.stringify(json.error))
      setSaving(false)
      return
    }
    onSaved(json.provider)
    setSaving(false)
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 shadow-sm">
      <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">
          {isEdit ? '✏️ Sửa NCC HĐĐT' : '➕ Thêm NCC HĐĐT'}
        </h2>
        <button onClick={onCancel} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
          ✕
        </button>
      </div>

      <div className="p-5 space-y-5">
        {/* Step 1: NCC */}
        <Section title="① Loại nhà cung cấp" icon="🏢">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {PROVIDER_OPTIONS.map((o) => (
              <button
                key={o.code}
                onClick={() => setForm({ ...form, provider_code: o.code })}
                className={`text-left border-2 rounded-lg p-3 transition-all ${
                  form.provider_code === o.code
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-amber-300'
                }`}
              >
                <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">{o.label}</div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{o.description}</div>
              </button>
            ))}
          </div>
          {opt?.helpUrl && opt.helpUrl !== '#' && (
            <a href={opt.helpUrl} target="_blank" rel="noreferrer" className="text-xs text-amber-700 dark:text-amber-400 hover:underline mt-1 inline-block">
              📖 Trang chủ NCC ↗
            </a>
          )}
        </Section>

        {/* Step 2: API */}
        <Section title="② Kết nối API" icon="🔌">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field
              label="Tên hiển thị"
              value={form.name}
              onChange={(v) => setForm({ ...form, name: v })}
              placeholder="VD: Viettel S-Invoice (chính thức)"
              required
            />
            <Field
              label="API URL"
              value={form.api_url}
              onChange={(v) => setForm({ ...form, api_url: v })}
              placeholder="https://api-vinvoice.viettel.vn"
            />
            <Field
              label="Username"
              value={form.api_username}
              onChange={(v) => setForm({ ...form, api_username: v })}
            />
            <Field
              label={isEdit ? 'Mật khẩu (để trống nếu không đổi)' : 'Mật khẩu'}
              value={form.api_password}
              onChange={(v) => setForm({ ...form, api_password: v })}
              type="password"
              help="Sẽ được mã hoá AES-256 trước khi lưu"
            />
            <Field
              label="API Token (nếu NCC dùng token)"
              value={form.api_token}
              onChange={(v) => setForm({ ...form, api_token: v })}
            />
          </div>
        </Section>

        {/* Step 3: Bên bán */}
        <Section title="③ Thông tin bên bán (in lên HĐ)" icon="🏪" subtitle="Lấy mặc định từ Cài đặt — có thể chỉnh riêng cho NCC này">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field
              label="MST bên bán"
              value={form.seller_tax_code}
              onChange={(v) => setForm({ ...form, seller_tax_code: v.replace(/\s/g, '') })}
              required
              placeholder="0301234567"
            />
            <Field
              label="Tên pháp nhân / trại"
              value={form.seller_name}
              onChange={(v) => setForm({ ...form, seller_name: v })}
              required
            />
            <Field
              label="Địa chỉ"
              value={form.seller_address}
              onChange={(v) => setForm({ ...form, seller_address: v })}
            />
            <Field
              label="SĐT"
              value={form.seller_phone}
              onChange={(v) => setForm({ ...form, seller_phone: v })}
            />
            <Field
              label="Email"
              value={form.seller_email}
              onChange={(v) => setForm({ ...form, seller_email: v })}
            />
            <Field
              label="Tên ngân hàng"
              value={form.seller_bank_name}
              onChange={(v) => setForm({ ...form, seller_bank_name: v })}
            />
            <Field
              label="Số tài khoản"
              value={form.seller_bank_account}
              onChange={(v) => setForm({ ...form, seller_bank_account: v.replace(/\s/g, '') })}
            />
          </div>
        </Section>

        {/* Step 4: Mẫu / Ký hiệu */}
        <Section title="④ Mẫu số & Ký hiệu mặc định" icon="🏷">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field
              label="Mẫu số"
              value={form.default_template_code}
              onChange={(v) => setForm({ ...form, default_template_code: v })}
              placeholder="1"
              help="Theo TT78 thường là 1 (HĐ giá trị gia tăng)"
            />
            <Field
              label="Ký hiệu"
              value={form.default_invoice_serial}
              onChange={(v) => setForm({ ...form, default_invoice_serial: v.toUpperCase() })}
              placeholder="C26TNN"
              help="6 ký tự — VD C26TNN"
            />
            <Field
              label="Serial chữ ký số (HSM)"
              value={form.signing_serial}
              onChange={(v) => setForm({ ...form, signing_serial: v })}
            />
          </div>
        </Section>

        {/* Step 5: Cờ */}
        <Section title="⑤ Cờ trạng thái" icon="🚦">
          <div className="space-y-2">
            <Toggle
              checked={form.test_mode}
              onChange={(v) => setForm({ ...form, test_mode: v })}
              label="🧪 Test mode (mock — không gửi đến NCC thật)"
              help="Bật để test luồng UI khi chưa có credential thật. Phát hành sẽ trả về mã mock."
            />
            <Toggle
              checked={form.is_default}
              onChange={(v) => setForm({ ...form, is_default: v })}
              label="⭐ Đặt làm NCC mặc định"
              help="Sẽ tự chọn khi tạo HĐ mới"
            />
            <Toggle
              checked={form.is_active}
              onChange={(v) => setForm({ ...form, is_active: v })}
              label="✅ Đang hoạt động"
            />
          </div>
        </Section>

        <Section title="⑥ Ghi chú" icon="📝">
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded px-3 py-2 text-sm"
            placeholder="Ghi chú nội bộ về NCC này..."
          />
        </Section>

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
            {saving ? 'Đang lưu...' : isEdit ? 'Cập nhật' : 'Tạo NCC'}
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

function Section({
  title,
  icon,
  subtitle,
  children,
}: {
  title: string
  icon: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-2">
        <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
          <span>{icon}</span>
          {title}
        </h3>
        {subtitle && <p className="text-[11px] text-gray-500 dark:text-gray-400">{subtitle}</p>}
      </div>
      {children}
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
  value: string | null | undefined
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
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded px-3 py-2 text-sm"
      />
      {help && <span className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 block">{help}</span>}
    </label>
  )
}

function Toggle({
  checked,
  onChange,
  label,
  help,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  help?: string
}) {
  return (
    <label className="flex items-start gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 rounded border-gray-300"
      />
      <span>
        <span className="text-sm text-gray-900 dark:text-gray-100">{label}</span>
        {help && <span className="text-[11px] text-gray-500 dark:text-gray-400 block">{help}</span>}
      </span>
    </label>
  )
}
