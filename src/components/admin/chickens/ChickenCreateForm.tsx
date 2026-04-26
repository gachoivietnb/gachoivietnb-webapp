'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  breeds: { id: string; code: string; name_vi: string }[]
  availableTags: { id: string; tag_number: string }[]
  availableCages: { id: string; full_code: string }[]
}

const COLORS = ['đen', 'điều', 'xám', 'tía', 'ô', 'nhạn', 'xanh', 'cú', 'khét', 'vàng']

export function ChickenCreateForm({ breeds, availableTags, availableCages }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    breed_id: '',
    qr_tag_id: '',
    cage_id: '',
    gender: 'chua_xac_dinh' as 'chua_xac_dinh' | 'trong' | 'mai',
    birth_date: '',
    source: 'no_tai_trai' as 'no_tai_trai' | 'mua',
    weight_kg: '',
    color: '',
    cost_purchase: '',
    notes: '',
  })

  function up<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.breed_id) {
      setError('Vui lòng chọn giống gà')
      return
    }
    setLoading(true)
    setError(null)

    const payload: Record<string, unknown> = {
      name: form.name || undefined,
      breed_id: form.breed_id,
      qr_tag_id: form.qr_tag_id || undefined,
      cage_id: form.cage_id || undefined,
      gender: form.gender,
      birth_date: form.birth_date || undefined,
      source: form.source,
      weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : undefined,
      color: form.color || undefined,
      cost_purchase: form.cost_purchase ? parseFloat(form.cost_purchase) : undefined,
      notes: form.notes || undefined,
      auto_assign_cage: !form.cage_id,
    }

    const res = await fetch('/api/chickens', {
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

    router.push(`/admin/ho-so-ga/${json.data.id}`)
    router.refresh()
  }

  const ageMonths = form.birth_date
    ? Math.floor((Date.now() - new Date(form.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 30))
    : null

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-3xl">
      {/* Section 1: Định danh */}
      <Section emoji="🐓" accent="from-blue-500 to-indigo-500" title="Định danh" subtitle="Tên gọi, giống, giới tính">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Tên (tuỳ chọn)" hint="Vd: Hắc Long, Bạch Hổ, Sấm Sét...">
            <input
              value={form.name}
              onChange={(e) => up('name', e.target.value)}
              placeholder="vd: Asil Vàng"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </Field>
          <Field label="Giống *" hint={form.breed_id ? '' : 'Bắt buộc'}>
            <select
              value={form.breed_id}
              onChange={(e) => up('breed_id', e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Chọn giống —</option>
              {breeds.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name_vi} ({b.code})
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mt-3">
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            Giới tính
          </label>
          <div className="flex gap-2 flex-wrap">
            {[
              { v: 'chua_xac_dinh', l: 'Chưa xác định', icon: '?', tone: 'gray' },
              { v: 'trong', l: 'Trống ♂', icon: '♂', tone: 'blue' },
              { v: 'mai', l: 'Mái ♀', icon: '♀', tone: 'pink' },
            ].map((g) => {
              const active = form.gender === g.v
              const cls = active
                ? g.tone === 'blue'
                  ? 'bg-blue-600 text-white border-blue-700 shadow'
                  : g.tone === 'pink'
                    ? 'bg-pink-600 text-white border-pink-700 shadow'
                    : 'bg-gray-600 text-white border-gray-700 shadow'
                : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-400'
              return (
                <button
                  key={g.v}
                  type="button"
                  onClick={() => up('gender', g.v as 'chua_xac_dinh' | 'trong' | 'mai')}
                  className={`text-sm font-semibold rounded-lg px-3 py-1.5 border transition flex items-center gap-1.5 ${cls}`}
                >
                  <span className="text-base leading-none">{g.icon}</span>
                  {g.l}
                </button>
              )
            })}
          </div>
        </div>
      </Section>

      {/* Section 2: Tuổi & nguồn gốc */}
      <Section emoji="📅" accent="from-emerald-500 to-teal-500" title="Tuổi & Nguồn gốc" subtitle="Ngày sinh, nơi đến">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Ngày sinh" hint={ageMonths != null ? `🎂 ${ageMonths} tháng tuổi` : 'Để trống nếu chưa rõ'}>
            <input
              type="date"
              value={form.birth_date}
              onChange={(e) => up('birth_date', e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </Field>
          <Field label="Nguồn *">
            <div className="flex gap-2">
              {[
                { v: 'no_tai_trai', l: '🐣 Nở tại trại', tone: 'emerald' },
                { v: 'mua', l: '💰 Mua từ ngoài', tone: 'amber' },
              ].map((s) => {
                const active = form.source === s.v
                const cls = active
                  ? s.tone === 'emerald'
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow'
                    : 'bg-amber-600 text-white border-amber-700 shadow'
                  : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-emerald-400'
                return (
                  <button
                    key={s.v}
                    type="button"
                    onClick={() => up('source', s.v as 'no_tai_trai' | 'mua')}
                    className={`flex-1 text-sm font-semibold rounded-lg px-3 py-2 border transition ${cls}`}
                  >
                    {s.l}
                  </button>
                )
              })}
            </div>
          </Field>
        </div>

        {form.source === 'mua' && (
          <div className="mt-3">
            <Field label="Giá mua (VNĐ)" hint="Sẽ tự ghi vào sổ chi phí">
              <input
                type="number"
                value={form.cost_purchase}
                onChange={(e) => up('cost_purchase', e.target.value)}
                min="0"
                placeholder="vd: 4500000"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono tabular-nums"
              />
            </Field>
          </div>
        )}
      </Section>

      {/* Section 3: Đặc điểm */}
      <Section emoji="📏" accent="from-amber-500 to-orange-500" title="Đặc điểm" subtitle="Cân nặng, màu lông">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Cân nặng (kg)" hint="Vd: 2.8">
            <input
              type="number"
              step="0.1"
              min="0"
              value={form.weight_kg}
              onChange={(e) => up('weight_kg', e.target.value)}
              placeholder="2.8"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
            />
          </Field>
          <Field label="Màu lông" hint="Bấm chip để chọn nhanh hoặc tự gõ">
            <input
              value={form.color}
              onChange={(e) => up('color', e.target.value)}
              placeholder="vd: đen, điều, xám, tía..."
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </Field>
        </div>
        <div className="mt-2 flex gap-1.5 flex-wrap">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => up('color', c)}
              className={
                'text-xs rounded-full px-2.5 py-1 border transition ' +
                (form.color === c
                  ? 'bg-amber-600 text-white border-amber-700 font-semibold'
                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-amber-400')
              }
            >
              {c}
            </button>
          ))}
        </div>
      </Section>

      {/* Section 4: Vị trí & QR */}
      <Section emoji="🏠" accent="from-violet-500 to-purple-500" title="Vị trí & QR" subtitle="Chuồng & thẻ định danh">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field
            label="Thẻ QR"
            hint={availableTags.length === 0 ? '⚠ Hết QR — tới /admin/generate-qr' : `${availableTags.length} thẻ trống`}
          >
            <select
              value={form.qr_tag_id}
              onChange={(e) => up('qr_tag_id', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="">— Chưa gắn (gắn sau cũng được) —</option>
              {availableTags.map((t) => (
                <option key={t.id} value={t.id}>
                  Thẻ #{t.tag_number}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Chuồng" hint={form.cage_id ? '' : '✨ Để trống = hệ thống tự chọn lồng trống'}>
            <select
              value={form.cage_id}
              onChange={(e) => up('cage_id', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="">✨ Tự động chọn lồng trống</option>
              {availableCages.map((c) => (
                <option key={c.id} value={c.id}>{c.full_code}</option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      {/* Section 5: Ghi chú */}
      <Section emoji="📝" accent="from-rose-500 to-pink-500" title="Ghi chú" subtitle="Thông tin thêm">
        <textarea
          value={form.notes}
          onChange={(e) => up('notes', e.target.value)}
          rows={3}
          placeholder="vd: Gà giống F1 Asil × Nòi · cha là Hắc Long · sinh ngày tốt · ..."
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
        />
      </Section>

      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-800 dark:text-rose-300 rounded-lg p-3 text-sm flex items-start gap-2">
          <span className="text-base">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Actions */}
      <div className="sticky bottom-0 z-10 -mx-4 px-4 py-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-t border-gray-200 dark:border-gray-700 flex gap-2 flex-wrap">
        <button
          type="submit"
          disabled={loading || !form.breed_id}
          className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl px-5 py-2.5 shadow-md hover:shadow-lg transition flex items-center justify-center gap-2"
        >
          {loading ? '⏳ Đang tạo...' : '✓ Tạo hồ sơ gà'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-xl px-4 py-2.5 transition"
        >
          Huỷ
        </button>
      </div>
    </form>
  )
}

function Section({
  emoji,
  accent,
  title,
  subtitle,
  children,
}: {
  emoji: string
  accent: string
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <section className="relative overflow-hidden bg-white dark:bg-gray-800 ring-1 ring-gray-200 dark:ring-gray-700 rounded-2xl">
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${accent}`} />
      <div className="p-4 md:p-5">
        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-3">
          <span className="text-xl">{emoji}</span>
          <span>{title}</span>
          {subtitle && (
            <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1">— {subtitle}</span>
          )}
        </h3>
        {children}
      </div>
    </section>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{label}</span>
        {hint && <span className="text-[10.5px] text-gray-500 dark:text-gray-400">{hint}</span>}
      </div>
      {children}
    </label>
  )
}
