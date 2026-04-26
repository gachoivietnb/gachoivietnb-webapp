'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Tier = 'trial' | 'basic' | 'pro' | 'enterprise'

const TIER_META: Record<Tier, { label: string; emoji: string; price: string; pricePerMonth: number; description: string; bar: string }> = {
  trial: {
    label: 'Dùng thử miễn phí',
    emoji: '🎁',
    price: 'Miễn phí 14 ngày',
    pricePerMonth: 0,
    description: 'Tối đa 50 con · 1 tài khoản · Đầy đủ tính năng · Không cần thẻ',
    bar: 'from-slate-400 to-gray-500',
  },
  basic: {
    label: 'Gói Cơ bản',
    emoji: '🥉',
    price: '199.000đ/tháng',
    pricePerMonth: 199_000,
    description: '500 con · 3 tài khoản · Hỗ trợ qua Zalo',
    bar: 'from-blue-500 to-indigo-500',
  },
  pro: {
    label: 'Gói Pro',
    emoji: '🥈',
    price: '499.000đ/tháng',
    pricePerMonth: 499_000,
    description: '5.000 con · 10 tài khoản · Hỗ trợ ưu tiên · AI Marketing',
    bar: 'from-orange-500 via-red-500 to-rose-500',
  },
  enterprise: {
    label: 'Gói Enterprise',
    emoji: '🥇',
    price: '1.499.000đ/tháng',
    pricePerMonth: 1_499_000,
    description: 'Không giới hạn · API · Tuỳ biến · Manager riêng',
    bar: 'from-violet-500 to-purple-600',
  },
}

function isValidTier(t: string | null): t is Tier {
  return t === 'trial' || t === 'basic' || t === 'pro' || t === 'enterprise'
}

