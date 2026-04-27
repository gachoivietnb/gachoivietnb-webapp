'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  RULES_META,
  SPURS_META,
  RESULT_META,
  RESULT_METHOD_META,
  TOURNAMENT_TYPE_META,
  INJURY_META,
  type MatchResult,
  type MatchResultMethod,
  type MatchRules,
  type MatchSpursType,
  type MatchInjuryLevel,
} from '@/lib/thi-dau/types'

type ChickenStats = {
  combat_tier: string
  stars: number
  total_matches: number
  wins: number
  current_win_streak: number
}
type Chicken = {
  id: string
  chicken_code: string
  name: string | null
  image_url: string | null
  status: string
  gender?: string | null
  birth_date?: string | null
  weight_kg?: number | null
  breeds: { name_vi: string } | { name_vi: string }[] | null
  area?: { code: string; name_vi: string } | { code: string; name_vi: string }[] | null
  combat_tier_manual?: string | null
  stats?: ChickenStats | null
}
type Tournament = {
  id: string
  name: string
  type: string
  start_date: string | null
  status: string
}
type Editing = {
  id: string
  chicken_id: string
  tournament_id: string | null
  match_date: string
  match_time: string | null
  opponent_name: string
  opponent_owner: string | null
  opponent_breed: string | null
  opponent_origin: string | null
  opponent_weight_kg: number | null
  self_weight_kg: number | null
  rules: MatchRules
  spurs_type: MatchSpursType
  weight_class: string | null
  rounds_planned: number | null
  is_ho_doc: boolean
  result: MatchResult | null
  result_method: MatchResultMethod | null
  result_round: number | null
  rounds_actual: number
  total_duration_minutes: number | null
  injury_self: MatchInjuryLevel
  injury_notes: string | null
  prize_money: number
  betting_amount: number
  betting_won: number
  photo_urls: string[]
  video_url: string | null
  referee_name: string | null
  match_quality: number | null
  highlight_moments: string[]
  internal_notes: string | null
  public_notes: string | null
  is_public: boolean
  is_pinned: boolean
}

const STEPS = [
  { id: 1, label: 'Gà nhà', emoji: '🐓' },
  { id: 2, label: 'Đối thủ', emoji: '🆚' },
  { id: 3, label: 'Luật & Giải', emoji: '⚖️' },
  { id: 4, label: 'Kết quả & Media', emoji: '🏆' },
]

