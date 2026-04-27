'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ExportPanel } from './ExportPanel'

type Invoice = {
  id: string
  internal_no: string
  invoice_no: string | null
  invoice_form: string | null
  invoice_serial: string | null
  issue_date: string
  status: string
  cqt_status: string
  cqt_code: string | null
  cqt_lookup_code: string | null
  signed_at: string | null
  issued_at: string | null
  cancelled_at: string | null
  cancel_reason: string | null
  subtotal: number
  tax_amount: number
  total: number
  total_words: string
  payment_method: string
  notes: string | null
  buyer_email_sent_at: string | null
  buyer_name: string | null
  buyer_tax_code: string | null
  buyer_address: string | null
  buyer_email: string | null
  buyer_phone: string | null
  buyer_type: string | null
  provider_name: string | null
  seller_snapshot: { name?: string; tax_code?: string; address?: string } | null
  created_by_name: string | null
  created_at: string
}

type Item = {
  id: string
  sort_order: number
  description: string
  unit: string
  quantity: number
  unit_price: number
  discount_pct: number
  tax_rate: number
  tax_rate_label: string | null
  line_subtotal: number
  line_tax: number
  line_total: number
}

type Event = {
  id: string
  event_type: string
  actor_name: string | null
  message: string | null
  error_message: string | null
  created_at: string
}

