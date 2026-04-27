'use client'

import { useState } from 'react'

type Format = 'print' | 'pdf' | 'excel' | 'xml'

const FORMATS: Array<{
  key: Format
  label: string
  emoji: string
  desc: string
  hint?: string
  tone: string
}> = [
  {
    key: 'print',
    label: 'In hóa đơn',
    emoji: '🖨',
    desc: 'Mở trang in (Ctrl+P để in giấy hoặc lưu PDF)',
    tone: 'from-blue-500 to-indigo-500',
  },
  {
    key: 'pdf',
    label: 'Tải PDF',
    emoji: '📄',
    desc: 'Mở bản HTML — chọn "Save as PDF" trong dialog in',
    hint: 'Trình duyệt sẽ xuất PDF qua chức năng in',
    tone: 'from-rose-500 to-pink-600',
  },
  {
    key: 'excel',
    label: 'Tải Excel',
    emoji: '📊',
    desc: 'File .xlsx mẫu HĐ chuẩn — có thể chỉnh sửa thêm',
    tone: 'from-emerald-500 to-green-600',
  },
  {
    key: 'xml',
    label: 'Tải XML (TT78)',
    emoji: '📋',
    desc: 'Định dạng XML chuẩn QĐ 1450/QĐ-TCT — nộp lên cổng GDT',
    hint: 'Chỉ HĐ đã phát hành mới có hiệu lực kê khai',
    tone: 'from-amber-500 to-orange-600',
  },
]

export function ExportPanel({
  invoiceId,
  status,
  onSaveDraft,
  compact = false,
}: {
  invoiceId?: string
  status?: string
  /** Khi đang ở form chưa lưu — gọi để save draft trước. Trả về id mới hoặc null. */
  onSaveDraft?: () => Promise<string | null>
  compact?: boolean
}) {
  const [busy, setBusy] = useState<Format | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isDraft = status === 'nhap' || !status
  const isCancelled = status === 'da_huy'

  async function handleExport(fmt: Format) {
    setError(null)
    let id = invoiceId

    if (!id && onSaveDraft) {
      setBusy(fmt)
      const saved = await onSaveDraft()
      setBusy(null)
      if (!saved) {
        setError('Không lưu được nháp — kiểm tra thông tin HĐ')
        return
      }
      id = saved
    }

    if (!id) {
      setError('Thiếu ID hóa đơn')
      return
    }

    if (fmt === 'print' || fmt === 'pdf') {
      window.open(`/api/invoices/${id}/pdf`, '_blank')
    } else if (fmt === 'excel') {
      window.location.href = `/api/invoices/${id}/excel`
    } else if (fmt === 'xml') {
      window.location.href = `/api/invoices/${id}/xml`
    }
  }

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {FORMATS.map((f) => (
          <button
            key={f.key}
            onClick={() => handleExport(f.key)}
            disabled={busy !== null}
            className={`text-xs px-2.5 py-1.5 rounded border ${
              isCancelled && f.key === 'xml'
                ? 'border-gray-200 dark:border-gray-700 text-gray-400 cursor-not-allowed'
                : 'border-gray-300 dark:border-gray-600 hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-gray-700 dark:text-gray-300'
            }`}
            title={f.desc}
          >
            {busy === f.key ? '⏳' : f.emoji} {f.label}
          </button>
        ))}
        {error && <div className="w-full text-xs text-red-600">{error}</div>}
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
          📤 In & Xuất hóa đơn
        </h3>
        {isDraft && (
          <span className="text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full font-semibold">
            HĐ NHÁP
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {FORMATS.map((f) => {
          const disabled = busy !== null || (isCancelled && f.key === 'xml')
          return (
            <button
              key={f.key}
              onClick={() => handleExport(f.key)}
              disabled={disabled}
              className={`text-left bg-gradient-to-br ${f.tone} text-white rounded-lg p-3 hover:opacity-95 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-sm`}
              title={f.desc}
            >
              <div className="text-xl mb-0.5">{busy === f.key ? '⏳' : f.emoji}</div>
              <div className="font-bold text-sm">{f.label}</div>
              <div className="text-[10px] opacity-90 leading-tight mt-0.5">{f.desc}</div>
            </button>
          )
        })}
      </div>

      {!invoiceId && onSaveDraft && (
        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2 italic">
          💡 Sẽ tự động lưu nháp trước khi xuất.
        </p>
      )}

      {isDraft && (
        <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-2">
          ⚠ Bản xuất từ HĐ <b>nháp</b> không có giá trị pháp lý — chỉ để xem trước / kiểm tra.
        </p>
      )}

      {isCancelled && (
        <p className="text-[11px] text-red-600 dark:text-red-400 mt-2">
          ❌ HĐ đã hủy — XML không xuất được (chỉ HĐ hợp lệ mới được kê khai).
        </p>
      )}

      {error && (
        <div className="mt-2 text-xs bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 rounded p-2">
          ⚠ {error}
        </div>
      )}
    </div>
  )
}
