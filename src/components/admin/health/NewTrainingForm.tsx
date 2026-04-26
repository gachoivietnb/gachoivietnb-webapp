'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { removeDiacritics } from '@/lib/utils/slugify'
import { getBreedColor } from '@/lib/utils/breed-colors'
import { Camera, Video as VideoIcon, X, Globe, Lock } from 'lucide-react'

type MediaItem = {
  localId: string
  file: File
  previewUrl: string
  isVideo: boolean
  caption: string
  isPublic: boolean
}

type Chicken = {
  id: string
  chicken_code: string
  name: string | null
  age_months: number | null
  weight_kg: number | null
  breed_code: string | null
  breed_name: string | null
  gender: string | null
  status: string
  tag_number?: string | null
}

type Breed = { code: string; name_vi: string }

export function NewTrainingForm({
  chickens,
  breeds,
}: {
  chickens: Chicken[]
  breeds: Breed[]
}) {
  const router = useRouter()
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    chicken_id: '',
    session_date: today,
    duration_minutes: 10,
    score_strength: 7,
    score_appearance: 7,
    score_aggression: 7,
    result: '' as '' | 'thang' | 'thua' | 'hoa',
    opponent_name: '',
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [media, setMedia] = useState<MediaItem[]>([])
  const [uploadStatus, setUploadStatus] = useState<{ done: number; total: number } | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const totalScore = ((form.score_strength + form.score_appearance + form.score_aggression) / 3).toFixed(1)
  const selectedChicken = chickens.find((c) => c.id === form.chicken_id)

  function addMediaFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return
    const incoming: MediaItem[] = Array.from(fileList).map((f) => ({
      localId: Math.random().toString(36).slice(2),
      file: f,
      previewUrl: URL.createObjectURL(f),
      isVideo: f.type.startsWith('video/'),
      caption: '',
      isPublic: false, // training media defaults to PRIVATE — user must opt in
    }))
    setMedia((m) => [...m, ...incoming])
  }

  function removeMedia(localId: string) {
    setMedia((m) => {
      const target = m.find((x) => x.localId === localId)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return m.filter((x) => x.localId !== localId)
    })
  }

  function patchMedia(localId: string, patch: Partial<MediaItem>) {
    setMedia((m) => m.map((x) => (x.localId === localId ? { ...x, ...patch } : x)))
  }

  async function uploadMediaForSession(sessionId: string, chickenId: string) {
    if (media.length === 0) return
    setUploadStatus({ done: 0, total: media.length })
    for (let i = 0; i < media.length; i++) {
      const item = media[i]
      const fd = new FormData()
      fd.append('file', item.file)
      fd.append('chicken_id', chickenId)
      fd.append('training_session_id', sessionId)
      fd.append('is_public', String(item.isPublic))
      if (item.caption) fd.append('caption', item.caption)
      try {
        await fetch('/api/chickens/media', { method: 'POST', body: fd })
      } catch {
        // continue uploading other files even if one fails
      }
      setUploadStatus({ done: i + 1, total: media.length })
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.chicken_id) return setErr('Chọn gà')
    setLoading(true); setErr(null)

    const payload: Record<string, unknown> = {
      chicken_id: form.chicken_id,
      session_date: form.session_date,
      score_strength: form.score_strength,
      score_appearance: form.score_appearance,
      score_aggression: form.score_aggression,
    }
    if (form.duration_minutes) payload.duration_minutes = form.duration_minutes
    if (form.result) payload.result = form.result
    if (form.opponent_name) payload.opponent_name = form.opponent_name
    if (form.notes) payload.notes = form.notes

    const res = await fetch('/api/training-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    if (!res.ok) { setErr(typeof json.error === 'string' ? json.error : JSON.stringify(json.error)); setLoading(false); return }

    const sessionId = (json.data as { id?: string } | null)?.id
    if (sessionId && media.length > 0) {
      await uploadMediaForSession(sessionId, form.chicken_id)
    }

    router.push('/admin/van-ga')
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* === STEP 1: CHICKEN PICKER === */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 md:p-5">
        <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">1</span>
          Chọn gà *
        </h2>
        <ChickenPicker
          chickens={chickens}
          breeds={breeds}
          selectedId={form.chicken_id}
          onSelect={(id) => setForm({ ...form, chicken_id: id })}
        />
      </div>

      {/* === STEP 2: SESSION METADATA === */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 md:p-5">
        <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">2</span>
          Thông tin buổi vần
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-sm font-medium mb-1">Ngày *</span>
            <input type="date" required value={form.session_date} onChange={(e) => setForm({ ...form, session_date: e.target.value })}
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded px-3 py-2" />
          </label>
          <label className="block">
            <span className="block text-sm font-medium mb-1">Thời lượng (phút)</span>
            <input type="number" min={1} value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 10 })}
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded px-3 py-2" />
          </label>
        </div>
      </div>

      {/* === STEP 3: SCORES === */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 md:p-5">
        <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">3</span>
          Chấm điểm (0-10)
        </h2>
        <div className="space-y-3 bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
          <ScoreSlider label="💪 Thể lực" value={form.score_strength} onChange={(v) => setForm({ ...form, score_strength: v })} />
          <ScoreSlider label="🦚 Vóc dáng" value={form.score_appearance} onChange={(v) => setForm({ ...form, score_appearance: v })} />
          <ScoreSlider label="🔥 Tính hung hãn" value={form.score_aggression} onChange={(v) => setForm({ ...form, score_aggression: v })} />
          <div className="text-center pt-3 border-t border-gray-200 dark:border-gray-700">
            <span className="text-xs text-gray-500 dark:text-gray-400">Điểm tổng (trung bình)</span>
            <div className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">{totalScore}</div>
          </div>
        </div>
      </div>

      {/* === STEP 4: RESULT & NOTES === */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 md:p-5 space-y-3">
        <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">4</span>
          Kết quả & ghi chú
        </h2>
        <label className="block">
          <span className="block text-sm font-medium mb-1">Kết quả</span>
          <div className="flex gap-2">
            {([['', '—'], ['thang', '🥇 Thắng'], ['thua', '❌ Thua'], ['hoa', '🤝 Hoà']] as const).map(([v, l]) => (
              <button key={v} type="button" onClick={() => setForm({ ...form, result: v as '' | 'thang' | 'thua' | 'hoa' })}
                className={`flex-1 px-3 py-2 rounded text-sm font-medium transition ${form.result === v ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                {l}
              </button>
            ))}
          </div>
        </label>

        <label className="block">
          <span className="block text-sm font-medium mb-1">Đối thủ (nếu bên ngoài)</span>
          <input value={form.opponent_name} onChange={(e) => setForm({ ...form, opponent_name: e.target.value })}
            placeholder="Tên/mô tả đối thủ"
            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded px-3 py-2" />
        </label>

        <label className="block">
          <span className="block text-sm font-medium mb-1">Ghi chú</span>
          <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded px-3 py-2" />
        </label>
      </div>

      {/* === STEP 5: MEDIA CAPTURE === */}
      <div className="relative overflow-hidden bg-white dark:bg-gray-800 ring-1 ring-rose-200 dark:ring-rose-900 rounded-lg p-4 md:p-5">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-pink-500 to-violet-500" />
        <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-rose-600 text-white text-xs font-bold">5</span>
          Ảnh / video buổi vần
          <span className="text-[11px] font-normal text-gray-500 dark:text-gray-400 ml-1">
            (tuỳ chọn)
          </span>
        </h2>
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
          Chụp ảnh / quay clip làm bằng chứng buổi vần — sẽ lưu vào hồ sơ con gà này.
          Mỗi file bạn tự chọn 🌐 <b>Public</b> (hiện trên trang gia phả) hay 🔒 <b>Private</b> (chỉ trại xem).
        </p>

        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          onChange={(e) => {
            addMediaFiles(e.target.files)
            if (photoInputRef.current) photoInputRef.current.value = ''
          }}
          className="hidden"
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          capture="environment"
          onChange={(e) => {
            addMediaFiles(e.target.files)
            if (videoInputRef.current) videoInputRef.current.value = ''
          }}
          className="hidden"
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={(e) => {
            addMediaFiles(e.target.files)
            if (galleryInputRef.current) galleryInputRef.current.value = ''
          }}
          className="hidden"
        />

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            className="flex flex-col items-center gap-1 bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/40 dark:to-pink-950/40 border border-rose-200 dark:border-rose-900 hover:border-rose-400 rounded-lg py-3 transition"
          >
            <Camera className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            <span className="text-xs font-semibold text-rose-800 dark:text-rose-200">Chụp ảnh</span>
          </button>
          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            className="flex flex-col items-center gap-1 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/40 dark:to-purple-950/40 border border-violet-200 dark:border-violet-900 hover:border-violet-400 rounded-lg py-3 transition"
          >
            <VideoIcon className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            <span className="text-xs font-semibold text-violet-800 dark:text-violet-200">Quay clip</span>
          </button>
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            className="flex flex-col items-center gap-1 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-900 hover:border-blue-400 rounded-lg py-3 transition"
          >
            <span className="text-xl leading-none">🖼</span>
            <span className="text-xs font-semibold text-blue-800 dark:text-blue-200">Chọn từ máy</span>
          </button>
        </div>

        {media.length > 0 && (
          <div className="mt-3 space-y-2">
            <div className="text-[11px] text-gray-500 dark:text-gray-400">
              Đã chọn <b className="text-gray-900 dark:text-gray-100">{media.length}</b> file ·{' '}
              {media.filter((m) => m.isPublic).length} public · {media.filter((m) => !m.isPublic).length} private
            </div>
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {media.map((m) => (
                <li
                  key={m.localId}
                  className={
                    'relative group rounded-lg overflow-hidden border-2 ' +
                    (m.isPublic
                      ? 'border-emerald-400 dark:border-emerald-700'
                      : 'border-gray-300 dark:border-gray-600')
                  }
                >
                  <div className="aspect-square bg-gray-100 dark:bg-gray-900">
                    {m.isVideo ? (
                      <video
                        src={m.previewUrl}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.previewUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeMedia(m.localId)}
                    className="absolute top-1 right-1 bg-black/60 hover:bg-rose-600 text-white rounded-full p-1 transition"
                    title="Xoá file này"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  {m.isVideo && (
                    <span className="absolute top-1 left-1 bg-violet-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                      VIDEO
                    </span>
                  )}
                  <div className="p-1.5 bg-white dark:bg-gray-800 space-y-1">
                    <input
                      value={m.caption}
                      onChange={(e) => patchMedia(m.localId, { caption: e.target.value })}
                      placeholder="Mô tả ngắn..."
                      className="w-full text-[11px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded px-1.5 py-1 outline-none focus:border-rose-400"
                    />
                    <button
                      type="button"
                      onClick={() => patchMedia(m.localId, { isPublic: !m.isPublic })}
                      className={
                        'w-full inline-flex items-center justify-center gap-1 text-[10.5px] font-bold rounded px-1.5 py-1 transition ' +
                        (m.isPublic
                          ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300')
                      }
                      title={m.isPublic ? 'Bấm để đổi sang Private' : 'Bấm để đổi sang Public'}
                    >
                      {m.isPublic ? (
                        <>
                          <Globe className="w-3 h-3" /> PUBLIC
                        </>
                      ) : (
                        <>
                          <Lock className="w-3 h-3" /> PRIVATE
                        </>
                      )}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <p className="text-[10.5px] text-gray-500 dark:text-gray-400 italic">
              💡 Mặc định <b>Private</b> cho an toàn — chuyển <b>Public</b> nếu muốn khoe trên trang gia phả công khai.
            </p>
          </div>
        )}
      </div>

      {err && <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-300 rounded p-3 text-sm">{err}</div>}

      {uploadStatus && (
        <div className="bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-900 text-violet-800 dark:text-violet-200 rounded p-3 text-sm">
          📤 Đang upload media: <b>{uploadStatus.done}</b> / {uploadStatus.total}
          <div className="w-full bg-violet-100 dark:bg-violet-900/40 rounded-full h-1.5 mt-1.5 overflow-hidden">
            <div
              className="h-full bg-violet-500 transition-all"
              style={{ width: `${(uploadStatus.done / uploadStatus.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* === SUBMIT === */}
      <div className="sticky bottom-0 bg-gradient-to-t from-white via-white dark:from-gray-900 dark:via-gray-900 pt-3 pb-2 flex gap-2">
        <button type="submit" disabled={loading || !form.chicken_id}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-3 font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
          {loading ? 'Đang lưu...' : selectedChicken ? `✓ Lưu buổi vần cho ${selectedChicken.name ?? selectedChicken.chicken_code}` : 'Chọn gà để tiếp tục'}
        </button>
        <button type="button" onClick={() => router.back()} className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3">
          Hủy
        </button>
      </div>
    </form>
  )
}

/* ================================================================
 * CHICKEN PICKER — filter bar + grid cards (same UX as /admin/van-ga)
 * ================================================================ */
function ChickenPicker({
  chickens,
  breeds,
  selectedId,
  onSelect,
}: {
  chickens: Chicken[]
  breeds: Breed[]
  selectedId: string
  onSelect: (id: string) => void
}) {
  const [query, setQuery] = useState('')
  const [breed, setBreed] = useState('')
  const [gender, setGender] = useState<'' | 'trong' | 'mai'>('')
  const [ageRange, setAgeRange] = useState<'' | '0-6' | '6-12' | '12+'>('')

  const selected = chickens.find((c) => c.id === selectedId)
  const qNorm = removeDiacritics(query.trim())

  const filtered = useMemo(() => {
    return chickens.filter((c) => {
      if (qNorm) {
        const tag = c.tag_number ?? ''
        const hay = removeDiacritics(
          [c.name ?? '', c.chicken_code, c.breed_name ?? '', tag].join(' ')
        )
        if (!hay.includes(qNorm)) return false
      }
      if (breed && c.breed_code !== breed) return false
      if (gender && c.gender !== gender) return false
      if (ageRange) {
        const age = c.age_months ?? 0
        if (ageRange === '0-6' && (age < 0 || age > 6)) return false
        if (ageRange === '6-12' && (age < 6 || age > 12)) return false
        if (ageRange === '12+' && age < 12) return false
      }
      return true
    })
  }, [chickens, qNorm, breed, gender, ageRange])

  const hasFilter = !!(query || breed || gender || ageRange)

  function clearFilters() {
    setQuery('')
    setBreed('')
    setGender('')
    setAgeRange('')
  }

  // If a chicken is already selected → show compact card + "Đổi" button
  if (selected) {
    const color = getBreedColor(selected.breed_code)
    const tag = selected.tag_number
    return (
      <div className={`ring-2 ${color.border} rounded-xl p-4 bg-gradient-to-br from-blue-50/50 to-white dark:from-blue-950/20 dark:to-gray-800 flex items-center gap-3`}>
        <div className={`w-14 h-14 rounded-xl ${color.bg} flex items-center justify-center text-3xl shadow-sm`}>
          🐓
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-base truncate">
            {selected.name ?? selected.chicken_code}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 font-mono truncate">
            {selected.chicken_code}
            {tag && <span className="ml-2 bg-white dark:bg-gray-900 rounded-full px-1.5 py-0.5 text-[10px]">🏷 #{tag}</span>}
          </div>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {selected.breed_name && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${color.badge}`}>
                {selected.breed_name}
              </span>
            )}
            {selected.age_months != null && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                {selected.age_months} tháng
              </span>
            )}
            {selected.weight_kg != null && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                {selected.weight_kg} kg
              </span>
            )}
            {selected.gender && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                {selected.gender === 'trong' ? '♂ Trống' : '♀ Mái'}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onSelect('')}
          className="text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg px-3 py-2 font-semibold flex-shrink-0"
        >
          ✕ Đổi
        </button>
      </div>
    )
  }

  // No selection yet → show filter bar + grid
  return (
    <div>
      {/* Filter bar */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-3">
        <div className="relative md:col-span-2">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">🔍</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm tên, mã gà, tag QR..."
            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg pl-9 pr-3 py-2 text-sm outline-none transition"
          />
        </div>
        <select
          value={breed}
          onChange={(e) => setBreed(e.target.value)}
          className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Tất cả giống</option>
          {breeds.map((b) => (
            <option key={b.code} value={b.code}>{b.name_vi}</option>
          ))}
        </select>
        <select
          value={gender}
          onChange={(e) => setGender(e.target.value as '' | 'trong' | 'mai')}
          className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Trống / Mái</option>
          <option value="trong">♂ Trống</option>
          <option value="mai">♀ Mái</option>
        </select>
        <select
          value={ageRange}
          onChange={(e) => setAgeRange(e.target.value as '' | '0-6' | '6-12' | '12+')}
          className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Mọi độ tuổi</option>
          <option value="0-6">0-6 tháng (gà con)</option>
          <option value="6-12">6-12 tháng (tơ)</option>
          <option value="12+">≥ 12 tháng (trưởng thành)</option>
        </select>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between mb-3 text-xs">
        <span className="text-gray-500 dark:text-gray-400">
          <b className="text-gray-900 dark:text-gray-100">{filtered.length}</b>
          <span className="text-gray-400"> / {chickens.length} gà</span>
          {filtered.length === 0 && (
            <span className="ml-2 text-amber-600 dark:text-amber-400">⚠ Không khớp tiêu chí</span>
          )}
        </span>
        {hasFilter && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-red-600 dark:text-red-400 hover:underline font-semibold"
          >
            ✕ Xóa lọc
          </button>
        )}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
          <div className="text-4xl mb-2">🔍</div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Không tìm thấy gà phù hợp. Thử nới rộng tiêu chí hoặc{' '}
            <button type="button" onClick={clearFilters} className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
              xem tất cả
            </button>
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[420px] overflow-y-auto pr-1">
          {filtered.slice(0, 100).map((c) => {
            const color = getBreedColor(c.breed_code)
            const tag = c.tag_number
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelect(c.id)}
                className="group text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className={`relative h-16 ${color.bg} flex items-center justify-center`}>
                  <span className="text-3xl opacity-80 group-hover:scale-110 transition-transform">🐓</span>
                  {tag && (
                    <span className="absolute top-1 right-1 bg-white/95 text-gray-800 rounded-full px-1.5 py-0.5 text-[9px] font-mono font-bold shadow">
                      #{tag}
                    </span>
                  )}
                </div>
                <div className="p-2">
                  <div className="font-bold text-xs truncate text-gray-900 dark:text-gray-100">
                    {c.name ?? c.chicken_code}
                  </div>
                  <div className="text-[10px] font-mono text-gray-400 dark:text-gray-500 truncate">
                    {c.chicken_code}
                  </div>
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    {c.breed_name && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${color.badge}`}>
                        {c.breed_name}
                      </span>
                    )}
                    {c.age_months != null && (
                      <span className="text-[9px] text-gray-500 dark:text-gray-400">
                        {c.age_months}th
                      </span>
                    )}
                    {c.weight_kg != null && (
                      <span className="text-[9px] text-gray-500 dark:text-gray-400">
                        ·{Number(c.weight_kg).toFixed(1)}kg
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
          {filtered.length > 100 && (
            <div className="col-span-full text-xs text-gray-500 dark:text-gray-400 text-center py-2">
              Hiển thị 100/{filtered.length}. Lọc thêm để thu hẹp danh sách.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ScoreSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-lg font-bold text-blue-600 dark:text-blue-400 tabular-nums">{value.toFixed(1)}</span>
      </div>
      <input
        type="range"
        min={0}
        max={10}
        step={0.5}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-blue-600"
      />
    </div>
  )
}
