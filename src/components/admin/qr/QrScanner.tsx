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

export function QrScanner() {
  const router = useRouter()
  const scannerRef = useRef<{ clear: () => Promise<void> } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [lastScan, setLastScan] = useState<string | null>(null)
  const [manualTag, setManualTag] = useState('')
  const [manualLoading, setManualLoading] = useState(false)
  const [recent, setRecent] = useState<RecentScan[]>([])
  const [scannerReady, setScannerReady] = useState(false)

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

  useEffect(() => {
    let cancelled = false

    import('html5-qrcode')
      .then(({ Html5QrcodeScanner }) => {
        if (cancelled) return

        const scanner = new Html5QrcodeScanner(
          'qr-reader',
          { fps: 10, qrbox: 250, rememberLastUsedCamera: true },
          false
        )

        scanner.render(
          (decodedText) => {
            setLastScan(decodedText)
            const match = decodedText.match(/\/ga\/(\d{4})/)
            if (match) {
              const tag = match[1]
              pushRecent(tag)
              setSuccess(`✓ Đã nhận diện thẻ #${tag} — đang mở hồ sơ…`)
              setError(null)
              scanner.clear().catch(() => {})
              setTimeout(() => router.push(`/ga/${tag}`), 250)
            } else {
              setError(`Mã QR không phải của hệ thống Gà Chọi Việt NB: ${decodedText}`)
              setSuccess(null)
            }
          },
          () => {
            // ignore continuous scan errors
          }
        )

        scannerRef.current = scanner
        setScannerReady(true)
      })
      .catch((e) => {
        setError(
          'Không tải được thư viện scanner: ' + (e instanceof Error ? e.message : String(e))
        )
      })

    return () => {
      cancelled = true
      scannerRef.current?.clear().catch(() => {})
    }
  }, [router])

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
                onClick={() => setError(null)}
                className="text-rose-500 hover:text-rose-700"
              >
                ✕
              </button>
            </div>
          )}

          {success && (
            <div className="mb-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 rounded-lg p-3 text-sm font-medium animate-pulse">
              {success}
            </div>
          )}

          <div className="relative bg-black rounded-xl overflow-hidden">
            <div id="qr-reader" className="w-full" />
            {!scannerReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 text-white text-sm">
                ⏳ Đang khởi tạo camera…
              </div>
            )}
          </div>

          {lastScan && (
            <div className="mt-3 text-[11px] text-gray-500 dark:text-gray-400 font-mono break-all border-t border-gray-100 dark:border-gray-700 pt-2">
              <span className="opacity-60">Raw:</span> {lastScan}
            </div>
          )}

          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-3 leading-relaxed border-t border-gray-100 dark:border-gray-700 pt-3">
            💡 Camera cần HTTPS hoặc localhost. Trên điện thoại trong cùng mạng LAN, mở{' '}
            <code className="bg-gray-100 dark:bg-gray-900 px-1 rounded">
              http://&lt;IP-máy&gt;:3000/admin/quet-qr
            </code>{' '}
            (không dùng <code>localhost</code>). iOS phải Add to Home Screen trước.
          </p>
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
            <li>iOS: thêm vào Home Screen rồi mở app để dùng camera mượt hơn</li>
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
