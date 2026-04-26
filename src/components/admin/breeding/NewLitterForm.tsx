'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { removeDiacritics } from '@/lib/utils/slugify'

type Breeder = {
  id: string
  chicken_code: string
  name: string | null
  breed_name: string | null
  age_months: number | null
}

type Cage = {
  id: string
  full_code: string
  status: string
  cage_rows?: {
    code: string
    areas?: { code: string; name_vi: string; type: string } | null
  } | null
}

const CAGE_STATUS_LABEL: Record<string, { label: string; emoji: string; cls: string }> = {
  trong: { label: 'Trống', emoji: '⚪', cls: 'text-gray-500' },
  dang_su_dung: {
    label: 'Đang dùng',
    emoji: '🟢',
    cls: 'text-emerald-600 dark:text-emerald-400',
  },
  bao_tri: { label: 'Bảo trì', emoji: '🔧', cls: 'text-amber-600 dark:text-amber-400' },
  khoa: { label: 'Khoá', emoji: '🔒', cls: 'text-rose-600 dark:text-rose-400' },
}

function avatarColor(seed: string): string {
  const palette = [
    'from-rose-400 to-pink-500',
    'from-amber-400 to-orange-500',
    'from-emerald-400 to-teal-500',
    'from-sky-400 to-blue-500',
    'from-violet-400 to-purple-500',
    'from-fuchsia-400 to-pink-500',
    'from-lime-400 to-green-500',
    'from-cyan-400 to-sky-500',
  ]
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return palette[h % palette.length]
}

