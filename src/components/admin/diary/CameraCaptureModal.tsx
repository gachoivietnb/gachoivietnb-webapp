'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

/**
 * CameraCaptureModal — modal mở camera (rear by default trên mobile),
 * preview live, chụp nhiều ảnh, upload tất cả qua /api/diary/upload.
 *
 * Hoạt động trên:
 * - Mobile (Android/iOS): dùng camera sau (environment) bằng MediaDevices.
 *   Yêu cầu HTTPS hoặc localhost.
 * - Desktop có webcam: dùng webcam mặc định.
 */

type CapturedPhoto = {
  blob: Blob
  url: string  // object URL preview
}

export function CameraCaptureModal({
  onClose,
  onUploaded,
}: {
  onClose: () => void
  onUploaded: (urls: string[]) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [photos, setPhotos] = useState<CapturedPhoto[]>([])
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [flash, setFlash] = useState(false)

  /** Start camera với facingMode hiện tại */
  const startCamera = useCallback(async (mode: 'user' | 'environment') => {
    setStarting(true)
    setError(null)
    try {
      // Stop stream cũ nếu có
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
      setStarting(false)
    } catch (e) {
      setStarting(false)
      const msg = e instanceof Error ? e.message : 'Không truy cập được camera'
      // Friendlier message cho lỗi phổ biến
      if (/permission|denied|NotAllowed/i.test(msg)) {
        setError(
          'Trình duyệt đã từ chối quyền camera. Vào Cài đặt trình duyệt → cho phép camera cho website này → tải lại.'
        )
      } else if (/NotFound|DevicesNotFound/i.test(msg)) {
        setError('Không tìm thấy camera trên thiết bị. Hãy dùng nút "📷 Chọn ảnh" để upload từ máy.')
      } else if (/NotReadable|TrackStart/i.test(msg)) {
        setError('Camera đang được app khác sử dụng. Đóng các app camera khác rồi thử lại.')
      } else if (!window.isSecureContext) {
        setError('Camera chỉ hoạt động trên kết nối an toàn (HTTPS hoặc localhost).')
      } else {
        setError('Lỗi camera: ' + msg)
      }
    }
  }, [])

  // Init khi mở modal
  useEffect(() => {
    startCamera(facingMode)
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
    }
  }, [facingMode, startCamera])

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      for (const p of photos) {
        URL.revokeObjectURL(p.url)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function takePhoto() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !video.videoWidth) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        setPhotos((arr) => [...arr, { blob, url }])
        // Flash effect
        setFlash(true)
        setTimeout(() => setFlash(false), 200)
      },
      'image/jpeg',
      0.85
    )
  }

  function removePhoto(idx: number) {
    setPhotos((arr) => {
      const p = arr[idx]
      if (p) URL.revokeObjectURL(p.url)
      return arr.filter((_, i) => i !== idx)
    })
  }

  function flipCamera() {
    setFacingMode((m) => (m === 'environment' ? 'user' : 'environment'))
  }

  async function handleUploadAll() {
    if (photos.length === 0) return
    setUploading(true)
    const urls: string[] = []
    for (const [i, p] of photos.entries()) {
      const fd = new FormData()
      fd.append('file', p.blob, `camera_${Date.now()}_${i}.jpg`)
      const r = await fetch('/api/diary/upload', { method: 'POST', body: fd })
      if (!r.ok) {
        setUploading(false)
        const j = await r.json().catch(() => ({}))
        alert('Lỗi upload: ' + (typeof j.error === 'string' ? j.error : 'unknown'))
        return
      }
      const j = await r.json()
      urls.push(j.data.url)
    }
    setUploading(false)
    onUploaded(urls)
    // Cleanup + close
    for (const p of photos) URL.revokeObjectURL(p.url)
    onClose()
  }

  function handleClose() {
    if (uploading) return
    if (photos.length > 0) {
      if (!confirm(`Có ${photos.length} ảnh chưa upload. Đóng và bỏ?`)) return
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-4 py-3 bg-black/60 backdrop-blur text-white">
        <button
          onClick={handleClose}
          disabled={uploading}
          className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-xl disabled:opacity-50"
        >
          ×
        </button>
        <div className="flex flex-col items-center">
          <div className="text-xs uppercase tracking-widest opacity-80">Chụp ảnh nhật ký</div>
          <div className="text-sm font-bold">
            {photos.length > 0 ? `📸 ${photos.length} ảnh đã chụp` : 'Bấm nút giữa để chụp'}
          </div>
        </div>
        <button
          onClick={flipCamera}
          disabled={starting || uploading}
          title="Đổi camera"
          className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-xl disabled:opacity-50"
        >
          🔄
        </button>
      </div>

      {/* Video preview */}
      <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
        {error ? (
          <div className="text-center px-6 text-white max-w-md">
            <div className="text-5xl mb-3">📷</div>
            <div className="text-base font-semibold mb-2">{error}</div>
            <button
              onClick={() => startCamera(facingMode)}
              className="mt-3 bg-white text-black rounded-lg px-5 py-2 text-sm font-bold"
            >
              🔄 Thử lại
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={
                'w-full h-full object-cover ' +
                (facingMode === 'user' ? 'scale-x-[-1]' : '')  // mirror selfie
              }
            />
            {starting && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
                <div className="text-center">
                  <div className="text-4xl mb-2 animate-pulse">📷</div>
                  <div className="text-sm">Đang khởi động camera...</div>
                </div>
              </div>
            )}
            {/* Flash overlay khi chụp */}
            {flash && (
              <div className="absolute inset-0 bg-white opacity-80 pointer-events-none animate-pulse" />
            )}
          </>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Photos strip + capture controls */}
      <div className="relative z-10 bg-black/85 backdrop-blur text-white">
        {/* Thumbnail strip */}
        {photos.length > 0 && (
          <div className="flex gap-2 px-4 py-3 overflow-x-auto border-b border-white/10">
            {photos.map((p, i) => (
              <div key={i} className="relative shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.url}
                  alt=""
                  className="w-16 h-16 rounded-lg object-cover border-2 border-white/30"
                />
                <button
                  onClick={() => removePhoto(i)}
                  disabled={uploading}
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 hover:bg-rose-600 text-white text-xs flex items-center justify-center disabled:opacity-50"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Capture row */}
        <div className="flex items-center justify-between px-6 py-4">
          {/* Cancel */}
          <button
            onClick={handleClose}
            disabled={uploading}
            className="text-sm text-white/70 hover:text-white px-3 py-1.5 disabled:opacity-50"
          >
            Huỷ
          </button>

          {/* Big shutter */}
          <button
            onClick={takePhoto}
            disabled={starting || !!error || uploading}
            className="relative w-16 h-16 rounded-full bg-white border-4 border-white/30 hover:scale-105 transition disabled:opacity-30 disabled:scale-100"
            aria-label="Chụp ảnh"
          >
            <div className="absolute inset-2 rounded-full border-2 border-black/20" />
          </button>

          {/* Done — upload all */}
          <button
            onClick={handleUploadAll}
            disabled={photos.length === 0 || uploading}
            className={
              'rounded-xl px-4 py-2 text-sm font-bold shadow disabled:opacity-30 transition ' +
              (photos.length > 0
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                : 'bg-white/15 text-white/50')
            }
          >
            {uploading
              ? `⏳ Upload ${photos.length}...`
              : photos.length > 0
                ? `✓ Xong (${photos.length})`
                : 'Xong'}
          </button>
        </div>
      </div>
    </div>
  )
}
