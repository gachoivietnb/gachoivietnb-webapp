'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  breeds: { id: string; code: string; name_vi: string }[]
  availableTags: { id: string; tag_number: string }[]
  availableCages: { id: string; full_code: string }[]
}

export function ChickenCreateForm({ breeds, availableTags, availableCages }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const fd = new FormData(e.currentTarget)
    const payload: Record<string, unknown> = {
      name: fd.get('name') || undefined,
      breed_id: fd.get('breed_id'),
      qr_tag_id: fd.get('qr_tag_id') || undefined,
      cage_id: fd.get('cage_id') || undefined,
      gender: fd.get('gender') || 'chua_xac_dinh',
      birth_date: fd.get('birth_date') || undefined,
      source: fd.get('source') || 'no_tai_trai',
      weight_kg: fd.get('weight_kg') ? parseFloat(fd.get('weight_kg') as string) : undefined,
      color: fd.get('color') || undefined,
      cost_purchase: fd.get('cost_purchase')
        ? parseFloat(fd.get('cost_purchase') as string)
        : undefined,
      notes: fd.get('notes') || undefined,
      auto_assign_cage: fd.get('cage_id') ? false : true,
    }

    const res = await fetch('/api/chickens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json()

    if (!res.ok) {
      setError(
        typeof json.error === 'string'
          ? json.error
          : JSON.stringify(json.error)
      )
      setLoading(false)
      return
    }

    router.push(`/admin/ho-so-ga/${json.data.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 md:p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Tên (tùy chọn)">
          <input name="name" className="input" placeholder="ví dụ: Asil Vàng" />
        </Field>
        <Field label="Giống *">
          <select name="breed_id" required className="input">
            <option value="">— Chọn giống —</option>
            {breeds.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name_vi} ({b.code})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Giới tính">
          <select name="gender" className="input" defaultValue="chua_xac_dinh">
            <option value="chua_xac_dinh">Chưa xác định</option>
            <option value="trong">Trống</option>
            <option value="mai">Mái</option>
          </select>
        </Field>
        <Field label="Ngày sinh">
          <input type="date" name="birth_date" className="input" />
        </Field>
        <Field label="Nguồn *">
          <select name="source" required className="input" defaultValue="no_tai_trai">
            <option value="no_tai_trai">Nở tại trại</option>
            <option value="mua">Mua từ ngoài</option>
          </select>
        </Field>
        <Field label="Cân nặng (kg)">
          <input type="number" name="weight_kg" step="0.1" min="0" className="input" />
        </Field>
        <Field label="Màu lông">
          <input name="color" className="input" placeholder="ví dụ: đỏ mã, ô..." />
        </Field>
        <Field label="Giá mua (VND)">
          <input type="number" name="cost_purchase" min="0" className="input" placeholder="Nếu là gà mua" />
        </Field>
        <Field label="Thẻ QR">
          <select name="qr_tag_id" className="input">
            <option value="">— Không gắn —</option>
            {availableTags.map((t) => (
              <option key={t.id} value={t.id}>Thẻ {t.tag_number}</option>
            ))}
          </select>
        </Field>
        <Field label="Chuồng">
          <select name="cage_id" className="input">
            <option value="">— Tự động chọn —</option>
            {availableCages.map((c) => (
              <option key={c.id} value={c.id}>{c.full_code}</option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Ghi chú">
        <textarea name="notes" rows={3} className="input" placeholder="Ghi chú thêm..." />
      </Field>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 text-red-800 dark:text-red-300 rounded p-3 text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white rounded px-4 py-2 font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Đang tạo...' : 'Tạo hồ sơ gà'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="border border-gray-300 dark:border-gray-600 rounded px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Hủy
        </button>
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          background: white;
        }
      `}</style>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1">{label}</span>
      {children}
    </label>
  )
}
