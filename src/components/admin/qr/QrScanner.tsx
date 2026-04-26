'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type RecentScan = {
  tag: string
  at: number // unix ms
}

const RECENT_KEY = 'gcvnb.qr.recent'
const MAX_RECENT = 8

function loadRecent(): RecentScan[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw) as RecentScan[]
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function saveRecent(list: RecentScan[]): void {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list))
  } catch {
    /* ignore */
  }
}

type Camera = { id: string; label: string }

type Html5QrcodeInstance = {
  start: (
    cameraIdOrConstraints: string | { facingMode: string },
    config: { fps: number; qrbox: number | { width: number; height: number } },
    onSuccess: (decodedText: string) => void,
    onError: (err: string) => void
  ) => Promise<void>
  stop: () => Promise<void>
  clear: () => void
}

type Html5QrcodeConstructor = new (elementId: string) => Html5QrcodeInstance
type Html5QrcodeStatic = Html5QrcodeConstructor & {
  getCameras: () => Promise<Camera[]>
}

export function QrScanner() {
  const router = useRouter()
  const scannerRef = useRef<Html5QrcodeInstance | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [lastScan, setLastScan] = useState<string | null>(null)
  const [manualTag, setManualTag] = useState('')
  const [manualLoading, setManualLoading] = useState(false)
  const [recent, setRecent] = useState<RecentScan[]>([])
  const [scannerReady, setScannerReady] = useState(false)
  const [starting, setStarting] = useState(false)
  const [cameras, setCameras] = useState<Camera[]>([])
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null)

  useEffect(() => {
    setRecent(loadRecent())
  }, [])

  function pushRecent(tag: string) {
    setRecent((prev) => {
      const next = [{ tag, at: Date.now() }, ...prev.filter((r) => r.tag !== tag)].slice(
        0,
        MAX_RECENT
      )
      saveRecent(next)
      return next
    })
  }

  function clearRecent() {
    setRecent([])
    saveRecent([])
  }

  async function startScanner(cameraId?: string) {
    setError(null)
    setStarting(true)
    setScannerReady(false)
    try {
      // Stop existing
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop()
        } catch {
          /* ignore */
        }
        scannerRef.current = null
      }

      // Check secure context
      if (typeof window !== 'undefined' && !window.isSecureContext) {
        throw new Error(
          'Camera chỉ hoạt động trên HTTPS hoặc localhost. URL hiện tại không bảo mật.'
        )
      }

      const mod = await import('html5-qrcode')
      const Html5Qrcode = mod.Html5Qrcode as unknown as Html5QrcodeStatic

      // Get camera list (requires user permission first via getUserMedia probe)
      let cams: Camera[] = []
      try {
        cams = await Html5Qrcode.getCameras()
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        if (/permission|denied|notallowed/i.test(msg)) {
          throw new Error(
            'Trình duyệt chặn quyền camera. Vào Cài đặt trình duyệt → Quyền truy cập trang → cho phép Camera → Tải lại.'
          )
        }
        throw new Error('Không liệt kê được camera: ' + msg)
      }

      if (!cams.length) {
        throw new Error('Thiết bị không có camera. Hãy nhập 4 số trên thẻ ở khung phải.')
      }

      setCameras(cams)

      // Pick rear camera by default if no override
      const pickedId =
        cameraId ??
        cams.find((c) => /back|rear|environment|sau/i.test(c.label))?.id ??
        cams[cams.length - 1]?.id ??
        cams[0].id
      setSelectedCameraId(pickedId)

      const instance = new Html5Qrcode('qr-reader')
      scannerRef.current = instance

      const onSuccess = (decodedText: string) => {
        setLastScan(decodedText)
        // Match either /ga/0042 or /ga/0042?... or just 0042 if QR has only number
        const slashMatch = decodedText.match(/\/ga\/(\d{1,6})/)
        const justNum = decodedText.match(/^\s*(\d{4,6})\s*$/)
        const tag = slashMatch?.[1] ?? justNum?.[1]
        if (tag) {
          pushRecent(tag)
          setSuccess(`✓ Đã nhận diện thẻ #${tag} — đang mở hồ sơ…`)
          setError(null)
          instance.stop().catch(() => {})
          setTimeout(() => router.push(`/ga/${tag}`), 250)
        } else {
          setError(`Mã QR không phải của hệ thống Gà Chọi Việt NB: ${decodedText.slice(0, 100)}`)
          setSuccess(null)
        }
      }

      const onScanError = () => {
        // Suppressed — fires on every frame without QR
      }

      await instance.start(
        pickedId,
        { fps: 10, qrbox: { width: 240, height: 240 } },
        onSuccess,
        onScanError
      )
      setScannerReady(true)
      setStarting(false)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      // Friendlier messages
      if (/permission|denied|notallowed/i.test(msg)) {
        setError(
          '🚫 Trình duyệt chặn quyền camera. Vào Cài đặt → Quyền trang web → cho phép Camera, sau đó tải lại trang.'
        )
      } else if (/notfound|devicesnotfound/i.test(msg)) {
        setError('📵 Không tìm thấy camera trên thiết bị. Dùng nhập tay mã thẻ ở cột phải.')
      } else if (/notreadable|trackstart/i.test(msg)) {
        setError('🔒 Camera đang bị app khác sử dụng. Đóng app camera khác rồi thử lại.')
      } else if (/secure context/i.test(msg) || (typeof window !== 'undefined' && !window.isSecureContext)) {
        setError('🔐 Camera cần HTTPS. URL hiện tại không bảo mật — chỉ dùng được trên gachoivietnb.com hoặc localhost.')
      } else {
        setError('Lỗi camera: ' + msg)
      }
      setStarting(false)
    }
  }

  // Init scanner on mount
  useEffect(() => {
    startScanner()
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
        scannerRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSwitchCamera(camId: string) {
    await startScanner(camId)
  }

  async function handleManualLookup(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    const tag = manualTag.trim().padStart(4, '0')
    if (!/^\d{4}$/.test(tag)) {
      setError('Mã thẻ phải là 4 chữ số (vd: 0042)')
      return
    }
    setManualLoading(true)
    try {
      const res = await fetch(`/api/qr-tags/lookup/${tag}`)
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Không tìm thấy thẻ')
        setManualLoading(false)
        return
      }
      pushRecent(tag)
      setSuccess(`✓ Tìm thấy thẻ #${tag} — đang mở…`)
      setTimeout(() => router.push(`/ga/${tag}`), 250)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi không rõ')
      setManualLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />
        <div className="p-4 md:p-5">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              📡 Camera quét trực tiếp
            </h2>
            {scannerReady && !error && !success && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-full px-2 py-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Đang quét
              </span>
            )}
          </div>

          {error && (
            <div className="mb-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 rounded-lg p-3 text-sm flex items-start gap-2">
              <span className="text-base">✗</span>
              <div className="flex-1">{error}</div>
              <button
                onClick={() => startScanner(selectedCameraId ?? undefined)}
                className="text-xs bg-rose-600 hover:bg-rose-700 text-white rounded px-2 py-1 font-semibold whitespace-nowrap"
              >
                🔄 Thử lại
              </button>
            </div>
          )}

          {success && (
            <div className="mb-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 rounded-lg p-3 text-sm font-medium animate-pulse">
              {success}
            </div>
          )}

          {/* Camera selector — only show if multiple */}
          {cameras.length > 1 && (
            <div className="mb-3 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500 dark:text-gray-400">📷 Camera:</span>
              {cameras.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleSwitchCamera(c.id)}
                  disabled={starting}
                  className={
                    'text-xs rounded-full px-2.5 py-1 border transition disabled:opacity-50 ' +
                    (selectedCameraId === c.id
                      ? 'bg-blue-600 text-white border-blue-700'
                      : 'bg-gray-50 dark:bg-gray-900/40 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100')
                  }
                >
                  {c.label || `Cam ${c.id.slice(0, 6)}`}
                </button>
              ))}
            </div>
          )}

          <div className="relative bg-black rounded-xl overflow-hidden aspect-square sm:aspect-video">
            <div id="qr-reader" className="w-full h-full" />
            {(starting || (!scannerReady && !error)) && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 text-white text-sm pointer-events-none">
                <div className="text-center">
                  <div className="text-4xl mb-2 animate-pulse">📷</div>
                  <div>Đang khởi tạo camera...</div>
                  <div className="text-[11px] opacity-75 mt-1">Cho phép quyền camera nếu được hỏi</div>
                </div>
              </div>
            )}
            {/* Aim overlay */}
            {scannerReady && !error && !success && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[60%] aspect-square max-w-[260px] border-2 border-white/40 rounded-2xl relative">
                  {[
                    'top-0 left-0 border-t-4 border-l-4 rounded-tl-2xl',
                    'top-0 right-0 border-t-4 border-r-4 rounded-tr-2xl',
                    'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-2xl',
                    'bottom-0 right-0 border-b-4 border-r-4 rounded-br-2xl',
                  ].map((cls, i) => (
                    <div key={i} className={`absolute w-8 h-8 border-emerald-400 ${cls}`} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {lastScan && (
            <div className="mt-3 text-[11px] text-gray-500 dark:text-gray-400 font-mono break-all border-t border-gray-100 dark:border-gray-700 pt-2">
              <span className="opacity-60">Raw:</span> {lastScan}
            </div>
          )}

          <div className="mt-3 text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed border-t border-gray-100 dark:border-gray-700 pt-3 space-y-1">
            <div>💡 <strong>Hướng camera</strong> tới mã QR trên thẻ — giữ ổn định 1-2 giây cho đến khi nhận diện.</div>
            <div>🔒 Cần kết nối <strong>HTTPS</strong> (gachoivietnb.com) — http thường không cấp quyền camera.</div>
            <div>📱 Lần đầu trình duyệt sẽ hỏi quyền camera — bấm <strong>"Cho phép"</strong>.</div>
          </div>
        </div>
      </section>

      <aside className="space-y-4">
        <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-amber-400 to-orange-500" />
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-2">
              ⌨️ Nhập tay mã thẻ
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-3 leading-relaxed">
              Khi thẻ mờ / camera kém — gõ 4 số trên thẻ để mở hồ sơ.
            </p>
            <form onSubmit={handleManualLookup} className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                pattern="\d{1,4}"
                maxLength={4}
                value={manualTag}
                onChange={(e) => setManualTag(e.target.value.replace(/\D/g, ''))}
                placeholder="vd: 0042"
                className="flex-1 px-3 py-2 text-base font-mono font-bold tabular-nums tracking-widest text-center border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button
                type="submit"
                disabled={manualLoading || !manualTag}
                className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg px-4 py-2 text-sm font-semibold shadow hover:shadow-md disabled:opacity-50 transition"
              >
                {manualLoading ? '…' : 'Mở →'}
              </button>
            </form>
          </div>
        </section>

        <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-emerald-400 to-teal-500" />
          <div className="p-4">
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                🕘 Quét gần đây
              </h3>
              {recent.length > 0 && (
                <button
                  onClick={clearRecent}
                  className="text-[10.5px] text-rose-600 dark:text-rose-400 hover:underline"
                >
                  Xoá lịch sử
                </button>
              )}
            </div>
            {recent.length === 0 ? (
              <p className="text-[11px] text-gray-500 dark:text-gray-400 italic text-center py-4">
                Chưa có thẻ nào quét trên thiết bị này.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {recent.map((r) => (
                  <li key={r.tag}>
                    <Link
                      href={`/ga/${r.tag}`}
                      className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-900/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-300 border border-transparent transition group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base">🐓</span>
                        <span className="font-mono font-bold tabular-nums text-gray-900 dark:text-gray-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
                          #{r.tag}
                        </span>
                      </div>
                      <span className="text-[10.5px] text-gray-400 dark:text-gray-500 whitespace-nowrap">
                        {timeAgo(r.at)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-[10.5px] text-gray-400 dark:text-gray-500 mt-3 leading-relaxed border-t border-gray-100 dark:border-gray-700 pt-2">
              Lịch sử lưu trên thiết bị, không gửi server.
            </p>
          </div>
        </section>

        <section className="bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2 flex items-center gap-1.5">
            <span>💡</span> Mẹo dùng tốt
          </h3>
          <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside leading-relaxed">
            <li>Thẻ bóng → nghiêng nhẹ tránh phản chiếu đèn</li>
            <li>Tối → bật đèn flash điện thoại trước khi quét</li>
            <li>Thẻ rách → dùng input nhập tay 4 số cạnh phải</li>
            <li>Có nhiều camera → bấm chip phía trên để đổi (chọn camera sau)</li>
          </ul>
        </section>
      </aside>
    </div>
  )
}

function timeAgo(ts: number): string {
  const sec = Math.max(0, Math.floor((Date.now() - ts) / 1000))
  if (sec < 60) return `${sec}s trước`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} phút`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} giờ`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day} ngày`
  return new Date(ts).toLocaleDateString('vi-VN')
}
