'use client'

import { useState } from 'react'
import {
  type DiaryCategory,
  type DiaryMood,
  type DiaryEntryWithMeta,
  CATEGORY_META,
  MOOD_META,
  WEATHER_PRESETS,
} from '@/lib/diary/types'
import { CameraCaptureModal } from './CameraCaptureModal'

type Profile = { id: string; full_name: string }
type Area = { id: string; code: string; name: string }

export function DiaryFormModal({
  initial,
  profiles,
  areas,
  onClose,
  onSaved,
}: {
  initial?: DiaryEntryWithMeta
  profiles: Profile[]
  areas: Area[]
  onClose: () => void
  onSaved: () => void
}) {
  void profiles
  const [title, setTitle] = useState(initial?.title ?? '')
  const [content, setContent] = useState(initial?.content ?? '')
  const [category, setCategory] = useState<DiaryCategory>(initial?.category ?? 'cong_viec')
  const [mood, setMood] = useState<DiaryMood | ''>(initial?.mood ?? '')
  const [tagsInput, setTagsInput] = useState(initial?.tags?.join(', ') ?? '')
  const [areaId, setAreaId] = useState(initial?.related_area_id ?? '')
  const [diaryDate, setDiaryDate] = useState(
    initial?.diary_date ?? new Date().toISOString().slice(0, 10)
  )
  const [weather, setWeather] = useState(initial?.weather ?? '')
  const [isPinned, setIsPinned] = useState(initial?.is_pinned ?? false)
  const [attachments, setAttachments] = useState<string[]>(initial?.attachments ?? [])
  const [uploading, setUploading] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const isEdit = Boolean(initial?.id)
  const catMeta = CATEGORY_META[category]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (content.trim().length < 1) {
      setErr('Vui lòng nhập nội dung')
      return
    }
    setSaving(true)
    setErr(null)

    const tags = tagsInput
      .split(/[,\n]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
      .slice(0, 20)

    const body = {
      title: title.trim() || null,
      content: content.trim(),
      category,
      mood: mood || null,
      tags,
      related_area_id: areaId || null,
      diary_date: diaryDate,
      weather: weather || null,
      is_pinned: isPinned,
      attachments,
    }

    const url = isEdit ? `/api/diary/${initial?.id}` : '/api/diary'
    const method = isEdit ? 'PATCH' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(false)
    if (!res.ok) {
      const j = await res.json()
      setErr(typeof j.error === 'string' ? j.error : 'Lỗi lưu')
      return
    }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-0 md:p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-t-2xl md:rounded-2xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
        {/* HEADER gradient theo category */}
        <div className={`px-5 py-4 bg-gradient-to-r ${catMeta.bar} text-white flex items-center justify-between`}>
          <div>
            <div className="text-xs uppercase tracking-widest opacity-80">{isEdit ? 'Chỉnh sửa' : 'Ghi mới'}</div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span>{catMeta.emoji}</span> Nhật ký · {catMeta.label}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-lg"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-4">
          {/* Category quick pick */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">
              Loại nhật ký
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {(Object.keys(CATEGORY_META) as DiaryCategory[]).map((c) => {
                const m = CATEGORY_META[c]
                const active = category === c
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={
                      'p-2 rounded-lg text-xs font-semibold transition border ' +
                      (active
                        ? `bg-gradient-to-br ${m.bar} text-white border-transparent shadow`
                        : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-orange-300')
                    }
                  >
                    <div className="text-base mb-0.5">{m.emoji}</div>
                    <div className="leading-tight">{m.label}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Title (optional) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">
              Tiêu đề <span className="text-gray-400">(tuỳ chọn)</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              placeholder="VD: Phát hiện 1 con bị ốm khu A2"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">
              Nội dung <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={10000}
              placeholder="Mô tả chi tiết hoạt động, quan sát, sự việc xảy ra..."
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm resize-y"
              autoFocus
            />
            <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 text-right">
              {content.length} / 10.000 ký tự
            </div>
          </div>

          {/* Mood */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">
              Tâm trạng <span className="text-gray-400">(tuỳ chọn)</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(MOOD_META) as DiaryMood[]).map((m) => {
                const meta = MOOD_META[m]
                const active = mood === m
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMood(active ? '' : m)}
                    className={
                      'px-3 py-1.5 rounded-lg text-xs font-semibold transition border ' +
                      (active
                        ? meta.cls + ' ring-2 ring-orange-400 border-transparent'
                        : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-orange-300')
                    }
                  >
                    {meta.emoji} {meta.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Date + Weather */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">
                Ngày
              </label>
              <input
                type="date"
                value={diaryDate}
                onChange={(e) => setDiaryDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">
                Thời tiết
              </label>
              <div className="flex flex-wrap gap-1">
                {WEATHER_PRESETS.map((w) => {
                  const active = weather === w.label
                  return (
                    <button
                      key={w.key}
                      type="button"
                      onClick={() => setWeather(active ? '' : w.label)}
                      className={
                        'px-2 py-1 rounded text-xs font-semibold transition ' +
                        (active
                          ? 'bg-blue-500 text-white shadow'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200')
                      }
                    >
                      {w.emoji} {w.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Area + Tags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">
                Khu / vị trí <span className="text-gray-400">(tuỳ chọn)</span>
              </label>
              <select
                value={areaId}
                onChange={(e) => setAreaId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
              >
                <option value="">— Không gắn —</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} · {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">
                Thẻ <span className="text-gray-400">(phẩy phân cách)</span>
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="lứa T4, Hổ Vương, sửa chuồng"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
              />
            </div>
          </div>

          {/* Attachments — upload ảnh */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">
              Ảnh đính kèm <span className="text-gray-400">(tối đa 5MB / ảnh, PNG/JPG/WEBP/GIF)</span>
            </label>

            {/* Existing thumbnails */}
            {attachments.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-2">
                {attachments.map((url, idx) => (
                  <div
                    key={url + idx}
                    className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setAttachments((a) => a.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-rose-500 hover:bg-rose-600 text-white text-xs opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Camera ngay */}
              <button
                type="button"
                onClick={() => setCameraOpen(true)}
                disabled={uploading || attachments.length >= 10}
                className="flex items-center justify-center gap-2 px-3 py-3 rounded-lg border-2 border-dashed border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 text-sm text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-lg">📸</span>
                <span>Chụp ảnh ngay</span>
              </button>

              {/* Chọn từ máy */}
              <label
                className={
                  'flex items-center justify-center gap-2 px-3 py-3 rounded-lg border-2 border-dashed border-blue-300 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 text-sm text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-950/30 transition ' +
                  (uploading || attachments.length >= 10
                    ? 'opacity-50 cursor-not-allowed'
                    : 'cursor-pointer')
                }
              >
                <span className="text-lg">📷</span>
                <span>{uploading ? 'Đang upload...' : 'Chọn từ máy'}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  multiple
                  disabled={uploading || attachments.length >= 10}
                  onChange={async (e) => {
                    const files = Array.from(e.target.files ?? [])
                    if (files.length === 0) return
                    setUploading(true)
                    setErr(null)
                    const newUrls: string[] = []
                    for (const file of files) {
                      if (attachments.length + newUrls.length >= 10) break
                      const fd = new FormData()
                      fd.append('file', file)
                      const r = await fetch('/api/diary/upload', { method: 'POST', body: fd })
                      const j = await r.json()
                      if (!r.ok) {
                        setErr(typeof j.error === 'string' ? j.error : 'Lỗi upload')
                        break
                      }
                      newUrls.push(j.data.url)
                    }
                    setAttachments((a) => [...a, ...newUrls].slice(0, 10))
                    setUploading(false)
                    e.target.value = ''
                  }}
                  className="hidden"
                />
              </label>
            </div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
              💡 Tiện đi chuồng → bấm <b>📸 Chụp ảnh ngay</b> để mở camera + ghi nhật ký luôn · {attachments.length}/10 ảnh
            </div>
          </div>

          {cameraOpen && (
            <CameraCaptureModal
              onClose={() => setCameraOpen(false)}
              onUploaded={(urls) => {
                setAttachments((a) => [...a, ...urls].slice(0, 10))
              }}
            />
          )}

          {/* Pin toggle */}
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="w-4 h-4 rounded text-orange-500"
            />
            <span>📌 Ghim lên đầu danh sách</span>
          </label>

          {err && (
            <div className="px-3 py-2 rounded-lg text-sm bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300">
              ⚠️ {err}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700/50"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={saving || content.trim().length < 1}
              className={`flex-1 px-4 py-2.5 rounded-xl text-white font-bold shadow-md disabled:opacity-50 bg-gradient-to-r ${catMeta.bar}`}
            >
              {saving ? 'Đang lưu...' : isEdit ? '💾 Lưu thay đổi' : '✏️ Ghi nhật ký'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
