'use client'

import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CameraCapture } from '@/components/admin/media/CameraCapture'
import { removeDiacritics } from '@/lib/utils/slugify'

type Item = {
  id: string
  media_type: string
  url: string
  thumbnail_url: string | null
  category: string
  title: string | null
  description: string | null
  is_featured: boolean
  display_order: number
  created_at: string
}

const CATEGORIES: Array<{ key: string; label: string; emoji: string; gradient: string }> = [
  { key: 'chuong_trai', label: 'Chuồng trại', emoji: '🏠', gradient: 'from-blue-500 to-indigo-600' },
  { key: 'hoat_dong', label: 'Hoạt động', emoji: '👥', gradient: 'from-emerald-500 to-green-600' },
  { key: 'su_kien', label: 'Sự kiện', emoji: '🎉', gradient: 'from-purple-500 to-pink-600' },
  { key: 'san_pham', label: 'Sản phẩm', emoji: '🐓', gradient: 'from-amber-500 to-orange-600' },
  { key: 'khac', label: 'Khác', emoji: '📸', gradient: 'from-gray-500 to-slate-600' },
]

type PendingFile = {
  file: File
  previewUrl: string
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
}

type SortKey = 'newest' | 'oldest' | 'featured' | 'title'
type TypeFilter = '' | 'anh' | 'video'
type ViewMode = 'grid' | 'compact' | 'list'

