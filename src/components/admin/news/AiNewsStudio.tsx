'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Category = 'tin-tuc' | 'kinh-nghiem' | 'su-kien' | 'giong-ga' | 'cham-soc'
type Audience = '' | 'beginner' | 'pro_farm' | 'buyer' | 'hobby'
type Style = '' | 'professional' | 'friendly' | 'persuasive' | 'storytelling'
type Length = 'short' | 'medium' | 'long'

const CATEGORIES: Array<{
  key: Category
  label: string
  emoji: string
  bar: string
  cls: string
}> = [
  {
    key: 'tin-tuc',
    label: 'Tin tức',
    emoji: '📰',
    bar: 'from-blue-400 to-indigo-500',
    cls: 'border-blue-400 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300',
  },
  {
    key: 'kinh-nghiem',
    label: 'Kinh nghiệm',
    emoji: '💡',
    bar: 'from-amber-400 to-orange-500',
    cls: 'border-amber-400 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300',
  },
  {
    key: 'su-kien',
    label: 'Sự kiện',
    emoji: '🎉',
    bar: 'from-violet-400 to-purple-500',
    cls: 'border-violet-400 bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300',
  },
  {
    key: 'giong-ga',
    label: 'Giống gà',
    emoji: '🐓',
    bar: 'from-emerald-400 to-teal-500',
    cls: 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300',
  },
  {
    key: 'cham-soc',
    label: 'Chăm sóc',
    emoji: '💉',
    bar: 'from-cyan-400 to-sky-500',
    cls: 'border-cyan-400 bg-cyan-50 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-300',
  },
]

const TOPIC_GROUPS: Array<{
  group: string
  emoji: string
  topics: string[]
}> = [
  {
    group: 'Bí quyết',
    emoji: '🎯',
    topics: [
      '5 bí quyết nuôi gà Asil khoẻ mạnh quanh năm',
      'Bí quyết úm gà con tỷ lệ sống 95%',
      'Bí quyết chọn gà bố mẹ thuần chủng',
      'Bí quyết tăng cân và đòn cân khoẻ cho gà tơ',
    ],
  },
  {
    group: 'Hướng dẫn',
    emoji: '📚',
    topics: [
      'Cách chăm sóc gà mới mua trong 7 ngày đầu',
      'Cách tiêm vaccine cho gà chọi đúng quy trình',
      'Cách phối ngẫu để có lứa con chất lượng',
      'Cách phân biệt gà trống và gà mái từ nhỏ',
    ],
  },
  {
    group: 'Đánh giá',
    emoji: '⭐',
    topics: [
      'So sánh gà Asil và gà Mã Lai — chọn loại nào?',
      'Top 5 giống gà chọi phổ biến tại Việt Nam',
      'Đánh giá ưu nhược điểm các loại cám gà thị trường',
      'Review thuốc úm gà phổ biến — loại nào hiệu quả?',
    ],
  },
  {
    group: 'Phòng bệnh',
    emoji: '🛡',
    topics: [
      'Phòng và trị bệnh CRD cho gà chọi',
      'Cách xử lý gà bị tiêu chảy hiệu quả',
      'Lịch tiêm phòng chuẩn cho gà từ 1 ngày tuổi',
      'Dấu hiệu nhận biết và phòng dịch Newcastle',
    ],
  },
]

const AUDIENCES: Array<{ v: Audience; label: string; emoji: string; hint: string }> = [
  { v: '', label: 'Mặc định', emoji: '⚖️', hint: 'AI tự cân bằng' },
  { v: 'beginner', label: 'Người mới', emoji: '🌱', hint: 'Giải thích cơ bản · từ ngữ dễ hiểu' },
  { v: 'pro_farm', label: 'Trại chuyên', emoji: '👔', hint: 'Thuật ngữ kỹ thuật · số liệu cụ thể' },
  { v: 'buyer', label: 'Khách mua', emoji: '🛒', hint: 'Tập trung lợi ích · gợi liên hệ trại' },
  { v: 'hobby', label: 'Người chơi', emoji: '🎮', hint: 'Vui vẻ · chia sẻ kinh nghiệm' },
]

