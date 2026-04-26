'use client'

import { useState } from 'react'

type Period = 'week' | 'month' | 'quarter'

const PERIOD_LABELS: Record<Period, string> = {
  week: '7 ngày qua',
  month: '30 ngày qua',
  quarter: '90 ngày qua',
}

type Summary = {
  period_label: string
  total_entries: number
  by_category: Array<{ category: string; count: number }>
  by_mood: Array<{ mood: string; count: number }>
  top_tags: Array<{ tag: string; count: number }>
  ai: {
    overview: string
    highlights: Array<{ title: string; detail: string }>
    concerns: Array<{ title: string; detail: string; severity: 'high' | 'medium' | 'low' }>
    patterns: Array<{ title: string; detail: string }>
    recommendations: Array<{ title: string; detail: string; priority: 'high' | 'medium' | 'low' }>
  } | null
  ai_error?: string
}

export function DiarySummaryModal({ onClose }: { onClose: () => void }) {
  const [period, setPeriod] = useState<Period>('week')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<Summary | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function run() {
    setLoading(true)
    setErr(null)
    setData(null)
    const res = await fetch('/api/diary/ai-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ period }),
    })
    const j = await res.json()
    setLoading(false)
    if (!res.ok) {
      setErr(typeof j.error === 'string' ? j.error : 'Lỗi AI')
      return
    }
    setData(j.data)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-0 md:p-4">
      <div className="w-full max-w-3xl bg-white dark:bg-gray-800 rounded-t-2xl md:rounded-2xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
        {/* HEADER */}
        <div className="relative bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 text-white p-5 flex items-center justify-between overflow-hidden">
          <div className="absolute inset-0 opacity-15 pointer-events-none">
            <span className="absolute -top-2 right-3 text-7xl">🤖</span>
          </div>
          <div className="relative">
            <div className="text-xs uppercase tracking-widest opacity-80">Trợ lý AI</div>
            <h2 className="text-lg font-bold">📔 Tóm tắt nhật ký · {data?.period_label ?? PERIOD_LABELS[period]}</h2>
          </div>
          <button
            onClick={onClose}
            className="relative w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-lg"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4">
          {/* Period picker */}
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => {
              const active = period === p
              return (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  disabled={loading}
                  className={
                    'px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-50 ' +
                    (active
                      ? 'bg-violet-600 text-white shadow'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300')
                  }
                >
                  {PERIOD_LABELS[p]}
                </button>
              )
            })}
            <button
              onClick={run}
              disabled={loading}
              className="ml-auto bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white rounded-lg px-4 py-1.5 text-xs font-bold shadow disabled:opacity-50"
            >
              {loading ? '⏳ Đang phân tích...' : data ? '🔄 Phân tích lại' : '🚀 Phân tích ngay'}
            </button>
          </div>

          {!data && !loading && (
            <div className="text-center py-12 text-sm text-gray-500 dark:text-gray-400">
              <div className="text-5xl mb-3">✨</div>
              Chọn khoảng thời gian rồi bấm <b>Phân tích</b> để AI đọc và tóm tắt nhật ký
            </div>
          )}

          {loading && (
            <div className="text-center py-12 bg-violet-50 dark:bg-violet-950/30 rounded-xl">
              <div className="text-4xl mb-2 animate-pulse">🤖</div>
              <div className="text-sm font-semibold text-violet-700 dark:text-violet-300">
                AI đang đọc {PERIOD_LABELS[period].toLowerCase()} của nhật ký...
              </div>
              <div className="flex justify-center gap-1 mt-3">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-2 h-2 rounded-full bg-violet-500 animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            </div>
          )}

          {err && (
            <div className="px-3 py-2 rounded-lg text-sm bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300">
              ⚠️ {err}
            </div>
          )}

          {data && (
            <div className="space-y-3">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-2">
                <Stat label="Tổng entries" value={data.total_entries} emoji="📔" />
                <Stat label="Phân loại" value={data.by_category.length} emoji="🏷" />
                <Stat label="Thẻ" value={data.top_tags.length} emoji="🔖" />
              </div>

              {/* Top categories chips */}
              {data.by_category.length > 0 && (
                <div>
                  <div className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1.5">
                    Theo phân loại
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {data.by_category.slice(0, 6).map((c) => (
                      <span
                        key={c.category}
                        className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-medium"
                      >
                        {c.category} <b>({c.count})</b>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {data.ai_error && (
                <div className="px-3 py-2 rounded-lg text-sm bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-300">
                  ⚠️ AI tạm thời không hoạt động. Vui lòng kiểm tra cấu hình AI trong /admin/cai-dat.
                </div>
              )}

              {data.ai && (
                <>
                  {/* Overview */}
                  <div className="bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-950/30 dark:to-fuchsia-950/30 border border-violet-200 dark:border-violet-900 rounded-xl p-4">
                    <div className="text-xs font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300 mb-1">
                      🎯 Tổng quan
                    </div>
                    <p className="text-sm text-gray-800 dark:text-gray-100 leading-relaxed">
                      &quot;{data.ai.overview}&quot;
                    </p>
                  </div>

                  {/* Highlights */}
                  {data.ai.highlights.length > 0 && (
                    <SectionList
                      title="✨ Điểm nổi bật"
                      tone="emerald"
                      items={data.ai.highlights.map((h) => ({ title: h.title, detail: h.detail }))}
                    />
                  )}

                  {/* Concerns */}
                  {data.ai.concerns.length > 0 && (
                    <SectionList
                      title="⚠️ Cần lưu ý"
                      tone="rose"
                      items={data.ai.concerns.map((c) => ({
                        title: c.title,
                        detail: c.detail,
                        badge: c.severity === 'high' ? '🔴 NẶNG' : c.severity === 'medium' ? '🟡 VỪA' : '🟢 NHẸ',
                      }))}
                    />
                  )}

                  {/* Patterns */}
                  {data.ai.patterns.length > 0 && (
                    <SectionList
                      title="🔍 Mẫu hình phát hiện"
                      tone="blue"
                      items={data.ai.patterns.map((p) => ({ title: p.title, detail: p.detail }))}
                    />
                  )}

                  {/* Recommendations */}
                  {data.ai.recommendations.length > 0 && (
                    <SectionList
                      title="🚀 Đề xuất hành động"
                      tone="amber"
                      items={data.ai.recommendations.map((r) => ({
                        title: r.title,
                        detail: r.detail,
                        badge:
                          r.priority === 'high'
                            ? 'CAO'
                            : r.priority === 'medium'
                              ? 'TB'
                              : 'THẤP',
                      }))}
                    />
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, emoji }: { label: string; value: number; emoji: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-center">
      <div className="text-2xl mb-0.5">{emoji}</div>
      <div className="text-xl font-extrabold tabular-nums text-gray-900 dark:text-gray-100">{value}</div>
      <div className="text-[10.5px] uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</div>
    </div>
  )
}

function SectionList({
  title,
  tone,
  items,
}: {
  title: string
  tone: 'emerald' | 'rose' | 'blue' | 'amber'
  items: Array<{ title: string; detail: string; badge?: string }>
}) {
  const cls: Record<typeof tone, { header: string; item: string }> = {
    emerald: {
      header: 'from-emerald-500 to-teal-600',
      item: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900',
    },
    rose: {
      header: 'from-rose-500 to-red-600',
      item: 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900',
    },
    blue: {
      header: 'from-blue-500 to-indigo-600',
      item: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900',
    },
    amber: {
      header: 'from-amber-500 to-orange-600',
      item: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900',
    },
  }
  const t = cls[tone]
  return (
    <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
      <div className={`px-4 py-2 bg-gradient-to-r ${t.header} text-white text-sm font-bold`}>
        {title}
      </div>
      <ul className="p-3 space-y-1.5 bg-white dark:bg-gray-800">
        {items.map((it, i) => (
          <li key={i} className={`text-sm rounded-lg p-2.5 border ${t.item}`}>
            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
              {it.badge && (
                <span className="text-[9.5px] font-extrabold bg-white/80 dark:bg-gray-900/80 px-1.5 py-0.5 rounded text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700">
                  {it.badge}
                </span>
              )}
              <span className="font-bold text-gray-900 dark:text-gray-100">{it.title}</span>
            </div>
            <div className="text-xs text-gray-700 dark:text-gray-300">{it.detail}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}
