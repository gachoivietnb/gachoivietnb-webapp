'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Media = {
  id: string
  drive_url: string
  thumbnail_url: string | null
  media_type: string
  caption: string | null
  is_main: boolean
  taken_at: string | null
}

export function MediaGallery({ media }: { media: Media[] }) {
  const [deleting, setDeleting] = useState<string | null>(null)
  const router = useRouter()

  async function remove(id: string) {
    if (!confirm('Xóa ảnh/video này?')) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/chickens/media?id=${id}`, { method: 'DELETE' })
      if (res.ok) router.refresh()
    } finally {
      setDeleting(null)
    }
  }

  if (media.length === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
        Chưa có ảnh/video nào. Dùng nút bên dưới để chụp ảnh, quay video hoặc chọn từ thư viện.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
      {media.map((m) => (
        <div
          key={m.id}
          className="relative aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden group"
        >
          {m.media_type === 'video' ? (
            <video src={m.drive_url} controls className="w-full h-full object-cover" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={m.thumbnail_url ?? m.drive_url}
              alt={m.caption ?? ''}
              className="w-full h-full object-cover"
            />
          )}

          {m.is_main && (
            <span className="absolute top-1.5 left-1.5 bg-amber-400 text-amber-900 text-[10px] font-bold rounded px-1.5 py-0.5">
              ⭐ Đại diện
            </span>
          )}

          <button
            onClick={() => remove(m.id)}
            disabled={deleting === m.id}
            className="absolute top-1.5 right-1.5 bg-white/90 hover:bg-red-500 hover:text-white text-red-600 dark:text-red-400 rounded-full w-6 h-6 flex items-center justify-center text-xs transition opacity-0 group-hover:opacity-100 disabled:opacity-50"
            aria-label="Xóa"
          >
            ✕
          </button>

          {m.caption && (
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent text-white text-[11px] p-2 line-clamp-2">
              {m.caption}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
