'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  computeAmount,
  discountForMonths,
  formatVnd,
} from '@/lib/payment/shared'
import { TIER_LABEL, TIER_MONTHLY_PRICE } from '@/lib/multitenancy/tiers'

type Tier = 'basic' | 'pro' | 'enterprise'
type Months = 1 | 3 | 6 | 12

const TIERS: Array<{
  id: Tier
  emoji: string
  bar: string
  features: string[]
  badge?: string
  cls: string
}> = [
  {
    id: 'basic',
    emoji: '🥉',
    bar: 'from-blue-500 to-indigo-500',
    features: ['Đến 200 con gà', '2 user', 'Hồ sơ · gia phả · tiêm phòng', 'Tài chính cơ bản', 'Hỗ trợ Zalo + email'],
    cls: 'border-blue-300 dark:border-blue-800',
  },
  {
    id: 'pro',
    emoji: '🥈',
    bar: 'from-orange-500 via-red-500 to-rose-500',
    features: [
      'Đến 1.000 con gà',
      '5 user · phân quyền chi tiết',
      '✨ AI Marketing — viết bài Zalo/FB tự động',
      '📚 Bí Kíp Sư Kê 35 bài',
      '📊 6 báo cáo tài chính',
      'Hỗ trợ ưu tiên 24/7',
    ],
    badge: '⭐ Phổ biến',
    cls: 'border-orange-400 dark:border-orange-700 ring-2 ring-orange-300 dark:ring-orange-700/50',
  },
  {
    id: 'enterprise',
    emoji: '🥇',
    bar: 'from-violet-500 to-purple-600',
    features: [
      'Không giới hạn gà',
      'Không giới hạn user',
      '🏷 Logo riêng (white-label)',
      '🌐 Domain riêng',
      '🔌 API tích hợp',
      'Onboarding 1-1',
    ],
    cls: 'border-violet-300 dark:border-violet-800',
  },
]

const MONTHS_OPTIONS: Months[] = [1, 3, 6, 12]

export function UpgradeClient({
  initialTier,
  currentTier,
}: {
  initialTier: Tier
  currentTier: 'trial' | 'basic' | 'pro' | 'enterprise'
}) {
  const router = useRouter()
  const [tier, setTier] = useState<Tier>(initialTier)
  const [months, setMonths] = useState<Months>(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const monthly = TIER_MONTHLY_PRICE[tier] ?? 0
  const amount = useMemo(() => computeAmount(tier, months), [tier, months])
  const discount = discountForMonths(months)

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    const res = await fetch('/api/subscription/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier, months, payment_method: 'bank_transfer' }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(typeof data.error === 'string' ? data.error : 'Lỗi tạo đơn')
      setSubmitting(false)
      return
    }
    router.push(`/admin/payment/${data.data.id}`)
  }

  return (
    <div className="space-y-6">
      {currentTier !== 'trial' && (
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl px-4 py-3 text-sm text-blue-900 dark:text-blue-200">
          ℹ️ Bạn đang dùng gói <b>{TIER_LABEL[currentTier]}</b>. Đăng ký gói mới sẽ <b>cộng dồn</b> vào ngày hết hạn hiện tại.
        </div>
      )}

      {/* TIER SELECT */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
          1️⃣ Chọn gói
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {TIERS.map((t) => {
            const active = tier === t.id
            const monthlyPrice = TIER_MONTHLY_PRICE[t.id] ?? 0
            return (
              <button
                key={t.id}
                onClick={() => setTier(t.id)}
                className={
                  'relative text-left bg-white dark:bg-gray-800 border-2 rounded-xl p-4 transition hover:shadow-md ' +
                  (active
                    ? 'border-orange-500 dark:border-orange-500 shadow-lg'
                    : t.cls)
                }
              >
                {t.badge && (
                  <div className="absolute -top-2.5 left-4 bg-gradient-to-r from-red-600 to-orange-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                    {t.badge}
                  </div>
                )}
                <div className={`h-1 -mx-4 -mt-4 mb-3 bg-gradient-to-r ${t.bar} rounded-t-xl`} />
                <div className="flex items-center justify-between mb-2">
                  <div className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                    <span>{t.emoji}</span>
                    <span>{TIER_LABEL[t.id]}</span>
                  </div>
                  {active && <span className="text-orange-500 text-lg">✓</span>}
                </div>
                <div className="mb-3">
                  <span className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">
                    {formatVnd(monthlyPrice)}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">/tháng</span>
                </div>
                <ul className="space-y-1 text-xs text-gray-700 dark:text-gray-300">
                  {t.features.map((f) => (
                    <li key={f} className="flex gap-1.5 items-start">
                      <span className="text-emerald-500 mt-0.5">✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </button>
            )
          })}
        </div>
      </div>

      {/* MONTHS SELECT */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
          2️⃣ Chọn thời hạn
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {MONTHS_OPTIONS.map((m) => {
            const active = months === m
            const dis = discountForMonths(m)
            return (
              <button
                key={m}
                onClick={() => setMonths(m)}
                className={
                  'relative bg-white dark:bg-gray-800 border-2 rounded-xl p-3 text-center transition ' +
                  (active
                    ? 'border-orange-500 shadow-md'
                    : 'border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-700')
                }
              >
                {dis > 0 && (
                  <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                    -{Math.round(dis * 100)}%
                  </span>
                )}
                <div className="font-bold text-gray-900 dark:text-gray-100 text-lg">{m}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">tháng</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* SUMMARY */}
      <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 border border-orange-200 dark:border-orange-900 rounded-xl p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-orange-600 dark:text-orange-400 mb-3">
          📋 Tóm tắt đơn
        </h2>
        <div className="space-y-2 text-sm">
          <Row label="Gói" value={`${TIER_LABEL[tier]} (${formatVnd(monthly)}/tháng)`} />
          <Row label="Thời hạn" value={`${months} tháng`} />
          <Row label="Tạm tính" value={formatVnd(monthly * months)} />
          {discount > 0 && (
            <Row
              label={`Giảm giá (đăng ký ${months} tháng)`}
              value={`-${formatVnd(monthly * months - amount)}`}
              tone="text-emerald-600"
            />
          )}
          <div className="pt-2 mt-2 border-t border-orange-300 dark:border-orange-800">
            <Row
              label="TỔNG CẦN THANH TOÁN"
              value={formatVnd(amount)}
              tone="text-orange-600 font-bold text-lg"
              big
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="text-sm text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg px-4 py-3">
          ⚠️ {error}
        </div>
      )}

      {/* CTA */}
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white py-4 rounded-xl font-bold text-base shadow-lg hover:shadow-xl transition disabled:opacity-50"
      >
        {submitting ? 'Đang tạo đơn...' : `💳 Tạo đơn — Thanh toán ${formatVnd(amount)}`}
      </button>

      <p className="text-xs text-center text-gray-500 dark:text-gray-400">
        Sau khi tạo đơn, bạn sẽ chuyển sang trang thanh toán có QR VietQR.
        Đơn sẽ hết hạn sau 24 giờ — chuyển khoản trong khoảng đó để được kích hoạt.
      </p>
    </div>
  )
}

function Row({
  label,
  value,
  tone,
  big,
}: {
  label: string
  value: string
  tone?: string
  big?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className={'text-gray-700 dark:text-gray-300 ' + (big ? 'font-semibold' : '')}>
        {label}
      </span>
      <span className={'tabular-nums ' + (tone ?? 'text-gray-900 dark:text-gray-100 font-medium')}>
        {value}
      </span>
    </div>
  )
}
