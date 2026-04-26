'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CameraCapture } from './CameraCapture'

type PendingFile = {
  file: File
  previewUrl: string
  isMain: boolean
  caption: string
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
}

export function MediaUploader({
  chickenId,
  chickenCode,
  onUploaded,
  compact,
}: {
  chickenId: string
  chickenCode?: string
  onUploaded?: () => void
  compact?: boolean
}) {
  const [files, setFiles] = useState<PendingFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const libraryInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  function addFile(file: File) {
    setFiles((prev) => [
      ...prev,
      {
        file,
        previewUrl: URL.createObjectURL(file),
        isMain: prev.length === 0,
        caption: '',
        status: 'pending',
      },
    ])
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? [])
    const next: PendingFile[] = picked.map((file, i) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      isMain: files.length === 0 && i === 0,
      caption: '',
      status: 'pending',
    }))
    setFiles((prev) => [...prev, ...next])
    e.target.value = ''
  }

  function patch(idx: number, p: Partial<PendingFile>) {
    setFiles((prev) => prev.map((f, i) => (i === idx ? { ...f, ...p } : f)))
  }

  function remove(idx: number) {
    setFiles((prev) => {
      const f = prev[idx]
      if (f) URL.revokeObjectURL(f.previewUrl)
      return prev.filter((_, i) => i !== idx)
    })
  }

  async function uploadAll() {
    setUploading(true)
    try {
      for (let i = 0; i < files.length; i++) {
        const f = files[i]
        if (f.status === 'done') continue
        patch(i, { status: 'uploading', error: undefined })

        const fd = new FormData()
        fd.append('file', f.file)
        fd.append('chicken_id', chickenId)
        fd.append('is_main', String(f.isMain))
        if (f.caption) fd.append('caption', f.caption)

        try {
          const res = await fetch('/api/chickens/media', { method: 'POST', body: fd })
          const j = await res.json()
          if (!res.ok) {
            patch(i, { status: 'error', error: j.error ?? 'Lỗi' })
          } else {
            patch(i, { status: 'done' })
          }
        } catch (e) {
          patch(i, {
            status: 'error',
            error: e instanceof Error ? e.message : 'Lỗi mạng',
          })
        }
      }
      router.refresh()
      onUploaded?.()
    } finally {
      setUploading(false)
    }
  }

  const pendingCount = files.filter((f) => f.status !== 'done').length
  const doneCount = files.filter((f) => f.status === 'done').length

  return (
    <div className="space-y-3">
      <div className={`flex gap-2 flex-wrap ${compact ? '' : 'justify-center'}`}>
        <button
          type="button"
          onClick={() => setCameraOpen(true)}
          className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 flex items-center gap-1.5"
        >
          📷 Mở camera
        </button>
        <button
          type="button"
          onClick={() => libraryInputRef.current?.click()}
          className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-1.5"
        >
          🖼️ Chọn từ thư viện
        </button>

        <input
          ref={libraryInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={onPick}
          className="hidden"
        />
      </div>

      <CameraCapture
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={addFile}
      />

      {chickenCode && !compact && (
        <p className="text-xs text-center text-gray-500 dark:text-gray-400">
          Đang upload cho{' '}
          <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">{chickenCode}</span>
        </p>
      )}

      {files.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {files.map((f, i) => {
            const isVideo = f.file.type.startsWith('video')
            return (
              <div
                key={i}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
              >
                <div className="relative aspect-square bg-gray-100 dark:bg-gray-700">
                  {isVideo ? (
                    <video src={f.previewUrl} className="w-full h-full object-cover" controls />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={f.previewUrl} alt="" className="w-full h-full object-cover" />
                  )}
                  {f.status === 'uploading' && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xs">
                      ⏳ Đang upload...
                    </div>
                  )}
                  {f.status === 'done' && (
                    <div className="absolute top-1.5 right-1.5 bg-green-500 text-white text-[10px] rounded-full px-2 py-0.5 font-semibold">
                      ✓ Xong
                    </div>
                  )}
                  {f.status === 'error' && (
                    <div className="absolute inset-0 bg-red-500/80 text-white text-xs p-2 flex items-center justify-center text-center">
                      ❌ {f.error}
                    </div>
                  )}
                </div>
                <div className="p-2 space-y-1.5">
                  <input
                    type="text"
                    value={f.caption}
                    onChange={(e) => patch(i, { caption: e.target.value })}
                    placeholder="Ghi chú (tùy chọn)"
                    disabled={f.status === 'done' || f.status === 'uploading'}
                    className="w-full text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded px-2 py-1"
                  />
                  <div className="flex items-center justify-between text-xs">
                    {!isVideo && (
                      <label className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                        <input
                          type="checkbox"
                          checked={f.isMain}
                          onChange={(e) => patch(i, { isMain: e.target.checked })}
                          disabled={f.status === 'done' || f.status === 'uploading'}
                          className="w-3.5 h-3.5 accent-blue-600"
                        />
                        Ảnh đại diện
                      </label>
                    )}
                    {f.status !== 'done' && f.status !== 'uploading' && (
                      <button
                        type="button"
                        onClick={() => remove(i)}
                        className="text-red-600 dark:text-red-400 hover:underline ml-auto"
                      >
                        Xóa
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {files.length > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {doneCount}/{files.length} đã upload
            {pendingCount > 0 && ` · ${pendingCount} chờ`}
          </div>
          <button
            type="button"
            onClick={uploadAll}
            disabled={uploading || pendingCount === 0}
            className="bg-emerald-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
          >
            {uploading ? 'Đang upload...' : `📤 Upload ${pendingCount} file`}
          </button>
        </div>
      )}
    </div>
  )
}
