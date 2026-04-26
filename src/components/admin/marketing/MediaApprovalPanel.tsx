'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MediaUploader } from '@/components/admin/media/MediaUploader'

type ChickenSummary = {
  id: string
  chicken_code: string
  name: string | null
  breed_name: string | null
}

type Media = {
  id: string
  drive_url: string
  thumbnail_url: string | null
  media_type: string
  caption: string | null
  social_caption: string | null
  is_main: boolean
  approved_for_render: boolean
  render_status: string | null
  published_urls: Record<string, string> | null
  taken_at: string | null
  created_at: string
}

export function MediaApprovalPanel({
  chicken,
  onClose,
}: {
  chicken: ChickenSummary
  onClose: () => void
}) {
  const [media, setMedia] = useState<Media[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const router = useRouter()

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/chickens/${chicken.id}`)
      const j = await res.json()
      setMedia(((j.data?.media ?? []) as Media[]))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chicken.id])

  async function toggleApprove(m: Media) {
    setBusy(m.id)
    try {
      const res = await fetch(`/api/chickens/media/${m.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved_for_render: !m.approved_for_render }),
      })
      if (res.ok) await load()
    } finally {
      setBusy(null)
    }
  }

  async function updateCaption(m: Media, social_caption: string) {
    setBusy(m.id)
    try {
      const res = await fetch(`/api/chickens/media/${m.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ social_caption }),
      })
      if (res.ok) await load()
    } finally {
      setBusy(null)
    }
  }

  async function setMain(m: Media) {
    setBusy(m.id)
    try {
      const res = await fetch(`/api/chickens/media/${m.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_main: true }),
      })
      if (res.ok) {
        await load()
        router.refresh()
      }
    } finally {
      setBusy(null)
    }
  }

  async function deleteMedia(m: Media) {
    if (!confirm('Xóa file này?')) return
    setBusy(m.id)
    try {
      const res = await fetch(`/api/chickens/media?id=${m.id}`, { method: 'DELETE' })
      if (res.ok) {
        await load()
        router.refresh()
      }
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-t-2xl md:rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-5 py-3 flex items-center justify-between z-10">
          <div className="min-w-0">
            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
              {chicken.name ?? chicken.chicken_code}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {chicken.chicken_code} · {chicken.breed_name}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/admin/ho-so-ga/${chicken.id}`}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Hồ sơ →
            </Link>
            <button onClick={onClose} className="p-2 text-xl" aria-label="Đóng">
              ✕
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Media grid */}
          {loading ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">Đang tải...</div>
          ) : media.length === 0 ? (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900 rounded-lg p-6 text-center">
              <div className="text-4xl mb-2">📸</div>
              <div className="text-sm text-amber-800 dark:text-amber-200">
                Chưa có ảnh/video nào cho con gà này. Dùng khung dưới để upload, hoặc ra chuồng
                quay chụp.
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {media.map((m) => (
                <div
                  key={m.id}
                  className={`rounded-lg border overflow-hidden ${
                    m.approved_for_render
                      ? 'border-amber-400 dark:border-amber-600 bg-amber-50/40 dark:bg-amber-950/20'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="relative aspect-video bg-gray-100 dark:bg-gray-700">
                    {m.media_type === 'video' ? (
                      <video src={m.drive_url} controls className="w-full h-full object-cover" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.thumbnail_url ?? m.drive_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    )}
                    {m.is_main && (
                      <span className="absolute top-2 left-2 bg-amber-400 text-amber-900 text-[10px] font-bold rounded px-1.5 py-0.5">
                        ⭐ Đại diện
                      </span>
                    )}
                    {m.render_status === 'published' && (
                      <span className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] font-bold rounded px-1.5 py-0.5">
                        📤 Đã đăng
                      </span>
                    )}
                  </div>
                  <div className="p-3 space-y-2">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={m.approved_for_render}
                        onChange={() => toggleApprove(m)}
                        disabled={busy === m.id}
                        className="w-5 h-5 accent-amber-500 mt-0.5"
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          Duyệt render + đăng MXH
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400">
                          Module render sẽ lấy file này qua API sau khi tick
                        </div>
                      </div>
                    </label>

                    <textarea
                      defaultValue={m.social_caption ?? ''}
                      placeholder="Caption đăng MXH (tùy chọn)..."
                      rows={2}
                      disabled={busy === m.id}
                      onBlur={(e) => {
                        const v = e.target.value.trim()
                        if (v !== (m.social_caption ?? '')) updateCaption(m, v)
                      }}
                      className="w-full text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded px-2 py-1.5"
                    />

                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="text-gray-500 dark:text-gray-400 truncate">
                        {new Date(m.created_at).toLocaleDateString('vi-VN')}
                        {m.render_status && m.approved_for_render && (
                          <span className="ml-2 font-medium text-amber-700 dark:text-amber-400">
                            {m.render_status === 'pending' && '⏳ Chờ render'}
                            {m.render_status === 'rendering' && '🔄 Đang render'}
                            {m.render_status === 'published' && '✓ Đã đăng'}
                            {m.render_status === 'error' && '❌ Lỗi'}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {!m.is_main && m.media_type === 'anh' && (
                          <button
                            onClick={() => setMain(m)}
                            disabled={busy === m.id}
                            className="text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            Đặt đại diện
                          </button>
                        )}
                        <button
                          onClick={() => deleteMedia(m)}
                          disabled={busy === m.id}
                          className="text-red-600 dark:text-red-400 hover:underline"
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Upload */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-3">
              📤 Thêm ảnh/video mới
            </h3>
            <MediaUploader
              chickenId={chicken.id}
              chickenCode={chicken.chicken_code}
              compact
              onUploaded={load}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
