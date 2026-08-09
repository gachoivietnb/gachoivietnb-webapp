'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ROUTE_META, RESULT_META, type Vaccine, type VaccineRoute, type VaccinationResult } from '@/lib/vaccinations/types'

type Chicken = { id: string; chicken_code: string; name: string | null; image_url: string | null; birth_date: string | null; status: string }
type Profile = { id: string; full_name: string }
type Pending = {
  id: string
  chicken_id: string
  vaccine_id: string
  scheduled_date: string
  vaccine: Vaccine
  chicken: Chicken
}

export function RecordVaccinationForm({
  vaccines,
  chickens,
  profiles,
  pendingVaccination,
  defaultChickenId,
}: {
  vaccines: Vaccine[]
  chickens: Chicken[]
  profiles: Profile[]
  pendingVaccination: Pending | null
  defaultChickenId?: string
}) {
  const router = useRouter()
  const [chickenId, setChickenId] = useState(pendingVaccination?.chicken_id ?? defaultChickenId ?? '')
  const [chickenSearch, setChickenSearch] = useState('')
  const [vaccineId, setVaccineId] = useState(pendingVaccination?.vaccine_id ?? '')
  const [actualDate, setActualDate] = useState(new Date().toISOString().slice(0, 10))
  const [lotNumber, setLotNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [doseActual, setDoseActual] = useState('')
  const [routeActual, setRouteActual] = useState<VaccineRoute | ''>('')
  const [performedBy, setPerformedBy] = useState('')
  const [result, setResult] = useState<VaccinationResult>('thanh_cong')
  const [sideEffects, setSideEffects] = useState('')
  const [postObs, setPostObs] = useState('')
  const [weight, setWeight] = useState('')
  const [cost, setCost] = useState('0')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const selected = chickens.find((c) => c.id === chickenId)
  const vac = vaccines.find((v) => v.id === vaccineId)

  // Auto-fill khi đổi vaccine
  const handleVaccineChange = (id: string) => {
    setVaccineId(id)
    const v = vaccines.find((x) => x.id === id)
    if (v) {
      if (!doseActual && v.dose) setDoseActual(v.dose)
      if (!routeActual && v.route) setRouteActual(v.route)
    }
  }

  const filteredChickens = useMemo(() => {
    const q = chickenSearch.trim().toLowerCase()
    return chickens.filter((c) => !q || c.chicken_code.toLowerCase().includes(q) || (c.name ?? '').toLowerCase().includes(q)).slice(0, 50)
  }, [chickens, chickenSearch])

  async function handleSave() {
    if (!chickenId) { setError('Chọn gà'); return }
    if (!vaccineId) { setError('Chọn vaccine'); return }
    setSaving(true)
    setError(null)
    const res = await fetch('/api/vaccinations/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vaccination_id: pendingVaccination?.id,
        chicken_id: chickenId,
        vaccine_id: vaccineId,
        scheduled_date: pendingVaccination?.scheduled_date,
        actual_date: actualDate,
        vaccine_lot_number: lotNumber || null,
        vaccine_expiry: expiry || null,
        dose_actual: doseActual || null,
        route_actual: routeActual || null,
        performed_by: performedBy || null,
        result,
        side_effects: sideEffects || null,
        post_observations: postObs || null,
        weight_at_vaccination: weight ? Number(weight) : null,
        cost: Number(cost || 0),
        notes: notes || null,
      }),
    })
    setSaving(false)
    if (!res.ok) {
      const j = await res.json()
      setError(typeof j.error === 'string' ? j.error : 'Lỗi lưu')
      return
    }
    router.push('/admin/tiem-phong')
    router.refresh()
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        {/* Bước 1: Chọn gà */}
        <Card title="🐓 Chọn gà cần tiêm" required>
          {selected ? (
            <div className="border-2 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl p-3 flex items-center gap-3">
              <div className="w-14 h-14 rounded-lg overflow-hidden bg-white border">
                {selected.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selected.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">🐓</div>
                )}
              </div>
              <div className="flex-1">
                <div className="font-bold">{selected.name || selected.chicken_code}</div>
                <div className="text-xs text-gray-500">{selected.chicken_code}{selected.birth_date && ` · Ngày sinh ${selected.birth_date.split('-').reverse().join('/')}`}</div>
              </div>
              <button onClick={() => setChickenId('')} className="text-xs text-blue-600 hover:underline">Đổi</button>
            </div>
          ) : (
            <>
              <input
                value={chickenSearch}
                onChange={(e) => setChickenSearch(e.target.value)}
                placeholder="🔍 Tìm theo mã / tên gà..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-900"
              />
              <div className="mt-2 max-h-72 overflow-y-auto border border-gray-200 rounded-lg divide-y">
                {filteredChickens.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setChickenId(c.id)}
                    className="w-full text-left flex items-center gap-3 px-3 py-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                  >
                    <div className="w-9 h-9 rounded bg-gray-100 overflow-hidden">
                      {c.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.image_url} alt="" className="w-full h-full object-cover" />
                      ) : <div className="w-full h-full flex items-center justify-center">🐓</div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{c.name || c.chicken_code}</div>
                      <div className="text-xs text-gray-500">{c.chicken_code}</div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </Card>

        {/* Bước 2: Vaccine */}
        <Card title="💉 Chọn vaccine" required>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {vaccines.map((v) => {
              const active = vaccineId === v.id
              return (
                <button
                  key={v.id}
                  onClick={() => handleVaccineChange(v.id)}
                  className={`text-left rounded-lg p-2.5 border-2 transition ${
                    active
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                      : 'border-gray-200 dark:border-gray-700 hover:border-emerald-300'
                  }`}
                  style={{ borderLeftWidth: '4px', borderLeftColor: v.color_hex || undefined }}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">{v.emoji || '💉'}</span>
                    <span className="font-bold text-xs">{v.code}</span>
                    {v.is_required && <span className="text-[9px] bg-red-500 text-white rounded px-1">⚖️</span>}
                  </div>
                  <div className="text-xs font-semibold text-gray-900 dark:text-gray-100 mt-0.5 truncate">{v.name_vi}</div>
                  {v.target_disease && <div className="text-[10px] text-gray-500 truncate">{v.target_disease}</div>}
                </button>
              )
            })}
          </div>
          {vac && (
            <div className="mt-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-3 text-xs space-y-1">
              <div><b>📋 Phòng bệnh:</b> {vac.target_disease}</div>
              <div><b>💊 Liều:</b> {vac.dose}</div>
              <div><b>{ROUTE_META[vac.route].emoji} Cách tiêm:</b> {ROUTE_META[vac.route].label} — {ROUTE_META[vac.route].desc}</div>
              {vac.recommended_brands && vac.recommended_brands.length > 0 && (
                <div><b>🏭 Hãng đề xuất:</b> {vac.recommended_brands.join(' · ')}</div>
              )}
              {vac.storage_temp && <div><b>🌡 Bảo quản:</b> {vac.storage_temp}</div>}
              {vac.notes && <div className="italic text-blue-900 dark:text-blue-300 mt-1">💡 {vac.notes}</div>}
            </div>
          )}
        </Card>

        {/* Bước 3: Chi tiết tiêm */}
        <Card title="📝 Chi tiết tiêm">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Field label="Ngày tiêm thật" type="date" value={actualDate} onChange={setActualDate} required />
            <Field label="Số lô vaccine" value={lotNumber} onChange={setLotNumber} placeholder="VD: BIO123-A" />
            <Field label="Hạn dùng vaccine" type="date" value={expiry} onChange={setExpiry} />
            <Field label="Liều thực tế" value={doseActual} onChange={setDoseActual} placeholder="0.5ml" />
            <div>
              <label className="text-xs block mb-1 font-semibold">Đường tiêm thật</label>
              <select
                value={routeActual}
                onChange={(e) => setRouteActual(e.target.value as VaccineRoute)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-900"
              >
                <option value="">— Mặc định theo vaccine —</option>
                {(Object.keys(ROUTE_META) as VaccineRoute[]).map((r) => (
                  <option key={r} value={r}>{ROUTE_META[r].emoji} {ROUTE_META[r].label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs block mb-1 font-semibold">Người tiêm</label>
              <select
                value={performedBy}
                onChange={(e) => setPerformedBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-900"
              >
                <option value="">— Tôi —</option>
                {profiles.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            </div>
            <Field label="Cân nặng (kg)" type="number" step="0.01" value={weight} onChange={setWeight} placeholder="2.5" />
            <Field label="Chi phí (đ)" type="number" value={cost} onChange={setCost} step="1" />
          </div>
        </Card>

        {/* Bước 4: Kết quả */}
        <Card title="🏆 Kết quả & Phản ứng" required>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {(Object.keys(RESULT_META) as VaccinationResult[]).map((r) => {
              const m = RESULT_META[r]
              const active = result === r
              return (
                <button
                  key={r}
                  onClick={() => setResult(r)}
                  className={`p-3 rounded-xl text-center border-2 transition ${
                    active
                      ? `${m.cls} border-transparent shadow`
                      : 'border-gray-200 dark:border-gray-700 hover:border-emerald-300 bg-white dark:bg-gray-900'
                  }`}
                >
                  <div className="text-2xl">{m.emoji}</div>
                  <div className={`text-[10px] font-bold mt-1 ${active ? '' : 'text-gray-700 dark:text-gray-300'}`}>{m.label}</div>
                </button>
              )
            })}
          </div>
          {(result === 'co_phan_ung' || result === 'phan_ung_nang') && (
            <div className="mt-3">
              <label className="text-xs block mb-1 font-semibold">Phản ứng cụ thể</label>
              <textarea
                value={sideEffects}
                onChange={(e) => setSideEffects(e.target.value)}
                rows={2}
                placeholder="VD: Sốt nhẹ 38.5°C 6 tiếng sau, mệt, ăn ít — tự khỏi sau 24h"
                className="w-full px-3 py-2 border border-orange-300 rounded-lg text-sm bg-orange-50 dark:bg-orange-950/30"
              />
            </div>
          )}
          <div className="mt-3">
            <label className="text-xs block mb-1 font-semibold">Quan sát sau tiêm (tùy chọn)</label>
            <textarea
              value={postObs}
              onChange={(e) => setPostObs(e.target.value)}
              rows={2}
              placeholder="Tình trạng gà 24h sau tiêm..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-900"
            />
          </div>
          <div className="mt-3">
            <label className="text-xs block mb-1 font-semibold">Ghi chú khác</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-900"
            />
          </div>
        </Card>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">⚠ {error}</div>
        )}
      </div>

      {/* Sidebar action */}
      <div>
        <div className="sticky top-4 space-y-3">
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-2 border-emerald-300 dark:border-emerald-800 rounded-xl p-4">
            <h3 className="font-bold text-sm mb-2">💉 Sẵn sàng lưu</h3>
            <div className="text-xs space-y-1 mb-3">
              <div>🐓 Gà: <b>{selected ? (selected.name || selected.chicken_code) : '—'}</b></div>
              <div>💉 Vaccine: <b>{vac ? vac.name_vi : '—'}</b></div>
              <div>📅 Ngày: <b>{actualDate.split('-').reverse().join('/')}</b></div>
              <div>🏆 Kết quả: <b>{RESULT_META[result].label}</b></div>
              {vac?.repeat_interval_days && (
                <div className="text-amber-700 dark:text-amber-400 italic">
                  ↻ Sẽ tự sinh lịch nhắc sau {vac.repeat_interval_days} ngày
                </div>
              )}
            </div>
            <button
              onClick={handleSave}
              disabled={saving || !chickenId || !vaccineId}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg py-2.5 text-sm font-bold shadow disabled:opacity-50"
            >
              {saving ? 'Đang lưu...' : '✓ Lưu kết quả tiêm'}
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
      <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 mb-3">
        {title}{required && <span className="text-red-500 ml-1">*</span>}
      </h3>
      {children}
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text', step, required }: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  step?: string
  required?: boolean
}) {
  return (
    <label className="block">
      <span className="text-xs block mb-1 font-semibold">{label}{required && <span className="text-red-500"> *</span>}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        step={step}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-900"
      />
    </label>
  )
}
