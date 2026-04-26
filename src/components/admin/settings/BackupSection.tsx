'use client'

import { useState } from 'react'

export function BackupSection() {
  const [downloading, setDownloading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function download() {
    setDownloading(true)
    setMsg(null)
    try {
      const res = await fetch('/api/admin/backup-all')
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: 'Lỗi backup' }))
        setMsg(`❌ ${j.error ?? 'Lỗi backup'}`)
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const cd = res.headers.get('Content-Disposition') ?? ''
      const match = cd.match(/filename="([^"]+)"/)
      a.download = match?.[1] ?? `backup-${new Date().toISOString().slice(0, 10)}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setMsg(`✓ Đã tải file backup (${(blob.size / 1024 / 1024).toFixed(2)} MB)`)
    } catch (e) {
      setMsg(`❌ ${e instanceof Error ? e.message : 'Lỗi không rõ'}`)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded text-sm text-blue-900 dark:text-blue-100">
        <p className="font-medium">📦 Backup toàn bộ dữ liệu ra Excel</p>
        <p className="mt-2 text-blue-800 dark:text-blue-200">
          File chứa tất cả bảng: hồ sơ gà, gia phả, mua bán, chi phí, khách hàng, tiêm phòng, vần gà, sinh sản, nhân sự, nhật ký... Mỗi bảng một sheet riêng.
        </p>
      </div>

      <button
        onClick={download}
        disabled={downloading}
        className="bg-blue-600 text-white rounded px-5 py-2 font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {downloading ? '⏳ Đang tạo file...' : '📥 Tải backup Excel'}
      </button>

      {msg && <div className="text-sm text-gray-700 dark:text-gray-300">{msg}</div>}

      <p className="text-xs text-gray-500 dark:text-gray-400">
        💡 Với trang trại 5000 con, file backup có thể 20-100 MB. Nên backup cuối tuần.
      </p>
    </div>
  )
}