export function FarmMediaManager({ items }: { items: Item[] }) {
  const [pending, setPending] = useState<PendingFile[]>([])
  const [category, setCategory] = useState('chuong_trai')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isFeatured, setIsFeatured] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [editing, setEditing] = useState<Item | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [bulkBusy, setBulkBusy] = useState(false)

  // Filter state
  const [q, setQ] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('')
  const [featuredOnly, setFeaturedOnly] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('newest')
  const [view, setView] = useState<ViewMode>('grid')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const qNorm = removeDiacritics(q.trim())

  const filtered = useMemo(() => {
    const out = items.filter((m) => {
      if (qNorm) {
        const hay = removeDiacritics(`${m.title ?? ''} ${m.description ?? ''}`)
        if (!hay.includes(qNorm)) return false
      }
      if (catFilter && m.category !== catFilter) return false
      if (typeFilter && m.media_type !== typeFilter) return false
      if (featuredOnly && !m.is_featured) return false
      return true
    })
    const sorted = [...out]
    if (sortKey === 'newest') sorted.sort((a, b) => b.created_at.localeCompare(a.created_at))
    else if (sortKey === 'oldest') sorted.sort((a, b) => a.created_at.localeCompare(b.created_at))
    else if (sortKey === 'featured')
      sorted.sort((a, b) => Number(b.is_featured) - Number(a.is_featured) || b.created_at.localeCompare(a.created_at))
    else if (sortKey === 'title')
      sorted.sort((a, b) => (a.title ?? '').localeCompare(b.title ?? '', 'vi'))
    return sorted
  }, [items, qNorm, catFilter, typeFilter, featuredOnly, sortKey])

  // KPI
  const total = items.length
  const photos = items.filter((x) => x.media_type === 'anh').length
  const videos = items.filter((x) => x.media_type === 'video').length
  const featuredCount = items.filter((x) => x.is_featured).length
  const byCat: Record<string, number> = {}
  for (const x of items) byCat[x.category] = (byCat[x.category] ?? 0) + 1
  const topCatEntry = Object.entries(byCat).sort(([, a], [, b]) => b - a)[0]
  const topCat = topCatEntry ? CATEGORIES.find((c) => c.key === topCatEntry[0]) : null

  const hasFilter = !!(q || catFilter || typeFilter || featuredOnly)
  function clearFilters() {
    setQ('')
    setCatFilter('')
    setTypeFilter('')
    setFeaturedOnly(false)
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).map((f) => ({
      file: f,
      previewUrl: URL.createObjectURL(f),
      status: 'pending' as const,
    }))
    setPending((prev) => [...prev, ...files])
    e.target.value = ''
  }

  function addFromCamera(file: File) {
    setPending((prev) => [
      ...prev,
      { file, previewUrl: URL.createObjectURL(file), status: 'pending' },
    ])
  }

  function removePending(idx: number) {
    setPending((prev) => {
      URL.revokeObjectURL(prev[idx]?.previewUrl ?? '')
      return prev.filter((_, i) => i !== idx)
    })
  }

  async function uploadAll() {
    if (pending.length === 0) return
    setUploading(true)
    try {
      for (let i = 0; i < pending.length; i++) {
        const p = pending[i]
        if (p.status === 'done') continue
        setPending((prev) =>
          prev.map((x, j) => (j === i ? { ...x, status: 'uploading', error: undefined } : x))
        )
        const fd = new FormData()
        fd.append('file', p.file)
        fd.append('category', category)
        if (title) fd.append('title', title)
        if (description) fd.append('description', description)
        fd.append('is_featured', String(isFeatured))

        try {
          const res = await fetch('/api/farm-media', { method: 'POST', body: fd })
          const j = await res.json()
          if (!res.ok) {
            setPending((prev) =>
              prev.map((x, idx) =>
                idx === i ? { ...x, status: 'error', error: j.error ?? 'Lỗi' } : x
              )
            )
          } else {
            setPending((prev) => prev.map((x, j) => (j === i ? { ...x, status: 'done' } : x)))
          }
        } catch (e) {
          setPending((prev) =>
            prev.map((x, j) =>
              j === i ? { ...x, status: 'error', error: e instanceof Error ? e.message : 'Lỗi' } : x
            )
          )
        }
      }
      setTitle('')
      setDescription('')
      router.refresh()
      setTimeout(() => {
        setPending((prev) => prev.filter((p) => p.status !== 'done'))
      }, 1500)
    } finally {
      setUploading(false)
    }
  }

  async function toggleFeatured(item: Item) {
    setBusy(item.id)
    try {
      await fetch('/api/farm-media', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, is_featured: !item.is_featured }),
      })
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  async function removeItem(item: Item) {
    if (!confirm(`Xóa "${item.title ?? 'mục này'}"? Không hoàn tác.`)) return
    setBusy(item.id)
    try {
      await fetch(`/api/farm-media?id=${item.id}`, { method: 'DELETE' })
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  async function saveEdit(form: { category: string; title: string; description: string }) {
    if (!editing) return
    setBusy(editing.id)
    try {
      await fetch('/api/farm-media', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editing.id,
          category: form.category,
          title: form.title,
          description: form.description,
        }),
      })
      setEditing(null)
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  // Bulk actions
  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  function toggleAllVisible() {
    const visibleIds = filtered.map((m) => m.id)
    const allSelected = visibleIds.every((id) => selected.has(id))
    setSelected((prev) => {
      const next = new Set(prev)
      if (allSelected) visibleIds.forEach((id) => next.delete(id))
      else visibleIds.forEach((id) => next.add(id))
      return next
    })
  }
  async function bulkDelete() {
    if (selected.size === 0) return
    if (!confirm(`Xóa ${selected.size} mục đã chọn? Không hoàn tác.`)) return
    setBulkBusy(true)
    try {
      for (const id of selected) {
        await fetch(`/api/farm-media?id=${id}`, { method: 'DELETE' })
      }
      setSelected(new Set())
      router.refresh()
    } finally {
      setBulkBusy(false)
    }
  }
  async function bulkFeature(value: boolean) {
    if (selected.size === 0) return
    setBulkBusy(true)
    try {
      for (const id of selected) {
        await fetch('/api/farm-media', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, is_featured: value }),
        })
      }
      setSelected(new Set())
      router.refresh()
    } finally {
      setBulkBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Tổng mục" value={total.toLocaleString('vi-VN')} sub={`${filtered.length} hiển thị`} tint="blue" icon="📦" />
        <Kpi label="Ảnh" value={photos.toLocaleString('vi-VN')} sub={`${total > 0 ? Math.round((photos / total) * 100) : 0}% / tổng`} tint="emerald" icon="🖼️" />
        <Kpi label="Video" value={videos.toLocaleString('vi-VN')} sub={`${total > 0 ? Math.round((videos / total) * 100) : 0}% / tổng`} tint="purple" icon="🎥" />
        <Kpi
          label="Nổi bật"
          value={featuredCount.toLocaleString('vi-VN')}
          sub={topCat ? `Nhiều nhất: ${topCat.emoji} ${topCat.label}` : 'Chưa có'}
          tint="amber"
          icon="⭐"
        />
      </div>

      {/* Action bar */}
      <div className="flex gap-2 flex-wrap items-center">
        <button
          onClick={() => setUploadOpen(!uploadOpen)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-2 text-sm font-medium"
        >
          {uploadOpen ? '✕ Đóng upload' : '📤 Upload mới'}
        </button>
        <Link
          href="/thu-vien"
          target="_blank"
          className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg px-3 py-2 text-sm font-medium"
        >
          🌐 Xem trang public →
        </Link>
        {selected.size > 0 && (
          <div className="ml-auto flex gap-2 items-center bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-lg px-3 py-1.5">
            <span className="text-xs font-bold text-blue-700 dark:text-blue-300">
              ☑ Đã chọn {selected.size}
            </span>
            <button
              onClick={() => bulkFeature(true)}
              disabled={bulkBusy}
              className="text-xs px-2 py-1 rounded bg-amber-500 hover:bg-amber-600 text-white font-semibold disabled:opacity-50"
            >
              ⭐ Nổi bật
            </button>
            <button
              onClick={() => bulkFeature(false)}
              disabled={bulkBusy}
              className="text-xs px-2 py-1 rounded bg-gray-500 hover:bg-gray-600 text-white font-semibold disabled:opacity-50"
            >
              ☆ Bỏ NB
            </button>
            <button
              onClick={bulkDelete}
              disabled={bulkBusy}
              className="text-xs px-2 py-1 rounded bg-red-600 hover:bg-red-700 text-white font-semibold disabled:opacity-50"
            >
              🗑 Xóa
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="text-xs text-blue-700 dark:text-blue-300 hover:underline font-semibold"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Upload section (collapsible) */}
      {uploadOpen && (
        <section className="bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-900 rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">📤 Upload ảnh / video mới</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Danh mục *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.emoji} {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                Tiêu đề (áp dụng cho toàn bộ batch)
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Khu A - Trống chiến"
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="mb-3">
            <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Mô tả ngắn (tùy chọn)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Giới thiệu, chú thích nội dung..."
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
            />
            <label className="flex items-center gap-2 text-sm mt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="w-4 h-4 accent-amber-500"
              />
              <span className="text-gray-700 dark:text-gray-300">⭐ Đánh dấu nổi bật (hiện trên homepage)</span>
            </label>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setCameraOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium"
            >
              📷 Mở camera
            </button>
            <button
              onClick={() => inputRef.current?.click()}
              className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              🖼️ Chọn từ thư viện máy
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={onPick}
              className="hidden"
            />
            {pending.length > 0 && (
              <button
                onClick={uploadAll}
                disabled={uploading}
                className="ml-auto bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-5 py-2 text-sm font-medium disabled:opacity-50"
              >
                {uploading ? 'Đang upload...' : `📤 Upload ${pending.length} file`}
              </button>
            )}
          </div>

          <CameraCapture open={cameraOpen} onClose={() => setCameraOpen(false)} onCapture={addFromCamera} />

          {pending.length > 0 && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {pending.map((p, i) => {
                const isVideo = p.file.type.startsWith('video')
                return (
                  <div
                    key={i}
                    className="relative aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600"
                  >
                    {isVideo ? (
                      <video src={p.previewUrl} className="w-full h-full object-cover" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.previewUrl} alt="" className="w-full h-full object-cover" />
                    )}
                    {p.status === 'uploading' && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xs">⏳</div>
                    )}
                    {p.status === 'done' && (
                      <div className="absolute top-1 right-1 bg-emerald-500 text-white text-[9px] rounded-full px-2 font-bold">✓</div>
                    )}
                    {p.status === 'error' && (
                      <div className="absolute inset-0 bg-red-500/80 text-white text-[10px] p-1 flex items-center justify-center text-center" title={p.error}>
                        ❌ {p.error?.slice(0, 40)}
                      </div>
                    )}
                    {p.status !== 'uploading' && p.status !== 'done' && (
                      <button
                        onClick={() => removePending(i)}
                        className="absolute top-1 left-1 bg-white/90 text-red-600 dark:text-red-400 rounded-full w-5 h-5 flex items-center justify-center text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* Filter bar */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">🔍 Lọc thông minh</h2>
          {hasFilter && (
            <button onClick={clearFilters} className="text-xs text-red-600 dark:text-red-400 hover:underline font-semibold ml-auto">
              ✕ Xóa lọc
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-3">
          <div className="relative md:col-span-2">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">🔍</span>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm theo tiêu đề, mô tả..."
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg pl-9 pr-3 py-2 text-sm outline-none"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">📦 Mọi loại</option>
            <option value="anh">🖼️ Chỉ ảnh</option>
            <option value="video">🎥 Chỉ video</option>
          </select>
          <label className="flex items-center gap-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
            <input
              type="checkbox"
              checked={featuredOnly}
              onChange={(e) => setFeaturedOnly(e.target.checked)}
              className="w-4 h-4 accent-amber-500"
            />
            <span className="font-medium">⭐ Chỉ nổi bật</span>
          </label>
        </div>

        {/* Category pills */}
        <div className="mt-3 flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mr-1">
            Danh mục:
          </span>
          <button
            onClick={() => setCatFilter('')}
            className={`text-xs px-2.5 py-1 rounded-full font-semibold transition ${
              !catFilter
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
            }`}
          >
            Tất cả ({total})
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => setCatFilter(c.key)}
              className={`text-xs px-2.5 py-1 rounded-full font-semibold transition ${
                catFilter === c.key
                  ? `bg-gradient-to-r ${c.gradient} text-white shadow-sm`
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              {c.emoji} {c.label} ({byCat[c.key] ?? 0})
            </button>
          ))}
        </div>

        {/* Sort + view */}
        <div className="mt-3 flex items-center gap-2 flex-wrap pt-3 border-t border-gray-100 dark:border-gray-700">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sắp xếp:</span>
          {(
            [
              ['newest', '🆕 Mới nhất'],
              ['featured', '⭐ Nổi bật trước'],
              ['oldest', '📅 Cũ nhất'],
              ['title', '🔤 Tiêu đề'],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setSortKey(k)}
              className={`text-xs px-2.5 py-1 rounded-full font-semibold transition ${
                sortKey === k
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              {l}
            </button>
          ))}

          <div className="ml-auto flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
            <button
              onClick={() => setView('grid')}
              className={`text-xs px-2.5 py-1 rounded font-semibold transition ${
                view === 'grid' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-600 dark:text-gray-400'
              }`}
              title="Card lớn"
            >
              ▦ Lớn
            </button>
            <button
              onClick={() => setView('compact')}
              className={`text-xs px-2.5 py-1 rounded font-semibold transition ${
                view === 'compact' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-600 dark:text-gray-400'
              }`}
              title="Lưới gọn"
            >
              ⊞ Gọn
            </button>
            <button
              onClick={() => setView('list')}
              className={`text-xs px-2.5 py-1 rounded font-semibold transition ${
                view === 'list' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-600 dark:text-gray-400'
              }`}
              title="Bảng"
            >
              ☰ Bảng
            </button>
          </div>
        </div>
      </div>

      {/* Select all visible */}
      {filtered.length > 0 && (
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={toggleAllVisible}
            className="px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/60 font-semibold"
          >
            {filtered.every((m) => selected.has(m.id))
              ? '☐ Bỏ chọn hiển thị'
              : `☑ Chọn tất cả (${filtered.length})`}
          </button>
          <span className="text-gray-500 dark:text-gray-400">
            <b className="text-gray-900 dark:text-gray-100">{filtered.length}</b> mục
          </span>
        </div>
      )}

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 md:p-12 text-center">
          <div className="text-5xl mb-3">📭</div>
          <p className="text-gray-600 dark:text-gray-400 text-lg font-semibold">
            {items.length === 0 ? 'Chưa có media nào' : 'Không có mục nào khớp tiêu chí'}
          </p>
          {hasFilter && items.length > 0 && (
            <button onClick={clearFilters} className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline font-semibold">
              Bỏ tất cả bộ lọc
            </button>
          )}
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              selected={selected.has(item.id)}
              busy={busy === item.id}
              onSelect={() => toggleSelect(item.id)}
              onToggleFeature={() => toggleFeatured(item)}
              onEdit={() => setEditing(item)}
              onDelete={() => removeItem(item)}
            />
          ))}
        </div>
      ) : view === 'compact' ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
          {filtered.map((item) => (
            <CompactCard
              key={item.id}
              item={item}
              selected={selected.has(item.id)}
              onSelect={() => toggleSelect(item.id)}
              onClick={() => setEditing(item)}
            />
          ))}
        </div>
      ) : (
        <ListView
          items={filtered}
          selected={selected}
          busy={busy}
          onSelect={toggleSelect}
          onToggleFeature={toggleFeatured}
          onEdit={setEditing}
          onDelete={removeItem}
        />
      )}

      {editing && (
        <EditModal
          item={editing}
          onClose={() => setEditing(null)}
          onSave={saveEdit}
          saving={busy === editing.id}
        />
      )}
    </div>
  )
}

/* ========= GRID CARD ========= */
function MediaCard({
  item,
  selected,
  busy,
  onSelect,
  onToggleFeature,
  onEdit,
  onDelete,
}: {
  item: Item
  selected: boolean
  busy: boolean
  onSelect: () => void
  onToggleFeature: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const cat = CATEGORIES.find((c) => c.key === item.category)
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border-2 transition-all shadow-sm hover:shadow-xl hover:-translate-y-0.5 ${
        selected ? 'border-blue-500 ring-2 ring-blue-300 dark:ring-blue-900' : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      <div className="relative aspect-video bg-gray-100 dark:bg-gray-700">
        {item.media_type === 'video' ? (
          <video src={item.url} controls className="w-full h-full object-cover" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.url} alt={item.title ?? ''} className="w-full h-full object-cover" />
        )}
        {/* Select checkbox */}
        <button
          onClick={onSelect}
          className={`absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition shadow ${
            selected ? 'bg-blue-600 text-white' : 'bg-white/95 text-gray-400 hover:text-gray-700 hover:bg-white'
          }`}
        >
          {selected ? '✓' : '○'}
        </button>
        {/* Featured */}
        {item.is_featured && (
          <span className="absolute top-2 right-2 bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-950 rounded-full px-2 py-0.5 text-[10px] font-bold shadow">
            ⭐ NỔI BẬT
          </span>
        )}
        {/* Type badge bottom-left */}
        <span className="absolute bottom-2 left-2 bg-black/70 text-white rounded-full px-2 py-0.5 text-[10px] font-mono shadow">
          {item.media_type === 'video' ? '🎥 Video' : '🖼️ Ảnh'}
        </span>
        {/* Category badge bottom-right */}
        {cat && (
          <span className={`absolute bottom-2 right-2 bg-gradient-to-r ${cat.gradient} text-white rounded-full px-2 py-0.5 text-[10px] font-bold shadow`}>
            {cat.emoji} {cat.label}
          </span>
        )}
      </div>
      <div className="p-3">
        <div className="font-semibold text-sm truncate text-gray-900 dark:text-gray-100">
          {item.title || <span className="italic text-gray-400 dark:text-gray-500">Không tiêu đề</span>}
        </div>
        {item.description && (
          <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">{item.description}</p>
        )}
        <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
          {new Date(item.created_at).toLocaleDateString('vi-VN')}
        </div>
        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={onToggleFeature}
            disabled={busy}
            className={`text-[10px] px-2 py-1 rounded font-semibold flex-1 ${
              item.is_featured
                ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 hover:bg-amber-200'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
            }`}
          >
            {item.is_featured ? '⭐ NB' : '☆ NB'}
          </button>
          <button
            onClick={onEdit}
            className="text-[10px] px-2 py-1 rounded font-semibold flex-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200"
          >
            ✎ Sửa
          </button>
          <button
            onClick={onDelete}
            disabled={busy}
            className="text-[10px] px-2 py-1 rounded font-semibold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 hover:bg-red-200 disabled:opacity-50"
          >
            🗑
          </button>
        </div>
      </div>
    </div>
  )
}

/* ========= COMPACT CARD ========= */
function CompactCard({
  item,
  selected,
  onSelect,
  onClick,
}: {
  item: Item
  selected: boolean
  onSelect: () => void
  onClick: () => void
}) {
  return (
    <div
      className={`relative aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden border-2 transition-all hover:scale-105 cursor-pointer ${
        selected ? 'border-blue-500 ring-2 ring-blue-300' : 'border-transparent'
      }`}
    >
      {item.media_type === 'video' ? (
        <video src={item.url} className="w-full h-full object-cover" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.url} alt={item.title ?? ''} className="w-full h-full object-cover" onClick={onClick} />
      )}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onSelect()
        }}
        className={`absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow ${
          selected ? 'bg-blue-600 text-white' : 'bg-white/90 text-gray-500 hover:text-gray-700'
        }`}
      >
        {selected ? '✓' : '○'}
      </button>
      {item.is_featured && (
        <span className="absolute top-1 right-1 text-amber-400 text-sm drop-shadow">⭐</span>
      )}
      {item.media_type === 'video' && (
        <span className="absolute bottom-1 left-1 bg-black/70 text-white rounded text-[9px] px-1 font-mono">🎥</span>
      )}
    </div>
  )
}