function getInitials(name: string | null, fallback: string): string {
  const s = name || fallback
  if (!s) return '?'
  const parts = s.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function ageLabel(months: number | null): string {
  if (months == null) return '?'
  if (months < 12) return `${months} tháng`
  const y = Math.floor(months / 12)
  const m = months % 12
  return m === 0 ? `${y} năm` : `${y}n ${m}t`
}

const MIN_BREEDING_MONTHS = 8
const MAX_MALES = 5

export function NewLitterForm({
  females,
  males,
  cages,
}: {
  females: Breeder[]
  males: Breeder[]
  cages: Cage[]
}) {
  const router = useRouter()
  const today = new Date().toISOString().split('T')[0]
  const [femaleId, setFemaleId] = useState('')
  const [maleIds, setMaleIds] = useState<string[]>([])
  const [pairedDate, setPairedDate] = useState(today)
  const [cageId, setCageId] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [qFemale, setQFemale] = useState('')
  const [qMale, setQMale] = useState('')

  const expectedHatch = useMemo(() => {
    const d = new Date(pairedDate)
    d.setDate(d.getDate() + 21)
    return d
  }, [pairedDate])

  const daysUntilHatch = useMemo(() => {
    const today0 = new Date()
    today0.setHours(0, 0, 0, 0)
    const diff = Math.round((expectedHatch.getTime() - today0.getTime()) / 86400_000)
    return diff
  }, [expectedHatch])

  const qFemaleNorm = removeDiacritics(qFemale.trim())
  const qMaleNorm = removeDiacritics(qMale.trim())

  const filteredFemales = useMemo(() => {
    if (!qFemaleNorm) return females
    return females.filter((f) =>
      removeDiacritics(`${f.chicken_code} ${f.name ?? ''} ${f.breed_name ?? ''}`).includes(
        qFemaleNorm
      )
    )
  }, [females, qFemaleNorm])

  const filteredMales = useMemo(() => {
    if (!qMaleNorm) return males
    return males.filter((m) =>
      removeDiacritics(`${m.chicken_code} ${m.name ?? ''} ${m.breed_name ?? ''}`).includes(
        qMaleNorm
      )
    )
  }, [males, qMaleNorm])

  const female = females.find((f) => f.id === femaleId)
  const selectedMales = males.filter((m) => maleIds.includes(m.id))
  const selectedCage = cages.find((c) => c.id === cageId)

  // Compatibility hints
  const breedAdvice = useMemo(() => {
    if (!female || selectedMales.length === 0) return null
    const breeds = new Set([female.breed_name, ...selectedMales.map((m) => m.breed_name)])
    if (breeds.size === 1)
      return {
        kind: 'pure' as const,
        text: `✓ Cùng giống ${female.breed_name ?? '—'} → con thuần chủng`,
        cls: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900',
      }
    return {
      kind: 'cross' as const,
      text: `🔀 Lai giống — ${Array.from(breeds).filter(Boolean).join(' × ')}`,
      cls: 'bg-violet-50 dark:bg-violet-950/30 text-violet-800 dark:text-violet-300 border-violet-200 dark:border-violet-900',
    }
  }, [female, selectedMales])

  const ageWarning = useMemo(() => {
    const issues: string[] = []
    if (female && (female.age_months ?? 0) < MIN_BREEDING_MONTHS) {
      issues.push(`Mái ${female.chicken_code} mới ${female.age_months ?? 0}t — cần ≥ ${MIN_BREEDING_MONTHS}t`)
    }
    for (const m of selectedMales) {
      if ((m.age_months ?? 0) < MIN_BREEDING_MONTHS)
        issues.push(`Đực ${m.chicken_code} mới ${m.age_months ?? 0}t — cần ≥ ${MIN_BREEDING_MONTHS}t`)
    }
    return issues
  }, [female, selectedMales])

  function toggleMale(id: string) {
    setError(null)
    setMaleIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= MAX_MALES) {
        setError(`Chỉ được chọn tối đa ${MAX_MALES} gà đực`)
        return prev
      }
      return [...prev, id]
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!femaleId) return setError('Chọn 1 gà mái')
    if (maleIds.length === 0) return setError('Chọn ít nhất 1 gà đực')
    setLoading(true)
    setError(null)
    const res = await fetch('/api/breeding/litters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        female_id: femaleId,
        male_ids: maleIds,
        paired_date: pairedDate,
        cage_id: cageId || undefined,
        notes: notes || undefined,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(typeof json.error === 'string' ? json.error : JSON.stringify(json.error))
      setLoading(false)
      return
    }
    router.push(`/admin/sinh-san/${json.data.id}`)
    router.refresh()
  }

  const ready = !!femaleId && maleIds.length > 0 && !loading

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <section className="relative overflow-hidden bg-gradient-to-br from-pink-50 via-rose-50 to-violet-50 dark:from-pink-950/40 dark:via-rose-950/40 dark:to-violet-950/40 border border-pink-200 dark:border-pink-900 rounded-xl p-4">
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-pink-300/30 blur-3xl" />
        <div className="absolute -left-10 -bottom-10 w-40 h-40 rounded-full bg-violet-300/30 blur-3xl" />
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-3">
          <Step n={1} title="Chọn 1 gà mái" desc="Lọc trong danh sách mái đang nuôi & chưa ấp lứa" active={!femaleId} done={!!femaleId} />
          <Step n={2} title={`Chọn 1–${MAX_MALES} gà đực`} desc="Đa giống = lai · cùng giống = thuần chủng" active={!!femaleId && maleIds.length === 0} done={maleIds.length > 0} />
          <Step n={3} title="Thời gian & vị trí" desc="Ngày nở dự kiến = ngày ghép + 21 ngày" active={maleIds.length > 0} done={false} />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
        <div className="space-y-4">
          <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-pink-500 to-rose-500" />
            <div className="p-4">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  🐔 Gà mái
                  {femaleId && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300 border border-pink-200 dark:border-pink-900">
                      ✓ Đã chọn
                    </span>
                  )}
                </h2>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {filteredFemales.length}/{females.length} sẵn sàng
                </span>
              </div>

              <div className="relative mb-3">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                <input
                  type="text"
                  value={qFemale}
                  onChange={(e) => setQFemale(e.target.value)}
                  placeholder="Tìm theo mã / tên / giống…"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              {females.length === 0 ? (
                <EmptyState icon="🐔" title="Chưa có gà mái nào sẵn sàng" desc="Cần status = đang nuôi và chưa ấp lứa khác." />
              ) : filteredFemales.length === 0 ? (
                <EmptyState icon="🔍" title="Không khớp từ khoá" desc="Thử bỏ filter hoặc đổi từ khoá." />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                  {filteredFemales.map((f) => {
                    const checked = femaleId === f.id
                    const young = (f.age_months ?? 0) < MIN_BREEDING_MONTHS
                    return (
                      <button
                        type="button"
                        key={f.id}
                        onClick={() => setFemaleId(f.id)}
                        className={
                          'text-left rounded-lg border p-2.5 transition group ' +
                          (checked
                            ? 'border-pink-500 bg-pink-50 dark:bg-pink-950/30 ring-2 ring-pink-200 dark:ring-pink-900'
                            : 'border-gray-200 dark:border-gray-700 hover:border-pink-300 hover:bg-pink-50/40 dark:hover:bg-pink-950/15')
                        }
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`flex-shrink-0 w-9 h-9 rounded-lg bg-gradient-to-br ${avatarColor(
                              f.id
                            )} text-white text-xs font-bold flex items-center justify-center shadow`}
                          >
                            {getInitials(f.name, f.chicken_code)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono font-bold text-sm text-gray-900 dark:text-gray-100">
                                {f.chicken_code}
                              </span>
                              {checked && (
                                <span className="text-[10px] bg-pink-600 text-white px-1.5 py-0.5 rounded-full">
                                  ✓
                                </span>
                              )}
                            </div>
                            {f.name && (
                              <div className="text-[11px] text-gray-600 dark:text-gray-400 truncate">
                                {f.name}
                              </div>
                            )}
                            <div className="flex items-center gap-1.5 mt-1 text-[10.5px] text-gray-500 dark:text-gray-400 flex-wrap">
                              {f.breed_name && (
                                <span className="bg-pink-100 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 px-1.5 rounded">
                                  {f.breed_name}
                                </span>
                              )}
                              <span
                                className={
                                  young
                                    ? 'text-amber-600 dark:text-amber-400 font-medium'
                                    : ''
                                }
                              >
                                ⏳ {ageLabel(f.age_months)}
                                {young && ' ⚠️'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </section>

          <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500" />
            <div className="p-4">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  🐓 Gà đực
                  <span
                    className={
                      'text-[11px] px-2 py-0.5 rounded-full border ' +
                      (maleIds.length > 0
                        ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900'
                        : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-700')
                    }
                  >
                    {maleIds.length}/{MAX_MALES}
                  </span>
                </h2>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {filteredMales.length}/{males.length} sẵn sàng
                </span>
              </div>

              {/* Counter bar */}
              <div className="mb-3 h-1.5 rounded-full bg-gray-100 dark:bg-gray-900/60 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 transition-all"
                  style={{ width: `${(maleIds.length / MAX_MALES) * 100}%` }}
                />
              </div>

              <div className="relative mb-3">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                <input
                  type="text"
                  value={qMale}
                  onChange={(e) => setQMale(e.target.value)}
                  placeholder="Tìm theo mã / tên / giống…"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {males.length === 0 ? (
                <EmptyState icon="🐓" title="Chưa có gà đực nào đang nuôi" desc="Cần status = đang nuôi." />
              ) : filteredMales.length === 0 ? (
                <EmptyState icon="🔍" title="Không khớp từ khoá" desc="Thử bỏ filter hoặc đổi từ khoá." />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-1">
                  {filteredMales.map((m) => {
                    const checked = maleIds.includes(m.id)
                    const young = (m.age_months ?? 0) < MIN_BREEDING_MONTHS
                    const reachedMax = !checked && maleIds.length >= MAX_MALES
                    return (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => toggleMale(m.id)}
                        disabled={reachedMax}
                        className={
                          'text-left rounded-lg border p-2.5 transition group disabled:opacity-50 disabled:cursor-not-allowed ' +
                          (checked
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 ring-2 ring-blue-200 dark:ring-blue-900'
                            : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:bg-blue-50/40 dark:hover:bg-blue-950/15')
                        }
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`flex-shrink-0 w-9 h-9 rounded-lg bg-gradient-to-br ${avatarColor(
                              m.id
                            )} text-white text-xs font-bold flex items-center justify-center shadow`}
                          >
                            {getInitials(m.name, m.chicken_code)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono font-bold text-sm text-gray-900 dark:text-gray-100">
                                {m.chicken_code}
                              </span>
                              {checked && (
                                <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full">
                                  ✓
                                </span>
                              )}
                            </div>
                            {m.name && (
                              <div className="text-[11px] text-gray-600 dark:text-gray-400 truncate">
                                {m.name}
                              </div>
                            )}
                            <div className="flex items-center gap-1.5 mt-1 text-[10.5px] text-gray-500 dark:text-gray-400 flex-wrap">
                              {m.breed_name && (
                                <span className="bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-1.5 rounded">
                                  {m.breed_name}
                                </span>
                              )}
                              <span
                                className={
                                  young
                                    ? 'text-amber-600 dark:text-amber-400 font-medium'
                                    : ''
                                }
                              >
                                ⏳ {ageLabel(m.age_months)}
                                {young && ' ⚠️'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </section>

          <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-amber-500 to-orange-500" />
            <div className="p-4 space-y-3">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                📅 Thời gian & vị trí
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Ngày ghép *">
                  <input
                    type="date"
                    required
                    value={pairedDate}
                    onChange={(e) => setPairedDate(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="Chuồng (tuỳ chọn)">
                  <select
                    value={cageId}
                    onChange={(e) => setCageId(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">— Không chọn chuồng —</option>
                    {cages.map((c) => {
                      const meta = CAGE_STATUS_LABEL[c.status] ?? CAGE_STATUS_LABEL.trong
                      const isGhepDoi = c.cage_rows?.areas?.type === 'ghep_doi'
                      return (
                        <option key={c.id} value={c.id}>
                          {meta.emoji} {c.full_code} · {meta.label}
                          {isGhepDoi ? ' · 💞 Khu ghép đôi' : ''}
                        </option>
                      )
                    })}
                  </select>
                </Field>
              </div>

              <Field label="Ghi chú">
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="VD: ghép thử lần 2, theo dõi đẻ trứng…"
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
                />
              </Field>
            </div>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-4 self-start">
          <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <div className="p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                📋 Tóm tắt lứa
              </h3>

              <div>
                <div className="text-[10.5px] uppercase tracking-wider text-pink-600 dark:text-pink-400 font-semibold mb-1">
                  🐔 Mái
                </div>
                {female ? (
                  <BreederMini
                    breeder={female}
                    tone="pink"
                    onRemove={() => setFemaleId('')}
                  />
                ) : (
                  <div className="text-xs text-gray-400 italic px-2 py-3 text-center bg-gray-50 dark:bg-gray-900/40 rounded-lg">
                    Chưa chọn
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-baseline justify-between mb-1">
                  <div className="text-[10.5px] uppercase tracking-wider text-blue-600 dark:text-blue-400 font-semibold">
                    🐓 Đực
                  </div>
                  <span className="text-[10.5px] text-gray-500 dark:text-gray-400">
                    {selectedMales.length}/{MAX_MALES}
                  </span>
                </div>
                {selectedMales.length === 0 ? (
                  <div className="text-xs text-gray-400 italic px-2 py-3 text-center bg-gray-50 dark:bg-gray-900/40 rounded-lg">
                    Chưa chọn
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {selectedMales.map((m) => (
                      <BreederMini
                        key={m.id}
                        breeder={m}
                        tone="blue"
                        onRemove={() => toggleMale(m.id)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {breedAdvice && (
                <div
                  className={`text-[11px] px-2.5 py-1.5 rounded-lg border ${breedAdvice.cls}`}
                >
                  {breedAdvice.text}
                </div>
              )}

              {ageWarning.length > 0 && (
                <div className="text-[11px] px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300">
                  ⚠️ {ageWarning.join(' · ')}
                </div>
              )}

              {selectedCage && (
                <div className="text-[11px] text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/40 rounded-lg px-2.5 py-1.5">
                  📍 Chuồng <strong className="font-mono">{selectedCage.full_code}</strong>
                </div>
              )}
            </div>
          </section>

          <section
            className={
              'rounded-xl overflow-hidden border ' +
              (daysUntilHatch < 0
                ? 'bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-950/30 dark:to-red-950/30 border-rose-200 dark:border-rose-900'
                : daysUntilHatch === 0
                  ? 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-300 dark:border-amber-800 animate-pulse'
                  : 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-900')
            }
          >
            <div className="p-4 text-center">
              <div className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                Ngày nở dự kiến
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {expectedHatch.toLocaleDateString('vi-VN', {
                  weekday: 'long',
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                {daysUntilHatch < 0
                  ? `⚠️ Đã qua ${Math.abs(daysUntilHatch)} ngày — kiểm tra ngày ghép`
                  : daysUntilHatch === 0
                    ? '🥚 Hôm nay là ngày dự kiến nở!'
                    : `⏳ Còn ${daysUntilHatch} ngày · ngày ghép + 21`}
              </div>
            </div>
          </section>

          {error && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 rounded-xl p-3 text-sm">
              ✗ {error}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <button
              type="submit"
              disabled={!ready}
              className="bg-gradient-to-r from-pink-500 via-rose-500 to-violet-500 text-white rounded-lg px-5 py-3 font-semibold shadow hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? '⏳ Đang tạo lứa…' : '💞 Tạo lứa ghép đôi'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Huỷ
            </button>
          </div>
        </aside>
      </div>
    </form>
  )
}

function BreederMini({
  breeder,
  tone,
  onRemove,
}: {
  breeder: Breeder
  tone: 'pink' | 'blue'
  onRemove: () => void
}) {
  const cls =
    tone === 'pink'
      ? 'bg-pink-50 dark:bg-pink-950/30 border-pink-200 dark:border-pink-900'
      : 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900'
  return (
    <div className={`rounded-lg border p-2 flex items-center gap-2 ${cls}`}>
      <div
        className={`flex-shrink-0 w-7 h-7 rounded-md bg-gradient-to-br ${avatarColor(
          breeder.id
        )} text-white text-[10px] font-bold flex items-center justify-center shadow`}
      >
        {getInitials(breeder.name, breeder.chicken_code)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-mono font-bold text-xs text-gray-900 dark:text-gray-100 truncate">
          {breeder.chicken_code}
        </div>
        <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
          {breeder.breed_name ?? '—'} · {ageLabel(breeder.age_months)}
        </div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        title="Bỏ chọn"
        className="text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 text-base leading-none px-1"
      >
        ✕
      </button>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">
        {label}
      </span>
      {children}
    </label>
  )
}

function EmptyState({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center">
      <div className="text-3xl mb-1">{icon}</div>
      <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{title}</div>
      <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{desc}</div>
    </div>
  )
}

function Step({
  n,
  title,
  desc,
  active,
  done,
}: {
  n: number
  title: string
  desc: string
  active?: boolean
  done?: boolean
}) {
  return (
    <div
      className={
        'flex items-start gap-2.5 backdrop-blur-sm rounded-lg p-2.5 border transition ' +
        (done
          ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900'
          : active
            ? 'bg-white/80 dark:bg-gray-900/60 border-pink-300 dark:border-pink-800 ring-1 ring-pink-200 dark:ring-pink-900/40'
            : 'bg-white/60 dark:bg-gray-900/50 border-white/40 dark:border-gray-700/40')
      }
    >
      <div
        className={
          'flex-shrink-0 w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center shadow ' +
          (done
            ? 'bg-gradient-to-br from-emerald-500 to-teal-500'
            : active
              ? 'bg-gradient-to-br from-pink-500 to-rose-500'
              : 'bg-gradient-to-br from-gray-400 to-gray-500')
        }
      >
        {done ? '✓' : n}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</div>
        <div className="text-[11px] text-gray-600 dark:text-gray-300 leading-snug">{desc}</div>
      </div>
    </div>
  )
}