const STYLES: Array<{ v: Style; label: string; emoji: string; hint: string }> = [
  { v: '', label: 'Mặc định', emoji: '⚖️', hint: 'Văn phong tự nhiên' },
  { v: 'professional', label: 'Chuyên nghiệp', emoji: '👔', hint: 'Trang trọng · đầy đủ' },
  { v: 'friendly', label: 'Thân thiện', emoji: '😊', hint: 'Gần gũi · thoải mái' },
  { v: 'persuasive', label: 'Hấp dẫn', emoji: '🔥', hint: 'Cuốn hút · CTA mạnh' },
  { v: 'storytelling', label: 'Kể chuyện', emoji: '📖', hint: 'Có cảm xúc · ví dụ thực tế' },
]

const LENGTHS: Array<{ v: Length; label: string; emoji: string; words: string }> = [
  { v: 'short', label: 'Ngắn', emoji: '⚡', words: '~500 từ · đọc 2 phút' },
  { v: 'medium', label: 'Vừa', emoji: '📄', words: '~800 từ · đọc 4 phút (mặc định)' },
  { v: 'long', label: 'Dài', emoji: '📚', words: '~1500 từ · đọc 7 phút (sâu)' },
]

const AUDIENCE_KEYWORD: Record<Exclude<Audience, ''>, string> = {
  beginner: 'cho người mới bắt đầu',
  pro_farm: 'cho trại chuyên nghiệp',
  buyer: 'hướng đến khách mua',
  hobby: 'cho người chơi gà nghiệp dư',
}
const STYLE_KEYWORD: Record<Exclude<Style, ''>, string> = {
  professional: 'văn phong chuyên nghiệp',
  friendly: 'văn phong thân thiện',
  persuasive: 'văn phong hấp dẫn cuốn hút',
  storytelling: 'kể chuyện có cảm xúc',
}
const LENGTH_KEYWORD: Record<Length, string> = {
  short: 'độ dài 500 từ',
  medium: 'độ dài 800 từ',
  long: 'độ dài 1500 từ',
}

