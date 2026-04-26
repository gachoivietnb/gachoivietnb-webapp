'use client'

import { useEffect, useMemo, useState } from 'react'
import { removeDiacritics } from '@/lib/utils/slugify'

type Chicken = {
  id: string
  chicken_code: string
  name: string | null
  breed_name?: string | null
  status?: string
}

type Mode = 'bio' | 'zalo'

type Tone = '' | 'professional' | 'friendly' | 'persuasive' | 'storytelling'

const MODE_META: Record<
  Mode,
  { label: string; emoji: string; desc: string; bar: string; cls: string; targetWords: string }
> = {
  bio: {
    label: 'Mô tả bán hàng',
    emoji: '📝',
    desc: '200–300 từ · Lưu vào hồ sơ gà · Hiển thị trang public',
    bar: 'from-blue-500 to-indigo-500',
    cls: 'border-blue-400 bg-blue-50 dark:bg-blue-950/30 ring-blue-200 dark:ring-blue-900',
    targetWords: '200–300',
  },
  zalo: {
    label: 'Bài đăng Zalo / FB',
    emoji: '💬',
    desc: '100–150 từ · Hashtag · Emoji · Copy-paste sang social',
    bar: 'from-cyan-500 to-blue-500',
    cls: 'border-cyan-400 bg-cyan-50 dark:bg-cyan-950/30 ring-cyan-200 dark:ring-cyan-900',
    targetWords: '100–150',
  },
}

const TONES: Array<{ v: Tone; label: string; emoji: string; ctx: string }> = [
  { v: '', label: 'Mặc định', emoji: '⚖️', ctx: '' },
  { v: 'professional', label: 'Chuyên nghiệp', emoji: '👔', ctx: 'Văn phong chuyên nghiệp, dùng thuật ngữ chăn nuôi chuẩn xác' },
  { v: 'friendly', label: 'Thân thiện', emoji: '😊', ctx: 'Văn phong thân thiện, gần gũi như nói chuyện với bạn bè' },
  { v: 'persuasive', label: 'Hấp dẫn', emoji: '🔥', ctx: 'Văn phong hấp dẫn, kích thích mua hàng, kêu gọi hành động' },
  { v: 'storytelling', label: 'Kể chuyện', emoji: '📖', ctx: 'Văn phong kể chuyện, có cảm xúc, làm nổi bật cá tính của con gà' },
]

const QUICK_HOOKS = [
  '🎁 Giảm 10%',
  '🚚 Free ship nội tỉnh',
  '⏰ Còn 1 con duy nhất',
  '🏆 Vô địch giải tỉnh',
  '💪 Đòn cân khoẻ',
  '🥚 Gà bố mẹ thuần',
]

