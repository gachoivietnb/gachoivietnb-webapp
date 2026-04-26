'use client'

import { useEffect, useMemo, useState } from 'react'
import { type CashAccountBalance, formatVnd } from '@/lib/treasury/types'

type ReportKind = 'cash_book' | 'receipt_journal' | 'disbursement_journal'
type Format = 'excel' | 'pdf'

const REPORT_META: Record<
  ReportKind,
  { title: string; emoji: string; subtitle: string; bar: string; cls: string }
> = {
  cash_book: {
    title: 'Sổ quỹ tiền mặt',
    emoji: '📒',
    subtitle: 'Đầy đủ thu / chi / tồn theo dòng thời gian',
    bar: 'from-blue-500 to-indigo-600',
    cls: 'border-blue-300 dark:border-blue-700',
  },
  receipt_journal: {
    title: 'Nhật ký thu tiền',
    emoji: '💰',
    subtitle: 'Chỉ liệt kê các giao dịch thu',
    bar: 'from-emerald-500 to-teal-600',
    cls: 'border-emerald-300 dark:border-emerald-700',
  },
  disbursement_journal: {
    title: 'Nhật ký chi tiền',
    emoji: '🧾',
    subtitle: 'Chỉ liệt kê các giao dịch chi',
    bar: 'from-rose-500 to-red-600',
    cls: 'border-rose-300 dark:border-rose-700',
  },
}

const PRESETS = [
  { key: 'this_month', label: 'Tháng này' },
  { key: 'last_month', label: 'Tháng trước' },
  { key: 'this_quarter', label: 'Quý này' },
  { key: 'this_year', label: 'Năm nay' },
] as const