function SignupInner() {
  const router = useRouter()
  const params = useSearchParams()
  const tierParam = params.get('tier')
  const tier: Tier = isValidTier(tierParam) ? tierParam : 'trial'
  const meta = TIER_META[tier]

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [farmName, setFarmName] = useState('')
  const [farmPhone, setFarmPhone] = useState('')
  const [farmAddress, setFarmAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Honeypot — user thật KHÔNG thấy field này, không bao giờ điền.
  // Bot tự động fill mọi text input → server detect và reject.
  const [websiteUrl, setWebsiteUrl] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/farm-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          farm_name: farmName,
          farm_phone: farmPhone || undefined,
          farm_address: farmAddress || undefined,
          website_url: websiteUrl || undefined,  // honeypot
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        const msg = typeof data.error === 'string'
          ? data.error
          : 'Lỗi đăng ký. Vui lòng thử lại.'
        setError(msg)
        setLoading(false)
        return
      }

      // Auto login: signin với email/password vừa tạo
      const supabase = createClient()
      const { error: signinErr } = await supabase.auth.signInWithPassword({ email, password })
      if (signinErr) {
        setError('Đã tạo tài khoản nhưng đăng nhập thất bại: ' + signinErr.message)
        setLoading(false)
        return
      }

      // Redirect: trial → /admin, paid → /admin/upgrade?tier=X
      if (tier === 'trial') {
        router.push('/admin')
      } else {
        router.push(`/admin/upgrade?tier=${tier}`)
      }
      router.refresh()
    } catch {
      setError('Lỗi kết nối. Vui lòng thử lại.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <Link href="/phan-mem" className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400">
            ← Quay về trang giới thiệu
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg overflow-hidden">
          <div className={`h-2 bg-gradient-to-r ${meta.bar}`} />

          <div className="p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 text-white flex items-center justify-center font-bold text-lg shadow-sm">G</div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Đăng ký phần mềm</h1>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Tạo tài khoản chủ trại — quản lý gà chọi của riêng bạn.
                </p>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Gói đã chọn</div>
                <div className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  {meta.emoji} {meta.label}
                </div>
                <div className="text-sm text-orange-600 dark:text-orange-400 font-medium">{meta.price}</div>
              </div>
            </div>

            <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900 rounded-lg px-4 py-3 mb-6 text-sm text-orange-900 dark:text-orange-200">
              <span className="font-medium">{meta.description}</span>
              {tier !== 'trial' && (
                <div className="mt-1 text-xs text-orange-800 dark:text-orange-300">
                  Sau khi tạo tài khoản, bạn sẽ chuyển sang trang thanh toán để hoàn tất gói {meta.label}.
                </div>
              )}
              {tier === 'trial' && (
                <div className="mt-1 text-xs text-orange-800 dark:text-orange-300">
                  Hết 14 ngày, bạn có thể nâng cấp gói trả phí hoặc tiếp tục dùng tính năng cơ bản.
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">Thông tin chủ trại</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Họ và tên" required>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="input"
                      placeholder="Nguyễn Văn A"
                    />
                  </Field>
                  <Field label="Số điện thoại trại">
                    <input
                      type="tel"
                      value={farmPhone}
                      onChange={(e) => setFarmPhone(e.target.value)}
                      className="input"
                      placeholder="0912 345 678"
                    />
                  </Field>
                  <Field label="Email đăng nhập" required>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input"
                      placeholder="ban@example.com"
                    />
                  </Field>
                  <Field label="Mật khẩu" required hint="Tối thiểu 8 ký tự">
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input"
                      placeholder="••••••••"
                    />
                  </Field>
                </div>
              </div>

              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">Thông tin trại</h2>
                <div className="space-y-4">
                  <Field label="Tên trại" required hint="Sẽ hiển thị trong toàn bộ phần mềm">
                    <input
                      type="text"
                      required
                      minLength={2}
                      value={farmName}
                      onChange={(e) => setFarmName(e.target.value)}
                      className="input"
                      placeholder="VD: Trại gà Hùng Cường"
                    />
                  </Field>
                  <Field label="Địa chỉ trại">
                    <input
                      type="text"
                      value={farmAddress}
                      onChange={(e) => setFarmAddress(e.target.value)}
                      className="input"
                      placeholder="Xã/Huyện/Tỉnh"
                    />
                  </Field>
                </div>
              </div>

              {/* HONEYPOT — bot trap. Hidden hoàn toàn với user thật bằng
                  CSS + tabindex + aria-hidden + autocomplete=off.
                  Bot tự động không phân biệt được, sẽ điền field này. */}
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: '-10000px',
                  top: 'auto',
                  width: 1,
                  height: 1,
                  overflow: 'hidden',
                }}
              >
                <label htmlFor="website_url_field">Website (do not fill — bot trap)</label>
                <input
                  type="text"
                  id="website_url_field"
                  name="website_url"
                  tabIndex={-1}
                  autoComplete="off"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                />
              </div>

              {error && (
                <div className="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg px-4 py-3">
                  ⚠️ {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 rounded-xl text-white font-semibold shadow-md hover:shadow-lg transition-all bg-gradient-to-r ${meta.bar} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading
                  ? 'Đang tạo tài khoản...'
                  : tier === 'trial'
                  ? '🎁 Bắt đầu dùng thử 14 ngày miễn phí'
                  : `Đăng ký ${meta.label} →`}
              </button>

              <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                Bằng việc đăng ký, bạn đồng ý với{' '}
                <Link href="/dieu-khoan" className="text-orange-600 hover:underline">điều khoản sử dụng</Link>
                {' '}và{' '}
                <Link href="/bao-mat" className="text-orange-600 hover:underline">chính sách bảo mật</Link>
                .
              </p>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 text-center text-sm text-gray-600 dark:text-gray-400">
              Đã có tài khoản?{' '}
              <Link href="/auth/login" className="text-orange-600 dark:text-orange-400 font-medium hover:underline">
                Đăng nhập
              </Link>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        :global(.input) {
          width: 100%;
          padding: 0.625rem 0.875rem;
          border-radius: 0.5rem;
          border: 1px solid rgb(209 213 219);
          background: white;
          color: rgb(17 24 39);
          font-size: 0.9375rem;
          transition: all 0.15s;
        }
        :global(.input:focus) {
          outline: none;
          border-color: rgb(249 115 22);
          box-shadow: 0 0 0 3px rgb(254 215 170 / 0.5);
        }
        :global(.dark .input) {
          background: rgb(31 41 55);
          border-color: rgb(75 85 99);
          color: rgb(243 244 246);
        }
        :global(.dark .input:focus) {
          border-color: rgb(251 146 60);
          box-shadow: 0 0 0 3px rgb(124 45 18 / 0.5);
        }
      `}</style>
    </div>
  )
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Đang tải...</div>}>
      <SignupInner />
    </Suspense>
  )
}
