'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BATCH_STATUS_META, ROUTE_META, type Vaccine, type VaccinationBatchStatus } from '@/lib/vaccinations/types'

type Batch = {
  id: string
  batch_code: string
  batch_date: string
  vaccine_id: string
  vaccine_lot_number: string | null
  vaccine_expiry: string | null
  total_dose_used: number | null
  vet_name: string | null
  total_cost: number
  target_count: number
  completed_count: number
  reaction_count: number
  failed_count: number
  status: VaccinationBatchStatus
  notes: string | null
}

type Chicken = {
  id: string
  chicken_code: string
  name: string | null
  image_url: string | null
  birth_date: string | null
  status: string
  area_id: string | null
  breed_id: string | null
}

type Area = { id: string; code: string; name_vi: string }

export function BatchesClient({
  batches,
  vaccines,
  chickens,
  areas,
  canWrite,
  canDelete,
}: {
  batches: Batch[]
  vaccines: Vaccine[]
  chickens: Chicken[]
  areas: Area[]
  canWrite: boolean
  canDelete: boolean
}) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const vaccineMap = new Map(vaccines.map((v) => [v.id, v]))

  const fmtVnd = (n: number) => Number(n || 0).toLocaleString('vi-VN')

  async function handleDelete(id: string) {
    if (!confirm('Hủy đợt tiêm? Các bản ghi pending sẽ bị xóa.')) return
    const res = await fetch(`/api/vaccination-batches?id=${id}`, { method: 'DELETE' })
    if (!res.ok) {
      alert('Lỗi xóa')
      return
    }
    router.refresh()
  }

  if (showForm) {
    return (
      <BatchForm
        vaccines={vaccines}
        chickens={chickens}
        areas={areas}
        onCancel={() => setShowForm(false)}
        onSaved={() => { setShowForm(false); router.refresh() }}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {canWrite && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg px-4 py-2 text-sm font-bold shadow"
          >
            + Tạo đợt tiêm mới
          </button>
        )}
      </div>

      {batches.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
          <div className="text-6xl mb-2 opacity-50">🎯</div>
          <p className="text-sm text-gray-500">Chưa có đợt tiêm nào — tạo đợt đầu tiên</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {batches.map((b) => {
            const v = vaccineMap.get(b.vaccine_id)
            const stat = BATCH_STATUS_META[b.status]
            const completionPct = b.target_count > 0 ? (b.completed_count / b.target_count) * 100 : 0
            return (
              <div key={b.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="text-[11px] font-mono text-gray-500">{b.batch_code}</div>
                    <h3 className="font-bold flex items-center gap-1.5">
                      <span style={{ color: v?.color_hex || undefined }}>{v?.emoji || '💉'}</span>
                      {v?.name_vi || 'Vaccine ?'}
                    </h3>
                    {v?.target_disease && (
                      <div className="text-[11px] text-gray-500">📋 {v.target_disease}</div>
                    )}
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${stat.cls}`}>
                    {stat.emoji} {stat.label}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                  <div>📅 {b.batch_date.split('-').reverse().join('/')}</div>
                  {b.vaccine_lot_number && <div>🏷 Lô: <span className="font-mono">{b.vaccine_lot_number}</span></div>}
                  {b.vet_name && <div>👨‍⚕️ {b.vet_name}</div>}
                  {b.total_cost > 0 && <div className="text-amber-700">💰 {fmtVnd(b.total_cost)}đ</div>}
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span>Tiến độ: <b>{b.completed_count}/{b.target_count} con</b></span>
                    <span className="text-gray-500">{completionPct.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-400 to-teal-500"
                      style={{ width: `${completionPct}%` }}
                    />
                  </div>
                  {(b.reaction_count > 0 || b.failed_count > 0) && (
                    <div className="flex gap-3 text-[11px] mt-1">
                      {b.reaction_count > 0 && <span className="text-orange-600">⚠️ {b.reaction_count} phản ứng</span>}
                      {b.failed_count > 0 && <span className="text-red-600">❌ {b.failed_count} thất bại</span>}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-3">
                  {b.status === 'chuan_bi' || b.status === 'dang_tiem' ? (
                    <button
                      onClick={() => router.push(`/admin/tiem-phong/dot-tiem/${b.id}`)}
                      className="text-xs bg-emerald-500 text-white rounded px-3 py-1.5 font-semibold"
                    >
                      ▶ Tiến hành tiêm
                    </button>
                  ) : (
                    <button
                      onClick={() => router.push(`/admin/tiem-phong/dot-tiem/${b.id}`)}
                      className="text-xs border border-gray-300 rounded px-3 py-1.5 hover:bg-gray-50"
                    >
                      📋 Chi tiết
                    </button>
                  )}
                  {canDelete && b.status !== 'hoan_tat' && (
                    <button
                      onClick={() => handleDelete(b.id)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      🗑 Hủy đợt
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

function BatchForm({
  vaccines,
  chickens,
  areas,
  onCancel,
  onSaved,
}: {
  vaccines: Vaccine[]
  chickens: Chicken[]
  areas: Area[]
  onCancel: () => void
  onSaved: () => void
}) {
  const [vaccineId, setVaccineId] = useState('')
  const [batchDate, setBatchDate] = useState(new Date().toISOString().slice(0, 10))
  const [lotNumber, setLotNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [vetName, setVetName] = useState('')
  const [totalCost, setTotalCost] = useState('0')
  const [notes, setNotes] = useState('')

  // Filters
  const [areaFilter, setAreaFilter] = useState<string>('')
  const [ageMin, setAgeMin] = useState('')
  const [ageMax, setAgeMax] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const vac = vaccines.find((v) => v.id === vaccineId)

  const filtered = useMemo(() => {
    const today = new Date()
    return chickens.filter((c) => {
      if (areaFilter && c.area_id !== areaFilter) return false
      if (ageMin && c.birth_date) {
        const days = Math.floor((today.getTime() - new Date(c.birth_date).getTime()) / 86400000)
        if (days < Number(ageMin)) return false
      }
      if (ageMax && c.birth_date) {
        const days = Math.floor((today.getTime() - new Date(c.birth_date).getTime()) / 86400000)
        if (days > Number(ageMax)) return false
      }
      if (search) {
        const q = search.toLowerCase()
        if (!c.chicken_code.toLowerCase().includes(q) && !(c.name ?? '').toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [chickens, areaFilter, ageMin, ageMax, search])

  function pickByVaccineAge() {
    if (!vac) return
    const today = new Date()
    const filterAge = (c: Chicken) => {
      if (!c.birth_date) return false
      const days = Math.floor((today.getTime() - new Date(c.birth_date).getTime()) / 86400000)
      const min = vac.minimum_age_days ?? 0
      const max = vac.maximum_age_days ?? 999999
      return days >= min && days <= max
    }
    const ids = chickens.filter(filterAge).map((c) => c.id)
    setSelected(new Set(ids))
  }

  function toggleAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map((c) => c.id)))
    }
  }

  function toggle(id: string) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  async function handleSave() {
    if (!vaccineId) { setError('Chọn vaccine'); return }
    if (selected.size === 0) { setError('Chọn ít nhất 1 con'); return }
    setSaving(true)
    setError(null)
    const res = await fetch('/api/vaccination-batches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vaccine_id: vaccineId,
        batch_date: batchDate,
        vaccine_lot_number: lotNumber || null,
        vaccine_expiry: expiry || null,
        vet_name: vetName || null,
        total_cost: Number(totalCost || 0),
        notes: notes || null,
        target_chicken_ids: Array.from(selected),
        target_filter: { area_id: areaFilter, age_min: ageMin, age_max: ageMax },
      }),
    })
    setSaving(false)
    if (!res.ok) {
      const j = await res.json()
      setError(typeof j.error === 'string' ? j.error : 'Lỗi tạo đợt')
      return
    }
    onSaved()
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">🎯 Tạo đợt tiêm hàng loạt</h2>
        <button onClick={onCancel} className="text-gray-500">✕</button>
      </div>

      {/* Vaccine */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5">① Chọn vaccine *</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {vaccines.map((v) => (
            <button
              key={v.id}
              onClick={() => setVaccineId(v.id)}
              className={`text-left rounded-lg p-2.5 border-2 ${vaccineId === v.id ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' : 'border-gray-200 dark:border-gray-700 hover:border-emerald-300'}`}
              style={{ borderLeftWidth: '4px', borderLeftColor: v.color_hex || undefined }}
            >
              <div className="flex items-center gap-1.5"><span>{v.emoji}</span><b className="text-xs">{v.code}</b></div>
              <div className="text-xs">{v.name_vi}</div>
              {v.minimum_age_days !== null && v.maximum_age_days !== null && (
                <div className="text-[10px] text-gray-500">📅 {v.minimum_age_days}-{v.maximum_age_days} ngày</div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Info đợt */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5">② Thông tin đợt</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Input label="Ngày tiêm" type="date" value={batchDate} onChange={setBatchDate} />
          <Input label="Số lô vaccine" value={lotNumber} onChange={setLotNumber} placeholder="VD: BIO123" />
          <Input label="Hạn vaccine" type="date" value={expiry} onChange={setExpiry} />
          <Input label="Bác sĩ thú y" value={vetName} onChange={setVetName} />
          <Input label="Tổng chi phí (đ)" type="number" value={totalCost} onChange={setTotalCost} />
        </div>
      </div>

      {/* Chọn gà */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5">③ Chọn gà ({selected.size} đã chọn)</label>

        {vac && (vac.minimum_age_days !== null || vac.maximum_age_days !== null) && (
          <button
            onClick={pickByVaccineAge}
            className="mb-2 text-xs bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-full px-3 py-1 font-semibold"
          >
            ✨ Tự chọn theo tuổi vaccine ({vac.minimum_age_days}-{vac.maximum_age_days} ngày)
          </button>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
          <select
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            className="px-2 py-1.5 text-xs border border-gray-300 rounded bg-white dark:bg-gray-900"
          >
            <option value="">Tất cả khu</option>
            {areas.map((a) => <option key={a.id} value={a.id}>{a.code} · {a.name_vi}</option>)}
          </select>
          <input type="number" value={ageMin} onChange={(e) => setAgeMin(e.target.value)} placeholder="Tuổi từ (ngày)" className="px-2 py-1.5 text-xs border border-gray-300 rounded bg-white dark:bg-gray-900" />
          <input type="number" value={ageMax} onChange={(e) => setAgeMax(e.target.value)} placeholder="Tuổi đến (ngày)" className="px-2 py-1.5 text-xs border border-gray-300 rounded bg-white dark:bg-gray-900" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Tìm gà..." className="px-2 py-1.5 text-xs border border-gray-300 rounded bg-white dark:bg-gray-900" />
        </div>

        <div className="flex items-center gap-2 mb-2 text-xs">
          <button onClick={toggleAll} className="border border-gray-300 rounded px-2 py-1 hover:bg-gray-50">
            {selected.size === filtered.length ? '☐ Bỏ chọn tất cả' : '☑ Chọn tất cả ' + filtered.length}
          </button>
          <span className="text-gray-500">{filtered.length} con khớp filter</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 max-h-72 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2">
          {filtered.map((c) => {
            const isSel = selected.has(c.id)
            const ageDays = c.birth_date ? Math.floor((Date.now() - new Date(c.birth_date).getTime()) / 86400000) : null
            return (
              <button
                key={c.id}
                onClick={() => toggle(c.id)}
                className={`text-left rounded p-1.5 border ${isSel ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' : 'border-gray-200 dark:border-gray-700'}`}
              >
                <div className="flex items-center gap-1">
                  <input type="checkbox" checked={isSel} readOnly className="pointer-events-none" />
                  <span className="text-xs font-mono">{c.chicken_code}</span>
                </div>
                {c.name && <div className="text-[10px] truncate">{c.name}</div>}
                {ageDays !== null && <div className="text-[10px] text-gray-500">{ageDays} ngày</div>}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold mb-1 block">Ghi chú</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-900" />
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">⚠ {error}</div>}

      <div className="flex gap-2">
        <button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg px-5 py-2 text-sm font-bold shadow disabled:opacity-50">
          {saving ? 'Đang tạo...' : `🎯 Tạo đợt cho ${selected.size} con`}
        </button>
        <button onClick={onCancel} className="border border-gray-300 rounded-lg px-5 py-2 text-sm hover:bg-gray-50">Hủy</button>
      </div>
    </div>
  )
}

function Input({ label, value, onChange, type = 'text', placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-xs block mb-1 font-semibold">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-900" />
    </label>
  )
}