function computeRange(p: string): { from: string; to: string } {
  const today = new Date()
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  if (p === 'this_month') {
    return {
      from: fmt(new Date(today.getFullYear(), today.getMonth(), 1)),
      to: fmt(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
    }
  }
  if (p === 'last_month') {
    return {
      from: fmt(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
      to: fmt(new Date(today.getFullYear(), today.getMonth(), 0)),
    }
  }
  if (p === 'this_quarter') {
    const q = Math.floor(today.getMonth() / 3)
    return {
      from: fmt(new Date(today.getFullYear(), q * 3, 1)),
      to: fmt(today),
    }
  }
  if (p === 'this_year') {
    return {
      from: fmt(new Date(today.getFullYear(), 0, 1)),
      to: fmt(today),
    }
  }
  return { from: fmt(today), to: fmt(today) }
}

export function ExportTreasuryModal({
  open,
  onClose,
  accounts,
  defaultFrom,
  defaultTo,
}: {
  open: boolean
  onClose: () => void
  accounts: CashAccountBalance[]
  defaultFrom?: string
  defaultTo?: string
}) {
  const [kind, setKind] = useState<ReportKind>('cash_book')
  const [accountId, setAccountId] = useState<string>('')
  const [preset, setPreset] = useState<string>('this_month')
  const [from, setFrom] = useState<string>(defaultFrom ?? '')
  const [to, setTo] = useState<string>(defaultTo ?? '')
  const [downloading, setDownloading] = useState<Format | null>(null)

  useEffect(() => {
    if (open) {
      // Khởi tạo range theo preset hoặc default từ trang gọi
      if (defaultFrom && defaultTo) {
        setFrom(defaultFrom)
        setTo(defaultTo)
        setPreset('custom')
      } else {
        const r = computeRange('this_month')
        setFrom(r.from)
        setTo(r.to)
        setPreset('this_month')
      }
    }
  }, [open, defaultFrom, defaultTo])

  function applyPreset(p: string) {
    setPreset(p)
    const r = computeRange(p)
    setFrom(r.from)
    setTo(r.to)
  }

  const meta = REPORT_META[kind]

  const downloadUrl = useMemo(
    () => (format: Format) => {
      const params = new URLSearchParams({
        report: kind,
        format,
        from,
        to,
      })
      if (accountId) params.set('account_id', accountId)
      return `/api/treasury/export?${params.toString()}`
    },
    [kind, accountId, from, to]
  )

  async function handleDownload(format: Format) {
    setDownloading(format)
    try {
      const url = downloadUrl(format)
      // Tạo link ẩn để trigger download (giữ filename theo Content-Disposition)
      const a = document.createElement('a')
      a.href = url
      a.target = '_blank'
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } finally {
      setTimeout(() => setDownloading(null), 1200)
    }
  }

  if (!open) return null

  // Preview snippet
  const accLabel = accountId
    ? accounts.find((a) => a.account_id === accountId)?.name ?? '—'
    : 'Tất cả các quỹ'
  const totalBalance = accountId
    ? accounts.find((a) => a.account_id === accountId)?.current_balance ?? 0
    : accounts.reduce((s, a) => s + a.current_balance, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-0 md:p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-t-2xl md:rounded-2xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className={`px-5 py-4 bg-gradient-to-r ${meta.bar} text-white flex items-center justify-between`}>
          <div>
            <div className="text-xs uppercase tracking-wider opacity-80">Xuất báo cáo</div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span>{meta.emoji}</span> {meta.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-lg"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4">
          {/* Tab chọn loại báo cáo */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
              1. Chọn loại báo cáo
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(Object.keys(REPORT_META) as ReportKind[]).map((k) => {
                const m = REPORT_META[k]
                const active = kind === k
                return (
                  <button
                    key={k}
                    onClick={() => setKind(k)}
                    className={
                      'relative text-left bg-white dark:bg-gray-900 border-2 rounded-xl p-3 transition ' +
                      (active
                        ? `${m.cls} ring-2 ring-offset-2 dark:ring-offset-gray-800 ring-orange-300 shadow`
                        : 'border-gray-200 dark:border-gray-700 hover:border-orange-300')
                    }
                  >
                    <div className={`h-1 -mx-3 -mt-3 mb-2 rounded-t-xl bg-gradient-to-r ${m.bar}`} />
                    <div className="flex items-start gap-2 mb-1">
                      <span className="text-xl">{m.emoji}</span>
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-gray-900 dark:text-gray-100">
                          {m.title}
                        </div>
                      </div>
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">
                      {m.subtitle}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Filter */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">
                2. Tài khoản
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
              >
                <option value="">📚 Tất cả các quỹ</option>
                {accounts.map((a) => (
                  <option key={a.account_id} value={a.account_id}>
                    {a.icon} {a.name} ({formatVnd(a.current_balance)})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[10.5px] text-gray-500 dark:text-gray-400">
                Nếu chọn 1 quỹ → cột Tồn tính riêng cho quỹ đó
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">
                3. Khoảng thời gian
              </label>
              <div className="flex flex-wrap gap-1 mb-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => applyPreset(p.key)}
                    className={
                      'px-2 py-1 rounded text-[11px] font-semibold transition ' +
                      (preset === p.key
                        ? 'bg-orange-500 text-white shadow'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200')
                    }
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={from}
                  onChange={(e) => {
                    setFrom(e.target.value)
                    setPreset('custom')
                  }}
                  className="flex-1 px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs"
                />
                <span className="text-gray-400 dark:text-gray-500 text-xs">→</span>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => {
                    setTo(e.target.value)
                    setPreset('custom')
                  }}
                  className="flex-1 px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <div className="text-[10.5px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 font-semibold">
              Xem trước báo cáo
            </div>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="text-center mb-3">
                <div className={`inline-block text-xs px-2 py-0.5 rounded bg-gradient-to-r ${meta.bar} text-white font-semibold mb-2`}>
                  {meta.title.toUpperCase()}
                </div>
                <div className="text-[11px] text-gray-600 dark:text-gray-400">
                  Tài khoản: <b>{accLabel}</b>
                </div>
                <div className="text-[11px] text-gray-600 dark:text-gray-400">
                  Từ ngày <b>{from ? new Date(from).toLocaleDateString('vi-VN') : '—'}</b> đến ngày{' '}
                  <b>{to ? new Date(to).toLocaleDateString('vi-VN') : '—'}</b>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-gray-100 dark:border-gray-700">
                <div className="bg-amber-50 dark:bg-amber-950/30 rounded p-2">
                  <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold uppercase">
                    Số dư hiện tại
                  </div>
                  <div className="text-lg font-bold text-amber-700 dark:text-amber-300 tabular-nums">
                    {formatVnd(totalBalance)}
                  </div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-950/30 rounded p-2">
                  <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold uppercase">
                    Tiện ích
                  </div>
                  <div className="text-xs text-blue-700 dark:text-blue-300 leading-tight mt-1">
                    Có sẵn ô ký tên: Người lập, Kế toán trưởng, Giám đốc.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/50 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <div className="text-xs text-gray-600 dark:text-gray-400">
            File sẽ tải về máy. Có thể mở bằng Excel / Google Sheets / hoặc in ra giấy.
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleDownload('excel')}
              disabled={downloading !== null || !from || !to}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 py-2 text-sm font-semibold shadow disabled:opacity-50 flex items-center gap-1.5"
            >
              {downloading === 'excel' ? '⏳' : '📊'}
              <span>{downloading === 'excel' ? 'Đang tạo...' : 'Tải Excel (.xlsx)'}</span>
            </button>
            <button
              onClick={() => handleDownload('pdf')}
              disabled={downloading !== null || !from || !to}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-lg px-4 py-2 text-sm font-semibold shadow disabled:opacity-50 flex items-center gap-1.5"
            >
              {downloading === 'pdf' ? '⏳' : '📄'}
              <span>{downloading === 'pdf' ? 'Đang tạo...' : 'Tải PDF (.pdf)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
