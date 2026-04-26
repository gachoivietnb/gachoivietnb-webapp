'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Copy } from 'lucide-react'

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

const QUICK_COLORS = ['điều', 'tía', 'ô', 'xám', 'nhạn', 'chuối', 'bông', 'đen', 'trắng']

export function BulkChickenForm({ breeds }: { breeds: Breed[] }) {
  const router = useRouter()
  const [defaultBreedId, setDefaultBreedId] = useState('')
  const [defaultSource, setDefaultSource] = useState<'mua' | 'no_tai_trai'>('no_tai_trai')
  const [defaultBirthDate, setDefaultBirthDate] = useState('')
  const [defaultGender, setDefaultGender] = useState<'trong' | 'mai' | 'chua_xac_dinh'>('chua_xac_dinh')
  const [rows, setRows] = useState<Row[]>(Array.from({ length: 5 }, () => newRow()))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)

  function updateRow(id: string, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  function addRows(n: number) {
    setRows((rs) => [...rs, ...Array.from({ length: n }, () => ({ ...newRow(), gender: defaultGender }))])
  }

  function removeRow(id: string) {
    setRows((rs) => rs.filter((r) => r.id !== id))
  }

  function applyGenderToAll() {
    setRows((rs) => rs.map((r) => ({ ...r, gender: defaultGender })))
  }

  function clearEmpty() {
    setRows((rs) => {
      const filled = rs.filter((r) => r.name || r.weight_kg || r.color || r.notes || r.cost_purchase)
      return filled.length > 0 ? filled : [newRow()]
    })
  }

  const filledCount = useMemo(
    () => rows.filter((r) => r.name || r.weight_kg || r.color || r.notes || r.cost_purchase).length,
    [rows]
  )
  const breedName = breeds.find((b) => b.id === defaultBreedId)?.name_vi

  async function handleSubmit() {
    if (!defaultBreedId) {
      setError('Cần chọn giống mặc định trước khi tạo')
      return
    }
    const payload = {
      default_source: defaultSource,
      auto_assign_cage: true,
      chickens: rows
        .filter((r) => r.name || r.weight_kg || r.color || r.notes || r.cost_purchase)
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
      setError('Cần ít nhất 1 dòng có dữ liệu (tên / cân / màu / ghi chú)')
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
    setResult(`Đã tạo thành công ${json.count} con gà · đang chuyển về danh sách...`)
    setLoading(false)
    setTimeout(() => {
      router.push('/admin/ho-so-ga')
      router.refresh()
    }, 1800)
  }

  return (
    <div className="space-y-4 pb-24">
      {/* SECTION 1 — Defaults */}
      <section className="relative overflow-hidden bg-white dark:bg-gray-800 ring-1 ring-blue-200 dark:ring-blue-900 rounded-2xl">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
        <div className="p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xl shrink-0">
              ⚙️
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-0.5">
                Thiết lập mặc định cho cả lô
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Áp dụng chung cho tất cả dòng phía dưới — bạn chỉ cần điền chi tiết riêng từng con bên bảng.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Breed */}
            <label className="block">
              <span className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Giống <span className="text-rose-500">*</span>
              </span>
              <select
                value={defaultBreedId}
                onChange={(e) => setDefaultBreedId(e.target.value)}
                className={
                  'w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 ' +
                  (defaultBreedId
                    ? 'border-emerald-300 dark:border-emerald-800'
                    : 'border-amber-300 dark:border-amber-800')
                }
              >
                <option value="">— Chọn giống —</option>
                {breeds.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name_vi}
                  </option>
                ))}
              </select>
              {!defaultBreedId && (
                <p className="text-[10.5px] text-amber-600 dark:text-amber-400 mt-1">
                  ⚠️ Bắt buộc — chưa chọn sẽ không tạo được
                </p>
              )}
            </label>

            {/* Source */}
            <div>
              <span className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Nguồn
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setDefaultSource('no_tai_trai')}
                  className={
                    'rounded-lg px-2 py-2 text-xs font-semibold border transition ' +
                    (defaultSource === 'no_tai_trai'
                      ? 'bg-emerald-500 border-emerald-500 text-white shadow'
                      : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-emerald-400')
                  }
                >
                  🥚 Nở tại trại
                </button>
                <button
                  type="button"
                  onClick={() => setDefaultSource('mua')}
                  className={
                    'rounded-lg px-2 py-2 text-xs font-semibold border transition ' +
                    (defaultSource === 'mua'
                      ? 'bg-orange-500 border-orange-500 text-white shadow'
                      : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-orange-400')
                  }
                >
                  🛒 Mua ngoài
                </button>
              </div>
            </div>

            {/* Birth date */}
            <label className="block">
              <span className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Ngày sinh chung
              </span>
              <input
                type="date"
                value={defaultBirthDate}
                onChange={(e) => setDefaultBirthDate(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900"
              />
              <p className="text-[10.5px] text-gray-500 mt-1">
                Bỏ trống nếu mỗi con sinh khác ngày
              </p>
            </label>

            {/* Default gender + apply */}
            <div>
              <span className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Giới tính mặc định
              </span>
              <div className="flex gap-1">
                {([
                  ['trong', '♂', 'sky'],
                  ['mai', '♀', 'pink'],
                  ['chua_xac_dinh', '?', 'gray'],
                ] as const).map(([val, sym, tone]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setDefaultGender(val)}
                    className={
                      'flex-1 rounded-lg px-1 py-1.5 text-sm font-bold border transition ' +
                      (defaultGender === val
                        ? tone === 'sky'
                          ? 'bg-sky-500 border-sky-500 text-white'
                          : tone === 'pink'
                            ? 'bg-pink-500 border-pink-500 text-white'
                            : 'bg-gray-500 border-gray-500 text-white'
                        : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400')
                    }
                  >
                    {sym}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={applyGenderToAll}
                className="text-[10.5px] text-blue-600 dark:text-blue-400 hover:underline mt-1 inline-flex items-center gap-1"
              >
                <Copy className="w-3 h-3" /> Áp cho tất cả dòng
              </button>
            </div>
          </div>

          {defaultBreedId && (
            <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-full px-3 py-1">
              ✓ Sẵn sàng — sẽ tạo <strong>{filledCount || rows.length}</strong> con
              <span className="opacity-70">giống <strong>{breedName}</strong></span>
              <span className="opacity-70">
                · {defaultSource === 'no_tai_trai' ? 'nở tại trại' : 'mua ngoài'}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* SECTION 2 — Rows */}
      <section className="relative overflow-hidden bg-white dark:bg-gray-800 ring-1 ring-emerald-200 dark:ring-emerald-900 rounded-2xl">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
        <div className="p-5">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl shrink-0">
              📋
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-0.5">
                Danh sách gà ({filledCount || 0}/{rows.length} dòng đã điền)
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Tên có thể để trống — hệ thống tự sinh mã <code className="bg-gray-100 dark:bg-gray-900 px-1 rounded">GAxxxx</code>. Dòng trống sẽ tự bỏ qua khi submit.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto -mx-5 md:mx-0">
            <table className="w-full text-sm min-w-[920px]">
              <thead className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 text-[11px] uppercase text-emerald-800 dark:text-emerald-300">
                <tr>
                  <th className="px-2 py-2 text-left w-10">#</th>
                  <th className="px-2 py-2 text-left">Tên</th>
                  <th className="px-2 py-2 text-left w-24">Giới tính</th>
                  <th className="px-2 py-2 text-left w-24">Cân (kg)</th>
                  <th className="px-2 py-2 text-left w-32">Giá mua (đ)</th>
                  <th className="px-2 py-2 text-left w-28">Màu</th>
                  <th className="px-2 py-2 text-left">Ghi chú</th>
                  <th className="px-2 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const filled = r.name || r.weight_kg || r.color || r.notes || r.cost_purchase
                  return (
                    <tr
                      key={r.id}
                      className={
                        'border-t border-gray-100 dark:border-gray-700 transition ' +
                        (filled
                          ? 'bg-emerald-50/40 dark:bg-emerald-950/10'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-900/40')
                      }
                    >
                      <td className="px-2 py-1 text-gray-400 dark:text-gray-500 font-mono text-xs">
                        {i + 1}
                      </td>
                      <td className="px-2 py-1">
                        <input
                          value={r.name}
                          onChange={(e) => updateRow(r.id, { name: e.target.value })}
                          className="w-full border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-900 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 outline-none"
                          placeholder="(tự sinh)"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <div className="flex gap-0.5">
                          {(['trong', 'mai', 'chua_xac_dinh'] as const).map((g) => (
                            <button
                              key={g}
                              type="button"
                              onClick={() => updateRow(r.id, { gender: g })}
                              className={
                                'flex-1 rounded px-1 py-1 text-xs font-bold border transition ' +
                                (r.gender === g
                                  ? g === 'trong'
                                    ? 'bg-sky-500 border-sky-500 text-white'
                                    : g === 'mai'
                                      ? 'bg-pink-500 border-pink-500 text-white'
                                      : 'bg-gray-500 border-gray-500 text-white'
                                  : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-400')
                              }
                              title={g === 'trong' ? 'Trống' : g === 'mai' ? 'Mái' : 'Chưa xác định'}
                            >
                              {g === 'trong' ? '♂' : g === 'mai' ? '♀' : '?'}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          step="0.1"
                          value={r.weight_kg}
                          onChange={(e) => updateRow(r.id, { weight_kg: e.target.value })}
                          className="w-full border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-900 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 outline-none"
                          placeholder="0.0"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          value={r.cost_purchase}
                          onChange={(e) => updateRow(r.id, { cost_purchase: e.target.value })}
                          disabled={defaultSource === 'no_tai_trai'}
                          className="w-full border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-900 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 outline-none disabled:bg-gray-100 dark:disabled:bg-gray-900/50 disabled:text-gray-400"
                          placeholder={defaultSource === 'no_tai_trai' ? '—' : '0'}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          value={r.color}
                          onChange={(e) => updateRow(r.id, { color: e.target.value })}
                          list="color-suggest"
                          className="w-full border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-900 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 outline-none"
                          placeholder="vd: tía"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          value={r.notes}
                          onChange={(e) => updateRow(r.id, { notes: e.target.value })}
                          className="w-full border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-900 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 outline-none"
                          placeholder="(tuỳ chọn)"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <button
                          type="button"
                          onClick={() => removeRow(r.id)}
                          className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded p-1.5 transition"
                          title="Xoá dòng này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <datalist id="color-suggest">
              {QUICK_COLORS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-4">
            <button
              type="button"
              onClick={() => addRows(5)}
              className="inline-flex items-center gap-1 bg-white dark:bg-gray-900 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-lg px-3 py-1.5 text-xs font-semibold hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            >
              <Plus className="w-3.5 h-3.5" /> +5 dòng
            </button>
            <button
              type="button"
              onClick={() => addRows(20)}
              className="inline-flex items-center gap-1 bg-white dark:bg-gray-900 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-lg px-3 py-1.5 text-xs font-semibold hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            >
              <Plus className="w-3.5 h-3.5" /> +20 dòng
            </button>
            <button
              type="button"
              onClick={clearEmpty}
              className="inline-flex items-center gap-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-3 py-1.5 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-900/60"
            >
              🧹 Dọn dòng trống
            </button>
            <span className="ml-auto text-[11px] text-gray-500 dark:text-gray-400 self-center">
              {rows.length} dòng · tối đa 200 / lần submit
            </span>
          </div>
        </div>
      </section>

      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-800 dark:text-rose-300 rounded-xl p-3 text-sm">
          ❌ {error}
        </div>
      )}
      {result && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-900 dark:text-emerald-200 rounded-xl p-3 text-sm font-semibold">
          ✅ {result}
        </div>
      )}

      {/* Sticky action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur border-t border-gray-200 dark:border-gray-700 px-4 py-3 lg:left-64">
        <div className="max-w-6xl mx-auto flex items-center gap-2 flex-wrap">
          <div className="text-xs text-gray-600 dark:text-gray-400 mr-auto">
            Sẽ tạo <strong className="text-gray-900 dark:text-gray-100">{filledCount || 0}</strong> con
            {breedName && <span> · giống <strong>{breedName}</strong></span>}
          </div>
          <button
            type="button"
            onClick={() => router.back()}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Huỷ
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !defaultBreedId || filledCount === 0}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg px-5 py-2 shadow hover:shadow-lg transition"
          >
            {loading ? '⏳ Đang tạo...' : `🚀 Tạo ${filledCount || 0} con gà`}
          </button>
        </div>
      </div>
    </div>
  )
}