/* ========= LIST VIEW ========= */
function ListView({
  items,
  selected,
  busy,
  onSelect,
  onToggleFeature,
  onEdit,
  onDelete,
}: {
  items: Item[]
  selected: Set<string>
  busy: string | null
  onSelect: (id: string) => void
  onToggleFeature: (item: Item) => void
  onEdit: (item: Item) => void
  onDelete: (item: Item) => void
}) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-x-auto shadow-sm">
      <table className="w-full text-sm min-w-[800px]">
        <thead className="bg-gray-50 dark:bg-gray-900/60 text-[11px] uppercase text-gray-500 dark:text-gray-400">
          <tr>
            <th className="px-3 py-2.5 w-10"></th>
            <th className="px-3 py-2.5 w-20">Preview</th>
            <th className="px-3 py-2.5 text-left">Tiêu đề / Mô tả</th>
            <th className="px-3 py-2.5 text-center">Loại</th>
            <th className="px-3 py-2.5 text-left">Danh mục</th>
            <th className="px-3 py-2.5 text-center">⭐</th>
            <th className="px-3 py-2.5 text-left">Ngày</th>
            <th className="px-3 py-2.5 text-right">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {items.map((m) => {
            const cat = CATEGORIES.find((c) => c.key === m.category)
            const isSelected = selected.has(m.id)
            return (
              <tr key={m.id} className={`hover:bg-gray-50/60 dark:hover:bg-gray-900/30 transition ${isSelected ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''}`}>
                <td className="px-3 py-2 text-center">
                  <input type="checkbox" checked={isSelected} onChange={() => onSelect(m.id)} className="w-4 h-4 accent-blue-600" />
                </td>
                <td className="px-3 py-2">
                  <div className="w-14 h-14 rounded-lg bg-gray-100 dark:bg-gray-700 overflow-hidden">
                    {m.media_type === 'video' ? (
                      <video src={m.url} className="w-full h-full object-cover" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.url} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="font-semibold text-sm truncate max-w-[280px]">
                    {m.title || <span className="italic text-gray-400">Không tiêu đề</span>}
                  </div>
                  {m.description && (
                    <div className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1 max-w-[280px]">
                      {m.description}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 text-center text-xs">
                  {m.media_type === 'video' ? '🎥' : '🖼️'}
                </td>
                <td className="px-3 py-2">
                  {cat && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold bg-gradient-to-r ${cat.gradient} text-white`}>
                      {cat.emoji} {cat.label}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  <button
                    onClick={() => onToggleFeature(m)}
                    disabled={busy === m.id}
                    className={`text-base transition ${m.is_featured ? 'text-amber-500' : 'text-gray-300 hover:text-amber-400'}`}
                  >
                    {m.is_featured ? '⭐' : '☆'}
                  </button>
                </td>
                <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  {new Date(m.created_at).toLocaleDateString('vi-VN')}
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <button onClick={() => onEdit(m)} className="text-xs text-blue-600 dark:text-blue-400 hover:underline mr-2">
                    Sửa
                  </button>
                  <button
                    onClick={() => onDelete(m)}
                    disabled={busy === m.id}
                    className="text-xs text-red-600 dark:text-red-400 hover:underline"
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* ========= EDIT MODAL ========= */
function EditModal({
  item,
  onClose,
  onSave,
  saving,
}: {
  item: Item
  onClose: () => void
  onSave: (form: { category: string; title: string; description: string }) => void
  saving: boolean
}) {
  const [cat, setCat] = useState(item.category)
  const [title, setTitle] = useState(item.title ?? '')
  const [desc, setDesc] = useState(item.description ?? '')
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full p-5 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">✎ Sửa media</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Preview */}
          <div className="aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
            {item.media_type === 'video' ? (
              <video src={item.url} controls className="w-full h-full object-cover" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.url} alt="" className="w-full h-full object-cover" />
            )}
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Danh mục</label>
              <select
                value={cat}
                onChange={(e) => setCat(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.emoji} {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Tiêu đề</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Mô tả</label>
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                rows={4}
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => onSave({ category: cat, title, description: desc })}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
          <button onClick={onClose} className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
            Hủy
          </button>
        </div>
      </div>
    </div>
  )
}

function Kpi({
  label,
  value,
  sub,
  tint,
  icon,
}: {
  label: string
  value: string
  sub?: string
  tint: 'blue' | 'emerald' | 'purple' | 'amber'
  icon: string
}) {
  const map: Record<string, string> = {
    blue: 'from-blue-500 to-indigo-600',
    emerald: 'from-emerald-500 to-green-600',
    purple: 'from-purple-500 to-fuchsia-600',
    amber: 'from-amber-500 to-orange-600',
  }
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-sm relative overflow-hidden">
      <div className={`absolute top-0 right-0 w-14 h-14 rounded-full bg-gradient-to-br ${map[tint]} opacity-10 -translate-y-4 translate-x-4`} />
      <div className="flex items-start justify-between gap-2 relative">
        <div className="min-w-0">
          <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest truncate">{label}</div>
          <div className="text-xl md:text-2xl font-extrabold text-gray-900 dark:text-gray-100 mt-0.5 tabular-nums">{value}</div>
          {sub && <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5">{sub}</div>}
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  )
}
