'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import QRCode from 'qrcode'
import type { CardContent, CardLayout, CardSpec } from '@/lib/qr/card-spec'
import { layoutCard, qrErrorCorrection } from '@/lib/qr/card-spec'

type Stats = {
  unused: number
  used: number
  broken: number
  total: number
  lastTagNumber: number
}

const PRESETS = [
  { label: '1 trang', count: 36 },
  { label: '2 trang', count: 72 },
  { label: '5 trang', count: 180 },
  { label: '10 trang', count: 360 },
  { label: '20 trang', count: 720 },
]

const SIZE_PRESETS = [
  { label: '🐤 Nhỏ', w: 30, h: 18, hint: 'Gà mới nở · ít chữ' },
  { label: '🐔 Vừa (mặc định)', w: 45, h: 28, hint: 'Phù hợp đa số' },
  { label: '🐓 Lớn', w: 60, h: 35, hint: 'Dễ quét · gà lớn' },
  { label: '📛 Vuông', w: 30, h: 30, hint: 'In khắc laser' },
]

export function GenerateQrForm({ stats }: { stats: Stats }) {
  const suggestedFrom = stats.lastTagNumber + 1 || 1
  const [from, setFrom] = useState(suggestedFrom)
  const [to, setTo] = useState(suggestedFrom + 35)
  const [cardW, setCardW] = useState(45)
  const [cardH, setCardH] = useState(28)
  const [padding, setPadding] = useState(1.5)
  const [content, setContent] = useState<CardContent>('qr_and_number')
  const [layout, setLayout] = useState<CardLayout>('side')
  const [showFarmName, setShowFarmName] = useState(true)
  const [showWebsite, setShowWebsite] = useState(true)
  const [farmName, setFarmName] = useState('GA CHOI VIET NB')
  const [baseUrl, setBaseUrl] = useState('https://gachoivietnb.com')
  const [loading, setLoading] = useState<'pdf_sheet' | 'pdf_labels' | 'svg_sheet' | 'svg_labels' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const count = Math.max(0, to - from + 1)
  const overLimit = count > 2000
  const tooFew = count < 1
  const overlapsExisting = stats.lastTagNumber > 0 && from <= stats.lastTagNumber

  const spec: CardSpec = useMemo(
    () => ({
      from,
      to,
      cardW,
      cardH,
      padding,
      content,
      layout,
      showFarmName,
      showWebsite,
      farmName,
      baseUrl,
    }),
    [from, to, cardW, cardH, padding, content, layout, showFarmName, showWebsite, farmName, baseUrl]
  )

  const previewLayout = useMemo(() => layoutCard(spec), [spec])

  // Estimate cards/page for sheet PDF
  const sheet = useMemo(() => {
    const pageW = 210
    const pageH = 297
    const marginX = 8
    const marginY = 8
    const gap = 2
    const cols = Math.max(1, Math.floor((pageW - 2 * marginX + gap) / (cardW + gap)))
    const rows = Math.max(1, Math.floor((pageH - 2 * marginY + gap) / (cardH + gap)))
    const perPage = cols * rows
    const pages = Math.ceil(count / Math.max(1, perPage))
    return { cols, rows, perPage, pages }
  }, [cardW, cardH, count])

  // QR readability warning: based on QR size in mm
  const qrMm = previewLayout.qr?.size ?? 0
  const isCenterMode = content === 'qr_with_number_center'
  // Center-overlay needs ~10mm minimum vs ~8mm for normal (overlay reduces readable area)
  const qrMinSafe = isCenterMode ? 10 : 8
  const qrMinGood = isCenterMode ? 14 : 12
  const qrWarning =
    content === 'number_only'
      ? null
      : qrMm < qrMinSafe
        ? `QR < ${qrMinSafe}mm — nhiều máy đọc khó${isCenterMode ? ' (chế độ "số ở giữa" cần lớn hơn)' : ''}. Tăng kích thước thẻ.`
        : qrMm < qrMinGood
          ? `QR ~ ${qrMinSafe}–${qrMinGood}mm — đọc được nhưng cần camera lấy nét tốt.`
          : null

  function applyPreset(presetCount: number) {
    setTo(from + presetCount - 1)
  }
  function suggestNext() {
    const next = stats.lastTagNumber + 1 || 1
    setFrom(next)
    setTo(next + 35)
  }
  function applySizePreset(p: (typeof SIZE_PRESETS)[number]) {
    setCardW(p.w)
    setCardH(p.h)
  }

  async function handleGenerate(
    endpoint: 'generate-pdf' | 'generate-svg',
    format: 'sheet' | 'labels',
    extension: string
  ) {
    const key = `${endpoint === 'generate-pdf' ? 'pdf' : 'svg'}_${format}` as typeof loading
    setLoading(key)
    setError(null)
    setDone(null)
    try {
      const res = await fetch(`/api/qr-tags/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...spec, format }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({ error: 'Lỗi không rõ' }))
        setError(json.error || 'Lỗi tạo file')
        setLoading(null)
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `qr-tags-${String(from).padStart(4, '0')}-${String(to).padStart(4, '0')}-${format}.${extension}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setDone(`✓ Đã tải ${count} thẻ (${(blob.size / 1024).toFixed(0)} KB · ${extension.toUpperCase()})`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi không rõ')
    }
    setLoading(null)
  }

  return (
    <div className="space-y-4">
      <KpiRow stats={stats} />

      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50 dark:from-blue-950/40 dark:via-indigo-950/40 dark:to-violet-950/40 border border-blue-200 dark:border-blue-900 rounded-xl p-4">
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-blue-300/30 blur-3xl" />
        <div className="absolute -left-10 -bottom-10 w-40 h-40 rounded-full bg-violet-300/30 blur-3xl" />
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-3">
          <Step n={1} title="Chọn dải số" desc="Tự động gợi ý tiếp theo dải đã có" />
          <Step n={2} title="Tuỳ biến thẻ" desc="Kích thước · viền · nội dung — preview trực tiếp" />
          <Step n={3} title="Xuất PDF / SVG" desc="PDF in giấy · SVG vector cho dịch vụ khắc laser" />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-4">
        <div className="space-y-4">
          <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500" />
            <div className="p-5 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                🔢 Dải số
              </h2>

              <div className="grid grid-cols-2 gap-3">
                <NumberField
                  label="Số bắt đầu"
                  value={from}
                  min={1}
                  max={9999}
                  onChange={(v) => {
                    setFrom(v)
                    if (to < v) setTo(v + 35)
                  }}
                  badge={String(from).padStart(4, '0')}
                />
                <NumberField
                  label="Số kết thúc"
                  value={to}
                  min={from}
                  max={9999}
                  onChange={setTo}
                  badge={String(to).padStart(4, '0')}
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={suggestNext}
                  className="inline-flex items-center gap-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-full px-3 py-1.5 text-xs font-semibold shadow hover:shadow-md transition"
                >
                  ✨ Tiếp theo {stats.lastTagNumber || 0}
                </button>
                {PRESETS.map((p) => {
                  const active = count === p.count
                  return (
                    <button
                      key={p.label}
                      onClick={() => applyPreset(p.count)}
                      className={
                        'px-3 py-1.5 rounded-full text-xs font-medium border transition ' +
                        (active
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-transparent shadow'
                          : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-400')
                      }
                    >
                      {p.label} <span className="opacity-70">({p.count})</span>
                    </button>
                  )
                })}
              </div>

              {overlapsExisting && !tooFew && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-3 text-xs text-amber-800 dark:text-amber-300">
                  ⚠️ Số bắt đầu <strong>{from}</strong> ≤ tag mới nhất ({stats.lastTagNumber}) — hệ thống sẽ bỏ qua tag đã tồn tại.
                </div>
              )}
            </div>
          </section>

          <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-violet-500 to-purple-500" />
            <div className="p-5 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                📐 Kích thước thẻ
              </h2>

              <div className="flex flex-wrap gap-1.5">
                {SIZE_PRESETS.map((p) => {
                  const active = cardW === p.w && cardH === p.h
                  return (
                    <button
                      key={p.label}
                      onClick={() => applySizePreset(p)}
                      title={p.hint}
                      className={
                        'px-3 py-1.5 rounded-full text-xs font-medium border transition ' +
                        (active
                          ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white border-transparent shadow'
                          : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-violet-400')
                      }
                    >
                      {p.label} <span className="opacity-70">{p.w}×{p.h}mm</span>
                    </button>
                  )
                })}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <SliderField
                  label="Chiều rộng"
                  unit="mm"
                  value={cardW}
                  min={10}
                  max={120}
                  step={0.5}
                  onChange={setCardW}
                />
                <SliderField
                  label="Chiều cao"
                  unit="mm"
                  value={cardH}
                  min={10}
                  max={120}
                  step={0.5}
                  onChange={setCardH}
                />
                <SliderField
                  label="Viền an toàn"
                  unit="mm"
                  value={padding}
                  min={0}
                  max={Math.min(cardW, cardH) / 4}
                  step={0.1}
                  onChange={setPadding}
                />
              </div>

              <div className="text-[11px] text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/40 rounded px-3 py-2">
                Diện tích nội dung: <strong>{(cardW - 2 * padding).toFixed(1)} × {(cardH - 2 * padding).toFixed(1)} mm</strong>
                {' · '}
                A4 chứa được <strong>{sheet.cols} × {sheet.rows} = {sheet.perPage}</strong> thẻ/trang
                {' → '}
                <strong>{sheet.pages}</strong> trang cho {count} thẻ.
              </div>
            </div>
          </section>

          <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-amber-500 to-orange-500" />
            <div className="p-5 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                🎨 Nội dung trên thẻ
              </h2>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                {(
                  [
                    { v: 'qr_and_number', label: '📱 QR + Số', desc: 'Mặc định · 2 vùng riêng' },
                    {
                      v: 'qr_with_number_center',
                      label: '🎯 Số trong QR',
                      desc: 'Tiết kiệm tối đa · QR ổn EC-H',
                    },
                    { v: 'qr_only', label: '🔳 Chỉ QR', desc: 'Tối giản' },
                    { v: 'number_only', label: '🔢 Chỉ Số', desc: 'Đọc bằng mắt' },
                  ] as const
                ).map((c) => {
                  const active = content === c.v
                  const featured = c.v === 'qr_with_number_center'
                  return (
                    <button
                      key={c.v}
                      onClick={() => setContent(c.v)}
                      className={
                        'rounded-lg border-2 p-3 text-left transition ' +
                        (active
                          ? featured
                            ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/30 ring-2 ring-violet-200 dark:ring-violet-900'
                            : 'border-amber-500 bg-amber-50 dark:bg-amber-950/30'
                          : 'border-gray-200 dark:border-gray-700 hover:border-amber-400')
                      }
                    >
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {c.label}
                        </span>
                        {featured && (
                          <span className="text-[9px] bg-violet-600 text-white rounded px-1 py-0.5 font-bold">
                            ✨ NHỎ NHẤT
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                        {c.desc}
                      </div>
                    </button>
                  )
                })}
              </div>

              {content === 'qr_and_number' && (
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { v: 'side', label: '↔️ QR trái · Số phải' },
                      { v: 'stacked', label: '⬇️ QR trên · Số dưới' },
                    ] as const
                  ).map((l) => {
                    const active = layout === l.v
                    return (
                      <button
                        key={l.v}
                        onClick={() => setLayout(l.v)}
                        className={
                          'rounded-lg border p-2 text-sm font-medium transition ' +
                          (active
                            ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300'
                            : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-amber-400')
                        }
                      >
                        {l.label}
                      </button>
                    )
                  })}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={showFarmName}
                    onChange={(e) => setShowFarmName(e.target.checked)}
                    className="w-4 h-4"
                  />
                  Hiển thị tên trại (đầu thẻ)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={showWebsite}
                    onChange={(e) => setShowWebsite(e.target.checked)}
                    className="w-4 h-4"
                  />
                  Hiển thị website (cuối thẻ)
                </label>
                <label className="block">
                  <span className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                    Tên trại in trên thẻ
                  </span>
                  <input
                    value={farmName}
                    onChange={(e) => setFarmName(e.target.value)}
                    maxLength={32}
                    className="w-full text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-1.5"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                    Base URL (QR sẽ trỏ tới)
                  </span>
                  <input
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="https://gachoivietnb.com"
                    className="w-full text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-1.5 font-mono"
                  />
                </label>
              </div>

              {qrWarning && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-3 text-xs text-amber-800 dark:text-amber-300">
                  ⚠️ {qrWarning} (QR hiện tại ~{qrMm.toFixed(1)}mm)
                </div>
              )}
            </div>
          </section>

          <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <div className="p-5 space-y-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                📥 Xuất file
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Chọn định dạng phù hợp với mục đích sử dụng:
              </p>

              {error && (
                <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 rounded-lg p-3 text-sm">
                  ✗ {error}
                </div>
              )}
              {done && (
                <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 rounded-lg p-3 text-sm">
                  {done}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <ExportBtn
                  title="📄 PDF · Trang A4"
                  desc={`${sheet.perPage} thẻ/trang · in tại nhà`}
                  loading={loading === 'pdf_sheet'}
                  disabled={tooFew || overLimit}
                  onClick={() => handleGenerate('generate-pdf', 'sheet', 'pdf')}
                  tone="from-blue-500 to-indigo-500"
                />
                <ExportBtn
                  title="🏷 PDF · 1 thẻ/trang"
                  desc="Đúng kích thước · gửi máy in nhãn"
                  loading={loading === 'pdf_labels'}
                  disabled={tooFew || overLimit}
                  onClick={() => handleGenerate('generate-pdf', 'labels', 'pdf')}
                  tone="from-amber-500 to-orange-500"
                />
                <ExportBtn
                  title="🎨 SVG · Sheet (vector)"
                  desc="Cho dịch vụ khắc laser / cắt CNC"
                  loading={loading === 'svg_sheet'}
                  disabled={tooFew || overLimit}
                  onClick={() => handleGenerate('generate-svg', 'sheet', 'svg')}
                  tone="from-violet-500 to-purple-500"
                />
                <ExportBtn
                  title="🪪 SVG · Strip nhãn (vector)"
                  desc="Cho plotter / cắt label cuộn"
                  loading={loading === 'svg_labels'}
                  disabled={tooFew || overLimit}
                  onClick={() => handleGenerate('generate-svg', 'labels', 'svg')}
                  tone="from-emerald-500 to-teal-500"
                />
              </div>

              {(overLimit || tooFew) && (
                <p className="text-xs text-rose-600 dark:text-rose-400">
                  {overLimit ? 'Giới hạn 2000 thẻ/lần — chia nhỏ' : 'Khoảng số không hợp lệ'}
                </p>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden sticky top-4">
            <div className="h-1.5 bg-gradient-to-r from-cyan-500 to-blue-500" />
            <div className="p-4">
              <div className="flex items-baseline justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  👁 Preview · 🖱 kéo góc/cạnh để resize
                </h3>
                <span className="text-[10.5px] text-gray-500 dark:text-gray-400 font-mono tabular-nums">
                  {cardW.toFixed(1)} × {cardH.toFixed(1)} mm
                </span>
              </div>
              <CardPreview
                spec={spec}
                sampleNumber={from}
                onResize={(w, h) => {
                  setCardW(w)
                  setCardH(h)
                }}
              />

              <div className="mt-3 space-y-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                <RowKv k="QR size" v={qrMm > 0 ? `${qrMm.toFixed(1)} mm` : '—'} />
                <RowKv
                  k="Chữ số"
                  v={previewLayout.num ? `${previewLayout.num.h.toFixed(1)} mm cao` : '—'}
                />
                <RowKv k="Diện tích in" v={`${(cardW * cardH).toFixed(1)} mm²`} />
                <RowKv k="Trên A4" v={`${sheet.cols}×${sheet.rows} = ${sheet.perPage}/trang`} />
              </div>
            </div>
          </section>

          <section className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-2 flex items-center gap-1.5">
              <span>📌</span> Tip in & gửi dịch vụ
            </h3>
            <ul className="text-xs text-amber-800 dark:text-amber-200 space-y-1.5 list-disc list-inside leading-relaxed">
              <li>
                <strong>Số trong QR</strong> dùng EC-H 30% — chịu được số ở giữa, tiết kiệm
                ~40% diện tích thẻ
              </li>
              <li>QR &lt; 8mm → camera khó đọc · ưu tiên ≥ 12mm (≥14mm cho mode "số ở giữa")</li>
              <li>🖱 Kéo góc preview để resize trực quan thay vì chỉnh slider</li>
              <li>Decal chống nước cho ngoài trời · A4 cho trong nhà</li>
              <li>Khi gửi xưởng khắc laser → dùng SVG (vector, sắc nét)</li>
              <li>In đúng size → tắt &quot;Fit to page&quot; / chọn &quot;Actual size&quot;</li>
              <li>Test in 2-3 thẻ trước rồi mới in cả lô</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  )
}

function RowKv({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span>{k}</span>
      <span className="font-mono text-gray-700 dark:text-gray-300 tabular-nums">{v}</span>
    </div>
  )
}

function ExportBtn({
  title,
  desc,
  loading,
  disabled,
  onClick,
  tone,
}: {
  title: string
  desc: string
  loading: boolean
  disabled: boolean
  onClick: () => void
  tone: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className={
        'group text-left rounded-xl p-3 border-2 border-transparent bg-gradient-to-br ' +
        tone +
        ' text-white shadow hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition'
      }
    >
      <div className="text-sm font-semibold flex items-center gap-1.5">
        {loading ? '⏳' : null} {title}
      </div>
      <div className="text-[11px] opacity-90 mt-0.5">{desc}</div>
    </button>
  )
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
  badge,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
  badge?: string
}) {
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</span>
        {badge && (
          <span className="text-[10.5px] font-mono bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded">
            #{badge}
          </span>
        )}
      </div>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || min)}
        className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-base font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </label>
  )
}

function SliderField({
  label,
  unit,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  unit: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <span className="text-xs font-mono tabular-nums text-violet-700 dark:text-violet-300">
          {value.toFixed(step < 1 ? 1 : 0)} {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-violet-500"
      />
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || min)}
        className="w-full mt-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-2 py-1 text-sm tabular-nums"
      />
    </label>
  )
}

type DragHandle = 'se' | 'sw' | 'ne' | 'nw' | 'e' | 'w' | 's' | 'n'
const MIN_DIM_MM = 10
const MAX_DIM_MM = 120

function CardPreview({
  spec,
  sampleNumber,
  onResize,
}: {
  spec: CardSpec
  sampleNumber: number
  onResize?: (cardW: number, cardH: number) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const [qrSrc, setQrSrc] = useState<string>('')
  const [pxPerMm, setPxPerMm] = useState(6)
  const [drag, setDrag] = useState<{
    handle: DragHandle
    startX: number
    startY: number
    startW: number
    startH: number
  } | null>(null)

  const tag = String(sampleNumber).padStart(4, '0')
  const url = `${spec.baseUrl}/ga/${tag}`
  const ec = qrErrorCorrection(spec)

  useEffect(() => {
    let cancelled = false
    QRCode.toDataURL(url, { width: 320, margin: 0, errorCorrectionLevel: ec }).then((d) => {
      if (!cancelled) setQrSrc(d)
    })
    return () => {
      cancelled = true
    }
  }, [url, ec])

  const layout = useMemo(() => layoutCard(spec), [spec])

  // Auto-fit pxPerMm into stage container width
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    function recalc() {
      const stage = stageRef.current
      if (!stage) return
      const padding = 80 // leave room for handles + side
      const availW = stage.clientWidth - padding
      const availH = 360 // fixed-ish height of stage
      const fitW = availW / spec.cardW
      const fitH = availH / spec.cardH
      const next = Math.max(2, Math.min(8, Math.min(fitW, fitH)))
      setPxPerMm(next)
    }
    recalc()
    const ro = new ResizeObserver(recalc)
    ro.observe(stage)
    return () => ro.disconnect()
  }, [spec.cardW, spec.cardH])

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const w = spec.cardW * pxPerMm
    const h = spec.cardH * pxPerMm
    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, w, h)

    ctx.fillStyle = '#ffffff'
    roundRect(ctx, 0, 0, w, h, 1.2 * pxPerMm)
    ctx.fill()
    ctx.lineWidth = 0.4
    ctx.strokeStyle = '#bdbdbd'
    ctx.stroke()

    if (layout.farmText) {
      const fontSize = clamp(layout.farmText.w * 0.6, 4, 9) * pxPerMm
      ctx.font = `bold ${fontSize}px Helvetica, Arial`
      ctx.fillStyle = '#3c3c3c'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'alphabetic'
      ctx.fillText(
        spec.farmName,
        (layout.farmText.x + layout.farmText.w / 2) * pxPerMm,
        layout.farmText.y * pxPerMm
      )
    }

    const drawNum = () => {
      if (!layout.num) return
      // Overlay rect on top of QR (white box masking center)
      if (layout.num.overlay) {
        const r = Math.min(0.6, layout.num.h * 0.2) * pxPerMm
        const ox = layout.num.x * pxPerMm
        const oy = layout.num.y * pxPerMm
        const ow = layout.num.w * pxPerMm
        const oh = layout.num.h * pxPerMm
        ctx.fillStyle = '#ffffff'
        roundRect(ctx, ox, oy, ow, oh, r)
        ctx.fill()
        ctx.lineWidth = 0.5
        ctx.strokeStyle = '#141414'
        ctx.stroke()
      }
      const widthFactor = layout.num.overlay ? 0.85 : 0.95
      const heightFactor = layout.num.overlay ? 2.4 : 1.8
      let fs = clamp(layout.num.h * heightFactor, 6, 80)
      ctx.font = `bold ${fs * pxPerMm}px Helvetica, Arial`
      let textW = ctx.measureText(tag).width / pxPerMm
      while (textW > layout.num.w * widthFactor && fs > 6) {
        fs -= 1
        ctx.font = `bold ${fs * pxPerMm}px Helvetica, Arial`
        textW = ctx.measureText(tag).width / pxPerMm
      }
      ctx.fillStyle = '#141414'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(
        tag,
        (layout.num.x + layout.num.w / 2) * pxPerMm,
        (layout.num.y + layout.num.h / 2) * pxPerMm
      )
    }

    if (layout.qr && qrSrc) {
      const img = new Image()
      img.onload = () => {
        if (!layout.qr) return
        ctx.drawImage(
          img,
          layout.qr.x * pxPerMm,
          layout.qr.y * pxPerMm,
          layout.qr.size * pxPerMm,
          layout.qr.size * pxPerMm
        )
        // Draw num AFTER QR loads so overlay sits on top
        drawNum()
        // Web text after num
        if (layout.webText) {
          const fs = clamp(layout.webText.w * 0.18, 3.5, 6) * pxPerMm
          ctx.font = `${fs}px Helvetica, Arial`
          ctx.fillStyle = '#8c8c8c'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'alphabetic'
          const host = spec.baseUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')
          ctx.fillText(
            host,
            (layout.webText.x + layout.webText.w / 2) * pxPerMm,
            layout.webText.y * pxPerMm
          )
        }
      }
      img.src = qrSrc
    } else {
      // No QR — still draw num & webtext
      drawNum()
      if (layout.webText) {
        const fs = clamp(layout.webText.w * 0.18, 3.5, 6) * pxPerMm
        ctx.font = `${fs}px Helvetica, Arial`
        ctx.fillStyle = '#8c8c8c'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'alphabetic'
        const host = spec.baseUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')
        ctx.fillText(
          host,
          (layout.webText.x + layout.webText.w / 2) * pxPerMm,
          layout.webText.y * pxPerMm
        )
      }
    }
  }, [spec, layout, qrSrc, pxPerMm, tag])

  // Drag-resize
  useEffect(() => {
    if (!drag || !onResize) return

    function onMove(e: MouseEvent) {
      if (!drag) return
      const dxPx = e.clientX - drag.startX
      const dyPx = e.clientY - drag.startY
      const dxMm = dxPx / pxPerMm
      const dyMm = dyPx / pxPerMm

      let newW = drag.startW
      let newH = drag.startH
      if (drag.handle.includes('e')) newW = drag.startW + dxMm
      if (drag.handle.includes('w')) newW = drag.startW - dxMm
      if (drag.handle.includes('s')) newH = drag.startH + dyMm
      if (drag.handle.includes('n')) newH = drag.startH - dyMm

      // Snap to 0.5mm
      newW = Math.round(newW * 2) / 2
      newH = Math.round(newH * 2) / 2

      newW = Math.max(MIN_DIM_MM, Math.min(MAX_DIM_MM, newW))
      newH = Math.max(MIN_DIM_MM, Math.min(MAX_DIM_MM, newH))

      onResize?.(newW, newH)
    }

    function onUp() {
      setDrag(null)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    document.body.style.userSelect = 'none'
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      document.body.style.userSelect = ''
    }
  }, [drag, pxPerMm, onResize])

  function startDrag(handle: DragHandle, e: React.MouseEvent) {
    e.preventDefault()
    setDrag({
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startW: spec.cardW,
      startH: spec.cardH,
    })
  }

  const cardWPx = spec.cardW * pxPerMm
  const cardHPx = spec.cardH * pxPerMm

  // Cursor mapping
  const cursorByHandle: Record<DragHandle, string> = {
    nw: 'nwse-resize',
    se: 'nwse-resize',
    ne: 'nesw-resize',
    sw: 'nesw-resize',
    e: 'ew-resize',
    w: 'ew-resize',
    n: 'ns-resize',
    s: 'ns-resize',
  }

  return (
    <div>
      <div
        ref={stageRef}
        className="relative bg-[repeating-conic-gradient(#f3f4f6_0%_25%,#fff_0%_50%)] dark:bg-[repeating-conic-gradient(#1f2937_0%_25%,#374151_0%_50%)] [background-size:12px_12px] rounded-lg p-10 flex items-center justify-center select-none"
        style={{ minHeight: 320 }}
      >
        <div
          className="relative shadow-md rounded"
          style={{ width: cardWPx, height: cardHPx }}
        >
          <canvas ref={canvasRef} className="block" />
          {/* Drag handles */}
          {onResize && (
            <>
              {(['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as DragHandle[]).map((h) => {
                const pos: React.CSSProperties = {}
                const isCorner = h.length === 2
                const size = isCorner ? 14 : 10
                pos.width = size
                pos.height = size
                if (h.includes('n')) pos.top = -size / 2
                if (h.includes('s')) pos.bottom = -size / 2
                if (h.includes('e')) pos.right = -size / 2
                if (h.includes('w')) pos.left = -size / 2
                if (h === 'n' || h === 's') {
                  pos.left = `calc(50% - ${size / 2}px)`
                }
                if (h === 'e' || h === 'w') {
                  pos.top = `calc(50% - ${size / 2}px)`
                }
                const active = drag?.handle === h
                return (
                  <div
                    key={h}
                    onMouseDown={(e) => startDrag(h, e)}
                    style={{
                      position: 'absolute',
                      ...pos,
                      cursor: cursorByHandle[h],
                      zIndex: 5,
                    }}
                    className={
                      'rounded-sm border-2 transition-all ' +
                      (active
                        ? 'bg-violet-600 border-violet-700 scale-125 shadow-lg'
                        : isCorner
                          ? 'bg-blue-500 border-white shadow hover:bg-violet-500 hover:scale-110'
                          : 'bg-blue-400 border-white shadow hover:bg-violet-400 hover:scale-110')
                    }
                    aria-label={`Resize handle ${h}`}
                  />
                )
              })}
            </>
          )}
          {/* Live dimension labels during drag */}
          {drag && (
            <>
              <div
                className="absolute pointer-events-none bg-violet-600 text-white text-[11px] px-2 py-0.5 rounded font-mono font-bold shadow-lg tabular-nums"
                style={{ left: '50%', top: -28, transform: 'translateX(-50%)' }}
              >
                ↔ {spec.cardW.toFixed(1)} mm
              </div>
              <div
                className="absolute pointer-events-none bg-violet-600 text-white text-[11px] px-2 py-0.5 rounded font-mono font-bold shadow-lg tabular-nums"
                style={{ right: -56, top: '50%', transform: 'translateY(-50%)' }}
              >
                ↕ {spec.cardH.toFixed(1)} mm
              </div>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 mt-2">
        <span>
          Mã mẫu <span className="font-mono font-semibold">#{tag}</span>
        </span>
        <span className="font-mono">
          Scale {pxPerMm.toFixed(1)}px/mm · EC {ec}
          {ec === 'H' && ' (tự động cho mode "số ở giữa")'}
        </span>
      </div>
      <div className="text-[10.5px] text-gray-500 dark:text-gray-400 mt-1 text-center">
        💡 Kéo 4 góc / 4 cạnh để resize. Snap 0.5mm. Min 10 · Max 120 mm.
      </div>
    </div>
  )
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

function KpiRow({ stats }: { stats: Stats }) {
  const total = Math.max(1, stats.total)
  const pUnused = Math.round((stats.unused / total) * 100)
  const pUsed = Math.round((stats.used / total) * 100)
  const pBroken = Math.round((stats.broken / total) * 100)
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Kpi
          label="Tổng đã tạo"
          value={stats.total.toLocaleString('vi-VN')}
          icon="🔳"
          tone="from-slate-500 to-slate-600"
          sub={
            stats.lastTagNumber
              ? `Tag mới nhất #${String(stats.lastTagNumber).padStart(4, '0')}`
              : 'Chưa có tag nào'
          }
        />
        <Kpi
          label="Chưa dùng"
          value={stats.unused.toLocaleString('vi-VN')}
          icon="🟢"
          tone="from-emerald-500 to-teal-500"
          sub={`${pUnused}% kho`}
          pulse={stats.unused > 0 && stats.unused < 50}
        />
        <Kpi
          label="Đang dùng"
          value={stats.used.toLocaleString('vi-VN')}
          icon="🔵"
          tone="from-blue-500 to-indigo-500"
          sub={`${pUsed}% kho`}
        />
        <Kpi
          label="Hỏng / Mất"
          value={stats.broken.toLocaleString('vi-VN')}
          icon="🔴"
          tone="from-rose-500 to-red-500"
          sub={`${pBroken}% kho`}
        />
      </div>
      {stats.total > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3">
          <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 mb-1.5">
            <span>Phân bổ thẻ</span>
            <span className="tabular-nums">
              {stats.unused} chưa · {stats.used} dùng · {stats.broken} hỏng
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-gray-100 dark:bg-gray-900/60 overflow-hidden flex">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
              style={{ width: `${pUnused}%` }}
            />
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all"
              style={{ width: `${pUsed}%` }}
            />
            <div
              className="h-full bg-gradient-to-r from-rose-500 to-red-500 transition-all"
              style={{ width: `${pBroken}%` }}
            />
          </div>
        </div>
      )}
    </>
  )
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-2.5 bg-white/60 dark:bg-gray-900/50 backdrop-blur-sm rounded-lg p-2.5 border border-white/40 dark:border-gray-700/40">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs font-bold flex items-center justify-center shadow">
        {n}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</div>
        <div className="text-[11px] text-gray-600 dark:text-gray-300 leading-snug">{desc}</div>
      </div>
    </div>
  )
}

function Kpi({
  label,
  value,
  icon,
  tone,
  sub,
  pulse,
}: {
  label: string
  value: string
  icon: string
  tone: string
  sub?: string
  pulse?: boolean
}) {
  return (
    <div className="relative overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3.5">
      <div
        className={`absolute -right-6 -top-6 w-20 h-20 rounded-full bg-gradient-to-br ${tone} opacity-15 blur-xl ${
          pulse ? 'animate-pulse' : ''
        }`}
      />
      <div className="relative">
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <span>{icon}</span>
          <span className="truncate">{label}</span>
        </div>
        <div className="mt-1 text-2xl font-bold tabular-nums text-gray-900 dark:text-gray-100">
          {value}
        </div>
        {sub && (
          <div className="text-[10.5px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
            {sub}
          </div>
        )}
      </div>
    </div>
  )
}
