'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Article = {
  id: string
  slug: string
  title: string
  excerpt: string | null
  body_markdown: string
  cover_image_url: string | null
  tags: string[] | null
  category: string
  status: 'draft' | 'published' | 'archived'
  source_url: string | null
  source_name: string | null
  seo_title: string | null
  seo_description: string | null
  ai_generated: boolean
}

const CATEGORIES: Array<{
  key: string
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

function countWords(s: string): number {
  return s.trim() ? s.trim().split(/\s+/).length : 0
}

function readTimeMin(words: number): number {
  return Math.max(1, Math.round(words / 220))
}

function rangeColor(
  len: number,
  ideal: [number, number]
): { tone: 'rose' | 'amber' | 'emerald' | 'gray'; cls: string; text: string } {
  if (len === 0)
    return {
      tone: 'gray',
      cls: 'text-gray-400 dark:text-gray-500',
      text: 'Chưa có nội dung',
    }
  if (len < ideal[0])
    return {
      tone: 'amber',
      cls: 'text-amber-600 dark:text-amber-400',
      text: `Hơi ngắn (đề xuất ${ideal[0]}–${ideal[1]})`,
    }
  if (len > ideal[1])
    return {
      tone: 'rose',
      cls: 'text-rose-600 dark:text-rose-400',
      text: `Hơi dài (đề xuất ${ideal[0]}–${ideal[1]})`,
    }
  return {
    tone: 'emerald',
    cls: 'text-emerald-600 dark:text-emerald-400',
    text: `Tốt (${ideal[0]}–${ideal[1]})`,
  }
}

export function NewsEditor({
  mode,
  article,
  initialAiMode,
}: {
  mode: 'create' | 'edit'
  article?: Article
  initialAiMode?: boolean
}) {
  const router = useRouter()
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  const [form, setForm] = useState({
    title: article?.title ?? '',
    excerpt: article?.excerpt ?? '',
    body_markdown: article?.body_markdown ?? '',
    cover_image_url: article?.cover_image_url ?? '',
    tags: (article?.tags ?? []).join(', '),
    category: article?.category ?? 'tin-tuc',
    status: (article?.status ?? 'draft') as 'draft' | 'published' | 'archived',
    source_url: article?.source_url ?? '',
    source_name: article?.source_name ?? '',
    seo_title: article?.seo_title ?? '',
    seo_description: article?.seo_description ?? '',
  })

  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [imgError, setImgError] = useState(false)
  void initialAiMode // legacy prop — AI flow now lives in AiNewsStudio (/them-moi?mode=ai)

  const titleColor = rangeColor(form.title.length, [40, 70])
  const excerptColor = rangeColor(form.excerpt.length, [120, 160])
  const seoTitleColor = rangeColor(form.seo_title.length, [40, 60])
  const seoDescColor = rangeColor(form.seo_description.length, [120, 160])
  const bodyWords = countWords(form.body_markdown)
  const bodyColor = rangeColor(bodyWords, [600, 1500])
  const readTime = readTimeMin(bodyWords)

  // SEO score
  const seoScore = useMemo(() => {
    let s = 0
    if (form.title.length >= 40 && form.title.length <= 70) s += 20
    else if (form.title.length > 0) s += 10
    if (form.excerpt.length >= 120 && form.excerpt.length <= 160) s += 15
    else if (form.excerpt.length > 0) s += 7
    if (form.seo_title.length >= 40 && form.seo_title.length <= 60) s += 15
    if (form.seo_description.length >= 120 && form.seo_description.length <= 160) s += 15
    if (bodyWords >= 600) s += 20
    else if (bodyWords >= 300) s += 10
    if (form.cover_image_url) s += 5
    if (form.tags.split(',').filter((t) => t.trim()).length > 0) s += 5
    if (form.body_markdown.includes('## ')) s += 5
    return Math.min(100, s)
  }, [form, bodyWords])

  const tagsList = form.tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)

  function insertMd(prefix: string, suffix = '', placeholder = ''): void {
    const ta = bodyRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const sel = form.body_markdown.slice(start, end) || placeholder
    const before = form.body_markdown.slice(0, start)
    const after = form.body_markdown.slice(end)
    const next = `${before}${prefix}${sel}${suffix}${after}`
    setForm({ ...form, body_markdown: next })
    setTimeout(() => {
      ta.focus()
      const newStart = start + prefix.length
      const newEnd = newStart + sel.length
      ta.setSelectionRange(newStart, newEnd)
    }, 0)
  }

  async function save(nextStatus?: 'draft' | 'published') {
    setSaving(true)
    setErr(null)
    setMsg(null)
    try {
      const payload = {
        title: form.title.trim(),
        excerpt: form.excerpt.trim() || null,
        body_markdown: form.body_markdown,
        cover_image_url: form.cover_image_url.trim() || null,
        tags: tagsList,
        category: form.category,
        status: nextStatus ?? form.status,
        source_url: form.source_url.trim() || null,
        source_name: form.source_name.trim() || null,
        seo_title: form.seo_title.trim() || null,
        seo_description: form.seo_description.trim() || null,
      }

      const url = mode === 'edit' && article ? `/api/news/${article.id}` : '/api/news'
      const method = mode === 'edit' ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const j = await res.json()
      if (!res.ok) {
        setErr(typeof j.error === 'string' ? j.error : 'Lỗi lưu')
        return
      }
      if (mode === 'create' && j.data?.id) {
        router.push(`/admin/tin-tuc/${j.data.id}/sua`)
      } else {
        setMsg(nextStatus === 'published' ? '✓ Đã publish bài' : '✓ Đã lưu')
        setTimeout(() => setMsg(null), 3000)
        router.refresh()
      }
    } finally {
      setSaving(false)
    }
  }

  const cat = CATEGORIES.find((c) => c.key === form.category) ?? CATEGORIES[0]

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
          <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2 flex-wrap">
            {mode === 'edit' ? '✏️ Sửa bài' : '📝 Viết bài mới'}
            {article?.ai_generated && (
              <span className="text-xs bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 rounded-full px-2 py-0.5 border border-violet-200 dark:border-violet-900">
                ✨ AI tạo
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Markdown editor với toolbar · Live SEO score · Preview card · AI tạo bài
          </p>
        </div>
        {mode === 'create' && (
          <Link
            href="/admin/tin-tuc/them-moi?mode=ai"
            className="bg-gradient-to-r from-violet-600 via-pink-600 to-rose-500 text-white rounded-lg px-4 py-2 text-sm font-semibold shadow hover:shadow-lg transition flex items-center gap-1.5"
          >
            ✨ AI tạo bài mới
          </Link>
        )}
      </div>

      {msg && (
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200 rounded-lg px-3 py-2 text-sm mb-3">
          {msg}
        </div>
      )}
      {err && (
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 rounded-lg px-3 py-2 text-sm mb-3">
          ✗ {err}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">
        <div className="space-y-4">
          <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className={`h-1.5 bg-gradient-to-r ${cat.bar}`} />
            <div className="p-4 space-y-3">
              <div>
                <div className="flex items-baseline justify-between mb-1">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Tiêu đề bài viết *
                  </label>
                  <span className={'text-[10.5px] tabular-nums ' + titleColor.cls}>
                    {form.title.length}/70 · {titleColor.text}
                  </span>
                </div>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="VD: 5 bí quyết nuôi gà Asil khỏe mạnh quanh năm"
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2.5 text-lg font-semibold"
                  maxLength={200}
                />
                <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                  Slug URL tự sinh từ tiêu đề
                  {mode === 'edit' && article && (
                    <>
                      {' · '}
                      <span className="font-mono">/tin-tuc/{article.slug}</span>
                    </>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-baseline justify-between mb-1">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Tóm tắt (excerpt)
                  </label>
                  <span className={'text-[10.5px] tabular-nums ' + excerptColor.cls}>
                    {form.excerpt.length}/160 · {excerptColor.text}
                  </span>
                </div>
                <textarea
                  value={form.excerpt}
                  onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                  rows={2}
                  placeholder="Mô tả ngắn 120-160 ký tự — hiển thị trên card list & Google search"
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
                  maxLength={500}
                />
              </div>
            </div>
          </section>

          <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-slate-500 to-gray-600" />
            <div className="p-4 space-y-2">
              <div className="flex items-baseline justify-between flex-wrap gap-2">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  📄 Nội dung (Markdown)
                </label>
                <div className="flex items-center gap-2 text-[10.5px] text-gray-500 dark:text-gray-400">
                  <span>
                    {bodyWords.toLocaleString('vi-VN')} từ · ⏱ {readTime} phút đọc
                  </span>
                  <span className={bodyColor.cls}>{bodyColor.text}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 border-y border-gray-100 dark:border-gray-700 py-1.5">
                <ToolbarBtn label="H2" title="Heading 2" onClick={() => insertMd('\n## ', '\n', 'Tiêu đề phần')} />
                <ToolbarBtn label="H3" title="Heading 3" onClick={() => insertMd('\n### ', '\n', 'Tiêu đề phụ')} />
                <ToolbarBtn label="B" bold title="Bold" onClick={() => insertMd('**', '**', 'in đậm')} />
                <ToolbarBtn label="I" italic title="Italic" onClick={() => insertMd('*', '*', 'in nghiêng')} />
                <ToolbarBtn label="• List" title="Bullet list" onClick={() => insertMd('\n- ', '\n', 'mục 1')} />
                <ToolbarBtn label="1. List" title="Numbered" onClick={() => insertMd('\n1. ', '\n', 'mục 1')} />
                <ToolbarBtn label="🔗 Link" title="Link" onClick={() => insertMd('[', '](https://)', 'text')} />
                <ToolbarBtn label="🖼 Ảnh" title="Image" onClick={() => insertMd('\n![', '](https://)\n', 'alt')} />
                <ToolbarBtn label="❝ Quote" title="Quote" onClick={() => insertMd('\n> ', '\n', 'trích')} />
                <ToolbarBtn label="</> Code" title="Code" onClick={() => insertMd('`', '`', 'code')} />
                <ToolbarBtn label="── HR" title="Horizontal rule" onClick={() => insertMd('\n\n---\n\n', '')} />
              </div>

              <textarea
                ref={bodyRef}
                value={form.body_markdown}
                onChange={(e) => setForm({ ...form, body_markdown: e.target.value })}
                rows={20}
                placeholder={`## Heading chính
Đoạn mở đầu thu hút...

### Phần 1: Ý phụ đầu tiên
Diễn giải chi tiết.

- Gạch đầu dòng 1
- Gạch đầu dòng 2

### Phần 2: ...
Tiếp tục nội dung.

**In đậm** *In nghiêng* [link](https://example.com)`}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-3 text-sm font-mono leading-relaxed"
              />
              <div className="text-[10.5px] text-gray-500 dark:text-gray-400">
                💡 Click toolbar để chèn cú pháp · Bài tốt SEO ≥ 600 từ với 2-3 H2/H3
              </div>
            </div>
          </section>

          <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <div className="p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                🔍 SEO
                <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                  Để trống = dùng Title / Excerpt
                </span>
              </h3>
              <div>
                <div className="flex items-baseline justify-between mb-1">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    SEO Title
                  </label>
                  <span className={'text-[10.5px] tabular-nums ' + seoTitleColor.cls}>
                    {form.seo_title.length}/60 · {seoTitleColor.text}
                  </span>
                </div>
                <input
                  value={form.seo_title}
                  onChange={(e) => setForm({ ...form, seo_title: e.target.value })}
                  placeholder="40-60 ký tự — chứa từ khoá chính"
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
                  maxLength={200}
                />
              </div>
              <div>
                <div className="flex items-baseline justify-between mb-1">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Meta description
                  </label>
                  <span className={'text-[10.5px] tabular-nums ' + seoDescColor.cls}>
                    {form.seo_description.length}/160 · {seoDescColor.text}
                  </span>
                </div>
                <textarea
                  value={form.seo_description}
                  onChange={(e) =>
                    setForm({ ...form, seo_description: e.target.value })
                  }
                  rows={3}
                  placeholder="120-160 ký tự — hiển thị dưới tiêu đề trên Google"
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
                  maxLength={300}
                />
              </div>

              <div className="border-t border-gray-100 dark:border-gray-700 pt-3 mt-2">
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  📝 Nguồn tham khảo (tuỳ chọn)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input
                    value={form.source_name}
                    onChange={(e) => setForm({ ...form, source_name: e.target.value })}
                    placeholder="Tên trang nguồn"
                    className="border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
                  />
                  <input
                    value={form.source_url}
                    onChange={(e) => setForm({ ...form, source_url: e.target.value })}
                    placeholder="https://..."
                    className="border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm font-mono"
                  />
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-4 self-start">
          <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-blue-500 via-emerald-500 to-violet-500" />
            <div className="p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                🚀 Hành động
              </h3>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => save('published')}
                  disabled={saving || !form.title.trim()}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg px-4 py-2.5 text-sm font-semibold shadow hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {saving ? '⏳ Đang lưu…' : '🌐 Lưu & Publish'}
                </button>
                <button
                  type="button"
                  onClick={() => save('draft')}
                  disabled={saving || !form.title.trim()}
                  className="w-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  📝 Lưu nháp
                </button>
              </div>
              <p className="text-[10.5px] text-gray-500 dark:text-gray-400">
                Publish → bài hiện ngay ở /tin-tuc public. Nháp chỉ admin thấy.
              </p>
            </div>
          </section>

          <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  📊 Điểm SEO
                </h3>
                <SeoScoreCircle score={seoScore} />
              </div>
              <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-900/60 overflow-hidden">
                <div
                  className={
                    'h-full bg-gradient-to-r transition-all ' +
                    (seoScore >= 80
                      ? 'from-emerald-400 to-teal-500'
                      : seoScore >= 50
                        ? 'from-amber-400 to-orange-500'
                        : 'from-rose-400 to-red-500')
                  }
                  style={{ width: `${seoScore}%` }}
                />
              </div>
              <ul className="text-[11px] mt-3 space-y-1">
                <SeoItem ok={form.title.length >= 40 && form.title.length <= 70} text={`Title 40-70 ký tự`} />
                <SeoItem ok={form.excerpt.length >= 120 && form.excerpt.length <= 160} text="Excerpt 120-160" />
                <SeoItem ok={form.seo_title.length >= 40 && form.seo_title.length <= 60} text="SEO Title 40-60" />
                <SeoItem ok={form.seo_description.length >= 120 && form.seo_description.length <= 160} text="Meta desc 120-160" />
                <SeoItem ok={bodyWords >= 600} text={`Bài ≥ 600 từ (${bodyWords})`} />
                <SeoItem ok={form.body_markdown.includes('## ')} text="Có ≥ 1 H2 (##)" />
                <SeoItem ok={!!form.cover_image_url} text="Có ảnh bìa" />
                <SeoItem ok={tagsList.length > 0} text="Có tags" />
              </ul>
            </div>
          </section>

          <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className={`h-1.5 bg-gradient-to-r ${cat.bar}`} />
            <div className="p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                🏷 Phân loại
              </h3>
              <div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1.5">Danh mục</div>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map((c) => {
                    const active = form.category === c.key
                    return (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => setForm({ ...form, category: c.key })}
                        className={
                          'px-2.5 py-1 rounded-full text-[11px] font-medium border transition ' +
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
              <div>
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-xs text-gray-600 dark:text-gray-400">Tags</span>
                  <span className="text-[10.5px] text-gray-500 dark:text-gray-400">
                    {tagsList.length} tag · phẩy tách
                  </span>
                </div>
                <input
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  placeholder="gà chọi, Asil, kinh nghiệm"
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
                />
                {tagsList.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {tagsList.map((t, i) => (
                      <span
                        key={i}
                        className="text-[10.5px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-900/60 text-gray-700 dark:text-gray-300"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-pink-500 to-rose-500" />
            <div className="p-4 space-y-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                🖼 Ảnh bìa
              </h3>
              <input
                value={form.cover_image_url}
                onChange={(e) => {
                  setImgError(false)
                  setForm({ ...form, cover_image_url: e.target.value })
                }}
                placeholder="https://..."
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm font-mono"
              />
              {form.cover_image_url && !imgError ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={form.cover_image_url}
                  alt="Cover preview"
                  onError={() => setImgError(true)}
                  className="rounded-lg aspect-video w-full object-cover border border-gray-200 dark:border-gray-700"
                />
              ) : form.cover_image_url && imgError ? (
                <div className="rounded-lg aspect-video w-full bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 flex items-center justify-center text-rose-600 dark:text-rose-400 text-xs">
                  ⚠️ Không tải được ảnh
                </div>
              ) : (
                <div className="rounded-lg aspect-video w-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800 border border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center text-gray-400 text-xs">
                  Chưa có ảnh
                </div>
              )}
            </div>
          </section>

          <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-violet-500 to-purple-500" />
            <div className="p-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                👁 Preview card
              </h3>
              <div className="bg-gray-50 dark:bg-gray-900/40 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                {form.cover_image_url && !imgError ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.cover_image_url}
                    alt=""
                    onError={() => setImgError(true)}
                    className="aspect-video w-full object-cover"
                  />
                ) : (
                  <div className="aspect-video w-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-900" />
                )}
                <div className="p-2.5">
                  <div className="flex items-center gap-1 mb-1">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full border ${cat.cls}`}
                    >
                      {cat.emoji} {cat.label}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-2">
                    {form.title || 'Tiêu đề bài viết…'}
                  </h4>
                  <p className="text-[11px] text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">
                    {form.excerpt || 'Tóm tắt ngắn sẽ hiển thị ở đây…'}
                  </p>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1.5">
                    ⏱ {readTime} phút đọc
                  </div>
                </div>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}

function ToolbarBtn({
  label,
  title,
  bold,
  italic,
  onClick,
}: {
  label: string
  title: string
  bold?: boolean
  italic?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={
        'px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:border-blue-400 transition ' +
        (bold ? 'font-bold ' : '') +
        (italic ? 'italic ' : '')
      }
    >
      {label}
    </button>
  )
}

function SeoScoreCircle({ score }: { score: number }) {
  const tone =
    score >= 80
      ? 'text-emerald-700 dark:text-emerald-300'
      : score >= 50
        ? 'text-amber-700 dark:text-amber-300'
        : 'text-rose-700 dark:text-rose-300'
  return (
    <span className={'text-2xl font-bold tabular-nums ' + tone}>{score}/100</span>
  )
}

function SeoItem({ ok, text }: { ok: boolean; text: string }) {
  return (
    <li
      className={
        'flex items-center gap-1.5 ' +
        (ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-500 dark:text-gray-400')
      }
    >
      <span>{ok ? '✓' : '○'}</span>
      <span>{text}</span>
    </li>
  )
}
