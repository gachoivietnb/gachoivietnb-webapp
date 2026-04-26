'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  formatVnd,
  ORDER_STATUS_META,
  type SubscriptionOrder,
} from '@/lib/payment/shared'
import { TIER_LABEL } from '@/lib/multitenancy/tiers'

type PublicPaymentInfo = {
  bank_name: string | null
  bank_bin: string | null
  bank_account_number: string | null
  bank_account_holder: string | null
  bank_branch: string | null
  momo_phone: string | null
  momo_holder: string | null
  vietqr_template: string
  support_phone: string | null
  support_zalo: string | null
  has_bank: boolean
  has_momo: boolean
}

export function PaymentClient({
  initialOrder,
  payment,
}: {
  initialOrder: SubscriptionOrder
  payment: PublicPaymentInfo
}) {
  const router = useRouter()
  const [order, setOrder] = useState<SubscriptionOrder>(initialOrder)
  const [copied, setCopied] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)

  // Poll order status every 8s when pending
  useEffect(() => {
    if (order.status !== 'pending') return
    const t = setInterval(async () => {
      try {
        const res = await fetch(`/api/subscription/orders/${order.id}`)
        if (!res.ok) return
        const json = await res.json()
        if (json.data && json.data.status !== order.status) {
          setOrder(json.data)
          if (json.data.status === 'paid') {
            // Khi paid → reload để admin layout đọc tier mới
            setTimeout(() => router.refresh(), 1000)
          }
        }
      } catch {
        // ignore
      }
    }, 8000)
    return () => clearInterval(t)
  }, [order.id, order.status, router])

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label)
      setTimeout(() => setCopied(null), 1500)
    })
  }

  async function handleCancel() {
    if (!confirm('Huỷ đơn này?')) return
    setCancelling(true)
    const res = await fetch(`/api/subscription/orders/${order.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel' }),
    })
    setCancelling(false)
    if (!res.ok) {
      const j = await res.json()
      alert('Lỗi: ' + (typeof j.error === 'string' ? j.error : 'unknown'))
      return
    }
    router.push('/admin/upgrade')
  }

  const qrUrl =
    payment.has_bank && payment.bank_bin && payment.bank_account_number
      ? `https://img.vietqr.io/image/${payment.bank_bin}-${payment.bank_account_number}-${payment.vietqr_template}.png?amount=${order.amount_vnd}&addInfo=${encodeURIComponent(order.payment_note)}&accountName=${encodeURIComponent(payment.bank_account_holder ?? '')}`
      : null

  const statusMeta = ORDER_STATUS_META[order.status]
  const expiresAt = new Date(order.expires_at)
  const expired = order.status === 'pending' && expiresAt < new Date()

  // ===== STATE 1: ĐÃ THANH TOÁN =====
  if (order.status === 'paid') {
    return (
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-300 dark:border-emerald-800 rounded-2xl p-8 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mb-2">
          Thanh toán thành công!
        </h2>
        <p className="text-emerald-700 dark:text-emerald-400 mb-6">
          Gói <b>{TIER_LABEL[order.tier]}</b> đã được kích hoạt cho trại của bạn.
          Hiệu lực trong <b>{order.months} tháng</b>.
        </p>
        <button
          onClick={() => router.push('/admin')}
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-6 py-3 font-semibold shadow"
        >
          Vào Dashboard →
        </button>
      </div>
    )
  }

  // ===== STATE 2: HUỶ / HẾT HẠN =====
  if (order.status === 'cancelled' || order.status === 'expired') {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-8 text-center">
        <div className="text-5xl mb-3">{statusMeta.emoji}</div>
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Đơn đã {statusMeta.label.toLowerCase()}
        </h2>
        {order.cancellation_reason && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Lý do: {order.cancellation_reason}</p>
        )}
        <button
          onClick={() => router.push('/admin/upgrade')}
          className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl px-6 py-3 font-semibold"
        >
          Tạo đơn mới →
        </button>
      </div>
    )
  }

  // ===== STATE 3: PENDING — HIỂN THỊ THANH TOÁN =====
  return (
    <div className="space-y-5">
      {/* Status banner */}
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl px-4 py-3 flex items-start gap-3">
        <span className="text-xl">⏳</span>
        <div className="text-sm text-amber-900 dark:text-amber-200 flex-1">
          <div className="font-semibold mb-1">Đơn đang chờ thanh toán</div>
          <div className="text-xs">
            {expired
              ? '⚠️ Đơn đã quá hạn. Vui lòng huỷ và tạo đơn mới.'
              : `Đơn sẽ hết hạn lúc ${expiresAt.toLocaleString('vi-VN')}. Hệ thống tự kiểm tra mỗi 8 giây.`}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* LEFT: QR Code */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            📱 Quét QR để chuyển khoản nhanh
          </h2>
          {qrUrl ? (
            <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/40 dark:to-red-950/40 rounded-xl p-4 border border-orange-200 dark:border-orange-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrUrl}
                alt="VietQR"
                className="w-full max-w-sm mx-auto rounded-lg bg-white shadow"
              />
              <p className="text-center text-xs text-orange-800 dark:text-orange-300 mt-3">
                Mở app ngân hàng → Quét QR → Mọi thông tin đã có sẵn
              </p>
            </div>
          ) : (
            <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl p-4 text-sm text-rose-800 dark:text-rose-300">
              ⚠️ SaaS owner chưa cấu hình tài khoản ngân hàng. Liên hệ hotline để được hỗ trợ.
            </div>
          )}
        </div>

        {/* RIGHT: Manual transfer info */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            📝 Hoặc chuyển khoản thủ công
          </h2>
          <div className="space-y-2.5 text-sm">
            <CopyRow
              label="Ngân hàng"
              value={payment.bank_name ?? '—'}
              copied={copied === 'bank'}
              onCopy={() => copy(payment.bank_name ?? '', 'bank')}
            />
            <CopyRow
              label="Số tài khoản"
              value={payment.bank_account_number ?? '—'}
              mono
              copied={copied === 'account'}
              onCopy={() => copy(payment.bank_account_number ?? '', 'account')}
            />
            <CopyRow
              label="Chủ tài khoản"
              value={payment.bank_account_holder ?? '—'}
              copied={copied === 'holder'}
              onCopy={() => copy(payment.bank_account_holder ?? '', 'holder')}
            />
            <CopyRow
              label="Số tiền"
              value={formatVnd(order.amount_vnd)}
              mono
              highlight
              copied={copied === 'amount'}
              onCopy={() => copy(String(order.amount_vnd), 'amount')}
            />
            <CopyRow
              label="Nội dung CK ⚠️"
              value={order.payment_note}
              mono
              highlight
              copied={copied === 'note'}
              onCopy={() => copy(order.payment_note, 'note')}
              hint="BẮT BUỘC ghi đúng nội dung này — hệ thống dùng để xác nhận"
            />
          </div>

          {payment.has_momo && (
            <details className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-3">
              <summary className="text-sm font-semibold text-pink-600 dark:text-pink-400 cursor-pointer">
                📱 Hoặc chuyển qua MoMo
              </summary>
              <div className="mt-2 space-y-2 text-sm">
                <CopyRow
                  label="MoMo SĐT"
                  value={payment.momo_phone ?? '—'}
                  mono
                  copied={copied === 'momo_phone'}
                  onCopy={() => copy(payment.momo_phone ?? '', 'momo_phone')}
                />
                <CopyRow
                  label="Tên chủ ví"
                  value={payment.momo_holder ?? '—'}
                  copied={copied === 'momo_holder'}
                  onCopy={() => copy(payment.momo_holder ?? '', 'momo_holder')}
                />
              </div>
            </details>
          )}
        </div>
      </div>

      {/* Order summary */}
      <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
          Chi tiết đơn
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <SummaryItem label="Mã đơn" value={order.payment_note} mono />
          <SummaryItem label="Gói" value={TIER_LABEL[order.tier]} />
          <SummaryItem label="Thời hạn" value={`${order.months} tháng`} />
          <SummaryItem label="Tổng" value={formatVnd(order.amount_vnd)} highlight />
        </div>
      </div>

      {/* Help + Cancel */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <div className="text-xs text-gray-600 dark:text-gray-400 flex flex-wrap gap-3">
          {payment.support_phone && (
            <span>
              📞 Cần hỗ trợ? Gọi{' '}
              <a href={`tel:${payment.support_phone}`} className="text-orange-600 font-semibold hover:underline">
                {payment.support_phone}
              </a>
            </span>
          )}
          {payment.support_zalo && (
            <a
              href={`https://zalo.me/${payment.support_zalo.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="text-orange-600 font-semibold hover:underline"
            >
              💬 Nhắn Zalo
            </a>
          )}
        </div>
        <button
          onClick={handleCancel}
          disabled={cancelling}
          className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 underline disabled:opacity-50"
        >
          {cancelling ? 'Đang huỷ...' : 'Huỷ đơn này'}
        </button>
      </div>
    </div>
  )
}

function CopyRow({
  label,
  value,
  mono,
  highlight,
  copied,
  onCopy,
  hint,
}: {
  label: string
  value: string
  mono?: boolean
  highlight?: boolean
  copied?: boolean
  onCopy: () => void
  hint?: string
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg px-3 py-2">
        <div className="min-w-0 flex-1">
          <div className="text-[10.5px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {label}
          </div>
          <div
            className={
              'truncate ' +
              (mono ? 'font-mono ' : '') +
              (highlight
                ? 'text-orange-600 dark:text-orange-400 font-bold text-base'
                : 'text-gray-900 dark:text-gray-100 font-medium')
            }
          >
            {value}
          </div>
        </div>
        <button
          onClick={onCopy}
          className={
            'flex-shrink-0 px-2.5 py-1 rounded text-xs font-semibold transition ' +
            (copied
              ? 'bg-emerald-500 text-white'
              : 'bg-orange-500 text-white hover:bg-orange-600')
          }
        >
          {copied ? '✓ Đã copy' : 'Copy'}
        </button>
      </div>
      {hint && <p className="text-[10.5px] text-amber-700 dark:text-amber-400 mt-1 px-1">{hint}</p>}
    </div>
  )
}

function SummaryItem({
  label,
  value,
  mono,
  highlight,
}: {
  label: string
  value: string
  mono?: boolean
  highlight?: boolean
}) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</div>
      <div
        className={
          (mono ? 'font-mono ' : '') +
          (highlight
            ? 'text-orange-600 dark:text-orange-400 font-bold'
            : 'text-gray-900 dark:text-gray-100 font-semibold')
        }
      >
        {value}
      </div>
    </div>
  )
}
