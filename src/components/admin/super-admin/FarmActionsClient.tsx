'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const TIER_OPTS: Array<{
  v: 'trial' | 'basic' | 'pro' | 'enterprise'
  label: string
  emoji: string
  bar: string
}> = [
  { v: 'trial', label: 'Trial', emoji: '🔵', bar: 'from-slate-400 to-gray-500' },
  { v: 'basic', label: 'Cơ bản', emoji: '⭐', bar: 'from-blue-500 to-indigo-500' },
  { v: 'pro', label: 'Pro', emoji: '🔥', bar: 'from-orange-500 to-red-500' },
  { v: 'enterprise', label: 'Enterprise', emoji: '👑', bar: 'from-violet-500 to-purple-600' },
]

export function FarmActionsClient({
  farmId,
  currentTier,
  currentTrialEnd,
  currentExpiresAt,
  currentActive,
}: {
  farmId: string
  currentTier: 'trial' | 'basic' | 'pro' | 'enterprise'
  currentTrialEnd: string | null
  currentExpiresAt: string | null
  currentActive: boolean
}) {
  void currentTrialEnd
  void currentExpiresAt
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)

  async function call(action: string, body: Record<string, unknown> = {}) {
    setLoading(action)
    setMsg(null)
    try {
      const res = await fetch(`/api/super-admin/farms/${farmId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...body }),
      })
      const j = await res.json()
      if (!res.ok) {
        setMsg({ tone: 'err', text: typeof j.error === 'string' ? j.error : 'Lỗi' })
      } else {
        setMsg({ tone: 'ok', text: '✓ Đã cập nhật' })
        router.refresh()
      }
    } finally {
      setLoading(null)
    }
  }

  return (
    <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <div className="h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />
      <div className="p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
          ⚙️ Hành động manual
        </h3>

        <div>
          <div className="text-[10.5px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
            Đổi gói (set tier)
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {TIER_OPTS.map((t) => {
              const active = currentTier === t.v
              return (
                <button
                  key={t.v}
                  onClick={() => call('set_tier', { tier: t.v })}
                  disabled={loading !== null || active}
                  className={
                    'rounded-lg overflow-hidden border-2 p-2 text-left transition disabled:opacity-50 disabled:cursor-not-allowed ' +
                    (active
                      ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30'
                      : 'border-gray-200 dark:border-gray-700 hover:border-orange-400')
                  }
                >
                  <div className={`h-1 bg-gradient-to-r ${t.bar} -mx-2 -mt-2 mb-2`} />
                  <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {t.emoji} {t.label}
                  </div>
                  {active && (
                    <div className="text-[10px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                      ✓ hiện tại
                    </div>
                  )}
                </button>
              )
            })}
          </div>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
            Đổi tier sẽ tự gia hạn 30 ngày (paid) hoặc 14 ngày (trial)
          </p>
        </div>

        <div className="border-t border-gray-100 dark:border-gray-700 pt-3 space-y-2">
          <div className="text-[10.5px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Gia hạn nhanh
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => call('extend_trial', { days: 14 })}
              disabled={loading !== null}
              className="text-xs bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 hover:bg-blue-100 dark:hover:bg-blue-950/50 rounded-lg px-2 py-1.5 font-semibold disabled:opacity-50"
            >
              + 14 ngày trial
            </button>
            <button
              onClick={() => call('extend_subscription', { days: 30 })}
              disabled={loading !== null}
              className="text-xs bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 rounded-lg px-2 py-1.5 font-semibold disabled:opacity-50"
            >
              + 30 ngày sub
            </button>
            <button
              onClick={() => call('extend_subscription', { days: 90 })}
              disabled={loading !== null}
              className="text-xs bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 rounded-lg px-2 py-1.5 font-semibold disabled:opacity-50"
            >
              + 90 ngày sub
            </button>
            <button
              onClick={() => call('extend_subscription', { days: 365 })}
              disabled={loading !== null}
              className="text-xs bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 rounded-lg px-2 py-1.5 font-semibold disabled:opacity-50"
            >
              + 1 năm sub
            </button>
          </div>
        </div>

        <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
          <div className="text-[10.5px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
            Trạng thái subscription
          </div>
          {currentActive ? (
            <button
              onClick={() => {
                if (confirm('Tắt subscription? Farm sẽ vào status cancelled, không tính MRR.'))
                  call('cancel')
              }}
              disabled={loading !== null}
              className="w-full text-xs bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 hover:bg-rose-100 dark:hover:bg-rose-950/50 rounded-lg px-3 py-2 font-semibold disabled:opacity-50"
            >
              ⛔ Huỷ subscription
            </button>
          ) : (
            <button
              onClick={() => call('reactivate')}
              disabled={loading !== null}
              className="w-full text-xs bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 rounded-lg px-3 py-2 font-semibold disabled:opacity-50"
            >
              ✓ Kích hoạt lại
            </button>
          )}
        </div>

        {msg && (
          <div
            className={
              'rounded-lg px-2.5 py-1.5 text-xs ' +
              (msg.tone === 'ok'
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300'
                : 'bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300')
            }
          >
            {msg.text}
          </div>
        )}

        {loading && (
          <div className="text-[10.5px] text-gray-500 dark:text-gray-400 text-center">
            <span className="animate-spin inline-block w-3 h-3 border-2 border-gray-300 border-t-gray-700 rounded-full mr-1" />
            Đang xử lý…
          </div>
        )}
      </div>
    </section>
  )
}
