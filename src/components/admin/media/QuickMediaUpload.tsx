'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { MediaUploader } from './MediaUploader'

type Candidate = {
  id: string
  chicken_code: string
  name: string | null
  breed_name: string | null
  tag_number: string | null
}

export function QuickMediaUpload({ initialChicken }: { initialChicken?: Candidate | null } = {}) {
  const [mode, setMode] = useState<'pick' | 'scan' | 'search'>('pick')
  const [chicken, setChicken] = useState<Candidate | null>(initialChicken ?? null)
  const [search, setSearch] = useState('')
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(false)
  const [scanHint, setScanHint] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const scannerRef = useRef<unknown>(null)

  async function doSearch(q: string) {
    setSearch(q)
    if (q.trim().length < 1) {
      setCandidates([])
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/chickens?q=${encodeURIComponent(q)}&limit=20`)
      const j = await res.json()
      setCandidates((j.data ?? []) as Candidate[])
    } finally {
      setLoading(false)
    }
  }

  async function findByTag(tagNumber: string) {
    setScanHint(`🔍 Tìm gà với thẻ #${tagNumber}...`)
    const res = await fetch(`/api/qr-tags/lookup/${tagNumber}`)
    const j = await res.json()
    if (!res.ok || !j.data?.chickens) {
      setScanHint(`❌ Thẻ #${tagNumber} chưa gắn cho gà nào`)
      return
    }
    const c = j.data.chickens as {
      id: string
      chicken_code: string
      name: string | null
      breeds?: { name_vi: string } | null
    }
    setChicken({
      id: c.id,
      chicken_code: c.chicken_code,
      name: c.name,
      breed_name: c.breeds?.name_vi ?? null,
      tag_number: tagNumber,
    })
    setScanHint(`✓ Đã chọn ${c.name ?? c.chicken_code}`)
    setMode('pick')
    setTimeout(() => setScanHint(null), 2500)
  }

  useEffect(() => {
    if (mode !== 'scan' || !videoRef.current) return
    let cancelled = false
    let stream: MediaStream | null = null

    ;(async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode')
        if (cancelled) return
        const scanner = new Html5Qrcode('quick-scan-region')
        scannerRef.current = scanner
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 8, qrbox: { width: 220, height: 220 } },
          (decoded) => {
            // Accept either plain tag number (4 digits) or full URL /ga/NNNN
            const match = decoded.match(/(\d{4,5})(?!.*\d)/)
            if (match) {
              findByTag(match[1])
              scanner.stop().catch(() => {})
            }
          },
          () => {}
        )
      } catch (e) {
        setScanHint(
          e instanceof Error ? `Không mở được camera: ${e.message}` : 'Không mở được camera'
        )
      }
    })()

    return () => {
      cancelled = true
      const s = scannerRef.current as { stop?: () => Promise<void> } | null
      s?.stop?.().catch(() => {})
      stream?.getTracks().forEach((t) => t.stop())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  return (
    <div className="space-y-4">
      {/* STEP 1: chọn gà */}
      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">
            Bước 1 · Chọn gà
          </h2>
          {chicken && (
            <button
              onClick={() => {
                setChicken(null)
                setMode('pick')
                setSearch('')
                setCandidates([])
              }}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Đổi gà khác
            </button>
          )}
        </div>

        {chicken ? (
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-lg p-3 flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 text-white flex items-center justify-center text-2xl shrink-0">
              🐓
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                {chicken.name ?? chicken.chicken_code}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {chicken.chicken_code} · {chicken.breed_name}
                {chicken.tag_number && ` · Thẻ #${chicken.tag_number}`}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex gap-2 mb-3 flex-wrap">
              <button
                onClick={() => setMode('scan')}
                className={`px-3 py-1.5 text-sm rounded-lg ${
                  mode === 'scan'
                    ? 'bg-blue-600 text-white'
                    : 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                📷 Quét QR
              </button>
              <button
                onClick={() => setMode('search')}
                className={`px-3 py-1.5 text-sm rounded-lg ${
                  mode === 'search'
                    ? 'bg-blue-600 text-white'
                    : 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                🔍 Tìm theo mã / tên
              </button>
            </div>

            {mode === 'scan' && (
              <div>
                <div
                  id="quick-scan-region"
                  className="mx-auto rounded-xl overflow-hidden bg-black"
                  style={{ maxWidth: 360 }}
                />
                <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">
                  Đưa camera vào thẻ chân gà. Auto-nhận diện mã.
                </p>
              </div>
            )}

            {mode === 'search' && (
              <div>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => doSearch(e.target.value)}
                  placeholder="Nhập mã (GA-ASIL-...) hoặc tên..."
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg px-3 py-2 text-sm"
                  autoFocus
                />
                {loading && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Đang tìm...</p>
                )}
                {!loading && candidates.length > 0 && (
                  <ul className="mt-2 border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-700 max-h-64 overflow-y-auto">
                    {candidates.map((c) => (
                      <li key={c.id}>
                        <button
                          onClick={() => {
                            setChicken(c)
                            setMode('pick')
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                        >
                          <div className="w-8 h-8 rounded bg-gradient-to-br from-orange-500 to-red-500 text-white flex items-center justify-center text-sm shrink-0">
                            🐓
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              {c.name ?? c.chicken_code}
                            </div>
                            <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                              {c.chicken_code} · {c.breed_name}
                            </div>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {!loading && search.length >= 1 && candidates.length === 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Không tìm thấy gà nào</p>
                )}
              </div>
            )}
          </>
        )}

        {scanHint && (
          <div className="mt-3 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 p-2 rounded text-sm">
            {scanHint}
          </div>
        )}
      </section>

      {/* STEP 2: upload */}
      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Bước 2 · Chụp ảnh / Quay video
        </h2>
        {chicken ? (
          <MediaUploader chickenId={chicken.id} chickenCode={chicken.chicken_code} />
        ) : (
          <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
            Chọn gà ở bước 1 trước. Bạn cũng có thể chụp/quay trước rồi quay lại chọn gà sau —
            trình duyệt sẽ giữ file trong bộ nhớ tạm.
            <div className="mt-3">
              <Link
                href="/admin/quet-qr"
                className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
              >
                Hoặc vào Quét QR thường →
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