const STATUS_BADGE: Record<string, { label: string; emoji: string; tone: string }> = {
  nhap: { label: 'Nháp', emoji: '📝', tone: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
  cho_phat_hanh: { label: 'Chờ phát hành', emoji: '⏳', tone: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  da_phat_hanh: { label: 'Đã phát hành', emoji: '✅', tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  da_huy: { label: 'Đã hủy', emoji: '❌', tone: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  dieu_chinh: { label: 'Điều chỉnh', emoji: '✏️', tone: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
  thay_the: { label: 'Thay thế', emoji: '🔁', tone: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
}

export function InvoiceDetailClient({
  invoice,
  items,
  events,
  canWrite,
  canDelete,
}: {
  invoice: Invoice
  items: Item[]
  events: Event[]
  canWrite: boolean
  canDelete: boolean
}) {
  const router = useRouter()
  const [showCancel, setShowCancel] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const status = STATUS_BADGE[invoice.status] || STATUS_BADGE.nhap
  const isDraft = invoice.status === 'nhap'
  const isIssued = invoice.status === 'da_phat_hanh'
  const isCancelled = invoice.status === 'da_huy'

  async function handleIssue() {
    if (!confirm('Phát hành HĐ điện tử? HĐ đã phát hành không thể sửa, chỉ có thể hủy hoặc điều chỉnh.')) return
    setBusy(true)
    setMsg(null)
    const res = await fetch(`/api/invoices/${invoice.id}/issue`, { method: 'POST' })
    const json = await res.json()
    if (!res.ok) {
      setMsg({ ok: false, text: json.error || 'Lỗi' })
      setBusy(false)
      return
    }
    setMsg({ ok: true, text: `✓ Đã phát hành — Số HĐ: ${json.invoice_no}, Mã CQT: ${json.cqt_code}` })
    setBusy(false)
    router.refresh()
  }

  async function handleCancel() {
    if (!cancelReason.trim()) {
      setMsg({ ok: false, text: 'Nhập lý do hủy' })
      return
    }
    setBusy(true)
    setMsg(null)
    const res = await fetch(`/api/invoices/${invoice.id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: cancelReason }),
    })
    const json = await res.json()
    if (!res.ok) {
      setMsg({ ok: false, text: typeof json.error === 'string' ? json.error : 'Lỗi hủy' })
      setBusy(false)
      return
    }
    setMsg({ ok: true, text: '✓ Đã hủy HĐ' })
    setShowCancel(false)
    setBusy(false)
    router.refresh()
  }

  async function handleSendEmail() {
    if (!confirm(`Gửi HĐ qua email tới ${invoice.buyer_email}?`)) return
    setBusy(true)
    setMsg(null)
    const res = await fetch(`/api/invoices/${invoice.id}/send-email`, { method: 'POST' })
    const json = await res.json()
    if (!res.ok) {
      setMsg({ ok: false, text: json.error || 'Lỗi gửi mail' })
      setBusy(false)
      return
    }
    setMsg({ ok: true, text: `✓ Đã gửi tới ${json.sent_to}` })
    setBusy(false)
    router.refresh()
  }

  async function handleDelete() {
    if (!confirm('Xoá HĐ nháp này? Thao tác không thể hoàn tác.')) return
    setBusy(true)
    const res = await fetch(`/api/invoices?id=${invoice.id}`, { method: 'DELETE' })
    if (!res.ok) {
      setMsg({ ok: false, text: 'Lỗi: ' + (await res.text()) })
      setBusy(false)
      return
    }
    router.push('/admin/hoa-don')
  }

  const formatVND = (n: number) => n.toLocaleString('vi-VN')
  const formatDate = (s: string | null) => {
    if (!s) return '—'
    if (s.length === 10) return s.split('-').reverse().join('/')
    return new Date(s).toLocaleString('vi-VN')
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        {/* Header card */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div>
              <div className="text-xs text-gray-500 mb-1">Số HĐ</div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-mono font-bold text-gray-900 dark:text-gray-100">
                  {invoice.invoice_no || invoice.internal_no}
                </h1>
                {invoice.invoice_serial && (
                  <span className="text-sm font-mono text-gray-500">
                    {invoice.invoice_form ? `M${invoice.invoice_form}/` : ''}
                    {invoice.invoice_serial}
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Số nội bộ: <span className="font-mono">{invoice.internal_no}</span>
                {invoice.invoice_no && invoice.invoice_no !== invoice.internal_no && (
                  <span> · NCC: {invoice.provider_name}</span>
                )}
              </div>
            </div>
            <span className={`text-sm px-3 py-1.5 rounded-lg font-semibold ${status.tone}`}>
              {status.emoji} {status.label}
            </span>
          </div>

          {invoice.cqt_code && (
            <div className="mt-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded p-2 text-xs">
              <span className="text-emerald-700 dark:text-emerald-300 font-semibold">✓ Mã CQT:</span>{' '}
              <span className="font-mono">{invoice.cqt_code}</span>
              {invoice.cqt_lookup_code && (
                <span className="ml-3">
                  <span className="text-emerald-700 dark:text-emerald-300">Mã tra cứu:</span>{' '}
                  <span className="font-mono">{invoice.cqt_lookup_code}</span>
                </span>
              )}
            </div>
          )}

          {isCancelled && invoice.cancel_reason && (
            <div className="mt-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded p-2 text-xs text-red-700 dark:text-red-300">
              <span className="font-semibold">❌ Lý do hủy:</span> {invoice.cancel_reason}{' '}
              <span className="text-gray-500">({formatDate(invoice.cancelled_at)})</span>
            </div>
          )}
        </div>

        {/* Bên bán + bên mua */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">🏪 Đơn vị bán</h3>
            <div className="font-semibold text-sm">{invoice.seller_snapshot?.name || '—'}</div>
            <div className="text-xs text-gray-500 font-mono mt-0.5">MST: {invoice.seller_snapshot?.tax_code || '—'}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{invoice.seller_snapshot?.address}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">👤 Người mua</h3>
            <div className="font-semibold text-sm">
              {invoice.buyer_type === 'doanh_nghiep' ? '🏢 ' : ''}
              {invoice.buyer_name || '—'}
            </div>
            {invoice.buyer_tax_code && (
              <div className="text-xs text-gray-500 font-mono mt-0.5">MST: {invoice.buyer_tax_code}</div>
            )}
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{invoice.buyer_address}</div>
            {invoice.buyer_email && (
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">📧 {invoice.buyer_email}</div>
            )}
            {invoice.buyer_email_sent_at && (
              <div className="text-[11px] text-emerald-600 mt-1">
                ✓ Đã gửi mail {formatDate(invoice.buyer_email_sent_at)}
              </div>
            )}
          </div>
        </div>

        {/* Items */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
            <h3 className="text-sm font-semibold">📦 Chi tiết hàng hóa</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-gray-500 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="text-left p-2 w-8">#</th>
                <th className="text-left p-2">Tên hàng</th>
                <th className="text-left p-2">ĐVT</th>
                <th className="text-right p-2">SL</th>
                <th className="text-right p-2">Đơn giá</th>
                <th className="text-right p-2">CK%</th>
                <th className="text-left p-2">Thuế</th>
                <th className="text-right p-2">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={it.id} className="border-t border-gray-100 dark:border-gray-700">
                  <td className="p-2 text-gray-500">{i + 1}</td>
                  <td className="p-2">{it.description}</td>
                  <td className="p-2">{it.unit}</td>
                  <td className="p-2 text-right font-mono">{Number(it.quantity)}</td>
                  <td className="p-2 text-right font-mono">{formatVND(Number(it.unit_price))}</td>
                  <td className="p-2 text-right">{Number(it.discount_pct)}%</td>
                  <td className="p-2 text-xs">{it.tax_rate_label || `${it.tax_rate}%`}</td>
                  <td className="p-2 text-right font-mono font-semibold">{formatVND(Number(it.line_total))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900 rounded-xl p-3">
            <div className="text-xs font-semibold text-yellow-800 dark:text-yellow-300 mb-1">📝 Ghi chú</div>
            <p className="text-sm text-yellow-900 dark:text-yellow-200">{invoice.notes}</p>
          </div>
        )}

        {/* Audit log */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3">📜 Nhật ký</h3>
          {events.length === 0 ? (
            <p className="text-xs text-gray-500">Chưa có sự kiện nào.</p>
          ) : (
            <ul className="space-y-2 text-xs">
              {events.map((e) => (
                <li key={e.id} className="flex gap-2">
                  <span className="text-gray-400 whitespace-nowrap">
                    {new Date(e.created_at).toLocaleString('vi-VN')}
                  </span>
                  <span className="font-mono text-gray-600 dark:text-gray-400">[{e.event_type}]</span>
                  <span className={e.error_message ? 'text-red-600' : 'text-gray-700 dark:text-gray-300'}>
                    {e.message || e.error_message || ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* SIDEBAR */}
      <div className="space-y-4">
        <div className="sticky top-4 space-y-4">
          {/* Tổng kết */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border-2 border-amber-200 dark:border-amber-900 rounded-xl p-4">
            <div className="text-xs text-gray-500 mb-1">Ngày phát hành</div>
            <div className="font-semibold mb-2">{formatDate(invoice.issue_date)}</div>
            <div className="space-y-1 text-sm border-t border-amber-200 dark:border-amber-800 pt-2">
              <Row label="Cộng tiền hàng" value={formatVND(Number(invoice.subtotal))} />
              <Row label="Thuế GTGT" value={formatVND(Number(invoice.tax_amount))} />
              <div className="border-t border-amber-200 dark:border-amber-800 pt-2 mt-2">
                <div className="flex justify-between items-baseline">
                  <span className="font-semibold">Tổng cộng</span>
                  <span className="font-bold text-2xl text-amber-700 dark:text-amber-300 font-mono">
                    {formatVND(Number(invoice.total))}
                  </span>
                </div>
              </div>
              <p className="text-[11px] italic text-gray-600 dark:text-gray-400 mt-2 pt-2 border-t border-amber-200 dark:border-amber-800">
                <span className="font-semibold">Bằng chữ:</span> {invoice.total_words}
              </p>
            </div>
          </div>

          {msg && (
            <div className={`rounded-lg p-3 text-sm ${msg.ok ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}>
              {msg.text}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2">
            {isDraft && canWrite && (
              <>
                <button
                  onClick={handleIssue}
                  disabled={busy}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg py-2.5 text-sm font-bold shadow disabled:opacity-50"
                >
                  🚀 Phát hành HĐ
                </button>
                <Link
                  href={`/admin/hoa-don/${invoice.id}/sua`}
                  className="block text-center w-full bg-white dark:bg-gray-800 border-2 border-amber-400 text-amber-700 dark:text-amber-300 rounded-lg py-2 text-sm font-semibold"
                >
                  ✏️ Sửa nháp
                </Link>
              </>
            )}

            {isIssued && invoice.buyer_email && (
              <button
                onClick={handleSendEmail}
                disabled={busy}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-lg py-2 text-sm font-semibold disabled:opacity-50"
              >
                📧 Gửi mail cho khách
              </button>
            )}

            <ExportPanel invoiceId={invoice.id} status={invoice.status} />

            {(isDraft || isIssued) && canDelete && !showCancel && (
              <button
                onClick={() => setShowCancel(true)}
                className="w-full border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg py-2 text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                {isIssued ? '🚫 Hủy HĐ' : '🗑 Xóa nháp'}
              </button>
            )}

            {showCancel && (
              <div className="border border-red-200 dark:border-red-900 rounded-lg p-3 bg-red-50 dark:bg-red-950/30 space-y-2">
                <label className="text-xs font-semibold text-red-800 dark:text-red-300 block">
                  Lý do hủy (bắt buộc)
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={2}
                  placeholder="VD: Sai thông tin khách hàng — phát hành lại"
                  className="w-full border border-red-300 dark:border-red-800 bg-white dark:bg-gray-800 rounded px-2 py-1.5 text-sm"
                />
                <div className="flex gap-2">
                  <button
                    onClick={isIssued ? handleCancel : handleDelete}
                    disabled={busy}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded py-1.5 text-sm font-semibold disabled:opacity-50"
                  >
                    {isIssued ? 'Xác nhận hủy' : 'Xác nhận xóa'}
                  </button>
                  <button
                    onClick={() => setShowCancel(false)}
                    className="border border-gray-300 dark:border-gray-600 rounded px-3 text-sm"
                  >
                    Bỏ qua
                  </button>
                </div>
              </div>
            )}

            <Link
              href="/admin/hoa-don"
              className="block text-center text-xs text-gray-500 hover:underline pt-2"
            >
              ← Về danh sách
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline text-sm">
      <span className="text-gray-600 dark:text-gray-400">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  )
}
