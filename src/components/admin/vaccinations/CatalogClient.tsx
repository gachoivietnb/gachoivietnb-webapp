'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ROUTE_META, VACCINE_TYPE_META, type Vaccine, type VaccineRoute, type VaccineType } from '@/lib/vaccinations/types'

export function CatalogClient({
  initial,
  canWrite,
  canDelete,
}: {
  initial: Vaccine[]
  canWrite: boolean
  canDelete: boolean
}) {
  const router = useRouter()
  const [list, setList] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Vaccine | null>(null)

  async function handleDelete(id: string) {
    if (!confirm('Xóa vaccine này khỏi catalog?')) return
    const res = await fetch(`/api/vaccines?id=${id}`, { method: 'DELETE' })
    if (!res.ok) { alert('Lỗi xóa'); return }
    setList(list.filter((v) => v.id !== id))
    router.refresh()
  }

  if (showForm) {
    return (
      <VaccineForm
        editing={editing}
        onCancel={() => { setShowForm(false); setEditing(null) }}
        onSaved={async () => {
          setShowForm(false); setEditing(null)
          const res = await fetch('/api/vaccines')
          const j = await res.json()
          setList(j.vaccines || [])
          router.refresh()
        }}
      />
    )
  }

  return (
    <div className="space-y-4">
      {canWrite && (
        <div className="flex justify-end">
          <button
            onClick={() => { setEditing(null); setShowForm(true) }}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg px-4 py-2 text-sm font-bold shadow"
          >
            + Thêm vaccine
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {list.map((v) => (
          <div
            key={v.id}
            className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-lg transition"
            style={{ borderLeftWidth: '6px', borderLeftColor: v.color_hex || '#3b82f6' }}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="text-3xl">{v.emoji || '💉'}</div>
              <div className="flex gap-1">
                {v.is_required && <span className="text-[10px] bg-red-500 text-white rounded px-1.5 py-0.5 font-bold">⚖️ BẮT BUỘC</span>}
                {!v.is_active && <span className="text-[10px] bg-gray-400 text-white rounded px-1.5 py-0.5">Tắt</span>}
              </div>
            </div>
            <div className="font-mono text-[11px] text-gray-500 mb-0.5">{v.code}</div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100">{v.name_vi}</h3>
            {v.target_disease && (
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">📋 {v.target_disease}</div>
            )}

            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-1 text-[11px]">
              {v.vaccine_type && (
                <div>
                  <span className="text-gray-500">Loại:</span>{' '}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${VACCINE_TYPE_META[v.vaccine_type].cls}`}>
                    {VACCINE_TYPE_META[v.vaccine_type].label}
                  </span>
                </div>
              )}
              <div>
                <span className="text-gray-500">Cách tiêm:</span>{' '}
                <b>{ROUTE_META[v.route].emoji} {ROUTE_META[v.route].label}</b>
              </div>
              {v.dose && <div><span className="text-gray-500">Liều:</span> <b>{v.dose}</b></div>}
              {v.minimum_age_days !== null && (
                <div><span className="text-gray-500">Tuổi tiêm:</span> <b>ngày {v.minimum_age_days}{v.maximum_age_days ? `–${v.maximum_age_days}` : ''}</b></div>
              )}
              {v.repeat_interval_days && (
                <div><span className="text-gray-500">Nhắc lại:</span> <b>mỗi {v.repeat_interval_days} ngày</b></div>
              )}
              {v.recommended_brands && v.recommended_brands.length > 0 && (
                <div><span className="text-gray-500">Hãng:</span> <span className="text-[10px]">{v.recommended_brands.join(' · ')}</span></div>
              )}
              {v.storage_temp && <div><span className="text-gray-500">Bảo quản:</span> {v.storage_temp}</div>}
            </div>

            {v.notes && (
              <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 text-[10px] italic text-gray-600 dark:text-gray-400">
                💡 {v.notes}
              </div>
            )}

            <div className="flex gap-2 mt-3 pt-2 border-t border-gray-100 dark:border-gray-700">
              {canWrite && (
                <button
                  onClick={() => { setEditing(v); setShowForm(true) }}
                  className="text-xs text-blue-600 hover:underline"
                >
                  ✏️ Sửa
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => handleDelete(v.id)}
                  className="text-xs text-red-600 hover:underline ml-auto"
                >
                  🗑 Xóa
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function VaccineForm({
  editing,
  onCancel,
  onSaved,
}: {
  editing: Vaccine | null
  onCancel: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    id: editing?.id,
    code: editing?.code ?? '',
    name_vi: editing?.name_vi ?? '',
    default_age_days: editing?.default_age_days?.toString() ?? '0',
    is_required: editing?.is_required ?? false,
    display_order: editing?.display_order?.toString() ?? '0',
    description: editing?.description ?? '',
    target_disease: editing?.target_disease ?? '',
    target_disease_code: editing?.target_disease_code ?? '',
    vaccine_type: editing?.vaccine_type ?? '',
    route: editing?.route ?? 'bap',
    dose: editing?.dose ?? '',
    recommended_brands: editing?.recommended_brands?.join(', ') ?? '',
    minimum_age_days: editing?.minimum_age_days?.toString() ?? '',
    maximum_age_days: editing?.maximum_age_days?.toString() ?? '',
    repeat_interval_days: editing?.repeat_interval_days?.toString() ?? '',
    contraindications: editing?.contraindications ?? '',
    side_effects: editing?.side_effects ?? '',
    storage_temp: editing?.storage_temp ?? '',
    color_hex: editing?.color_hex ?? '#3b82f6',
    emoji: editing?.emoji ?? '💉',
    notes: editing?.notes ?? '',
    is_active: editing?.is_active ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true); setError(null)
    const res = await fetch('/api/vaccines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        default_age_days: Number(form.default_age_days),
        display_order: Number(form.display_order),
        minimum_age_days: form.minimum_age_days ? Number(form.minimum_age_days) : null,
        maximum_age_days: form.maximum_age_days ? Number(form.maximum_age_days) : null,
        repeat_interval_days: form.repeat_interval_days ? Number(form.repeat_interval_days) : null,
        recommended_brands: form.recommended_brands.split(',').map((s) => s.trim()).filter(Boolean),
        vaccine_type: form.vaccine_type || null,
      }),
    })
    setSaving(false)
    if (!res.ok) { const j = await res.json(); setError(typeof j.error === 'string' ? j.error : 'Lỗi'); return }
    onSaved()
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">{editing ? '✏️ Sửa vaccine' : '➕ Thêm vaccine'}</h2>
        <button onClick={onCancel}>✕</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Inp label="Mã" value={form.code} onChange={(v) => setForm({ ...form, code: v })} placeholder="VD: H5N1" required />
        <Inp label="Tên VN" value={form.name_vi} onChange={(v) => setForm({ ...form, name_vi: v })} required />
        <Inp label="Emoji" value={form.emoji} onChange={(v) => setForm({ ...form, emoji: v })} />
        <Inp label="Bệnh phòng" value={form.target_disease} onChange={(v) => setForm({ ...form, target_disease: v })} />
        <Inp label="Mã bệnh" value={form.target_disease_code} onChange={(v) => setForm({ ...form, target_disease_code: v })} />
        <div>
          <label className="text-xs block mb-1 font-semibold">Loại vaccine</label>
          <select value={form.vaccine_type} onChange={(e) => setForm({ ...form, vaccine_type: e.target.value as VaccineType })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-900">
            <option value="">—</option>
            {Object.entries(VACCINE_TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs block mb-1 font-semibold">Đường tiêm</label>
          <select value={form.route} onChange={(e) => setForm({ ...form, route: e.target.value as VaccineRoute })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-900">
            {Object.entries(ROUTE_META).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
          </select>
        </div>
        <Inp label="Liều" value={form.dose} onChange={(v) => setForm({ ...form, dose: v })} placeholder="0.5ml/con" />
        <Inp label="Tuổi tiêm tối thiểu (ngày)" type="number" value={form.minimum_age_days} onChange={(v) => setForm({ ...form, minimum_age_days: v })} />
        <Inp label="Tuổi tiêm tối đa (ngày)" type="number" value={form.maximum_age_days} onChange={(v) => setForm({ ...form, maximum_age_days: v })} />
        <Inp label="Nhắc lại sau (ngày)" type="number" value={form.repeat_interval_days} onChange={(v) => setForm({ ...form, repeat_interval_days: v })} />
        <Inp label="Mặc định khi nào (ngày)" type="number" value={form.default_age_days} onChange={(v) => setForm({ ...form, default_age_days: v })} />
        <Inp label="Hãng đề xuất (phẩy)" value={form.recommended_brands} onChange={(v) => setForm({ ...form, recommended_brands: v })} placeholder="Vaxxitek, Marexine" />
        <Inp label="Bảo quản" value={form.storage_temp} onChange={(v) => setForm({ ...form, storage_temp: v })} placeholder="2-8°C" />
        <Inp label="Màu hex" value={form.color_hex} onChange={(v) => setForm({ ...form, color_hex: v })} placeholder="#dc2626" />
        <div className="flex items-center gap-3 pt-6">
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" checked={form.is_required} onChange={(e) => setForm({ ...form, is_required: e.target.checked })} />
            Bắt buộc
          </label>
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            Đang dùng
          </label>
        </div>
      </div>
      <Inp label="Tác dụng phụ" value={form.side_effects} onChange={(v) => setForm({ ...form, side_effects: v })} />
      <Inp label="Chống chỉ định" value={form.contraindications} onChange={(v) => setForm({ ...form, contraindications: v })} />
      <Inp label="Mô tả" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
      <Inp label="Ghi chú thực hành" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">⚠ {error}</div>}
      <div className="flex gap-2">
        <button onClick={handleSave} disabled={saving} className="bg-emerald-500 text-white rounded-lg px-5 py-2 text-sm font-bold disabled:opacity-50">{saving ? 'Đang lưu...' : 'Lưu'}</button>
        <button onClick={onCancel} className="border border-gray-300 rounded-lg px-5 py-2 text-sm hover:bg-gray-50">Hủy</button>
      </div>
    </div>
  )
}

function Inp({ label, value, onChange, type = 'text', placeholder, required }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-xs block mb-1 font-semibold">{label}{required && <span className="text-red-500"> *</span>}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-900" />
    </label>
  )
}
