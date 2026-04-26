'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function ExcelImportForm() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    inserted?: number
    errors?: Array<{ row: number; error: string }>
    validCount?: number
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

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

  return (
    <div className="max-w-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4">
      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
      />

      {file && (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Đã chọn: <strong>{file.name}</strong> ({Math.round(file.size / 1024)} KB)
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 text-red-800 dark:text-red-300 rounded p-3 text-sm">{error}</div>
      )}

      {result?.inserted != null && (
        <div className="bg-green-50 dark:bg-green-950/40 border border-green-200 text-green-800 dark:text-green-300 rounded p-3 text-sm">
          ✅ Đã import thành công <strong>{result.inserted}</strong> con gà. Redirect về danh sách trong 3s...
        </div>
      )}

      {result?.errors && result.errors.length > 0 && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 text-red-800 dark:text-red-300 rounded p-3 text-sm">
          <div className="font-medium mb-2">
            ❌ Có {result.errors.length} lỗi (đã bỏ qua import, {result.validCount ?? 0} dòng hợp lệ còn lại):
          </div>
          <ul className="list-disc list-inside text-xs space-y-0.5 max-h-60 overflow-y-auto">
            {result.errors.map((er, i) => (
              <li key={i}>Dòng {er.row}: {er.error}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs">Sửa file Excel rồi upload lại.</p>
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={!file || loading}
        className="bg-blue-600 text-white rounded px-4 py-2 font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Đang import...' : 'Upload & Import'}
      </button>
    </div>
  )
}
