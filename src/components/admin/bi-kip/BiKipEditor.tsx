'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

export function BiKipEditor({
  slug,
  filename,
  initialRaw,
  articleNumber,
}: {
  slug: string
  filename: string
  initialRaw: string
  articleNumber: number
}) {
  const router = useRouter()
  const taRef = useRef<HTMLTextAreaElement>(null)
  const [raw, setRaw] = useState(initialRaw)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)

  const dirty = raw !== initialRaw

  // Stats
  const lines = raw.split('\n').length
  const chars = raw.length
  const bytes = new Blob([raw]).size
  // Estimate body words (after "## NỘI DUNG BÀI VIẾT", before "## HÌNH ẢNH GỢI Ý")
  const bodyStart = raw.indexOf('## NỘI DUNG BÀI VIẾT')
  const bodyEnd = raw.indexOf('## HÌNH ẢNH GỢI Ý')
  const body =
    bodyStart >= 0 && bodyEnd > bodyStart
      ? raw.slice(bodyStart, bodyEnd)
      : raw
  const plain = body.replace(/[#*>`|_\-\[\]\(\)]/g, ' ')
  const words = plain.trim().split(/\s+/).filter(Boolean).length
  const readMin = Math.max(1, Math.round(words / 220))

  // Validation
  const slugLineOk = new RegExp(`\\*\\*Slug gợi ý:\\*\\*\\s*\\/?${slug}`, 'i').test(raw)
  const hasMetaDesc = /\*\*Meta description:\*\*/.test(raw)
  const hasPrimaryKw = /\*\*Từ khoá chính:\*\*/.test(raw)
  const hasH1 = /^#\s+/m.test(raw)
  const hasImageTable = /## HÌNH ẢNH GỢI Ý/.test(raw)

  const checks = useMemo(
    () => [
      { ok: slugLineOk, text: `Giữ slug "/${slug}"` },
      { ok: hasMetaDesc, text: 'Có Meta description' },
      { ok: hasPrimaryKw, text: 'Có Từ khoá chính' },
      { ok: hasH1, text: 'Có H1 tiêu đề bài' },
      { ok: words >= 1500, text: `Bài ≥ 1500 từ (hiện ${words})` },
      { ok: hasImageTable, text: 'Có bảng HÌNH ẢNH' },
    ],
    [slugLineOk, slug, hasMetaDesc, hasPrimaryKw, hasH1, words, hasImageTable]
  )
  const passCount = checks.filter((c) => c.ok).length

  function insertAtCursor(prefix: string, suffix = '', placeholder = '') {
    const ta = taRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const sel = raw.slice(start, end) || placeholder
    const before = raw.slice(0, start)
    const after = raw.slice(end)
    const next = `${before}${prefix}${sel}${suffix}${after}`
    setRaw(next)
    setTimeout(() => {
      ta.focus()
      const newStart = start + prefix.length
      const newEnd = newStart + sel.length
      ta.setSelectionRange(newStart, newEnd)
    }, 0)
  }

  async function save() {
    if (!slugLineOk) {
      setMsg({
        tone: 'err',
        text: `Phải giữ dòng "**Slug gợi ý:** /${slug}". Đổi slug sẽ phá link và prev/next.`,
      })
      return
    }
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/bi-kip/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw }),
      })
      const j = await res.json()
      if (!res.ok) {
        setMsg({ tone: 'err', text: typeof j.error === 'string' ? j.error : 'Lỗi lưu' })
        setSaving(false)
        return
      }
      setMsg({ tone: 'ok', text: '✓ Đã lưu file Markdown' })
      router.refresh()
    } catch (e) {
      setMsg({
        tone: 'err',
        text: 'Lỗi mạng: ' + (e instanceof Error ? e.message : String(e)),
      })
    }
    setSaving(false)
  }

  function reset() {
    if (!dirty) return
    if (!confirm('Khôi phục về phiên bản đã lưu? Mất hết thay đổi đang làm.')) return
    setRaw(initialRaw)
    setMsg(null)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
      <div className="space-y-4">
        <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-orange-500 to-red-500" />
          <div className="p-4 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                📝 Markdown editor
                <span className="text-[11px] text-gray-500 dark:text-gray-400 font-normal">
                  toàn bộ file · giữ nguyên format
                </span>
              </h2>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 tabular-nums">
                {lines} dòng · {chars.toLocaleString('vi-VN')} ký tự ·{' '}
                {(bytes / 1024).toFixed(1)} KB
              </div>
            </div>

            <div className="flex flex-wrap gap-1 border-y border-gray-100 dark:border-gray-700 py-1.5">
              <ToolBtn label="H2" onClick={() => insertAtCursor('\n## ', '\n', 'Tiêu đề H2')} />
              <ToolBtn label="H3" onClick={() => insertAtCursor('\n### ', '\n', 'Tiêu đề H3')} />
              <ToolBtn label="B" bold onClick={() => insertAtCursor('**', '**', 'in đậm')} />
              <ToolBtn label="I" italic onClick={() => insertAtCursor('*', '*', 'in nghiêng')} />
              <ToolBtn label="• List" onClick={() => insertAtCursor('\n- ', '\n', 'mục 1')} />
              <ToolBtn label="1. List" onClick={() => insertAtCursor('\n1. ', '\n', 'mục 1')} />
              <ToolBtn label="🔗 Link" onClick={() => insertAtCursor('[', '](https://)', 'text')} />
              <ToolBtn
                label="🖼 Ảnh"
                onClick={() => insertAtCursor('\n![', '](https://)\n', 'alt')}
              />
              <ToolBtn label="❝ Quote" onClick={() => insertAtCursor('\n> ', '\n', 'trích')} />
              <ToolBtn label="</> Code" onClick={() => insertAtCursor('`', '`', 'code')} />
              <ToolBtn label="── HR" onClick={() => insertAtCursor('\n\n---\n\n', '')} />
              <ToolBtn
                label="| Table"
                onClick={() =>
                  insertAtCursor(
                    '\n\n| Cột 1 | Cột 2 | Cột 3 |\n|---|---|---|\n| A | B | C |\n| D | E | F |\n\n',
                    ''
                  )
                }
              />
            </div>

            <textarea
              ref={taRef}
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              spellCheck={false}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-3 text-[13px] font-mono leading-relaxed resize-y"
              style={{ minHeight: 600 }}
            />
            <p className="text-[10.5px] text-gray-500 dark:text-gray-400 leading-relaxed">
              💡 Click toolbar để chèn cú pháp tại con trỏ. Giữ format SEO header (Từ khoá, Meta
              description, Slug...) ở đầu file. Bảng <code>HÌNH ẢNH GỢI Ý</code> ở cuối file
              quyết định ảnh hero và chèn ảnh giữa bài.
            </p>
          </div>
        </section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-4 self-start">
        <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500" />
          <div className="p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
              🚀 Hành động
            </h3>

            <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
              <Kv k="Bài" v={`#${String(articleNumber).padStart(2, '0')}/35`} />
              <Kv k="Slug" v={`/${slug}`} mono />
              <Kv k="File" v={filename} mono />
              <Kv k="Từ" v={words.toLocaleString('vi-VN')} />
              <Kv k="Đọc" v={`~${readMin} phút`} />
            </div>

            {dirty ? (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg px-2.5 py-1.5 text-[11px] text-amber-800 dark:text-amber-200 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Có thay đổi chưa lưu
              </div>
            ) : (
              <div className="text-[11px] text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Đã đồng bộ
              </div>
            )}

            {msg && (
              <div
                className={
                  'rounded-lg px-2.5 py-1.5 text-xs ' +
                  (msg.tone === 'ok'
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300')
                }
              >
                {msg.text}
              </div>
            )}

            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={save}
                disabled={!dirty || saving || !slugLineOk}
                className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg px-4 py-2.5 text-sm font-semibold shadow hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {saving ? '⏳ Đang lưu…' : '💾 Lưu thay đổi'}
              </button>
              <button
                onClick={reset}
                disabled={!dirty || saving}
                className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
              >
                ↺ Khôi phục bản đã lưu
              </button>
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <div className="p-4">
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                ✅ Kiểm tra
              </h3>
              <span
                className={
                  'text-xs font-bold tabular-nums ' +
                  (passCount === checks.length
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : passCount >= checks.length - 1
                      ? 'text-amber-700 dark:text-amber-300'
                      : 'text-rose-700 dark:text-rose-300')
                }
              >
                {passCount}/{checks.length}
              </span>
            </div>
            <ul className="space-y-1 text-[11px]">
              {checks.map((c, i) => (
                <li
                  key={i}
                  className={
                    'flex items-start gap-1.5 ' +
                    (c.ok
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : 'text-amber-700 dark:text-amber-300')
                  }
                >
                  <span>{c.ok ? '✓' : '⚠'}</span>
                  <span>{c.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl p-3">
          <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-1.5 flex items-center gap-1.5">
            ⚠️ Lưu ý
          </h3>
          <ul className="text-[11px] text-amber-800 dark:text-amber-200 space-y-1 list-disc list-inside leading-relaxed">
            <li>Bài viết mới sẽ hiển thị trên trang công khai sau khi cập nhật được xử lý xong (vài giây tới vài phút)</li>
            <li>Trên môi trường thật (production): nội dung cập nhật sẽ được phát hành tự động qua quy trình triển khai</li>
            <li>Đừng đổi dòng <code className="bg-white/60 dark:bg-gray-900/60 px-1 rounded">**Slug gợi ý:**</code> — sẽ phá URL hiện tại</li>
            <li>Bảng HÌNH ẢNH ở cuối file: ảnh #1 = hero, ảnh tiếp theo chèn giữa các H2</li>
          </ul>
        </section>
      </aside>
    </div>
  )
}

function ToolBtn({
  label,
  bold,
  italic,
  onClick,
}: {
  label: string
  bold?: boolean
  italic?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-950/30 hover:border-orange-400 transition ' +
        (bold ? 'font-bold ' : '') +
        (italic ? 'italic ' : '')
      }
    >
      {label}
    </button>
  )
}

function Kv({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2 bg-gray-50 dark:bg-gray-900/40 rounded px-2 py-1">
      <span className="text-gray-500 dark:text-gray-400">{k}</span>
      <span
        className={
          'text-gray-700 dark:text-gray-300 font-medium truncate max-w-[180px] ' +
          (mono ? 'font-mono text-[10.5px]' : '')
        }
      >
        {v}
      </span>
    </div>
  )
}
