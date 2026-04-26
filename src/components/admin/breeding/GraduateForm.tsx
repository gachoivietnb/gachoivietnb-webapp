'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'

type Breed = { id: string; code: string; name_vi: string }
type Tag = { id: string; tag_number: string }
type Male = { id: string; chicken_code: string; name: string | null }
type Cage = { id: string; full_code: string }

type Row = {
  id: string
  name: string
  gender: 'trong' | 'mai' | 'chua_xac_dinh'
  qr_tag_id: string
  parent_male_id: string
}

const newRow = (): Row => ({
  id: Math.random().toString(36).slice(2),
  name: '',
  gender: 'chua_xac_dinh',
  qr_tag_id: '',
  parent_male_id: '',
})

export function GraduateForm({
  litterId,
  hatchedCount,
  breeds,
  availableTags,
  males,
  availableCages,
}: {
  litterId: string
  hatchedCount: number
  breeds: Breed[]
  availableTags: Tag[]
  males: Male[]
  availableCages: Cage[]
}) {
  const router = useRouter()
  const [defaultBreedId, setDefaultBreedId] = useState('')
  const [defaultCageId, setDefaultCageId] = useState('')
  const [rows, setRows] = useState<Row[]>(Array.from({ length: Math.min(hatchedCount, 5) }, () => newRow()))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function updateRow(id: string, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  async function handleSubmit() {
    if (!defaultBreedId) return setError('Chọn giống mặc định')
    setLoading(true)
    setError(null)

    const chicks = rows.map((r) => ({
      name: r.name || undefined,
      breed_id: defaultBreedId,
      gender: r.gender,
      qr_tag_id: r.qr_tag_id || undefined,
      parent_male_id: r.parent_male_id || undefined,
      cage_id: defaultCageId || undefined,
    }))

    const res = await fetch(`/api/breeding/litters/${litterId}/graduate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chicks }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(typeof json.error === 'string' ? json.error : JSON.stringify(json.error))
      setLoading(false)
      return
    }
    router.push(`/admin/sinh-san/${litterId}`)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm block mb-1">Giống mặc định *</span>
          <select
            value={defaultBreedId}
            onChange={(e) => setDefaultBreedId(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2"
          >
            <option value="">— Chọn —</option>
            {breeds.map((b) => (
              <option key={b.id} value={b.id}>{b.name_vi}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm block mb-1">Chuồng gán mặc định</span>
          <select
            value={defaultCageId}
            onChange={(e) => setDefaultCageId(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2"
          >
            <option value="">— Giữ chuồng lứa —</option>
            {availableCages.map((c) => (
              <option key={c.id} value={c.id}>{c.full_code}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-gray-50 dark:bg-gray-900 text-xs uppercase text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-2 py-2 w-10">#</th>
              <th className="px-2 py-2 text-left">Tên</th>
              <th className="px-2 py-2 text-left w-28">Giới tính</th>
              <th className="px-2 py-2 text-left w-32">Thẻ QR</th>
              <th className="px-2 py-2 text-left w-36">Bố (đực lứa)</th>
              <th className="px-2 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className="border-t border-gray-100 dark:border-gray-700">
                <td className="px-2 py-1 text-gray-400 dark:text-gray-500 text-center">{i + 1}</td>
                <td className="px-2 py-1">
                  <input
                    value={r.name}
                    onChange={(e) => updateRow(r.id, { name: e.target.value })}
                    placeholder="(tuỳ chọn)"
                    className="w-full border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-sm"
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
                  <select
                    value={r.qr_tag_id}
                    onChange={(e) => updateRow(r.id, { qr_tag_id: e.target.value })}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-sm"
                  >
                    <option value="">—</option>
                    {availableTags.map((t) => (
                      <option key={t.id} value={t.id}>#{t.tag_number}</option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-1">
                  <select
                    value={r.parent_male_id}
                    onChange={(e) => updateRow(r.id, { parent_male_id: e.target.value })}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-sm"
                  >
                    <option value="">—</option>
                    {males.map((m) => (
                      <option key={m.id} value={m.id}>{m.name ?? m.chicken_code}</option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-1">
                  <button
                    onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))}
                    className="text-red-500 hover:bg-red-50 rounded p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setRows([...rows, newRow()])}
          className="inline-flex items-center gap-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <Plus className="w-4 h-4" /> Thêm dòng
        </button>
      </div>

      {error && <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 text-red-800 dark:text-red-300 rounded p-3 text-sm">{error}</div>}

      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={loading || !defaultBreedId}
          className="bg-blue-600 text-white rounded px-6 py-2 font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Đang tốt nghiệp...' : `Tốt nghiệp ${rows.length} con`}
        </button>
        <button
          onClick={() => router.back()}
          className="border border-gray-300 dark:border-gray-600 rounded px-4 py-2"
        >
          Hủy
        </button>
      </div>
    </div>
  )
}