export function AiNewsStudio() {
  const router = useRouter()
  const [topic, setTopic] = useState('')
  const [category, setCategory] = useState<Category>('kinh-nghiem')
  const [audience, setAudience] = useState<Audience>('')
  const [style, setStyle] = useState<Style>('')
  const [length, setLength] = useState<Length>('medium')
  const [keywordInput, setKeywordInput] = useState('')
  const [keywords, setKeywords] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  const composedKeywords = useMemo(() => {
    const out = [...keywords]
    if (audience) out.push(AUDIENCE_KEYWORD[audience as Exclude<Audience, ''>])
    if (style) out.push(STYLE_KEYWORD[style as Exclude<Style, ''>])
    out.push(LENGTH_KEYWORD[length])
    return out
  }, [keywords, audience, style, length])

  function addKeyword() {
    const v = keywordInput.trim()
    if (!v) return
    if (keywords.includes(v)) {
      setKeywordInput('')
      return
    }
    setKeywords([...keywords, v])
    setKeywordInput('')
  }
  function removeKeyword(k: string) {
    setKeywords(keywords.filter((x) => x !== k))
  }
  function onKeywordKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addKeyword()
    }
    if (e.key === 'Backspace' && !keywordInput && keywords.length > 0) {
      e.preventDefault()
      setKeywords(keywords.slice(0, -1))
    }
  }

  async function generate() {
    if (!topic.trim() || topic.trim().length < 5) {
      setErr('Chủ đề tối thiểu 5 ký tự')
      return
    }
    setLoading(true)
    setErr(null)
    setProgress(5)
    // Fake progressive feedback (Gemini doesn't stream here)
    const t = setInterval(() => {
      setProgress((p) => (p < 92 ? p + Math.max(1, Math.round((92 - p) / 12)) : p))
    }, 700)

    try {
      const res = await fetch('/api/news/auto-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          category,
          keywords: composedKeywords,
        }),
      })
      const j = await res.json()
      if (!res.ok) {
        setErr(typeof j.error === 'string' ? j.error : 'Lỗi AI')
        setLoading(false)
        clearInterval(t)
        setProgress(0)
        return
      }
      setProgress(100)
      setTimeout(() => {
        router.push(`/admin/tin-tuc/${j.data.id}/sua`)
      }, 400)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Lỗi mạng')
      setLoading(false)
      clearInterval(t)
      setProgress(0)
    }
  }

  const ready = topic.trim().length >= 5 && !loading
  const cat = CATEGORIES.find((c) => c.key === category) ?? CATEGORIES[0]
  const audienceMeta = AUDIENCES.find((a) => a.v === audience)
  const styleMeta = STYLES.find((s) => s.v === style)
  const lengthMeta = LENGTHS.find((l) => l.v === length)!

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
        <div>
          <Link
            href="/admin/tin-tuc"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2 inline-block"
          >
            ← Quay lại danh sách
          </Link>
          <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
            ✨ AI Studio · Tạo bài tự động
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            AI sẽ viết bài SEO đầy đủ · Chọn chủ đề + đối tượng + phong cách + độ dài → Generate
          </p>
        </div>
        <Link
          href="/admin/tin-tuc/them-moi"
          className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          📝 Viết tay thay vì AI
        </Link>
      </div>

      <section className="relative overflow-hidden bg-gradient-to-br from-violet-50 via-pink-50 to-rose-50 dark:from-violet-950/40 dark:via-pink-950/40 dark:to-rose-950/40 border border-violet-200 dark:border-violet-900 rounded-xl p-4 mb-4">
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-violet-300/30 blur-3xl" />
        <div className="absolute -left-10 -bottom-10 w-40 h-40 rounded-full bg-rose-300/30 blur-3xl" />
        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-3">
          <Step n={1} title="Chủ đề & Danh mục" desc="Chọn preset hoặc gõ tự do" active={!topic} done={!!topic} />
          <Step n={2} title="Đối tượng đọc" desc="AI điều chỉnh ngôn ngữ" active={!!topic && !audience} done={!!audience} />
          <Step n={3} title="Phong cách & Độ dài" desc="Văn phong + ~từ" active={!!topic && !style} done={!!style} />
          <Step n={4} title="Generate" desc="AI viết 15-30s" active={ready} done={false} />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
        <div className="space-y-4">
          <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className={`h-1.5 bg-gradient-to-r ${cat.bar}`} />
            <div className="p-4 md:p-5 space-y-3">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                🎯 Chủ đề bài viết
                <span className="text-rose-500 text-sm">*</span>
              </h2>
              <div>
                <input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="VD: Bí quyết nuôi gà Asil khỏe mạnh mùa đông"
                  maxLength={200}
                  autoFocus
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2.5 text-base font-medium"
                />
                <div className="flex items-baseline justify-between text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                  <span>{topic.length}/200 ký tự</span>
                  {topic.length > 0 && topic.length < 5 && (
                    <span className="text-rose-600 dark:text-rose-400">
                      ⚠️ Tối thiểu 5 ký tự
                    </span>
                  )}
                </div>
              </div>

              <div>
                <div className="text-[10.5px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                  💡 Gợi ý chủ đề
                </div>
                <div className="space-y-2">
                  {TOPIC_GROUPS.map((g) => (
                    <div key={g.group}>
                      <div className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                        {g.emoji} {g.group}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {g.topics.map((t) => {
                          const active = topic === t
                          return (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setTopic(t)}
                              className={
                                'px-2.5 py-1 rounded-full text-[11px] font-medium border transition ' +
                                (active
                                  ? 'bg-gradient-to-r from-violet-500 to-pink-500 text-white border-transparent shadow'
                                  : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30')
                              }
                            >
                              {t}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[10.5px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                  Danh mục
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map((c) => {
                    const active = category === c.key
                    return (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => setCategory(c.key)}
                        className={
                          'px-3 py-1.5 rounded-full text-xs font-medium border transition ' +
                          (active
                            ? c.cls + ' border-2 ring-1'
                            : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-300')
                        }
                      >
                        {c.emoji} {c.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-amber-500 to-orange-500" />
            <div className="p-4 md:p-5 space-y-3">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                👤 Đối tượng đọc
                <span className="text-[11px] text-gray-500 dark:text-gray-400 font-normal ml-1">
                  AI điều chỉnh ngôn ngữ phù hợp
                </span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {AUDIENCES.map((a) => {
                  const active = audience === a.v
                  return (
                    <button
                      key={a.v || 'default'}
                      type="button"
                      onClick={() => setAudience(a.v)}
                      className={
                        'rounded-lg border-2 p-2.5 text-left transition ' +
                        (active
                          ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/30'
                          : 'border-gray-200 dark:border-gray-700 hover:border-amber-300')
                      }
                    >
                      <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        {a.emoji} {a.label}
                      </div>
                      <div className="text-[11px] text-gray-600 dark:text-gray-300 mt-0.5">
                        {a.hint}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </section>

          <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-violet-500 to-purple-500" />
            <div className="p-4 md:p-5 space-y-3">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                🎭 Phong cách
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {STYLES.map((s) => {
                  const active = style === s.v
                  return (
                    <button
                      key={s.v || 'default'}
                      type="button"
                      onClick={() => setStyle(s.v)}
                      className={
                        'rounded-lg border-2 p-2.5 text-left transition ' +
                        (active
                          ? 'border-violet-400 bg-violet-50 dark:bg-violet-950/30'
                          : 'border-gray-200 dark:border-gray-700 hover:border-violet-300')
                      }
                    >
                      <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        {s.emoji} {s.label}
                      </div>
                      <div className="text-[11px] text-gray-600 dark:text-gray-300 mt-0.5">
                        {s.hint}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </section>

          <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500" />
            <div className="p-4 md:p-5 space-y-3">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                📏 Độ dài
              </h2>
              <div className="grid grid-cols-3 gap-2">
                {LENGTHS.map((l) => {
                  const active = length === l.v
                  return (
                    <button
                      key={l.v}
                      type="button"
                      onClick={() => setLength(l.v)}
                      className={
                        'rounded-lg border-2 p-3 text-center transition ' +
                        (active
                          ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/30 ring-1 ring-blue-200 dark:ring-blue-900'
                          : 'border-gray-200 dark:border-gray-700 hover:border-blue-300')
                      }
                    >
                      <div className="text-2xl mb-0.5">{l.emoji}</div>
                      <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        {l.label}
                      </div>
                      <div className="text-[10.5px] text-gray-600 dark:text-gray-300">
                        {l.words}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </section>

          <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <div className="p-4 md:p-5 space-y-2">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                🔑 Từ khoá SEO
                <span className="text-[11px] text-gray-500 dark:text-gray-400 font-normal ml-1">
                  AI lồng ghép tự nhiên vào bài
                </span>
              </h2>
              <div className="flex gap-2">
                <input
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={onKeywordKeyDown}
                  placeholder="Gõ từ khoá rồi Enter / phẩy để thêm…"
                  className="flex-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={addKeyword}
                  disabled={!keywordInput.trim()}
                  className="bg-emerald-600 text-white rounded-lg px-3 py-2 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
                >
                  ＋
                </button>
              </div>
              {keywords.length === 0 ? (
                <p className="text-[11px] text-gray-500 dark:text-gray-400 italic">
                  Chưa có từ khoá. AI vẫn dùng các từ khoá mặc định: gà chọi, trang trại, nuôi gà…
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {keywords.map((k) => (
                    <span
                      key={k}
                      className="inline-flex items-center gap-1 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 rounded-full px-2.5 py-1 text-xs font-medium"
                    >
                      #{k}
                      <button
                        type="button"
                        onClick={() => removeKeyword(k)}
                        className="text-emerald-500 hover:text-rose-500 leading-none"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-4 self-start">
          <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-violet-500 via-pink-500 to-rose-500" />
            <div className="p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                📋 Tóm tắt prompt
              </h3>

              <div className="space-y-1 text-xs">
                <Kv k="🎯 Chủ đề" v={topic || '— Chưa nhập —'} truncate />
                <Kv k="🏷 Danh mục" v={`${cat.emoji} ${cat.label}`} />
                <Kv
                  k="👤 Đối tượng"
                  v={audienceMeta ? `${audienceMeta.emoji} ${audienceMeta.label}` : '— Mặc định —'}
                />
                <Kv
                  k="🎭 Phong cách"
                  v={styleMeta && styleMeta.v ? `${styleMeta.emoji} ${styleMeta.label}` : '— Mặc định —'}
                />
                <Kv
                  k="📏 Độ dài"
                  v={`${lengthMeta.emoji} ${lengthMeta.label} · ${lengthMeta.words.split('·')[0].trim()}`}
                />
                <Kv k="🔑 Từ khoá" v={keywords.length > 0 ? `${keywords.length} từ` : '— Mặc định —'} />
              </div>

              {err && (
                <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 rounded-lg p-2.5 text-xs">
                  ✗ {err}
                </div>
              )}

              {loading && (
                <div className="bg-gradient-to-br from-violet-50 to-pink-50 dark:from-violet-950/30 dark:to-pink-950/30 border border-violet-200 dark:border-violet-900 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-violet-800 dark:text-violet-200">
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-violet-300 border-t-violet-700 rounded-full" />
                    <span className="font-medium">
                      {progress < 30
                        ? 'Đang phân tích chủ đề…'
                        : progress < 60
                          ? 'Đang viết nội dung…'
                          : progress < 90
                            ? 'Đang tối ưu SEO…'
                            : 'Sắp xong…'}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-violet-100 dark:bg-violet-950/60 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 to-pink-500 transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="text-[10.5px] text-violet-700 dark:text-violet-300 tabular-nums">
                    {progress}% · Thường mất 15-30 giây
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  onClick={generate}
                  disabled={!ready}
                  className="bg-gradient-to-r from-violet-600 via-pink-600 to-rose-500 text-white rounded-lg px-5 py-3 font-semibold shadow hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                      Đang tạo bài…
                    </>
                  ) : (
                    <>✨ Generate ngay</>
                  )}
                </button>
                <Link
                  href="/admin/tin-tuc/them-moi"
                  className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2 text-sm text-center hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  📝 Tự viết tay
                </Link>
              </div>

              <p className="text-[10.5px] text-gray-500 dark:text-gray-400 leading-relaxed">
                💡 Bài tạo sẽ ở status <strong>Nháp</strong> — review + chỉnh trước khi publish ra
                /tin-tuc public.
              </p>
            </div>
          </section>

          <section className="bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2 flex items-center gap-1.5">
              <span>📚</span> Hướng dẫn nhanh
            </h3>
            <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1.5 list-disc list-inside leading-relaxed">
              <li>Càng cụ thể chủ đề càng tốt — vd "5 bí quyết..." hơn "Nuôi gà"</li>
              <li>Audience + Style + Length kết hợp để bài "đúng giọng"</li>
              <li>Keyword SEO 3-7 từ → AI lồng tự nhiên</li>
              <li>Bài tạo xong sẽ mở thẳng trang Sửa để bạn chỉnh tay</li>
              <li>Giới hạn AI miễn phí: 15 lần/phút · 1500 lần/ngày — đủ cho 1 trại</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  )
}

function Kv({ k, v, truncate }: { k: string; v: string; truncate?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2 bg-gray-50 dark:bg-gray-900/40 rounded px-2 py-1">
      <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap">{k}</span>
      <span
        className={
          'font-medium text-gray-700 dark:text-gray-300 ' +
          (truncate ? 'truncate max-w-[180px]' : '')
        }
      >
        {v}
      </span>
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
        'flex items-start gap-2 backdrop-blur-sm rounded-lg p-2 border transition ' +
        (done
          ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900'
          : active
            ? 'bg-white/80 dark:bg-gray-900/60 border-violet-300 dark:border-violet-800 ring-1 ring-violet-200 dark:ring-violet-900/40'
            : 'bg-white/60 dark:bg-gray-900/50 border-white/40 dark:border-gray-700/40')
      }
    >
      <div
        className={
          'flex-shrink-0 w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center shadow ' +
          (done
            ? 'bg-gradient-to-br from-emerald-500 to-teal-500'
            : active
              ? 'bg-gradient-to-br from-violet-500 to-pink-500'
              : 'bg-gradient-to-br from-gray-400 to-gray-500')
        }
      >
        {done ? '✓' : n}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</div>
        <div className="text-[10.5px] text-gray-600 dark:text-gray-300 leading-snug">{desc}</div>
      </div>
    </div>
  )
}
