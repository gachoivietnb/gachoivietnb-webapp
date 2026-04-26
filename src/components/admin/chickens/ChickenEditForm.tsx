'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Chicken = {
  id: string
  chicken_code: string
  name: string | null
  breed_id: string
  cage_id: string | null
  gender: string
  birth_date: string | null
  source: string
  weight_kg: number | null
  color: string | null
  cost_purchase: number | null
  status: string
  is_for_sale: boolean
  listed_price: number | null
  description: string | null
  notes: string | null
}

type Breed = { id: string; code: string; name_vi: string }
type Cage = { id: string; full_code: string; status: string }

export function ChickenEditForm({
  chicken,
  breeds,
  cages,
}: {
  chicken: Chicken
  breeds: Breed[]
  cages: Cage[]
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData(e.currentTarget)
    const payload: Record<string, unknown> = {
      name: fd.get('name') || null,
      breed_id: fd.get('breed_id'),
      cage_id: fd.get('cage_id') || null,
      gender: fd.get('gender'),
      birth_date: fd.get('birth_date') || null,
      source: fd.get('source'),
      weight_kg: fd.get('weight_kg') ? parseFloat(fd.get('weight_kg') as string) : null,
      color: fd.get('color') || null,
      cost_purchase: fd.get('cost_purchase') ? parseFloat(fd.get('cost_purchase') as string) : null,
      status: fd.get('status'),
      is_for_sale: fd.get('is_for_sale') === 'on',
      listed_price: fd.get('listed_price') ? parseFloat(fd.get('listed_price') as string) : null,
      description: fd.get('description') || null,
      notes: fd.get('notes') || null,
    }

    const res = await fetch(`/api/chickens/${chicken.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(typeof json.error === 'string' ? json.error : JSON.stringify(json.error))
      setLoading(false)
      return
    }
    router.push(`/admin/ho-so-ga/${chicken.id}`)
    router.refresh()
  }

  async function handleDelete() {
    if (!confirm(`Xoá/loại thải con gà ${chicken.chicken_code}? Thao tác này sẽ set status=loại thải (chu_trai có thể hard delete).`))
      return
    setDeleting(true)
    const res = await fetch(`/api/chickens/${chicken.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setError(typeof json.error === 'string' ? json.error : 'Xóa thất bại')
      setDeleting(false)
      return
    }
    router.push('/admin/ho-so-ga')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 md:p-6">
      <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 rounded p-3 text-sm text-blue-900">
        Mã: <strong>{chicken.chicken_code}</strong> (không đổi được)
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Tên">
          <input name="name" defaultValue={chicken.name ?? ''} className="input" />
        </Field>
        <Field label="Giống *">
          <select name="breed_id" required defaultValue={chicken.breed_id} className="input">
            {breeds.map((b) => (
              <option key={b.id} value={b.id}>{b.name_vi} ({b.code})</option>
            ))}
          </select>
        </Field>
        <Field label="Giới tính">
          <select name="gender" defaultValue={chicken.gender} className="input">
            <option value="chua_xac_dinh">Chưa xác định</option>
            <option value="trong">Trống</option>
            <option value="mai">Mái</option>
          </select>
        </Field>
        <Field label="Ngày sinh">
          <input type="date" name="birth_date" defaultValue={chicken.birth_date ?? ''} className="input" />
        </Field>
        <Field label="Trạng thái">
          <select name="status" defaultValue={chicken.status} className="input">
            <option value="dang_nuoi">Đang nuôi</option>
            <option value="dang_cach_ly">Cách ly</option>
            <option value="da_ban">Đã bán</option>
            <option value="chet">Đã chết</option>
            <option value="loai_thai">Loại thải</option>
          </select>
        </Field>
        <Field label="Nguồn">
          <select name="source" defaultValue={chicken.source} className="input">
            <option value="no_tai_trai">Nở tại trại</option>
            <option value="mua">Mua từ ngoài</option>
          </select>
        </Field>
        <Field label="Cân nặng (kg)">
          <input type="number" name="weight_kg" step="0.1" min="0" defaultValue={chicken.weight_kg ?? ''} className="input" />
        </Field>
        <Field label="Màu">
          <input name="color" defaultValue={chicken.color ?? ''} className="input" />
        </Field>
        <Field label="Giá mua">
          <input type="number" name="cost_purchase" min="0" defaultValue={chicken.cost_purchase ?? ''} className="input" />
        </Field>
        <Field label="Chuồng">
          <select name="cage_id" defaultValue={chicken.cage_id ?? ''} className="input">
            <option value="">— Không —</option>
            {cages.map((c) => (
              <option key={c.id} value={c.id}>{c.full_code} ({c.status})</option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Mô tả (hiển thị trên trang bio)">
        <textarea name="description" defaultValue={chicken.description ?? ''} rows={4} className="input" />
      </Field>

      <Field label="Ghi chú nội bộ">
        <textarea name="notes" defaultValue={chicken.notes ?? ''} rows={2} className="input" />
      </Field>

      <div className="border-t pt-4">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="is_for_sale" defaultChecked={chicken.is_for_sale} />
          <span className="text-sm font-medium">Đang bán</span>
        </label>
        <div className="mt-2">
          <Field label="Giá niêm yết (VND)">
            <input type="number" name="listed_price" min="0" defaultValue={chicken.listed_price ?? ''} className="input" />
          </Field>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 text-red-800 dark:text-red-300 rounded p-3 text-sm">{error}</div>
      )}

      <div className="flex gap-2 pt-2 flex-wrap">
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white rounded px-4 py-2 font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="border border-gray-300 dark:border-gray-600 rounded px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Hủy
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="ml-auto border border-red-300 text-red-600 dark:text-red-400 rounded px-4 py-2 hover:bg-red-50 disabled:opacity-50"
        >
          {deleting ? 'Đang xóa...' : '🗑️ Xóa / Loại thải'}
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
