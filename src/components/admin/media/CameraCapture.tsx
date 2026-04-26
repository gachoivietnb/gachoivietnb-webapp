'use client'

import { useEffect, useRef, useState } from 'react'

type Mode = 'photo' | 'video'

export function CameraCapture({
  open,
  onClose,
  onCapture,
}: {
  open: boolean
  onClose: () => void
  onCapture: (file: File) => void
}) {
  const [mode, setMode] = useState<Mode>('photo')
  const [facing, setFacing] = useState<'environment' | 'user'>('environment')
  const [recording, setRecording] = useState(false)
  const [recordMs, setRecordMs] = useState(0)
  const [err, setErr] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setErr(null)

    ;(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: mode === 'video',
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
        }
      } catch (e) {
        setErr(
          e instanceof Error
            ? e.name === 'NotAllowedError'
              ? 'Bạn chưa cho phép truy cập camera'
              : e.name === 'NotFoundError'
                ? 'Không tìm thấy camera nào'
                : e.message
            : 'Không mở được camera'
        )
      }
    })()

    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      if (timerRef.current) window.clearInterval(timerRef.current)
    }
  }, [open, facing, mode])

  function capturePhoto() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' })
        onCapture(file)
        onClose()
      },
      'image/jpeg',
      0.92
    )
  }

  function startRecording() {
    const stream = streamRef.current
    if (!stream) return
    chunksRef.current = []
    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
        ? 'video/webm;codecs=vp8'
        : 'video/webm'
    const recorder = new MediaRecorder(stream, { mimeType: mime })
    recorderRef.current = recorder
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
    }
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mime })
      const file = new File([blob], `video-${Date.now()}.webm`, { type: mime })
      onCapture(file)
      onClose()
    }
    recorder.start(500)
    setRecording(true)
    setRecordMs(0)
    timerRef.current = window.setInterval(() => {
      setRecordMs((ms) => ms + 100)
    }, 100)
  }

  function stopRecording() {
    recorderRef.current?.stop()
    setRecording(false)
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  if (!open) return null

  const seconds = Math.floor(recordMs / 1000)
  const timeStr = `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="flex items-center justify-between p-3 bg-gray-900 text-white">
        <button onClick={onClose} className="p-2 text-white text-lg" aria-label="Đóng">
          ✕
        </button>
        <div className="flex gap-1 bg-white/10 rounded-full p-1">
          <button
            onClick={() => setMode('photo')}
            disabled={recording}
            className={`px-3 py-1 text-xs rounded-full ${
              mode === 'photo' ? 'bg-white text-gray-900' : 'text-white'
            } disabled:opacity-50`}
          >
            📷 Ảnh
          </button>
          <button
            onClick={() => setMode('video')}
            disabled={recording}
            className={`px-3 py-1 text-xs rounded-full ${
              mode === 'video' ? 'bg-white text-gray-900' : 'text-white'
            } disabled:opacity-50`}
          >
            🎥 Video
          </button>
        </div>
        <button
          onClick={() => setFacing((f) => (f === 'environment' ? 'user' : 'environment'))}
          disabled={recording}
          className="p-2 text-white text-lg disabled:opacity-50"
          aria-label="Đổi camera"
        >
          🔄
        </button>
      </div>

      <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
        {err ? (
          <div className="text-white text-center p-6">
            <div className="text-4xl mb-3">⚠️</div>
            <div className="text-sm">{err}</div>
            <button
              onClick={onClose}
              className="mt-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-4 py-2 text-sm font-medium"
            >
              Đóng
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="max-w-full max-h-full object-contain"
            />
            <canvas ref={canvasRef} className="hidden" />
            {recording && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-600 text-white rounded-full px-3 py-1 text-xs font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-white dark:bg-gray-800 animate-pulse" />
                REC · {timeStr}
              </div>
            )}
          </>
        )}
      </div>

      {!err && (
        <div className="p-6 bg-gray-900 flex items-center justify-center">
          {mode === 'photo' ? (
            <button
              onClick={capturePhoto}
              className="w-16 h-16 rounded-full bg-white dark:bg-gray-800 border-4 border-gray-400 hover:border-white transition"
              aria-label="Chụp ảnh"
            />
          ) : recording ? (
            <button
              onClick={stopRecording}
              className="w-16 h-16 rounded-full bg-red-600 border-4 border-white transition flex items-center justify-center"
              aria-label="Dừng quay"
            >
              <span className="w-6 h-6 bg-white dark:bg-gray-800 rounded" />
            </button>
          ) : (
            <button
              onClick={startRecording}
              className="w-16 h-16 rounded-full bg-white dark:bg-gray-800 border-4 border-gray-400 hover:border-red-500 transition flex items-center justify-center"
              aria-label="Bắt đầu quay"
            >
              <span className="w-10 h-10 bg-red-600 rounded-full" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
