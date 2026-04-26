'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'

type Breed = { id: string; code: string; name_vi: string }

type Row = {
  id: string
  name: string
  gender: 'trong' | 'mai' | 'chua_xac_dinh'
  weight_kg: string
  cost_purchase: string
  color: string
  notes: string
}

const newRow = (): Row => ({
  id: Math.random().toString(36).slice(2),
  name: '',
  gender: 'chua_xac_dinh',
  weight_kg: '',
  cost_purchase: '',
  color: '',
  notes: '',
})

export function BulkChickenForm({ breeds }: { breeds: Breed[] }) {
  const router = useRouter()
  const [defaultBreedId, setDefaultBreedId] = useState('')
  const [defaultSource, setDefaultSource] = useState<'mua' | 'no_tai_trai'>('no_tai_trai')
  const [defaultBirthDate, setDefaultBirthDate] = useState('')
  const [rows, setRows] = useState<Row[]>(Array.from({ length: 5 }, () => newRow()))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)

  function updateRow(id: string, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  function addRows(n: number) {
    setRows((rs) => [...rs, ...Array.from({ length: n }, () => newRow())])
  }

  function removeRow(id: string) {
    setRows((rs) => rs.filter((r) => r.id !== id))
  }

  async function handleSubmit() {
    if (!defaultBreedId) {
      setError('Chọn giống mặc định')
      return
    }
    const payload = {
      default_source: defaultSource,
      auto_assign_cage: true,
      chickens: rows
        .filter((r) => r.name || r.weight_kg || r.color || r.notes) // skip empty rows
        .map((r) => ({
          name: r.name || undefined,
          breed_id: defaultBreedId,
          gender: r.gender,
          source: defaultSource,
          birth_date: defaultBirthDate || undefined,
          weight_kg: r.weight_kg ? parseFloat(r.weight_kg) : undefined,
          cost_purchase: r.cost_purchase ? parseFloat(r.cost_purchase) : undefined,
          color: r.color || undefined,
          notes: r.notes || undefined,
        })),
    }

    if (payload.chickens.length === 0) {
      setError('Cần ít nhất 1 dòng có dữ liệu')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)
    const res = await fetch('/api/chickens/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(typeof json.error === 'string' ? json.error : JSON.stringify(json.error))
      setLoading(false)
      return
    }
    setResult(`✅ Đã tạo ${json.count} con gà. Redirect trong 2s...`)
    setLoading(false)
    setTimeout(() => {
      router.push('/admin/ho-so-ga')
      router.refresh()
    }, 2000)
  }

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="block">
          <span className="block text-sm font-medium mb-1">Giống mặc định *</span>
          <select
            value={defaultBreedId}
            onChange={(e) => setDefaultBreedId(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm"
          >
            <option value="">— Chọn —</option>
            {breeds.map((b) => (
              <option key={b.id} value={b.id}>{b.name_vi}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-sm font-medium mb-1">Nguồn mặc định</span>
          <select
            value={defaultSource}
            onChange={(e) => setDefaultSource(e.target.value as 'mua' | 'no_tai_trai')}
            className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm"
          >
            <option value="no_tai_trai">Nở tại trại</option>
            <option value="mua">Mua từ ngoài</option>
          </select>
        </label>
        <label className="block">
          <span className="block text-sm font-medium mb-1">Ngày sinh chung</span>
          <input
            type="date"
            value={defaultBirthDate}
            onChange={(e) => setDefaultBirthDate(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-gray-50 dark:bg-gray-900 text-xs uppercase text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-2 py-2 text-left w-10">#</th>
              <th className="px-2 py-2 text-left">Tên</th>
              <th className="px-2 py-2 text-left w-32">Giới tính</th>
              <th className="px-2 py-2 text-left w-28">Cân (kg)</th>
              <th className="px-2 py-2 text-left w-32">Giá mua</th>
              <th className="px-2 py-2 text-left w-28">Màu</th>
              <th className="px-2 py-2 text-left">Ghi chú</th>
              <th className="px-2 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className="border-t border-gray-100 dark:border-gray-700">
                <td className="px-2 py-1 text-gray-400 dark:text-gray-500">{i + 1}</td>
                <td className="px-2 py-1">
                  <input
                    value={r.name}
                    onChange={(e) => updateRow(r.id, { name: e.target.value })}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-sm"
                    placeholder="(tuỳ chọn)"
                  />
                </td>
                <td className="px-2 py-1">
                  <select
                    value={r.gender}
                    onChange={(e) => updateRow(r.id, { gender: e.target.value as Row['gender'] })}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-sm"
                  >
                    <option value="chua_xac_dinh">?</option>
                    <option value="trong">Trống</option>
                    <option value="mai">Mái</option>
                  </select>
                </td>
                <td className="px-2 py-1">
                  <input
                    type="number"
                    step="0.1"
                    value={r.weight_kg}
                    onChange={(e) => updateRow(r.id, { weight_kg: e.target.value })}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-sm"
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    type="number"
                    value={r.cost_purchase}
                    onChange={(e) => updateRow(r.id, { cost_purchase: e.target.value })}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-sm"
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    value={r.color}
                    onChange={(e) => updateRow(r.id, { color: e.target.value })}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-sm"
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    value={r.notes}
                    onChange={(e) => updateRow(r.id, { notes: e.target.value })}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-sm"
                  />
                </td>
                <td className="px-2 py-1">
                  <button
                    type="button"
                    onClick={() => removeRow(r.id)}
                    className="text-red-500 hover:bg-red-50 rounded p-1"
                    title="Xóa dòng"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => addRows(5)}
          className="inline-flex items-center gap-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <Plus className="w-4 h-4" /> Thêm 5 dòng
        </button>
        <button
          type="button"
          onClick={() => addRows(20)}
          className="inline-flex items-center gap-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <Plus className="w-4 h-4" /> Thêm 20 dòng
        </button>
        <div className="ml-auto text-sm text-gray-500 dark:text-gray-400 self-center">
          {rows.length} dòng · tối đa 200 dòng/submit
        </div>
      </div>

      {error && <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 text-red-800 dark:text-red-300 rounded p-3 text-sm">{error}</div>}
      {result && <div className="bg-green-50 dark:bg-green-950/40 border border-green-200 text-green-800 dark:text-green-300 rounded p-3 text-sm">{result}</div>}

      <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-3 -mx-4 md:mx-0 md:rounded-lg md:border flex gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || !defaultBreedId}
          className="bg-blue-600 text-white rounded px-6 py-2 font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Đang tạo...' : `Tạo ${rows.filter((r) => r.name || r.weight_kg || r.color).length || rows.length} con gà`}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="border border-gray-300 dark:border-gray-600 rounded px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Hủy
        </button>
      </div>
    </div>
  )
}
