'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

export function ExcelImportForm() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [result, setResult] = useState<{
    inserted?: number
    errors?: Array<{ row: number; error: string }>
    validCount?: number
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function downloadTemplate() {
    setDownloading(true)
    try {
      const r = await fetch('/api/chickens/import-template')
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'ho-so-ga-template.xlsx'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(false)
    }
  }

  async function handleUpload() {
    if (!file) return
    setLoading(true)
    setError(null)
    setResult(null)

    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/chickens/import-excel', {
      method: 'POST',
      body: fd,
    })
    const json = await res.json()

    if (!res.ok) {
      if (json.errors) {
        setResult(json)
      } else {
        setError(typeof json.error === 'string' ? json.error : JSON.stringify(json.error))
      }
      setLoading(false)
      return
    }

    setResult(json)
    setLoading(false)
    setTimeout(() => {
      if (json.inserted && json.inserted > 0) {
        router.push('/admin/ho-so-ga')
        router.refresh()
      }
    }, 3000)
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f && /\.(xlsx|xls)$/i.test(f.name)) {
      setFile(f)
      setError(null)
      setResult(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* STEP 1 — Download template */}
      <section className="relative overflow-hidden bg-white dark:bg-gray-800 ring-1 ring-blue-200 dark:ring-blue-900 rounded-2xl">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
        <div className="p-5">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xl shrink-0">
              1️⃣
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-0.5">
                Tải file mẫu (template) về máy
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                File Excel có sẵn đầu cột chuẩn + 3 dòng ví dụ + 1 sheet liệt kê mã giống — bạn điền vào rồi upload ngược lên ở bước 2.
              </p>
            </div>
          </div>
          <div className="bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-xl p-3 mb-3">
            <p className="text-xs font-semibold text-blue-800 dark:text-blue-200 mb-1.5">
              📋 9 cột trong template:
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {['Tên', 'Giống *', 'Giới tính', 'Ngày sinh', 'Nguồn', 'Cân nặng', 'Màu', 'Giá mua', 'Ghi chú'].map((h) => (
                <span key={h} className="text-[11px] font-semibold bg-white dark:bg-gray-900 text-blue-700 dark:text-blue-300 rounded-md px-2 py-1 border border-blue-200 dark:border-blue-900 text-center">
                  {h}
                </span>
              ))}
            </div>
            <p className="text-[10.5px] text-blue-700/80 dark:text-blue-300/80 mt-1.5 italic">
              * = bắt buộc · các cột khác để trống được
            </p>
          </div>
          <button
            onClick={downloadTemplate}
            disabled={downloading}
            className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl px-5 py-2.5 shadow hover:shadow-lg transition flex items-center justify-center gap-2"
          >
            {downloading ? '⏳ Đang tạo file...' : '📥 Tải template Excel về máy'}
          </button>
        </div>
      </section>

      {/* STEP 2 — Upload */}
      <section className="relative overflow-hidden bg-white dark:bg-gray-800 ring-1 ring-emerald-200 dark:ring-emerald-900 rounded-2xl">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
        <div className="p-5">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl shrink-0">
              2️⃣
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-0.5">
                Upload file Excel đã điền
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Kéo thả file vào ô bên dưới, hoặc bấm để chọn từ máy. Hệ thống đọc + validate + báo lỗi từng dòng nếu có.
              </p>
            </div>
          </div>

          {/* Drop zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={
              'relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition ' +
              (dragOver
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                : file
                  ? 'border-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-emerald-400 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10')
            }
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null)
                setError(null)
                setResult(null)
              }}
              className="hidden"
            />
            {file ? (
              <div>
                <div className="text-5xl mb-2">✅</div>
                <div className="text-sm font-bold text-emerald-900 dark:text-emerald-200 break-all">
                  {file.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {(file.size / 1024).toFixed(1)} KB · Sẵn sàng upload
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setFile(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                  className="mt-3 text-xs text-rose-600 hover:underline"
                >
                  ✕ Chọn file khác
                </button>
              </div>
            ) : (
              <div>
                <div className="text-5xl mb-2 opacity-60">📤</div>
                <div className="text-sm font-bold text-gray-700 dark:text-gray-300">
                  Kéo file Excel vào đây
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  hoặc bấm để chọn — chấp nhận .xlsx / .xls
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-800 dark:text-rose-300 rounded-lg p-3 text-sm">
              ❌ {error}
            </div>
          )}

          {result?.inserted != null && (
            <div className="mt-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-900 dark:text-emerald-200 rounded-lg p-3 text-sm font-semibold">
              ✅ Đã import thành công <strong className="text-base">{result.inserted}</strong> con gà. Đang chuyển về danh sách...
            </div>
          )}

          {result?.errors && result.errors.length > 0 && (
            <div className="mt-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 text-amber-900 dark:text-amber-200 rounded-lg p-3 text-sm">
              <div className="font-bold mb-2">
                ⚠️ Có {result.errors.length} dòng lỗi · {result.validCount ?? 0} dòng hợp lệ chưa được import
              </div>
              <ul className="text-xs space-y-0.5 max-h-60 overflow-y-auto bg-white/60 dark:bg-gray-900/30 rounded p-2 mb-2">
                {result.errors.map((er, i) => (
                  <li key={i}><b>Dòng {er.row}:</b> {er.error}</li>
                ))}
              </ul>
              <p className="text-xs text-amber-800 dark:text-amber-300">
                💡 Sửa các dòng lỗi trong file Excel rồi upload lại — chỉ những dòng đúng mới được tạo.
              </p>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className="w-full mt-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl px-5 py-2.5 shadow hover:shadow-lg transition flex items-center justify-center gap-2"
          >
            {loading ? '⏳ Đang import...' : '🚀 Bắt đầu import'}
          </button>
        </div>
      </section>

      {/* Tips */}
      <section className="bg-violet-50/50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-900 rounded-xl p-4">
        <h3 className="text-sm font-bold text-violet-900 dark:text-violet-200 mb-2 flex items-center gap-1.5">
          💡 Mẹo import nhanh
        </h3>
        <ul className="text-xs text-violet-800 dark:text-violet-300 space-y-1 list-disc pl-5">
          <li>Đầu mỗi đợt nhập gà → tải template về điền + upload luôn (không cần gõ lại schema)</li>
          <li>Cột "Giống" chỉ chấp nhận mã viết hoa: <code className="bg-white/60 px-1 rounded text-[11px]">ASIL · NOI · MA_LAI · TRE · PEDIGREE · ...</code></li>
          <li>Sheet 2 trong template liệt kê đầy đủ mã giống của trại bạn</li>
          <li>Hệ thống tự sinh <code>chicken_code</code> (GAxxxx) — bạn không cần điền</li>
          <li>QR tag + chuồng tự gán sau khi import — vào hồ sơ từng con để gắn</li>
        </ul>
      </section>
    </div>
  )
}
