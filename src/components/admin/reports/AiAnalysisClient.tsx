'use client'

import { useMemo, useState } from 'react'
import { formatVnd } from '@/lib/utils/format'
import type { PeriodAggregates } from '@/lib/reports/aggregate'
import type { AiAnalysis } from '@/lib/reports/ai-analysis'

type Preset = 'this_month' | 'last_month' | 'this_quarter' | 'this_year'

const PRESET_LABELS: Record<Preset, string> = {
  this_month: 'Tháng này',
  last_month: 'Tháng trước',
  this_quarter: 'Quý này',
  this_year: 'Năm nay',
}

export type AiAnalysisData = {
  preset: Preset
  current_period: { from: string; to: string; label: string }
  previous_period: { from: string; to: string; label: string }
  current_data: PeriodAggregates
  previous_data: PeriodAggregates
  analysis: AiAnalysis | null
}

export function AiAnalysisClient({ initialData }: { initialData: AiAnalysisData }) {
  const [data, setData] = useState<AiAnalysisData>(initialData)
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)

  async function changePreset(p: Preset) {
    if (loading) return
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/finance/reports/management-analysis?preset=${p}`)
    const j = await res.json()
    setLoading(false)
    if (!res.ok) {
      setError(typeof j.error === 'string' ? j.error : 'Lỗi tải dữ liệu')
      return
    }
    setData({ ...j.data, analysis: null })
  }

  async function runAi() {
    setAiLoading(true)
    setAiError(null)
    const res = await fetch('/api/finance/reports/management-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preset: data.preset }),
    })
    const j = await res.json()
    setAiLoading(false)
    if (!res.ok && !j.data) {
      setAiError(typeof j.error === 'string' ? j.error : 'Lỗi gọi AI')
      return
    }
    if (j.error) setAiError(typeof j.error === 'string' ? j.error : null)
    setData(j.data)
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 flex flex-wrap items-center gap-2 print:hidden">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
          Kỳ phân tích:
        </div>
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-900 rounded-lg p-0.5">
          {(Object.keys(PRESET_LABELS) as Preset[]).map((p) => {
            const active = data.preset === p
            return (
              <button
                key={p}
                onClick={() => changePreset(p)}
                disabled={loading}
                className={
                  'px-3 py-1.5 rounded text-xs font-semibold transition disabled:opacity-50 ' +
                  (active
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900')
                }
              >
                {PRESET_LABELS[p]}
              </button>
            )
          })}
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
          {data.current_period.from} → {data.current_period.to} <span className="opacity-70">vs</span> {data.previous_period.from} → {data.previous_period.to}
        </span>
        <button
          onClick={() => window.print()}
          className="ml-auto bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-1.5 text-xs font-semibold"
        >
          🖨 In
        </button>
      </div>

      {error && (
        <div className="px-3 py-2 rounded-lg text-sm bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300">
          ⚠️ {error}
        </div>
      )}

      {/* KPI Compare Grid */}
      <KpiCompareSection current={data.current_data} previous={data.previous_data} />

      {/* AI Analysis section */}
      <AiAnalysisSection
        analysis={data.analysis}
        loading={aiLoading}
        error={aiError}
        onRun={runAi}
        currentLabel={data.current_period.label}
        previousLabel={data.previous_period.label}
      />
    </div>
  )
}

/* ============================================================
 * KPI Compare grid
 * ============================================================ */

function KpiCompareSection({
  current,
  previous,
}: {
  current: PeriodAggregates
  previous: PeriodAggregates
}) {
  const items = useMemo(() => {
    type Item = {
      label: string
      cur: number
      prev: number
      fmt: 'vnd' | 'num' | 'pct'
      emoji: string
      tone: string
      invertGood?: boolean
    }
    const list: Item[] = [
      { label: 'Doanh thu', cur: current.sales_revenue, prev: previous.sales_revenue, fmt: 'vnd', emoji: '💵', tone: 'from-emerald-500 to-teal-500' },
      { label: 'Lợi nhuận ròng', cur: current.net_profit, prev: previous.net_profit, fmt: 'vnd', emoji: '📈', tone: 'from-blue-500 to-indigo-500' },
      { label: 'Biên LN ròng', cur: current.net_margin, prev: previous.net_margin, fmt: 'pct', emoji: '🎯', tone: 'from-violet-500 to-purple-500' },
      { label: 'Số gà bán', cur: current.chickens_sold, prev: previous.chickens_sold, fmt: 'num', emoji: '🐓', tone: 'from-orange-500 to-red-500' },
      { label: 'Tỷ lệ sống', cur: current.survival_rate, prev: previous.survival_rate, fmt: 'pct', emoji: '✅', tone: 'from-emerald-500 to-green-500' },
      { label: 'Chi phí', cur: current.expense_total, prev: previous.expense_total, fmt: 'vnd', emoji: '🧾', tone: 'from-amber-500 to-orange-500', invertGood: true },
      { label: 'Dòng tiền ròng', cur: current.net_cash_flow, prev: previous.net_cash_flow, fmt: 'vnd', emoji: '💸', tone: 'from-cyan-500 to-blue-500' },
      { label: 'Số dư quỹ', cur: current.treasury_balance, prev: previous.treasury_balance, fmt: 'vnd', emoji: '💰', tone: 'from-violet-500 to-fuchsia-500' },
    ]
    return list
  }, [current, previous])

  return (
    <section>
      <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
        📊 So sánh chỉ tiêu chính
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {items.map((it) => (
          <KpiCompareCard key={it.label} {...it} />
        ))}
      </div>
    </section>
  )
}

function KpiCompareCard({
  label, cur, prev, fmt, emoji, tone, invertGood,
}: {
  label: string
  cur: number
  prev: number
  fmt: 'vnd' | 'num' | 'pct'
  emoji: string
  tone: string
  invertGood?: boolean
}) {
  const change = cur - prev
  const changePct = prev !== 0 ? (change / Math.abs(prev)) * 100 : 0
  const isUp = change > 0
  const isDown = change < 0
  const isGood = invertGood ? isDown : isUp
  const isBad = invertGood ? isUp : isDown

  const fmtFn = (n: number) =>
    fmt === 'vnd' ? formatVnd(n)
    : fmt === 'pct' ? `${n.toFixed(1)}%`
    : n.toLocaleString('vi-VN')

  return (
    <div className="relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 overflow-hidden shadow-sm">
      <div className={`absolute -top-2 -right-2 w-16 h-16 rounded-full bg-gradient-to-br ${tone} opacity-15`} />
      <div className="relative">
        <div className="flex items-center justify-between mb-1.5">
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${tone} text-white flex items-center justify-center text-sm shadow shrink-0`}>
            {emoji}
          </div>
          {change !== 0 && (
            <span
              className={
                'text-[11px] font-bold px-1.5 py-0.5 rounded ' +
                (isGood
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : isBad
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300')
              }
            >
              {isUp ? '↑' : '↓'} {Math.abs(changePct).toFixed(1)}%
            </span>
          )}
        </div>
        <div className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</div>
        <div className="text-base md:text-lg font-extrabold text-gray-900 dark:text-gray-100 tabular-nums truncate">
          {fmtFn(cur)}
        </div>
        <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
          Kỳ trước: <span className="tabular-nums">{fmtFn(prev)}</span>
        </div>
        {/* Mini bar comparison */}
        <div className="mt-2 flex items-end gap-1 h-6">
          {[prev, cur].map((v, i) => {
            const max = Math.max(Math.abs(prev), Math.abs(cur), 1)
            const h = (Math.abs(v) / max) * 100
            return (
              <div key={i} className="flex-1 flex flex-col-reverse">
                <div
                  className={`rounded-t-sm transition-all ${
                    i === 1 ? `bg-gradient-to-t ${tone}` : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                  style={{ height: `${h}%`, minHeight: '2px' }}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ============================================================
 * AI Analysis section
 * ============================================================ */

function AiAnalysisSection({
  analysis,
  loading,
  error,
  onRun,
  currentLabel,
  previousLabel,
}: {
  analysis: AiAnalysis | null
  loading: boolean
  error: string | null
  onRun: () => void
  currentLabel: string
  previousLabel: string
}) {
  if (!analysis && !loading) {
    return (
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-600 to-pink-600 text-white shadow-xl print:hidden">
        <div className="absolute inset-0 opacity-15 pointer-events-none">
          <span className="absolute top-3 right-6 text-9xl">🤖</span>
          <span className="absolute -bottom-3 left-1/3 text-6xl">✨</span>
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.18),transparent_60%)]" />
        <div className="relative p-6 md:p-8 text-center">
          <div className="text-5xl mb-3">🤖✨</div>
          <h3 className="text-2xl font-black mb-2">Sẵn sàng phân tích bằng AI</h3>
          <p className="text-sm md:text-base opacity-90 max-w-2xl mx-auto mb-5">
            AI sẽ đóng vai chuyên gia tài chính gà chọi đọc số liệu của bạn — chấm điểm tổng quan,
            chỉ ra điểm mạnh / yếu, cảnh báo lưu ý, và gợi ý 3-6 hành động cần làm tháng tới.
          </p>
          <button
            onClick={onRun}
            className="bg-white text-violet-700 hover:bg-violet-50 rounded-xl px-6 py-3 font-extrabold shadow-2xl hover:scale-105 transition text-base"
          >
            🚀 Phân tích ngay (~10-20 giây)
          </button>
          {error && (
            <div className="mt-3 inline-block px-3 py-2 rounded-lg text-sm bg-rose-100 text-rose-700 border border-rose-300">
              ⚠️ {error}
            </div>
          )}
          <div className="mt-4 text-xs opacity-75">
            So sánh {currentLabel} vs {previousLabel} · Cần kích hoạt AI trong /admin/cai-dat
          </div>
        </div>
      </section>
    )
  }

  if (loading) {
    return (
      <section className="bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-950/30 dark:to-fuchsia-950/30 border border-violet-200 dark:border-violet-900 rounded-2xl p-8 text-center">
        <div className="text-4xl mb-3 animate-pulse">🤖</div>
        <div className="text-base font-semibold text-violet-700 dark:text-violet-300 mb-1">
          AI đang phân tích báo cáo...
        </div>
        <div className="text-xs text-violet-600 dark:text-violet-400">
          Đang đọc dữ liệu, so sánh kỳ này vs kỳ trước, đưa ra nhận định
        </div>
        <div className="flex justify-center gap-1 mt-4">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full bg-violet-500 animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </section>
    )
  }

  if (!analysis) return null

  const { overall_score, verdict, highlight_metric, strengths, weaknesses, improvements, watch_outs, next_month_actions, kpi_analysis } = analysis

  return (
    <div className="space-y-4">
      {/* Score + Verdict card */}
      <ScoreVerdictCard
        score={overall_score}
        verdict={verdict}
        highlight={highlight_metric}
        currentLabel={currentLabel}
        previousLabel={previousLabel}
      />

      {error && (
        <div className="px-3 py-2 rounded-lg text-sm bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-300">
          ⚠️ {error}
        </div>
      )}

      {/* 4-column section: Strengths / Weaknesses / Improvements / Watch-outs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SectionCard
          title="✅ Điểm mạnh"
          subtitle="Đang phát huy tốt"
          items={strengths}
          tone="emerald"
          renderItem={(s) => (
            <>
              <div className="font-semibold">{s.title}</div>
              <div className="text-xs mt-0.5 opacity-90">{s.detail}</div>
              {s.metric && <div className="text-[11px] mt-1 font-bold tabular-nums opacity-95">📊 {s.metric}</div>}
            </>
          )}
        />
        <SectionCard
          title="⚠️ Điểm yếu"
          subtitle="Chưa đạt — cần lưu tâm"
          items={weaknesses}
          tone="rose"
          renderItem={(s) => (
            <>
              <div className="font-semibold">{s.title}</div>
              <div className="text-xs mt-0.5 opacity-90">{s.detail}</div>
              {s.metric && <div className="text-[11px] mt-1 font-bold tabular-nums opacity-95">📊 {s.metric}</div>}
            </>
          )}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SectionCard
          title="🛠 Cần cải thiện"
          subtitle="Khu vực có thể tinh chỉnh"
          items={improvements}
          tone="amber"
          renderItem={(s) => (
            <>
              <div className="flex items-center gap-1.5">
                <PriorityBadge priority={s.priority} />
                <span className="font-semibold">{s.title}</span>
              </div>
              <div className="text-xs mt-0.5 opacity-90">{s.detail}</div>
            </>
          )}
        />
        <SectionCard
          title="🔔 Lưu ý quản trị"
          subtitle="Nguy cơ cần theo dõi"
          items={watch_outs}
          tone="violet"
          renderItem={(s) => (
            <>
              <div className="flex items-center gap-1.5">
                <SeverityBadge severity={s.severity} />
                <span className="font-semibold">{s.title}</span>
              </div>
              <div className="text-xs mt-0.5 opacity-90">{s.detail}</div>
            </>
          )}
        />
      </div>

      {/* Action plan */}
      {next_month_actions.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white">
            <h3 className="font-bold text-base flex items-center gap-2">
              🚀 Hành động đề xuất tháng tới
            </h3>
            <p className="text-xs opacity-90 mt-0.5">
              {next_month_actions.length} đầu việc — sắp xếp theo độ ưu tiên
            </p>
          </div>
          <ol className="divide-y divide-gray-100 dark:divide-gray-700">
            {next_month_actions.map((a, i) => (
              <li key={i} className="flex gap-3 px-4 py-3">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xs font-extrabold shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                    <PriorityBadge priority={a.priority} />
                    <span className="font-bold text-sm text-gray-900 dark:text-gray-100">{a.title}</span>
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-300">{a.detail}</div>
                  {a.expected_impact && (
                    <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-full px-2 py-0.5">
                      🎯 {a.expected_impact}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* KPI Analysis Table */}
      {kpi_analysis.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-gradient-to-r from-slate-600 to-gray-700 text-white">
            <h3 className="font-bold text-base">📋 Đánh giá chi tiết từng KPI</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs uppercase text-gray-600 dark:text-gray-400">
                <tr>
                  <th className="px-3 py-2 text-left">Chỉ tiêu</th>
                  <th className="px-3 py-2 text-right">Kỳ này</th>
                  <th className="px-3 py-2 text-right">Kỳ trước</th>
                  <th className="px-3 py-2 text-center">Thay đổi</th>
                  <th className="px-3 py-2 text-left">Đánh giá</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {kpi_analysis.map((k, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-3 py-2.5 font-semibold">{k.name}</td>
                    <td className="px-3 py-2.5 text-right font-bold tabular-nums">{k.current}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-500 dark:text-gray-400">{k.previous}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span
                        className={
                          'text-xs font-bold px-1.5 py-0.5 rounded ' +
                          (k.change_pct > 0
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : k.change_pct < 0
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300')
                        }
                      >
                        {k.change_pct > 0 ? '↑' : k.change_pct < 0 ? '↓' : '='} {Math.abs(k.change_pct).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <RatingBadge rating={k.rating} />
                      <div className="text-xs text-gray-700 dark:text-gray-300 mt-0.5">{k.comment}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Re-run button */}
      <div className="flex justify-center pt-2 print:hidden">
        <button
          onClick={onRun}
          className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl px-5 py-2.5 text-sm font-bold shadow"
        >
          🔄 Phân tích lại
        </button>
      </div>

      <div className="text-center text-[11px] text-gray-400 dark:text-gray-500 print:hidden">
        Tạo lúc: {new Date(analysis.generated_at).toLocaleString('vi-VN')} · Trợ lý AI có thể sai sót — luôn dùng cùng phán đoán của con người
      </div>
    </div>
  )
}

/* ============================================================
 * Sub components
 * ============================================================ */

function ScoreVerdictCard({
  score, verdict, highlight, currentLabel, previousLabel,
}: {
  score: number
  verdict: string
  highlight: { label: string; value: string; trend: 'up' | 'down' | 'flat' }
  currentLabel: string
  previousLabel: string
}) {
  const tone = score >= 85
    ? 'from-emerald-500 to-teal-600'
    : score >= 70
      ? 'from-blue-500 to-indigo-600'
      : score >= 55
        ? 'from-amber-500 to-orange-600'
        : 'from-rose-500 to-red-600'
  const verdictText = score >= 85
    ? 'Tuyệt vời'
    : score >= 70
      ? 'Tốt'
      : score >= 55
        ? 'Trung bình'
        : score >= 40
          ? 'Cần cải thiện'
          : 'Đáng lo ngại'
  const trendIcon = highlight.trend === 'up' ? '📈' : highlight.trend === 'down' ? '📉' : '➡️'

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${tone} text-white shadow-xl`}>
      <div className="absolute inset-0 opacity-15 pointer-events-none">
        <span className="absolute top-3 right-6 text-7xl">🤖</span>
        <span className="absolute -bottom-3 left-8 text-5xl">✨</span>
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.2),transparent_60%)]" />
      <div className="relative p-5 md:p-7 grid grid-cols-1 md:grid-cols-[auto_1fr] gap-5 items-center">
        {/* Score gauge */}
        <div className="flex flex-col items-center">
          <div className="relative w-32 h-32 md:w-40 md:h-40">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="45" fill="none"
                stroke="white" strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${(score / 100) * 282.7} 282.7`}
                style={{ transition: 'stroke-dasharray 1s ease-out' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-4xl md:text-5xl font-black tabular-nums">{score}</div>
              <div className="text-[10px] opacity-90 uppercase tracking-wider">/100</div>
            </div>
          </div>
          <div className="text-sm font-bold mt-2 px-3 py-1 bg-white/20 backdrop-blur rounded-full">
            {verdictText}
          </div>
        </div>

        {/* Verdict + highlight */}
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest opacity-80 mb-1">
            🤖 Đánh giá tổng quan · {currentLabel} vs {previousLabel}
          </div>
          <p className="text-base md:text-lg font-medium leading-relaxed mb-3">
            "{verdict}"
          </p>
          <div className="bg-white/15 backdrop-blur rounded-xl p-3 border border-white/20">
            <div className="text-[10px] uppercase tracking-wider opacity-80 mb-0.5">Chỉ tiêu nổi bật</div>
            <div className="flex items-center gap-2">
              <span className="text-xl">{trendIcon}</span>
              <div className="min-w-0">
                <div className="text-sm font-semibold">{highlight.label}</div>
                <div className="text-base font-bold tabular-nums">{highlight.value}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SectionCard<T>({
  title, subtitle, items, tone, renderItem,
}: {
  title: string
  subtitle: string
  items: T[]
  tone: 'emerald' | 'rose' | 'amber' | 'violet'
  renderItem: (item: T) => React.ReactNode
}) {
  const headerCls: Record<typeof tone, string> = {
    emerald: 'from-emerald-500 to-teal-600',
    rose: 'from-rose-500 to-red-600',
    amber: 'from-amber-500 to-orange-600',
    violet: 'from-violet-500 to-purple-600',
  }
  const itemCls: Record<typeof tone, string> = {
    emerald: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-100',
    rose: 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-100',
    amber: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-100',
    violet: 'bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-900 text-violet-900 dark:text-violet-100',
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
      <div className={`px-4 py-2.5 bg-gradient-to-r ${headerCls[tone]} text-white`}>
        <h3 className="font-bold text-sm">{title}</h3>
        <p className="text-[10.5px] opacity-90">{subtitle}</p>
      </div>
      {items.length === 0 ? (
        <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Không có
        </div>
      ) : (
        <ul className="p-3 space-y-2">
          {items.map((it, i) => (
            <li key={i} className={`text-sm rounded-lg p-3 border ${itemCls[tone]}`}>
              {renderItem(it)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function PriorityBadge({ priority }: { priority: 'high' | 'medium' | 'low' }) {
  const meta = {
    high: { label: 'CAO', cls: 'bg-rose-500 text-white' },
    medium: { label: 'TB', cls: 'bg-amber-500 text-white' },
    low: { label: 'THẤP', cls: 'bg-gray-400 text-white' },
  }[priority] ?? { label: priority, cls: 'bg-gray-400 text-white' }
  return (
    <span className={`text-[9.5px] font-extrabold px-1.5 py-0.5 rounded ${meta.cls}`}>
      {meta.label}
    </span>
  )
}

function SeverityBadge({ severity }: { severity: 'high' | 'medium' | 'low' }) {
  const meta = {
    high: { label: '🔴 NẶNG', cls: 'bg-rose-500 text-white' },
    medium: { label: '🟡 VỪA', cls: 'bg-amber-500 text-white' },
    low: { label: '🟢 NHẸ', cls: 'bg-emerald-500 text-white' },
  }[severity] ?? { label: severity, cls: 'bg-gray-400 text-white' }
  return (
    <span className={`text-[9.5px] font-extrabold px-1.5 py-0.5 rounded ${meta.cls}`}>
      {meta.label}
    </span>
  )
}

function RatingBadge({ rating }: { rating: 'good' | 'warning' | 'bad' | 'neutral' }) {
  const meta = {
    good: { label: '✅ Tốt', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' },
    warning: { label: '⚠️ Lưu ý', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' },
    bad: { label: '❌ Cần xử lý', cls: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' },
    neutral: { label: '➖ Bình thường', cls: 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300' },
  }[rating] ?? { label: rating, cls: 'bg-gray-100 text-gray-700' }
  return (
    <span className={`inline-flex items-center text-[10.5px] font-bold px-1.5 py-0.5 rounded ${meta.cls}`}>
      {meta.label}
    </span>
  )
}