export function AiMarketingPanel({ enabled }: { enabled: boolean }) {
  const [chickens, setChickens] = useState<Chicken[]>([])
  const [loadingChickens, setLoadingChickens] = useState(false)
  const [selectedId, setSelectedId] = useState('')
  const [mode, setMode] = useState<Mode>('bio')
  const [tone, setTone] = useState<Tone>('')
  const [customContext, setCustomContext] = useState('')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [q, setQ] = useState('')

  useEffect(() => {
    if (!enabled) return
    setLoadingChickens(true)
    fetch('/api/chickens?pageSize=200')
      .then((r) => r.json())
      .then((j) => setChickens((j.data ?? []) as Chicken[]))
      .catch(() => {})
      .finally(() => setLoadingChickens(false))
  }, [enabled])

  const qNorm = removeDiacritics(q.trim())
  const filteredChickens = useMemo(() => {
    if (!qNorm) return chickens
    return chickens.filter((c) =>
      removeDiacritics(`${c.chicken_code} ${c.name ?? ''} ${c.breed_name ?? ''}`).includes(qNorm)
    )
  }, [chickens, qNorm])

  const selected = chickens.find((c) => c.id === selectedId)

  const composedContext = useMemo(() => {
    const toneCtx = TONES.find((t) => t.v === tone)?.ctx ?? ''
    const parts = [toneCtx, customContext].filter(Boolean)
    return parts.join('. ')
  }, [tone, customContext])

  const wordCount = output.trim() ? output.trim().split(/\s+/).length : 0
  const charCount = output.length

  function addHook(h: string) {
    setCustomContext((c) => (c ? `${c} · ${h}` : h))
  }

  async function generate() {
    if (!selectedId) {
      setErr('Chọn 1 con gà trước')
      return
    }
    setLoading(true)
    setErr(null)
    setOutput('')
    setCopied(false)

    const endpoint = mode === 'bio' ? '/api/ai/generate-bio' : '/api/ai/generate-zalo-post'
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chicken_id: selectedId,
        custom_context: composedContext || undefined,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      setErr(typeof json.error === 'string' ? json.error : 'Lỗi')
      setLoading(false)
      return
    }
    setOutput((json.data?.bio ?? json.data?.text ?? '') as string)
    setLoading(false)
  }

  async function copyToClipboard() {
    if (!output) return
    try {
      await navigator.clipboard.writeText(output)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  function shareZalo() {
    if (!output) return
    const url = `https://zalo.me/share?text=${encodeURIComponent(output)}`
    window.open(url, '_blank')
  }

  function shareFacebook() {
    if (!output) return
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin)}&quote=${encodeURIComponent(output)}`
    window.open(url, '_blank')
  }

  if (!enabled) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-10 text-center">
        <div className="text-5xl mb-2">🔒</div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
          AI chưa bật
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Cấu hình Gemini API key + bật AI trong Cài đặt để dùng panel này.
        </p>
      </div>
    )
  }

  return (
    <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <div className="h-1.5 bg-gradient-to-r from-violet-500 via-pink-500 to-rose-500" />
      <div className="p-4 md:p-5 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-2xl">✨</span>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Tạo content AI
          </h2>
          <span className="text-[11px] text-gray-500 dark:text-gray-400 ml-1">
            Chọn loại · chọn gà · chọn giọng văn → ✨ Generate
          </span>
        </div>

        <div>
          <SectionTitle icon="🎨" title="Loại nội dung" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(Object.keys(MODE_META) as Mode[]).map((m) => {
              const meta = MODE_META[m]
              const active = mode === m
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={
                    'rounded-xl border-2 overflow-hidden text-left transition ' +
                    (active
                      ? meta.cls + ' ring-2 ring-offset-1'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300')
                  }
                >
                  <div className={`h-1 bg-gradient-to-r ${meta.bar}`} />
                  <div className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-base font-bold text-gray-900 dark:text-gray-100">
                        {meta.emoji} {meta.label}
                      </div>
                      <span className="text-[10.5px] font-mono text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/40 px-1.5 py-0.5 rounded">
                        {meta.targetWords} từ
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-600 dark:text-gray-300 mt-0.5">
                      {meta.desc}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <SectionTitle icon="🐓" title="Chọn gà" required />
          <div className="relative mb-2">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm theo mã / tên / giống…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
            size={Math.min(8, Math.max(3, filteredChickens.length))}
          >
            {filteredChickens.length === 0 && (
              <option value="" disabled>
                {loadingChickens ? '⏳ Đang tải…' : '— Không khớp từ khoá —'}
              </option>
            )}
            {filteredChickens.map((c) => (
              <option key={c.id} value={c.id}>
                {c.chicken_code} · {c.name ?? '—'}
                {c.breed_name ? ` · ${c.breed_name}` : ''}
              </option>
            ))}
          </select>
          {selected && (
            <div className="mt-2 text-[11px] text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/40 rounded px-2 py-1">
              Đã chọn: <strong className="text-gray-900 dark:text-gray-100">{selected.chicken_code}</strong>
              {selected.name && ` · ${selected.name}`}
              {selected.breed_name && ` · ${selected.breed_name}`}
            </div>
          )}
        </div>

        <div>
          <SectionTitle icon="🎭" title="Giọng văn" />
          <div className="flex flex-wrap gap-1.5">
            {TONES.map((t) => {
              const active = tone === t.v
              return (
                <button
                  key={t.v || 'default'}
                  type="button"
                  onClick={() => setTone(t.v)}
                  className={
                    'px-3 py-1.5 rounded-full text-xs font-medium border transition ' +
                    (active
                      ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white border-transparent shadow'
                      : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-violet-400')
                  }
                  title={t.ctx}
                >
                  {t.emoji} {t.label}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <SectionTitle icon="💡" title="Gợi ý bổ sung" />
          <div className="flex flex-wrap gap-1.5 mb-2">
            {QUICK_HOOKS.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => addHook(h)}
                className="px-2.5 py-1 text-[11px] rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30"
              >
                ＋ {h}
              </button>
            ))}
          </div>
          <textarea
            value={customContext}
            onChange={(e) => setCustomContext(e.target.value)}
            rows={2}
            placeholder="VD: Giảm giá 10% · giao miễn phí trong tỉnh · gà thi đấu giải tỉnh tháng trước…"
            className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
          />
          <p className="text-[10.5px] text-gray-500 dark:text-gray-400 mt-1">
            💡 Combine giọng văn + gợi ý bổ sung để AI sinh content sát ý hơn.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={generate}
            disabled={loading || !selectedId}
            className="bg-gradient-to-r from-violet-600 via-pink-600 to-rose-500 text-white rounded-lg px-5 py-2.5 font-semibold shadow hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
          >
            {loading ? (
              <>
                <span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                Đang tạo…
              </>
            ) : (
              <>✨ Generate {MODE_META[mode].emoji}</>
            )}
          </button>
          {output && (
            <button
              type="button"
              onClick={generate}
              disabled={loading}
              className="border border-violet-300 dark:border-violet-800 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/30 rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50"
            >
              ↻ Tạo lại
            </button>
          )}
        </div>

        {err && (
          <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 rounded-lg p-3 text-sm">
            ✗ {err}
          </div>
        )}

        {output && (
          <div className="space-y-2">
            <div className="flex items-baseline justify-between flex-wrap gap-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                {MODE_META[mode].emoji} Kết quả
              </h3>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 tabular-nums">
                <strong className="text-gray-700 dark:text-gray-300">{wordCount}</strong> từ ·{' '}
                {charCount} ký tự
              </div>
            </div>
            <div
              className={
                'border-2 rounded-xl p-4 text-sm whitespace-pre-wrap leading-relaxed ' +
                'bg-gradient-to-br from-violet-50/40 via-pink-50/40 to-rose-50/40 dark:from-violet-950/15 dark:via-pink-950/15 dark:to-rose-950/15 ' +
                'border-violet-200 dark:border-violet-900 text-gray-800 dark:text-gray-200'
              }
            >
              {output}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={copyToClipboard}
                className={
                  'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border transition ' +
                  (copied
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                    : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-violet-400')
                }
              >
                {copied ? '✓ Đã copy!' : '📋 Copy'}
              </button>
              <button
                onClick={shareZalo}
                className="inline-flex items-center gap-1.5 bg-cyan-50 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-900 rounded-lg px-3 py-1.5 text-xs font-semibold hover:bg-cyan-100"
              >
                💬 Share Zalo
              </button>
              <button
                onClick={shareFacebook}
                className="inline-flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 rounded-lg px-3 py-1.5 text-xs font-semibold hover:bg-blue-100"
              >
                📘 Share Facebook
              </button>
            </div>
            {mode === 'bio' && (
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-lg px-2.5 py-1.5">
                ✓ Bio đã được lưu vào hồ sơ gà — hiển thị tự động trên trang public của con này.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

function SectionTitle({
  icon,
  title,
  required,
}: {
  icon: string
  title: string
  required?: boolean
}) {
  return (
    <h4 className="text-[11px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
      <span>{icon}</span>
      <span>
        {title}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </span>
    </h4>
  )
}
