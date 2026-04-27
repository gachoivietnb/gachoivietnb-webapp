'use client'

import { useState } from 'react'

export function PublicLinkActions({
  chickenId,
  tagNumber,
  chickenCode,
  isForSale,
}: {
  chickenId: string
  tagNumber: string | null
  chickenCode: string
  isForSale: boolean
}) {
  const [copied, setCopied] = useState(false)
  const slug = tagNumber || chickenId
  const path = `/ga/${slug}`

  // Build absolute URL
  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://gachoivietnb.com'
  const fullUrl = origin + path

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(fullUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for old browsers
      const ta = document.createElement('textarea')
      ta.value = fullUrl
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  function shareZalo() {
    const text = `🐓 Xem hồ sơ gà ${chickenCode} tại: ${fullUrl}`
    window.open(`https://zalo.me/share/url?url=${encodeURIComponent(fullUrl)}&title=${encodeURIComponent(text)}`, '_blank')
  }

  return (
    <div className="bg-gradient-to-br from-emerald-50 via-cyan-50 to-blue-50 dark:from-emerald-950/30 dark:via-cyan-950/30 dark:to-blue-950/30 border border-emerald-200 dark:border-emerald-900 rounded-xl p-3 mt-3">
      <div className="flex items-start gap-2 mb-2">
        <span className="text-xl">🌐</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
            Xem trang công khai của gà này
          </h3>
          <p className="text-[11px] text-gray-600 dark:text-gray-400">
            Đây là trang khách / người mua thấy khi quét QR hoặc tra cứu — kèm thành tích thi đấu, gia phả, ảnh.
            {!isForSale && (
              <span className="ml-1 text-amber-700 dark:text-amber-400">
                💡 Bật &quot;Đang bán&quot; trong sửa hồ sơ để gà xuất hiện trong marketplace.
              </span>
            )}
          </p>
          <code className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 block break-all font-mono">
            {fullUrl}
          </code>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <a
          href={path}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg px-3 py-2 text-xs font-bold shadow hover:opacity-95 transition"
        >
          👁 Xem trang public ↗
        </a>
        <button
          onClick={copyLink}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold border transition ${
            copied
              ? 'bg-emerald-500 text-white border-emerald-500'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-emerald-400'
          }`}
        >
          {copied ? '✓ Đã copy' : '📋 Copy link'}
        </button>
        <button
          onClick={shareZalo}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30"
        >
          💬 Chia sẻ Zalo
        </button>
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullUrl)}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold bg-white dark:bg-gray-800 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
        >
          📘 Chia sẻ Facebook
        </a>
      </div>
    </div>
  )
}