export function MatchFormClient({
  chickens,
  tournaments,
  editing,
  defaultChickenId,
  recentChickenIds = [],
}: {
  chickens: Chicken[]
  tournaments: Tournament[]
  editing: Editing | null
  defaultChickenId?: string
  recentChickenIds?: string[]
}) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // === FORM STATE ===
  const [chickenId, setChickenId] = useState(editing?.chicken_id ?? defaultChickenId ?? '')
  const [chickenSearch, setChickenSearch] = useState('')
  const [matchDate, setMatchDate] = useState(editing?.match_date ?? new Date().toISOString().slice(0, 10))
  const [matchTime, setMatchTime] = useState(editing?.match_time ?? '')
  const [tournamentId, setTournamentId] = useState(editing?.tournament_id ?? '')
  const [selfWeight, setSelfWeight] = useState<string>(editing?.self_weight_kg?.toString() ?? '')

  // Đối thủ
  const [oppName, setOppName] = useState(editing?.opponent_name ?? '')
  const [oppOwner, setOppOwner] = useState(editing?.opponent_owner ?? '')
  const [oppBreed, setOppBreed] = useState(editing?.opponent_breed ?? '')
  const [oppOrigin, setOppOrigin] = useState(editing?.opponent_origin ?? '')
  const [oppWeight, setOppWeight] = useState<string>(editing?.opponent_weight_kg?.toString() ?? '')

  // Luật
  const [rules, setRules] = useState<MatchRules>(editing?.rules ?? 'don')
  const [spursType, setSpursType] = useState<MatchSpursType>(editing?.spurs_type ?? 'khong')
  const [weightClass, setWeightClass] = useState(editing?.weight_class ?? '')
  const [roundsPlanned, setRoundsPlanned] = useState<string>(editing?.rounds_planned?.toString() ?? '5')
  const [isHoDoc, setIsHoDoc] = useState(editing?.is_ho_doc ?? false)

  // Kết quả
  const [result, setResult] = useState<MatchResult | ''>(editing?.result ?? '')
  const [resultMethod, setResultMethod] = useState<MatchResultMethod | ''>(editing?.result_method ?? '')
  const [resultRound, setResultRound] = useState<string>(editing?.result_round?.toString() ?? '')
  const [roundsActual, setRoundsActual] = useState<string>(editing?.rounds_actual?.toString() ?? '')
  const [totalDuration, setTotalDuration] = useState<string>(editing?.total_duration_minutes?.toString() ?? '')
  const [injurySelf, setInjurySelf] = useState<MatchInjuryLevel>(editing?.injury_self ?? 'khong')
  const [injuryNotes, setInjuryNotes] = useState(editing?.injury_notes ?? '')

  // Tài chính
  const [prizeMoney, setPrizeMoney] = useState<string>(editing?.prize_money?.toString() ?? '0')
  const [bettingAmount, setBettingAmount] = useState<string>(editing?.betting_amount?.toString() ?? '0')
  const [bettingWon, setBettingWon] = useState<string>(editing?.betting_won?.toString() ?? '0')

  // Media
  const [photoUrls, setPhotoUrls] = useState<string[]>(editing?.photo_urls ?? [])
  const [videoUrl, setVideoUrl] = useState(editing?.video_url ?? '')
  const [refereeName, setRefereeName] = useState(editing?.referee_name ?? '')
  const [matchQuality, setMatchQuality] = useState<number | null>(editing?.match_quality ?? null)
  const [highlights, setHighlights] = useState<string>((editing?.highlight_moments ?? []).join('\n'))
  const [internalNotes, setInternalNotes] = useState(editing?.internal_notes ?? '')
  const [publicNotes, setPublicNotes] = useState(editing?.public_notes ?? '')
  const [isPublic, setIsPublic] = useState(editing?.is_public ?? true)
  const [isPinned, setIsPinned] = useState(editing?.is_pinned ?? false)

  // === Smart picker filters ===
  const [genderFilter, setGenderFilter] = useState<'all' | 'trong' | 'mai'>('all')
  const [statusFilter, setStatusFilter] = useState<'available' | 'all' | 'da_ban'>('available')
  const [tierFilter, setTierFilter] = useState<'all' | 'has_record' | 'fighter' | 'on_fire'>('all')
  const [breedFilter, setBreedFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'recent' | 'code' | 'stars' | 'age'>('recent')

  const breedList = useMemo(() => {
    const set = new Map<string, string>()
    for (const c of chickens) {
      const b = Array.isArray(c.breeds) ? c.breeds[0] : c.breeds
      if (b?.name_vi) set.set(b.name_vi, b.name_vi)
    }
    return Array.from(set.values()).sort()
  }, [chickens])

  const filteredChickens = useMemo(() => {
    const q = chickenSearch.trim().toLowerCase()
    const today = Date.now()
    let list = chickens.filter((c) => {
      // Gender
      if (genderFilter !== 'all' && c.gender !== genderFilter) return false
      // Status
      if (statusFilter === 'available' && !['dang_nuoi', 'dang_cach_ly'].includes(c.status)) return false
      if (statusFilter === 'da_ban' && c.status !== 'da_ban') return false
      // Combat tier
      const stats = c.stats
      if (tierFilter === 'has_record' && (!stats || stats.total_matches === 0)) return false
      if (tierFilter === 'fighter' && (!stats || stats.wins < 2)) return false
      if (tierFilter === 'on_fire' && (!stats || stats.current_win_streak < 3)) return false
      // Breed
      if (breedFilter !== 'all') {
        const b = Array.isArray(c.breeds) ? c.breeds[0] : c.breeds
        if (b?.name_vi !== breedFilter) return false
      }
      // Search
      if (q) {
        const hay = `${c.chicken_code} ${c.name ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })

    // Sort
    const recentIdx: Record<string, number> = {}
    recentChickenIds.forEach((id, i) => { recentIdx[id] = i })
    list = [...list].sort((a, b) => {
      if (sortBy === 'recent') {
        // Gà recently used trước, sau đó theo code
        const ai = recentIdx[a.id] ?? 999
        const bi = recentIdx[b.id] ?? 999
        if (ai !== bi) return ai - bi
        return a.chicken_code.localeCompare(b.chicken_code)
      }
      if (sortBy === 'code') return a.chicken_code.localeCompare(b.chicken_code)
      if (sortBy === 'stars') return (b.stats?.stars ?? 0) - (a.stats?.stars ?? 0)
      if (sortBy === 'age') {
        const aD = a.birth_date ? new Date(a.birth_date).getTime() : today
        const bD = b.birth_date ? new Date(b.birth_date).getTime() : today
        return aD - bD  // sinh sớm = lớn hơn
      }
      return 0
    })

    return list.slice(0, 100)
  }, [chickens, chickenSearch, genderFilter, statusFilter, tierFilter, breedFilter, sortBy, recentChickenIds])

  const selectedChicken = chickens.find((c) => c.id === chickenId)

  function ageMonths(birth: string | null | undefined): number | null {
    if (!birth) return null
    return Math.floor((Date.now() - new Date(birth).getTime()) / (1000 * 60 * 60 * 24 * 30))
  }

  function clearAllFilters() {
    setChickenSearch('')
    setGenderFilter('all')
    setStatusFilter('available')
    setTierFilter('all')
    setBreedFilter('all')
    setSortBy('recent')
  }

  const totalAvailable = chickens.filter((c) =>
    ['dang_nuoi', 'dang_cach_ly'].includes(c.status)
  ).length

  function next() {
    if (step === 1 && !chickenId) {
      setError('Vui lòng chọn gà nhà')
      return
    }
    if (step === 2 && !oppName.trim()) {
      setError('Nhập tên đối thủ')
      return
    }
    setError(null)
    setStep((s) => Math.min(4, s + 1))
  }
  function prev() {
    setError(null)
    setStep((s) => Math.max(1, s - 1))
  }

  async function handleSave(asDraft: boolean) {
    if (!chickenId) {
      setError('Cần chọn gà nhà')
      return
    }
    if (!oppName.trim()) {
      setError('Cần nhập tên đối thủ')
      return
    }
    setSaving(true)
    setError(null)

    const body = {
      id: editing?.id,
      chicken_id: chickenId,
      tournament_id: tournamentId || null,
      match_date: matchDate,
      match_time: matchTime || null,

      opponent_name: oppName.trim(),
      opponent_owner: oppOwner.trim() || null,
      opponent_breed: oppBreed.trim() || null,
      opponent_origin: oppOrigin.trim() || null,
      opponent_weight_kg: oppWeight ? Number(oppWeight) : null,

      self_weight_kg: selfWeight ? Number(selfWeight) : null,
      rules,
      spurs_type: spursType,
      weight_class: weightClass.trim() || null,
      rounds_planned: roundsPlanned ? Number(roundsPlanned) : null,
      is_ho_doc: isHoDoc,

      result: asDraft ? null : (result || null),
      result_method: result ? resultMethod || null : null,
      result_round: resultRound ? Number(resultRound) : null,
      rounds_actual: roundsActual ? Number(roundsActual) : 0,
      total_duration_minutes: totalDuration ? Number(totalDuration) : null,

      injury_self: injurySelf,
      injury_notes: injuryNotes.trim() || null,

      prize_money: prizeMoney ? Number(prizeMoney) : 0,
      betting_amount: bettingAmount ? Number(bettingAmount) : 0,
      betting_won: bettingWon ? Number(bettingWon) : 0,

      photo_urls: photoUrls,
      video_url: videoUrl.trim() || null,
      referee_name: refereeName.trim() || null,
      match_quality: matchQuality,
      highlight_moments: highlights.split('\n').map((h) => h.trim()).filter(Boolean),

      internal_notes: internalNotes.trim() || null,
      public_notes: publicNotes.trim() || null,
      is_public: isPublic,
      is_pinned: isPinned,
    }

    const res = await fetch('/api/matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(typeof json.error === 'string' ? json.error : JSON.stringify(json.error))
      setSaving(false)
      return
    }
    router.push(`/admin/thi-dau/${json.match.id}`)
    router.refresh()
  }

  return (
    <div>
      {/* Step indicator */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {STEPS.map((s) => {
          const isActive = step === s.id
          const isDone = step > s.id
          return (
            <button
              key={s.id}
              onClick={() => setStep(s.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm whitespace-nowrap transition ${
                isActive
                  ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold shadow'
                  : isDone
                  ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600'
              }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                isActive ? 'bg-white/30' : isDone ? 'bg-emerald-500 text-white' : 'bg-white dark:bg-gray-700'
              }`}>
                {isDone ? '✓' : s.id}
              </span>
              <span>{s.emoji} {s.label}</span>
            </button>
          )
        })}
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5">
        {/* === STEP 1: Gà nhà === */}
        {step === 1 && (
          <section className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">🐓 Chọn gà nhà</h2>

            {selectedChicken ? (
              <div className="border-2 border-emerald-300 dark:border-emerald-800 rounded-xl p-3 bg-emerald-50 dark:bg-emerald-950/30 flex items-center gap-3">
                <div className="w-16 h-16 rounded-lg bg-white overflow-hidden border border-emerald-200">
                  {selectedChicken.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={selectedChicken.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl">🐓</div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-gray-900 dark:text-gray-100">
                    {selectedChicken.name || selectedChicken.chicken_code}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Mã: <span className="font-mono">{selectedChicken.chicken_code}</span>
                    {' · '}
                    {Array.isArray(selectedChicken.breeds)
                      ? selectedChicken.breeds[0]?.name_vi
                      : selectedChicken.breeds?.name_vi}
                  </div>
                </div>
                <button
                  onClick={() => setChickenId('')}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Đổi
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Search bar */}
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                  <input
                    value={chickenSearch}
                    onChange={(e) => setChickenSearch(e.target.value)}
                    placeholder="Tìm mã (VD: GA0018) hoặc tên (VD: Bá Vương)..."
                    autoFocus
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                  />
                </div>

                {/* Filter chips row 1: Quick filters with stats */}
                <div className="flex gap-1.5 flex-wrap text-xs">
                  <span className="text-[10px] text-gray-500 mr-1 self-center font-bold uppercase tracking-wide">Lọc nhanh:</span>
                  <PickerPill active={tierFilter === 'all'} onClick={() => setTierFilter('all')}>
                    🌐 Tất cả
                  </PickerPill>
                  <PickerPill active={tierFilter === 'has_record'} onClick={() => setTierFilter('has_record')}>
                    ⭐ Có thành tích
                  </PickerPill>
                  <PickerPill active={tierFilter === 'fighter'} onClick={() => setTierFilter('fighter')} color="amber">
                    🏆 Gà chiến (≥2 sao)
                  </PickerPill>
                  <PickerPill active={tierFilter === 'on_fire'} onClick={() => setTierFilter('on_fire')} color="red">
                    🔥 ON-FIRE (3+ streak)
                  </PickerPill>
                </div>

                {/* Filter chips row 2: Gender + Status */}
                <div className="flex gap-1.5 flex-wrap text-xs items-center">
                  <span className="text-[10px] text-gray-500 mr-1 font-bold uppercase tracking-wide">Giới tính:</span>
                  <PickerPill active={genderFilter === 'all'} onClick={() => setGenderFilter('all')}>Cả 2</PickerPill>
                  <PickerPill active={genderFilter === 'trong'} onClick={() => setGenderFilter('trong')} color="blue">
                    ♂ Trống
                  </PickerPill>
                  <PickerPill active={genderFilter === 'mai'} onClick={() => setGenderFilter('mai')} color="pink">
                    ♀ Mái
                  </PickerPill>
                  <span className="text-gray-300 mx-1">|</span>
                  <span className="text-[10px] text-gray-500 mr-1 font-bold uppercase tracking-wide">Trạng thái:</span>
                  <PickerPill active={statusFilter === 'available'} onClick={() => setStatusFilter('available')}>
                    🟢 Đang nuôi
                  </PickerPill>
                  <PickerPill active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>Tất cả</PickerPill>
                  <PickerPill active={statusFilter === 'da_ban'} onClick={() => setStatusFilter('da_ban')}>📦 Đã bán (cũ)</PickerPill>
                </div>

                {/* Filter row 3: Breed dropdown + sort + clear */}
                <div className="flex gap-2 flex-wrap text-xs items-center">
                  <select
                    value={breedFilter}
                    onChange={(e) => setBreedFilter(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-full text-xs"
                  >
                    <option value="all">🧬 Tất cả giống ({chickens.length})</option>
                    {breedList.map((b) => (
                      <option key={b} value={b}>🧬 {b}</option>
                    ))}
                  </select>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-full text-xs"
                  >
                    <option value="recent">🕐 Gần đây dùng (mặc định)</option>
                    <option value="code">🔤 Theo mã (GA0001…)</option>
                    <option value="stars">⭐ Sao chiến (cao→thấp)</option>
                    <option value="age">📅 Tuổi (lớn→nhỏ)</option>
                  </select>
                  <button onClick={clearAllFilters} className="text-gray-500 hover:text-gray-700 underline">
                    ↺ Xoá filter
                  </button>
                  <span className="ml-auto text-gray-500">
                    Hiển thị <b>{filteredChickens.length}</b> / {totalAvailable} gà có thể đấu
                  </span>
                </div>

                {/* Recent badge */}
                {recentChickenIds.length > 0 && sortBy === 'recent' && !chickenSearch && tierFilter === 'all' && (
                  <div className="text-[11px] text-amber-700 dark:text-amber-400 italic">
                    💡 Đang ưu tiên hiện <b>{recentChickenIds.length} con</b> đã đấu gần đây
                  </div>
                )}

                {/* Chicken grid */}
                <div className="max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2">
                  {filteredChickens.length === 0 ? (
                    <div className="p-6 text-xs text-gray-500 text-center">
                      Không tìm thấy gà khớp filter — thử xoá bớt điều kiện
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {filteredChickens.map((c) => (
                        <ChickenPickerCard key={c.id} chicken={c} onPick={() => setChickenId(c.id)} ageMonths={ageMonths} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="📅 Ngày đấu" type="date" value={matchDate} onChange={setMatchDate} />
              <Field label="🕐 Giờ" type="time" value={matchTime} onChange={setMatchTime} />
              <Field
                label="⚖️ Cân của gà nhà (kg)"
                type="number"
                value={selfWeight}
                onChange={setSelfWeight}
                placeholder="2.5"
                step="0.01"
              />
            </div>
          </section>
        )}

        {/* === STEP 2: Đối thủ === */}
        {step === 2 && (
          <section className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">🆚 Thông tin đối thủ</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Tên gà đối *" value={oppName} onChange={setOppName} placeholder="VD: Bạch Hổ" required />
              <Field label="Chủ gà đối" value={oppOwner} onChange={setOppOwner} placeholder="VD: Anh Hùng - Trại Vũ" />
              <Field label="Giống gà đối" value={oppBreed} onChange={setOppBreed} placeholder="Nòi / Asil / Mỹ..." />
              <Field label="Xuất xứ (xã/huyện/tỉnh)" value={oppOrigin} onChange={setOppOrigin} placeholder="Hoa Lư, Ninh Bình" />
              <Field label="Cân đối thủ (kg)" type="number" value={oppWeight} onChange={setOppWeight} step="0.01" />
            </div>
          </section>
        )}

        {/* === STEP 3: Luật & Giải === */}
        {step === 3 && (
          <section className="space-y-5">
            <h2 className="text-lg font-bold flex items-center gap-2">⚖️ Luật chơi & Giải đấu</h2>

            <div>
              <Label>Loại luật</Label>
              <div className="grid grid-cols-2 gap-2">
                {(['don', 'cua'] as MatchRules[]).map((r) => {
                  const m = RULES_META[r]
                  const active = rules === r
                  return (
                    <button
                      key={r}
                      onClick={() => setRules(r)}
                      className={`text-left border-2 rounded-xl p-3 transition ${
                        active
                          ? 'border-red-500 bg-red-50 dark:bg-red-950/30'
                          : 'border-gray-200 dark:border-gray-700 hover:border-red-300'
                      }`}
                    >
                      <div className="text-2xl">{m.emoji}</div>
                      <div className="font-bold">{m.label}</div>
                      <div className="text-[11px] text-gray-500">{m.desc}</div>
                    </button>
                  )
                })}
              </div>
            </div>

            {rules === 'cua' && (
              <div>
                <Label>Loại cựa</Label>
                <div className="flex gap-2 flex-wrap">
                  {(['khong', 'sat', 'dao', 'tron'] as MatchSpursType[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSpursType(s)}
                      className={`text-xs px-3 py-1.5 rounded-full border ${
                        spursType === s
                          ? 'bg-red-500 text-white border-red-500 font-semibold'
                          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {SPURS_META[s].emoji} {SPURS_META[s].label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label>Giải đấu (tùy chọn)</Label>
              <select
                value={tournamentId}
                onChange={(e) => setTournamentId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg text-sm"
              >
                <option value="">— Trận tự do (không thuộc giải) —</option>
                {tournaments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {TOURNAMENT_TYPE_META[t.type as keyof typeof TOURNAMENT_TYPE_META]?.emoji} {t.name}
                    {t.start_date && ` · ${t.start_date.split('-').reverse().join('/')}`}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-gray-500 mt-1">
                Chưa có giải? <a href="/admin/thi-dau/giai-dau" className="text-blue-600 hover:underline">+ Tạo giải mới</a>
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="Hạng cân (text)" value={weightClass} onChange={setWeightClass} placeholder="VD: 2.0-2.5kg" />
              <Field label="Số hồ dự kiến" type="number" value={roundsPlanned} onChange={setRoundsPlanned} placeholder="5" />
              <label className="flex items-center gap-2 mt-6 cursor-pointer">
                <input type="checkbox" checked={isHoDoc} onChange={(e) => setIsHoDoc(e.target.checked)} />
                <span className="text-sm">⚡ Đấu Hồ độc</span>
              </label>
            </div>
          </section>
        )}

        {/* === STEP 4: Kết quả & Media === */}
        {step === 4 && (
          <section className="space-y-5">
            <h2 className="text-lg font-bold flex items-center gap-2">🏆 Kết quả & Media</h2>

            <div>
              <Label>Kết quả trận</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {(Object.keys(RESULT_META) as MatchResult[]).map((r) => {
                  const m = RESULT_META[r]
                  const active = result === r
                  return (
                    <button
                      key={r}
                      onClick={() => setResult(r)}
                      className={`p-3 rounded-xl text-left border-2 transition ${
                        active
                          ? `${m.cls} border-transparent shadow-md`
                          : 'border-gray-200 dark:border-gray-700 hover:border-red-300 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <div className="text-2xl">{m.emoji}</div>
                      <div className={`text-xs font-bold ${active ? '' : 'text-gray-700 dark:text-gray-300'}`}>{m.label}</div>
                    </button>
                  )
                })}
              </div>
            </div>

            {result && (
              <>
                <div>
                  <Label>Cách kết thúc</Label>
                  <select
                    value={resultMethod}
                    onChange={(e) => setResultMethod(e.target.value as MatchResultMethod)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg text-sm"
                  >
                    <option value="">— Chọn —</option>
                    {(Object.keys(RESULT_METHOD_META) as MatchResultMethod[]).map((k) => (
                      <option key={k} value={k}>
                        {RESULT_METHOD_META[k].emoji} {RESULT_METHOD_META[k].label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Field label="Hồ kết thúc" type="number" value={resultRound} onChange={setResultRound} placeholder="VD: 4" />
                  <Field label="Tổng hồ đã đấu" type="number" value={roundsActual} onChange={setRoundsActual} placeholder="VD: 4" />
                  <Field label="Tổng phút" type="number" value={totalDuration} onChange={setTotalDuration} placeholder="VD: 47" />
                  <div>
                    <Label>Đánh giá trận</Label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          onClick={() => setMatchQuality(matchQuality === s ? null : s)}
                          className="text-xl"
                        >
                          {(matchQuality ?? 0) >= s ? '⭐' : '☆'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>Mức thương tích gà nhà</Label>
                    <div className="flex gap-1 flex-wrap">
                      {(['khong', 'nhe', 'nang', 'chi_mang'] as MatchInjuryLevel[]).map((i) => (
                        <button
                          key={i}
                          onClick={() => setInjurySelf(i)}
                          className={`text-xs px-3 py-1.5 rounded-full border ${
                            injurySelf === i
                              ? 'bg-orange-500 text-white border-orange-500 font-semibold'
                              : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                          }`}
                        >
                          {INJURY_META[i].emoji} {INJURY_META[i].label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Field label="Ghi chú thương tích" value={injuryNotes} onChange={setInjuryNotes} placeholder="VD: Sướt cánh trái, mất 7 ngày phục hồi" />
                </div>
              </>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl p-3">
              <div className="md:col-span-3 text-xs font-semibold text-amber-900 dark:text-amber-300">
                💰 Tài chính (KHÔNG hiển thị trên web public)
              </div>
              <Field label="Tiền thưởng giải" type="number" value={prizeMoney} onChange={setPrizeMoney} step="100000" />
              <Field label="Số tiền cược" type="number" value={bettingAmount} onChange={setBettingAmount} step="100000" />
              <Field label="Cược thắng/thua" type="number" value={bettingWon} onChange={setBettingWon} step="100000" help="Dương = thắng, âm = thua" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Trọng tài" value={refereeName} onChange={setRefereeName} placeholder="VD: Anh Tâm" />
              <Field label="Link video YouTube/FB" value={videoUrl} onChange={setVideoUrl} placeholder="https://..." />
            </div>

            <div>
              <Label>Highlight moments (mỗi dòng 1 ý)</Label>
              <textarea
                value={highlights}
                onChange={(e) => setHighlights(e.target.value)}
                rows={3}
                placeholder="VD:&#10;Hồ 2: cú đá knock down 2 lần&#10;Hồ 4: KO bằng cú mỏ vào mắt"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg text-sm"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>📝 Ghi chú nội bộ (private)</Label>
                <textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg text-sm"
                />
              </div>
              <div>
                <Label>🌐 Ghi chú công khai (hiện trên /ga/[tag])</Label>
                <textarea
                  value={publicNotes}
                  onChange={(e) => setPublicNotes(e.target.value)}
                  rows={3}
                  placeholder="VD: Trận hay với cú KO đẹp ở hồ 4"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
                <span className="text-sm">🌐 Hiện trận này trên web public</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isPinned} onChange={(e) => setIsPinned(e.target.checked)} />
                <span className="text-sm">📌 Ghim làm trận đấu nổi bật</span>
              </label>
            </div>
          </section>
        )}

        {error && (
          <div className="mt-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-900 rounded-lg p-3 text-sm text-red-700 dark:text-red-300">
            ⚠ {error}
          </div>
        )}

        {/* Nav */}
        <div className="mt-5 flex gap-2 flex-wrap">
          {step > 1 && (
            <button
              onClick={prev}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              ← Quay lại
            </button>
          )}
          {step < 4 ? (
            <button
              onClick={next}
              className="ml-auto bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-lg px-5 py-2 text-sm font-bold shadow"
            >
              Tiếp theo →
            </button>
          ) : (
            <div className="ml-auto flex gap-2">
              <button
                onClick={() => handleSave(true)}
                disabled={saving}
                className="border-2 border-amber-400 text-amber-700 dark:text-amber-300 rounded-lg px-5 py-2 text-sm font-semibold hover:bg-amber-50 dark:hover:bg-amber-950/30 disabled:opacity-50"
              >
                {saving ? 'Đang lưu...' : '📝 Lưu nháp'}
              </button>
              <button
                onClick={() => handleSave(false)}
                disabled={saving || !result}
                className="bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-lg px-5 py-2 text-sm font-bold shadow disabled:opacity-50"
                title={!result ? 'Chọn kết quả trận trước' : ''}
              >
                {saving ? 'Đang lưu...' : '🏆 Lưu kết quả'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1.5">
      {children}
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  step,
  required,
  help,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  step?: string
  required?: boolean
  help?: string
}) {
  return (
    <label className="block">
      <span className="text-xs block mb-1 text-gray-700 dark:text-gray-300 font-medium">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        step={step}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg text-sm"
      />
      {help && <span className="text-[11px] text-gray-500 mt-0.5 block">{help}</span>}
    </label>
  )
}

function PickerPill({
  active,
  onClick,
  color = 'emerald',
  children,
}: {
  active: boolean
  onClick: () => void
  color?: 'emerald' | 'amber' | 'red' | 'blue' | 'pink'
  children: React.ReactNode
}) {
  const c = {
    emerald: 'bg-emerald-500 border-emerald-500',
    amber:   'bg-amber-500 border-amber-500',
    red:     'bg-red-500 border-red-500',
    blue:    'bg-blue-500 border-blue-500',
    pink:    'bg-pink-500 border-pink-500',
  }[color]
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full border whitespace-nowrap transition-all ${
        active
          ? `${c} text-white font-semibold shadow-sm`
          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-emerald-300'
      }`}
    >
      {children}
    </button>
  )
}

function ChickenPickerCard({
  chicken: c,
  onPick,
  ageMonths,
}: {
  chicken: Chicken
  onPick: () => void
  ageMonths: (b: string | null | undefined) => number | null
}) {
  const breed = Array.isArray(c.breeds) ? c.breeds[0]?.name_vi : c.breeds?.name_vi
  const area = Array.isArray(c.area) ? c.area[0] : c.area
  const age = ageMonths(c.birth_date)
  const stats = c.stats
  const genderIcon = c.gender === 'trong' ? '♂' : c.gender === 'mai' ? '♀' : '?'
  const genderColor = c.gender === 'trong' ? 'text-blue-600' : c.gender === 'mai' ? 'text-pink-600' : 'text-gray-400'
  const isOnFire = (stats?.current_win_streak ?? 0) >= 3
  const tierMap: Record<string, { emoji: string; label: string; cls: string }> = {
    huyen_thoai:  { emoji: '🏆', label: 'Huyền thoại', cls: 'bg-yellow-100 text-yellow-800' },
    chien_tuong:  { emoji: '👑', label: 'Chiến tướng', cls: 'bg-purple-100 text-purple-700' },
    ga_an_ky_3:   { emoji: '⭐⭐⭐', label: 'Kỳ 3', cls: 'bg-red-100 text-red-700' },
    ga_an_ky_2:   { emoji: '⭐⭐', label: 'Kỳ 2', cls: 'bg-orange-100 text-orange-700' },
    ga_an_ky_1:   { emoji: '⭐', label: 'Kỳ 1', cls: 'bg-amber-100 text-amber-700' },
    ga_mo_mo:     { emoji: '🥚', label: 'Mở mỏ', cls: 'bg-violet-100 text-violet-700' },
    ga_van_nuoc:  { emoji: '💧', label: 'Vần nước', cls: 'bg-blue-100 text-blue-700' },
    ga_van_kho:   { emoji: '💪', label: 'Vần khô', cls: 'bg-cyan-100 text-cyan-700' },
    ga_to:        { emoji: '🌱', label: 'Gà tơ', cls: 'bg-green-100 text-green-700' },
    ga_con:       { emoji: '🐣', label: 'Gà con', cls: 'bg-yellow-100 text-yellow-700' },
  }
  const tierInfo = stats?.combat_tier ? tierMap[stats.combat_tier] : null

  return (
    <button
      onClick={onPick}
      className="text-left flex items-center gap-2 px-2.5 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition group"
    >
      <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 overflow-hidden shrink-0 ring-2 ring-transparent group-hover:ring-emerald-300">
        {c.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.image_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">🐓</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`font-bold text-sm ${genderColor}`}>{genderIcon}</span>
          <span className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate">
            {c.name || c.chicken_code}
          </span>
          {isOnFire && (
            <span className="text-[9px] bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-full px-1.5 py-0.5 animate-pulse">
              🔥{stats?.current_win_streak}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400 truncate">
          <span className="font-mono">{c.chicken_code}</span>
          {breed && <><span>·</span><span>{breed}</span></>}
          {age !== null && <><span>·</span><span>{age}t</span></>}
          {c.weight_kg && <><span>·</span><span>{c.weight_kg}kg</span></>}
          {area && <><span>·</span><span>📍{area.code}</span></>}
        </div>
        {(tierInfo || stats?.total_matches) && (
          <div className="flex items-center gap-1 mt-0.5">
            {tierInfo && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${tierInfo.cls}`}>
                {tierInfo.emoji} {tierInfo.label}
              </span>
            )}
            {stats && stats.total_matches > 0 && (
              <span className="text-[9px] text-gray-500">
                {stats.wins}/{stats.total_matches} thắng
              </span>
            )}
          </div>
        )}
        {c.status === 'da_ban' && (
          <span className="text-[9px] bg-blue-100 text-blue-700 rounded px-1 mt-0.5 inline-block">📦 Đã bán</span>
        )}
        {c.status === 'dang_cach_ly' && (
          <span className="text-[9px] bg-amber-100 text-amber-700 rounded px-1 mt-0.5 inline-block">🏥 Cách ly</span>
        )}
      </div>
    </button>
  )
}
