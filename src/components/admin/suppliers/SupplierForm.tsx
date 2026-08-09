'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CATEGORY_META, type SupplierCategory, type SupplierStat } from '@/lib/suppliers/types'

export function SupplierForm({ editing }: { editing: SupplierStat | null }) {
  const router = useRouter()
  const [form, setForm] = useState({
    id: editing?.id,
    name: editing?.name ?? '',
    supplier_category: editing?.supplier_category ?? ('khac' as SupplierCategory),
    contact_person: editing?.contact_person ?? '',
    phone: editing?.phone ?? '',
    zalo: editing?.zalo ?? '',
    email: editing?.email ?? '',
    facebook: '',
    website: '',
    address: editing?.address ?? '',
    province: editing?.province ?? '',
    map_url: '',
    tax_code: editing?.tax_code ?? '',
    bank_name: '',
    bank_account: '',
    bank_branch: '',
    products_summary: editing?.products_summary ?? '',
    payment_terms: editing?.payment_terms ?? '',
    credit_limit: editing?.credit_limit?.toString() ?? '0',
    rating: editing?.rating ?? null as number | null,
    tags: editing?.tags?.join(', ') ?? '',
    avatar_url: editing?.avatar_url ?? '',
    is_active: editing?.is_active ?? true,
    notes: editing?.notes ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!form.name.trim()) { setError('Nhập tên NCC'); return }
    setSaving(true); setError(null)
    const res = await fetch('/api/suppliers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        credit_limit: Number(form.credit_limit || 0),
        rating: form.rating,
        tags: form.tags.split(',').map((s) => s.trim()).filter(Boolean),
      }),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { setError(typeof json.error === 'string' ? json.error : 'Lỗi'); return }
    router.push(`/admin/nha-cung-cap/${json.supplier.id}`)
    router.refresh()
  }

  const cm = CATEGORY_META[form.supplier_category]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        {/* Loại NCC */}
        <Card title="① Phân loại NCC" required>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {(Object.keys(CATEGORY_META) as SupplierCategory[]).map((c) => {
              const m = CATEGORY_META[c]
              const active = form.supplier_category === c
              return (
                <button
                  key={c}
                  onClick={() => setForm({ ...form, supplier_category: c })}
                  className={`text-left rounded-xl p-3 border-2 transition ${
                    active ? `border-transparent bg-gradient-to-br ${m.gradient} text-white shadow-md` : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                  }`}
                >
                  <div className="text-2xl">{m.emoji}</div>
                  <div className={`text-xs font-bold mt-1 ${active ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>{m.label}</div>
                  <div className={`text-[10px] mt-0.5 ${active ? 'text-white/80' : 'text-gray-500'}`}>{m.desc}</div>
                </button>
              )
            })}
          </div>
        </Card>

        {/* Thông tin cơ bản */}
        <Card title="② Thông tin liên hệ" required>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Inp label="Tên NCC *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="VD: Trại gà Hùng Cường" />
            <Inp label="Người liên hệ" value={form.contact_person} onChange={(v) => setForm({ ...form, contact_person: v })} placeholder="Anh Hùng" />
            <Inp label="SĐT" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="0933..." />
            <Inp label="Zalo" value={form.zalo} onChange={(v) => setForm({ ...form, zalo: v })} />
            <Inp label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} type="email" />
            <Inp label="Website" value={form.website} onChange={(v) => setForm({ ...form, website: v })} placeholder="https://..." />
            <Inp label="Facebook" value={form.facebook} onChange={(v) => setForm({ ...form, facebook: v })} />
            <Inp label="Tỉnh/Thành" value={form.province} onChange={(v) => setForm({ ...form, province: v })} placeholder="Ninh Bình" />
            <Inp label="Địa chỉ chi tiết" value={form.address} onChange={(v) => setForm({ ...form, address: v })} className="md:col-span-2" />
            <Inp label="Link Google Maps" value={form.map_url} onChange={(v) => setForm({ ...form, map_url: v })} className="md:col-span-2" />
          </div>
        </Card>

        {/* Tài chính */}
        <Card title="③ Tài chính & thanh toán">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Inp label="Mã số thuế (MST)" value={form.tax_code} onChange={(v) => setForm({ ...form, tax_code: v })} />
            <Inp label="Tên ngân hàng" value={form.bank_name} onChange={(v) => setForm({ ...form, bank_name: v })} placeholder="Vietcombank" />
            <Inp label="Số tài khoản" value={form.bank_account} onChange={(v) => setForm({ ...form, bank_account: v })} />
            <Inp label="Chi nhánh" value={form.bank_branch} onChange={(v) => setForm({ ...form, bank_branch: v })} />
            <Inp label="Điều khoản thanh toán" value={form.payment_terms} onChange={(v) => setForm({ ...form, payment_terms: v })} placeholder="Trả ngay / Công nợ 30 ngày" />
            <Inp label="Hạn mức công nợ (đ)" type="number" value={form.credit_limit} onChange={(v) => setForm({ ...form, credit_limit: v })} step="1" />
          </div>
        </Card>

        {/* Sản phẩm + đánh giá */}
        <Card title="④ Sản phẩm cung cấp & đánh giá">
          <div className="space-y-3">
            <div>
              <label className="text-xs block mb-1 font-semibold">📦 Danh mục sản phẩm chính</label>
              <textarea
                value={form.products_summary}
                onChange={(e) => setForm({ ...form, products_summary: e.target.value })}
                rows={2}
                placeholder="VD: Cám gà thịt + cám đẻ + cám trộn premix"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-900"
              />
            </div>
            <div>
              <label className="text-xs block mb-1 font-semibold">🏷 Tags (phẩy phân cách)</label>
              <input
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="uy tín, giá tốt, giao hàng nhanh"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-900"
              />
            </div>
            <div>
              <label className="text-xs block mb-1 font-semibold">⭐ Đánh giá</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((r) => (
                  <button
                    key={r}
                    onClick={() => setForm({ ...form, rating: form.rating === r ? null : r })}
                    className="text-2xl"
                  >
                    {(form.rating ?? 0) >= r ? '⭐' : '☆'}
                  </button>
                ))}
                {form.rating && <span className="text-xs text-gray-500 ml-2">{form.rating}/5 sao</span>}
              </div>
            </div>
            <div>
              <label className="text-xs block mb-1 font-semibold">📝 Ghi chú</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                placeholder="Ưu nhược điểm, kinh nghiệm làm việc với NCC này..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-900"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              <span className="text-sm">✅ Đang hoạt động (xuất hiện trong dropdown khi tạo phiếu mua)</span>
            </label>
          </div>
        </Card>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">⚠ {error}</div>}
      </div>

      {/* Sidebar preview */}
      <div>
        <div className="sticky top-4">
          <div className={`rounded-xl overflow-hidden border-2 ${cm.borderCls} bg-white dark:bg-gray-800 shadow-md`}>
            <div className={`h-3 bg-gradient-to-r ${cm.gradient}`} />
            <div className="p-4">
              <div className="text-xs text-gray-500 mb-1">Preview NCC</div>
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${cm.gradient} text-white flex items-center justify-center text-2xl`}>
                  {cm.emoji}
                </div>
                <div>
                  <h3 className="font-bold">{form.name || 'Tên NCC'}</h3>
                  <div className="text-xs text-gray-500">{cm.label}</div>
                </div>
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                {form.contact_person && <div>👤 {form.contact_person}</div>}
                {form.phone && <div>📞 {form.phone}</div>}
                {form.address && <div>📍 {form.address}</div>}
                {form.products_summary && <div className="italic">📦 {form.products_summary}</div>}
              </div>
              {form.rating && (
                <div className="mt-2 text-amber-600 font-bold text-sm">{'⭐'.repeat(form.rating)}</div>
              )}
            </div>
          </div>

          <div className="mt-3 space-y-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg py-2.5 text-sm font-bold shadow disabled:opacity-50"
            >
              {saving ? 'Đang lưu...' : editing ? '💾 Cập nhật' : '➕ Tạo NCC'}
            </button>
            <button
              onClick={() => router.back()}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Hủy
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Card({ title, required, children }: { title: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
      <h3 className="font-bold text-sm mb-3">{title}{required && <span className="text-red-500 ml-1">*</span>}</h3>
      {children}
    </div>
  )
}

function Inp({ label, value, onChange, placeholder, type = 'text', step, className }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; step?: string; className?: string
}) {
  return (
    <label className={`block ${className ?? ''}`}>
      <span className="text-xs block mb-1 font-semibold">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        step={step}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900"
      />
    </label>
  )
}
